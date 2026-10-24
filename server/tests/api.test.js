import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { ShortUrl } from '../src/models/ShortUrl.js';

describe('Phase 3 API and Redirect Tests', () => {
  let mongoServer;
  const CLIENT_A = '11111111-1111-4111-8111-111111111111';
  const CLIENT_B = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await ShortUrl.deleteMany({});
  });

  describe('Client ID enforcement & Validation (400s)', () => {
    it('rejects POST /api/urls without X-Client-Id with 400 INVALID_CLIENT_ID', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'INVALID_CLIENT_ID',
          message: expect.stringContaining('X-Client-Id'),
        },
      });
    });

    it('rejects POST /api/urls with non-UUIDv4 X-Client-Id', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', 'not-a-uuid')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CLIENT_ID');
    });

    it('rejects invalid or unsafe URL with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'javascript:alert(1)' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid custom code format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://example.com', customCode: 'no spaces!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects reserved custom code with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://example.com', customCode: 'api' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('reserved');
    });
  });

  describe('POST /api/urls (201 Shape)', () => {
    it('creates a short URL with generated code and exact response shape', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({
          url: 'https://example.com/very/long/path?param=1',
          label: 'Test Documentation',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        originalUrl: 'https://example.com/very/long/path?param=1',
        shortCode: expect.stringMatching(/^[A-Za-z0-9]{7}$/),
        label: 'Test Documentation',
        shortUrl: expect.stringContaining('/s/'),
        clickCount: 0,
        createdAt: expect.any(String),
        lastClickedAt: null,
      });
      // Ensure shortUrl uses PUBLIC_SHORT_URL_BASE, not request host
      expect(res.body.shortUrl.startsWith('http://localhost:5000/s/')).toBe(true);
    });

    it('creates a short URL with valid custom code', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({
          url: 'https://example.com/custom',
          customCode: 'my-custom-path',
        });

      expect(res.status).toBe(201);
      expect(res.body.shortCode).toBe('my-custom-path');
      expect(res.body.shortUrl).toBe('http://localhost:5000/s/my-custom-path');
    });

    it('returns 409 CODE_TAKEN when custom code already exists', async () => {
      await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://example.com/1', customCode: 'taken-code' });

      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_B)
        .send({ url: 'https://example.com/2', customCode: 'taken-code' });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: {
          code: 'CODE_TAKEN',
          message: expect.stringContaining('already in use'),
        },
      });
    });
  });

  describe('History isolation and Cursor pagination', () => {
    it('isolates history strictly between client IDs', async () => {
      // Client A creates 2 links
      await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://client-a-link1.com' });
      await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://client-a-link2.com' });

      // Client B creates 1 link
      await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_B)
        .send({ url: 'https://client-b-link1.com' });

      // Verify Client A sees only their 2 links
      const resA = await request(app).get('/api/urls').set('X-Client-Id', CLIENT_A);
      expect(resA.status).toBe(200);
      expect(resA.body.items).toHaveLength(2);
      expect(resA.body.items.every((item) => item.originalUrl.includes('client-a'))).toBe(true);

      // Verify Client B sees only their 1 link
      const resB = await request(app).get('/api/urls').set('X-Client-Id', CLIENT_B);
      expect(resB.status).toBe(200);
      expect(resB.body.items).toHaveLength(1);
      expect(resB.body.items[0].originalUrl).toBe('https://client-b-link1.com');
    });

    it('paginates correctly with cursor and respects limit', async () => {
      // Create 5 links for Client A
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/urls')
          .set('X-Client-Id', CLIENT_A)
          .send({ url: `https://paginate-test.com/${i}` });
      }

      // Fetch first page with limit=2
      const page1 = await request(app)
        .get('/api/urls?limit=2')
        .set('X-Client-Id', CLIENT_A);
      expect(page1.status).toBe(200);
      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.nextCursor).toBeTruthy();

      // Fetch second page using nextCursor
      const page2 = await request(app)
        .get(`/api/urls?limit=2&cursor=${encodeURIComponent(page1.body.nextCursor)}`)
        .set('X-Client-Id', CLIENT_A);
      expect(page2.status).toBe(200);
      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.nextCursor).toBeTruthy();

      // Fetch third page
      const page3 = await request(app)
        .get(`/api/urls?limit=2&cursor=${encodeURIComponent(page2.body.nextCursor)}`)
        .set('X-Client-Id', CLIENT_A);
      expect(page3.status).toBe(200);
      expect(page3.body.items).toHaveLength(1);
      expect(page3.body.nextCursor).toBeNull();
    });

    it('returns 400 for malformed cursor', async () => {
      const res = await request(app)
        .get('/api/urls?cursor=invalid-not-base64')
        .set('X-Client-Id', CLIENT_A);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/urls/:id ownership and behavior', () => {
    it('allows owner to delete link and returns 204', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://example.com/delete-me' });

      const linkId = createRes.body.id;
      const shortCode = createRes.body.shortCode;

      const deleteRes = await request(app)
        .delete(`/api/urls/${linkId}`)
        .set('X-Client-Id', CLIENT_A);
      expect(deleteRes.status).toBe(204);

      // Verify it is gone from history
      const listRes = await request(app).get('/api/urls').set('X-Client-Id', CLIENT_A);
      expect(listRes.body.items).toHaveLength(0);

      // Verify redirect returns 404 HTML
      const redirectRes = await request(app).get(`/s/${shortCode}`);
      expect(redirectRes.status).toBe(404);
      expect(redirectRes.headers['content-type']).toContain('text/html');
    });

    it('denies deletion of another user’s link with 404 (does not reveal existence)', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://example.com/client-a-only' });

      const linkId = createRes.body.id;

      // Client B tries to delete Client A's link
      const deleteRes = await request(app)
        .delete(`/api/urls/${linkId}`)
        .set('X-Client-Id', CLIENT_B);

      expect(deleteRes.status).toBe(404);
      expect(deleteRes.body.error.code).toBe('NOT_FOUND');

      // Verify link still exists for Client A
      const listRes = await request(app).get('/api/urls').set('X-Client-Id', CLIENT_A);
      expect(listRes.body.items).toHaveLength(1);
    });
  });

  describe('GET /api/codes/:code/available (Advisory check)', () => {
    it('returns available: true for unused valid code', async () => {
      const res = await request(app).get('/api/codes/my-unused-code/available');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: true });
    });

    it('returns available: false, reason: "taken" for used code', async () => {
      await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://example.com', customCode: 'already-used' });

      const res = await request(app).get('/api/codes/already-used/available');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: false, reason: 'taken' });
    });

    it('returns available: false, reason: "reserved" for system words', async () => {
      const res = await request(app).get('/api/codes/admin/available');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: false, reason: 'reserved' });
    });

    it('returns available: false, reason: "invalid" for malformed code', async () => {
      const res = await request(app).get('/api/codes/ab/available');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: false, reason: 'invalid' });
    });
  });

  describe('GET /s/:code (302 Redirect & Atomic clicks)', () => {
    it('redirects with 302, sets Cache-Control: no-store, and increments click count', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://destination.com/target' });

      const code = createRes.body.shortCode;

      const redirectRes = await request(app).get(`/s/${code}`);
      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe('https://destination.com/target');
      expect(redirectRes.headers['cache-control']).toContain('no-store');

      // Verify clickCount is now 1 in history
      const listRes = await request(app).get('/api/urls').set('X-Client-Id', CLIENT_A);
      expect(listRes.body.items[0].clickCount).toBe(1);
      expect(listRes.body.items[0].lastClickedAt).toBeTruthy();
    });

    it('returns friendly HTML 404 page for unknown code', async () => {
      const res = await request(app).get('/s/nonexistent');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Link Not Found');
    });

    it('accurately counts 50 concurrent redirects without race conditions', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'https://concurrency-test.com' });

      const code = createRes.body.shortCode;

      // Fire 50 concurrent redirect requests
      const requests = Array.from({ length: 50 }, () => request(app).get(`/s/${code}`));
      const responses = await Promise.all(requests);

      responses.forEach((res) => {
        expect(res.status).toBe(302);
      });

      // Check clickCount in MongoDB
      const doc = await ShortUrl.findOne({ shortCode: code });
      expect(doc.clickCount).toBe(50);
    });
  });

  describe('Error handling & No secrets leakage', () => {
    it('never leaks stack traces or Mongo internals in errors', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_A)
        .send({ url: 'invalid-url' });

      expect(res.status).toBe(400);
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('Mongo');
      expect(JSON.stringify(res.body)).not.toContain('Mongoose');
      expect(JSON.stringify(res.body)).not.toContain('node_modules');
    });
  });
});
