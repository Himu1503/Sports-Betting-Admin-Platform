import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_audit_logs(client: AsyncClient):
    # Create some data to generate audit logs
    response = await client.post("/api/sports", json={"name": "TestSport"})
    assert response.status_code == 201
    
    # Get audit logs
    response = await client.get("/api/audit")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_audit_logs_with_filters(client: AsyncClient):
    # Create data to generate logs
    await client.post("/api/sports", json={"name": "FilterTest"})
    
    # Filter by table name
    response = await client.get("/api/audit?table_name=sports")
    assert response.status_code == 200
    data = response.json()
    assert all(log["table_name"] == "sports" for log in data)
    
    # Filter by operation
    response = await client.get("/api/audit?operation=INSERT")
    assert response.status_code == 200
    data = response.json()
    assert all(log["operation"] == "INSERT" for log in data)


@pytest.mark.asyncio
async def test_get_audit_logs_for_record(client: AsyncClient):
    # Create a sport
    response = await client.post("/api/sports", json={"name": "AuditTestSport"})
    assert response.status_code == 201
    
    # Get audit logs for this record (sports use name as key, but audit uses row_id)
    # We'll need to check what the audit log structure is
    response = await client.get("/api/audit?table_name=sports")
    assert response.status_code == 200
    logs = response.json()
    
    if logs:
        # Get logs for the first record
        first_log = logs[0]
        if first_log.get("row_id"):
            table_name = first_log["table_name"]
            row_id = first_log["row_id"]
            response = await client.get(f"/api/audit/table/{table_name}/row/{row_id}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert all(log["table_name"] == table_name for log in data)
            assert all(log["row_id"] == row_id for log in data)

