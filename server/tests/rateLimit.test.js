import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';

describe('Rate Limiting Tests', () => {
  let mongoServer;
  const CLIENT_ID = '33333333-3333-4333-8333-333333333333';

  beforeAll(async () => {
    process.env.ENABLE_RATE_LIMIT_IN_TEST = 'true';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    delete process.env.ENABLE_RATE_LIMIT_IN_TEST;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('enforces rate limits on URL creation and returns 429 with RATE_LIMITED', async () => {
    // The createUrlLimiter has max: 20 per 15 min
    // Send 20 requests
    for (let i = 0; i < 20; i++) {
      await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: `https://rate-limit-test.com/${i}` });
    }

    // The 21st request should trigger 429
    const res = await request(app)
      .post('/api/urls')
      .set('X-Client-Id', CLIENT_ID)
      .send({ url: 'https://rate-limit-test.com/exceeded' });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: expect.stringContaining('Too many'),
      },
    });
  });
});
