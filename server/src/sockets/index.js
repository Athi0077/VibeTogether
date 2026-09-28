const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerChatHandlers = require('./chatHandler');
const registerMusicHandlers = require('./musicHandler');
const registerCallHandlers = require('./callHandler');

const userSockets = new Map();

const initSocketServer = (server) => {
  const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(url => url.trim()) : ['http://localhost:5173'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie || '';
      const tokenMatch = cookieHeader.match(/jwt=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) return next(new Error('Authentication error: No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.name} (${socket.id})`);
    
    // Join a user-specific room for private messages
    socket.join(`user:${userId}`);

    // Track presence
    const count = userSockets.get(userId) || 0;
    userSockets.set(userId, count + 1);
    if (count === 0) {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit('user:presence', { userId, isOnline: true });
    }

    registerChatHandlers(io, socket);
    registerMusicHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
      const currentCount = userSockets.get(userId) || 1;
      if (currentCount <= 1) {
        userSockets.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false });
        io.emit('user:presence', { userId, isOnline: false });
      } else {
        userSockets.set(userId, currentCount - 1);
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = initSocketServer;
module.exports.getIo = getIo;
