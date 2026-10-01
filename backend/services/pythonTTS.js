/**
 * Service: Python TTS Bridge
 * Manages communication between Express and the standalone Python Edge TTS engine.
 * Handles process lifecycle, argument safety, stdin/stdout protocols, concurrency,
 * timeouts, cancellation cleanup, and temp file management.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.PYTHON_SCRIPT_TIMEOUT_MS, 10) || 60000;
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_TTS_JOBS, 10) || 5;
const MAX_PENDING_QUEUE = 20;

const PYTHON_SCRIPT_PATH = path.resolve(__dirname, '../python/tts_engine.py');

let cachedPythonPath = null;
let activeJobs = 0;
const pendingQueue = [];

/**
 * Resolves the path to the Python executable.
 * Prioritizes:
 * 1. Explicit PYTHON_EXECUTABLE environment variable
 * 2. Local venv inside backend/ (Windows Scripts or Linux bin)
 * 3. Local venv in project root
 * 4. System 'python3' or 'python'
 */
function resolvePythonExecutable() {
  if (cachedPythonPath) {
    return cachedPythonPath;
  }

  // 1. Explicit environment variable
  if (process.env.PYTHON_EXECUTABLE && process.env.PYTHON_EXECUTABLE.trim()) {
    const raw = process.env.PYTHON_EXECUTABLE.trim();
    const candidateCwd = path.resolve(process.cwd(), raw);
    const candidateDir = path.resolve(__dirname, '..', raw);
    if (fs.existsSync(candidateCwd)) {
      cachedPythonPath = candidateCwd;
      return cachedPythonPath;
    }
    if (fs.existsSync(candidateDir)) {
      cachedPythonPath = candidateDir;
      return cachedPythonPath;
    }
    // If user provided a system binary name like 'python3', return as-is
    cachedPythonPath = raw;
    return cachedPythonPath;
  }

  // 2. Look for virtualenv in backend/
  const backendVenvWindows = path.resolve(__dirname, '../venv/Scripts/python.exe');
  const backendVenvLinux = path.resolve(__dirname, '../venv/bin/python');
  if (fs.existsSync(backendVenvWindows)) {
    cachedPythonPath = backendVenvWindows;
    return cachedPythonPath;
  }
  if (fs.existsSync(backendVenvLinux)) {
    cachedPythonPath = backendVenvLinux;
    return cachedPythonPath;
  }

  // 3. Look for virtualenv in workspace root
  const rootVenvWindows = path.resolve(__dirname, '../../venv/Scripts/python.exe');
  const rootVenvLinux = path.resolve(__dirname, '../../venv/bin/python');
  if (fs.existsSync(rootVenvWindows)) {
    cachedPythonPath = rootVenvWindows;
    return cachedPythonPath;
  }
  if (fs.existsSync(rootVenvLinux)) {
    cachedPythonPath = rootVenvLinux;
    return cachedPythonPath;
  }

  // 4. Default to standard system binary
  cachedPythonPath = process.platform === 'win32' ? 'python' : 'python3';
  return cachedPythonPath;
}

/**
 * Concurrency helper to control simultaneous Python subprocesses
 */
function acquireJobSlot() {
  return new Promise((resolve, reject) => {
    if (activeJobs < MAX_CONCURRENT_JOBS) {
      activeJobs++;
      return resolve();
    }
    if (pendingQueue.length >= MAX_PENDING_QUEUE) {
      return reject(new AppError('Server is currently busy generating speech. Please try again shortly.', 503, 'SERVICE_BUSY'));
    }
    pendingQueue.push(resolve);
  });
}

function releaseJobSlot() {
  activeJobs = Math.max(0, activeJobs - 1);
  if (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    activeJobs++;
    next();
  }
}

/**
 * Executes the Python TTS script with given action and optional stdin payload
 * @param {Object} options
 * @param {string} options.action - 'generate' or 'voices'
 * @param {string} [options.locale] - optional locale filter
 * @param {Object} [options.payload] - input JSON payload to write to stdin
 * @param {AbortSignal} [options.signal] - optional abort signal for cancellation
 * @returns {Promise<Object>} parsed JSON output from Python script
 */
async function executePythonEngine({ action, locale, payload, signal }) {
  await acquireJobSlot();

  const pythonExec = resolvePythonExecutable();
  const scriptArgs = [PYTHON_SCRIPT_PATH, '--action', action];
  if (locale) {
    scriptArgs.push('--locale', locale);
  }

  let child;
  let stdoutData = '';
  let stderrData = '';
  let timeoutTimer = null;
  let forceKillTimer = null;
  let isSettled = false;

  const cleanup = () => {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (forceKillTimer) clearTimeout(forceKillTimer);
    releaseJobSlot();
  };

  return new Promise((resolve, reject) => {
    // Check if request was already aborted before spawning
    if (signal && signal.aborted) {
      cleanup();
      return reject(new AppError('Speech synthesis request was cancelled.', 499, 'REQUEST_CANCELLED'));
    }

    try {
      child = spawn(pythonExec, scriptArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (spawnErr) {
      cleanup();
      console.error(`[ERROR] Failed to spawn Python process (${pythonExec}):`, spawnErr);
      return reject(new AppError('Could not execute Python runtime for speech synthesis.', 500, 'PYTHON_EXEC_ERROR'));
    }

    // Set timeout
    timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        console.error(`[WARN] Python TTS process exceeded timeout of ${DEFAULT_TIMEOUT_MS}ms. Terminating process...`);
        child.kill('SIGTERM');
        forceKillTimer = setTimeout(() => {
          try { child.kill('SIGKILL'); } catch (_) {}
        }, 2000);
        cleanup();
        reject(new AppError('Speech synthesis operation timed out.', 504, 'TTS_TIMEOUT'));
      }
    }, DEFAULT_TIMEOUT_MS);

    // Handle client abort / disconnect
    if (signal) {
      signal.addEventListener('abort', () => {
        if (!isSettled) {
          isSettled = true;
          child.kill('SIGTERM');
          cleanup();
          reject(new AppError('Speech synthesis request was cancelled.', 499, 'REQUEST_CANCELLED'));
        }
      }, { once: true });
    }

    // Collect standard output
    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    // Collect standard error (logs and tracebacks)
    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    // Handle spawn error (e.g. ENOENT Python not found)
    child.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        console.error(`[ERROR] Subprocess error during Python invocation: ${err.message}`);
        if (err.code === 'ENOENT') {
          reject(new AppError(`Python runtime '${pythonExec}' was not found. Please ensure Python is installed.`, 500, 'PYTHON_NOT_FOUND'));
        } else {
          reject(new AppError('Failed to communicate with Python TTS engine.', 500, 'PYTHON_COMMUNICATION_ERROR'));
        }
      }
    });

    // Handle exit
    child.on('close', (exitCode) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();

      // Log stderr diagnostic if any
      if (stderrData.trim()) {
        const trimmedErr = stderrData.trim();
        if (exitCode !== 0) {
          console.error(`[Python TTS stderr]:\n${trimmedErr}`);
        } else {
          console.log(`[Python TTS info]:\n${trimmedErr}`);
        }
      }

      // Parse JSON from stdout
      let parsedResponse = null;
      try {
        const jsonText = stdoutData.trim();
        if (jsonText) {
          // In case of multiple lines, find the last JSON line
          const lastLine = jsonText.split('\n').filter(l => l.trim().startsWith('{')).pop() || jsonText;
          parsedResponse = JSON.parse(lastLine);
        }
      } catch (jsonErr) {
        console.error('[ERROR] Failed to parse Python stdout JSON:', jsonErr, '\nRaw stdout:', stdoutData);
        return reject(new AppError('Invalid response returned from Python TTS engine.', 500, 'INVALID_ENGINE_RESPONSE'));
      }

      if (!parsedResponse) {
        return reject(new AppError('No response data received from Python TTS engine.', 500, 'EMPTY_ENGINE_RESPONSE'));
      }

      // Check status from Python engine
      if (parsedResponse.status === 'error' || exitCode !== 0) {
        const errType = parsedResponse.error_type || 'INTERNAL_ERROR';
        const errMsg = parsedResponse.message || 'Speech synthesis failed.';

        if (errType === 'INVALID_TTS_INPUT') {
          return reject(new AppError(errMsg, 400, 'INVALID_TTS_INPUT'));
        }
        if (errType === 'VALIDATION_ERROR') {
          return reject(new AppError(errMsg, 422, 'VALIDATION_ERROR'));
        }
        if (errType === 'UPSTREAM_ERROR') {
          return reject(new AppError(
            action === 'voices'
              ? 'Could not retrieve voice catalog from Edge TTS service.'
              : 'Speech synthesis service temporarily unavailable. Please try again.',
            502,
            action === 'voices' ? 'VOICES_FETCH_FAILED' : 'TTS_UPSTREAM_ERROR'
          ));
        }
        return reject(new AppError(errMsg, 500, 'TTS_GENERATION_FAILED'));
      }

      resolve(parsedResponse);
    });

    // Write input payload to child stdin if provided
    if (payload) {
      child.stdin.write(JSON.stringify(payload));
    }
    child.stdin.end();
  });
}

/**
 * Validates that a temporary file path is safe and inside the system temporary directory
 * @param {string} filePath 
 */
function validateSafeTempPath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new AppError('Invalid temporary file path received from engine.', 500, 'SECURITY_ERROR');
  }
  const resolved = path.resolve(filePath);
  const tempDir = path.resolve(os.tmpdir());
  const fileName = path.basename(resolved);

  // Must reside inside system temp directory, start with echoread_, and end with .mp3
  if (!resolved.startsWith(tempDir) || !fileName.startsWith('echoread_') || !fileName.endsWith('.mp3')) {
    throw new AppError('Unauthorized audio file path detected.', 500, 'SECURITY_ERROR');
  }
  return resolved;
}

/**
 * Generates speech audio and word boundary metadata via Python Edge TTS engine.
 * Reads the temporary MP3 file, encodes to base64, cleans up the file, and returns
 * the exact response structure required by the frontend.
 */
async function generateSpeech({ text, voice, rate, pitch, volume, signal }) {
  const result = await executePythonEngine({
    action: 'generate',
    payload: { text, voice, rate, pitch, volume },
    signal,
  });

  const tempFilePath = result.temp_audio_file;
  if (!tempFilePath) {
    throw new AppError('No audio file was produced by speech synthesis.', 500, 'TTS_GENERATION_FAILED');
  }

  const safePath = validateSafeTempPath(tempFilePath);
  let audioBase64 = '';

  try {
    const audioBuffer = await fs.promises.readFile(safePath);
    audioBase64 = audioBuffer.toString('base64');
  } catch (readErr) {
    console.error(`[ERROR] Failed to read generated audio temp file (${safePath}):`, readErr);
    throw new AppError('Failed to read synthesized audio stream.', 500, 'TTS_GENERATION_FAILED');
  } finally {
    // Guaranteed cleanup of temporary MP3 file
    fs.promises.unlink(safePath).catch((unlinkErr) => {
      console.warn(`[WARN] Failed to delete temp audio file (${safePath}):`, unlinkErr.message);
    });
  }

  return {
    audio_format: result.audio_format || 'mp3',
    audio_base64: audioBase64,
    duration_seconds: result.duration_seconds !== undefined ? result.duration_seconds : null,
    word_count: result.word_count || (result.words ? result.words.length : 0),
    words: result.words || [],
  };
}

/**
 * Retrieves available Edge TTS voices, optionally filtered by locale prefix
 */
async function listVoices(localeFilter) {
  const result = await executePythonEngine({
    action: 'voices',
    locale: localeFilter,
  });

  return {
    total: result.total || 0,
    locale_filter: result.locale_filter || null,
    voices: result.voices || [],
  };
}

module.exports = {
  generateSpeech,
  listVoices,
  resolvePythonExecutable,
};
