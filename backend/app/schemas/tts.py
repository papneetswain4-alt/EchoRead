"""
Pydantic schemas for Text-to-Speech (TTS) requests and responses.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class TTSGenerateRequest(BaseModel):
    """Payload for speech generation request."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text content to convert into speech.",
        examples=["Hello! Welcome to EchoRead Studio."]
    )
    voice: str = Field(
        default="en-US-AriaNeural",
        description="Edge TTS neural voice identifier.",
        examples=["en-US-AriaNeural", "en-US-GuyNeural", "en-GB-SoniaNeural"]
    )
    rate: str = Field(
        default="+0%",
        description="Speech speed rate modifier (e.g., '+0%', '+15%', '-10%').",
        pattern=r"^[+-]\d+%$"
    )
    pitch: str = Field(
        default="+0Hz",
        description="Voice pitch modifier (e.g., '+0Hz', '+5Hz', '-5Hz').",
        pattern=r"^[+-]\d+Hz$"
    )
    volume: str = Field(
        default="+0%",
        description="Audio volume modifier (e.g., '+0%', '+10%', '-20%').",
        pattern=r"^[+-]\d+%$"
    )


class WordTimingResponse(BaseModel):
    """Word boundary timing metadata for synchronization."""
    text: str = Field(description="Token or word text as spoken.")
    start: float = Field(description="Start time in seconds relative to audio start.")
    duration: float = Field(description="Word duration in seconds.")
    end: float = Field(description="End time in seconds (start + duration).")


class TTSGenerateResponse(BaseModel):
    """
    Response returned by speech generation endpoint.
    
    Audio Delivery Strategy:
    Base64 encoded MP3 audio is returned in the same JSON response along with
    the word-boundary timestamps. This allows atomic delivery of audio and
    synchronization metadata in a single network request without requiring
    secondary download endpoints or temporary file storage on the server.
    """
    audio_format: str = Field(default="mp3", description="Audio format/codec.")
    audio_base64: str = Field(description="Base64 encoded MP3 audio bytes.")
    duration_seconds: Optional[float] = Field(None, description="Estimated total audio duration in seconds.")
    word_count: int = Field(description="Total number of word boundaries captured.")
    words: List[WordTimingResponse] = Field(default_factory=list, description="Ordered list of word timings.")


class VoiceItemResponse(BaseModel):
    """Metadata representing an available Edge TTS voice."""
    name: str = Field(description="Full internal identifier.")
    short_name: str = Field(description="Standard short voice code used for generation.")
    gender: str = Field(description="Voice gender (e.g. Female, Male).")
    locale: str = Field(description="Locale code (e.g. en-US, en-GB).")
    friendly_name: str = Field(description="Human-readable voice name.")


class VoicesListResponse(BaseModel):
    """Response containing list of available Edge TTS voices."""
    total: int = Field(description="Number of voices returned.")
    locale_filter: Optional[str] = Field(None, description="Locale filter applied, if any.")
    voices: List[VoiceItemResponse] = Field(default_factory=list)
