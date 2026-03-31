const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate access token (short-lived).
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiry }
  );
};

/**
 * Generate refresh token (long-lived).
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiry }
  );
};

/**
 * Verify refresh token.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

/**
 * Calculate refresh token expiry date for database storage.
 */
const getRefreshTokenExpiry = () => {
  const days = parseInt(env.jwtRefreshExpiry) || 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
};
