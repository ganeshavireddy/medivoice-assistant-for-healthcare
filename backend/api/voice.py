"""
MediVoice AI - Voice API Endpoints

Handles speech-to-text, text-to-speech, and voice conversation flow with Edge-TTS and Whisper.
"""

from fastapi import APIRouter, UploadFile, File, Form, WebSocket, BackgroundTasks, Response, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from schemas import TranscribeRequest, TranscribeResponse, SpeakRequest, SpeakResponse, VoiceChatRequest, VoiceChatResponse
from config import settings, API_V1_PREFIX
from ai.medical_agent import medical_agent
import os
import uuid
import tempfile
import asyncio
import re
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{API_V1_PREFIX}/voice", tags=["Voice"])

# Directory for storing generated audio clips
AUDIO_CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

# Lazy-loaded whisper model
_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            # 'tiny' or 'base' are fast on CPU
            _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
        except Exception as e:
            logger.warning(f"WhisperModel initialization failed: {e}")
            _whisper_model = False
    return _whisper_model if _whisper_model is not False else None


def clean_text_for_speech(text: str) -> str:
    """Clean markdown, bullets, emojis, and symbols so TTS sounds natural and clear."""
    if not text:
        return ""
    
    # Remove markdown headers like '### 1. Understanding your symptoms'
    cleaned = re.sub(r"#{1,6}\s*(\d+\.?\s*)?", r"\1", text)
    # Remove markdown bold/italic
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*([^*]+)\*", r"\1", cleaned)
    # Remove bullet markers
    cleaned = re.sub(r"^[•\-\*]\s*", "", cleaned, flags=re.MULTILINE)
    # Remove emojis and special status icons
    cleaned = re.sub(r"[🚨⚠️ℹ️•—–✓🩺❤️]", " ", cleaned)
    # Remove URLs
    cleaned = re.sub(r"http\S+", "", cleaned)
    # Replace multiple newlines or spaces with single punctuation/space
    cleaned = re.sub(r"\n+", ". ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def get_voice_for_language(language: str) -> str:
    """Select the best Edge-TTS voice based on language code."""
    lang_lower = (language or "en").lower()
    if "te" in lang_lower:
        return "te-IN-ShrutiNeural"
    elif "hi" in lang_lower:
        return "hi-IN-SwaraNeural"
    else:
        return "en-US-JennyNeural"


async def generate_audio_bytes(text: str, language: str = "en") -> bytes:
    """Generate MP3 audio bytes using edge_tts."""
    import edge_tts
    
    clean_text = clean_text_for_speech(text)
    if not clean_text:
        clean_text = "I have received your request."
    
    # Cap text length for voice synthesis so it remains responsive (first 600 chars is ideal)
    if len(clean_text) > 750:
        clean_text = clean_text[:750].rsplit(".", 1)[0] + "."
        
    voice = get_voice_for_language(language)
    communicate = edge_tts.Communicate(clean_text, voice)
    
    audio_stream = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_stream.write(chunk["data"])
            
    audio_stream.seek(0)
    return audio_stream.read()


def decode_audio_to_pcm(content: bytes) -> bytes:
    """
    Decodes any audio container (WebM, OGG, WAV, MP4, AAC) into standard
    16kHz 16-bit Mono PCM bytes using PyAV.
    """
    try:
        import av
        inp = io.BytesIO(content)
        container = av.open(inp)
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        pcm_chunks = []
        for frame in container.decode(audio=0):
            resampled_frames = resampler.resample(frame)
            for r_frame in resampled_frames:
                pcm_chunks.append(r_frame.to_ndarray().tobytes())
        return b"".join(pcm_chunks)
    except Exception as e:
        logger.warning(f"Audio decoding notice: {e}")
        return b""


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("en"),
):
    """
    Transcribes spoken audio into text. Supports any incoming audio format
    (WebM, OGG, WAV) using PyAV and Google Speech Recognition API.
    """
    content = await file.read()
    transcription = ""
    detected_lang = language or "en"
    
    primary_lang = "te-IN" if language == "te" else "en-US"
    secondary_lang = "en-US" if language == "te" else "te-IN"

    # 1. Try PyAV PCM decoding + SpeechRecognition (handles WebM, OGG, WAV seamlessly)
    pcm_bytes = decode_audio_to_pcm(content)
    if pcm_bytes:
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            audio_data = sr.AudioData(pcm_bytes, 16000, 2)
            try:
                transcription = r.recognize_google(audio_data, language=primary_lang)
                detected_lang = language
            except Exception:
                try:
                    transcription = r.recognize_google(audio_data, language=secondary_lang)
                    detected_lang = "te" if secondary_lang == "te-IN" else "en"
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"PCM transcription error: {e}")

    # 2. Fallback: Write to temporary file and inspect via sr.AudioFile
    if not transcription:
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            try:
                import speech_recognition as sr
                r = sr.Recognizer()
                with sr.AudioFile(tmp_path) as source:
                    audio_data = r.record(source)
                    try:
                        transcription = r.recognize_google(audio_data, language=primary_lang)
                    except Exception:
                        transcription = r.recognize_google(audio_data, language=secondary_lang)
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"Temporary file AudioFile transcription notice: {e}")

    logger.info(f"Transcribed audio: '{transcription}' (lang={detected_lang})")
    return {"transcription": transcription, "language": detected_lang}


@router.post("/speak")
async def speak_text(request: dict):
    """
    Generate speech using Edge-TTS.
    Accepts JSON with 'text' and optional 'language'.
    Returns cached audio file URL and direct playback metadata.
    """
    text = request.get("text", "")
    language = request.get("language", "en")
    
    try:
        audio_bytes = await generate_audio_bytes(text, language)
        filename = f"speech_{uuid.uuid4().hex[:12]}.mp3"
        filepath = os.path.join(AUDIO_CACHE_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(audio_bytes)
            
        return {
            "message": "Speech generated successfully",
            "audio_url": f"{API_V1_PREFIX}/voice/audio/{filename}",
            "text": text,
            "language": language,
            "bytes_length": len(audio_bytes)
        }
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        return {
            "message": f"TTS generation error: {str(e)}",
            "audio_url": None,
            "text": text,
            "language": language,
        }


@router.get("/stream_speech")
@router.post("/stream_speech")
async def stream_speech(
    text: str = Query(..., description="Text to speak"),
    language: str = Query("en", description="Language code (en or te)")
):
    """
    Stream MP3 audio directly for instant HTML5 <audio> playback.
    """
    try:
        audio_bytes = await generate_audio_bytes(text, language)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"Stream speech error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """Serve cached audio file."""
    filepath = os.path.join(AUDIO_CACHE_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="Audio file not found")


@router.post("/chat")
async def voice_chat(
    request: dict,
    background_tasks: BackgroundTasks,
):
    """Process voice conversation with Master Medical Agent."""
    user_message = request.get("message", "")
    language = request.get("language", "en")
    user_id = int(request.get("user_id", 1))

    try:
        result = await medical_agent.process_user_input(
            user_id=user_id,
            user_input=user_message,
            language=language,
        )
        return {
            "response_text": result.get("response_text", f"Processed: {user_message}"),
            "language": language,
            "requires_tts": True,
            "citations": result.get("citations", []),
            "mcp_result": result.get("mcp_result"),
            "patient_state": result.get("patient_state"),
            "is_emergency": result.get("is_emergency", False),
            "booked_appointment": result.get("booked_appointment"),
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "response_text": "I apologize, but I am having trouble processing that medical request. Please consult a licensed physician or emergency services if urgent.",
            "language": language,
            "requires_tts": True,
            "error": str(e),
        }
