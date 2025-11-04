import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_teams(client: AsyncClient):
    response = await client.get("/api/teams")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_teams_with_filters(client: AsyncClient):
    # Filter by sport
    response = await client.get("/api/teams?sport=Football")
    assert response.status_code == 200
    data = response.json()
    assert all(team["sport"] == "Football" for team in data)
    
    # Filter by country
    response = await client.get("/api/teams?country=USA")
    assert response.status_code == 200
    data = response.json()
    assert all(team["country"] == "USA" for team in data)


@pytest.mark.asyncio
async def test_create_team(client: AsyncClient):
    team_data = {
        "name": "Arsenal",
        "country": "England",
        "sport": "Football"
    }
    response = await client.post("/api/teams", json=team_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Arsenal"
    assert data["country"] == "England"
    assert data["sport"] == "Football"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_team_invalid_sport(client: AsyncClient):
    team_data = {
        "name": "Invalid Team",
        "country": "USA",
        "sport": "InvalidSport"
    }
    response = await client.post("/api/teams", json=team_data)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_team_by_id(client: AsyncClient):
    # Create a team
    team_data = {
        "name": "Chelsea",
        "country": "England",
        "sport": "Football"
    }
    response = await client.post("/api/teams", json=team_data)
    assert response.status_code == 201
    team_id = response.json()["id"]
    
    # Get it back
    response = await client.get(f"/api/teams/{team_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Chelsea"
    assert data["id"] == team_id


@pytest.mark.asyncio
async def test_update_team(client: AsyncClient):
    # Create a team
    team_data = {
        "name": "Liverpool",
        "country": "England",
        "sport": "Football"
    }
    response = await client.post("/api/teams", json=team_data)
    assert response.status_code == 201
    team_id = response.json()["id"]
    
    # Update it
    update_data = {"country": "UK"}
    response = await client.put(f"/api/teams/{team_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["country"] == "UK"
    assert data["name"] == "Liverpool"  # Name unchanged


@pytest.mark.asyncio
async def test_delete_team(client: AsyncClient):
    # Create a team
    team_data = {
        "name": "Tottenham",
        "country": "England",
        "sport": "Football"
    }
    response = await client.post("/api/teams", json=team_data)
    assert response.status_code == 201
    team_id = response.json()["id"]
    
    # Delete it
    response = await client.delete(f"/api/teams/{team_id}")
    assert response.status_code == 204
    
    # Verify it's gone
    response = await client.get(f"/api/teams/{team_id}")
    assert response.status_code == 404

