import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_customers(client: AsyncClient):
    response = await client.get("/api/customers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1  # At least test_user


@pytest.mark.asyncio
async def test_create_customer(client: AsyncClient):
    customer_data = {
        "username": "new_customer",
        "password": "hashed_password_123",
        "real_name": "New Customer",
        "currency": "USD",
        "status": "active",
        "balance": {"amount": 500.0, "currency": "USD"},
        "preferences": {"notifications": True}
    }
    response = await client.post("/api/customers", json=customer_data)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "new_customer"
    assert data["real_name"] == "New Customer"
    assert data["currency"] == "USD"
    assert float(data["balance"]["amount"]) == 500.0
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_customer(client: AsyncClient):
    customer_data = {
        "username": "duplicate_test",
        "password": "pass123",
        "real_name": "Duplicate Test",
        "currency": "USD",
        "status": "active",
        "balance": {"amount": 100.0, "currency": "USD"},
        "preferences": {}
    }
    # Create first
    response = await client.post("/api/customers", json=customer_data)
    assert response.status_code == 201
    
    # Try duplicate
    response = await client.post("/api/customers", json=customer_data)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_get_customer_by_id(client: AsyncClient):
    # Create a customer
    customer_data = {
        "username": "get_test_customer",
        "password": "pass123",
        "real_name": "Get Test",
        "currency": "GBP",
        "status": "active",
        "balance": {"amount": 200.0, "currency": "GBP"},
        "preferences": {}
    }
    response = await client.post("/api/customers", json=customer_data)
    assert response.status_code == 201
    customer_id = response.json()["id"]
    
    # Get it back
    response = await client.get(f"/api/customers/{customer_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "get_test_customer"
    assert data["id"] == customer_id


@pytest.mark.asyncio
async def test_update_customer(client: AsyncClient):
    # Create customer
    customer_data = {
        "username": "update_test",
        "password": "pass123",
        "real_name": "Update Test",
        "currency": "USD",
        "status": "active",
        "balance": {"amount": 300.0, "currency": "USD"},
        "preferences": {}
    }
    response = await client.post("/api/customers", json=customer_data)
    assert response.status_code == 201
    customer_id = response.json()["id"]
    
    # Update it
    update_data = {
        "real_name": "Updated Name",
        "status": "disabled",
        "balance": {"amount": 400.0, "currency": "USD"}
    }
    response = await client.put(f"/api/customers/{customer_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["real_name"] == "Updated Name"
    assert data["status"] == "disabled"
    assert float(data["balance"]["amount"]) == 400.0


@pytest.mark.asyncio
async def test_get_customers_with_filters(client: AsyncClient):
    # Filter by status
    response = await client.get("/api/customers?status=active")
    assert response.status_code == 200
    data = response.json()
    assert all(customer["status"] == "active" for customer in data)
    
    # Filter by currency
    response = await client.get("/api/customers?currency=USD")
    assert response.status_code == 200
    data = response.json()
    assert all(customer["currency"] == "USD" for customer in data)


@pytest.mark.asyncio
async def test_delete_customer(client: AsyncClient):
    # Create customer
    customer_data = {
        "username": "delete_test",
        "password": "pass123",
        "real_name": "Delete Test",
        "currency": "EUR",
        "status": "active",
        "balance": {"amount": 100.0, "currency": "EUR"},
        "preferences": {}
    }
    response = await client.post("/api/customers", json=customer_data)
    assert response.status_code == 201
    customer_id = response.json()["id"]
    
    # Delete it
    response = await client.delete(f"/api/customers/{customer_id}")
    assert response.status_code == 204
    
    # Verify it's gone
    response = await client.get(f"/api/customers/{customer_id}")
    assert response.status_code == 404

