const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/authRoutes');
const songRoutes = require('./routes/songRoutes');
const callRoutes = require('./routes/callRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

const app = express();

app.set('trust proxy', 1); // Trust first proxy for Render

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow any origin to connect
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // increased from 100
  message: 'Too many requests, please try again later.',
  skip: (req) => req.originalUrl.startsWith('/api/users/search')
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, // increased from 20
  message: 'Too many login attempts, please try again later.'
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests. Please slow down and try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour per IP
  message: 'Too many uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);

// Apply search limiter to search specifically
app.use('/api/users/search', searchLimiter);

app.use('/api/', apiLimiter);
app.use('/api/songs/upload', uploadLimiter);
app.use('/api/songs', songRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/youtube-player', require('./features/youtube-player/youtube.routes'));

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
