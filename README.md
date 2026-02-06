# Sports Betting Admin Platform - Extra Setup Instructions

# This application is build using FastAPI(backend) and React(frontend)
  - Pydantic Models for data and input validation.
  - FastAPI "Depends" for dependecy injection.
  - Sanitized query.
  - Fast Database interactions. 
  - JWT Auth. 
  - Pytest for the backend.
  - Charts analysis for the users.
  - Monitoring of APIs performance using Grafana and Prometheus.
  - Audit Logs. 


### 1. Extract the Project

Extract the zip file to a directory of your choice:
```bash
unzip fs-take-home.zip
cd fs-take-home
```

### 2. Start All Services

From the project root directory, run:

```bash
docker-compose up -d
```

This command will:
- Download required Docker images (if not already present)
- Build the backend and frontend services
- Start all services in detached mode:
  - **PostgreSQL Database** (port 5432)
  - **Adminer** - Database admin UI (port 8080)
  - **Backend API** - FastAPI application (port 8000)
  - **Frontend** - React application (port 3000)
  - **Prometheus** - Metrics collection (port 9090)
  - **Grafana** - Metrics visualization (port 3001)

### 3. Wait for Services to Start

The first startup may take a few minutes to:
- Build Docker images
- Initialize the database
- Start all containers

Check the status of services:
```bash
docker-compose ps
```

All services should show "Up" status.

### 4. Access the Application

Once all services are running, you can access:

#### Main Application
- **Frontend (React App)**: [http://localhost:3000](http://localhost:3000)
  - Login credentials(JWT Auth):
    - Username: `admin`
    - Password: `admin`

  - Features:
    - Theme Toggler using Context API
    - Login page 
    - Separate audit log page
    - Analytic View to make the charts and calculations and for display purpose

#### Backend Services
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Alternative Docs (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

#### Database
- **Adminer (Database Admin)**: [http://localhost:8080](http://localhost:8080)
  - System: `PostgreSQL`
  - Server: `postgres`
  - Username: `analyst_user`
  - Password: `analyst_password`
  - Database: `analyst_platform`

#### Monitoring & Metrics
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
  - Query metrics, view targets, and explore time-series data
- **Grafana**: [http://localhost:3001](http://localhost:3001)
  - Username: `admin`
  - Password: `admin`
  - Pre-configured dashboard: *"Sports Betting Platform - API Metrics"*

---

## Viewing Logs

View logs in log folder
  - logs/app.log


View logs for all services:
```bash
docker-compose logs -f
```

View logs for a specific service:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f prometheus
docker-compose logs -f grafana
```

View backend application logs (from mounted volume):
```bash
cat backend/logs/app.log
tail -f backend/logs/app.log
```

### View Service Health
```bash
# Backend health check
curl http://localhost:8000/health

# Prometheus targets
open http://localhost:9090/targets
```
---


## Running Tests

To run the backend tests, first ensure all Docker services are running:

# Without Docker running - tests will skip
cd backend
Eg: pytest tests/test_teams.py -v

# With Docker running - tests will execute
docker-compose up -d
Eg: pytest tests/test_teams.py -v

```bash
# Start all services
docker-compose up -d

# Wait for database to be ready
docker-compose ps postgres  # Should show "healthy"
```

Then run tests:

```bash
# Run tests from the backend directory
cd backend
pytest

# Or run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_teams.py

# Run with verbose output
pytest -v
```

**Note**: Tests require the PostgreSQL database to be running via Docker. If the database is not available, tests will be skipped with a helpful message.

To run tests inside Docker container:
```bash
docker-compose exec backend pytest
```



