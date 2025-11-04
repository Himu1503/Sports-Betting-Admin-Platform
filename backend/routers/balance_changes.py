from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update
from models import BalanceChange, BalanceChangeCreate, MoneyAmount
from logger_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/balance-changes", tags=["balance-changes"])


@router.get("", response_model=List[BalanceChange])
async def get_balance_changes(
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    change_type: Optional[str] = Query(None, description="Filter by change type"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = """
        SELECT 
            id, customer_id, change_type,
            (delta).amount as delta_amount,
            (delta).currency as delta_currency,
            reference_id, description, created_at
        FROM balance_changes
        WHERE 1=1
    """
    params = []
    param_idx = 1
    
    if customer_id:
        query += f" AND customer_id = ${param_idx}"
        params.append(customer_id)
        param_idx += 1
    
    if change_type:
        query += f" AND change_type = ${param_idx}"
        params.append(change_type)
        param_idx += 1
    
    query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    changes = []
    for row in results:
        delta = MoneyAmount(amount=row['delta_amount'], currency=row['delta_currency'])
        changes.append(BalanceChange(
            id=row['id'],
            customer_id=row['customer_id'],
            change_type=row['change_type'],
            delta=delta,
            reference_id=row['reference_id'],
            description=row['description'],
            created_at=row['created_at']
        ))
    return changes


@router.get("/{change_id}", response_model=BalanceChange)
async def get_balance_change(change_id: int):
    query = """
        SELECT 
            id, customer_id, change_type,
            (delta).amount as delta_amount,
            (delta).currency as delta_currency,
            reference_id, description, created_at
        FROM balance_changes
        WHERE id = $1
    """
    result = await execute_one(query, change_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balance change with ID {change_id} not found"
        )
    
    delta = MoneyAmount(amount=result['delta_amount'], currency=result['delta_currency'])
    return BalanceChange(
        id=result['id'],
        customer_id=result['customer_id'],
        change_type=result['change_type'],
        delta=delta,
        reference_id=result['reference_id'],
        description=result['description'],
        created_at=result['created_at']
    )


@router.post("", response_model=BalanceChange, status_code=status.HTTP_201_CREATED)
async def create_balance_change(change: BalanceChangeCreate):
    try:
        query = """
            INSERT INTO balance_changes (customer_id, change_type, delta, reference_id, description)
            VALUES ($1, $2, ROW($3, $4)::money_amount, $5, $6)
            RETURNING 
                id, customer_id, change_type,
                (delta).amount as delta_amount,
                (delta).currency as delta_currency,
                reference_id, description, created_at
        """
        result = await execute_one(
            query,
            change.customer_id,
            change.change_type,
            change.delta.amount,
            change.delta.currency,
            change.reference_id,
            change.description
        )
        delta = MoneyAmount(amount=result['delta_amount'], currency=result['delta_currency'])
        return BalanceChange(
            id=result['id'],
            customer_id=result['customer_id'],
            change_type=result['change_type'],
            delta=delta,
            reference_id=result['reference_id'],
            description=result['description'],
            created_at=result['created_at']
        )
    except Exception as e:
        error_str = str(e).lower()
        logger.error(
            "Error creating balance change - Customer ID: %s, Type: %s, Amount: %s, Error: %s",
            change.customer_id,
            change.change_type,
            change.delta.amount,
            e,
            exc_info=True
        )
        if "foreign key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid customer_id: {change.customer_id}"
            )
        if "currency" in error_str and "match" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Balance change currency does not match customer currency"
            )
        if "negative balance" in error_str or "insufficient balance" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

