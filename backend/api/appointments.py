"""
MediVoice AI - Appointment API Endpoints

Handles appointment booking, cancellation, and history.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal, Appointment, Doctor, get_db
from schemas import AppointmentCreate, AppointmentResponse
from config import settings, API_V1_PREFIX
from datetime import datetime

router = APIRouter(prefix=f"{API_V1_PREFIX}/appointments", tags=["Appointments"])


@router.get("/", response_model=list[AppointmentResponse])
async def get_appointments(
    current_user: object = None,
    db: Session = Depends(get_db),
):
    """Get appointments for current user."""
    # In a full implementation, filter by patient_id from current_user
    appointments = db.query(Appointment).all()
    return appointments


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    appointment_data: AppointmentCreate,
    current_user: object = None,
    db: Session = Depends(get_db),
):
    """Book a new appointment after patient confirmation."""
    # Validate doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == appointment_data.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found",
        )
    
    app_time = appointment_data.appointment_time
    if isinstance(app_time, str):
        try:
            app_time = datetime.fromisoformat(app_time)
        except Exception:
            pass

    # Check for existing appointment at same time
    conflicting = db.query(Appointment).filter(
        Appointment.doctor_id == appointment_data.doctor_id,
        Appointment.appointment_time == app_time,
    ).first()
    
    if conflicting:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment slot already booked",
        )
    
    # Create appointment
    new_appointment = Appointment(
        patient_id=getattr(current_user, "id", 1) if current_user else 1,
        doctor_id=appointment_data.doctor_id,
        appointment_time=app_time,
        status="pending",
        reason=appointment_data.reason,
        created_at=datetime.utcnow(),
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    return new_appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: int,
    current_user: object = None,
    db: Session = Depends(get_db),
):
    """Cancel an appointment."""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        # In production: Appointment.patient_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    
    db.delete(appointment)
    db.commit()
