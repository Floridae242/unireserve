const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotificationService, notificationInput } = require('../dist/notifications');
const input = { userId: 'user-1', bookingId: 'booking-1', type: 'BOOKING_CREATED', message: 'Room A booked' };

test('UT-NOTI-01 validates and trims input', () => {
  assert.equal(notificationInput({ ...input, message: '  hi  ' }).message, 'hi');
  assert.equal(notificationInput({ ...input, bookingId: undefined }).bookingId, null);
  for (const body of [null, {}, { ...input, userId: ' ' }, { ...input, type: 'OTHER' },
    { ...input, message: '' }, { ...input, message: 'x'.repeat(501) }, { ...input, bookingId: 42 }]) {
    assert.throws(() => notificationInput(body), { code: 'INVALID_INPUT' });
  }
});
test('UT-NOTI-02 create stores unread notification linked to booking and user', () => {
  const service = new NotificationService(() => 0);
  const { notification, created } = service.create(input);
  assert.equal(created, true);
  assert.equal(notification.read, false);
  assert.equal(notification.bookingId, 'booking-1');
  assert.equal(notification.createdAt, '1970-01-01T00:00:00.000Z');
});
test('UT-NOTI-03 retrying the same booking event does not duplicate', () => {
  const service = new NotificationService();
  const first = service.create(input).notification;
  const retry = service.create(input);
  assert.equal(retry.created, false);
  assert.equal(retry.notification.id, first.id);
  assert.equal(service.create({ ...input, type: 'BOOKING_CANCELLED' }).created, true);
  assert.equal(service.listForUser('user-1').length, 2);
});
test('UT-NOTI-04 list returns only own notifications, newest first', () => {
  let now = 1000;
  const service = new NotificationService(() => now);
  service.create({ ...input, bookingId: 'b1' }); now = 2000;
  service.create({ ...input, bookingId: 'b2' });
  service.create({ ...input, userId: 'user-2' });
  assert.deepEqual(service.listForUser('user-1').map(n => n.bookingId), ['b2', 'b1']);
  assert.deepEqual(service.listForUser('nobody'), []);
});
test('UT-NOTI-05 markRead enforces ownership and existence', () => {
  const service = new NotificationService();
  const { notification } = service.create(input);
  assert.throws(() => service.markRead(notification.id, 'user-2'), { code: 'FORBIDDEN' });
  assert.throws(() => service.markRead('missing', 'user-1'), { code: 'NOTIFICATION_NOT_FOUND' });
  assert.equal(service.markRead(notification.id, 'user-1').read, true);
  assert.equal(service.markRead(notification.id, 'user-1').read, true);
});
