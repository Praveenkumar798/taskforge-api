const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} = require('../utils/tokens');
const env = require('../config/env');

/**
 * POST /api/auth/register
 * Create a new user account.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists. Please log in instead.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in database
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return tokens.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token (remove old tokens for this user first)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Get a new access token using refresh token from cookie.
 */
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'No refresh token',
        message: 'Refresh token not found. Please log in again.',
      });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(403).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is expired or invalid. Please log in again.',
      });
    }

    // Check if token exists in database (prevents reuse after logout)
    const stored = await query(
      `SELECT rt.id, u.id as user_id, u.name, u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (stored.rows.length === 0) {
      return res.status(403).json({
        error: 'Token revoked',
        message: 'This refresh token has been revoked. Please log in again.',
      });
    }

    const user = stored.rows[0];

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.user_id,
      role: user.role,
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Revoke refresh token and clear cookie.
 */
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Remove from database
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    // Clear cookie
    res.clearCookie('refreshToken', { path: '/api/auth' });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 * Generate a password reset token.
 * In production, this would send an email. Here we return the token directly.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user
    const result = await query('SELECT id, email FROM users WHERE email = $1', [email]);

    // Always return success (don't reveal if email exists)
    if (result.rows.length === 0) {
      return res.json({
        message: 'If an account with that email exists, a reset token has been generated.',
      });
    }

    const user = result.rows[0];

    // Invalidate old reset tokens
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, resetToken, expiresAt]
    );

    // In production: send email with reset link
    // For demo: return token directly
    res.json({
      message: 'If an account with that email exists, a reset token has been generated.',
      // Only include token in development for testing
      ...(env.nodeEnv === 'development' && { resetToken }),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Find valid token
    const result = await query(
      `SELECT prt.id, prt.user_id
       FROM password_reset_tokens prt
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'This reset token is invalid, expired, or has already been used.',
      });
    }

    const resetRecord = result.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetRecord.user_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetRecord.id]
    );

    // Revoke all refresh tokens (force re-login)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [resetRecord.user_id]);

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, getMe, forgotPassword, resetPassword };
