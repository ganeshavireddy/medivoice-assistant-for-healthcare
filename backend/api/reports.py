"""
MediVoice AI - Medical Report API Endpoints

Handles medical report upload, extraction, and explanation.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from database import SessionLocal, MedicalReport, get_db
from security import get_current_user
from schemas import MedicalReportUpload, MedicalReportResponse
from config import settings, API_V1_PREFIX
import os
import uuid
from datetime import datetime

router = APIRouter(prefix=f"{API_V1_PREFIX}/reports", tags=["Medical Reports"])


@router.post("/upload", response_model=MedicalReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_medical_report(
    file: UploadFile = File(...),
    current_user: object = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a medical laboratory report."""
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
    patient_id = 1
    if current_user:
        if isinstance(current_user, dict):
            patient_id = current_user.get("id", 1)
        else:
            patient_id = getattr(current_user, "id", 1)

    db_report = MedicalReport(
        id=file_id,
        patient_id=patient_id,
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


@router.get("/", response_model=list[MedicalReportResponse])
async def list_reports(
    current_user: object = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all medical reports for current user."""
    patient_id = 1
    if current_user:
        if isinstance(current_user, dict):
            patient_id = current_user.get("id", 1)
        else:
            patient_id = getattr(current_user, "id", 1)

    reports = db.query(MedicalReport).filter(
        MedicalReport.patient_id == patient_id
    ).all()
    return reports


@router.get("/{report_id}", response_model=MedicalReportResponse)
async def get_report(
    report_id: str,
    db: Session = Depends(get_db),
):
    """Get specific medical report by ID."""
    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report
