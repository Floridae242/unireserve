const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ReviewService, reviewInput } = require('../dist/reviews');

const T0 = Date.parse('2030-01-01T12:00:00.000Z');
const student = { id: 'user-1', role: 'student' };
const otherStudent = { id: 'user-2', role: 'student' };
const admin = { id: 'admin-1', role: 'admin' };

const completedBooking = (bookingId = 'book-1', userId = 'user-1', resourceId = 'room-a') => ({
  id: bookingId,
  userId,
  resourceId,
  status: 'COMPLETED',
});

const confirmedBooking = (bookingId = 'book-2', userId = 'user-1', resourceId = 'room-a') => ({
  id: bookingId,
  userId,
  resourceId,
  status: 'CONFIRMED',
});

const cancelledBooking = (bookingId = 'book-3', userId = 'user-1', resourceId = 'room-a') => ({
  id: bookingId,
  userId,
  resourceId,
  status: 'CANCELLED',
});

const setup = () => {
  const clock = { now: T0 };
  return { clock, service: new ReviewService(() => clock.now) };
};

test('UT-REV-01 validates review input, rating range [1-5] and comment length', () => {
  const valid = reviewInput({ bookingId: 'book-1', rating: 5, comment: 'Great room!' });
  assert.deepEqual(valid, { bookingId: 'book-1', rating: 5, comment: 'Great room!' });

  // Optional comment omitted or empty
  assert.equal(reviewInput({ bookingId: 'book-1', rating: 3 }).comment, null);
  assert.equal(reviewInput({ bookingId: 'book-1', rating: 3, comment: '   ' }).comment, null);
  assert.equal(reviewInput({ bookingId: 'book-1', rating: 3, comment: null }).comment, null);

  // Invalid bodies
  for (const body of [
    null,
    undefined,
    {},
    { bookingId: '', rating: 5 },
    { bookingId: '   ', rating: 5 },
    { bookingId: 'x'.repeat(65), rating: 5 },
    { bookingId: 123, rating: 5 },
    { bookingId: 'book-1', rating: 0 },
    { bookingId: 'book-1', rating: 6 },
    { bookingId: 'book-1', rating: -1 },
    { bookingId: 'book-1', rating: 3.5 },
    { bookingId: 'book-1', rating: '5' },
    { bookingId: 'book-1', rating: null },
    { bookingId: 'book-1', rating: 5, comment: 'x'.repeat(501) },
    { bookingId: 'book-1', rating: 5, comment: 123 },
  ]) {
    assert.throws(() => reviewInput(body), { status: 400, code: 'INVALID_INPUT' });
  }
});

test('UT-REV-02 owner can review completed booking', () => {
  const { service } = setup();
  const input = reviewInput({ bookingId: 'book-1', rating: 5, comment: 'Clean and quiet' });
  const review = service.create(student, input, completedBooking('book-1', 'user-1', 'room-a'));

  assert.ok(review.id);
  assert.equal(review.bookingId, 'book-1');
  assert.equal(review.userId, 'user-1');
  assert.equal(review.resourceId, 'room-a');
  assert.equal(review.rating, 5);
  assert.equal(review.comment, 'Clean and quiet');
  assert.equal(review.createdAt, new Date(T0).toISOString());
});

test('UT-REV-03 duplicate review for the same booking throws 409 REVIEW_ALREADY_EXISTS', () => {
  const { service } = setup();
  const input = reviewInput({ bookingId: 'book-1', rating: 4 });
  service.create(student, input, completedBooking('book-1', 'user-1', 'room-a'));

  assert.throws(
    () => service.create(student, input, completedBooking('book-1', 'user-1', 'room-a')),
    { status: 409, code: 'REVIEW_ALREADY_EXISTS' }
  );
});

test('UT-REV-04 non-owner review throws 403 FORBIDDEN', () => {
  const { service } = setup();
  const input = reviewInput({ bookingId: 'book-1', rating: 4 });

  assert.throws(
    () => service.create(otherStudent, input, completedBooking('book-1', 'user-1', 'room-a')),
    { status: 403, code: 'FORBIDDEN' }
  );
});

test('UT-REV-05 review of non-completed booking throws 409 BOOKING_NOT_COMPLETED', () => {
  const { service } = setup();
  const input = reviewInput({ bookingId: 'book-confirmed', rating: 5 });

  assert.throws(
    () => service.create(student, input, confirmedBooking('book-confirmed', 'user-1', 'room-a')),
    { status: 409, code: 'BOOKING_NOT_COMPLETED' }
  );

  const input2 = reviewInput({ bookingId: 'book-cancelled', rating: 1 });
  assert.throws(
    () => service.create(student, input2, cancelledBooking('book-cancelled', 'user-1', 'room-a')),
    { status: 409, code: 'BOOKING_NOT_COMPLETED' }
  );
});

test('UT-REV-06 list reviews for resource returns only reviews for that resource sorted newest first', () => {
  const { clock, service } = setup();

  service.create(student, reviewInput({ bookingId: 'b-1', rating: 4 }), completedBooking('b-1', 'user-1', 'room-a'));
  clock.now += 1000;
  service.create(student, reviewInput({ bookingId: 'b-2', rating: 5 }), completedBooking('b-2', 'user-1', 'room-b'));
  clock.now += 1000;
  service.create(otherStudent, reviewInput({ bookingId: 'b-3', rating: 3 }), completedBooking('b-3', 'user-2', 'room-a'));

  const roomAReviews = service.listForResource('room-a');
  assert.equal(roomAReviews.length, 2);
  assert.equal(roomAReviews[0].bookingId, 'b-3');
  assert.equal(roomAReviews[1].bookingId, 'b-1');

  const roomBReviews = service.listForResource('room-b');
  assert.equal(roomBReviews.length, 1);
  assert.equal(roomBReviews[0].bookingId, 'b-2');

  assert.throws(() => service.listForResource(''), { status: 400, code: 'INVALID_INPUT' });
});

test('UT-REV-07 list reviews for user enforces ownership and authorization', () => {
  const { service } = setup();

  service.create(student, reviewInput({ bookingId: 'b-1', rating: 5 }), completedBooking('b-1', 'user-1', 'room-a'));
  service.create(otherStudent, reviewInput({ bookingId: 'b-2', rating: 2 }), completedBooking('b-2', 'user-2', 'room-a'));

  // Owner can view own reviews
  const own = service.listForUser('user-1', student);
  assert.equal(own.length, 1);
  assert.equal(own[0].bookingId, 'b-1');

  // Admin can view any user reviews
  const byAdmin = service.listForUser('user-1', admin);
  assert.equal(byAdmin.length, 1);

  // Other student cannot view user-1 reviews
  assert.throws(() => service.listForUser('user-1', otherStudent), { status: 403, code: 'FORBIDDEN' });
});

test('UT-REV-08 get review by id and getByBookingId', () => {
  const { service } = setup();
  const created = service.create(student, reviewInput({ bookingId: 'b-1', rating: 5 }), completedBooking('b-1', 'user-1', 'room-a'));

  const fetched = service.get(created.id);
  assert.equal(fetched.id, created.id);
  assert.throws(() => service.get('non-existent'), { status: 404, code: 'REVIEW_NOT_FOUND' });

  const byBooking = service.getByBookingId('b-1');
  assert.equal(byBooking?.id, created.id);
  assert.equal(service.getByBookingId('unknown'), null);
});

test('UT-REV-09 admin can list and filter all reviews', () => {
  const { service } = setup();
  service.create(student, reviewInput({ bookingId: 'b-1', rating: 5 }), completedBooking('b-1', 'user-1', 'room-a'));
  service.create(otherStudent, reviewInput({ bookingId: 'b-2', rating: 2 }), completedBooking('b-2', 'user-2', 'room-b'));

  // Non-admin rejected
  assert.throws(() => service.list(student), { status: 403, code: 'FORBIDDEN' });

  // Admin list all
  const all = service.list(admin);
  assert.equal(all.length, 2);

  // Admin filter by resourceId
  const filterResource = service.list(admin, { resourceId: 'room-a' });
  assert.equal(filterResource.length, 1);
  assert.equal(filterResource[0].bookingId, 'b-1');

  // Admin filter by rating
  const filterRating = service.list(admin, { rating: 2 });
  assert.equal(filterRating.length, 1);
  assert.equal(filterRating[0].bookingId, 'b-2');
});
