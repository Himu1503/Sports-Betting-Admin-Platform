import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
async def test_get_events(client: AsyncClient):
    response = await client.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_create_event(client: AsyncClient):
    # Get required data
    teams_response = await client.get("/api/teams")
    teams = teams_response.json()
    team_a_id = teams[0]["id"]
    team_b_id = teams[1]["id"]
    
    comps_response = await client.get("/api/competitions")
    comp_id = comps_response.json()[0]["id"]
    
    event_data = {
        "date": (datetime.now() + timedelta(days=1)).isoformat(),
        "competition_id": comp_id,
        "team_a_id": team_a_id,
        "team_b_id": team_b_id,
        "status": "prematch"
    }
    response = await client.post("/api/events", json=event_data)
    assert response.status_code == 201
    data = response.json()
    assert data["competition_id"] == comp_id
    assert data["team_a_id"] == team_a_id
    assert data["team_b_id"] == team_b_id
    assert data["status"] == "prematch"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_event_same_teams_fails(client: AsyncClient):
    teams_response = await client.get("/api/teams")
    teams = teams_response.json()
    team_id = teams[0]["id"]
    
    comps_response = await client.get("/api/competitions")
    comp_id = comps_response.json()[0]["id"]
    
    event_data = {
        "date": (datetime.now() + timedelta(days=1)).isoformat(),
        "competition_id": comp_id,
        "team_a_id": team_id,
        "team_b_id": team_id,  # Same team
        "status": "prematch"
    }
    response = await client.post("/api/events", json=event_data)
    # Pydantic validation now catches this before it reaches the database, returning 422
    assert response.status_code in (400, 422), f"Expected 400 or 422, got {response.status_code}: {response.text}"
    if response.status_code == 422:
        # Pydantic validation error
        data = response.json()
        detail = data.get("detail", "")
        # Handle both string and array formats
        if isinstance(detail, list):
            detail_str = " ".join(str(d) for d in detail)
        else:
            detail_str = str(detail)
        assert "different" in detail_str.lower() or "team" in detail_str.lower()
    else:
        # Database constraint error
        data = response.json()
        assert "different" in data.get("detail", "").lower() or "team" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_get_event_by_id(client: AsyncClient):
    # Create an event
    teams_response = await client.get("/api/teams")
    teams = teams_response.json()
    comps_response = await client.get("/api/competitions")
    comp_id = comps_response.json()[0]["id"]
    
    event_data = {
        "date": (datetime.now() + timedelta(days=1)).isoformat(),
        "competition_id": comp_id,
        "team_a_id": teams[0]["id"],
        "team_b_id": teams[1]["id"],
        "status": "prematch"
    }
    response = await client.post("/api/events", json=event_data)
    assert response.status_code == 201
    event_id = response.json()["id"]
    
    # Get it back
    response = await client.get(f"/api/events/{event_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == event_id


@pytest.mark.asyncio
async def test_update_event_status(client: AsyncClient):
    # Create event
    teams_response = await client.get("/api/teams")
    teams = teams_response.json()
    comps_response = await client.get("/api/competitions")
    comp_id = comps_response.json()[0]["id"]
    
    event_data = {
        "date": (datetime.now() + timedelta(days=1)).isoformat(),
        "competition_id": comp_id,
        "team_a_id": teams[0]["id"],
        "team_b_id": teams[1]["id"],
        "status": "prematch"
    }
    response = await client.post("/api/events", json=event_data)
    assert response.status_code == 201
    event_id = response.json()["id"]
    
    # Update status
    update_data = {"status": "live"}
    response = await client.put(f"/api/events/{event_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "live"


@pytest.mark.asyncio
async def test_delete_event(client: AsyncClient):
    # Create event
    teams_response = await client.get("/api/teams")
    teams = teams_response.json()
    comps_response = await client.get("/api/competitions")
    comp_id = comps_response.json()[0]["id"]
    
    event_data = {
        "date": (datetime.now() + timedelta(days=1)).isoformat(),
        "competition_id": comp_id,
        "team_a_id": teams[0]["id"],
        "team_b_id": teams[1]["id"],
        "status": "prematch"
    }
    response = await client.post("/api/events", json=event_data)
    assert response.status_code == 201
    event_id = response.json()["id"]
    
    # Delete it
    response = await client.delete(f"/api/events/{event_id}")
    assert response.status_code == 204
    
    # Verify it's gone
    response = await client.get(f"/api/events/{event_id}")
    assert response.status_code == 404

