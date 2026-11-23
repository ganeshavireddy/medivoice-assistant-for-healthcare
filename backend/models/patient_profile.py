"""
MediVoice AI - Patient Profile Model

SQLAlchemy model for patient profiles.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class PatientProfile(Base):
    """Patient profile model."""
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    date_of_birth = Column(String(10), nullable=True)  # YYYY-MM-DD
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
