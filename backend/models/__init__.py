"""
MediVoice AI - Models Module

SQLAlchemy model definitions for the application.
"""

from database import Base
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
