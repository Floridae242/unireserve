const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BookingService, bookingInput } = require('../dist/bookings');

const HOUR = 3_600_000;
const T0 = Date.parse('2030-01-01T08:00:00.000Z');
const at = (hours) => new Date(T0 + hours * HOUR).toISOString();
const slot = (start, end, resourceId = 'room-a') => bookingInput({ resourceId, startTime: at(start), endTime: at(end) });
const student = { id: 'user-1', role: 'student' };
const other = { id: 'user-2', role: 'student' };
const admin = { id: 'admin-1', role: 'admin' };
const setup = () => {
  const clock = { now: T0 };
  return { clock, service: new BookingService(() => clock.now) };
};

test('UT-BOOK-01 validates input, timezone-aware instants and start < end', () => {
  const parsed = bookingInput({ resourceId: ' room-a ', startTime: '2030-01-01T15:00:00+07:00', endTime: '2030-01-01T09:00Z' });
  assert.deepEqual(parsed, { resourceId: 'room-a', start: T0, end: T0 + HOUR });
  const valid = { resourceId: 'room-a', startTime: at(1), endTime: at(2) };
  for (const body of [null, {}, { ...valid, resourceId: ' ' }, { ...valid, resourceId: 'x'.repeat(65) },
    { ...valid, resourceId: 7 }, { ...valid, startTime: 'tomorrow' }, { ...valid, startTime: '2030-01-01' },
    { ...valid, startTime: '2030-01-01T10:00:00' }, { ...valid, startTime: '2030-02-30T10:00:00Z' },
    { ...valid, endTime: '2030-01-01T24:00:00Z' }, { ...valid, endTime: 1893484800000 }]) {
    assert.throws(() => bookingInput(body), { status: 400, code: 'INVALID_INPUT' });
  }
  assert.throws(() => slot(2, 2), { status: 400, code: 'INVALID_TIME_RANGE' });
  assert.throws(() => slot(3, 2), { status: 400, code: 'INVALID_TIME_RANGE' });
});

test('UT-BOOK-02 bookings are confirmed automatically and cannot start in the past', () => {
  const { service } = setup();
  const booking = service.create(student, slot(1, 2));
  assert.equal(booking.status, 'CONFIRMED');
  assert.equal(booking.userId, 'user-1');
  assert.equal(booking.startTime, at(1));
  assert.equal(booking.cancelledAt, null);
  assert.equal(service.create(student, slot(0, 1, 'room-b')).status, 'CONFIRMED');
  assert.throws(() => service.create(student, slot(-1, 1, 'room-c')), { status: 400, code: 'INVALID_TIME_RANGE' });
});

test('UT-BOOK-03 overlapping slots on the same resource conflict; [start, end) edges do not', () => {
  const { service } = setup();
  const first = service.create(student, slot(1, 3));
  for (const [start, end] of [[2, 4], [0.5, 1.5], [1.5, 2.5], [0.5, 4], [1, 3]]) {
    assert.throws(() => service.create(other, slot(start, end)), { status: 409, code: 'BOOKING_TIME_CONFLICT' });
  }
  service.create(other, slot(3, 4));
  service.create(other, slot(0.5, 1));
  service.create(other, slot(1, 3, 'room-b'));
  service.cancel(first.id, student);
  assert.equal(service.create(other, slot(1, 3)).status, 'CONFIRMED');
});

test('UT-BOOK-04 admin closures block new bookings per resource or globally', () => {
  const { service } = setup();
  const closed = { resourceId: 'room-a', startTime: at(10), endTime: at(12), reason: 'Maintenance' };
  assert.throws(() => service.addClosure(student, closed), { status: 403, code: 'FORBIDDEN' });
  assert.throws(() => service.addClosure(admin, { ...closed, endTime: at(9) }), { code: 'INVALID_TIME_RANGE' });
  assert.throws(() => service.addClosure(admin, { ...closed, reason: 'x'.repeat(201) }), { code: 'INVALID_INPUT' });
  const roomClosure = service.addClosure(admin, closed);
  assert.equal(roomClosure.createdBy, 'admin-1');
  const globalClosure = service.addClosure(admin, { startTime: at(20), endTime: at(22) });
  assert.equal(globalClosure.resourceId, null);
  assert.throws(() => service.create(student, slot(11, 13)), { status: 409, code: 'BOOKING_PERIOD_CLOSED' });
  service.create(student, slot(11, 13, 'room-b'));
  service.create(student, slot(12, 13));
  assert.throws(() => service.create(student, slot(21, 23, 'room-b')), { code: 'BOOKING_PERIOD_CLOSED' });
  assert.deepEqual(service.listClosures('room-a').map(c => c.id), [roomClosure.id, globalClosure.id]);
  assert.deepEqual(service.listClosures('room-b').map(c => c.id), [globalClosure.id]);
  assert.throws(() => service.listClosures(''), { code: 'INVALID_INPUT' });
  assert.throws(() => service.removeClosure(roomClosure.id, student), { code: 'FORBIDDEN' });
  service.removeClosure(roomClosure.id, admin);
  assert.throws(() => service.removeClosure(roomClosure.id, admin), { status: 404, code: 'CLOSURE_NOT_FOUND' });
  assert.equal(service.create(student, slot(10, 11)).status, 'CONFIRMED');
});

test('UT-BOOK-05 status becomes COMPLETED once the end time passes, unless cancelled', () => {
  const { clock, service } = setup();
  const booking = service.create(student, slot(1, 2));
  const cancelled = service.create(student, slot(3, 4));
  service.cancel(cancelled.id, student);
  clock.now = T0 + 2 * HOUR - 1;
  assert.equal(service.get(booking.id, student).status, 'CONFIRMED');
  clock.now = T0 + 2 * HOUR;
  assert.equal(service.get(booking.id, student).status, 'COMPLETED');
  clock.now = T0 + 5 * HOUR;
  assert.equal(service.get(cancelled.id, student).status, 'CANCELLED');
});

test('UT-BOOK-06 owners cancel before start; admins may cancel until the end', () => {
  const { clock, service } = setup();
  const early = service.create(student, slot(1, 2));
  assert.throws(() => service.cancel(early.id, other), { status: 403, code: 'FORBIDDEN' });
  assert.throws(() => service.cancel('missing', student), { status: 404, code: 'BOOKING_NOT_FOUND' });
  const cancelled = service.cancel(early.id, student);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.cancelledBy, 'user-1');
  assert.equal(cancelled.cancelledAt, at(0));
  assert.throws(() => service.cancel(early.id, student), { status: 409, code: 'BOOKING_NOT_CANCELLABLE' });
  const running = service.create(student, slot(3, 4));
  clock.now = T0 + 3.5 * HOUR;
  assert.throws(() => service.cancel(running.id, student), { code: 'BOOKING_NOT_CANCELLABLE' });
  assert.equal(service.cancel(running.id, admin).cancelledBy, 'admin-1');
  const finished = service.create(student, slot(5, 6));
  clock.now = T0 + 6 * HOUR;
  assert.throws(() => service.cancel(finished.id, admin), { code: 'BOOKING_NOT_CANCELLABLE' });
});

test('UT-BOOK-07 read access is owner or admin; full list and filters are admin only', () => {
  const { service } = setup();
  const later = service.create(student, slot(5, 6));
  const sooner = service.create(student, slot(1, 2, 'room-b'));
  const others = service.create(other, slot(1, 2));
  service.cancel(others.id, other);
  assert.throws(() => service.get(later.id, other), { status: 403, code: 'FORBIDDEN' });
  assert.equal(service.get(later.id, admin).id, later.id);
  assert.deepEqual(service.listForUser('user-1', student).map(b => b.id), [sooner.id, later.id]);
  assert.deepEqual(service.listForUser('nobody', admin), []);
  assert.throws(() => service.listForUser('user-1', other), { code: 'FORBIDDEN' });
  assert.throws(() => service.list(student, {}), { status: 403, code: 'FORBIDDEN' });
  assert.equal(service.list(admin, {}).length, 3);
  assert.deepEqual(service.list(admin, { resourceId: 'room-a' }).map(b => b.id), [others.id, later.id]);
  assert.deepEqual(service.list(admin, { status: 'CANCELLED' }).map(b => b.id), [others.id]);
  assert.deepEqual(service.list(admin, { userId: 'user-2' }).map(b => b.id), [others.id]);
  assert.throws(() => service.list(admin, { status: 'DONE' }), { status: 400, code: 'INVALID_INPUT' });
  assert.throws(() => service.list(admin, { resourceId: ['a', 'b'] }), { code: 'INVALID_INPUT' });
});
