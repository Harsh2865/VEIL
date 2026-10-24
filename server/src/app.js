import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import urlRoutes from './routes/urlRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Reverse-proxy awareness for rate limiting
app.set('trust proxy', env.TRUST_PROXY);

// Security headers
app.use(helmet());

// CORS limited to FRONTEND_ORIGIN without credentials
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Client-Id'],
  })
);

// 10kb body limit
app.use(express.json({ limit: '10kb' }));

// Health check endpoint (DB-aware, no connection details leaked)
app.get('/api/health', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ status: 'ok' });
  }
  return res.status(503).json({ status: 'unavailable' });
});

// Mount API routes
app.use('/api', urlRoutes);

// Mount short URL redirect route
app.use('/s', redirectRoutes);

// Unknown /api routes return JSON 404
app.all('/api/*', notFoundHandler);

// Fallback 404 for any other unmatched routes
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Centralized error handler
app.use(errorHandler);

export default app;
