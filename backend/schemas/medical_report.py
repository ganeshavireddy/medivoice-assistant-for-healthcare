"""
MediVoice AI - Medical Report Schemas

Pydantic models for medical report upload and extraction.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class MedicalReportUpload(BaseModel):
    """Schema for medical report upload."""
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File extension (pdf, txt, etc.)")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    report_date: Optional[datetime] = Field(None, description="Report date")


class ExtractedTest(BaseModel):
    """Schema for an extracted test result."""
    test_name: str = Field(..., description="Name of the medical test")
    measured_value: Optional[float] = Field(None, description="Measured value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    reference_range: Optional[str] = Field(None, description="Reference range provided in report")
    report_date: Optional[datetime] = Field(None, description="Report date")


class MedicalReportResponse(BaseModel):
    """Schema for medical report response."""
    id: str
    patient_id: int
    filename: str
    file_type: str
    file_size: int
    upload_date: datetime
    status: str
    extracted_data: Optional[Any] = None
    original_content: Optional[str] = None  # Stored securely

    class Config:
        from_attributes = True


class ReportExtractionResult(BaseModel):
    """Schema for report extraction results."""
    success: bool
    extracted_tests: List[ExtractedTest]
    unrecognized_tests: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class ReferenceRangeCheck(BaseModel):
    """Schema for comparing result against reference range."""
    test_name: str
    measured_value: float
    reference_range: str
    within_range: bool
    interpretation: str
