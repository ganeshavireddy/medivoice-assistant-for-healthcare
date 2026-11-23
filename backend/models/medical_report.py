"""
MediVoice AI - Medical Report Model

SQLAlchemy model for medical reports.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class MedicalReport(Base):
    """Medical report model."""
    __tablename__ = "medical_reports"

    id = Column(String(36), primary_key=True, index=True)  # UUID
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="uploaded")  # uploaded, processed, failed
    extracted_data = Column(Text, nullable=True)  # JSON string of extracted test results

    # Relationships
    patient = relationship("User", back_populates="medical_reports")
