import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';

describe('Phase 1 Foundation & Health Checks', () => {
  let mongoServer;

  beforeAll(async () => {
    // Ensure disconnected initially to test unavailable state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('GET /api/health returns 503 unavailable when database is not connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable' });
  });

  it('GET /api/health returns 200 ok when database is connected', async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/unknown-endpoint returns 404 with standard error shape', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'API route not found.',
      },
    });
  });

  it('POST with payload exceeding 10kb returns 400 with VALIDATION_ERROR', async () => {
    const largeData = 'a'.repeat(12 * 1024);
    const res = await request(app)
      .post('/api/unknown-endpoint')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: largeData }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Responds with CORS headers for allowed frontend origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
