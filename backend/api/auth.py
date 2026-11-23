"""
MediVoice AI - Authentication API Endpoints

Handles patient registration, login, logout, and JWT authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime

from database import SessionLocal, User, get_db
from security import create_access_token, get_current_user
from schemas import UserCreate, UserLogin, Token
from config import API_V1_PREFIX, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix=f"{API_V1_PREFIX}/auth", tags=["Authentication"])


@router.post("/register", response_model=UserLogin, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """Register a new patient user."""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_create.email) | (User.username == user_create.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )

    # Create new user
    from security import hash_password
    hashed_password = hash_password(user_create.password)
    db_user = User(
        email=user_create.email,
        username=user_create.username,
        full_name=user_create.full_name,
        role=user_create.role or "patient",
        password_hash=hashed_password,
        created_at=datetime.utcnow(),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate token
    access_token = create_access_token(data={"sub": db_user.username})

    return UserLogin(
        id=db_user.id,
        email=db_user.email,
        username=db_user.username,
        role=db_user.role,
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user and receive JWT access token."""
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserLogin)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return UserLogin(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        role=current_user.role,
        access_token="",
        token_type="bearer",
    )


from security import verify_password