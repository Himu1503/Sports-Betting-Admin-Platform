# Logging.
import logging
import os
from fastapi import FastAPI, Request, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from database import create_pool, close_pool
from logger_config import setup_logging, get_logger
from metrics import (
    registry, 
    generate_latest, 
    CONTENT_TYPE_LATEST, 
    http_requests_total, 
    http_request_duration_seconds,
    errors_total
)
from starlette.middleware.base import BaseHTTPMiddleware
import time

from routers import (
    auth,
    sports,
    teams,
    competitions,
    events,
    results,
    customers,
    bookies,
    bets,
    balance_changes,
    audit,
    analytics,
)

# Set up logging
setup_logging(log_level="INFO", log_file="logs/app.log")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Sports Betting Admin Platform API...")
    try:
        await create_pool()
        logger.info("Database connection pool created successfully")
    except Exception as e:
        logger.error("Failed to create database connection pool: %s", e, exc_info=True)
        raise
    yield
    # Shutdown
    logger.info("Shutting down...")
    try:
        await close_pool()
        logger.info("Database connection pool closed successfully")
    except Exception as e:
        logger.error("Error closing database connection pool: %s", e, exc_info=True)


app = FastAPI(
    title="Sports Betting Admin Platform API",
    description="REST API for managing sports betting platform data",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - Allow Vercel domains and local dev
# Get Vercel URL from environment or use localhost for dev
vercel_url = os.getenv("VERCEL_URL", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

# Add Vercel production and preview URLs
if vercel_url:
    allowed_origins.extend([
        f"https://{vercel_url}",
        f"https://www.{vercel_url}",
    ])

# Add custom domain if set
custom_domain = os.getenv("NEXT_PUBLIC_APP_URL") or os.getenv("APP_URL")
if custom_domain:
    allowed_origins.append(custom_domain)
    if not custom_domain.startswith("http"):
        allowed_origins.extend([
            f"https://{custom_domain}",
            f"http://{custom_domain}",
        ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics middleware
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        # Skip metrics endpoint itself
        if path == "/metrics":
            return await call_next(request)
        
        start_time = time.time()
        status_code = 200
        sanitized_path = self._sanitize_path(path)
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as e:
            status_code = 500
            errors_total.labels(type=type(e).__name__, endpoint=sanitized_path).inc()
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time
            http_requests_total.labels(
                method=method,
                endpoint=sanitized_path,
                status=str(status_code)
            ).inc()
            http_request_duration_seconds.labels(
                method=method,
                endpoint=sanitized_path
            ).observe(duration)
    
    def _sanitize_path(self, path: str) -> str:
        import re
        path = re.sub(r'/\d+', '/:id', path)
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/:uuid', path, flags=re.IGNORECASE)
        return path

app.add_middleware(MetricsMiddleware)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    errors_total.labels(type=type(exc).__name__, endpoint=request.url.path).inc()
    logger.error(
        "Unhandled exception: %s - Path: %s - Method: %s",
        exc,
        request.url.path,
        request.method,
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "path": str(request.url.path),
        }
    )


# Request validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_messages = []
    
    for error in errors:
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        msg = error.get("msg", "Validation error")
        error_type = error.get("type", "validation_error")
        
        # Extract error message from context if available
        ctx = error.get("ctx", {})
        if "error" in ctx:
            # Extract message from ValueError or other exception
            error_obj = ctx["error"]
            if hasattr(error_obj, "args") and error_obj.args:
                msg = str(error_obj.args[0])
            elif hasattr(error_obj, "__str__"):
                msg = str(error_obj)
        
        # Create user-friendly error message
        if error_type == "value_error":
            error_messages.append(f"{field}: {msg}" if field else msg)
        elif error_type == "missing":
            error_messages.append(f"{field}: This field is required")
        elif error_type == "string_type":
            error_messages.append(f"{field}: Must be a string")
        elif error_type == "int_parsing" or error_type == "float_parsing":
            error_messages.append(f"{field}: Must be a valid number")
        else:
            error_messages.append(f"{field}: {msg}" if field else msg)
    
    logger.warning(
        "Validation error: %s - Path: %s - Method: %s",
        ", ".join(error_messages),
        request.url.path,
        request.method
    )
    
    # Clean up errors for JSON serialization (remove non-serializable objects)
    clean_errors = []
    for error in errors:
        clean_error = {k: v for k, v in error.items() if k != "ctx" or not any(not isinstance(v2, (str, int, float, bool, type(None))) for v2 in v.values())}
        if "ctx" in clean_error and "error" in clean_error["ctx"]:
            # Convert error object to string
            error_obj = clean_error["ctx"]["error"]
            clean_error["ctx"]["error"] = str(error_obj) if hasattr(error_obj, "__str__") else repr(error_obj)
        clean_errors.append(clean_error)
    
    # Return first error message for simpler client handling
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": error_messages[0] if len(error_messages) == 1 else error_messages,
            "errors": clean_errors  # Include cleaned error details for debugging
        }
    )

# Include routers
app.include_router(auth.router)  # Auth router (login endpoint should be public)
app.include_router(sports.router)
app.include_router(teams.router)
app.include_router(competitions.router)
app.include_router(events.router)
app.include_router(results.router)
app.include_router(customers.router)
app.include_router(bookies.router)
app.include_router(bets.router)
app.include_router(balance_changes.router)
app.include_router(audit.router)
app.include_router(analytics.router)


@app.get("/")
async def root():
    return {
        "message": "Sports Betting Admin Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/metrics")
async def metrics_endpoint():
    return Response(content=generate_latest(registry), media_type=CONTENT_TYPE_LATEST)

