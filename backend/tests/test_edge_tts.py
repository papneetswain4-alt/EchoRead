"""
Independent verification test for EdgeTTSService.
Tests audio generation, word boundary parsing, unit conversions, and validation.
"""

import asyncio
import sys
from pathlib import Path

# Ensure UTF-8 output encoding on Windows PowerShell / cmd
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.edge_tts_service import (
    tts_service,
    TTSInputValidationError,
    TTSGenerationResult,
)


async def test_input_validation():
    print("[1/4] Testing input validation...")
    try:
        await tts_service.generate_speech("")
        assert False, "Should have raised TTSInputValidationError for empty text"
    except TTSInputValidationError:
        print("  [OK] Empty text correctly rejected.")

    try:
        await tts_service.generate_speech("   \n\t  ")
        assert False, "Should have raised TTSInputValidationError for whitespace text"
    except TTSInputValidationError:
        print("  [OK] Whitespace text correctly rejected.")


async def test_speech_generation():
    print("\n[2/4] Testing speech synthesis & WordBoundary collection...")
    test_phrase = "EchoRead converts text to speech smoothly."
    result: TTSGenerationResult = await tts_service.generate_speech(
        text=test_phrase,
        voice="en-US-AriaNeural"
    )

    # 1. Verify Audio
    assert len(result.audio_bytes) > 1000, f"Audio bytes too small: {len(result.audio_bytes)}"
    print(f"  [OK] Generated {len(result.audio_bytes):,} bytes of MP3 audio.")

    # 2. Verify Word Boundaries
    assert len(result.words) > 0, "No word boundaries were collected!"
    print(f"  [OK] Captured {len(result.words)} word boundaries for: '{test_phrase}'")

    print("\n  --- Collected Word Timings ---")
    last_start = -1.0
    for idx, w in enumerate(result.words):
        print(f"    [{idx + 1}] Word: '{w.text:<10}' | Start: {w.start:.3f}s | Duration: {w.duration:.3f}s | End: {w.end:.3f}s")
        assert w.start >= last_start, f"Timestamps must be chronological! {w.start} < {last_start}"
        assert w.duration > 0, f"Duration must be positive! Got {w.duration}"
        assert w.end > w.start, f"End time must be after start time! Got {w.end} <= {w.start}"
        last_start = w.start

    print("  [OK] All word boundaries are chronological, positive, and non-overlapping/valid.")


async def test_metadata_dict():
    print("\n[3/4] Testing serialization into JSON-ready metadata...")
    test_phrase = "Hello world."
    result = await tts_service.generate_speech(test_phrase)
    meta = result.to_metadata_dict()
    assert meta["audio_format"] == "mp3"
    assert "words" in meta
    assert len(meta["words"]) >= 2
    assert "duration_seconds" in meta
    print(f"  [OK] Serialized metadata shape valid: {meta}")


async def test_voices_list():
    print("\n[4/4] Testing voice retrieval...")
    voices = await tts_service.list_available_voices(locale_filter="en-")
    assert len(voices) > 0, "Should have retrieved English voices"
    print(f"  [OK] Successfully retrieved {len(voices)} English voices from Edge TTS.")
    print(f"  [OK] Sample voice: {voices[0]['ShortName']} ({voices[0]['FriendlyName']})")


async def main():
    print("=" * 60)
    print("Running EdgeTTSService Verification Tests")
    print("=" * 60)
    await test_input_validation()
    await test_speech_generation()
    await test_metadata_dict()
    await test_voices_list()
    print("=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
