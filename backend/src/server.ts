import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config';
import { getDb } from './db';
import { initSocket } from './socket';

const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize real-time Socket.IO handlers
initSocket(io);

// Initialize DB schema on startup
getDb();

server.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`♠️ CHIPMATE AUTHORITATIVE LEDGER BACKEND STARTED ♦️`);
  console.log(`📡 Listening on http://localhost:${config.port}`);
  console.log(`🌐 Real-time Socket.io initialized`);
  console.log(`💾 Database: ${config.dbPath}`);
  console.log(`⚙️ Environment: ${config.nodeEnv}`);
  console.log(`====================================================`);
});
