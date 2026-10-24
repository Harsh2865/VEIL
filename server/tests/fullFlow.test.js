import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { ShortUrl } from '../src/models/ShortUrl.js';

describe('Phase 5 Integration & Hardening - Full Flow & Edge Cases', () => {
  let mongoServer;
  const CLIENT_ID = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('executes full flow: create -> redirect -> click count increment -> history update -> delete -> 404', async () => {
    // 1. Create short URL
    const createRes = await request(app)
      .post('/api/urls')
      .set('X-Client-Id', CLIENT_ID)
      .send({
        url: 'https://docs.github.com/en/rest',
        customCode: 'gh-docs',
        label: 'GitHub Documentation',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.shortCode).toBe('gh-docs');
    expect(createRes.body.clickCount).toBe(0);
    const linkId = createRes.body.id;

    // 2. Open short link & redirect
    const redirectRes = await request(app).get('/s/gh-docs');
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.location).toBe('https://docs.github.com/en/rest');
    expect(redirectRes.headers['cache-control']).toContain('no-store');

    // 3. Confirm click count rises in history
    const historyRes = await request(app)
      .get('/api/urls')
      .set('X-Client-Id', CLIENT_ID);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.items).toHaveLength(1);
    expect(historyRes.body.items[0].clickCount).toBe(1);
    expect(historyRes.body.items[0].lastClickedAt).toBeTruthy();

    // 4. Delete the link
    const deleteRes = await request(app)
      .delete(`/api/urls/${linkId}`)
      .set('X-Client-Id', CLIENT_ID);
    expect(deleteRes.status).toBe(204);

    // 5. Confirm link is gone from history
    const historyAfterDelete = await request(app)
      .get('/api/urls')
      .set('X-Client-Id', CLIENT_ID);
    expect(historyAfterDelete.body.items).toHaveLength(0);

    // 6. Confirm redirect now returns 404 HTML
    const redirectAfterDelete = await request(app).get('/s/gh-docs');
    expect(redirectAfterDelete.status).toBe(404);
    expect(redirectAfterDelete.headers['content-type']).toContain('text/html');
  });

  describe('Edge cases security verification', () => {
    it('blocks javascript: scheme', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: 'javascript:alert(1)' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks data: scheme', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks file: scheme', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: 'file:///C:/Windows/System32' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks blank or whitespace URL', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks 2049-character URLs', async () => {
      const longUrl = 'https://example.com/' + 'x'.repeat(2040);
      expect(longUrl.length).toBeGreaterThan(2048);

      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: longUrl });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks reserved custom codes case-insensitively', async () => {
      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: 'https://example.com', customCode: 'FAVICON.ICO' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks duplicate custom code and returns 409 CODE_TAKEN', async () => {
      await ShortUrl.create({
        originalUrl: 'https://existing.com',
        shortCode: 'unique-code',
        clientId: CLIENT_ID,
      });

      const res = await request(app)
        .post('/api/urls')
        .set('X-Client-Id', CLIENT_ID)
        .send({ url: 'https://new.com', customCode: 'unique-code' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CODE_TAKEN');
    });
  });
});
