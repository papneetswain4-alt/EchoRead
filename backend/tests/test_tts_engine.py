"""
Test suite for EchoRead standalone Python TTS engine.
Tests voice listing, speech generation, and input validation without FastAPI.
"""

import json
import subprocess
import sys
from pathlib import Path

# Paths
backend_dir = Path(__file__).resolve().parent.parent
python_script = backend_dir / "python" / "tts_engine.py"

# Resolve python interpreter
venv_python = backend_dir / "venv" / ("Scripts" if sys.platform == "win32" else "bin") / ("python.exe" if sys.platform == "win32" else "python")
python_bin = str(venv_python) if venv_python.exists() else sys.executable


def run_engine(action: str, stdin_data: str = None, locale: str = None):
    cmd = [python_bin, str(python_script), "--action", action]
    if locale:
        cmd.extend(["--locale", locale])

    proc = subprocess.run(
        cmd,
        input=stdin_data,
        text=True,
        capture_output=True,
        encoding="utf-8",
    )
    return proc


def test_voices_listing():
    print("[1/4] Testing python tts_engine voices listing...")
    res = run_engine("voices", locale="en-GB")
    assert res.returncode == 0, f"Voices listing failed: {res.stderr}"
    data = json.loads(res.stdout)
    assert data["status"] == "ok"
    assert data["total"] >= 1
    assert data["locale_filter"] == "en-GB"
    print(f"  [OK] Successfully retrieved {data['total']} voices.")


def test_generate_speech():
    print("\n[2/4] Testing python tts_engine speech generation...")
    payload = json.dumps({
        "text": "EchoRead Python engine verification.",
        "voice": "en-US-AriaNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
        "volume": "+0%",
    })
    res = run_engine("generate", stdin_data=payload)
    assert res.returncode == 0, f"Generate failed: {res.stderr}"
    data = json.loads(res.stdout)
    assert data["status"] == "ok"
    assert data["audio_format"] == "mp3"
    assert Path(data["temp_audio_file"]).exists()
    assert data["word_count"] >= 4
    # Clean up temp file
    Path(data["temp_audio_file"]).unlink(missing_ok=True)
    print(f"  [OK] Successfully generated MP3 audio with {data['word_count']} words.")


def test_empty_validation():
    print("\n[3/4] Testing python tts_engine empty/whitespace validation...")
    payload = json.dumps({"text": "   "})
    res = run_engine("generate", stdin_data=payload)
    assert res.returncode != 0
    data = json.loads(res.stdout)
    assert data["status"] == "error"
    assert data["error_type"] == "INVALID_TTS_INPUT"
    print("  [OK] Whitespace correctly rejected.")


def test_oversized_validation():
    print("\n[4/4] Testing python tts_engine oversized text validation...")
    payload = json.dumps({"text": "a" * 5001})
    res = run_engine("generate", stdin_data=payload)
    assert res.returncode != 0
    data = json.loads(res.stdout)
    assert data["status"] == "error"
    assert data["error_type"] == "VALIDATION_ERROR"
    print("  [OK] Oversized payload correctly rejected.")


if __name__ == "__main__":
    print("=" * 60)
    print("Running Standalone Python TTS Engine Verification Tests")
    print("=" * 60)
    test_voices_listing()
    test_generate_speech()
    test_empty_validation()
    test_oversized_validation()
    print("\n" + "=" * 60)
    print("ALL PYTHON TTS ENGINE TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)
