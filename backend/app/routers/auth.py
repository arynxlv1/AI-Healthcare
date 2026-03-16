from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from ..core.config import settings

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Mock auth for demo
    if form_data.username == "admin" and form_data.password == "password":
        return {
            "access_token": "mock_token_for_demo",
            "token_type": "bearer",
            "role": "super_admin"
        }
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password"
    )

@router.post("/register")
async def register():
    return {"message": "User registration is currently disabled for demo security"}
