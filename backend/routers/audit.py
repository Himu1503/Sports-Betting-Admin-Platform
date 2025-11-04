from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one
from models import AuditLog
import json

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=List[AuditLog])
async def get_audit_logs(
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    operation: Optional[str] = Query(None, description="Filter by operation"),
    row_id: Optional[int] = Query(None, description="Filter by row ID"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    query = """
        SELECT id, table_name, operation, username, changed_at, row_id, old_data, new_data
        FROM audit_log
        WHERE 1=1
    """
    params = []
    param_idx = 1
    
    if table_name:
        query += f" AND table_name = ${param_idx}"
        params.append(table_name)
        param_idx += 1
    
    if operation:
        query += f" AND operation = ${param_idx}"
        params.append(operation)
        param_idx += 1
    
    if row_id:
        query += f" AND row_id = ${param_idx}"
        params.append(row_id)
        param_idx += 1
    
    query += f" ORDER BY changed_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([limit, offset])
    
    results = await execute_query(query, *params)
    audit_logs = []
    for row in results:
        # Parse JSONB fields if they're strings
        old_data = row.get('old_data')
        new_data = row.get('new_data')
        if isinstance(old_data, str):
            old_data = json.loads(old_data) if old_data else None
        if isinstance(new_data, str):
            new_data = json.loads(new_data) if new_data else None
        
        audit_logs.append(AuditLog(
            id=row['id'],
            table_name=row['table_name'],
            operation=row['operation'],
            username=row['username'],
            changed_at=row['changed_at'],
            row_id=row.get('row_id'),
            old_data=old_data,
            new_data=new_data
        ))
    return audit_logs


@router.get("/{audit_id}", response_model=AuditLog)
async def get_audit_log(audit_id: int):
    query = """
        SELECT id, table_name, operation, username, changed_at, row_id, old_data, new_data
        FROM audit_log
        WHERE id = $1
    """
    result = await execute_one(query, audit_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log entry with ID {audit_id} not found"
        )
    
    # Parse JSONB fields if they're strings
    old_data = result.get('old_data')
    new_data = result.get('new_data')
    if isinstance(old_data, str):
        old_data = json.loads(old_data) if old_data else None
    if isinstance(new_data, str):
        new_data = json.loads(new_data) if new_data else None
    
    return AuditLog(
        id=result['id'],
        table_name=result['table_name'],
        operation=result['operation'],
        username=result['username'],
        changed_at=result['changed_at'],
        row_id=result.get('row_id'),
        old_data=old_data,
        new_data=new_data
    )


@router.get("/table/{table_name}/row/{row_id}", response_model=List[AuditLog])
async def get_audit_logs_for_record(table_name: str, row_id: int):
    query = """
        SELECT id, table_name, operation, username, changed_at, row_id, old_data, new_data
        FROM audit_log
        WHERE table_name = $1 AND row_id = $2
        ORDER BY changed_at DESC
    """
    results = await execute_query(query, table_name, row_id)
    audit_logs = []
    for row in results:
        # Parse JSONB fields if they're strings
        old_data = row.get('old_data')
        new_data = row.get('new_data')
        if isinstance(old_data, str):
            old_data = json.loads(old_data) if old_data else None
        if isinstance(new_data, str):
            new_data = json.loads(new_data) if new_data else None
        
        audit_logs.append(AuditLog(
            id=row['id'],
            table_name=row['table_name'],
            operation=row['operation'],
            username=row['username'],
            changed_at=row['changed_at'],
            row_id=row.get('row_id'),
            old_data=old_data,
            new_data=new_data
        ))
    return audit_logs

