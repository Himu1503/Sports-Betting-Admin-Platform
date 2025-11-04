from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one, execute_insert, execute_update, get_db_connection
from models import Customer, CustomerCreate, CustomerUpdate, MoneyAmount
from logger_config import get_logger
import json

logger = get_logger(__name__)

router = APIRouter(prefix="/api/customers", tags=["customers"])


def parse_money_amount(money_dict: dict) -> MoneyAmount:
    if isinstance(money_dict, dict):
        return MoneyAmount(amount=money_dict['amount'], currency=money_dict['currency'])
    return MoneyAmount(amount=money_dict[0], currency=money_dict[1])


@router.get("", response_model=List[Customer])
async def get_customers(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = """
        SELECT 
            id, username, password, real_name, currency, status,
            (balance).amount as balance_amount,
            (balance).currency as balance_currency,
            preferences, created_at, updated_at
        FROM customers
        WHERE 1=1
    """
    params = []
    param_idx = 1
    
    if status_filter:
        query += f" AND status = ${param_idx}"
        params.append(status_filter)
        param_idx += 1
    
    if currency:
        query += f" AND currency = ${param_idx}"
        params.append(currency)
        param_idx += 1
    
    query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    customers = []
    for row in results:
        balance = MoneyAmount(amount=row['balance_amount'], currency=row['balance_currency'])
        customers.append(Customer(
            id=row['id'],
            username=row['username'],
            password=row['password'],
            real_name=row['real_name'],
            currency=row['currency'],
            status=row['status'],
            balance=balance,
            preferences=row['preferences'] if isinstance(row['preferences'], dict) else {},
            created_at=row['created_at'],
            updated_at=row['updated_at']
        ))
    return customers


@router.get("/{customer_id}", response_model=Customer)
async def get_customer(customer_id: int):
    query = """
        SELECT 
            id, username, password, real_name, currency, status,
            (balance).amount as balance_amount,
            (balance).currency as balance_currency,
            preferences, created_at, updated_at
        FROM customers
        WHERE id = $1
    """
    result = await execute_one(query, customer_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found"
        )
    
    balance = MoneyAmount(amount=result['balance_amount'], currency=result['balance_currency'])
    return Customer(
        id=result['id'],
        username=result['username'],
        password=result['password'],
        real_name=result['real_name'],
        currency=result['currency'],
        status=result['status'],
        balance=balance,
        preferences=result['preferences'] if isinstance(result['preferences'], dict) else {},
        created_at=result['created_at'],
        updated_at=result['updated_at']
    )


@router.post("", response_model=Customer, status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate):
    try:
        query = """
            INSERT INTO customers (username, password, real_name, currency, status, balance, preferences)
            VALUES ($1, $2, $3, $4, $5, ROW($6, $7)::money_amount, $8)
            RETURNING 
                id, username, password, real_name, currency, status,
                (balance).amount as balance_amount,
                (balance).currency as balance_currency,
                preferences, created_at, updated_at
        """
        result = await execute_one(
            query,
            customer.username,
            customer.password,
            customer.real_name,
            customer.currency,
            customer.status,
            customer.balance.amount,
            customer.balance.currency,
            json.dumps(customer.preferences)
        )
        balance = MoneyAmount(amount=result['balance_amount'], currency=result['balance_currency'])
        return Customer(
            id=result['id'],
            username=result['username'],
            password=result['password'],
            real_name=result['real_name'],
            currency=result['currency'],
            status=result['status'],
            balance=balance,
            preferences=result['preferences'] if isinstance(result['preferences'], dict) else {},
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
    except Exception as e:
        error_str = str(e).lower()
        logger.error(
            "Error creating customer - Username: %s, Error: %s",
            customer.username,
            e,
            exc_info=True
        )
        if "duplicate key" in error_str or "unique constraint" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{customer.username}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{customer_id}", response_model=Customer)
async def update_customer(customer_id: int, customer: CustomerUpdate):
    updates = []
    params = []
    param_idx = 1
    
    if customer.username is not None:
        updates.append(f"username = ${param_idx}")
        params.append(customer.username)
        param_idx += 1
    
    if customer.password is not None:
        updates.append(f"password = ${param_idx}")
        params.append(customer.password)
        param_idx += 1
    
    if customer.real_name is not None:
        updates.append(f"real_name = ${param_idx}")
        params.append(customer.real_name)
        param_idx += 1
    
    if customer.currency is not None:
        updates.append(f"currency = ${param_idx}")
        params.append(customer.currency)
        param_idx += 1
    
    if customer.status is not None:
        updates.append(f"status = ${param_idx}")
        params.append(customer.status)
        param_idx += 1
    
    if customer.balance is not None:
        updates.append(f"balance = ROW(${param_idx}, ${param_idx + 1})::money_amount")
        params.append(customer.balance.amount)
        params.append(customer.balance.currency)
        param_idx += 2
    
    if customer.preferences is not None:
        updates.append(f"preferences = ${param_idx}")
        params.append(json.dumps(customer.preferences))
        param_idx += 1
    
    if not updates:
        return await get_customer(customer_id)
    
    query = f"""
        UPDATE customers
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${param_idx}
        RETURNING 
            id, username, password, real_name, currency, status,
            (balance).amount as balance_amount,
            (balance).currency as balance_currency,
            preferences, created_at, updated_at
    """
    params.append(customer_id)
    
    try:
        result = await execute_one(query, *params)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {customer_id} not found"
            )
        balance = MoneyAmount(amount=result['balance_amount'], currency=result['balance_currency'])
        return Customer(
            id=result['id'],
            username=result['username'],
            password=result['password'],
            real_name=result['real_name'],
            currency=result['currency'],
            status=result['status'],
            balance=balance,
            preferences=result['preferences'] if isinstance(result['preferences'], dict) else {},
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
    except Exception as e:
        error_str = str(e).lower()
        if "duplicate key" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: int):
    # First check if customer exists
    customer_query = "SELECT id, username FROM customers WHERE id = $1"
    customer_result = await execute_one(customer_query, customer_id)
    if not customer_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found"
        )
    
    customer_name = customer_result.get('username', f'ID {customer_id}')
    
    # Check for dependent records
    async with get_db_connection() as conn:
        bets_count_result = await conn.fetchval("SELECT COUNT(*) FROM bets WHERE customer_id = $1", customer_id)
        balance_changes_count_result = await conn.fetchval("SELECT COUNT(*) FROM balance_changes WHERE customer_id = $1", customer_id)
        bets_count = int(bets_count_result) if bets_count_result is not None else 0
        balance_changes_count = int(balance_changes_count_result) if balance_changes_count_result is not None else 0
    
    if bets_count > 0 or balance_changes_count > 0:
        error_parts = []
        if bets_count > 0:
            error_parts.append(f"{bets_count} bet{'s' if bets_count != 1 else ''}")
        if balance_changes_count > 0:
            error_parts.append(f"{balance_changes_count} balance change{'s' if balance_changes_count != 1 else ''}")
        
        error_msg = f"Cannot delete customer '{customer_name}' (ID: {customer_id}): customer is referenced by {', '.join(error_parts)}. Please delete or update the dependent records first."
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=error_msg
        )
    
    # Proceed with deletion if no dependencies
    query = "DELETE FROM customers WHERE id = $1"
    try:
        affected = await execute_update(query, customer_id)
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {customer_id} not found"
            )
    except Exception as e:
        error_str = str(e).lower()
        if "foreign key" in error_str or "violates foreign key constraint" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete customer '{customer_name}' (ID: {customer_id}): customer is referenced by other records (bets or balance changes). Please delete the dependent records first."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete customer: {str(e)}"
        )
    
    return None

