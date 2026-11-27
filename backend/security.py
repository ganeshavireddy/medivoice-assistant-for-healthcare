"""
MediVoice AI - Security Module

Handles password hashing, JWT tokens, and authorization.
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from config import API_V1_PREFIX, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{API_V1_PREFIX}/auth/login")

# Password hashing
def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, stored_hash = hashed.split("$")
        computed = hashlib.sha256((password + salt).encode()).hexdigest()
        return computed == stored_hash
    except ValueError:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "username": payload.get("sub"),
            "role": payload.get("role", "patient"),
            "expires": payload.get("exp"),
            "iat": payload.get("iat"),
        }
    except JWTError:
        return None


# Authorization dependencies (for FastAPI)
def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> Optional[Dict[str, Any]]:
    """Get current authenticated user from JWT token."""
    payload = decode_token(token)
    if payload is None:
        return None

    username: Optional[str] = payload.get("username")
    if username is None:
        return None

    return {
        "username": username,
        "type": "authenticated",
        "role": payload.get("role", "patient"),
    }


def require_role(
    allowed_roles: List[str]
):
    """Dependency to require specific user role."""
    def role_checker(current_user: Dict = Depends(get_current_user)):
        if not current_user or current_user.get("type") != "authenticated":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {', '.join(allowed_roles)}"
            )

        return current_user
    return role_checker
