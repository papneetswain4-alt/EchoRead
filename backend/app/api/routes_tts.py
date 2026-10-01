"""
API route definitions for Text-to-Speech generation and voice listing.
"""

import base64
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.tts import (
    TTSGenerateRequest,
    TTSGenerateResponse,
    WordTimingResponse,
    VoicesListResponse,
    VoiceItemResponse,
)
from app.services.edge_tts_service import (
    tts_service,
    TTSInputValidationError,
    TTSUpstreamError,
    TTSServiceError,
)

logger = logging.getLogger("echoread.routes_tts")
router = APIRouter(prefix="/tts", tags=["Text-to-Speech"])


@router.post(
    "/generate",
    response_model=TTSGenerateResponse,
    summary="Generate speech audio with synchronized word-boundary metadata",
    status_code=status.HTTP_200_OK,
)
async def generate_speech(request: TTSGenerateRequest):
    """
    Synthesize text into MP3 audio and extract real-time word boundary timestamps.

    Returns:
    - Base64 encoded MP3 audio
    - Word-level timing metadata (text, start, duration, end in seconds)
    - Total estimated audio duration and word count
    """
    try:
        result = await tts_service.generate_speech(
            text=request.text,
            voice=request.voice,
            rate=request.rate,
            volume=request.volume,
            pitch=request.pitch,
        )

        # Base64-encode raw MP3 bytes for transport inside JSON
        encoded_audio = base64.b64encode(result.audio_bytes).decode("utf-8")

        word_timings = [
            WordTimingResponse(
                text=w.text,
                start=round(w.start, 3),
                duration=round(w.duration, 3),
                end=round(w.end, 3),
            )
            for w in result.words
        ]

        return TTSGenerateResponse(
            audio_format=result.audio_format,
            audio_base64=encoded_audio,
            duration_seconds=round(result.duration_seconds, 3) if result.duration_seconds else None,
            word_count=len(word_timings),
            words=word_timings,
        )

    except TTSInputValidationError as exc:
        logger.warning("TTS input validation rejected request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_TTS_INPUT",
                "message": str(exc),
            },
        )
    except TTSUpstreamError as exc:
        logger.error("Edge TTS upstream error during speech generation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "TTS_UPSTREAM_ERROR",
                "message": "Speech synthesis service temporarily unavailable. Please try again.",
            },
        )
    except TTSServiceError as exc:
        logger.error("TTS internal service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "TTS_GENERATION_FAILED",
                "message": "Failed to synthesize speech audio.",
            },
        )


@router.get(
    "/voices",
    response_model=VoicesListResponse,
    summary="List available Edge TTS neural voices",
)
async def get_voices(
    locale: Optional[str] = Query(
        None,
        description="Filter voices by locale prefix, e.g. 'en-' or 'en-US'",
        examples=["en-", "en-US", "es-"]
    )
):
    """
    Retrieve all available neural voices supported by Edge TTS.
    """
    try:
        raw_voices = await tts_service.list_available_voices(locale_filter=locale)

        voices = [
            VoiceItemResponse(
                name=v.get("Name", ""),
                short_name=v.get("ShortName", ""),
                gender=v.get("Gender", "Unknown"),
                locale=v.get("Locale", ""),
                friendly_name=v.get("FriendlyName", v.get("ShortName", "")),
            )
            for v in raw_voices
            if v.get("ShortName")
        ]

        return VoicesListResponse(
            total=len(voices),
            locale_filter=locale,
            voices=voices,
        )

    except TTSUpstreamError as exc:
        logger.error("Failed to query voice list: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "VOICES_FETCH_FAILED",
                "message": "Could not retrieve voice catalog from Edge TTS service.",
            },
        )
