from typing import AsyncGenerator, Optional, Union
import asyncpg
from contextlib import asynccontextmanager
from functools import lru_cache
import os
from pydantic_settings import BaseSettings
from logger_config import get_logger

logger = get_logger(__name__)


class DatabaseSettings(BaseSettings):    
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_user: str = os.getenv("DB_USER", "analyst_user")
    db_password: str = os.getenv("DB_PASSWORD", "analyst_password")
    db_name: str = os.getenv("DB_NAME", "analyst_platform")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_db_settings() -> DatabaseSettings:
    return DatabaseSettings()


# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def create_pool() -> asyncpg.Pool:
    global _pool
    settings = get_db_settings()
    
    logger.info(
        "Creating database connection pool - Host: %s, Port: %s, Database: %s",
        settings.db_host,
        settings.db_port,
        settings.db_name
    )
    
    try:
        _pool = await asyncpg.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            database=settings.db_name,
            min_size=5,
            max_size=20,
            command_timeout=60,
        )
        logger.info("Database connection pool created successfully")
        return _pool
    except Exception as e:
        logger.error(
            "Failed to create database connection pool: %s - Host: %s, Port: %s, Database: %s",
            e,
            settings.db_host,
            settings.db_port,
            settings.db_name,
            exc_info=True
        )
        raise


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    global _pool
    if _pool is None:
        await create_pool()
    
    async with _pool.acquire() as connection:
        yield connection


async def execute_query(query: str, *args) -> list[dict]:
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch(query, *args)
            logger.debug("Query executed successfully - Rows returned: %d", len(rows))
            return [dict(row) for row in rows]
    except Exception as e:
        logger.error("Database query error: %s - Query: %s", e, query[:100], exc_info=True)
        raise


async def execute_one(query: str, *args) -> Optional[dict]:
    try:
        async with get_db_connection() as conn:
            row = await conn.fetchrow(query, *args)
            logger.debug("Query executed successfully - Row found: %s", row is not None)
            return dict(row) if row else None
    except Exception as e:
        logger.error("Database query error: %s - Query: %s", e, query[:100], exc_info=True)
        raise


async def execute_insert(query: str, *args) -> int:
    try:
        async with get_db_connection() as conn:
            result = await conn.fetchval(query, *args)
            logger.debug("Insert executed successfully - Row ID: %s", result)
            return result
    except Exception as e:
        logger.error("Database insert error: %s - Query: %s", e, query[:100], exc_info=True)
        raise


async def execute_update(query: str, *args) -> int:
    try:
        async with get_db_connection() as conn:
            result = await conn.execute(query, *args)
            affected = int(result.split()[-1]) if result else 0
            logger.debug("Update/Delete executed successfully - Rows affected: %d", affected)
            return affected
    except Exception as e:
        logger.error("Database update/delete error: %s - Query: %s", e, query[:100], exc_info=True)
        raise

