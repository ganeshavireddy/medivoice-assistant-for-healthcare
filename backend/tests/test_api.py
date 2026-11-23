"""
API Integration Tests for MediVoice AI
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from database import Base, engine


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database schema is created before tests run."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "MediVoice AI"
    assert data["status"] == "operational"


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_auth_and_doctor_flow(client):
    # Register a new user
    import uuid
    uid = str(uuid.uuid4())[:8]
    reg_data = {
        "email": f"patient_{uid}@example.com",
        "username": f"patient_{uid}",
        "full_name": "Test Patient",
        "password": "Password123!",
        "role": "patient",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_data)
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert "access_token" in user_data
    token = user_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get doctors list
    doc_res = client.get("/api/v1/doctors/")
    assert doc_res.status_code == 200
    doctors = doc_res.json()
    assert isinstance(doctors, list)

    # Get departments
    dep_res = client.get("/api/v1/doctors/departments/")
    assert dep_res.status_code == 200
    assert isinstance(dep_res.json(), list)

    # MCP doctors
    mcp_res = client.get("/api/mcp/doctors")
    assert mcp_res.status_code == 200

    # Voice chat
    voice_res = client.post("/api/v1/voice/chat", json={"message": "I have a mild headache", "language": "en"})
    assert voice_res.status_code == 200
    vdata = voice_res.json()
    assert "response_text" in vdata

    # RAG sources
    rag_res = client.get("/api/v1/rag/sources")
    assert rag_res.status_code == 200

    # Test Voice TTS speak endpoint
    speak_res = client.post("/api/v1/voice/speak", json={"text": "Hello patient, how are you feeling today?", "language": "en"})
    assert speak_res.status_code == 200
    speak_data = speak_res.json()
    assert "audio_url" in speak_data
    assert speak_data["audio_url"] is not None
    assert "bytes_length" in speak_data

    # Test Audio file retrieval
    audio_file_res = client.get(speak_data["audio_url"])
    assert audio_file_res.status_code == 200
    assert audio_file_res.headers.get("content-type") == "audio/mpeg"
    assert len(audio_file_res.content) > 0

