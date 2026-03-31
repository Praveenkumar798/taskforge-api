const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Verifies JWT access token from Authorization header.
 * Sets req.user = { id, role } on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token in the Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your access token has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(403).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or malformed.',
    });
  }
};

module.exports = authenticate;
