from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry, REGISTRY
import time

# Create custom registry
registry = CollectorRegistry()

# HTTP Metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=registry
)

# Database Metrics
db_queries_total = Counter(
    'db_queries_total',
    'Total number of database queries',
    ['operation'],
    registry=registry
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation'],
    registry=registry
)

# Business Metrics
sports_total = Gauge(
    'sports_total',
    'Total number of sports',
    registry=registry
)

teams_total = Gauge(
    'teams_total',
    'Total number of teams',
    registry=registry
)

events_total = Gauge(
    'events_total',
    'Total number of events',
    registry=registry
)

bets_total = Gauge(
    'bets_total',
    'Total number of bets',
    registry=registry
)

customers_total = Gauge(
    'customers_total',
    'Total number of customers',
    registry=registry
)

# Authentication Metrics
auth_logins_total = Counter(
    'auth_logins_total',
    'Total number of login attempts',
    ['status'],
    registry=registry
)

# Error Metrics
errors_total = Counter(
    'errors_total',
    'Total number of errors',
    ['type', 'endpoint'],
    registry=registry
)


class MetricsMiddleware:
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        method = scope["method"]
        path = scope["path"]
        
        # Start timer
        start_time = time.time()
        
        # Track request
        status_code = 200
        
        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                # Record metrics
                http_requests_total.labels(
                    method=method,
                    endpoint=self._sanitize_path(path),
                    status=str(status_code)
                ).inc()
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            status_code = 500
            errors_total.labels(
                type=type(e).__name__,
                endpoint=self._sanitize_path(path)
            ).inc()
            raise
        finally:
            # Record duration
            duration = time.time() - start_time
            http_request_duration_seconds.labels(
                method=method,
                endpoint=self._sanitize_path(path)
            ).observe(duration)
    
    def _sanitize_path(self, path: str) -> str:
        # Replace numeric IDs with :id
        import re
        path = re.sub(r'/\d+', '/:id', path)
        # Replace UUIDs with :uuid
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/:uuid', path, flags=re.IGNORECASE)
        return path

