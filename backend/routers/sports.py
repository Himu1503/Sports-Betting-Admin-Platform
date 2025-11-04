from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from database import execute_query, execute_one, execute_insert, execute_update
from models import Sport, SportBase
from auth import get_current_user

router = APIRouter(prefix="/api/sports", tags=["sports"])


@router.get("", response_model=List[Sport])
async def get_sports(current_user: dict = Depends(get_current_user)):
    query = "SELECT name FROM sports ORDER BY name"
    results = await execute_query(query)
    return [Sport(**row) for row in results]


@router.get("/{name}", response_model=Sport)
async def get_sport(name: str, current_user: dict = Depends(get_current_user)):
    query = "SELECT name FROM sports WHERE name = $1"
    result = await execute_one(query, name)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sport '{name}' not found"
        )
    return Sport(**result)


@router.post("", response_model=Sport, status_code=status.HTTP_201_CREATED)
async def create_sport(sport: SportBase, current_user: dict = Depends(get_current_user)):
    try:
        query = "INSERT INTO sports (name) VALUES ($1) RETURNING name"
        result = await execute_insert(query, sport.name)
        return Sport(name=sport.name)
    except Exception as e:
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sport '{sport.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sport(name: str, current_user: dict = Depends(get_current_user)):
    query = "DELETE FROM sports WHERE name = $1"
    affected = await execute_update(query, name)
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sport '{name}' not found"
        )
    return None

