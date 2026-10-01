/**
 * Controller: TTS Controller
 * Handles request validation, input sanitization, and orchestration of speech synthesis
 * and voice catalog requests.
 */

const pythonTTS = require('../services/pythonTTS');
const { AppError } = require('../middleware/errorHandler');

const RATE_REGEX = /^[+-]\d+%$/;
const PITCH_REGEX = /^[+-]\d+Hz$/;
const VOLUME_REGEX = /^[+-]\d+%$/;
const MAX_TEXT_LENGTH = 5000;

/**
 * Validates speech generation request body according to API contract
 */
function validateGenerateRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request parameters.', 422, 'VALIDATION_ERROR', {
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    });
  }

  const { text, voice, rate, pitch, volume } = body;

  // Validate text existence and type
  if (text === undefined || text === null || typeof text !== 'string' || text.length === 0) {
    throw new AppError('Invalid request parameters.', 422, 'VALIDATION_ERROR', {
      errors: [{ field: 'text', message: 'String should have at least 1 characters' }],
    });
  }

  // Validate whitespace-only text (service layer validation -> HTTP 400)
  if (!text.trim()) {
    throw new AppError('Text cannot be empty.', 400, 'INVALID_TTS_INPUT');
  }

  // Validate maximum length (> 5000 characters -> HTTP 422)
  if (text.length > MAX_TEXT_LENGTH) {
    throw new AppError('Invalid request parameters.', 422, 'VALIDATION_ERROR', {
      errors: [{ field: 'text', message: `String should have at most ${MAX_TEXT_LENGTH} characters` }],
    });
  }

  // Validate rate modifier format
  const sanitizedRate = rate || '+0%';
  if (typeof sanitizedRate !== 'string' || !RATE_REGEX.test(sanitizedRate)) {
    throw new AppError('Invalid request parameters.', 422, 'VALIDATION_ERROR', {
      errors: [{ field: 'rate', message: "Rate must match pattern '^[+-]\\d+%$'" }],
    });
  }

  // Validate pitch modifier format
  const sanitizedPitch = pitch || '+0Hz';
  if (typeof sanitizedPitch !== 'string' || !PITCH_REGEX.test(sanitizedPitch)) {
    throw new AppError('Invalid request parameters.', 422, 'VALIDATION_ERROR', {
      errors: [{ field: 'pitch', message: "Pitch must match pattern '^[+-]\\d+Hz$'" }],
    });
  }

  // Validate volume modifier format
  const sanitizedVolume = volume || '+0%';
  if (typeof sanitizedVolume !== 'string' || !VOLUME_REGEX.test(sanitizedVolume)) {
    throw new AppError('Invalid request parameters.', 422, 'VALIDATION_ERROR', {
      errors: [{ field: 'volume', message: "Volume must match pattern '^[+-]\\d+%$'" }],
    });
  }

  // Voice default
  const sanitizedVoice = (typeof voice === 'string' && voice.trim()) ? voice.trim() : 'en-US-AriaNeural';

  return {
    text: text.trim(),
    voice: sanitizedVoice,
    rate: sanitizedRate,
    pitch: sanitizedPitch,
    volume: sanitizedVolume,
  };
}

/**
 * POST /api/tts/generate
 * Synthesizes text into MP3 audio and extracts synchronized word-boundary metadata.
 */
async function generateSpeech(req, res, next) {
  try {
    const validatedParams = validateGenerateRequest(req.body);

    // Support client cancellation if request is aborted / closed
    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    const result = await pythonTTS.generateSpeech({
      ...validatedParams,
      signal: abortController.signal,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/tts/voices
 * Retrieves available Edge TTS neural voices with optional locale filtering.
 */
async function getVoices(req, res, next) {
  try {
    const locale = typeof req.query.locale === 'string' ? req.query.locale.trim() : null;
    const result = await pythonTTS.listVoices(locale);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  generateSpeech,
  getVoices,
};
