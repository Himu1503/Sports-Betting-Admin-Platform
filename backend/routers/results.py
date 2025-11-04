from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update
from models import Result, ResultCreate, ResultUpdate

router = APIRouter(prefix="/api/results", tags=["results"])


@router.get("", response_model=List[Result])
async def get_results(
    event_id: Optional[int] = Query(None, description="Filter by event ID"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = "SELECT event_id, score_a, score_b, created_at, updated_at FROM results WHERE 1=1"
    params = []
    param_idx = 1
    
    if event_id:
        query += f" AND event_id = ${param_idx}"
        params.append(event_id)
        param_idx += 1
    
    query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    return [Result(**row) for row in results]


@router.get("/{event_id}", response_model=Result)
async def get_result(event_id: int):
    query = "SELECT event_id, score_a, score_b, created_at, updated_at FROM results WHERE event_id = $1"
    result = await execute_one(query, event_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Result for event ID {event_id} not found"
        )
    return Result(**result)


@router.post("", response_model=Result, status_code=status.HTTP_201_CREATED)
async def create_result(result: ResultCreate):
    try:
        query = """
            INSERT INTO results (event_id, score_a, score_b)
            VALUES ($1, $2, $3)
            RETURNING event_id, score_a, score_b, created_at, updated_at
        """
        db_result = await execute_one(
            query,
            result.event_id,
            result.score_a,
            result.score_b
        )
        return Result(**db_result)
    except Exception as e:
        error_str = str(e).lower()
        if "foreign key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid event_id: {result.event_id}"
            )
        if "duplicate key" in error_str or "unique constraint" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Result for event ID {result.event_id} already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{event_id}", response_model=Result)
async def update_result(event_id: int, result: ResultUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if result.score_a is not None:
        updates.append(f"score_a = ${param_idx}")
        params.append(result.score_a)
        param_idx += 1
    
    if result.score_b is not None:
        updates.append(f"score_b = ${param_idx}")
        params.append(result.score_b)
        param_idx += 1
    
    if not updates:
        return await get_result(event_id)
    
    query = f"""
        UPDATE results
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ${param_idx}
        RETURNING event_id, score_a, score_b, created_at, updated_at
    """
    params.append(event_id)
    
    result_row = await execute_one(query, *params)
    if not result_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Result for event ID {event_id} not found"
        )
    return Result(**result_row)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result(event_id: int):
    query = "DELETE FROM results WHERE event_id = $1"
    affected = await execute_update(query, event_id)
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Result for event ID {event_id} not found"
        )
    return None

