"""
MediVoice AI - Text-to-Speech (TTS) Service

Generates natural, high-quality audio speech for English and Telugu using
Edge-TTS with audio caching, markdown stripping, and stream support.
"""

import os
import io
import re
import uuid
import hashlib
import asyncio
import logging
from dataclasses import dataclass
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Cache directory for synthesized audio
AUDIO_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "audio_cache"
)
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

# Recommended Edge-TTS voices
VOICE_MAP = {
    "en": "en-US-JennyNeural",
    "en-us": "en-US-JennyNeural",
    "en-in": "en-IN-NeerjaNeural",
    "te": "te-IN-ShrutiNeural",
    "te-in": "te-IN-ShrutiNeural",
    "hi": "hi-IN-SwaraNeural",
    "hi-in": "hi-IN-SwaraNeural",
}


@dataclass
class SpeechResult:
    """Standardized output of the speech synthesis service."""
    audio_bytes: bytes
    audio_url: Optional[str]
    filename: Optional[str]
    language: str
    cleaned_text: str
    duration_est: float
    success: bool
    error: Optional[str] = None


class SpeechService:
    """Service to clean clinical responses and synthesize speech audio."""

    @staticmethod
    def clean_text_for_speech(text: str) -> str:
        """
        Cleans markdown syntax, citations, status emojis, and formatting
        to ensure speech synthesis sounds fluid and natural.
        """
        if not text:
            return ""

        # Remove citation brackets like [ACC/AHA 2017: Hypertension]
        cleaned = re.sub(r"\[[^\]]+\]", "", text)
        # Remove markdown headers like '### 1. Understanding symptoms'
        cleaned = re.sub(r"#{1,6}\s*(\d+\.?\s*)?", r"\1", cleaned)
        # Remove bold and italic markers
        cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
        cleaned = re.sub(r"\*([^*]+)\*", r"\1", cleaned)
        cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
        cleaned = re.sub(r"_([^_]+)_", r"\1", cleaned)
        # Remove bullet points and numbered list markers
        cleaned = re.sub(r"^[•\-\*]\s*", "", cleaned, flags=re.MULTILINE)
        # Remove emojis and status symbols
        cleaned = re.sub(r"[🚨⚠️ℹ️•—–✓🩺❤️📅⏰👨‍⚕️👩‍⚕️💊💉]", " ", cleaned)
        # Remove URLs
        cleaned = re.sub(r"https?://\S+", "", cleaned)
        # Replace repeated linebreaks and whitespace with natural pauses
        cleaned = re.sub(r"\n+", ". ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Cap text length to ~750 characters at sentence boundary for optimal voice delivery
        if len(cleaned) > 750:
            truncated = cleaned[:750]
            last_period = truncated.rfind(".")
            if last_period > 250:
                cleaned = truncated[: last_period + 1]
            else:
                cleaned = truncated.rsplit(" ", 1)[0] + "."

        return cleaned

    @classmethod
    def get_voice(cls, language: Optional[str] = "en") -> str:
        """Select the appropriate voice identifier."""
        lang_key = (language or "en").lower().strip()
        if "te" in lang_key:
            return VOICE_MAP["te"]
        elif "hi" in lang_key:
            return VOICE_MAP["hi"]
        return VOICE_MAP["en"]

    @classmethod
    async def synthesize(
        cls,
        text: str,
        language: Optional[str] = "en",
        cache: bool = True,
    ) -> SpeechResult:
        """
        Synthesize text into MP3 audio bytes using Edge-TTS.
        """
        cleaned = cls.clean_text_for_speech(text)
        if not cleaned:
            cleaned = "I have processed your request."

        voice = cls.get_voice(language)
        # Estimate duration (~150 words per minute, ~2.5 words per second)
        word_count = len(cleaned.split())
        est_duration = round(max(1.0, word_count / 2.5), 1)

        # Check cache if enabled
        text_hash = hashlib.md5(f"{voice}:{cleaned}".encode("utf-8")).hexdigest()
        filename = f"tts_{text_hash}.mp3"
        filepath = os.path.join(AUDIO_CACHE_DIR, filename)

        if cache and os.path.exists(filepath):
            try:
                with open(filepath, "rb") as f:
                    cached_bytes = f.read()
                return SpeechResult(
                    audio_bytes=cached_bytes,
                    audio_url=f"/api/v1/voice/audio/{filename}",
                    filename=filename,
                    language=language or "en",
                    cleaned_text=cleaned,
                    duration_est=est_duration,
                    success=True,
                    error=None,
                )
            except Exception as read_err:
                logger.warning(f"Failed to read cached TTS file: {read_err}")

        # Synthesize via edge_tts
        try:
            import edge_tts
            communicate = edge_tts.Communicate(cleaned, voice)
            audio_stream = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_stream.write(chunk["data"])

            audio_stream.seek(0)
            audio_bytes = audio_stream.read()

            if not audio_bytes:
                return SpeechResult(
                    audio_bytes=b"",
                    audio_url=None,
                    filename=None,
                    language=language or "en",
                    cleaned_text=cleaned,
                    duration_est=0.0,
                    success=False,
                    error="TTS generator returned empty audio stream.",
                )

            # Save to cache
            if cache:
                try:
                    with open(filepath, "wb") as f:
                        f.write(audio_bytes)
                except Exception as save_err:
                    logger.warning(f"Failed to cache TTS audio: {save_err}")

            return SpeechResult(
                audio_bytes=audio_bytes,
                audio_url=f"/api/v1/voice/audio/{filename}",
                filename=filename,
                language=language or "en",
                cleaned_text=cleaned,
                duration_est=est_duration,
                success=True,
                error=None,
            )
        except Exception as tts_err:
            logger.error(f"Edge-TTS synthesis error: {tts_err}")
            return SpeechResult(
                audio_bytes=b"",
                audio_url=None,
                filename=None,
                language=language or "en",
                cleaned_text=cleaned,
                duration_est=0.0,
                success=False,
                error=f"Speech synthesis error: {str(tts_err)}",
            )


# Global singleton instance
speech_service = SpeechService()
