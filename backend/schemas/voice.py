"""
MediVoice AI - Voice API Schemas

Strict Pydantic request and response schemas for voice transcription,
speech synthesis, and voice conversation endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class TranscribeRequest(BaseModel):
    """Schema for JSON base64-encoded audio transcription."""
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio data")
    language: Optional[str] = Field("en", description="Target language: 'en' or 'te'")


class TranscribeResponse(BaseModel):
    """Schema returned after transcribing spoken audio."""
    transcription: str = Field(..., description="Recognized speech text")
    detected_language: str = Field(..., description="Detected language: 'en' or 'te'")
    processing_time: float = Field(..., description="Latency in seconds")
    success: bool = Field(True, description="Whether transcription succeeded")
    error: Optional[str] = Field(None, description="Error message if any")


class SynthesizeRequest(BaseModel):
    """Schema for text-to-speech request."""
    text: str = Field(..., min_length=1, description="Text to convert into speech")
    language: Optional[str] = Field("en", description="Target language: 'en' or 'te'")


class SynthesizeResponse(BaseModel):
    """Schema returned after speech synthesis."""
    audio_url: Optional[str] = Field(None, description="Relative URL to the cached audio MP3 file")
    audio_base64: Optional[str] = Field(None, description="Optional base64 encoded audio payload")
    language: str = Field(..., description="Synthesized voice language")
    duration_est: Optional[float] = Field(None, description="Estimated duration in seconds")
    success: bool = Field(True, description="Whether synthesis succeeded")
    error: Optional[str] = Field(None, description="Error details if synthesis failed")


class VoiceChatRequest(BaseModel):
    """Schema for voice chat interaction with MasterMedicalAgent."""
    message: str = Field(..., min_length=1, description="Transcribed user voice message or text")
    language: Optional[str] = Field("en", description="Conversation language: 'en' or 'te'")
    user_id: Optional[int] = Field(1, description="Authenticated patient or user ID")


class VoiceChatResponse(BaseModel):
    """Schema returned after processing patient voice input."""
    response_text: str = Field(..., description="Clinical AI response text")
    language: str = Field(..., description="Response language ('en' or 'te')")
    requires_tts: bool = Field(True, description="Whether audio playback is recommended")
    citations: List[Dict[str, Any]] = Field(default_factory=list, description="Grounding clinical citations")
    is_emergency: bool = Field(False, description="Flag indicating life-threatening emergency triage")
    booked_appointment: Optional[Dict[str, Any]] = Field(None, description="Details if an appointment was booked")
    audio_url: Optional[str] = Field(None, description="Direct URL to pre-synthesized TTS audio")
    error: Optional[str] = Field(None, description="Error message if processing encountered issues")
