"""
MediVoice AI - Transcription Service

Performs robust Speech-to-Text (STT) for English and Telugu using Faster-Whisper
with automatic fallback to Google Speech Recognition, non-blocking execution,
and language detection.
"""

import time
import asyncio
import logging
from dataclasses import dataclass
from typing import Optional, Tuple
import numpy as np

from config import WHISPER_MODEL_SIZE
from services.voice.audio_processor import AudioProcessResult, audio_processor

logger = logging.getLogger(__name__)

# Common Whisper hallucinations produced on silence / background static
WHISPER_HALLUCINATIONS = {
    "you", "you.", "thank you", "thank you.", "thanks", "thanks.",
    "thanks for watching", "thanks for watching.", "bye", "bye.", ".", "...",
    "subtitles by", "translated by", "subscribe", "like and subscribe",
}

# Initial clinical prompt to guide Whisper token decoding
MEDICAL_INITIAL_PROMPT = (
    "Healthcare consultation, medical symptoms, fever, headache, cough, "
    "chest pain, blood pressure, appointment booking with doctor, "
    "డాక్టర్, జ్వరం, తలనొప్పి, ఛాతీ నొప్పి, అపాయింట్‌మెంట్."
)


@dataclass
class TranscriptionResult:
    """Standardized output of the transcription service."""
    transcription: str
    detected_language: str
    processing_time: float
    success: bool
    error: Optional[str] = None


class TranscriptionService:
    """Singleton service managing Faster-Whisper model lifecycle and STT inference."""

    def __init__(self):
        self._model = None
        self._model_loading_lock = asyncio.Lock()
        self._is_initialized = False

    def get_model(self):
        """Lazy-loads and caches the Faster-Whisper model instance on CPU."""
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                # Default to 'tiny' for lightning fast <0.5s CPU inference; configurable via env
                model_size = WHISPER_MODEL_SIZE or "tiny"
                logger.info(f"Initializing Faster-Whisper model ('{model_size}')...")
                self._model = WhisperModel(model_size, device="cpu", compute_type="int8")
                self._is_initialized = True
                logger.info("Faster-Whisper model initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to load Faster-Whisper model: {e}")
                self._model = False
                self._is_initialized = False
        return self._model if self._model is not False else None

    def _sync_transcribe_whisper(
        self,
        float_audio: np.ndarray,
        target_language: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Synchronous Whisper transcription executed inside worker threadpool.
        Returns: (transcribed_text, detected_language)
        """
        model = self.get_model()
        if not model or float_audio.size == 0:
            return "", target_language or "en"

        # Determine language parameter
        lang = None
        if target_language:
            t_lang = target_language.lower().strip()
            if t_lang.startswith("te"):
                lang = "te"
            elif t_lang.startswith("en"):
                lang = "en"
            elif t_lang.startswith("hi"):
                lang = "hi"

        try:
            # Fast real-time inference with VAD filtering and greedy beam_size=1
            segments, info = model.transcribe(
                float_audio,
                language=lang,
                beam_size=1,
                vad_filter=True,
                no_speech_threshold=0.6,
                condition_on_previous_text=False,
                initial_prompt=MEDICAL_INITIAL_PROMPT,
            )
            detected_lang = info.language if info else (lang or "en")
            text = " ".join(seg.text.strip() for seg in segments if seg.text).strip()

            # Second pass: if target was Telugu but yielded empty text, try auto-detection
            if not text and lang != "en":
                segments_auto, info_auto = model.transcribe(
                    float_audio,
                    beam_size=1,
                    vad_filter=True,
                    no_speech_threshold=0.6,
                    condition_on_previous_text=False,
                )
                detected_lang = info_auto.language if info_auto else "en"
                text = " ".join(seg.text.strip() for seg in segments_auto if seg.text).strip()

            # Filter hallucinations on low energy recordings
            if text.lower().strip() in WHISPER_HALLUCINATIONS:
                logger.info(f"Filtered silence hallucination: '{text}'")
                text = ""

            return text, detected_lang
        except Exception as e:
            logger.warning(f"Whisper inference error: {e}")
            return "", target_language or "en"

    def _sync_transcribe_google(
        self,
        pcm_bytes: bytes,
        target_language: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Fallback speech recognition using Google Speech API if available.
        """
        if not pcm_bytes:
            return "", target_language or "en"

        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            audio_data = sr.AudioData(pcm_bytes, 16000, 2)

            t_lang = (target_language or "en").lower().strip()
            is_telugu = t_lang.startswith("te")
            primary_locale = "te-IN" if is_telugu else "en-US"
            secondary_locale = "en-US" if is_telugu else "te-IN"

            # Try primary locale
            try:
                text = r.recognize_google(audio_data, language=primary_locale)
                return text, "te" if is_telugu else "en"
            except Exception:
                # Try secondary locale
                try:
                    text = r.recognize_google(audio_data, language=secondary_locale)
                    return text, "en" if is_telugu else "te"
                except Exception:
                    return "", target_language or "en"
        except Exception as e:
            logger.debug(f"Google speech recognition unavailable: {e}")
            return "", target_language or "en"

    async def transcribe(
        self,
        audio_content: bytes,
        language: Optional[str] = "en",
        filename: str = "",
    ) -> TranscriptionResult:
        """
        Asynchronously transcribes audio content into text without blocking
        FastAPI's event loop.
        """
        start_time = time.time()

        # Step 1: Preprocess, decode, validate audio
        proc_result: AudioProcessResult = await asyncio.to_thread(
            audio_processor.process_audio, audio_content, filename
        )

        if proc_result.error:
            return TranscriptionResult(
                transcription="",
                detected_language=language or "en",
                processing_time=round(time.time() - start_time, 3),
                success=False,
                error=proc_result.error,
            )

        if proc_result.is_silent:
            return TranscriptionResult(
                transcription="",
                detected_language=language or "en",
                processing_time=round(time.time() - start_time, 3),
                success=True,
                error="Audio is silent or below the speech threshold.",
            )

        # Step 2: Primary STT via Faster-Whisper
        text, detected_lang = await asyncio.to_thread(
            self._sync_transcribe_whisper,
            proc_result.float_array,
            language,
        )

        # Step 3: Secondary STT via Google Speech API if Whisper returned empty
        if not text and proc_result.pcm_bytes:
            logger.info("Whisper returned empty; trying Google Speech API fallback...")
            text, detected_lang = await asyncio.to_thread(
                self._sync_transcribe_google,
                proc_result.pcm_bytes,
                language,
            )

        # Detect Telugu unicode characters if language detection was unsure
        if text and any("\u0c00" <= char <= "\u0c7f" for char in text):
            detected_lang = "te"

        elapsed = round(time.time() - start_time, 3)
        logger.info(f"Transcription complete: '{text}' (lang={detected_lang}, time={elapsed}s)")

        return TranscriptionResult(
            transcription=text,
            detected_language=detected_lang,
            processing_time=elapsed,
            success=True,
            error=None if text else "No speech could be recognized in the recording.",
        )


# Global singleton instance
transcription_service = TranscriptionService()
