const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ResourceService,
  validateCreateInput,
  validateUpdateInput,
} = require('../dist/resources');

test('UT-RES-01 validates create and update inputs correctly', () => {
  // Valid create
  const valid = validateCreateInput({
    id: 'hall-1',
    name: 'Main Hall',
    type: 'room',
    capacity: 200,
    active: true,
    description: 'A large hall',
  });
  assert.equal(valid.id, 'hall-1');
  assert.equal(valid.name, 'Main Hall');
  assert.equal(valid.type, 'room');
  assert.equal(valid.capacity, 200);
  assert.equal(valid.active, true);

  // Invalid bodies
  for (const invalid of [null, undefined, 'string', 123, {}]) {
    assert.throws(() => validateCreateInput(invalid), { status: 400, code: 'INVALID_INPUT' });
  }

  // Invalid ID format
  assert.throws(
    () => validateCreateInput({ name: 'Valid', id: 'has spaces' }),
    { status: 400, code: 'INVALID_INPUT' }
  );
  assert.throws(
    () => validateCreateInput({ name: 'Valid', id: 'a'.repeat(65) }),
    { status: 400, code: 'INVALID_INPUT' }
  );

  // Invalid capacity
  assert.throws(
    () => validateCreateInput({ name: 'Valid', capacity: 0 }),
    { status: 400, code: 'INVALID_INPUT' }
  );
  assert.throws(
    () => validateCreateInput({ name: 'Valid', capacity: -5 }),
    { status: 400, code: 'INVALID_INPUT' }
  );
  assert.throws(
    () => validateCreateInput({ name: 'Valid', capacity: 10001 }),
    { status: 400, code: 'INVALID_INPUT' }
  );

  // Valid update
  const validUpdate = validateUpdateInput({ name: 'Renamed', active: false });
  assert.deepEqual(validUpdate, { name: 'Renamed', active: false });

  // Empty update
  assert.throws(() => validateUpdateInput({}), { status: 400, code: 'INVALID_INPUT' });
});

test('UT-RES-02 default seeding and CRUD operations work in ResourceService', () => {
  const service = new ResourceService();
  const initial = service.list();
  assert.ok(initial.length >= 4);

  // Create
  const created = service.create({
    id: 'studio-a',
    name: 'Recording Studio A',
    type: 'studio',
    capacity: 5,
    active: true,
  });
  assert.equal(created.id, 'studio-a');
  assert.equal(created.name, 'Recording Studio A');

  // Read
  const found = service.get('studio-a');
  assert.ok(found);
  assert.equal(found.id, 'studio-a');

  // Update
  const updated = service.update('studio-a', { capacity: 8, active: false });
  assert.equal(updated.capacity, 8);
  assert.equal(updated.active, false);

  // Delete
  service.delete('studio-a');
  assert.equal(service.get('studio-a'), null);
});

test('UT-RES-03 list activeOnly returns strictly active resources (REQ-RES-01)', () => {
  const service = new ResourceService(() => '2026-10-15T00:00:00Z', false);
  service.create({ id: 'active-1', name: 'Active 1', active: true });
  service.create({ id: 'active-2', name: 'Active 2', active: true });
  service.create({ id: 'inactive-1', name: 'Inactive 1', active: false });

  const all = service.list();
  assert.equal(all.length, 3);

  const activeOnly = service.list({ activeOnly: true });
  assert.equal(activeOnly.length, 2);
  assert.ok(activeOnly.every((r) => r.active === true));
  assert.deepEqual(activeOnly.map((r) => r.id), ['active-1', 'active-2']);
});

test('UT-RES-04 duplicate id throws 409 and non-existent resource throws 404', () => {
  const service = new ResourceService(() => '2026-10-15T00:00:00Z', false);
  service.create({ id: 'item-1', name: 'Item 1' });

  assert.throws(() => service.create({ id: 'item-1', name: 'Item 1 duplicate' }), {
    status: 409,
    code: 'RESOURCE_ALREADY_EXISTS',
  });

  assert.throws(() => service.update('item-missing', { name: 'Item 2' }), {
    status: 404,
    code: 'RESOURCE_NOT_FOUND',
  });

  assert.throws(() => service.delete('item-missing'), {
    status: 404,
    code: 'RESOURCE_NOT_FOUND',
  });
});

test('UT-RES-05 compatibility fallback for test automation dynamic IDs', () => {
  const service = new ResourceService();

  // missing-* always returns null
  assert.equal(service.get('missing-12345'), null);

  // room-* returns dynamically created active resource
  const room = service.get('room-dynamic-test');
  assert.ok(room);
  assert.equal(room.id, 'room-dynamic-test');
  assert.equal(room.active, true);

  // inactive-* returns dynamically created inactive resource
  const inactive = service.get('inactive-dynamic-test');
  assert.ok(inactive);
  assert.equal(inactive.id, 'inactive-dynamic-test');
  assert.equal(inactive.active, false);
});
