/**
 * Health check router
 * GET /api/health
 */

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app_name: 'EchoRead API',
    version: '0.1.0',
    details: {
      environment: process.env.NODE_ENV || 'development',
      tts_engine: 'edge-tts (Python engine)',
    },
  });
});

module.exports = router;
