const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { BookingError, BookingService } = require('../dist/bookings');
const { httpVerifier } = require('../dist/auth-client');
const { httpResourceLookup } = require('../dist/resource-client');
const { httpNotifier } = require('../dist/notification-client');

const HOUR = 3_600_000;
const T0 = Date.parse('2030-01-01T08:00:00.000Z');
const at = (hours) => new Date(T0 + hours * HOUR).toISOString();
const users = { a: { id: 'user-1', email: 'one@example.test', role: 'student' },
  b: { id: 'user-2', email: 'two@example.test', role: 'student' },
  c: { id: 'admin-1', email: 'admin@example.test', role: 'admin' } };
const bearer = (char) => `Bearer ${char.repeat(64)}`;
// Stubs of member1 Auth and member3 Resource so these tests run without other services.
const verifyToken = async (header) => {
  const char = /^Bearer ([abc])\1{63}$/.exec(header ?? '')?.[1];
  if (!char) throw new BookingError(401, 'INVALID_TOKEN');
  return users[char];
};
const resources = { 'room-a': { id: 'room-a', name: 'Room A', active: true },
  'room-x': { id: 'room-x', name: 'Closed Lab', active: false } };
const getResource = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 5)); // simulate network latency between requests
  if (!resources[id]) throw new BookingError(404, 'RESOURCE_NOT_FOUND');
  return resources[id];
};
const setup = (notify) => {
  const events = [];
  const app = createApp({ service: new BookingService(() => T0), verifyToken, getResource,
    notify: notify ?? (async (event) => { events.push(event); return true; }) });
  const book = (char, start, end, resourceId = 'room-a') => request(app).post('/bookings')
    .set('Authorization', bearer(char)).send({ resourceId, startTime: at(start), endTime: at(end) });
  return { app, events, book };
};
const listen = async (handler) => {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`,
    close: () => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); } };
};

test('IT-BOOK-01 student books -> notification sent -> owner and admin read; others denied', async () => {
  const { app, events, book } = setup();
  const created = await book('a', 1, 2).expect(201);
  const booking = created.body.booking;
  assert.equal(booking.status, 'CONFIRMED');
  assert.equal(created.body.notificationSent, true);
  assert.deepEqual(events.map(e => [e.type, e.userId, e.bookingId]), [['BOOKING_CREATED', 'user-1', booking.id]]);
  assert.match(events[0].message, /Room A, 2030-01-01 09:00 UTC - 2030-01-01 10:00 UTC/);
  await request(app).get(`/bookings/${booking.id}`).set('Authorization', bearer('a')).expect(200);
  await request(app).get(`/bookings/${booking.id}`).set('Authorization', bearer('c')).expect(200);
  await request(app).get(`/bookings/${booking.id}`).set('Authorization', bearer('b')).expect(403);
  await request(app).get('/bookings/missing').set('Authorization', bearer('a')).expect(404);
  const own = await request(app).get('/bookings/user/user-1').set('Authorization', bearer('a')).expect(200);
  assert.equal(own.body.bookings.length, 1);
  await request(app).get('/bookings/user/user-1').set('Authorization', bearer('b')).expect(403);
  await request(app).get(`/bookings/${booking.id}`).expect(401);
  await request(app).post('/bookings').send({ resourceId: 'room-a', startTime: at(3), endTime: at(4) }).expect(401);
});

test('IT-BOOK-02 time conflicts, boundaries, resource checks and concurrent requests', async () => {
  const { book } = setup();
  await book('a', 1, 3).expect(201);
  const conflict = await book('b', 2, 4).expect(409);
  assert.equal(conflict.body.error, 'BOOKING_TIME_CONFLICT');
  await book('b', 3, 4).expect(201);
  assert.equal((await book('b', 5, 5).expect(400)).body.error, 'INVALID_TIME_RANGE');
  assert.equal((await book('b', 5, 6, 'room-x').expect(409)).body.error, 'RESOURCE_INACTIVE');
  assert.equal((await book('b', 5, 6, 'room-zz').expect(404)).body.error, 'RESOURCE_NOT_FOUND');
  const results = await Promise.all(['a', 'b', 'a', 'b'].map(char => book(char, 7, 8)));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409, 409]);
});

test('IT-BOOK-03 cancel by owner or admin; admin lists bookings and manages closures', async () => {
  const { app, events, book } = setup();
  const id = (await book('a', 1, 2).expect(201)).body.booking.id;
  await request(app).patch(`/bookings/${id}/cancel`).set('Authorization', bearer('b')).expect(403);
  const cancelled = await request(app).patch(`/bookings/${id}/cancel`).set('Authorization', bearer('a')).expect(200);
  assert.equal(cancelled.body.booking.status, 'CANCELLED');
  assert.equal(events.at(-1).type, 'BOOKING_CANCELLED');
  await request(app).patch(`/bookings/${id}/cancel`).set('Authorization', bearer('a')).expect(409);

  const closure = { resourceId: 'room-a', startTime: at(10), endTime: at(12), reason: 'Exam' };
  await request(app).post('/closures').set('Authorization', bearer('a')).send(closure).expect(403);
  const closureId = (await request(app).post('/closures').set('Authorization', bearer('c')).send(closure).expect(201))
    .body.closure.id;
  const visible = await request(app).get('/closures?resourceId=room-a').set('Authorization', bearer('a')).expect(200);
  assert.deepEqual(visible.body.closures.map(c => c.id), [closureId]);
  assert.equal((await book('a', 11, 13).expect(409)).body.error, 'BOOKING_PERIOD_CLOSED');
  await request(app).delete(`/closures/${closureId}`).set('Authorization', bearer('a')).expect(403);
  await request(app).delete(`/closures/${closureId}`).set('Authorization', bearer('c')).expect(204);
  const reopened = (await book('a', 11, 13).expect(201)).body.booking.id;

  await request(app).get('/bookings').set('Authorization', bearer('a')).expect(403);
  const all = await request(app).get('/bookings?status=CONFIRMED').set('Authorization', bearer('c')).expect(200);
  assert.deepEqual(all.body.bookings.map(b => b.id), [reopened]);
  await request(app).get('/bookings?status=DONE').set('Authorization', bearer('c')).expect(400);
  const byAdmin = await request(app).patch(`/bookings/${reopened}/cancel`).set('Authorization', bearer('c')).expect(200);
  assert.equal(byAdmin.body.booking.cancelledBy, 'admin-1');
});

test('IT-BOOK-04 Notification outage still returns 201 with notificationSent false after one retry', async () => {
  const received = [];
  let status = 503;
  const notification = await listen((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      received.push({ key: req.headers['x-service-key'], body: JSON.parse(body) });
      res.writeHead(status, { 'Content-Type': 'application/json' }).end('{}');
    });
  });
  try {
    const { book } = setup(httpNotifier(notification.url, 'test-service-key-1234', 500));
    const failed = await book('a', 1, 2).expect(201);
    assert.equal(failed.body.notificationSent, false);
    assert.equal(received.length, 2);
    status = 201;
    const sent = await book('a', 3, 4).expect(201);
    assert.equal(sent.body.notificationSent, true);
    assert.equal(received.length, 3);
    assert.equal(received[2].key, 'test-service-key-1234');
    assert.deepEqual([received[2].body.type, received[2].body.bookingId], ['BOOKING_CREATED', sent.body.booking.id]);
    status = 401;
    await book('a', 5, 6).expect(201);
    assert.equal(received.length, 4, '4xx responses are not retried');
  } finally { await notification.close(); }
  assert.equal(await httpNotifier('http://127.0.0.1:1', 'test-service-key-1234', 500)(
    { userId: 'user-1', bookingId: 'b-1', type: 'BOOKING_CREATED', message: 'x' }), false);
});

test('IT-BOOK-05 httpResourceLookup maps Resource responses and outages', async () => {
  let forwarded;
  const resource = await listen((req, res) => {
    forwarded = req.headers.authorization;
    const id = decodeURIComponent(req.url.split('/').pop());
    if (id === 'slow') { res.writeHead(200).flushHeaders(); return; }
    const found = { 'room-a': { id, name: 'Room A', active: true }, 'room-x': { id, active: false },
      'wrong-id': { id: 'other', active: true }, 'no-active': { id } }[id];
    if (id === 'bad') { res.writeHead(200).end('{'); return; }
    res.writeHead(found ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(found ? { resource: found } : { error: 'NOT_FOUND' }));
  });
  try {
    const lookup = httpResourceLookup(resource.url, 300);
    assert.deepEqual(await lookup('room-a', bearer('a')), { id: 'room-a', name: 'Room A', active: true });
    assert.equal(forwarded, bearer('a'));
    assert.deepEqual(await lookup('room-x', bearer('a')), { id: 'room-x', name: 'room-x', active: false });
    await assert.rejects(lookup('missing', bearer('a')), { status: 404, code: 'RESOURCE_NOT_FOUND' });
    for (const id of ['bad', 'wrong-id', 'no-active', 'slow']) {
      await assert.rejects(lookup(id, bearer('a')), { status: 503, code: 'RESOURCE_UNAVAILABLE' }, id);
    }
  } finally { await resource.close(); }
  await assert.rejects(httpResourceLookup('http://127.0.0.1:1', 300)('room-a', bearer('a')),
    { code: 'RESOURCE_UNAVAILABLE' });
});

test('IT-BOOK-06 httpVerifier maps Auth responses; JSON errors and health', async () => {
  const auth = await listen((req, res) => {
    const ok = req.headers.authorization === bearer('a');
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ok ? { valid: true, user: users.a } : { error: 'INVALID_TOKEN' }));
  });
  try {
    const verify = httpVerifier(auth.url);
    assert.equal((await verify(bearer('a'))).id, 'user-1');
    await assert.rejects(verify(bearer('b')), { status: 401, code: 'INVALID_TOKEN' });
    await assert.rejects(verify('Bearer nope'), { code: 'INVALID_TOKEN' });
  } finally { await auth.close(); }
  await assert.rejects(httpVerifier('http://127.0.0.1:1', 300)(bearer('a')), { status: 503, code: 'AUTH_UNAVAILABLE' });

  const { app } = setup();
  const health = await request(app).get('/health').expect(200);
  assert.equal(health.body.service, 'booking');
  const post = () => request(app).post('/bookings').set('Authorization', bearer('a'));
  assert.equal((await post().send({}).expect(400)).body.error, 'INVALID_INPUT');
  assert.equal((await post().set('Content-Type', 'application/json').send('{').expect(400)).body.error, 'INVALID_JSON');
  await post().send({ data: 'x'.repeat(9000) }).expect(413);
  await request(app).get('/missing').expect(404);
});
