/**
 * TTS routes definition
 * POST /api/tts/generate
 * GET /api/tts/voices
 */

const express = require('express');
const router = express.Router();
const ttsController = require('../controllers/ttsController');

router.post('/generate', ttsController.generateSpeech);
router.get('/voices', ttsController.getVoices);

module.exports = router;
