const env = require('../config/env');

/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a consistent response.
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Default to 500
  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : 'An unexpected error occurred. Please try again later.';

  res.status(statusCode).json({
    error: err.name || 'ServerError',
    message,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler for unknown routes.
 */
const notFound = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`,
  });
};

module.exports = { errorHandler, notFound };
