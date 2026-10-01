"""
API Test Suite for EchoRead FastAPI endpoints.
Tests /api/health, /api/tts/generate, and /api/tts/voices using TestClient with both mocked and live tests.
"""

import base64
import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock

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

from fastapi.testclient import TestClient
from app.main import app
from app.services.edge_tts_service import (
    TTSGenerationResult,
    WordTimingItem,
    TTSUpstreamError,
)

client = TestClient(app)


def test_health_check_endpoint():
    print("[1/8] Testing existing health check endpoint (GET /api/health)...")
    response = client.get("/api/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "ok"
    assert "EchoRead API" in data["app_name"]
    print("  [OK] Health endpoint functioning normally.")


def test_root_endpoint():
    print("\n[2/8] Testing root endpoint (GET /)...")
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "tts_endpoints" in data
    print("  [OK] Root endpoint exposes API discovery info.")


def test_generate_speech_mocked():
    print("\n[3/8] Testing TTS generation (POST /api/tts/generate) with mock service...")
    sample_mp3_bytes = b"ID3\x03\x00\x00\x00\x00\x00\x23FAKE_MP3_AUDIO_STREAM_DATA_BYTES"
    sample_words = [
        WordTimingItem(text="Hello", start=0.100, duration=0.400, end=0.500),
        WordTimingItem(text="world", start=0.510, duration=0.350, end=0.860),
    ]
    mock_result = TTSGenerationResult(
        audio_bytes=sample_mp3_bytes,
        audio_format="mp3",
        words=sample_words,
        duration_seconds=0.860,
    )

    with patch("app.api.routes_tts.tts_service.generate_speech", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_result

        payload = {
            "text": "Hello world",
            "voice": "en-US-AriaNeural",
            "rate": "+0%",
            "volume": "+0%",
            "pitch": "+0Hz"
        }
        response = client.post("/api/tts/generate", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Check response structure
        assert data["audio_format"] == "mp3"
        assert data["duration_seconds"] == 0.860
        assert data["word_count"] == 2
        assert len(data["words"]) == 2

        # Check word timings
        first_word = data["words"][0]
        assert first_word["text"] == "Hello"
        assert first_word["start"] == 0.100
        assert first_word["duration"] == 0.400
        assert first_word["end"] == 0.500

        # Check base64 decoding
        decoded_bytes = base64.b64decode(data["audio_base64"])
        assert decoded_bytes == sample_mp3_bytes

        print("  [OK] Response format, base64 encoding, and word timings are verified.")


def test_empty_text_validation():
    print("\n[4/8] Testing validation on empty and whitespace-only text...")
    # Empty string validation (Pydantic min_length=1)
    res_empty = client.post("/api/tts/generate", json={"text": ""})
    assert res_empty.status_code == 422, f"Expected 422 for empty string, got {res_empty.status_code}"
    print("  [OK] Empty string rejected with HTTP 422 Validation Error.")

    # Whitespace-only string validation (rejected by service validation)
    res_spaces = client.post("/api/tts/generate", json={"text": "   \n\t   "})
    assert res_spaces.status_code == 400, f"Expected 400 for whitespace, got {res_spaces.status_code}"
    assert res_spaces.json()["detail"]["code"] == "INVALID_TTS_INPUT"
    print("  [OK] Whitespace-only string rejected with HTTP 400 Bad Request.")


def test_oversized_text_validation():
    print("\n[5/8] Testing validation on oversized text (>5000 chars)...")
    oversized = "a" * 5001
    response = client.post("/api/tts/generate", json={"text": oversized})
    assert response.status_code == 422, f"Expected 422 for oversized text, got {response.status_code}"
    print("  [OK] Oversized payload rejected with HTTP 422.")


def test_upstream_error_handling():
    print("\n[6/8] Testing handling of Edge TTS upstream failures...")
    with patch("app.api.routes_tts.tts_service.generate_speech", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = TTSUpstreamError("Connection to Microsoft TTS timed out.")

        response = client.post("/api/tts/generate", json={"text": "Valid test phrase"})
        assert response.status_code == 502, f"Expected 502, got {response.status_code}"
        data = response.json()
        assert data["detail"]["code"] == "TTS_UPSTREAM_ERROR"
        # Ensure internal technical traceback is NOT leaked
        assert "timed out" not in data["detail"]["message"]
        print("  [OK] Upstream failures safely return HTTP 502 Bad Gateway with sanitized message.")


def test_voices_endpoint():
    print("\n[7/8] Testing voice listing endpoint (GET /api/tts/voices)...")
    mock_raw_voices = [
        {"Name": "Microsoft Aria", "ShortName": "en-US-AriaNeural", "Gender": "Female", "Locale": "en-US", "FriendlyName": "Aria Online (Natural) - English (US)"},
        {"Name": "Microsoft Guy", "ShortName": "en-US-GuyNeural", "Gender": "Male", "Locale": "en-US", "FriendlyName": "Guy Online (Natural) - English (US)"},
        {"Name": "Microsoft Sonia", "ShortName": "en-GB-SoniaNeural", "Gender": "Female", "Locale": "en-GB", "FriendlyName": "Sonia Online (Natural) - English (UK)"},
    ]

    with patch("app.api.routes_tts.tts_service.list_available_voices", new_callable=AsyncMock) as mock_voices:
        mock_voices.return_value = mock_raw_voices

        # Test listing all
        res_all = client.get("/api/tts/voices")
        assert res_all.status_code == 200
        data_all = res_all.json()
        assert data_all["total"] == 3
        assert data_all["voices"][0]["short_name"] == "en-US-AriaNeural"

        # Test filtering by locale
        mock_voices.return_value = [mock_raw_voices[2]]
        res_filtered = client.get("/api/tts/voices?locale=en-GB")
        assert res_filtered.status_code == 200
        data_filtered = res_filtered.json()
        assert data_filtered["total"] == 1
        assert data_filtered["voices"][0]["short_name"] == "en-GB-SoniaNeural"
        assert data_filtered["locale_filter"] == "en-GB"

        print("  [OK] Voices catalog and locale filtering verified.")


def test_live_tts_generation_integration():
    print("\n[8/8] Testing Live End-to-End TTS synthesis against live endpoint...")
    phrase = "EchoRead API integration test."
    response = client.post("/api/tts/generate", json={"text": phrase, "voice": "en-US-AriaNeural"})
    assert response.status_code == 200, f"Live generation failed: {response.text}"
    data = response.json()

    # Verify base64 audio decodes to valid MP3 bytes
    audio_bytes = base64.b64decode(data["audio_base64"])
    assert len(audio_bytes) > 2000, f"Live audio too small: {len(audio_bytes)} bytes"

    # Verify words
    assert data["word_count"] >= 4, f"Expected at least 4 words, got {data['word_count']}"
    assert data["words"][0]["text"].lower().startswith("echoread")
    print(f"  [OK] Live generation succeeded: {len(audio_bytes):,} MP3 bytes decoded, {data['word_count']} words captured.")


def run_all_tests():
    print("=" * 65)
    print("EchoRead Milestone 3: FastAPI TTS API Test Suite")
    print("=" * 65)
    test_health_check_endpoint()
    test_root_endpoint()
    test_generate_speech_mocked()
    test_empty_text_validation()
    test_oversized_text_validation()
    test_upstream_error_handling()
    test_voices_endpoint()
    test_live_tts_generation_integration()
    print("\n" + "=" * 65)
    print("ALL 8 API TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 65)


if __name__ == "__main__":
    run_all_tests()
