require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSocketServer = require('./sockets');

const dns = require("node:dns")
dns.setServers(['8.8.8.8', '8.8.4.4'])

const PORT = process.env.PORT || 5005;
const server = http.createServer(app);

// Initialize Socket.io
initSocketServer(server);

const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
