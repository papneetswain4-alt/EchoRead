/**
 * EchoRead Backend Server
 * Node.js + Express primary API server with Python Edge TTS engine integration.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const ttsRoutes = require('./routes/tts');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse configured CORS origins (strips trailing slashes)
const rawOrigins = process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000';
const allowedOrigins = rawOrigins
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, Render health checks, Postman)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*' || allowed === normalizedOrigin) return true;
      // Support *.domain.com or https://*.domain.com
      if (allowed.includes('*.')) {
        const domainPattern = allowed.replace(/^https?:\/\//, '').replace(/^\*\./, '');
        try {
          const originHost = new URL(normalizedOrigin).hostname;
          return originHost === domainPattern || originHost.endsWith(`.${domainPattern}`);
        } catch (_) {
          return false;
        }
      }
      return false;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Root discovery endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    app: 'EchoRead API',
    version: '0.1.0',
    status: 'online',
    documentation: '/docs',
    health_check: '/api/health',
    tts_endpoints: {
      generate: '/api/tts/generate',
      voices: '/api/tts/voices',
    },
  });
});

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api/tts', ttsRoutes);

// 404 handler for unmatched endpoints
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// Start server if executed directly
let server = null;
if (require.main === module) {
  server = app.listen(PORT, HOST, () => {
    console.log(`[EchoRead API] Server running in ${NODE_ENV} mode on http://${HOST}:${PORT}`);
    console.log(`[EchoRead API] Health check available at http://${HOST}:${PORT}/api/health`);
    console.log(`[EchoRead API] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  });

  const handleShutdown = (signal) => {
    console.log(`[EchoRead API] Received ${signal}. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        console.log('[EchoRead API] HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

module.exports = app;
