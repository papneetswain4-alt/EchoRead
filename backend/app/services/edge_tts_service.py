"""
Edge TTS Service Module
Encapsulates Microsoft Edge TTS logic, audio streaming, and WordBoundary timing normalization.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import edge_tts
from edge_tts.exceptions import EdgeTTSException

logger = logging.getLogger("echoread.tts_service")

# 1 second = 10,000,000 units of 100-nanoseconds (the time unit used by Microsoft Speech TTS)
TICKS_PER_SECOND = 10_000_000.0

DEFAULT_VOICE = "en-US-AriaNeural"
MAX_TEXT_LENGTH = 5000


class TTSServiceError(Exception):
    """Base exception for TTS service errors."""
    pass


class TTSInputValidationError(TTSServiceError):
    """Raised when the input text or parameters are invalid."""
    pass


class TTSUpstreamError(TTSServiceError):
    """Raised when Microsoft Edge TTS service fails or returns an error."""
    pass


@dataclass
class WordTimingItem:
    """Normalized timing metadata for a single spoken word."""
    text: str
    start: float       # Start time in seconds relative to the audio start
    duration: float    # Duration of this word in seconds
    end: float         # End time (start + duration) in seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "start": round(self.start, 3),
            "duration": round(self.duration, 3),
            "end": round(self.end, 3),
        }


@dataclass
class TTSGenerationResult:
    """Result of speech generation containing audio binary and ordered word boundaries."""
    audio_bytes: bytes
    audio_format: str = "mp3"
    words: List[WordTimingItem] = field(default_factory=list)
    duration_seconds: Optional[float] = None

    def to_metadata_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable metadata without the raw audio bytes."""
        return {
            "audio_format": self.audio_format,
            "duration_seconds": round(self.duration_seconds, 3) if self.duration_seconds else None,
            "word_count": len(self.words),
            "words": [w.to_dict() for w in self.words],
        }


class EdgeTTSService:
    """
    Asynchronous service responsible for generating speech audio and
    collecting real-time word-boundary events from Edge TTS.
    """

    def __init__(self, default_voice: str = DEFAULT_VOICE):
        self.default_voice = default_voice

    def validate_input(
        self,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+0%",
        volume: str = "+0%",
        pitch: str = "+0Hz"
    ) -> str:
        """
        Validates text input length and non-empty status.
        Returns the sanitized text.
        """
        if not text or not text.strip():
            raise TTSInputValidationError("Text cannot be empty.")

        cleaned_text = text.strip()
        if len(cleaned_text) > MAX_TEXT_LENGTH:
            raise TTSInputValidationError(
                f"Text length exceeds maximum allowed length of {MAX_TEXT_LENGTH} characters."
            )

        return cleaned_text

    async def generate_speech(
        self,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+0%",
        volume: str = "+0%",
        pitch: str = "+0Hz",
    ) -> TTSGenerationResult:
        """
        Generates MP3 audio and collects word boundary events.

        Args:
            text: Text to synthesize.
            voice: Voice identifier (e.g. 'en-US-AriaNeural').
            rate: Speed adjustment (e.g. '+0%', '+20%', '-10%').
            volume: Volume adjustment (e.g. '+0%', '+10%').
            pitch: Pitch adjustment (e.g. '+0Hz', '+5Hz').

        Returns:
            TTSGenerationResult with raw audio bytes and normalized word timings.
        """
        sanitized_text = self.validate_input(text, voice, rate, volume, pitch)
        selected_voice = voice or self.default_voice

        logger.info(
            "Starting TTS synthesis with voice='%s' (text length=%d characters)",
            selected_voice,
            len(sanitized_text)
        )

        audio_chunks: List[bytes] = []
        words: List[WordTimingItem] = []

        try:
            # We explicitly request boundary="WordBoundary" so that Edge TTS emits
            # real-time word-level events rather than only sentence boundaries.
            communicator = edge_tts.Communicate(
                text=sanitized_text,
                voice=selected_voice,
                rate=rate,
                volume=volume,
                pitch=pitch,
                boundary="WordBoundary",
            )

            async for chunk in communicator.stream():
                chunk_type = chunk.get("type")

                if chunk_type == "audio":
                    data = chunk.get("data")
                    if data:
                        audio_chunks.append(data)

                elif chunk_type == "WordBoundary":
                    # Edge TTS outputs offset and duration in 100-nanosecond units.
                    raw_offset = chunk.get("offset", 0)
                    raw_duration = chunk.get("duration", 0)
                    word_text = chunk.get("text", "")

                    # Convert 100-ns ticks to seconds:
                    start_seconds = raw_offset / TICKS_PER_SECOND
                    duration_seconds = raw_duration / TICKS_PER_SECOND
                    end_seconds = start_seconds + duration_seconds

                    words.append(
                        WordTimingItem(
                            text=word_text,
                            start=start_seconds,
                            duration=duration_seconds,
                            end=end_seconds,
                        )
                    )

        except EdgeTTSException as exc:
            logger.error("Edge TTS upstream error: %s", exc)
            raise TTSUpstreamError(f"Edge TTS service error: {exc}") from exc
        except Exception as exc:
            logger.error("Unexpected error during speech synthesis: %s", exc, exc_info=True)
            raise TTSServiceError(f"Speech synthesis failed: {exc}") from exc

        if not audio_chunks:
            raise TTSUpstreamError("No audio data was received from Edge TTS service.")

        total_audio_bytes = b"".join(audio_chunks)

        # Estimate total speech duration from the last word boundary if available
        total_duration = words[-1].end if words else None

        logger.info(
            "TTS generation complete: %d audio bytes, %d word boundaries collected, duration: ~%.2fs",
            len(total_audio_bytes),
            len(words),
            total_duration or 0.0
        )

        return TTSGenerationResult(
            audio_bytes=total_audio_bytes,
            audio_format="mp3",
            words=words,
            duration_seconds=total_duration,
        )

    async def list_available_voices(self, locale_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves available voices from Edge TTS, optionally filtered by locale prefix (e.g. 'en-').
        """
        try:
            voices = await edge_tts.list_voices()
            if locale_filter:
                voices = [v for v in voices if v.get("Locale", "").startswith(locale_filter)]
            return voices
        except Exception as exc:
            logger.error("Failed to fetch available voices from Edge TTS: %s", exc)
            raise TTSUpstreamError(f"Could not retrieve voices: {exc}") from exc


# Singleton service instance
tts_service = EdgeTTSService()
