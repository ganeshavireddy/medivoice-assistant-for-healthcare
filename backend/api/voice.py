"""
MediVoice AI - Modular Voice API Endpoints

Provides clean, asynchronous endpoints for speech-to-text (STT),
text-to-speech (TTS), live audio streaming, and conversational medical triage.
"""

import os
import io
import base64
import logging
from typing import Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Body,
    Query,
    HTTPException,
    Response,
    status,
)
from fastapi.responses import FileResponse

from config import API_V1_PREFIX
from schemas.voice import (
    TranscribeRequest,
    TranscribeResponse,
    SynthesizeRequest,
    SynthesizeResponse,
    VoiceChatRequest,
    VoiceChatResponse,
)
from services.voice import (
    audio_processor,
    transcription_service,
    speech_service,
    voice_session_manager,
)
from ai.medical_agent import medical_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{API_V1_PREFIX}/voice", tags=["Voice Assistant"])


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form("en"),
    body: Optional[TranscribeRequest] = Body(None),
):
    """
    Transcribe spoken audio from a multipart file or JSON base64 string.
    Supports WebM, OGG, WAV, MP4, and AAC. Automatically detects English and Telugu.
    """
    audio_bytes: bytes = b""
    filename: str = ""
    target_lang = language or "en"

    # Handle multipart file upload
    if file is not None:
        audio_bytes = await file.read()
        filename = file.filename or "recording.webm"
    # Handle JSON base64 payload
    elif body is not None and body.audio_base64:
        target_lang = body.language or target_lang
        try:
            b64_data = body.audio_base64
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            audio_bytes = base64.b64decode(b64_data)
            filename = "upload.wav"
        except Exception as b64_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 audio payload: {b64_err}",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio payload provided. Submit a multipart 'file' or JSON 'audio_base64'.",
        )

    result = await transcription_service.transcribe(
        audio_content=audio_bytes,
        language=target_lang,
        filename=filename,
    )

    return TranscribeResponse(
        transcription=result.transcription,
        detected_language=result.detected_language,
        processing_time=result.processing_time,
        success=result.success,
        error=result.error,
    )


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(payload: SynthesizeRequest):
    """
    Synthesize clinical advice into high-quality spoken audio using Edge-TTS.
    Returns relative audio URL and metadata.
    """
    result = await speech_service.synthesize(
        text=payload.text,
        language=payload.language or "en",
        cache=True,
    )

    return SynthesizeResponse(
        audio_url=result.audio_url,
        audio_base64=None,
        language=result.language,
        duration_est=result.duration_est,
        success=result.success,
        error=result.error,
    )


@router.get("/stream_speech")
async def stream_speech(
    text: str = Query(..., description="Text to speak aloud"),
    language: str = Query("en", description="Target language ('en' or 'te')"),
):
    """
    Stream MP3 audio directly for instant HTML5 <audio> tag playback.
    """
    result = await speech_service.synthesize(text=text, language=language, cache=True)
    if not result.success or not result.audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.error or "Failed to synthesize speech audio.",
        )

    return Response(
        content=result.audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"},
    )


@router.get("/audio/{filename}")
async def get_cached_audio(filename: str):
    """Serve cached TTS audio file."""
    # Sanitize filename to prevent directory traversal
    safe_filename = os.path.basename(filename)
    from services.voice.speech_service import AUDIO_CACHE_DIR
    filepath = os.path.join(AUDIO_CACHE_DIR, safe_filename)

    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="audio/mpeg")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Requested audio file not found.",
    )


@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat(request: VoiceChatRequest):
    """
    Integrated conversational endpoint:
    Processes transcribed voice input with MasterMedicalAgent,
    handles emergency triage, appointment booking, and session memory.
    """
    user_id = request.user_id or 1
    user_text = request.message.strip()
    language = request.language or "en"

    # Record patient query in session memory
    voice_session_manager.record_turn(
        user_id=user_id,
        role="user",
        text=user_text,
        language=language,
    )

    try:
        agent_res = await medical_agent.process_user_input(
            user_id=user_id,
            user_input=user_text,
            language=language,
        )

        response_text = agent_res.get("response_text", "")
        is_emergency = agent_res.get("is_emergency", False)
        booked_appt = agent_res.get("booked_appointment")
        citations = agent_res.get("citations", [])

        # Record assistant reply in session memory
        voice_session_manager.record_turn(
            user_id=user_id,
            role="assistant",
            text=response_text,
            language=language,
            is_emergency=is_emergency,
        )

        return VoiceChatResponse(
            response_text=response_text,
            language=language,
            requires_tts=True,
            citations=citations,
            is_emergency=is_emergency,
            booked_appointment=booked_appt,
            audio_url=None,
            error=None,
        )
    except Exception as e:
        logger.error(f"Medical agent error: {e}", exc_info=True)
        fallback_msg = (
            "I apologize, but I encountered an issue processing your medical request. "
            "Please consult a healthcare professional, or call 112 / 108 in an emergency."
        )
        return VoiceChatResponse(
            response_text=fallback_msg,
            language=language,
            requires_tts=True,
            citations=[],
            is_emergency=False,
            booked_appointment=None,
            audio_url=None,
            error=str(e),
        )


@router.post("/session/clear")
async def clear_voice_session(user_id: int = Query(1, description="Patient User ID")):
    """Clear patient conversation state and voice memory."""
    voice_session_manager.clear_session(user_id)
    return {"status": "success", "message": f"Voice session cleared for patient #{user_id}."}
