"""
MediVoice AI - User Schemas

Pydantic models for user authentication and profile.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    password: str = Field(..., min_length=8, description="Password")
    role: Optional[str] = Field("patient", description="User role: patient, doctor, admin")


class UserLogin(BaseModel):
    """Schema for user login response."""
    id: int
    email: EmailStr
    username: str
    role: str
    access_token: str
    token_type: str = "bearer"


class UserLoginResponse(BaseModel):
    """Schema for login response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserLogin


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[str] = Field(None, description="YYYY-MM-DD format")
    gender: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=200)


class UserResponse(BaseModel):
    """Schema for user information response."""
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str]
    role: str
    created_at: datetime
    patient_profile: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PatientProfileResponse(BaseModel):
    """Schema for patient profile response."""
    id: int
    user_id: int
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

