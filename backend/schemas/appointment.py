"""
MediVoice AI - Appointment Schemas

Pydantic models for appointment-related requests and responses.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    """Schema for creating a new appointment."""
    doctor_id: int = Field(..., description="ID of the doctor to book with")
    appointment_time: str = Field(..., description="ISO format datetime string")
    reason: Optional[str] = Field(None, description="Reason for visit")


class AppointmentResponse(BaseModel):
    """Schema for appointment response."""
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    appointment_time: datetime
    status: str = "pending"
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment status."""
    appointment_id: int = Field(..., description="ID of the appointment")
    new_status: str = Field(..., description="New status: pending, confirmed, cancelled, completed")


class AppointmentSearch(BaseModel):
    """Schema for searching appointments."""
    patient_id: Optional[int] = Field(None, description="Filter by patient ID")
    doctor_id: Optional[int] = Field(None, description="Filter by doctor ID")
    status: Optional[str] = Field(None, description="Filter by status")
    date_from: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
