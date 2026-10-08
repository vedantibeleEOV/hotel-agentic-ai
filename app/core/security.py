import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
import jwt

from app.config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


def validate_jwt_secret():
    """Ensure JWT_SECRET is configured with sufficient entropy (at least 32 characters)."""
    secret = (settings.JWT_SECRET or "").strip()
    if not secret or len(secret) < 32:
        error_msg = (
            "FATAL SECURITY CONFIG ERROR: JWT_SECRET is missing or shorter than 32 characters in .env! "
            "The backend will not start without a secure, strong JWT_SECRET."
        )
        logger.critical(error_msg)
        raise RuntimeError(error_msg)


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with standard salt rounds."""
    if not password:
        raise ValueError("Password cannot be empty")
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hashed password."""
    if not plain_password or not hashed_password:
        return False
    try:
        plain_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception as e:
        logger.warning(f"Password verification error: {e}")
        return False


def create_access_token(
    user_id: int,
    username: str,
    role: str,
    staff_id: Optional[int] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a signed JWT access token containing user identity and role."""
    validate_jwt_secret()

    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "username": username,
        "role": role,
        "staff_id": staff_id,
        "iat": int(now_utc.timestamp()),
        "exp": int(expire.timestamp()),
    }

    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    validate_jwt_secret()
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
