import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_sports(client: AsyncClient):
    response = await client.get("/api/sports")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should have at least the test data
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_get_sport_by_name(client: AsyncClient):
    # First create a sport
    response = await client.post("/api/sports", json={"name": "Tennis"})
    assert response.status_code == 201
    
    # Get it back
    response = await client.get("/api/sports/Tennis")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tennis"


@pytest.mark.asyncio
async def test_create_sport(client: AsyncClient):
    response = await client.post("/api/sports", json={"name": "Hockey"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Hockey"


@pytest.mark.asyncio
async def test_create_duplicate_sport(client: AsyncClient):
    # Create first sport
    response = await client.post("/api/sports", json={"name": "Rugby"})
    assert response.status_code == 201
    
    # Try to create duplicate
    response = await client.post("/api/sports", json={"name": "Rugby"})
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_delete_sport(client: AsyncClient):
    # Create a sport
    response = await client.post("/api/sports", json={"name": "Cricket"})
    assert response.status_code == 201
    
    # Delete it
    response = await client.delete("/api/sports/Cricket")
    assert response.status_code == 204
    
    # Verify it's gone
    response = await client.get("/api/sports/Cricket")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_sport(client: AsyncClient):
    response = await client.delete("/api/sports/NonexistentSport")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_sport(client: AsyncClient):
    response = await client.get("/api/sports/NonexistentSport")
    assert response.status_code == 404

