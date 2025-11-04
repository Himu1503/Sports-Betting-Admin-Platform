"""
Vercel serverless function handler for FastAPI application.
This file is the entry point for all API requests on Vercel.
"""
import sys
import os

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

from mangum import Mangum
from main import app

# Create Mangum handler for Vercel
# lifespan="off" because serverless functions are stateless
handler = Mangum(app, lifespan="off")

# Export handler for Vercel
__all__ = ["handler"]

