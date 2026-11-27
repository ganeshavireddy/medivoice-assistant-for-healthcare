"""
MediVoice AI - Voice Session Manager

Manages isolated patient conversation sessions, language preferences,
and interaction history to ensure session-level memory isolation.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from ai.patient_state import patient_state_manager

logger = logging.getLogger(__name__)


@dataclass
class ConversationTurn:
    """A single turn in the voice conversation."""
    role: str  # 'user' | 'assistant'
    text: str
    timestamp: float
    language: str
    is_emergency: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class VoiceSessionManager:
    """Manages active patient session history and preferences."""

    def __init__(self):
        # In-memory mapping: user_id -> List[ConversationTurn]
        self._sessions: Dict[int, List[ConversationTurn]] = {}
        # User language preferences: user_id -> 'en' | 'te'
        self._user_languages: Dict[int, str] = {}

    def get_user_language(self, user_id: int, fallback: str = "en") -> str:
        """Get the saved language preference for a user."""
        return self._user_languages.get(user_id, fallback)

    def set_user_language(self, user_id: int, language: str) -> None:
        """Set language preference for a user."""
        self._user_languages[user_id] = language

    def record_turn(
        self,
        user_id: int,
        role: str,
        text: str,
        language: str = "en",
        is_emergency: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record a single conversation turn in the user's isolated session."""
        if user_id not in self._sessions:
            self._sessions[user_id] = []

        turn = ConversationTurn(
            role=role,
            text=text,
            timestamp=time.time(),
            language=language,
            is_emergency=is_emergency,
            metadata=metadata or {},
        )
        self._sessions[user_id].append(turn)

        # Cap session history to 50 turns to prevent unbounded memory growth
        if len(self._sessions[user_id]) > 50:
            self._sessions[user_id] = self._sessions[user_id][-50:]

    def get_history(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve recent turns for this user session in standard chat format."""
        turns = self._sessions.get(user_id, [])
        recent = turns[-limit:] if limit > 0 else turns
        return [
            {
                "role": t.role,
                "text": t.text,
                "timestamp": t.timestamp,
                "language": t.language,
                "is_emergency": t.is_emergency,
                "metadata": t.metadata,
            }
            for t in recent
        ]

    def clear_session(self, user_id: int) -> None:
        """Clear the user's conversation session history completely."""
        if user_id in self._sessions:
            del self._sessions[user_id]
        # Also reset structured state in patient_state_manager
        try:
            patient_state_manager.reset_context(user_id)
        except Exception as e:
            logger.debug(f"Notice resetting patient context: {e}")
        logger.info(f"Cleared voice session and patient state for user {user_id}")


# Global singleton instance
voice_session_manager = VoiceSessionManager()
