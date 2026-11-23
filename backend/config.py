"""
MediVoice AI - Configuration Module

Contains configuration settings loaded from environment variables.
"""

import os
from datetime import timedelta

# Application Configuration
APP_NAME = "MediVoice AI"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Database Configuration
POSTGRES_DB = os.getenv("POSTGRES_DB", "medivoice_db")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))

# Database URL
SQLALCHEMY_DATABASE_URL = (
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# ChromaDB Configuration
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "medical_knowledge")

# LLM Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_LLM_PROVIDER = os.getenv("DEFAULT_LLM_PROVIDER", "openai")
DEFAULT_MODEL_NAME = os.getenv("DEFAULT_MODEL_NAME", "gpt-4o-mini")

# Voice Configuration
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "en-US-JennyNeural")
SUPPORTED_LANGUAGES = ["en", "te"]  # English, Telugu

# MCP Configuration
MCP_SERVER_HOST = os.getenv("MCP_SERVER_HOST", "localhost")
MCP_SERVER_PORT = int(os.getenv("MCP_SERVER_PORT", "8001"))

# File Upload Configuration
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", "10"))  # in MB
ALLOWED_EXTENSIONS = {"pdf", "txt", "doc", "docx"}

# API Configuration
API_V1_PREFIX = "/api/v1"
# Settings namespace object for settings.X style access
import types as _types
settings = _types.SimpleNamespace(
    APP_NAME=APP_NAME, APP_VERSION=APP_VERSION, DEBUG=DEBUG,
    SECRET_KEY=SECRET_KEY, ALGORITHM=ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES=ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS=REFRESH_TOKEN_EXPIRE_DAYS,
    POSTGRES_DB=POSTGRES_DB, POSTGRES_USER=POSTGRES_USER,
    POSTGRES_PASSWORD=POSTGRES_PASSWORD, POSTGRES_HOST=POSTGRES_HOST,
    POSTGRES_PORT=POSTGRES_PORT, SQLALCHEMY_DATABASE_URL=SQLALCHEMY_DATABASE_URL,
    CHROMA_DB_PATH=CHROMA_DB_PATH, CHROMA_COLLECTION_NAME=CHROMA_COLLECTION_NAME,
    OPENAI_API_KEY=OPENAI_API_KEY, GEMINI_API_KEY=GEMINI_API_KEY,
    DEFAULT_LLM_PROVIDER=DEFAULT_LLM_PROVIDER, DEFAULT_MODEL_NAME=DEFAULT_MODEL_NAME,
    WHISPER_MODEL_SIZE=WHISPER_MODEL_SIZE, EDGE_TTS_VOICE=EDGE_TTS_VOICE,
    SUPPORTED_LANGUAGES=SUPPORTED_LANGUAGES,
    MCP_SERVER_HOST=MCP_SERVER_HOST, MCP_SERVER_PORT=MCP_SERVER_PORT,
    MAX_UPLOAD_SIZE=MAX_UPLOAD_SIZE, ALLOWED_EXTENSIONS=ALLOWED_EXTENSIONS,
    API_V1_PREFIX=API_V1_PREFIX,
)
