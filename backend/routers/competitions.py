from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update
from models import Competition, CompetitionCreate, CompetitionUpdate

router = APIRouter(prefix="/api/competitions", tags=["competitions"])


@router.get("", response_model=List[Competition])
async def get_competitions(
    sport: Optional[str] = Query(None, description="Filter by sport"),
    active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = "SELECT id, name, country, sport, active FROM competitions WHERE 1=1"
    params = []
    param_idx = 1
    
    if sport:
        query += f" AND sport = ${param_idx}"
        params.append(sport)
        param_idx += 1
    
    if active is not None:
        query += f" AND active = ${param_idx}"
        params.append(active)
        param_idx += 1
    
    query += f" ORDER BY name LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    return [Competition(**row) for row in results]


@router.get("/{competition_id}", response_model=Competition)
async def get_competition(competition_id: int):
    query = "SELECT id, name, country, sport, active FROM competitions WHERE id = $1"
    result = await execute_one(query, competition_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition with ID {competition_id} not found"
        )
    return Competition(**result)


@router.post("", response_model=Competition, status_code=status.HTTP_201_CREATED)
async def create_competition(competition: CompetitionCreate):
    try:
        query = """
            INSERT INTO competitions (name, country, sport, active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, country, sport, active
        """
        result = await execute_one(
            query, 
            competition.name, 
            competition.country, 
            competition.sport,
            competition.active
        )
        return Competition(**result)
    except Exception as e:
        if "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sport: {competition.sport}"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{competition_id}", response_model=Competition)
async def update_competition(competition_id: int, competition: CompetitionUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if competition.name is not None:
        updates.append(f"name = ${param_idx}")
        params.append(competition.name)
        param_idx += 1
    
    if competition.country is not None:
        updates.append(f"country = ${param_idx}")
        params.append(competition.country)
        param_idx += 1
    
    if competition.sport is not None:
        updates.append(f"sport = ${param_idx}")
        params.append(competition.sport)
        param_idx += 1
    
    if competition.active is not None:
        updates.append(f"active = ${param_idx}")
        params.append(competition.active)
        param_idx += 1
    
    if not updates:
        return await get_competition(competition_id)
    
    query = f"""
        UPDATE competitions
        SET {', '.join(updates)}
        WHERE id = ${param_idx}
        RETURNING id, name, country, sport, active
    """
    params.append(competition_id)
    
    try:
        result = await execute_one(query, *params)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Competition with ID {competition_id} not found"
            )
        return Competition(**result)
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


@router.delete("/{competition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competition(competition_id: int):
    query = "DELETE FROM competitions WHERE id = $1"
    affected = await execute_update(query, competition_id)
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition with ID {competition_id} not found"
        )
    return None

