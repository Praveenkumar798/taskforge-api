const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ── Security Middleware ──
app.use(helmet());
app.use(cors({
  origin: env.clientUrl.split(',').map(url => url.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing ──
app.use(express.json({ limit: '10kb' })); // Limit body size for security
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Logging ──
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── General Rate Limit ──
app.use('/api', apiLimiter);

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──
const PORT = env.port;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   TaskForge API Server Running         ║
  ║                                        ║
  ║   Port:        ${PORT}                    ║
  ║   Environment: ${env.nodeEnv.padEnd(19)}║
  ║   Health:      /api/health             ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
