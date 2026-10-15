const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { ReviewError, ReviewService } = require('../dist/reviews');
const { httpVerifier } = require('../dist/auth-client');
const { httpBookingLookup } = require('../dist/booking-client');

const users = {
  a: { id: 'user-1', email: 'alice@example.test', role: 'student' },
  b: { id: 'user-2', email: 'bob@example.test', role: 'student' },
  c: { id: 'admin-1', email: 'admin@example.test', role: 'admin' },
};

const bearer = (char) => `Bearer ${char.repeat(64)}`;

const verifyToken = async (header) => {
  const char = /^Bearer ([abc])\1{63}$/.exec(header ?? '')?.[1];
  if (!char) throw new ReviewError(401, 'INVALID_TOKEN');
  return users[char];
};

const bookings = {
  'b-completed': { id: 'b-completed', userId: 'user-1', resourceId: 'room-a', status: 'COMPLETED' },
  'b-confirmed': { id: 'b-confirmed', userId: 'user-1', resourceId: 'room-a', status: 'CONFIRMED' },
  'b-cancelled': { id: 'b-cancelled', userId: 'user-1', resourceId: 'room-a', status: 'CANCELLED' },
  'b-bob': { id: 'b-bob', userId: 'user-2', resourceId: 'room-b', status: 'COMPLETED' },
};

const getBooking = async (bookingId, authorization) => {
  const char = /^Bearer ([abc])\1{63}$/.exec(authorization ?? '')?.[1];
  if (!char) throw new ReviewError(401, 'INVALID_TOKEN');
  const caller = users[char];

  const booking = bookings[bookingId];
  if (!booking) throw new ReviewError(404, 'BOOKING_NOT_FOUND');
  if (booking.userId !== caller.id && caller.role !== 'admin') {
    throw new ReviewError(403, 'FORBIDDEN');
  }
  return booking;
};

const setup = (customGetBooking, customVerifyToken) => {
  const service = new ReviewService();
  const app = createApp({
    service,
    verifyToken: customVerifyToken ?? verifyToken,
    getBooking: customGetBooking ?? getBooking,
  });
  return { app, service };
};

const listen = async (handler) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
};

test('IT-REV-01 TS-08 owner review completed booking -> 201 Created', async () => {
  const { app } = setup();

  const res = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5, comment: 'Excellent facility' })
    .expect(201);

  assert.equal(res.body.review.bookingId, 'b-completed');
  assert.equal(res.body.review.userId, 'user-1');
  assert.equal(res.body.review.resourceId, 'room-a');
  assert.equal(res.body.review.rating, 5);
  assert.equal(res.body.review.comment, 'Excellent facility');
  assert.ok(res.body.review.id);
  assert.ok(res.body.review.createdAt);
});

test('IT-REV-02 TS-09 non-owner review -> 403 FORBIDDEN', async () => {
  const { app } = setup();

  // User B tries to review User A's booking
  const res = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('b'))
    .send({ bookingId: 'b-completed', rating: 4 })
    .expect(403);

  assert.equal(res.body.error, 'FORBIDDEN');
});

test('IT-REV-03 TS-10 duplicate review for same booking -> 409 REVIEW_ALREADY_EXISTS', async () => {
  const { app } = setup();

  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5 })
    .expect(201);

  const duplicate = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 4 })
    .expect(409);

  assert.equal(duplicate.body.error, 'REVIEW_ALREADY_EXISTS');
});

test('IT-REV-04 review of non-completed booking returns 409 BOOKING_NOT_COMPLETED', async () => {
  const { app } = setup();

  const confRes = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-confirmed', rating: 5 })
    .expect(409);
  assert.equal(confRes.body.error, 'BOOKING_NOT_COMPLETED');

  const cancRes = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-cancelled', rating: 1 })
    .expect(409);
  assert.equal(cancRes.body.error, 'BOOKING_NOT_COMPLETED');
});

test('IT-REV-05 booking not found returns 404 BOOKING_NOT_FOUND', async () => {
  const { app } = setup();

  const res = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-missing', rating: 4 })
    .expect(404);

  assert.equal(res.body.error, 'BOOKING_NOT_FOUND');
});

test('IT-REV-06 input validation and payload constraints', async () => {
  const { app } = setup();

  // Invalid rating
  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 6 })
    .expect(400);

  // Missing bookingId
  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ rating: 4 })
    .expect(400);

  // Invalid JSON
  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .set('Content-Type', 'application/json')
    .send('{ invalid json }')
    .expect(400);

  // Payload too large
  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5, comment: 'x'.repeat(9000) })
    .expect(413);
});

test('IT-REV-07 GET /reviews/resource/:resourceId lists reviews for resource', async () => {
  const { app } = setup();

  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5, comment: 'Nice!' })
    .expect(201);

  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('b'))
    .send({ bookingId: 'b-bob', rating: 3, comment: 'Okay' })
    .expect(201);

  const res = await request(app)
    .get('/reviews/resource/room-a')
    .set('Authorization', bearer('a'))
    .expect(200);

  assert.equal(res.body.reviews.length, 1);
  assert.equal(res.body.reviews[0].resourceId, 'room-a');
  assert.equal(res.body.reviews[0].comment, 'Nice!');

  const emptyRes = await request(app)
    .get('/reviews/resource/room-empty')
    .set('Authorization', bearer('a'))
    .expect(200);
  assert.equal(emptyRes.body.reviews.length, 0);
});

test('IT-REV-08 GET /reviews/user/:userId enforces owner or admin access', async () => {
  const { app } = setup();

  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5 })
    .expect(201);

  // Owner access
  const own = await request(app)
    .get('/reviews/user/user-1')
    .set('Authorization', bearer('a'))
    .expect(200);
  assert.equal(own.body.reviews.length, 1);

  // Admin access
  const byAdmin = await request(app)
    .get('/reviews/user/user-1')
    .set('Authorization', bearer('c'))
    .expect(200);
  assert.equal(byAdmin.body.reviews.length, 1);

  // Other user access denied
  await request(app)
    .get('/reviews/user/user-1')
    .set('Authorization', bearer('b'))
    .expect(403);
});

test('IT-REV-09 GET /reviews/:id returns review or 404', async () => {
  const { app } = setup();

  const created = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 4 })
    .expect(201);

  const res = await request(app)
    .get(`/reviews/${created.body.review.id}`)
    .set('Authorization', bearer('a'))
    .expect(200);
  assert.equal(res.body.review.id, created.body.review.id);

  await request(app)
    .get('/reviews/unknown-id')
    .set('Authorization', bearer('a'))
    .expect(404);
});

test('IT-REV-10 GET /reviews requires admin role', async () => {
  const { app } = setup();

  await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5 })
    .expect(201);

  // Student forbidden
  await request(app)
    .get('/reviews')
    .set('Authorization', bearer('a'))
    .expect(403);

  // Admin success
  const res = await request(app)
    .get('/reviews')
    .set('Authorization', bearer('c'))
    .expect(200);
  assert.equal(res.body.reviews.length, 1);
});

test('IT-REV-11 auth verification and error handling', async () => {
  const { app } = setup();

  // Missing token
  await request(app).post('/reviews').send({ bookingId: 'b-completed', rating: 5 }).expect(401);

  // Invalid token format
  await request(app).post('/reviews').set('Authorization', 'Bearer 123').expect(401);

  // Live fake Auth returning 500
  const fakeAuth = await listen((req, res) => {
    res.writeHead(500).end();
  });
  try {
    const verifier = httpVerifier(fakeAuth.url, 1000);
    const failApp = createApp({ verifyToken: verifier, getBooking });
    await request(failApp)
      .post('/reviews')
      .set('Authorization', bearer('a'))
      .send({ bookingId: 'b-completed', rating: 5 })
      .expect(503);
  } finally {
    await fakeAuth.close();
  }
});

test('IT-REV-12 booking client failure returns 503 BOOKING_UNAVAILABLE', async () => {
  // Booking server down/unreachable
  const lookup = httpBookingLookup('http://127.0.0.1:1', 500);
  const app = createApp({ verifyToken, getBooking: lookup });

  const res = await request(app)
    .post('/reviews')
    .set('Authorization', bearer('a'))
    .send({ bookingId: 'b-completed', rating: 5 })
    .expect(503);

  assert.equal(res.body.error, 'BOOKING_UNAVAILABLE');
});

test('IT-REV-13 GET /health smoke test', async () => {
  const { app } = setup();
  const res = await request(app).get('/health').expect(200);
  assert.deepEqual(res.body, { status: 'ok', service: 'review' });
});

test('IT-REV-14 booking aliases cannot bypass duplicate protection', async () => {
  const seen = [];
  const upstream = http.createServer((req, res) => {
    seen.push(req.url);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ booking: { id: 'canonical', userId: 'user-1', resourceId: 'room-101', status: 'COMPLETED' } }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  try {
    const lookup = httpBookingLookup(`http://127.0.0.1:${upstream.address().port}`);
    assert.equal((await lookup('canonical', 'Bearer token')).id, 'canonical');
    for (const alias of ['canonical?duplicate=1', 'canonical#fragment', 'canonical/../canonical']) {
      await assert.rejects(lookup(alias, 'Bearer token'), { code: 'BOOKING_UNAVAILABLE' });
    }
    assert.deepEqual(seen, ['/bookings/canonical', '/bookings/canonical%3Fduplicate%3D1', '/bookings/canonical%23fragment', '/bookings/canonical%2F..%2Fcanonical']);
  } finally {
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
  }
});
