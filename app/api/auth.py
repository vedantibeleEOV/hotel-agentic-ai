import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.security import create_access_token, verify_password
from app.database.connection import SessionLocal
from app.database.orm.staff_entity import StaffEntity
from app.database.orm.user_entity import UserEntity
from app.dependencies.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    staff_id: Optional[int] = None
    name: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticate user with username and password. Returns a JWT access token.",
)
async def login_endpoint(payload: LoginRequest):
    """
    Authenticate a user with username and password.
    Returns 401 with the exact same error message on wrong username or wrong password.
    """
    username_clean = (payload.username or "").strip().lower()
    password_clean = payload.password or ""

    if not username_clean or not password_clean:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with SessionLocal() as session:
        stmt = select(UserEntity).where(UserEntity.username == username_clean)
        user = session.execute(stmt).scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(password_clean, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        staff_name = None
        if user.staff_id:
            staff = session.get(StaffEntity, user.staff_id)
            if staff:
                staff_name = staff.name

        display_name = staff_name or user.username.title()

        access_token = create_access_token(
            user_id=user.id,
            username=user.username,
            role=user.role,
            staff_id=user.staff_id,
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserOut(
                id=user.id,
                username=user.username,
                role=user.role,
                staff_id=user.staff_id,
                name=display_name,
                is_active=user.is_active,
            ),
        )


@router.get(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get Current User Profile",
    description="Retrieve the profile of the currently authenticated user using the JWT Bearer token.",
)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Retrieve the profile of the authenticated user."""
    return UserOut(
        id=current_user["id"],
        username=current_user["username"],
        role=current_user["role"],
        staff_id=current_user["staff_id"],
        name=current_user["name"],
        is_active=current_user["is_active"],
    )
