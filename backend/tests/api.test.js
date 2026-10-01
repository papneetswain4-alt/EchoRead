/**
 * EchoRead Express Backend Test Suite
 * Tests health, root, voice catalog, input validation, and live TTS generation.
 * Uses Node.js native test runner and assert module.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    // Listen on an ephemeral port to avoid port conflicts during test runs
    server = http.createServer(app).listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Started test server on ${baseUrl}`);
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Test Server] Stopped test server.');
        resolve();
      });
    } else {
      resolve();
    }
  });
});

describe('EchoRead Express API Tests', () => {

  test('[1/8] GET /api/health returns 200 and expected schema', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.match(data.app_name, /EchoRead API/);
    assert.equal(typeof data.version, 'string');
    assert.equal(typeof data.details, 'object');
    console.log('  [OK] Health endpoint functioning normally.');
  });

  test('[2/8] GET / returns root discovery metadata', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'online');
    assert.equal(data.app, 'EchoRead API');
    assert.ok(data.tts_endpoints);
    assert.equal(data.tts_endpoints.generate, '/api/tts/generate');
    assert.equal(data.tts_endpoints.voices, '/api/tts/voices');
    console.log('  [OK] Root endpoint exposes API discovery info.');
  });

  test('[3/8] GET /api/tts/voices returns available voice catalog', async () => {
    const res = await fetch(`${baseUrl}/api/tts/voices?locale=en-GB`);
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.total >= 1, `Expected at least 1 en-GB voice, got ${data.total}`);
    assert.equal(data.locale_filter, 'en-GB');
    assert.ok(Array.isArray(data.voices));

    const sample = data.voices[0];
    assert.ok(sample.short_name);
    assert.ok(sample.short_name.startsWith('en-GB'));
    assert.ok(sample.friendly_name);
    console.log(`  [OK] Voices catalog returned ${data.total} en-GB voices.`);
  });

  test('[4/8] Validation: empty string returns HTTP 422', async () => {
    const res = await fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });
    assert.equal(res.status, 422, `Expected 422 for empty string, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.detail.code, 'VALIDATION_ERROR');
    console.log('  [OK] Empty string correctly rejected with HTTP 422.');
  });

  test('[5/8] Validation: whitespace-only string returns HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   \n\t   ' }),
    });
    assert.equal(res.status, 400, `Expected 400 for whitespace, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.detail.code, 'INVALID_TTS_INPUT');
    assert.equal(data.detail.message, 'Text cannot be empty.');
    console.log('  [OK] Whitespace-only string rejected with HTTP 400.');
  });

  test('[6/8] Validation: oversized text (>5000 chars) returns HTTP 422', async () => {
    const oversized = 'a'.repeat(5001);
    const res = await fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: oversized }),
    });
    assert.equal(res.status, 422, `Expected 422 for oversized text, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.detail.code, 'VALIDATION_ERROR');
    console.log('  [OK] Oversized payload rejected with HTTP 422.');
  });

  test('[7/8] Validation: invalid modifier format returns HTTP 422', async () => {
    const res = await fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Valid test text', rate: 'fast' }),
    });
    assert.equal(res.status, 422, `Expected 422 for bad rate format, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.detail.code, 'VALIDATION_ERROR');
    console.log('  [OK] Invalid rate format rejected with HTTP 422.');
  });

  test('[8/8] Live speech generation: synthesizes audio with word timestamps', async () => {
    const phrase = 'EchoRead Express API integration test.';
    const res = await fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: phrase,
        voice: 'en-US-AriaNeural',
        rate: '+0%',
        pitch: '+0Hz',
        volume: '+0%',
      }),
    });

    assert.equal(res.status, 200, `Live generation failed: status ${res.status}`);
    const data = await res.json();

    assert.equal(data.audio_format, 'mp3');
    assert.ok(data.audio_base64, 'Missing audio_base64 in response');
    const audioBytes = Buffer.from(data.audio_base64, 'base64');
    assert.ok(audioBytes.length > 2000, `Audio too small: ${audioBytes.length} bytes`);

    assert.ok(data.word_count >= 4, `Expected at least 4 words, got ${data.word_count}`);
    assert.ok(Array.isArray(data.words));
    assert.equal(data.words.length, data.word_count);

    // Verify first word boundary structure
    const firstWord = data.words[0];
    assert.ok(firstWord.text.toLowerCase().startsWith('echoread'));
    assert.equal(typeof firstWord.start, 'number');
    assert.equal(typeof firstWord.duration, 'number');
    assert.equal(typeof firstWord.end, 'number');
    assert.ok(firstWord.end > firstWord.start);

    console.log(`  [OK] Live synthesis succeeded: ${audioBytes.length} bytes, ${data.word_count} words.`);
  });

  test('[9/10] Client cancellation: aborting request terminates cleanly', async () => {
    const controller = new AbortController();
    const fetchPromise = fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'A short sentence for abort test.' }),
      signal: controller.signal,
    });

    // Abort after 50ms while speech synthesis is in flight
    setTimeout(() => controller.abort(), 50);

    try {
      await fetchPromise;
    } catch (err) {
      assert.ok(err.name === 'AbortError' || err.code === 'UND_ERR_ABORTED', `Expected AbortError, got ${err.name}`);
      console.log('  [OK] Client abort successfully cancelled in-flight request.');
    }
  });

  test('[10/12] 404 Not Found returns consistent JSON error detail', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.detail.code, 'NOT_FOUND');
    console.log('  [OK] 404 handler returns consistent error detail.');
  });

  test('[11/12] CORS: allowed frontend origin returns 200 and access-control-allow-origin', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    console.log('  [OK] CORS allows configured frontend origin.');
  });

  test('[12/12] CORS: unallowed origin is rejected with HTTP 403 CORS_FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://unauthorized-domain.com' },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.detail.code, 'CORS_FORBIDDEN');
    console.log('  [OK] CORS blocks unallowed origin with HTTP 403.');
  });

});


