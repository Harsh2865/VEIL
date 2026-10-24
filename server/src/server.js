import app from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';

let server;

async function start() {
  try {
    await connectDb();
  } catch (err) {
    console.error(`[Server Startup] Database connection could not be established: ${err.message}`);
    // Server still starts so health check can respond with 503 and report outages honestly
  }

  server = app.listen(env.PORT, () => {
    console.log(`[Server] URL Shortener API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDb();
      process.exit(0);
    });
  } else {
    await disconnectDb();
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();

export default server;
