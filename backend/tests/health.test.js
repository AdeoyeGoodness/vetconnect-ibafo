import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API smoke tests (no DB required)', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'ok' });
  });

  test('GET / returns service banner', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toMatch(/VetConnect/i);
  });

  test('unknown route returns 404 envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('register validation rejects an empty body (422)', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
