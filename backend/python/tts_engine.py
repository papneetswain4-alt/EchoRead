#!/usr/bin/env python3
"""
EchoRead Python TTS Engine
Standalone CLI script for Microsoft Edge TTS audio generation and voice listing.
Communicates with Node.js Express backend via structured JSON over stdin/stdout.
Diagnostic logs are written strictly to stderr.
"""

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import tempfile
import uuid
from typing import Any, Dict, List, Optional

# Ensure UTF-8 output encoding across platforms
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
        sys.stdin.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Configure logging to stderr ONLY to prevent polluting stdout JSON protocol
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [python_tts]: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("echoread.tts_engine")

# 1 second = 10,000,000 units of 100-nanoseconds (Microsoft Speech TTS ticks)
TICKS_PER_SECOND = 10_000_000.0
DEFAULT_VOICE = "en-US-AriaNeural"
MAX_TEXT_LENGTH = 5000

RATE_PATTERN = re.compile(r"^[+-]\d+%$")
PITCH_PATTERN = re.compile(r"^[+-]\d+Hz$")
VOLUME_PATTERN = re.compile(r"^[+-]\d+%$")


class TTSEngineError(Exception):
    """Base error class for TTS engine errors."""
    def __init__(self, error_type: str, message: str):
        super().__init__(message)
        self.error_type = error_type
        self.message = message


def emit_json_response(data: Dict[str, Any]) -> None:
    """Emits JSON response to stdout and flushes."""
    print(json.dumps(data, ensure_ascii=False), flush=True)


def emit_json_error(error_type: str, message: str, exit_code: int = 1) -> None:
    """Emits structured error JSON to stdout, logs to stderr, and exits."""
    logger.error("TTS Engine Error [%s]: %s", error_type, message)
    emit_json_response({
        "status": "error",
        "error_type": error_type,
        "message": message,
    })
    sys.exit(exit_code)


def validate_generation_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validates the speech synthesis input payload."""
    text = payload.get("text")
    if text is None:
        raise TTSEngineError("VALIDATION_ERROR", "Text field is required.")
    
    if not isinstance(text, str):
        raise TTSEngineError("VALIDATION_ERROR", "Text must be a string.")

    cleaned_text = text.strip()
    if not cleaned_text:
        raise TTSEngineError("INVALID_TTS_INPUT", "Text cannot be empty.")

    if len(text) > MAX_TEXT_LENGTH:
        raise TTSEngineError(
            "VALIDATION_ERROR",
            f"Text length exceeds maximum allowed length of {MAX_TEXT_LENGTH} characters."
        )

    voice = payload.get("voice") or DEFAULT_VOICE
    if not isinstance(voice, str) or not voice.strip():
        raise TTSEngineError("VALIDATION_ERROR", "Voice identifier must be a non-empty string.")

    rate = payload.get("rate") or "+0%"
    if not isinstance(rate, str) or not RATE_PATTERN.match(rate):
        raise TTSEngineError("VALIDATION_ERROR", "Rate must be in the format '+0%', '+10%', or '-10%'.")

    pitch = payload.get("pitch") or "+0Hz"
    if not isinstance(pitch, str) or not PITCH_PATTERN.match(pitch):
        raise TTSEngineError("VALIDATION_ERROR", "Pitch must be in the format '+0Hz', '+5Hz', or '-5Hz'.")

    volume = payload.get("volume") or "+0%"
    if not isinstance(volume, str) or not VOLUME_PATTERN.match(volume):
        raise TTSEngineError("VALIDATION_ERROR", "Volume must be in the format '+0%', '+10%', or '-10%'.")

    return {
        "text": cleaned_text,
        "voice": voice.strip(),
        "rate": rate,
        "pitch": pitch,
        "volume": volume,
    }


async def action_voices(locale_filter: Optional[str] = None) -> None:
    """Retrieves available neural voices from edge-tts."""
    try:
        import edge_tts
    except ImportError as e:
        emit_json_error("INTERNAL_ERROR", f"edge-tts package is not installed: {e}")
        return

    try:
        logger.info("Fetching available voices (filter=%s)...", locale_filter)
        raw_voices = await edge_tts.list_voices()
        
        filtered_voices: List[Dict[str, Any]] = []
        for v in raw_voices:
            short_name = v.get("ShortName", "")
            if not short_name:
                continue
            
            locale = v.get("Locale", "")
            if locale_filter and not locale.startswith(locale_filter):
                continue

            filtered_voices.append({
                "name": v.get("Name", ""),
                "short_name": short_name,
                "gender": v.get("Gender", "Unknown"),
                "locale": locale,
                "friendly_name": v.get("FriendlyName", short_name),
            })

        emit_json_response({
            "status": "ok",
            "total": len(filtered_voices),
            "locale_filter": locale_filter,
            "voices": filtered_voices,
        })
    except Exception as exc:
        logger.error("Failed to list voices from Edge TTS: %s", exc, exc_info=True)
        emit_json_error("UPSTREAM_ERROR", f"Failed to retrieve voice list: {exc}")


async def action_generate(payload: Dict[str, Any]) -> None:
    """Synthesizes text into speech and outputs word boundary timing metadata."""
    try:
        import edge_tts
        from edge_tts.exceptions import EdgeTTSException
    except ImportError as e:
        emit_json_error("INTERNAL_ERROR", f"edge-tts package is not installed: {e}")
        return

    try:
        validated = validate_generation_payload(payload)
    except TTSEngineError as e:
        emit_json_error(e.error_type, e.message)
        return

    text = validated["text"]
    voice = validated["voice"]
    rate = validated["rate"]
    pitch = validated["pitch"]
    volume = validated["volume"]

    logger.info("Starting synthesis: voice='%s', chars=%d, rate='%s', pitch='%s', volume='%s'",
                voice, len(text), rate, pitch, volume)

    audio_chunks: List[bytes] = []
    words: List[Dict[str, Any]] = []
    temp_file_path: Optional[str] = None

    try:
        communicator = edge_tts.Communicate(
            text=text,
            voice=voice,
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
                raw_offset = chunk.get("offset", 0)
                raw_duration = chunk.get("duration", 0)
                word_text = chunk.get("text", "")

                start_sec = raw_offset / TICKS_PER_SECOND
                dur_sec = raw_duration / TICKS_PER_SECOND
                end_sec = start_sec + dur_sec

                words.append({
                    "text": word_text,
                    "start": round(start_sec, 3),
                    "duration": round(dur_sec, 3),
                    "end": round(end_sec, 3),
                })

        if not audio_chunks:
            raise TTSEngineError("UPSTREAM_ERROR", "No audio data received from Edge TTS service.")

        total_audio = b"".join(audio_chunks)

        # Write audio to a safe, controlled temporary MP3 file
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"echoread_{uuid.uuid4().hex}.mp3")
        with open(temp_file_path, "wb") as f:
            f.write(total_audio)

        duration_sec = words[-1]["end"] if words else round(len(total_audio) / 16000.0, 3)

        logger.info("Synthesis succeeded: %d bytes, %d words, duration: ~%.2fs, temp_file: %s",
                    len(total_audio), len(words), duration_sec or 0.0, temp_file_path)

        emit_json_response({
            "status": "ok",
            "temp_audio_file": temp_file_path,
            "audio_format": "mp3",
            "duration_seconds": round(duration_sec, 3) if duration_sec is not None else None,
            "word_count": len(words),
            "words": words,
        })

    except EdgeTTSException as exc:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass
        logger.error("Edge TTS upstream error during synthesis: %s", exc)
        emit_json_error("UPSTREAM_ERROR", f"Edge TTS service error: {exc}")
    except TTSEngineError as exc:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass
        emit_json_error(exc.error_type, exc.message)
    except Exception as exc:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass
        logger.error("Unexpected error in TTS synthesis: %s", exc, exc_info=True)
        emit_json_error("INTERNAL_ERROR", f"Speech synthesis failed: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(description="EchoRead Python TTS Engine")
    parser.add_argument("--action", choices=["generate", "voices"], required=True,
                        help="Action to perform: generate speech or list voices")
    parser.add_argument("--locale", type=str, default=None,
                        help="Optional locale filter prefix for listing voices (e.g. 'en-')")
    args = parser.parse_args()

    if args.action == "voices":
        asyncio.run(action_voices(args.locale))
    elif args.action == "generate":
        # Read JSON payload from stdin
        try:
            stdin_data = sys.stdin.read()
            if not stdin_data.strip():
                emit_json_error("VALIDATION_ERROR", "No JSON input provided on standard input.")
                return
            payload = json.loads(stdin_data)
        except json.JSONDecodeError as exc:
            emit_json_error("VALIDATION_ERROR", f"Invalid JSON payload on stdin: {exc}")
            return
        except Exception as exc:
            emit_json_error("INTERNAL_ERROR", f"Failed to read input payload: {exc}")
            return

        asyncio.run(action_generate(payload))


if __name__ == "__main__":
    main()
