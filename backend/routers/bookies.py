from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update
from models import Bookie, BookieCreate, BookieUpdate
import json

router = APIRouter(prefix="/api/bookies", tags=["bookies"])


@router.get("", response_model=List[Bookie])
async def get_bookies(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = "SELECT name, description, preferences FROM bookies ORDER BY name LIMIT $1 OFFSET $2"
    results = await execute_query(query, limit, offset)
    bookies = []
    for row in results:
        # Ensure preferences is a dict, not a string
        if 'preferences' in row and isinstance(row['preferences'], str):
            try:
                row['preferences'] = json.loads(row['preferences'])
            except (json.JSONDecodeError, TypeError):
                row['preferences'] = {}
        elif 'preferences' not in row or row['preferences'] is None:
            row['preferences'] = {}
        bookies.append(Bookie(**row))
    return bookies


@router.get("/{name}", response_model=Bookie)
async def get_bookie(name: str):
    query = "SELECT name, description, preferences FROM bookies WHERE name = $1"
    result = await execute_one(query, name)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bookie '{name}' not found"
        )
    # Ensure preferences is a dict, not a string
    if 'preferences' in result and isinstance(result['preferences'], str):
        try:
            result['preferences'] = json.loads(result['preferences'])
        except (json.JSONDecodeError, TypeError):
            result['preferences'] = {}
    elif 'preferences' not in result or result['preferences'] is None:
        result['preferences'] = {}
    return Bookie(**result)


@router.post("", response_model=Bookie, status_code=status.HTTP_201_CREATED)
async def create_bookie(bookie: BookieCreate):
    try:
        query = """
            INSERT INTO bookies (name, description, preferences)
            VALUES ($1, $2, $3)
            RETURNING name, description, preferences
        """
        result = await execute_one(
            query,
            bookie.name,
            bookie.description,
            json.dumps(bookie.preferences)
        )
        return Bookie(**result)
    except Exception as e:
        error_str = str(e).lower()
        if "duplicate key" in error_str or "unique constraint" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bookie '{bookie.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{name}", response_model=Bookie)
async def update_bookie(name: str, bookie: BookieUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if bookie.description is not None:
        updates.append(f"description = ${param_idx}")
        params.append(bookie.description)
        param_idx += 1
    
    if bookie.preferences is not None:
        updates.append(f"preferences = ${param_idx}::jsonb")
        prefs_json = json.dumps(bookie.preferences) if isinstance(bookie.preferences, dict) else bookie.preferences
        params.append(prefs_json)
        param_idx += 1
    
    if not updates:
        return await get_bookie(name)
    
    query = f"""
        UPDATE bookies
        SET {', '.join(updates)}
        WHERE name = ${param_idx}
        RETURNING name, description, preferences
    """
    params.append(name)
    
    result = await execute_one(query, *params)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bookie '{name}' not found"
        )
    # Ensure preferences is a dict
    if 'preferences' in result and isinstance(result['preferences'], str):
        try:
            result['preferences'] = json.loads(result['preferences'])
        except (json.JSONDecodeError, TypeError):
            result['preferences'] = {}
    elif 'preferences' not in result or result['preferences'] is None:
        result['preferences'] = {}
    return Bookie(**result)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookie(name: str):
    query = "DELETE FROM bookies WHERE name = $1"
    affected = await execute_update(query, name)
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bookie '{name}' not found"
        )
    return None

