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


def test_admin_only_dashboard_and_regression(client):
    # Unauthenticated access must be blocked
    unauth_res = client.get("/api/v1/admin/analytics")
    assert unauth_res.status_code == 401

    # Patient token must be rejected with 403
    from security import create_access_token
    patient_token = create_access_token(data={"sub": "regular_patient", "role": "patient"})
    patient_res = client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert patient_res.status_code == 403

    # Wrong passkey must fail
    bad_login = client.post("/api/v1/admin/login", json={"passkey": "wrong-passkey"})
    assert bad_login.status_code == 401

    # Valid admin login returns admin JWT
    login_res = client.post("/api/v1/admin/login", json={"passkey": "admin123"})
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]

    # Upload a sample report with abnormal markers so report analysis & regression are tested
    sample_report = (
        "Complete Blood Count\n"
        "Hemoglobin: 10.2 g/dL\n"
        "WBC: 13500 /mcL\n"
        "Platelet: 250000 /mcL\n"
        "HbA1c: 6.8%\n"
    )
    up_res = client.post(
        "/api/v1/reports/upload",
        files={"file": ("cbc_test_report.txt", sample_report.encode("utf-8"), "text/plain")},
    )
    assert up_res.status_code == 200
    uploaded_id = up_res.json()["id"]
    assert len(up_res.json()["parameters"]) >= 3

    try:
        # Admin analytics succeeds and includes appointments, reports, and OLS linear regression
        analytics_res = client.get(
            "/api/v1/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert analytics_res.status_code == 200
        data = analytics_res.json()
        assert "summary" in data
        assert "appointments" in data
        assert "reports" in data
        assert "biomarker_chart" in data
        assert "linear_regression" in data
        assert "appointments" in data["linear_regression"]
        assert "reports_abnormality" in data["linear_regression"]
        assert "r_squared" in data["linear_regression"]["appointments"]
        assert "equation" in data["linear_regression"]["reports_abnormality"]
    finally:
        from database import SessionLocal, MedicalReport
        with SessionLocal() as db:
            db.query(MedicalReport).filter(MedicalReport.id == uploaded_id).delete()
            db.commit()


def test_voice_transcribe_48khz_wav(client):
    import io, wave, av
    speak_res = client.post(
        "/api/v1/voice/speak",
        json={"text": "I have fever and headache", "language": "en"},
    )
    assert speak_res.status_code == 200
    mp3_bytes = client.get(speak_res.json()["audio_url"]).content

    container = av.open(io.BytesIO(mp3_bytes))
    resampler = av.AudioResampler(format="s16", layout="mono", rate=48000)
    pcm48 = b"".join(
        rf.to_ndarray().tobytes()
        for f in container.decode(audio=0)
        for rf in resampler.resample(f)
    )
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(48000)
        wf.writeframes(pcm48)

    tr_res = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("recording.wav", wav_buf.getvalue(), "audio/wav")},
        data={"language": "en"},
    )
    assert tr_res.status_code == 200
    text = tr_res.json()["transcription"].lower()
    assert "fever" in text or "headache" in text


