import logging
from typing import Any, Callable, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.core.security import decode_token
from app.database.connection import SessionLocal
from app.database.orm.user_entity import UserEntity
from app.database.orm.staff_entity import StaffEntity

logger = logging.getLogger(__name__)

# Standard HTTPBearer scheme for Bearer token in Authorization header
http_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> dict[str, Any]:
    """
    Dependency that extracts, decodes, and validates the JWT Bearer token.
    Returns the authenticated user details.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        logger.warning(f"Invalid token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with SessionLocal() as session:
        user = session.get(UserEntity, int(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or no longer exists.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        staff_name = None
        if user.staff_id:
            staff = session.get(StaffEntity, user.staff_id)
            if staff:
                staff_name = staff.name

        display_name = staff_name or user.username.replace(".", " ").title()

        return {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "staff_id": user.staff_id,
            "name": display_name,
            "is_active": user.is_active,
        }


def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency factory to restrict endpoint access by user role.
    Allowed roles include: HOUSEKEEPING, MAINTENANCE, SUPERVISOR, MANAGER.
    """
    normalized_allowed = [r.upper() for r in allowed_roles]

    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = (current_user.get("role") or "").upper()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles [{', '.join(allowed_roles)}]",
            )
        return current_user

    return role_checker
