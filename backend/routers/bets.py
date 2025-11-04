# Bets router endpoints
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update
from models import Bet, BetCreate, BetUpdate, MoneyAmount
from logger_config import get_logger
import json
from decimal import Decimal

logger = get_logger(__name__)

router = APIRouter(prefix="/api/bets", tags=["bets"])


@router.get("", response_model=List[Bet])
async def get_bets(
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    event_id: Optional[int] = Query(None, description="Filter by event ID"),
    bookie: Optional[str] = Query(None, description="Filter by bookie"),
    placement_status: Optional[str] = Query(None, description="Filter by placement status"),
    outcome: Optional[str] = Query(None, description="Filter by outcome"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = """
        SELECT 
            id, bookie, customer_id, bookie_bet_id, bet_type, event_id, sport,
            placement_status, outcome,
            (stake).amount as stake_amount,
            (stake).currency as stake_currency,
            odds, placement_data, created_at, updated_at
        FROM bets
        WHERE 1=1
    """
    params = []
    param_idx = 1
    
    if customer_id:
        query += f" AND customer_id = ${param_idx}"
        params.append(customer_id)
        param_idx += 1
    
    if event_id:
        query += f" AND event_id = ${param_idx}"
        params.append(event_id)
        param_idx += 1
    
    if bookie:
        query += f" AND bookie = ${param_idx}"
        params.append(bookie)
        param_idx += 1
    
    if placement_status:
        query += f" AND placement_status = ${param_idx}"
        params.append(placement_status)
        param_idx += 1
    
    if outcome:
        query += f" AND outcome = ${param_idx}"
        params.append(outcome)
        param_idx += 1
    
    query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    bets = []
    for row in results:
        stake = MoneyAmount(amount=row['stake_amount'], currency=row['stake_currency'])
        bets.append(Bet(
            id=row['id'],
            bookie=row['bookie'],
            customer_id=row['customer_id'],
            bookie_bet_id=row['bookie_bet_id'],
            bet_type=row['bet_type'],
            event_id=row['event_id'],
            sport=row['sport'],
            placement_status=row['placement_status'],
            outcome=row['outcome'],
            stake=stake,
            odds=Decimal(str(row['odds'])),
            placement_data=row['placement_data'] if isinstance(row['placement_data'], dict) else {},
            created_at=row['created_at'],
            updated_at=row['updated_at']
        ))
    return bets


@router.get("/{bet_id}", response_model=Bet)
async def get_bet(bet_id: int):
    query = """
        SELECT 
            id, bookie, customer_id, bookie_bet_id, bet_type, event_id, sport,
            placement_status, outcome,
            (stake).amount as stake_amount,
            (stake).currency as stake_currency,
            odds, placement_data, created_at, updated_at
        FROM bets
        WHERE id = $1
    """
    result = await execute_one(query, bet_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bet with ID {bet_id} not found"
        )
    
    stake = MoneyAmount(amount=result['stake_amount'], currency=result['stake_currency'])
    return Bet(
        id=result['id'],
        bookie=result['bookie'],
        customer_id=result['customer_id'],
        bookie_bet_id=result['bookie_bet_id'],
        bet_type=result['bet_type'],
        event_id=result['event_id'],
        sport=result['sport'],
        placement_status=result['placement_status'],
        outcome=result['outcome'],
        stake=stake,
        odds=Decimal(str(result['odds'])),
        placement_data=result['placement_data'] if isinstance(result['placement_data'], dict) else {},
        created_at=result['created_at'],
        updated_at=result['updated_at']
    )


@router.post("", response_model=Bet, status_code=status.HTTP_201_CREATED)
async def create_bet(bet: BetCreate):
    try:
        query = """
            INSERT INTO bets (
                bookie, customer_id, bookie_bet_id, bet_type, event_id, sport,
                placement_status, outcome, stake, odds, placement_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ROW($9, $10)::money_amount, $11, $12)
            RETURNING 
                id, bookie, customer_id, bookie_bet_id, bet_type, event_id, sport,
                placement_status, outcome,
                (stake).amount as stake_amount,
                (stake).currency as stake_currency,
                odds, placement_data, created_at, updated_at
        """
        result = await execute_one(
            query,
            bet.bookie,
            bet.customer_id,
            bet.bookie_bet_id,
            bet.bet_type,
            bet.event_id,
            bet.sport,
            bet.placement_status,
            bet.outcome,
            bet.stake.amount,
            bet.stake.currency,
            bet.odds,
            json.dumps(bet.placement_data)
        )
        stake = MoneyAmount(amount=result['stake_amount'], currency=result['stake_currency'])
        return Bet(
            id=result['id'],
            bookie=result['bookie'],
            customer_id=result['customer_id'],
            bookie_bet_id=result['bookie_bet_id'],
            bet_type=result['bet_type'],
            event_id=result['event_id'],
            sport=result['sport'],
            placement_status=result['placement_status'],
            outcome=result['outcome'],
            stake=stake,
            odds=Decimal(str(result['odds'])),
            placement_data=result['placement_data'] if isinstance(result['placement_data'], dict) else {},
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
    except Exception as e:
        error_str = str(e).lower()
        logger.error(
            "Error creating bet - Bookie: %s, Customer ID: %s, Event ID: %s, Error: %s",
            bet.bookie,
            bet.customer_id,
            bet.event_id,
            e,
            exc_info=True
        )
        if "foreign key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid bookie, customer_id, event_id, or sport"
            )
        if "duplicate key" in error_str or "unique constraint" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bet with bookie '{bet.bookie}' and bookie_bet_id '{bet.bookie_bet_id}' already exists"
            )
        if "finished event" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot place bet on finished event"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{bet_id}", response_model=Bet)
async def update_bet(bet_id: int, bet: BetUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if bet.bookie is not None:
        updates.append(f"bookie = ${param_idx}")
        params.append(bet.bookie)
        param_idx += 1
    
    if bet.customer_id is not None:
        updates.append(f"customer_id = ${param_idx}")
        params.append(bet.customer_id)
        param_idx += 1
    
    if bet.bookie_bet_id is not None:
        updates.append(f"bookie_bet_id = ${param_idx}")
        params.append(bet.bookie_bet_id)
        param_idx += 1
    
    if bet.bet_type is not None:
        updates.append(f"bet_type = ${param_idx}")
        params.append(bet.bet_type)
        param_idx += 1
    
    if bet.event_id is not None:
        updates.append(f"event_id = ${param_idx}")
        params.append(bet.event_id)
        param_idx += 1
    
    if bet.sport is not None:
        updates.append(f"sport = ${param_idx}")
        params.append(bet.sport)
        param_idx += 1
    
    if bet.placement_status is not None:
        updates.append(f"placement_status = ${param_idx}")
        params.append(bet.placement_status)
        param_idx += 1
    
    if bet.outcome is not None:
        updates.append(f"outcome = ${param_idx}")
        params.append(bet.outcome)
        param_idx += 1
    
    if bet.stake is not None:
        updates.append(f"stake = ROW(${param_idx}, ${param_idx + 1})::money_amount")
        params.append(bet.stake.amount)
        params.append(bet.stake.currency)
        param_idx += 2
    
    if bet.odds is not None:
        updates.append(f"odds = ${param_idx}")
        params.append(bet.odds)
        param_idx += 1
    
    if bet.placement_data is not None:
        updates.append(f"placement_data = ${param_idx}")
        params.append(json.dumps(bet.placement_data))
        param_idx += 1
    
    if not updates:
        return await get_bet(bet_id)
    
    query = f"""
        UPDATE bets
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${param_idx}
        RETURNING 
            id, bookie, customer_id, bookie_bet_id, bet_type, event_id, sport,
            placement_status, outcome,
            (stake).amount as stake_amount,
            (stake).currency as stake_currency,
            odds, placement_data, created_at, updated_at
    """
    params.append(bet_id)
    
    try:
        result = await execute_one(query, *params)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bet with ID {bet_id} not found"
            )
        stake = MoneyAmount(amount=result['stake_amount'], currency=result['stake_currency'])
        return Bet(
            id=result['id'],
            bookie=result['bookie'],
            customer_id=result['customer_id'],
            bookie_bet_id=result['bookie_bet_id'],
            bet_type=result['bet_type'],
            event_id=result['event_id'],
            sport=result['sport'],
            placement_status=result['placement_status'],
            outcome=result['outcome'],
            stake=stake,
            odds=Decimal(str(result['odds'])),
            placement_data=result['placement_data'] if isinstance(result['placement_data'], dict) else {},
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
    except Exception as e:
        error_str = str(e).lower()
        if "foreign key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid bookie, customer_id, event_id, or sport"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{bet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bet(bet_id: int):
    query = "DELETE FROM bets WHERE id = $1"
    affected = await execute_update(query, bet_id)
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bet with ID {bet_id} not found"
        )
    return None

