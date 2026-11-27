"""
MediVoice AI - Main Application Entry Point

FastAPI application entry point that initializes the app,
database connections, and includes all API routers.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings, API_V1_PREFIX
from database import create_db_and_tables
from api.auth import router as auth_router
from api.patients import router as patients_router
from api.doctors import router as doctors_router
from api.appointments import router as appointments_router
from api.voice import router as voice_router
from api.reports import router as reports_router
from api.rag import router as rag_router
from api.admin import router as admin_router
from mcp.server import mcp_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting MediVoice AI backend...")
    try:
        create_db_and_tables()
        logger.info("Database tables created successfully.")

        # Seed initial departments and doctors if empty
        from database import SessionLocal, Department, Doctor
        with SessionLocal() as db:
            if db.query(Department).count() == 0:
                departments = [
                    Department(name="Cardiology", description="Heart and cardiovascular system"),
                    Department(name="Neurology", description="Brain and nervous system"),
                    Department(name="Pediatrics", description="Children's health and development"),
                    Department(name="Orthopedics", description="Musculoskeletal system"),
                    Department(name="General Practice", description="Primary care and general medicine"),
                ]
                db.add_all(departments)
                db.commit()
                logger.info("Seeded initial departments.")

            if db.query(Doctor).count() == 0:
                sample_doctors = [
                    Doctor(name="Dr. Sarah Smith", specialization="Cardiology", department="Cardiology", crm_number="MC-10293"),
                    Doctor(name="Dr. Rajesh Rao", specialization="Neurology", department="Neurology", crm_number="MC-20384"),
                    Doctor(name="Dr. Emily Johnson", specialization="Pediatrics", department="Pediatrics", crm_number="MC-30495"),
                    Doctor(name="Dr. David Brown", specialization="Orthopedics", department="Orthopedics", crm_number="MC-40586"),
                    Doctor(name="Dr. Priya Patel", specialization="General Practice", department="General Practice", crm_number="MC-50677"),
                ]
                db.add_all(sample_doctors)
                db.commit()
                logger.info("Seeded initial doctors.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    yield
    logger.info("Shutting down MediVoice AI...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title="MediVoice AI",
        version="1.0.0",
        description="Voice-Based Intelligent Healthcare Assistant",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount routers
    app.include_router(auth_router)
    app.include_router(patients_router)
    app.include_router(doctors_router)
    app.include_router(appointments_router)
    app.include_router(voice_router)
    app.include_router(reports_router)
    app.include_router(rag_router)
    app.include_router(admin_router)

    # Mount MCP sub-app
    app.mount("/api/mcp", mcp_app)

    @app.api_route("/", methods=["GET", "HEAD"])
    async def root():
        return {
            "name": "MediVoice AI",
            "version": "1.0.0",
            "status": "operational",
            "docs": "/docs",
        }

    @app.api_route("/health", methods=["GET", "HEAD"])
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
