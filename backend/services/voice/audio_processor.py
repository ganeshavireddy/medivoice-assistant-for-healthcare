"""
MediVoice AI - Voice Audio Processor Service

Handles audio validation, container decoding (WebM, OGG, WAV, MP4, AAC),
resampling to standard 16 kHz 16-bit Mono PCM, and audio energy analysis.
"""

import io
import wave
import logging
from dataclasses import dataclass
from typing import Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Max upload limit: 25 MB
MAX_AUDIO_BYTES = 25 * 1024 * 1024
# Min viable audio size
MIN_AUDIO_BYTES = 200
# Target audio specifications for Whisper and Speech Recognition
TARGET_SAMPLE_RATE = 16000
TARGET_CHANNELS = 1
TARGET_SAMPLE_WIDTH = 2  # 16-bit PCM


@dataclass
class AudioProcessResult:
    """Structured container holding processed audio data and metrics."""
    pcm_bytes: bytes
    float_array: np.ndarray
    sample_rate: int
    duration_seconds: float
    is_silent: bool
    rms: float
    peak: float
    error: Optional[str] = None


class AudioProcessor:
    """Service to decode, resample, and analyze incoming speech audio."""

    @staticmethod
    def validate_audio_file(content: bytes, filename: str = "") -> Tuple[bool, Optional[str]]:
        """Validate audio byte size and file format."""
        if not content or len(content) < MIN_AUDIO_BYTES:
            return False, "Audio recording is empty or too short."
        if len(content) > MAX_AUDIO_BYTES:
            return False, f"Audio file exceeds maximum allowed size of {MAX_AUDIO_BYTES // (1024 * 1024)} MB."
        return True, None

    @staticmethod
    def decode_to_pcm(content: bytes) -> bytes:
        """
        Decodes any incoming audio format (WebM, OGG, WAV, MP4, AAC, MP3)
        into standard 16kHz 16-bit Mono PCM bytes.
        """
        # 1. Try PyAV container decoding & resampling
        try:
            import av
            inp = io.BytesIO(content)
            container = av.open(inp)
            resampler = av.AudioResampler(
                format="s16",
                layout="mono",
                rate=TARGET_SAMPLE_RATE,
            )
            pcm_chunks = []
            for frame in container.decode(audio=0):
                resampled_frames = resampler.resample(frame)
                for r_frame in resampled_frames:
                    pcm_chunks.append(r_frame.to_ndarray().tobytes())
            
            pcm_data = b"".join(pcm_chunks)
            if pcm_data:
                return pcm_data
        except Exception as pyav_err:
            logger.debug(f"PyAV decode notice: {pyav_err}")

        # 2. Fallback: Standard Library wave reader (for standard PCM WAV files)
        try:
            with wave.open(io.BytesIO(content), "rb") as wf:
                framerate = wf.getframerate()
                nchannels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                raw_frames = wf.readframes(wf.getnframes())

                # If already 16kHz 16-bit mono, return as-is
                if framerate == TARGET_SAMPLE_RATE and nchannels == TARGET_CHANNELS and sampwidth == TARGET_SAMPLE_WIDTH:
                    return raw_frames
                
                # Simple numpy resampling if wave has different rate/channels
                if sampwidth == 2:
                    audio_np = np.frombuffer(raw_frames, dtype=np.int16)
                    if nchannels > 1:
                        audio_np = audio_np.reshape(-1, nchannels).mean(axis=1).astype(np.int16)
                    if framerate != TARGET_SAMPLE_RATE and len(audio_np) > 0:
                        # Linear interpolation to 16kHz
                        num_samples = int(len(audio_np) * TARGET_SAMPLE_RATE / framerate)
                        resampled = np.interp(
                            np.linspace(0, len(audio_np), num_samples, endpoint=False),
                            np.arange(len(audio_np)),
                            audio_np,
                        ).astype(np.int16)
                        return resampled.tobytes()
                    return audio_np.tobytes()
        except Exception as wave_err:
            logger.debug(f"WAV fallback decode notice: {wave_err}")

        return b""

    @classmethod
    def process_audio(cls, content: bytes, filename: str = "") -> AudioProcessResult:
        """
        Complete processing pipeline: validation, decoding, silence detection,
        and volume normalization.
        """
        is_valid, validation_error = cls.validate_audio_file(content, filename)
        if not is_valid:
            return AudioProcessResult(
                pcm_bytes=b"",
                float_array=np.array([], dtype=np.float32),
                sample_rate=TARGET_SAMPLE_RATE,
                duration_seconds=0.0,
                is_silent=True,
                rms=0.0,
                peak=0.0,
                error=validation_error,
            )

        pcm_bytes = cls.decode_to_pcm(content)
        if not pcm_bytes:
            return AudioProcessResult(
                pcm_bytes=b"",
                float_array=np.array([], dtype=np.float32),
                sample_rate=TARGET_SAMPLE_RATE,
                duration_seconds=0.0,
                is_silent=True,
                rms=0.0,
                peak=0.0,
                error="Failed to decode audio stream into 16kHz PCM.",
            )

        # Convert to numpy float32 array in range [-1.0, 1.0]
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
        if audio_int16.size == 0:
            return AudioProcessResult(
                pcm_bytes=b"",
                float_array=np.array([], dtype=np.float32),
                sample_rate=TARGET_SAMPLE_RATE,
                duration_seconds=0.0,
                is_silent=True,
                rms=0.0,
                peak=0.0,
                error="Audio buffer contains zero samples.",
            )

        float_audio = audio_int16.astype(np.float32) / 32768.0
        duration = len(audio_int16) / TARGET_SAMPLE_RATE

        # Calculate RMS and peak amplitude
        rms = float(np.sqrt(np.mean(float_audio ** 2)))
        peak = float(np.max(np.abs(float_audio)))

        # Pure silence detection threshold
        is_silent = (rms < 0.0006 and peak < 0.003) or duration < 0.25

        # Normalization for quiet recordings
        normalized_audio = float_audio
        if not is_silent and 0.0006 <= rms < 0.08:
            gain = min(20.0, 0.09 / rms)
            normalized_audio = np.clip(float_audio * gain, -1.0, 1.0)
            # Update pcm_bytes with normalized gain
            pcm_bytes = (normalized_audio * 32767.0).astype(np.int16).tobytes()

        return AudioProcessResult(
            pcm_bytes=pcm_bytes,
            float_array=normalized_audio,
            sample_rate=TARGET_SAMPLE_RATE,
            duration_seconds=round(duration, 2),
            is_silent=is_silent,
            rms=rms,
            peak=peak,
            error=None,
        )


# Global singleton instance
audio_processor = AudioProcessor()
