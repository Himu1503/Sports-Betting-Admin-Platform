from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from database import execute_query, execute_one
from logger_config import get_logger
from decimal import Decimal
from datetime import datetime, timedelta

logger = get_logger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# Summary of Bets 
@router.get("/bets/summary")
async def get_bets_summary():
    query = """
        SELECT 
            COUNT(*) as total_bets,
            COUNT(*) FILTER (WHERE placement_status = 'placed') as placed_bets,
            COUNT(*) FILTER (WHERE placement_status = 'pending') as pending_bets,
            COUNT(*) FILTER (WHERE placement_status = 'failed') as failed_bets,
            COUNT(*) FILTER (WHERE outcome = 'win') as winning_bets,
            COUNT(*) FILTER (WHERE outcome = 'lose') as losing_bets,
            COUNT(*) FILTER (WHERE outcome = 'void') as void_bets,
            SUM((stake).amount) FILTER (WHERE placement_status = 'placed') as total_staked,
            SUM((stake).amount * odds) FILTER (WHERE placement_status = 'placed' AND outcome = 'win') as total_won,
            SUM((stake).amount) FILTER (WHERE placement_status = 'placed' AND outcome = 'lose') as total_lost,
            AVG((stake).amount) FILTER (WHERE placement_status = 'placed') as avg_stake,
            AVG(odds) as avg_odds
        FROM bets
    """
    result = await execute_one(query)
    
    if not result:
        return {
            "total_bets": 0,
            "placed_bets": 0,
            "pending_bets": 0,
            "failed_bets": 0,
            "winning_bets": 0,
            "losing_bets": 0,
            "void_bets": 0,
            "total_staked": 0,
            "total_won": 0,
            "total_lost": 0,
            "net_revenue": 0,
            "avg_stake": 0,
            "avg_odds": 0
        }
    
    total_staked = float(result.get('total_staked') or 0)
    total_won = float(result.get('total_won') or 0)
    total_lost = float(result.get('total_lost') or 0)
    net_revenue = total_lost - (total_won - total_staked)
    
    return {
        "total_bets": result.get('total_bets', 0),
        "placed_bets": result.get('placed_bets', 0),
        "pending_bets": result.get('pending_bets', 0),
        "failed_bets": result.get('failed_bets', 0),
        "winning_bets": result.get('winning_bets', 0),
        "losing_bets": result.get('losing_bets', 0),
        "void_bets": result.get('void_bets', 0),
        "total_staked": total_staked,
        "total_won": total_won,
        "total_lost": total_lost,
        "net_revenue": net_revenue,
        "avg_stake": float(result.get('avg_stake') or 0),
        "avg_odds": float(result.get('avg_odds') or 0),
        "win_rate": (result.get('winning_bets', 0) / max(result.get('placed_bets', 1), 1)) * 100
    }

# Bets by Sport
@router.get("/bets/by-sport")
async def get_bets_by_sport():
    query = """
        SELECT 
            sport,
            COUNT(*) as total_bets,
            COUNT(*) FILTER (WHERE placement_status = 'placed') as placed_bets,
            COUNT(*) FILTER (WHERE outcome = 'win') as winning_bets,
            COUNT(*) FILTER (WHERE outcome = 'lose') as losing_bets,
            SUM((stake).amount) FILTER (WHERE placement_status = 'placed') as total_staked,
            SUM((stake).amount * odds) FILTER (WHERE placement_status = 'placed' AND outcome = 'win') as total_won,
            SUM((stake).amount) FILTER (WHERE placement_status = 'placed' AND outcome = 'lose') as total_lost,
            AVG((stake).amount) FILTER (WHERE placement_status = 'placed') as avg_stake,
            AVG(odds) as avg_odds
        FROM bets
        GROUP BY sport
        ORDER BY total_bets DESC
    """
    results = await execute_query(query)
    
    stats = []
    for row in results:
        placed = row.get('placed_bets', 0) or 0
        won = row.get('winning_bets', 0) or 0
        win_rate = (won / max(placed, 1)) * 100
        
        stats.append({
            "sport": row['sport'],
            "total_bets": row.get('total_bets', 0),
            "placed_bets": placed,
            "winning_bets": won,
            "losing_bets": row.get('losing_bets', 0) or 0,
            "total_staked": float(row.get('total_staked') or 0),
            "total_won": float(row.get('total_won') or 0),
            "total_lost": float(row.get('total_lost') or 0),
            "avg_stake": float(row.get('avg_stake') or 0),
            "avg_odds": float(row.get('avg_odds') or 0),
            "win_rate": win_rate
        })
    
    return stats


@router.get("/bets/by-status")
async def get_bets_by_status():
    """Get bet statistics grouped by placement status."""
    query = """
        SELECT 
            placement_status,
            COUNT(*) as count,
            SUM((stake).amount) as total_staked,
            AVG((stake).amount) as avg_stake
        FROM bets
        GROUP BY placement_status
        ORDER BY count DESC
    """
    results = await execute_query(query)
    
    return [
        {
            "status": row['placement_status'],
            "count": row.get('count', 0),
            "total_staked": float(row.get('total_staked') or 0),
            "avg_stake": float(row.get('avg_stake') or 0)
        }
        for row in results
    ]

# Bets by Outcome
@router.get("/bets/by-outcome")
async def get_bets_by_outcome():
    query = """
        SELECT 
            COALESCE(outcome::text, 'pending') as outcome,
            COUNT(*) as count,
            SUM((stake).amount) as total_staked,
            SUM((stake).amount * odds) FILTER (WHERE outcome = 'win') as total_won,
            SUM((stake).amount) FILTER (WHERE outcome = 'lose') as total_lost,
            AVG((stake).amount) as avg_stake,
            AVG(odds) as avg_odds
        FROM bets
        WHERE placement_status = 'placed'
        GROUP BY outcome
        ORDER BY count DESC
    """
    results = await execute_query(query)
    
    return [
        {
            "outcome": row['outcome'],
            "count": row.get('count', 0),
            "total_staked": float(row.get('total_staked') or 0),
            "total_won": float(row.get('total_won') or 0),
            "total_lost": float(row.get('total_lost') or 0),
            "avg_stake": float(row.get('avg_stake') or 0),
            "avg_odds": float(row.get('avg_odds') or 0)
        }
        for row in results
    ]

# Bets by Bookie
@router.get("/bets/by-bookie")
async def get_bets_by_bookie():
    query = """
        SELECT 
            bookie,
            COUNT(*) as total_bets,
            COUNT(*) FILTER (WHERE placement_status = 'placed') as placed_bets,
            COUNT(*) FILTER (WHERE outcome = 'win') as winning_bets,
            SUM((stake).amount) FILTER (WHERE placement_status = 'placed') as total_staked,
            AVG((stake).amount) FILTER (WHERE placement_status = 'placed') as avg_stake,
            AVG(odds) as avg_odds
        FROM bets
        GROUP BY bookie
        ORDER BY total_bets DESC
    """
    results = await execute_query(query)
    
    stats = []
    for row in results:
        placed = row.get('placed_bets', 0) or 0
        won = row.get('winning_bets', 0) or 0
        win_rate = (won / max(placed, 1)) * 100
        
        stats.append({
            "bookie": row['bookie'],
            "total_bets": row.get('total_bets', 0),
            "placed_bets": placed,
            "winning_bets": won,
            "total_staked": float(row.get('total_staked') or 0),
            "avg_stake": float(row.get('avg_stake') or 0),
            "avg_odds": float(row.get('avg_odds') or 0),
            "win_rate": win_rate
        })
    
    return stats

# Bets Trends
@router.get("/bets/trends")
async def get_bets_trends(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back")
):
    query = """
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_bets,
            COUNT(*) FILTER (WHERE placement_status = 'placed') as placed_bets,
            SUM((stake).amount) FILTER (WHERE placement_status = 'placed') as total_staked,
            COUNT(*) FILTER (WHERE outcome = 'win') as winning_bets
        FROM bets
        WHERE created_at >= CURRENT_DATE - INTERVAL '%s days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    """ % days
    
    results = await execute_query(query)
    
    return [
        {
            "date": row['date'].isoformat() if isinstance(row['date'], datetime) else str(row['date']),
            "total_bets": row.get('total_bets', 0),
            "placed_bets": row.get('placed_bets', 0),
            "total_staked": float(row.get('total_staked') or 0),
            "winning_bets": row.get('winning_bets', 0)
        }
        for row in results
    ]

# Summary of Results
@router.get("/results/summary")
async def get_results_summary():
    query = """
        SELECT 
            COUNT(DISTINCT e.id) as total_events,
            COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'finished') as finished_events,
            COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'live') as live_events,
            COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'prematch') as prematch_events,
            COUNT(r.event_id) as events_with_results,
            AVG(r.score_a + r.score_b) as avg_total_score,
            MAX(r.score_a + r.score_b) as max_total_score,
            MIN(r.score_a + r.score_b) as min_total_score,
            AVG(r.score_a) as avg_score_a,
            AVG(r.score_b) as avg_score_b
        FROM events e
        LEFT JOIN results r ON e.id = r.event_id
    """
    result = await execute_one(query)
    
    if not result:
        return {
            "total_events": 0,
            "finished_events": 0,
            "live_events": 0,
            "prematch_events": 0,
            "events_with_results": 0,
            "avg_total_score": 0,
            "max_total_score": 0,
            "min_total_score": 0,
            "avg_score_a": 0,
            "avg_score_b": 0
        }
    
    return {
        "total_events": result.get('total_events', 0) or 0,
        "finished_events": result.get('finished_events', 0) or 0,
        "live_events": result.get('live_events', 0) or 0,
        "prematch_events": result.get('prematch_events', 0) or 0,
        "events_with_results": result.get('events_with_results', 0) or 0,
        "avg_total_score": float(result.get('avg_total_score') or 0),
        "max_total_score": result.get('max_total_score') or 0,
        "min_total_score": result.get('min_total_score') or 0,
        "avg_score_a": float(result.get('avg_score_a') or 0),
        "avg_score_b": float(result.get('avg_score_b') or 0)
    }

# Results by Competition
@router.get("/results/by-competition")
async def get_results_by_competition():
    query = """
        SELECT 
            c.name as competition_name,
            c.sport,
            COUNT(DISTINCT e.id) as total_events,
            COUNT(r.event_id) as events_with_results,
            AVG(r.score_a + r.score_b) as avg_total_score,
            AVG(r.score_a) as avg_score_a,
            AVG(r.score_b) as avg_score_b
        FROM competitions c
        LEFT JOIN events e ON c.id = e.competition_id
        LEFT JOIN results r ON e.id = r.event_id
        GROUP BY c.id, c.name, c.sport
        HAVING COUNT(DISTINCT e.id) > 0
        ORDER BY total_events DESC
    """
    results = await execute_query(query)
    
    return [
        {
            "competition_name": row['competition_name'],
            "sport": row['sport'],
            "total_events": row.get('total_events', 0),
            "events_with_results": row.get('events_with_results', 0),
            "avg_total_score": float(row.get('avg_total_score') or 0),
            "avg_score_a": float(row.get('avg_score_a') or 0),
            "avg_score_b": float(row.get('avg_score_b') or 0)
        }
        for row in results
    ]

# Score Distribution
@router.get("/results/score-distribution")
async def get_score_distribution():
    query = """
        SELECT 
            score_a,
            score_b,
            COUNT(*) as count,
            (score_a + score_b) as total_score
        FROM results
        GROUP BY score_a, score_b, (score_a + score_b)
        ORDER BY count DESC
        LIMIT 20
    """
    results = await execute_query(query)
    
    return [
        {
            "score_a": row.get('score_a'),
            "score_b": row.get('score_b'),
            "total_score": row.get('total_score'),
            "count": row.get('count', 0)
        }
        for row in results
    ]

# Top Customers
@router.get("/top-customers")
async def get_top_customers(
    limit: int = Query(10, ge=1, le=100)
):
    query = """
        SELECT 
            c.id,
            c.username,
            c.real_name,
            COUNT(b.id) as total_bets,
            COUNT(b.id) FILTER (WHERE b.placement_status = 'placed') as placed_bets,
            COUNT(b.id) FILTER (WHERE b.outcome = 'win') as winning_bets,
            SUM((b.stake).amount) FILTER (WHERE b.placement_status = 'placed') as total_staked,
            SUM((b.stake).amount * b.odds) FILTER (WHERE b.placement_status = 'placed' AND b.outcome = 'win') as total_won,
            SUM((b.stake).amount) FILTER (WHERE b.placement_status = 'placed' AND b.outcome = 'lose') as total_lost
        FROM customers c
        LEFT JOIN bets b ON c.id = b.customer_id
        GROUP BY c.id, c.username, c.real_name
        HAVING COUNT(b.id) > 0
        ORDER BY total_bets DESC, total_staked DESC
        LIMIT $1
    """
    results = await execute_query(query, limit)
    
    customers = []
    for row in results:
        placed = row.get('placed_bets', 0) or 0
        won = row.get('winning_bets', 0) or 0
        win_rate = (won / max(placed, 1)) * 100
        
        customers.append({
            "customer_id": row['id'],
            "username": row['username'],
            "real_name": row['real_name'],
            "total_bets": row.get('total_bets', 0),
            "placed_bets": placed,
            "winning_bets": won,
            "total_staked": float(row.get('total_staked') or 0),
            "total_won": float(row.get('total_won') or 0),
            "total_lost": float(row.get('total_lost') or 0),
            "net_profit": float(row.get('total_won') or 0) - float(row.get('total_staked') or 0),
            "win_rate": win_rate
        })
    
    return customers

# Dashboard
@router.get("/dashboard")
async def get_dashboard_data():
    bets_summary = await get_bets_summary()
    results_summary = await get_results_summary()
    bets_by_sport = await get_bets_by_sport()
    bets_by_status = await get_bets_by_status()
    top_customers = await get_top_customers(limit=5)
    
    return {
        "bets": bets_summary,
        "results": results_summary,
        "bets_by_sport": bets_by_sport[:5],  
        "bets_by_status": bets_by_status,
        "top_customers": top_customers,
        "generated_at": datetime.now().isoformat()
    }

