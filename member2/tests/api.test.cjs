const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { httpVerifier } = require('../dist/auth-client');
const { NotificationError } = require('../dist/notifications');

const serviceKey = 'test-service-key-1234';
const tokens = { ['a'.repeat(64)]: { id: 'user-1', email: 'one@example.test', role: 'student' },
  ['b'.repeat(64)]: { id: 'user-2', email: 'two@example.test', role: 'student' } };
// Stub of member1's /auth/verify so these tests run without the Auth service.
const verifyToken = async (header) => {
  const user = tokens[header?.replace(/^Bearer /, '')];
  if (!user) throw new NotificationError(401, 'INVALID_TOKEN');
  return user;
};
const bearer = (char) => `Bearer ${char.repeat(64)}`;
const body = { userId: 'user-1', bookingId: 'booking-1', type: 'BOOKING_CREATED', message: 'Room A booked' };

test('IT-NOTI-01 internal create -> owner lists -> owner marks read; others denied', async () => {
  const app = createApp({ verifyToken, serviceKey });
  const created = await request(app).post('/notifications').set('X-Service-Key', serviceKey).send(body).expect(201);
  const id = created.body.notification.id;
  await request(app).post('/notifications').set('X-Service-Key', serviceKey).send(body).expect(200);
  const list = await request(app).get('/notifications/user/user-1').set('Authorization', bearer('a')).expect(200);
  assert.equal(list.body.notifications.length, 1);
  await request(app).get('/notifications/user/user-1').set('Authorization', bearer('b')).expect(403);
  await request(app).get('/notifications/user/user-1').expect(401);
  await request(app).patch(`/notifications/${id}/read`).set('Authorization', bearer('b')).expect(403);
  const read = await request(app).patch(`/notifications/${id}/read`).set('Authorization', bearer('a')).expect(200);
  assert.equal(read.body.notification.read, true);
  await request(app).patch('/notifications/missing/read').set('Authorization', bearer('a')).expect(404);
});
test('IT-NOTI-02 create requires the internal service key', async () => {
  const app = createApp({ verifyToken, serviceKey });
  await request(app).post('/notifications').send(body).expect(401);
  await request(app).post('/notifications').set('X-Service-Key', 'wrong').send(body).expect(401);
  await request(app).post('/notifications').set('Authorization', bearer('a')).send(body).expect(401);
});
test('IT-NOTI-03 JSON error responses and health', async () => {
  const app = createApp({ verifyToken, serviceKey });
  const health = await request(app).get('/health').expect(200);
  assert.equal(health.body.service, 'notification');
  const post = () => request(app).post('/notifications').set('X-Service-Key', serviceKey);
  await post().send({}).expect(400);
  await post().set('Content-Type', 'application/json').send('{').expect(400);
  await post().send({ data: 'x'.repeat(9000) }).expect(413);
  await request(app).get('/missing').expect(404);
});
test('IT-NOTI-04 httpVerifier maps Auth responses and outages', async () => {
  const auth = http.createServer((req, res) => {
    const ok = req.headers.authorization === bearer('a');
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ok ? { valid: true, user: tokens['a'.repeat(64)] } : { error: 'INVALID_TOKEN' }));
  });
  await new Promise(resolve => auth.listen(0, '127.0.0.1', resolve));
  try {
    const verify = httpVerifier(`http://127.0.0.1:${auth.address().port}`);
    assert.equal((await verify(bearer('a'))).id, 'user-1');
    await assert.rejects(verify(bearer('b')), { code: 'INVALID_TOKEN' });
    await assert.rejects(verify('Bearer nope'), { code: 'INVALID_TOKEN' });
  } finally { auth.close(); }
  await assert.rejects(httpVerifier('http://127.0.0.1:1', 500)(bearer('a')), { code: 'AUTH_UNAVAILABLE' });
});

test('IT-NOTI-05 malformed, invalid and timed-out Auth bodies return 503', async () => {
  for (const mode of ['malformed', 'missing-user', 'wrong-id', 'missing-email', 'missing-role', 'slow']) {
    const auth = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (mode === 'slow') { res.flushHeaders(); return; }
      const user = { ...tokens['a'.repeat(64)] };
      if (mode === 'wrong-id') user.id = 123;
      if (mode === 'missing-email') delete user.email;
      if (mode === 'missing-role') delete user.role;
      res.end(mode === 'malformed' ? '{' : JSON.stringify(mode === 'missing-user' ? {} : { user }));
    });
    await new Promise(resolve => auth.listen(0, '127.0.0.1', resolve));
    try {
      const app = createApp({ serviceKey, verifyToken: httpVerifier(`http://127.0.0.1:${auth.address().port}`, 200) });
      const response = await request(app).get('/notifications/user/user-1').set('Authorization', bearer('a')).expect(503);
      assert.equal(response.body.error, 'AUTH_UNAVAILABLE', mode);
    } finally {
      auth.closeAllConnections();
      await new Promise(resolve => auth.close(resolve));
    }
  }
});
