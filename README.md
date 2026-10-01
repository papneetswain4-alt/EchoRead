# EchoRead — AI Text-to-Speech Studio

EchoRead is a responsive, web-based AI Text-to-Speech studio with real-time synchronized word highlighting, built with a playful Doodle-Outline Soft UI aesthetic.

The application features a **Node.js + Express** API backend that orchestrates speech synthesis requests and supervises a dedicated, standalone **Python Edge TTS engine**.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19 (JavaScript), Vite 6, Vanilla CSS design system
- **Backend:** Node.js (>=18), Express 4, CORS, Dotenv
- **TTS Engine:** Python 3.10+ with Microsoft Edge TTS (`edge-tts` v7+)
- **Subprocess Bridge:** Node `child_process.spawn` with atomic stdio JSON protocol and safe OS temp file handling
- **Audio Delivery:** In-memory MP3 generation, Base64 JSON transport, HTML5 Audio API
- **Highlighting Sync:** Real-time $O(\log n)$ binary search mapped to audio playback events

---

## ✨ Core Features

- **Text Input & Word Limit:** Input or paste text up to 500 words (5,000 characters) with real-time word counting and validation.
- **Neural Voice Selection:** Choose from high-quality Edge TTS neural voices across locales (e.g., Aria, Guy, Libby, Sonia).
- **Speech Controls:** Speed rate adjustment (-50% to +100%), pitch adjustment (-20Hz to +20Hz), and volume controls.
- **Audio Playback:** Play, pause, resume, seek forward/backward by 5 seconds, and replay with animated equalizer and volume slider.
- **Synchronized Word Highlighting:** Real-time visual highlighting of words as they are spoken, maintaining sync across pause, seek, and rate adjustments.
- **Click-to-Seek:** Click any word in the read-along view to jump audio playback directly to that word.
- **MP3 Download:** Direct one-click download of the generated MP3 speech file.
- **Live Backend Status & Diagnostics:** Real-time connectivity chip in the header with an interactive popover showing backend health, latency (ms), and a manual recheck trigger.
- **Accessibility & UX:** Responsive layout (desktop, tablet, mobile), keyboard shortcuts (`Space` for Play/Pause, `Ctrl+Enter` to Generate), font size adjuster, and reduced-motion support.

---

## 📁 Project Structure

```text
EchoRead/
├── architecture.md           # Technical specification & architecture
├── README.md                 # Project documentation & setup guide
├── .gitignore                # Top-level gitignore rules
│
├── backend/                  # Node.js Express backend
│   ├── server.js             # Express application entry point
│   ├── package.json          # Node dependencies (express, cors, dotenv)
│   ├── .env.example          # Environment variables template
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
│   │   └── errorHandler.js   # Centralized JSON error handling
│   │
│   ├── python/
│   │   ├── tts_engine.py     # Standalone Edge TTS Python engine
│   │   └── requirements.txt  # Python dependencies (edge-tts)
│   │
│   ├── scripts/
│   │   └── setup-python.sh   # Automated Python setup for Linux/Render
│   │
│   └── tests/
│       ├── api.test.js       # Node Express API test suite
│       └── test_tts_engine.py# Python engine verification tests
│
└── frontend/                 # React + Vite frontend
    ├── .env.example          # Frontend environment variables template
    ├── index.html            # Main HTML document with web fonts
    ├── package.json          # Frontend dependencies & scripts
    ├── vite.config.js        # Vite configuration & dev proxy
    │
    ├── src/
    │   ├── components/       # Reusable React components
    │   ├── services/
    │   │   └── api.js        # Normalized backend API client
    │   ├── utils/
    │   │   └── findActiveWord.js # O(log n) binary search for audio-to-word sync
    │   ├── App.jsx           # Application shell & state coordination
    │   ├── index.css         # Doodle-Outline Soft UI design system
    │   └── main.jsx          # React DOM entrypoint
    │
    └── tests/
        └── test_highlight_sync.js # Synchronized word highlighting test
```

---

## 📋 Prerequisites

Ensure the following runtimes are installed on your machine:

- **Node.js:** 18+ (tested with Node.js 24)
- **Python:** 3.10+ (tested with Python 3.13)
- **Package Managers:** `npm` (Node) and `pip` (Python)

---

## 📦 Local Installation & Setup

Clone the repository and enter the project folder:

```bash
git clone https://github.com/papneetswain4-alt/EchoRead.git
cd EchoRead
```

### 1. Backend Setup (Node.js + Python)

#### Step 1A: Install Node.js Dependencies

```bash
cd backend
npm install
```

#### Step 1B: Set Up Python Virtual Environment

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r python/requirements.txt
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r python/requirements.txt
```

#### Step 1C: Configure Backend Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=8000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
PYTHON_EXECUTABLE=
PYTHON_SCRIPT_TIMEOUT_MS=60000
MAX_CONCURRENT_TTS_JOBS=5
```
*(Leave `PYTHON_EXECUTABLE` blank to let Express auto-discover `venv/Scripts/python.exe` or `venv/bin/python`.)*

### 2. Frontend Setup (React + Vite)

```bash
cd ../frontend
npm install
```

Copy `.env.example` to `.env` (optional for development):
```bash
cp .env.example .env
```
*(In development, leave `VITE_API_BASE_URL` empty to automatically route through Vite's built-in proxy to `http://127.0.0.1:8000`.)*

---

## 🚀 Running the Project Locally

### Terminal 1: Start Express Backend

```bash
cd backend
npm run dev
```

- API Server: `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`
- Voice catalog: `http://localhost:8000/api/tts/voices?locale=en-`
- Speech generation: `POST http://localhost:8000/api/tts/generate`

### Terminal 2: Start Vite Frontend

```bash
cd frontend
npm run dev
```

- Web Application: `http://localhost:5173`

---

## 🧪 Automated Testing

### 1. Backend API & Integration Tests
Run the comprehensive Node.js native test suite:
```bash
cd backend
npm test
```
*Validates health probe, voice catalog, input validation (empty text, whitespace, oversized strings, malformed modifiers), live audio synthesis, client cancellation, and 404 handling.*

### 2. Standalone Python TTS Engine Tests
Verify the Python engine independently:
```bash
cd backend
python tests/test_tts_engine.py
```
*Tests direct `edge-tts` voice query, MP3 generation, and boundary timing calculation.*

### 3. Frontend Word-Synchronization Tests
Verify the binary search interval mapping and highlight logic:
```bash
cd frontend
node tests/test_highlight_sync.js
```

---

## ☁️ Deployment Guide

### A. Backend Deployment on Render (Without Docker)

The backend runs as a native Node.js web service on Render without needing Docker or a Dockerfile. Render's standard Linux build image provides both Node.js and Python 3 out of the box.

#### Option 1: Automatic Blueprint Deployment (Recommended)
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** and select **Blueprint**.
2. Connect your `EchoRead` repository. Render will automatically detect the [`render.yaml`](file:///d:/EchoRead/render.yaml) file at the root.
3. Review the pre-configured parameters (Root Directory: `backend`, Runtime: `Node`, Build Command, Health Check).
4. Fill in `FRONTEND_ORIGIN` with your Vercel deployment URL (or leave default and update after frontend is deployed).
5. Click **Apply**.

#### Option 2: Manual Web Service Setup
1. Create a **New Web Service** on [Render](https://dashboard.render.com).
2. Connect your EchoRead repository.
3. Configure service settings:
   - **Name:** `echoread-backend` (or your preferred name)
   - **Region:** Choose the region nearest to your audience
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && bash scripts/setup-python.sh
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
4. Set **Environment Variables** in Render Dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render binds this automatically)
   - `FRONTEND_ORIGIN`: `https://<your-frontend>.vercel.app`
   - `PYTHON_EXECUTABLE`: `./venv/bin/python`
   - `PYTHON_SCRIPT_TIMEOUT_MS`: `60000`
   - `MAX_CONCURRENT_TTS_JOBS`: `5`
5. Set **Health Check Path:**
   - `/api/health`
6. Click **Create Web Service**. Once deployed, copy your backend URL:
   `https://echoread-backend.onrender.com`

---

### B. Frontend Deployment on Vercel

1. Create a **New Project** on [Vercel](https://vercel.com).
2. Connect your EchoRead repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
4. Set **Build and Output Settings:**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Configure **Environment Variables** in Vercel:
   - `VITE_API_BASE_URL`: `https://<your-render-backend-name>.onrender.com`
     *(The frontend automatically normalizes the base URL, appending `/api` if not present.)*
6. Click **Deploy**.
7. Once deployed, copy your Vercel URL (e.g., `https://echoread-studio.vercel.app`) and update the `FRONTEND_ORIGIN` variable in your Render backend settings.

> **Important**: In Vite, environment variables prefixed with `VITE_` are injected at build time. If you update `VITE_API_BASE_URL` in Vercel, you must trigger a **Redeploy** for the change to take effect.

---

### C. Live Deployment Verification & Connection

Once both services are deployed:

1. **Verify Backend Health:**
   Open `https://<your-backend>.onrender.com/api/health` in your browser.
   Expected response:
   ```json
   {
     "status": "ok",
     "app_name": "EchoRead API",
     "version": "0.1.0",
     "details": {
       "environment": "production",
       "tts_engine": "edge-tts (Python engine)"
     }
   }
   ```
2. **Verify Voices Catalog:**
   Open `https://<your-backend>.onrender.com/api/tts/voices?locale=en-` in your browser.
   Confirm that a JSON array of Edge TTS neural voices is returned.
3. **Verify Frontend Connectivity:**
   Open your live Vercel URL (`https://<your-frontend>.vercel.app`).
   - Check the connectivity pill in the top-right header: it should display 🟢 **Live**.
   - Click the chip to open **System Diagnostics**: verify latency and connection status.
   - Enter text, choose a voice, click **Generate Audio**, and test playback and word highlighting.

---

### ⚠️ Known Limitations & Render Free-Tier Behavior

1. **Free-Tier Inactivity Sleep (Cold Starts):**
   - On Render's free tier, web services spin down after 15 minutes of inactivity.
   - The first request to a sleeping instance may take 30–60 seconds to respond as the container boots up and starts the Node.js server.
   - EchoRead's frontend handles this gracefully: if the backend is waking up, the status chip shows "Checking" or "Offline" with a **Retry / Recheck Health** button. Once the backend boots, subsequent speech generation requests complete in 1–2 seconds.
2. **Edge TTS Connectivity:**
   - Microsoft Edge TTS requires outbound internet connectivity to Microsoft's Speech servers (`wss://speech.platform.bing.com`). Render web services provide outbound internet access by default.
3. **Memory Limits:**
   - Render's free instance provides 512 MB RAM. EchoRead is optimized to stream audio into memory and temporary files without keeping large buffers resident. `MAX_CONCURRENT_TTS_JOBS=5` ensures memory usage stays well below the 512 MB ceiling.

---

## 🔧 Troubleshooting Guide

### 1. "Python runtime was not found" or `ENOENT`
- Ensure Python 3.10+ is installed and available on your system `PATH`.
- Check if your virtual environment is created inside `backend/venv`.
- Set `PYTHON_EXECUTABLE` in `backend/.env` to the absolute path of your Python binary (e.g. `C:\Python313\python.exe` or `/usr/bin/python3`).

### 2. "edge-tts package is not installed"
- Ensure you activated the virtual environment before installing dependencies:
  `pip install -r backend/python/requirements.txt`
- Verify installation with:
  `python -c "import edge_tts; print(edge_tts.__file__)"`

### 3. Edge TTS Upstream Timeout / Network Error (502 Bad Gateway)
- Microsoft Edge TTS requires an outbound internet connection to Microsoft's speech synthesis servers.
- Ensure your network or firewall allows outbound WebSocket connections (`wss://speech.platform.bing.com`).

### 4. CORS Errors in Browser
- Check that `FRONTEND_ORIGIN` in `backend/.env` (or Render Environment Variables) matches your frontend URL exactly (including protocol and port, without a trailing slash).
- For local development, multiple origins can be comma-separated:
  `FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000`

### 5. Frontend Displays "Server Unreachable"
- Confirm that the Express server is running on the expected port (default: 8000).
- Open `http://localhost:8000/api/health` directly in your browser. It should return `{"status":"ok", ...}`.
- Click the **↻ Recheck Health** button in the header diagnostics popover.
