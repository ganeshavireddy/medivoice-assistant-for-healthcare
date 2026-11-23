"""
MediVoice AI - Doctor API Endpoints

Handles doctor directory, specialization search, and department information.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal, Doctor, Department, get_db
from schemas import DoctorResponse, DepartmentResponse
from config import settings, API_V1_PREFIX

router = APIRouter(prefix=f"{API_V1_PREFIX}/doctors", tags=["Doctors"])


@router.get("/", response_model=list[DoctorResponse])
async def get_doctors(
    specialization: str = None,
    db: Session = Depends(get_db),
):
    """Get list of doctors, optionally filtered by specialization."""
    query = db.query(Doctor)
    
    if specialization:
        query = query.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    
    doctors = query.all()
    return doctors


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """Get doctor details by ID."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found",
        )
    return doctor


@router.get("/departments/", response_model=list[DepartmentResponse])
async def get_departments(db: Session = Depends(get_db)):
    """Get all hospital departments."""
    departments = db.query(Department).all()
    return departments
