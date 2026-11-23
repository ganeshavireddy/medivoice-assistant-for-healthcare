"""
MediVoice AI - Doctor Model

SQLAlchemy model for doctors.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship

from database import Base


class Doctor(Base):
    """Doctor model."""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    crm_number = Column(String(20), nullable=True)  # Medical council registration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    appointments = relationship("Appointment", back_populates="doctor")
