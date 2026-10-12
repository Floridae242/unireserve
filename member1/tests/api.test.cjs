const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { randomUUID } = require('node:crypto');
const input = { email: 'student@example.test', password: randomUUID() };

test('IT-AUTH-01 register -> login -> verify -> own user; cross-user denied', async () => {
  const app = createApp();
  const registered = await request(app).post('/auth/register').send(input).expect(201);
  const login = await request(app).post('/auth/login').send(input).expect(200);
  const header = `Bearer ${login.body.token}`;
  const verified = await request(app).post('/auth/verify').set('Authorization', header).expect(200);
  assert.deepEqual(verified.body.user, registered.body.user);
  await request(app).get(`/users/${registered.body.user.id}`).set('Authorization', header).expect(200);
  await request(app).get('/users/another-user').set('Authorization', header).expect(403);
  await request(app).get(`/users/${registered.body.user.id}`).expect(401);
  await request(app).post('/auth/verify').send({ token: login.body.token }).expect(401);
});
test('IT-AUTH-02 JSON error responses and health', async () => {
  const app = createApp();
  const health = await request(app).get('/health').expect(200); assert.equal(health.body.status, 'ok');
  await request(app).post('/auth/register').send({}).expect(400);
  await request(app).post('/auth/login').send(input).expect(401);
  await request(app).post('/auth/register').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).post('/auth/register').send({ data: 'x'.repeat(9000) }).expect(413);
  await request(app).get('/missing').expect(404);
});
test('IT-AUTH-03 auth endpoints throttle after 30 requests per minute', async () => {
  const app = createApp();
  for (let i = 0; i < 30; i++) await request(app).post('/auth/verify').expect(401);
  const blocked = await request(app).post('/auth/verify').expect(429);
  assert.equal(blocked.body.error, 'TOO_MANY_REQUESTS');
});
