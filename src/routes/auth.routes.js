const { Router } = require('express');
const { register, login, refresh, logout, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules, forgotPasswordRules, resetPasswordRules, validate } = require('../middleware/validate');

const router = Router();

// Public routes (rate limited)
router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Password reset (rate limited)
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword);

// Protected route
router.get('/me', authenticate, getMe);

module.exports = router;
