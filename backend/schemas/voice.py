"""
MediVoice AI - Voice Schemas

Pydantic models for voice-related requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class TranscribeRequest(BaseModel):
    """Schema for transcription request."""
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio")
    language: Optional[str] = Field("en", description="Language code (en or te)")


class TranscribeResponse(BaseModel):
    """Schema for transcription response."""
    transcription: str = Field(..., description="Transcribed text")
    language: str = Field(..., description="Detected language")


class SpeakRequest(BaseModel):
    """Schema for text-to-speech request."""
    text: str = Field(..., description="Text to convert to speech")
    language: Optional[str] = Field("en-US", description="Language code for TTS")


class SpeakResponse(BaseModel):
    """Schema for TTS response."""
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    message: Optional[str] = Field(None, description="Status message")


class VoiceChatRequest(BaseModel):
    """Schema for voice conversation request."""
    message: str = Field(..., description="User message text")
    language: Optional[str] = Field("en", description="Language code")


class VoiceChatResponse(BaseModel):
    """Schema for voice chat response."""
    response_text: str = Field(..., description="AI assistant response")
    language: str = Field(..., description="Response language")
    requires_tts: bool = Field(True, description="Whether TTS is needed")
    citations: List[Dict] = Field(default_factory=list)
