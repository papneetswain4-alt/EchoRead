# EchoRead — AI Text-to-Speech Studio

EchoRead is a lightweight, responsive web-based AI Text-to-Speech studio with synchronized real-time word highlighting, built with a playful Doodle-Outline Soft UI aesthetic.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19 (JavaScript), Vite, Vanilla CSS design system
- **Backend:** Python 3.13, FastAPI, Uvicorn, Pydantic v2
- **TTS Engine:** Microsoft Edge TTS (`edge-tts` v7+) with `WordBoundary` streaming
- **Audio Delivery:** In-memory MP3 generation, Base64 JSON transport, HTML5 Audio API
- **Scope:** Up to 500 words per speech generation request

---

## ✨ Core Features

- **Text Input & Word Limit:** Input or paste text up to 500 words with live word count tracking and validation warnings.
- **Neural Voice Selection:** Choose from natural Edge TTS voices (e.g., Aria, Guy, Jenny).
- **Speech Controls:** Real-time speed rate adjustment (-50% to +100%) and pitch adjustment (-20Hz to +20Hz).
- **Audio Playback:** Play, pause, resume, seek forward/backward by 5 seconds, and replay with animated equalizer and volume slider.
- **Synchronized Word Highlighting:** Real-time, word-by-word visual highlighting synchronized with audio playback using $O(\log n)$ binary search.
- **Click-to-Seek:** Click any word in the read-along view to jump audio playback directly to that word.
- **MP3 Download:** Direct one-click download of the generated MP3 speech file.
- **Live Backend Status & Diagnostics:** Real-time connectivity chip in the header with an interactive popover showing FastAPI health, latency (ms), and a manual recheck trigger.
- **How It Works Guide:** Non-technical 4-step pipeline guide, 6-second animated read-along demo, and quick-tip cards.
- **Accessibility & UX:** Responsive layout (desktop, tablet, mobile), keyboard shortcuts (`Space` for Play/Pause, `Ctrl+Enter` to Generate), font size adjuster, and reduced-motion support.

---

## 📋 Prerequisites

Ensure the following runtimes are installed on your system:

- **Python:** 3.10+ (tested with Python 3.13)
- **Node.js:** 18+ (tested with Node.js 24)
- **Package Managers:** `pip` (Python) and `npm` (Node)

---

## 📦 Installation & Setup

Clone the repository and enter the project folder:

```bash
git clone https://github.com/papneetswain4-alt/EchoRead.git
cd EchoRead
```

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# Install required Python dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup (React + Vite)

```bash
cd ../frontend

# Install Node dependencies
npm install
```

---

## 🚀 Running the Project Locally

### Terminal 1: Start the Backend (FastAPI)

```bash
cd backend
# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# Start the Uvicorn server
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`
- Generate speech: `POST http://127.0.0.1:8000/api/tts/generate`
- List voices: `GET http://127.0.0.1:8000/api/tts/voices?locale=en-`

### Terminal 2: Start the Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

- Web Application: `http://localhost:5173`

---

## 🩺 Backend Status Indicator & Diagnostics

The navigation header includes a live backend status chip:
- 🟢 **Live**: FastAPI backend is online and reachable.
- 🔴 **Offline**: Backend service is unreachable (audio generation will be disabled with a helpful prompt).
- 🟡 **Checking**: Actively pinging the `/api/health` endpoint.

Clicking the status chip opens the **System Diagnostics Popover**, displaying:
1. **FastAPI Status:** HTTP status code confirmation.
2. **Round-Trip Latency:** Measured ping time in milliseconds.
3. **App & Version:** Backend build metadata.
4. **Recheck Health Button:** Allows testing reconnection without reloading the page.

---

## 🧪 Automated Testing

### Backend Verification Tests (from `backend/` directory):
```bash
cd backend
# With virtual environment activated:
python tests/test_edge_tts.py
python tests/test_api_tts.py
```
*Tests input validation, tick-to-second timestamp conversion, mock API responses, and live end-to-end synthesis.*

### Frontend Synchronization Tests (from project root):
```bash
node frontend/tests/test_highlight_sync.js
```
*Verifies interval mapping, punctuation tolerance, playback states, scrubbing forward/backward, and replay.*

---

## 🏗️ Production Build

To test or compile the production frontend bundle:

```bash
cd frontend
npm run build
```

Optimized static assets will be output to `frontend/dist/`.

---

## 📁 Project Structure

```text
EchoRead/
├── architecture.md           # Architecture and technical specification
├── README.md                 # Project documentation & quickstart
├── .gitignore                # Git ignore rules for Python & Node
│
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # API route definitions
│   │   │   ├── routes_health.py # Health check endpoint (/api/health)
│   │   │   └── routes_tts.py    # TTS endpoints (/api/tts/generate, /api/tts/voices)
│   │   ├── core/             # Configuration & constants
│   │   │   └── config.py     # CORS origins, settings
│   │   ├── schemas/          # Pydantic validation schemas
│   │   │   ├── health.py     # Health response model
│   │   │   └── tts.py        # TTS request, response, and voice schemas
│   │   ├── services/         # Business logic
│   │   │   └── edge_tts_service.py # Edge TTS streaming & 100-ns tick converter
│   │   └── main.py           # FastAPI application entrypoint & exception handlers
│   ├── tests/                # Automated verification suites
│   │   ├── test_edge_tts.py  # Edge TTS service unit test
│   │   └── test_api_tts.py   # FastAPI endpoint test suite
│   └── requirements.txt      # Python dependencies (fastapi, uvicorn, edge-tts, pydantic, httpx)
│
└── frontend/                 # React + Vite frontend
    ├── .env.example          # Environment variable template
    ├── index.html            # Main HTML document with web fonts
    ├── package.json          # Node dependencies & scripts
    ├── vite.config.js        # Vite configuration & dev proxy
    ├── tests/
    │   └── test_highlight_sync.js # Synchronized word highlighting & playback test
    └── src/
        ├── components/       # Reusable React components
        │   ├── AudioPlayer.jsx   # Audio player with seek, replay, volume, and MP3 download
        │   ├── BackendStatus.jsx # Diagnostics card component
        │   ├── Header.jsx        # 3-zone floating pill navbar with scroll-spy
        │   ├── HowItWorks.jsx    # 4-step pipeline guide & animated read-along demo
        │   ├── MiniPlayer.jsx    # Floating mini-player for quick control
        │   ├── MobileTabBar.jsx  # Compact mobile workflow bar
        │   ├── ReadAlongText.jsx # Real-time synchronized word highlighting & click-to-seek
        │   ├── StatusPopover.jsx # Popover diagnostics anchored to header status chip
        │   ├── TextEditor.jsx    # Text input (up to 500 words) & generate controls
        │   └── VoiceSettings.jsx # AI voice, speed, and pitch selectors
        ├── services/
        │   └── api.js        # Health, voice listing, and speech generation client
        ├── utils/
        │   └── findActiveWord.js # O(log n) binary search for audio-to-word sync
        ├── App.jsx           # Application shell & state coordination
        ├── index.css         # Doodle-Outline Soft UI design system
        └── main.jsx          # React DOM entrypoint
```
