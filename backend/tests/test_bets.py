import pytest
from httpx import AsyncClient
from decimal import Decimal


@pytest.mark.asyncio
async def test_get_bets(client: AsyncClient):
    response = await client.get("/api/bets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_create_bet(client: AsyncClient):
    # First, we need an event
    # Get teams
    teams_response = await client.get("/api/teams")
    teams = teams_response.json()
    team_a_id = teams[0]["id"]
    team_b_id = teams[1]["id"]
    
    # Get competition
    comps_response = await client.get("/api/competitions")
    comp = comps_response.json()[0]
    
    # Create event
    from datetime import datetime, timedelta
    event_data = {
        "date": (datetime.now() + timedelta(days=1)).isoformat(),
        "competition_id": comp["id"],
        "team_a_id": team_a_id,
        "team_b_id": team_b_id,
        "status": "prematch"
    }
    event_response = await client.post("/api/events", json=event_data)
    assert event_response.status_code == 201
    event_id = event_response.json()["id"]
    
    # Get customer
    customers_response = await client.get("/api/customers")
    customer_id = customers_response.json()[0]["id"]
    
    # Create bet
    bet_data = {
        "bookie": "TestBookie",
        "customer_id": customer_id,
        "bookie_bet_id": "TEST-001",
        "bet_type": "match_winner",
        "event_id": event_id,
        "sport": "Football",
        "placement_status": "placed",
        "stake": {"amount": 100.0, "currency": "USD"},
        "odds": 2.5,
        "placement_data": {"selection": "home_win"}
    }
    response = await client.post("/api/bets", json=bet_data)
    assert response.status_code == 201
    data = response.json()
    assert data["bookie"] == "TestBookie"
    assert data["bookie_bet_id"] == "TEST-001"
    assert data["placement_status"] == "placed"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_bet_by_id(client: AsyncClient):
    # Create a bet (simplified - using existing data)
    response = await client.get("/api/bets")
    bets = response.json()
    
    if bets:
        bet_id = bets[0]["id"]
        response = await client.get(f"/api/bets/{bet_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == bet_id


@pytest.mark.asyncio
async def test_get_bets_with_filters(client: AsyncClient):
    # Filter by customer
    customers_response = await client.get("/api/customers")
    if customers_response.json():
        customer_id = customers_response.json()[0]["id"]
        response = await client.get(f"/api/bets?customer_id={customer_id}")
        assert response.status_code == 200
        data = response.json()
        assert all(bet["customer_id"] == customer_id for bet in data)


@pytest.mark.asyncio
async def test_update_bet_outcome(client: AsyncClient):
    # Get existing bet or create one
    bets_response = await client.get("/api/bets")
    bets = bets_response.json()
    
    if bets:
        bet_id = bets[0]["id"]
        update_data = {"outcome": "win"}
        response = await client.put(f"/api/bets/{bet_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["outcome"] == "win"


@pytest.mark.asyncio
async def test_delete_bet(client: AsyncClient):
    # Create a bet first (would need full setup)
    bets_response = await client.get("/api/bets")
    bets = bets_response.json()
    
    if bets:
        bet_id = bets[0]["id"]
        response = await client.delete(f"/api/bets/{bet_id}")
        assert response.status_code == 204
        
        # Verify it's gone
        response = await client.get(f"/api/bets/{bet_id}")
        assert response.status_code == 404

