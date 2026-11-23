"""
MediVoice AI - MCP Schemas

Pydantic models for MCP tool requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class DoctorSearch(BaseModel):
    """Schema for searching doctors."""
    specialization: Optional[str] = Field(None, description="Medical specialization")


class DoctorResponse(BaseModel):
    """Schema for doctor information."""
    id: int
    name: str
    specialization: str
    department: str
    crm_number: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class DepartmentResponse(BaseModel):
    """Schema for department information."""
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AppointmentAvailability(BaseModel):
    """Schema for appointment availability."""
    slot_id: int
    doctor_id: int
    date: str
    time: str
    available: bool


class BookAppointmentRequest(BaseModel):
    """Schema for booking an appointment."""
    doctor_id: int = Field(..., description="ID of the doctor")
    patient_id: int = Field(..., description="ID of the patient")
    appointment_time: str = Field(..., description="ISO format datetime")
    confirmation: bool = Field(..., description="Explicit patient confirmation required")


class PatientHistory(BaseModel):
    """Schema for patient history."""
    patient_id: int
    appointment_history: List[Dict] = Field(default_factory=list)
    report_history: List[Dict] = Field(default_factory=list)
    medical_summary: str = ""


class MCPToolResponse(BaseModel):
    """Generic MCP tool response."""
    success: bool
    message: str
    data: Optional[Dict] = None
    error: Optional[str] = None


class AppointmentHistoryResponse(BaseModel):
    """Schema for appointment history."""
    appointments: List[Dict]
    total_count: int
