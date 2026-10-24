import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb(uri = env.MONGODB_URI) {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected successfully to ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[Database Error] Could not connect to MongoDB at ${uri}: ${err.message}`);
    throw err;
  }
}

export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly.');
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
