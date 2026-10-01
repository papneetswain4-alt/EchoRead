/**
 * Global Error Handling Middleware for Express.
 * Formats errors to preserve exact FastAPI contract expected by frontend:
 * { detail: { code: string, message: string, errors?: Array } }
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler for unmatched routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    detail: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle body-parser JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      detail: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.',
      },
    });
  }

  // Handle CORS blocked origin errors
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      detail: {
        code: 'CORS_FORBIDDEN',
        message: 'Origin not allowed by CORS policy.',
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : `HTTP_${statusCode}`);
  const message = statusCode === 500
    ? 'An unexpected error occurred. Please try again.'
    : (err.message || 'An error occurred processing the request.');

  // Server-side diagnostic log (does not leak to client)
  if (statusCode >= 500) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`[WARN] [${new Date().toISOString()}] ${req.method} ${req.originalUrl} (${statusCode} ${code}): ${err.message}`);
  }

  const detail = {
    code,
    message,
    ...(err.extra || {}),
  };

  res.status(statusCode).json({ detail });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};
