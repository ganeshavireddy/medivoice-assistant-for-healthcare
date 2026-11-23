"""
MediVoice AI - Patient API Endpoints

Handles patient profile management and record access.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from database import SessionLocal, User, PatientProfile, MedicalReport, get_db
from security import get_current_user, require_role
from schemas import UserUpdate, PatientProfileResponse, MedicalReportResponse
from config import settings, API_V1_PREFIX, ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE
import os
import shutil
import uuid
from datetime import datetime

router = APIRouter(prefix=f"{API_V1_PREFIX}/patients", tags=["Patients"])


@router.get("/profile", response_model=PatientProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current patient profile."""
    patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not patient:
        # Create basic profile
        patient = PatientProfile(
            user_id=current_user.id,
            full_name=current_user.full_name or "",
            date_of_birth="",
            gender="",
            phone="",
            address="",
            created_at=datetime.utcnow(),
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
    
    return patient


@router.put("/profile", response_model=PatientProfileResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update patient profile."""
    current_user.full_name = user_update.full_name
    current_user.phone = user_update.phone
    db.commit()
    db.refresh(current_user)
    
    # Also update patient profile
    patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not patient:
        patient = PatientProfile(
            user_id=current_user.id,
            full_name=user_update.full_name or current_user.full_name or "",
            date_of_birth=user_update.date_of_birth or "",
            gender=user_update.gender or "",
            phone=user_update.phone or "",
            address=user_update.address or "",
            created_at=datetime.utcnow(),
        )
        db.add(patient)
    else:
        patient.full_name = user_update.full_name or patient.full_name
        patient.date_of_birth = user_update.date_of_birth or patient.date_of_birth
        patient.gender = user_update.gender or patient.gender
        patient.phone = user_update.phone or patient.phone
        patient.address = user_update.address or patient.address
    
    db.commit()
    db.refresh(patient)
    
    return patient


@router.post("/reports/upload", response_model=MedicalReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a medical report document."""
    # Validate file type
    file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum: {settings.MAX_UPLOAD_SIZE}MB",
        )
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = f"./uploads/reports/{file_id}.{file_ext}"
    os.makedirs("./uploads/reports", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create report record
    db_report = MedicalReport(
        id=file_id,
        patient_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_type=file_ext,
        file_size=len(content),
        upload_date=datetime.utcnow(),
        status="uploaded",
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report
