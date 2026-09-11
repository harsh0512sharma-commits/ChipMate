import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config';
import { getDb, syncFromTursoCloud } from './db';
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

async function bootstrap() {
  // Initialize DB schema on startup
  const db = getDb();

  // If Turso Cloud credentials are set, hydrate local SQLite from cloud
  await syncFromTursoCloud(db);

  server.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`♠️ CHIPMATE AUTHORITATIVE LEDGER BACKEND STARTED ♦️`);
    console.log(`📡 Listening on http://localhost:${config.port}`);
    console.log(`🌐 Real-time Socket.io initialized`);
    console.log(`💾 Database: ${config.dbPath}`);
    if (config.tursoDatabaseUrl) {
      console.log(`☁️ Cloud Database: Turso (Replication & Sync Active)`);
    }
    console.log(`⚙️ Environment: ${config.nodeEnv}`);
    console.log(`====================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
