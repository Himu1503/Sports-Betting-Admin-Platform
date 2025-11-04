from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update, get_db_connection
from models import Event, EventCreate, EventUpdate
from datetime import datetime

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[Event])
async def get_events(
    competition_id: Optional[int] = Query(None, description="Filter by competition"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = """
        SELECT id, date, competition_id, team_a_id, team_b_id, status, created_at, updated_at
        FROM events
        WHERE 1=1
    """
    params = []
    param_idx = 1
    
    if competition_id:
        query += f" AND competition_id = ${param_idx}"
        params.append(competition_id)
        param_idx += 1
    
    if status_filter:
        query += f" AND status = ${param_idx}"
        params.append(status_filter)
        param_idx += 1
    
    query += f" ORDER BY date DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    return [Event(**row) for row in results]


@router.get("/{event_id}", response_model=Event)
async def get_event(event_id: int):
    query = """
        SELECT id, date, competition_id, team_a_id, team_b_id, status, created_at, updated_at
        FROM events
        WHERE id = $1
    """
    result = await execute_one(query, event_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )
    return Event(**result)


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(event: EventCreate):
    try:
        query = """
            INSERT INTO events (date, competition_id, team_a_id, team_b_id, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, date, competition_id, team_a_id, team_b_id, status, created_at, updated_at
        """
        result = await execute_one(
            query,
            event.date,
            event.competition_id,
            event.team_a_id,
            event.team_b_id,
            event.status
        )
        return Event(**result)
    except Exception as e:
        error_str = str(e).lower()
        if "foreign key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competition_id, team_a_id, or team_b_id"
            )
        if "different_teams" in error_str or "same team" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team A and Team B must be different"
            )
        if "prematch" in error_str and "future" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prematch events must be scheduled in the future"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{event_id}", response_model=Event)
async def update_event(event_id: int, event: EventUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if event.date is not None:
        updates.append(f"date = ${param_idx}")
        params.append(event.date)
        param_idx += 1
    
    if event.competition_id is not None:
        updates.append(f"competition_id = ${param_idx}")
        params.append(event.competition_id)
        param_idx += 1
    
    if event.team_a_id is not None:
        updates.append(f"team_a_id = ${param_idx}")
        params.append(event.team_a_id)
        param_idx += 1
    
    if event.team_b_id is not None:
        updates.append(f"team_b_id = ${param_idx}")
        params.append(event.team_b_id)
        param_idx += 1
    
    if event.status is not None:
        updates.append(f"status = ${param_idx}")
        params.append(event.status)
        param_idx += 1
    
    if not updates:
        return await get_event(event_id)
    
    query = f"""
        UPDATE events
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${param_idx}
        RETURNING id, date, competition_id, team_a_id, team_b_id, status, created_at, updated_at
    """
    params.append(event_id)
    
    try:
        result = await execute_one(query, *params)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found"
            )
        return Event(**result)
    except Exception as e:
        error_str = str(e).lower()
        if "foreign key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competition_id, team_a_id, or team_b_id"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: int):
    # First check if event exists
    event_query = "SELECT id FROM events WHERE id = $1"
    event_result = await execute_one(event_query, event_id)
    if not event_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )
    
    # Check for dependent records using fetchval for cleaner count retrieval
    async with get_db_connection() as conn:
        bets_count_result = await conn.fetchval("SELECT COUNT(*) FROM bets WHERE event_id = $1", event_id)
        results_count_result = await conn.fetchval("SELECT COUNT(*) FROM results WHERE event_id = $1", event_id)
        bets_count = int(bets_count_result) if bets_count_result is not None else 0
        results_count = int(results_count_result) if results_count_result is not None else 0
    
    if bets_count > 0 or results_count > 0:
        error_parts = []
        if bets_count > 0:
            error_parts.append(f"{bets_count} bet{'s' if bets_count != 1 else ''}")
        if results_count > 0:
            error_parts.append(f"{results_count} result{'s' if results_count != 1 else ''}")
        
        error_msg = f"Cannot delete event: it is referenced by {', '.join(error_parts)}. Please delete or update the dependent records first."
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=error_msg
        )
    
    # Proceed with deletion if no dependencies
    query = "DELETE FROM events WHERE id = $1"
    try:
        affected = await execute_update(query, event_id)
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found"
            )
    except Exception as e:
        error_str = str(e).lower()
        if "foreign key" in error_str or "violates foreign key constraint" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete event: it is referenced by other records (bets or results). Please delete the dependent records first."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete event: {str(e)}"
        )
    
    return None

