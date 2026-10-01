# EchoRead — System Architecture

## 1. Project Overview

EchoRead is a web-based read-along text-to-speech application. A user enters or pastes text, selects a voice and speech settings, and generates spoken audio. While the audio plays, the application highlights the corresponding word in the displayed text. Users can pause, resume, seek, replay, and download generated audio.

The backend is built with **Node.js and Express** as the primary API server, communicating with a specialized **Python Edge TTS Engine** (`edge-tts`) via a subprocess JSON protocol over stdio.

---

## 2. Goals & Non-Goals

### Goals
- Convert user-provided text into natural-sounding speech using Microsoft Edge TTS.
- Capture word-boundary timing metadata during speech generation.
- Keep highlighted text synchronized with audio playback, including pause, resume, and seeking.
- Deliver an expressive, responsive React interface.
- Maintain a clean separation between the Express API server and the Python TTS engine.
- Prevent unbounded subprocess execution, enforce request timeouts, and handle cancellations gracefully.
- Deploy cleanly on Render (backend without Docker) and Vercel (frontend).

### Out of Scope
- Speech-to-text / microphone transcription.
- User accounts, authentication, or cloud-saved libraries.
- Voice cloning or custom voice training.
- Offline speech generation (Edge TTS requires network connectivity).
- Docker or containerized deployment.

---

## 3. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19 + JavaScript | User interface and application state |
| Frontend Tooling | Vite 6 | Development server, dev proxy, and production bundle |
| Styling | Vanilla CSS Design System | Doodle-Outline Soft UI aesthetic and responsive layout |
| Primary Backend | Node.js (>=18) + Express | HTTP routing, CORS, input validation, process supervision, error formatting |
| TTS Engine | Python 3.10+ + `edge-tts` (v7+) | Microsoft Edge TTS streaming, 100-ns tick conversion, WordBoundary collection |
| Process Communication | Node Child Process (`spawn`) | Stdio JSON protocol, stdin streaming, safe temp file audio exchange |
| Audio Playback | Browser HTML5 Audio API | Play, pause, seek, track current playback time |
| Data Exchange | JSON + Base64 MP3 | Word-level timing metadata and generated audio delivered atomically |

---

## 4. High-Level Architecture

```mermaid
flowchart TD
    U[User] --> R[React 19 Frontend]
    R -->|POST /api/tts/generate| N[Express Server (server.js)]
    N --> C[TTS Controller (ttsController.js)]
    C -->|Validate params| S[Python TTS Service (pythonTTS.js)]
    S -->|spawn subprocess with JSON stdin| P[Python TTS Engine (tts_engine.py)]
    P -->|Edge TTS WebSocket| E[Microsoft Edge TTS Service]
    E -->|Audio Chunks + WordBoundary Events| P
    P -->|Write MP3 to secure temp file| TMP[(Temp MP3 File)]
    P -->|Emit JSON metadata on stdout| S
    S -->|Read temp file + Base64 encode| S
    S -->|Unlink temp file| TMP
    S -->|Structured response| C
    C -->|JSON payload: audio_base64 + words| R
    R --> A[HTML5 Audio Player]
    R --> H[Word Highlight Renderer]
    A -->|currentTime updates| SYNC[O(log n) Sync Engine]
    SYNC --> H
```

---

## 5. Node-to-Python Communication Contract

The Node.js Express server invokes the Python engine via `child_process.spawn`:

### 1. Invocation Safety
- Command arguments are passed as discrete array elements: `[pythonExec, ttsEnginePath, '--action', action]`.
- User text is **never** interpolated into shell strings, eliminating shell injection vulnerabilities.
- Python logs all diagnostic messages to `sys.stderr`, leaving `sys.stdout` exclusively for valid JSON.

### 2. Actions Supported
- **`--action voices [--locale <prefix>]`**:
  - Fetches voice catalog from Edge TTS.
  - Returns `{"status": "ok", "total": N, "locale_filter": "...", "voices": [...]}`.
- **`--action generate`**:
  - Reads request JSON from `stdin`: `{ text, voice, rate, pitch, volume }`.
  - Performs validation (text length <= 5000, non-empty, parameter patterns).
  - Streams audio & `WordBoundary` events.
  - Writes binary MP3 audio to a safe OS temporary file (`echoread_<uuid>.mp3`).
  - Emits JSON on `stdout`:
    ```json
    {
      "status": "ok",
      "temp_audio_file": "/tmp/echoread_abc123.mp3",
      "audio_format": "mp3",
      "duration_seconds": 2.45,
      "word_count": 4,
      "words": [
        { "text": "EchoRead", "start": 0.1, "duration": 0.5, "end": 0.6 }
      ]
    }
    ```

### 3. Audio Hand-off & Temporary File Management
1. Python creates a uniquely named temporary MP3 file in `tempfile.gettempdir()`.
2. Node.js validates that the returned path resides strictly inside the system temp directory and matches the `echoread_*.mp3` pattern.
3. Node.js reads the MP3 bytes into a buffer, encodes to Base64, and **unlinks** the temporary file immediately in a `finally` block.
4. On failure, timeout, or cancellation, cleanup routines ensure no abandoned temporary files remain.

### 4. Process Supervision & Concurrency
- **Concurrency Limiting**: Subprocess execution is guarded by an internal semaphore (`MAX_CONCURRENT_TTS_JOBS=5`).
- **Timeouts**: Processes exceeding `PYTHON_SCRIPT_TIMEOUT_MS` (default: 60s) receive `SIGTERM` followed by `SIGKILL`.
- **Cancellation**: If a client terminates their HTTP connection before completion, Node aborts the process immediately.

---

## 6. Directory Structure

```text
EchoRead/
├── architecture.md           # System architecture documentation
├── README.md                 # Project setup and deployment guide
├── .gitignore                # Git ignore rules for Python & Node
│
├── backend/                  # Node.js + Express backend
│   ├── server.js             # Express app entry point & server bootstrap
│   ├── package.json          # Node dependencies (express, cors, dotenv)
│   ├── .env.example          # Environment variable template
│   ├── .gitignore            # Backend gitignore rules
│   │
│   ├── routes/
│   │   ├── health.js         # GET /api/health
│   │   └── tts.js            # POST /api/tts/generate, GET /api/tts/voices
│   │
│   ├── controllers/
│   │   └── ttsController.js  # Validation and request orchestration
│   │
│   ├── services/
│   │   └── pythonTTS.js      # Child process manager & audio file bridge
│   │
│   ├── middleware/
│   │   └── errorHandler.js   # Consistent JSON error handler & 404 handler
│   │
│   ├── python/
│   │   ├── tts_engine.py     # Standalone Edge TTS engine
│   │   └── requirements.txt  # Python requirements (edge-tts>=7.0.0)
│   │
│   ├── scripts/
│   │   └── setup-python.sh   # Bash setup script for Linux/Render environments
│   │
│   └── tests/
│       ├── api.test.js       # Express endpoint and integration tests
│       └── test_tts_engine.py# Standalone Python engine tests
│
└── frontend/                 # React 19 + Vite frontend
    ├── .env.example          # Frontend environment variables template
    ├── index.html            # Main HTML with Google Web Fonts
    ├── package.json          # Frontend dependencies
    ├── vite.config.js        # Vite configuration with dev proxy
    │
    ├── src/
    │   ├── components/       # UI components (Header, TextEditor, AudioPlayer, etc.)
    │   ├── services/
    │   │   └── api.js        # Normalized HTTP API client
    │   ├── utils/
    │   │   └── findActiveWord.js # O(log n) binary search word sync
    │   ├── App.jsx           # App state coordination
    │   ├── index.css         # Doodle-Outline Soft UI stylesheet
    │   └── main.jsx          # React DOM entry
    │
    └── tests/
        └── test_highlight_sync.js # Synchronized word highlighting test
```

---

## 7. API Specification

### `GET /`
- Description: Root API discovery metadata.
- Response `200 OK`:
  ```json
  {
    "app": "EchoRead API",
    "version": "0.1.0",
    "status": "online",
    "documentation": "/docs",
    "health_check": "/api/health",
    "tts_endpoints": {
      "generate": "/api/tts/generate",
      "voices": "/api/tts/voices"
    }
  }
  ```

### `GET /api/health`
- Description: Service readiness probe for monitoring and frontend diagnostics.
- Response `200 OK`:
  ```json
  {
    "status": "ok",
    "app_name": "EchoRead API",
    "version": "0.1.0",
    "details": {
      "environment": "development",
      "tts_engine": "edge-tts (Python engine)"
    }
  }
  ```

### `GET /api/tts/voices`
- Description: Retrieves available Edge TTS neural voices.
- Query Parameters: `locale` (optional, e.g., `en-GB`, `en-US`, `es-`).
- Response `200 OK`:
  ```json
  {
    "total": 5,
    "locale_filter": "en-GB",
    "voices": [
      {
        "name": "Microsoft Server Speech Text to Speech Voice (en-GB, LibbyNeural)",
        "short_name": "en-GB-LibbyNeural",
        "gender": "Female",
        "locale": "en-GB",
        "friendly_name": "Microsoft Libby Online (Natural) - English (United Kingdom)"
      }
    ]
  }
  ```

### `POST /api/tts/generate`
- Description: Synthesizes text into MP3 audio with word timestamps.
- Request Body:
  ```json
  {
    "text": "Hello! Welcome to EchoRead.",
    "voice": "en-US-AriaNeural",
    "rate": "+0%",
    "pitch": "+0Hz",
    "volume": "+0%"
  }
  ```
- Response `200 OK`:
  ```json
  {
    "audio_format": "mp3",
    "audio_base64": "<base64_encoded_audio>",
    "duration_seconds": 1.85,
    "word_count": 4,
    "words": [
      { "text": "Hello!", "start": 0.1, "duration": 0.4, "end": 0.5 },
      { "text": "Welcome", "start": 0.52, "duration": 0.35, "end": 0.87 }
    ]
  }
  ```
- Error Responses:
  - `400 Bad Request`: `{"detail": {"code": "INVALID_TTS_INPUT", "message": "Text cannot be empty."}}`
  - `422 Unprocessable Entity`: `{"detail": {"code": "VALIDATION_ERROR", "message": "Invalid request parameters."}}`
  - `502 Bad Gateway`: `{"detail": {"code": "TTS_UPSTREAM_ERROR", "message": "Speech synthesis service temporarily unavailable."}}`
  - `500 Internal Server Error`: `{"detail": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred."}}`
