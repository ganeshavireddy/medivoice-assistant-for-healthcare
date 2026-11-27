"""
MediVoice AI - Database Module

Handles database connections, table creation, and all SQLAlchemy models.
All models are defined here in one file to avoid import chain issues.
"""

import logging
import os
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    create_engine,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

from config import SQLALCHEMY_DATABASE_URL

logger = logging.getLogger(__name__)

# Create synchronous engine with SQLite fallback if psycopg2 is unavailable
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    # Test connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Connected to PostgreSQL database")
except Exception as e:
    # Fallback to SQLite in a guaranteed writable path
    db_file = os.getenv("SQLITE_DB_PATH")
    if not db_file:
        if os.path.exists("/app"):
            db_file = "/app/backend/data/medivoice.db"
        else:
            db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "medivoice.db")

    db_dir = os.path.dirname(os.path.abspath(db_file))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    SQLITE_URL = f"sqlite:///{db_file}"
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    logger.info(f"PostgreSQL unavailable ({e}) — using SQLite fallback at {SQLITE_URL}")

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy models
Base = declarative_base()


# ============================================================================
# MODELS
# ============================================================================

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


class PatientProfile(Base):
    """Patient profile model."""
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    date_of_birth = Column(String(10), nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="patient_profile")


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
    status = Column(String(50), default="uploaded")
    extracted_data = Column(Text, nullable=True)

    # Relationships
    patient = relationship("User", back_populates="medical_reports")


class Doctor(Base):
    """Doctor model."""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    crm_number = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    appointments = relationship("Appointment", back_populates="doctor")


class Appointment(Base):
    """Appointment model."""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    appointment_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="pending")
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = relationship("Doctor", foreign_keys=[doctor_id], back_populates="appointments")


class Department(Base):
    """Department model."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)


# ============================================================================
# DATABASE UTILITIES
# ============================================================================

def create_db_and_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def get_db():
    """Dependency to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
