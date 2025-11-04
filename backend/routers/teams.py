from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update
from models import Team, TeamCreate, TeamUpdate
from datetime import datetime

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=List[Team])
async def get_teams(
    sport: Optional[str] = Query(None, description="Filter by sport"),
    country: Optional[str] = Query(None, description="Filter by country"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = "SELECT id, name, country, sport, created_at, updated_at FROM teams WHERE 1=1"
    params = []
    param_idx = 1
    
    if sport:
        query += f" AND sport = ${param_idx}"
        params.append(sport)
        param_idx += 1
    
    if country:
        query += f" AND country = ${param_idx}"
        params.append(country)
        param_idx += 1
    
    query += f" ORDER BY name LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    return [Team(**row) for row in results]


@router.get("/{team_id}", response_model=Team)
async def get_team(team_id: int):
    query = "SELECT id, name, country, sport, created_at, updated_at FROM teams WHERE id = $1"
    result = await execute_one(query, team_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found"
        )
    return Team(**result)


@router.post("", response_model=Team, status_code=status.HTTP_201_CREATED)
async def create_team(team: TeamCreate):
    try:
        query = """
            INSERT INTO teams (name, country, sport)
            VALUES ($1, $2, $3)
            RETURNING id, name, country, sport, created_at, updated_at
        """
        result = await execute_one(query, team.name, team.country, team.sport)
        return Team(**result)
    except Exception as e:
        if "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sport: {team.sport}"
            )
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Team already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{team_id}", response_model=Team)
async def update_team(team_id: int, team: TeamUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if team.name is not None:
        updates.append(f"name = ${param_idx}")
        params.append(team.name)
        param_idx += 1
    
    if team.country is not None:
        updates.append(f"country = ${param_idx}")
        params.append(team.country)
        param_idx += 1
    
    if team.sport is not None:
        updates.append(f"sport = ${param_idx}")
        params.append(team.sport)
        param_idx += 1
    
    if not updates:
        # No updates provided, return current team
        return await get_team(team_id)
    
    query = f"""
        UPDATE teams
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${param_idx}
        RETURNING id, name, country, sport, created_at, updated_at
    """
    params.append(team_id)
    
    try:
        result = await execute_one(query, *params)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team with ID {team_id} not found"
            )
        return Team(**result)
    except Exception as e:
        if "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sport"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: int):
    query = "DELETE FROM teams WHERE id = $1"
    affected = await execute_update(query, team_id)
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found"
        )
    return None

