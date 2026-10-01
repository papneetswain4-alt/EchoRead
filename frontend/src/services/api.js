/**
 * API Service for EchoRead
 * Handles network requests to the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ""
  ? import.meta.env.VITE_API_BASE_URL
  : "/api";

/**
 * Checks backend health status
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect to backend",
    };
  }
}

/**
 * Fetches available Edge TTS voices from backend
 * @param {string} [locale='en-'] - Optional locale prefix filter (e.g. 'en-')
 * @returns {Promise<{ ok: boolean, voices?: Array, error?: string }>}
 */
export async function fetchVoices(locale = "en-") {
  try {
    const url = locale 
      ? `${API_BASE}/tts/voices?locale=${encodeURIComponent(locale)}`
      : `${API_BASE}/tts/voices`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const msg = errJson?.detail?.message || `Failed to fetch voices (HTTP ${response.status})`;
      throw new Error(msg);
    }

    const data = await response.json();
    return { ok: true, voices: data.voices || [], total: data.total || 0 };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load voices list",
      voices: [],
    };
  }
}

/**
 * Requests speech generation from the backend for a single text block
 * @param {Object} params
 * @param {string} params.text - Input text to convert
 * @param {string} [params.voice='en-US-AriaNeural'] - Neural voice identifier
 * @param {string} [params.rate='+0%'] - Speed rate adjustment
 * @param {string} [params.pitch='+0Hz'] - Pitch adjustment
 * @param {string} [params.volume='+0%'] - Volume adjustment
 * @param {AbortSignal} [params.signal] - Optional abort signal for cancellation
 * @returns {Promise<{ ok: boolean, data?: Object, error?: string }>}
 */
export async function generateSpeech({
  text,
  voice = "en-US-AriaNeural",
  rate = "+0%",
  pitch = "+0Hz",
  volume = "+0%",
  signal,
}) {
  try {
    const response = await fetch(`${API_BASE}/tts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
        rate,
        pitch,
        volume,
      }),
      signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = `Generation failed (HTTP ${response.status})`;
      if (data?.detail) {
        if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else if (data.detail.message) {
          errorMessage = data.detail.message;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map(d => d.msg || JSON.stringify(d)).join(", ");
        }
      }
      throw new Error(errorMessage);
    }

    return { ok: true, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, isAborted: true, error: "Synthesis was cancelled." };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to communicate with speech server",
    };
  }
}

