const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { ResourceService, ResourceError } = require('../dist/resources');

const users = {
  a: { id: 'student-1', email: 'alice@example.test', role: 'student' },
  b: { id: 'student-2', email: 'bob@example.test', role: 'student' },
  c: { id: 'admin-1', email: 'admin@example.test', role: 'admin' },
};

const bearer = (char) => `Bearer ${char.repeat(64)}`;

const verifyToken = async (header) => {
  const char = /^Bearer ([abc])\1{63}$/.exec(header ?? '')?.[1];
  if (!char) throw new ResourceError(401, 'INVALID_TOKEN');
  return users[char];
};

const verifyOptionalToken = async (header) => {
  if (!header) return null;
  return verifyToken(header);
};

const setup = (seedDefaults = false) => {
  const service = new ResourceService(() => '2026-10-15T00:00:00Z', seedDefaults);
  const app = createApp({ service, verifyToken, verifyOptionalToken });
  return { app, service };
};

test('IT-RES-01 health check returns 200 ok', async () => {
  const { app } = setup();
  const res = await request(app).get('/health').expect(200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'resource');
});

test('IT-RES-02 public and student GET /resources returns only active resources (REQ-RES-01)', async () => {
  const { app, service } = setup();
  service.create({ id: 'res-act-1', name: 'Active Room 1', active: true });
  service.create({ id: 'res-act-2', name: 'Active Room 2', active: true });
  service.create({ id: 'res-inact-1', name: 'Inactive Room 1', active: false });

  // 1. Public request (no token)
  const pubRes = await request(app).get('/resources').expect(200);
  assert.equal(pubRes.body.resources.length, 2);
  assert.ok(pubRes.body.resources.every((r) => r.active === true));

  // 2. Student request (role: student)
  const studentRes = await request(app)
    .get('/resources')
    .set('Authorization', bearer('a'))
    .expect(200);
  assert.equal(studentRes.body.resources.length, 2);
  assert.ok(studentRes.body.resources.every((r) => r.active === true));
});

test('IT-RES-03 admin GET /resources can view all resources or filter', async () => {
  const { app, service } = setup();
  service.create({ id: 'res-act-1', name: 'Active Room 1', active: true });
  service.create({ id: 'res-inact-1', name: 'Inactive Room 1', active: false });

  // Admin view all
  const adminAll = await request(app)
    .get('/resources')
    .set('Authorization', bearer('c'))
    .expect(200);
  assert.equal(adminAll.body.resources.length, 2);

  // Admin view inactive only
  const adminInactive = await request(app)
    .get('/resources?active=false')
    .set('Authorization', bearer('c'))
    .expect(200);
  assert.equal(adminInactive.body.resources.length, 1);
  assert.equal(adminInactive.body.resources[0].id, 'res-inact-1');
});

test('IT-RES-04 GET /resources/:id returns 200 with resource or 404', async () => {
  const { app, service } = setup();
  service.create({ id: 'lab-1', name: 'Computer Lab 1', active: true });
  service.create({ id: 'lab-2', name: 'Under Repair', active: false });

  // Active resource
  const res1 = await request(app).get('/resources/lab-1').expect(200);
  assert.equal(res1.body.resource.id, 'lab-1');
  assert.equal(res1.body.resource.active, true);

  // Inactive resource (returns 200 with active: false, needed by Booking Service contract)
  const res2 = await request(app).get('/resources/lab-2').expect(200);
  assert.equal(res2.body.resource.id, 'lab-2');
  assert.equal(res2.body.resource.active, false);

  // Missing resource
  const resMissing = await request(app).get('/resources/not-found-id').expect(404);
  assert.equal(resMissing.body.error, 'RESOURCE_NOT_FOUND');
});

test('IT-RES-05 Admin POST, PATCH, DELETE succeed; student/unauthenticated are denied', async () => {
  const { app } = setup();

  // Student attempts POST -> 403
  await request(app)
    .post('/resources')
    .set('Authorization', bearer('a'))
    .send({ name: 'Unauthorized Room' })
    .expect(403);

  // Unauthenticated attempts POST -> 401
  await request(app)
    .post('/resources')
    .send({ name: 'Unauthorized Room' })
    .expect(401);

  // Admin POST -> 201
  const created = await request(app)
    .post('/resources')
    .set('Authorization', bearer('c'))
    .send({
      id: 'conf-room',
      name: 'Conference Room',
      type: 'room',
      capacity: 50,
      active: true,
    })
    .expect(201);
  assert.equal(created.body.resource.id, 'conf-room');

  // Student attempts PATCH -> 403
  await request(app)
    .patch('/resources/conf-room')
    .set('Authorization', bearer('a'))
    .send({ name: 'New Name' })
    .expect(403);

  // Admin PATCH -> 200
  const updated = await request(app)
    .patch('/resources/conf-room')
    .set('Authorization', bearer('c'))
    .send({ active: false, capacity: 60 })
    .expect(200);
  assert.equal(updated.body.resource.active, false);
  assert.equal(updated.body.resource.capacity, 60);

  // Student attempts DELETE -> 403
  await request(app)
    .delete('/resources/conf-room')
    .set('Authorization', bearer('a'))
    .expect(403);

  // Admin DELETE -> 204
  await request(app)
    .delete('/resources/conf-room')
    .set('Authorization', bearer('c'))
    .expect(204);

  // Resource now gone -> 404
  await request(app).get('/resources/conf-room').expect(404);
});

test('IT-RES-06 common error handling: 404 on unknown route, 400 on malformed json', async () => {
  const { app } = setup();

  // Unknown route
  const notFound = await request(app).get('/unknown-endpoint').expect(404);
  assert.equal(notFound.body.error, 'NOT_FOUND');

  // Bad json
  const badJson = await request(app)
    .post('/resources')
    .set('Authorization', bearer('c'))
    .set('Content-Type', 'application/json')
    .send('{ broken: json')
    .expect(400);
  assert.equal(badJson.body.error, 'INVALID_JSON');
});

test('IT-RES-07 unknown and deleted rooms return 404 and PATCH cannot recreate them', async () => {
  const { app, service } = setup();
  for (const id of ['room-unknown', 'inactive-unknown']) {
    const missing = await request(app).get(`/resources/${id}`).expect(404);
    assert.equal(missing.body.error, 'RESOURCE_NOT_FOUND');
    const patch = await request(app).patch(`/resources/${id}`)
      .set('Authorization', bearer('c')).send({ name: 'Unexpected creation' }).expect(404);
    assert.equal(patch.body.error, 'RESOURCE_NOT_FOUND');
  }
  service.create({ id: 'room-deleted', name: 'Deleted Room' });
  await request(app).delete('/resources/room-deleted').set('Authorization', bearer('c')).expect(204);
  await request(app).get('/resources/room-deleted').expect(404);
  await request(app).patch('/resources/room-deleted').set('Authorization', bearer('c'))
    .send({ active: true }).expect(404);
  assert.equal(service.list().length, 0);
});
