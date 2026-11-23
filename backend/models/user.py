"""
MediVoice AI - User Model

SQLAlchemy model for users.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """User model for authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="patient", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient_profile = relationship("PatientProfile", uselist=False, back_populates="user")
    medical_reports = relationship("MedicalReport", back_populates="patient")
    appointments_as_patient = relationship(
        "Appointment",
        foreign_keys="Appointment.patient_id",
        back_populates="patient",
    )
