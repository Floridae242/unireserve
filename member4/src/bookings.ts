import { randomUUID } from "node:crypto";

export const BOOKING_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];
export type Booking = {
  id: string; userId: string; resourceId: string; startTime: string; endTime: string; status: BookingStatus;
  createdAt: string; cancelledAt: string | null; cancelledBy: string | null;
};
export type Closure = {
  id: string; resourceId: string | null; startTime: string; endTime: string;
  reason: string | null; createdBy: string; createdAt: string;
};
export type Actor = { id: string; role: string };
export type BookingInput = { resourceId: string; start: number; end: number };
type Range = { start: number; end: number };
type BookingRecord = Range & {
  id: string; userId: string; resourceId: string; createdAt: number; cancelled: { at: number; by: string } | null;
};
type ClosureRecord = Range & { id: string; resourceId: string | null; reason: string | null; createdBy: string; createdAt: number };

export class BookingError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

const isAdmin = (actor: Actor) => actor.role === "admin";
const validId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 64;
const iso = (ms: number) => new Date(ms).toISOString();
// Half-open [start, end): a booking ending at 10:00 does not overlap one starting at 10:00.
const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end;
const byStart = (a: { startTime: string }, b: { startTime: string }) => a.startTime.localeCompare(b.startTime);

// Times must carry a timezone so every service reads the same instant.
const ISO_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;
function instant(value: unknown): number {
  const match = typeof value === "string" ? ISO_INSTANT.exec(value) : null;
  if (!match) throw new BookingError(400, "INVALID_INPUT");
  const [, year, month, day] = match.map(Number);
  // Date.parse may roll 2030-02-30 into March, so reject impossible calendar dates explicitly.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new BookingError(400, "INVALID_INPUT");
  return Date.parse(value as string);
}
function range(fields: Record<string, unknown>): Range {
  const start = instant(fields.startTime), end = instant(fields.endTime);
  if (start >= end) throw new BookingError(400, "INVALID_TIME_RANGE");
  return { start, end };
}
function fieldsOf(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") throw new BookingError(400, "INVALID_INPUT");
  return body as Record<string, unknown>;
}

export function bookingInput(body: unknown): BookingInput {
  const fields = fieldsOf(body);
  if (!validId(fields.resourceId)) throw new BookingError(400, "INVALID_INPUT");
  return { resourceId: fields.resourceId.trim(), ...range(fields) };
}

export function closureInput(body: unknown) {
  const fields = fieldsOf(body);
  const { resourceId, reason } = fields;
  if ((resourceId !== undefined && resourceId !== null && !validId(resourceId)) ||
      (reason !== undefined && reason !== null && (typeof reason !== "string" || reason.length > 200))) {
    throw new BookingError(400, "INVALID_INPUT");
  }
  return { resourceId: resourceId ? (resourceId as string).trim() : null,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : null, ...range(fields) };
}

// Classroom single-process storage: restarting the service clears all data.
export class BookingService {
  private bookings = new Map<string, BookingRecord>();
  private closures = new Map<string, ClosureRecord>();
  constructor(private now = () => Date.now()) {}

  // Bookings are confirmed automatically. Check and insert run synchronously with no await
  // in between, so concurrent requests for the same slot cannot both succeed.
  create(user: Actor, input: BookingInput): Booking {
    if (input.start < this.now()) throw new BookingError(400, "INVALID_TIME_RANGE");
    for (const closure of this.closures.values()) {
      if ((closure.resourceId === null || closure.resourceId === input.resourceId) && overlaps(closure, input)) {
        throw new BookingError(409, "BOOKING_PERIOD_CLOSED");
      }
    }
    for (const booking of this.bookings.values()) {
      if (booking.resourceId === input.resourceId && !booking.cancelled && overlaps(booking, input)) {
        throw new BookingError(409, "BOOKING_TIME_CONFLICT");
      }
    }
    const record: BookingRecord = { id: randomUUID(), userId: user.id, resourceId: input.resourceId,
      start: input.start, end: input.end, createdAt: this.now(), cancelled: null };
    this.bookings.set(record.id, record);
    return this.view(record);
  }
  get(id: string, actor: Actor): Booking {
    return this.view(this.owned(id, actor));
  }
  listForUser(userId: string, actor: Actor): Booking[] {
    if (userId !== actor.id && !isAdmin(actor)) throw new BookingError(403, "FORBIDDEN");
    return [...this.bookings.values()].filter(b => b.userId === userId).map(b => this.view(b)).sort(byStart);
  }
  list(actor: Actor, filter: Record<string, unknown>): Booking[] {
    if (!isAdmin(actor)) throw new BookingError(403, "FORBIDDEN");
    const { resourceId, userId, status } = filter;
    if ((resourceId !== undefined && typeof resourceId !== "string") ||
        (userId !== undefined && typeof userId !== "string") ||
        (status !== undefined && !BOOKING_STATUSES.includes(status as BookingStatus))) {
      throw new BookingError(400, "INVALID_INPUT");
    }
    return [...this.bookings.values()].map(b => this.view(b)).filter(b =>
      (resourceId === undefined || b.resourceId === resourceId) &&
      (userId === undefined || b.userId === userId) &&
      (status === undefined || b.status === status)).sort(byStart);
  }
  // Owners may cancel before the booking starts; admins may also cancel one in progress.
  cancel(id: string, actor: Actor): Booking {
    const record = this.owned(id, actor);
    const now = this.now();
    if (record.cancelled || now >= (isAdmin(actor) ? record.end : record.start)) {
      throw new BookingError(409, "BOOKING_NOT_CANCELLABLE");
    }
    record.cancelled = { at: now, by: actor.id };
    return this.view(record);
  }

  // Closures are admin-defined periods when a resource (or every resource, when resourceId is null)
  // cannot be booked. They block new bookings only; admins cancel existing ones explicitly.
  addClosure(actor: Actor, body: unknown): Closure {
    if (!isAdmin(actor)) throw new BookingError(403, "FORBIDDEN");
    const input = closureInput(body);
    const record: ClosureRecord = { id: randomUUID(), ...input, createdBy: actor.id, createdAt: this.now() };
    this.closures.set(record.id, record);
    return closureView(record);
  }
  listClosures(resourceId: unknown): Closure[] {
    if (resourceId !== undefined && !validId(resourceId)) throw new BookingError(400, "INVALID_INPUT");
    return [...this.closures.values()]
      .filter(c => resourceId === undefined || c.resourceId === null || c.resourceId === resourceId.trim())
      .map(closureView).sort(byStart);
  }
  removeClosure(id: string, actor: Actor): void {
    if (!isAdmin(actor)) throw new BookingError(403, "FORBIDDEN");
    if (!this.closures.delete(id)) throw new BookingError(404, "CLOSURE_NOT_FOUND");
  }

  private owned(id: string, actor: Actor): BookingRecord {
    const record = this.bookings.get(id);
    if (!record) throw new BookingError(404, "BOOKING_NOT_FOUND");
    if (record.userId !== actor.id && !isAdmin(actor)) throw new BookingError(403, "FORBIDDEN");
    return record;
  }
  // COMPLETED is derived from the clock: a confirmed booking whose end time has passed.
  private view(record: BookingRecord): Booking {
    const status: BookingStatus = record.cancelled ? "CANCELLED" : record.end <= this.now() ? "COMPLETED" : "CONFIRMED";
    return { id: record.id, userId: record.userId, resourceId: record.resourceId,
      startTime: iso(record.start), endTime: iso(record.end), status, createdAt: iso(record.createdAt),
      cancelledAt: record.cancelled ? iso(record.cancelled.at) : null, cancelledBy: record.cancelled?.by ?? null };
  }
}

function closureView(record: ClosureRecord): Closure {
  return { id: record.id, resourceId: record.resourceId, startTime: iso(record.start), endTime: iso(record.end),
    reason: record.reason, createdBy: record.createdBy, createdAt: iso(record.createdAt) };
}
