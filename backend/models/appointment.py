"""
MediVoice AI - Appointment Model

SQLAlchemy model for appointments.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Appointment(Base):
    """Appointment model."""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    appointment_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="pending")  # pending, confirmed, cancelled, completed
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = relationship("Doctor", foreign_keys=[doctor_id], back_populates="appointments")
