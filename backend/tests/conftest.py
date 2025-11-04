# Fixtures
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from fastapi.testclient import TestClient
import asyncpg
import os
from pathlib import Path

from main import app
from database import create_pool, close_pool, get_db_settings


# Test database configuration
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "analyst_platform_test")
TEST_DB_HOST = os.getenv("TEST_DB_HOST", "localhost")
TEST_DB_PORT = int(os.getenv("TEST_DB_PORT", "5432"))
TEST_DB_USER = os.getenv("TEST_DB_USER", "analyst_user")
TEST_DB_PASSWORD = os.getenv("TEST_DB_PASSWORD", "analyst_password")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


async def init_database_schema(pool):
    # Get the project root (two levels up from tests/)
    project_root = Path(__file__).parent.parent.parent
    schema_file = project_root / "init" / "01-schema.sql"
    triggers_file = project_root / "init" / "02-triggers.sql"
    
    async with pool.acquire() as conn:
        # Check if schema already exists
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
        if tables:
            # Schema already exists, skip initialization
            return
        
        # Read and execute schema file
        if schema_file.exists():
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            # Execute in a transaction
            async with conn.transaction():
                await conn.execute(schema_sql)
        
        # Read and execute triggers file
        if triggers_file.exists():
            with open(triggers_file, 'r') as f:
                triggers_sql = f.read()
            # Execute triggers
            async with conn.transaction():
                await conn.execute(triggers_sql)


@pytest.fixture(scope="session")
async def test_db_pool():
    # For simplicity, use the same database but with a test schema or use actual test DB
    # In production, you'd want a separate test database
    # For now, we'll use the same database but tests clean up after themselves
    
    # Try to connect to database, skip tests if not available
    try:
        pool = await asyncpg.create_pool(
            host=TEST_DB_HOST,
            port=TEST_DB_PORT,
            user=TEST_DB_USER,
            password=TEST_DB_PASSWORD,
            database="postgres",  # Connect to default postgres
            min_size=1,
            max_size=5,
            timeout=3.0,  # Quick timeout for connection test
        )
    except Exception as e:
        # Skip tests if database is not available
        pytest.skip(f"Database not available at {TEST_DB_HOST}:{TEST_DB_PORT}. "
                   f"Please start Docker services with 'docker-compose up -d'. Error: {type(e).__name__}: {str(e)}")
    
    # Try to create test database if it doesn't exist
    try:
        async with pool.acquire() as conn:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME
            )
            if not exists:
                # Create test database
                await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    except Exception:
        # If we can't create test DB, use the main one (for Docker simplicity)
        pass
    
    await pool.close()
    
    # Try to connect to test DB, fallback to main DB
    try:
        test_pool = await asyncpg.create_pool(
            host=TEST_DB_HOST,
            port=TEST_DB_PORT,
            user=TEST_DB_USER,
            password=TEST_DB_PASSWORD,
            database=TEST_DB_NAME,
            min_size=1,
            max_size=5,
            timeout=3.0,
        )
        db_name = TEST_DB_NAME
    except Exception:
        # Fallback to main database (tests will clean up)
        try:
            test_pool = await asyncpg.create_pool(
                host=TEST_DB_HOST,
                port=TEST_DB_PORT,
                user=TEST_DB_USER,
                password=TEST_DB_PASSWORD,
                database="analyst_platform",
                min_size=1,
                max_size=5,
                timeout=3.0,
            )
            db_name = "analyst_platform"
        except Exception as e:
            pytest.skip(f"Database not available at {TEST_DB_HOST}:{TEST_DB_PORT}. "
                       f"Please start Docker services with 'docker-compose up -d'. Error: {type(e).__name__}: {str(e)}")
    
    # Initialize schema
    await init_database_schema(test_pool)
    
    yield test_pool
    
    await test_pool.close()


@pytest.fixture(scope="function")
async def clean_db(test_db_pool):
    async with test_db_pool.acquire() as conn:
        try:
            # Check if tables exist first
            tables = await conn.fetch(
                """
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename != 'schema_migrations'
                """
            )
            existing_tables = {row['tablename'] for row in tables}
            
            if not existing_tables:
                # Tables don't exist, skip cleanup
                return
            
            # Disable triggers temporarily
            for table in tables:
                try:
                    await conn.execute(f'ALTER TABLE {table["tablename"]} DISABLE TRIGGER ALL')
                except Exception:
                    pass
            
            # Delete all data (in reverse order to respect foreign keys)
            table_order = [
                'audit_log', 'bets', 'balance_changes', 'results', 'events', 
                'customers', 'teams', 'competitions', 'bookies', 'sports'
            ]
            for table_name in table_order:
                if table_name in existing_tables:
                    try:
                        await conn.execute(f'TRUNCATE TABLE {table_name} CASCADE')
                    except Exception:
                        pass
            
            # Re-enable triggers
            for table in tables:
                try:
                    await conn.execute(f'ALTER TABLE {table["tablename"]} ENABLE TRIGGER ALL')
                except Exception:
                    pass
            
            # Reset sequences
            sequences = await conn.fetch(
                """
                SELECT sequence_name FROM information_schema.sequences 
                WHERE sequence_schema = 'public'
                """
            )
            for seq in sequences:
                try:
                    await conn.execute(f"ALTER SEQUENCE {seq['sequence_name']} RESTART WITH 1")
                except Exception:
                    pass
        except Exception:
            # If anything fails, just skip cleanup (database may not be initialized)
            pass


@pytest.fixture(scope="function")
async def setup_test_data(test_db_pool, clean_db):
    async with test_db_pool.acquire() as conn:
        # Check if tables exist
        tables = await conn.fetch(
            """
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
            """
        )
        existing_tables = {row['tablename'] for row in tables}
        
        if not existing_tables:
            # Skip if tables don't exist (database not initialized)
            return
        
        try:
            # Insert sports
            await conn.execute("INSERT INTO sports (name) VALUES ('Football'), ('Basketball') ON CONFLICT DO NOTHING")
        except Exception:
            pass
        
        try:
            # Insert teams
            await conn.execute("""
                INSERT INTO teams (name, country, sport) 
                VALUES 
                    ('Test Team A', 'USA', 'Football'),
                    ('Test Team B', 'USA', 'Football')
                ON CONFLICT DO NOTHING
            """)
        except Exception:
            pass
        
        try:
            # Insert competitions
            await conn.execute("""
                INSERT INTO competitions (name, country, sport, active)
                VALUES ('Test League', 'USA', 'Football', true)
                ON CONFLICT DO NOTHING
            """)
        except Exception:
            pass
        
        try:
            # Insert customers
            await conn.execute("""
                INSERT INTO customers (username, password, real_name, currency, status, balance)
                VALUES 
                    ('test_user', 'hashed_pass', 'Test User', 'USD', 'active', ROW(1000.0, 'USD'::currency_code)::money_amount)
                ON CONFLICT DO NOTHING
            """)
        except Exception:
            pass
        
        try:
            # Insert bookies
            await conn.execute("""
                INSERT INTO bookies (name, description, preferences)
                VALUES ('TestBookie', 'Test bookie description', '{}'::jsonb)
                ON CONFLICT DO NOTHING
            """)
        except Exception:
            pass


@pytest.fixture
async def client(clean_db, setup_test_data, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    # Override database settings
    monkeypatch.setenv("DB_NAME", TEST_DB_NAME)
    monkeypatch.setenv("DB_HOST", TEST_DB_HOST)
    monkeypatch.setenv("DB_PORT", str(TEST_DB_PORT))
    monkeypatch.setenv("DB_USER", TEST_DB_USER)
    monkeypatch.setenv("DB_PASSWORD", TEST_DB_PASSWORD)
    
    # Clear the cached settings
    from database import get_db_settings
    get_db_settings.cache_clear()
    
    # Create database pool
    try:
        await create_pool()
    except Exception as e:
        pytest.skip(f"Failed to create database pool. Make sure Docker services are running. Error: {e}")
    
    # Create test client
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    # Cleanup
    await close_pool()


@pytest.fixture
def sync_client() -> TestClient:
    """Create a synchronous test client for simple tests."""
    return TestClient(app)

