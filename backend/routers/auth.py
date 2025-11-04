# Authentication router endpoints
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from auth import create_access_token, get_current_user
from logger_config import get_logger
from metrics import auth_logins_total

logger = get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Hardcoded admin for testing purposes
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"  


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class UserInfo(BaseModel):
    username: str


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    # Simple credential check
    if login_data.username == ADMIN_USERNAME and login_data.password == ADMIN_PASSWORD:
        logger.info("Successful login attempt for user: %s", login_data.username)
        auth_logins_total.labels(status="success").inc()
        
        # Create access token
        access_token = create_access_token(data={"sub": login_data.username})
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            username=login_data.username
        )
    else:
        logger.warning("Failed login attempt for user: %s", login_data.username)
        auth_logins_total.labels(status="failed").inc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserInfo(username=current_user["username"])


@router.post("/verify")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    return {"valid": True, "username": current_user["username"]}

