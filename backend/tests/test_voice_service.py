"""
MediVoice AI - Unit and Integration Tests for Rebuilt Voice Architecture
"""

import io
import wave
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from services.voice.audio_processor import audio_processor, AudioProcessor
from services.voice.speech_service import speech_service, SpeechService
from services.voice.voice_session import voice_session_manager


@pytest.fixture(scope="module")
def client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def _generate_test_pcm_wav(num_samples: int = 16000, frequency: float = 440.0) -> bytes:
    """Generate in-memory 16kHz 16-bit Mono PCM WAV."""
    import numpy as np
    t = np.linspace(0, num_samples / 16000, num_samples, endpoint=False)
    # Sine wave with moderate amplitude (peak ~0.3)
    waveform = (np.sin(2 * np.pi * frequency * t) * 10000).astype(np.int16)
    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(waveform.tobytes())
    return wav_io.getvalue()


# ---------------------------------------------------------------------------
# AudioProcessor Tests
# ---------------------------------------------------------------------------
def test_audio_processor_validation():
    # Empty audio should be rejected
    valid, err = audio_processor.validate_audio_file(b"")
    assert not valid
    assert "empty" in err.lower()

    # Valid audio
    wav_bytes = _generate_test_pcm_wav(16000)
    valid, err = audio_processor.validate_audio_file(wav_bytes)
    assert valid
    assert err is None


def test_audio_processor_decode_and_metrics():
    wav_bytes = _generate_test_pcm_wav(16000, frequency=440.0)
    result = audio_processor.process_audio(wav_bytes, "test.wav")
    assert result.error is None
    assert not result.is_silent
    assert result.duration_seconds >= 0.9
    assert result.sample_rate == 16000
    assert len(result.pcm_bytes) > 0


def test_audio_processor_silence_detection():
    # 1 second of pure zeroes (silence)
    silent_pcm = b"\x00\x00" * 16000
    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(silent_pcm)
    result = audio_processor.process_audio(wav_io.getvalue(), "silent.wav")
    assert result.is_silent


# ---------------------------------------------------------------------------
# SpeechService Tests
# ---------------------------------------------------------------------------
def test_speech_service_clean_text():
    raw_markdown = (
        "### 1. Understanding symptoms\n"
        "You have a **mild fever** and *headache*.\n"
        "- Take rest • Stay hydrated 🚨 Emergency call 112 [ACC/AHA 2017: Guidance] http://example.com"
    )
    cleaned = speech_service.clean_text_for_speech(raw_markdown)
    assert "###" not in cleaned
    assert "**" not in cleaned
    assert "🚨" not in cleaned
    assert "http" not in cleaned
    assert "[ACC/AHA" not in cleaned
    assert "mild fever" in cleaned


def test_speech_service_voice_selection():
    assert "te-IN" in speech_service.get_voice("te")
    assert "te-IN" in speech_service.get_voice("te-IN")
    assert "en-US" in speech_service.get_voice("en")
    assert "en-US" in speech_service.get_voice("unknown")


# ---------------------------------------------------------------------------
# VoiceSessionManager Tests
# ---------------------------------------------------------------------------
def test_voice_session_isolation():
    user_a = 991
    user_b = 992

    voice_session_manager.clear_session(user_a)
    voice_session_manager.clear_session(user_b)

    voice_session_manager.record_turn(user_a, "user", "I have chest pain", "en")
    voice_session_manager.record_turn(user_b, "user", "I need pediatrics", "te")

    hist_a = voice_session_manager.get_history(user_a)
    hist_b = voice_session_manager.get_history(user_b)

    assert len(hist_a) == 1
    assert hist_a[0]["text"] == "I have chest pain"

    assert len(hist_b) == 1
    assert hist_b[0]["text"] == "I need pediatrics"

    # Clearing user_a should not touch user_b
    voice_session_manager.clear_session(user_a)
    assert len(voice_session_manager.get_history(user_a)) == 0
    assert len(voice_session_manager.get_history(user_b)) == 1

    voice_session_manager.clear_session(user_b)


# ---------------------------------------------------------------------------
# FastAPI Voice Endpoints Integration Tests
# ---------------------------------------------------------------------------
def test_transcribe_endpoint_empty_file(client):
    response = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("empty.wav", b"", "audio/wav")},
    )
    assert response.status_code == 200
    data = response.json()
    assert not data["success"]
    assert "empty" in data["error"].lower()


def test_transcribe_endpoint_valid_audio(client):
    wav_bytes = _generate_test_pcm_wav(16000)
    response = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("test.wav", wav_bytes, "audio/wav")},
        data={"language": "en"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "transcription" in data
    assert "detected_language" in data
    assert "processing_time" in data


def test_synthesize_endpoint(client):
    response = client.post(
        "/api/v1/voice/synthesize",
        json={"text": "Hello, your appointment is confirmed.", "language": "en"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "audio_url" in data or "cleaned_text" in data
    assert data["language"] == "en"


def test_voice_chat_emergency_triage(client):
    # Emergency symptom: severe chest pain radiating to arm
    response = client.post(
        "/api/v1/voice/chat",
        json={
            "message": "I have severe crushing chest pain radiating to my left arm and sweating",
            "language": "en",
            "user_id": 888,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_emergency"] is True
    assert "112" in data["response_text"] or "108" in data["response_text"] or "EMERGENCY" in data["response_text"]


def test_voice_chat_telugu_appointment(client):
    # Schedule doctor appointment in Telugu
    response = client.post(
        "/api/v1/voice/chat",
        json={
            "message": "డాక్టర్ ప్రియా పటేల్‌తో అపాయింట్‌మెంట్ బుక్ చేయండి",
            "language": "te",
            "user_id": 889,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["response_text"]) > 0
