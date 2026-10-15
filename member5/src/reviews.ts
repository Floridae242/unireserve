import { randomUUID } from "node:crypto";

export type Review = {
  id: string;
  bookingId: string;
  userId: string;
  resourceId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type Actor = { id: string; role: string; email?: string };

export type BookingSummary = {
  id: string;
  userId: string;
  resourceId: string;
  status: string;
};

export type ReviewInput = {
  bookingId: string;
  rating: number;
  comment: string | null;
};

export class ReviewError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

const isAdmin = (actor: Actor) => actor.role === "admin";
const validId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 64;

export function reviewInput(body: unknown): ReviewInput {
  if (!body || typeof body !== "object") {
    throw new ReviewError(400, "INVALID_INPUT");
  }
  const fields = body as Record<string, unknown>;
  const { bookingId, rating, comment } = fields;

  if (!validId(bookingId)) {
    throw new ReviewError(400, "INVALID_INPUT");
  }

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewError(400, "INVALID_INPUT");
  }

  let parsedComment: string | null = null;
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== "string" || comment.length > 500) {
      throw new ReviewError(400, "INVALID_INPUT");
    }
    const trimmed = comment.trim();
    parsedComment = trimmed.length > 0 ? trimmed : null;
  }

  return {
    bookingId: bookingId.trim(),
    rating,
    comment: parsedComment,
  };
}

export class ReviewService {
  private reviews = new Map<string, Review>();

  constructor(private now = () => Date.now()) {}

  create(actor: Actor, input: ReviewInput, booking: BookingSummary): Review {
    // A booking can only be reviewed once
    for (const existing of this.reviews.values()) {
      if (existing.bookingId === input.bookingId) {
        throw new ReviewError(409, "REVIEW_ALREADY_EXISTS");
      }
    }

    // Only the owner of the booking can leave a review
    if (booking.userId !== actor.id) {
      throw new ReviewError(403, "FORBIDDEN");
    }

    // Only completed bookings can be reviewed
    if (booking.status !== "COMPLETED") {
      throw new ReviewError(409, "BOOKING_NOT_COMPLETED");
    }

    const review: Review = {
      id: randomUUID(),
      bookingId: input.bookingId,
      userId: actor.id,
      resourceId: booking.resourceId,
      rating: input.rating,
      comment: input.comment,
      createdAt: new Date(this.now()).toISOString(),
    };

    this.reviews.set(review.id, review);
    return review;
  }

  get(id: string): Review {
    const review = this.reviews.get(id);
    if (!review) throw new ReviewError(404, "REVIEW_NOT_FOUND");
    return review;
  }

  getByBookingId(bookingId: string): Review | null {
    for (const r of this.reviews.values()) {
      if (r.bookingId === bookingId) return r;
    }
    return null;
  }

  listForResource(resourceId: unknown): Review[] {
    if (!validId(resourceId)) throw new ReviewError(400, "INVALID_INPUT");
    const target = resourceId.trim();
    return [...this.reviews.values()]
      .filter((r) => r.resourceId === target)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listForUser(userId: string, actor: Actor): Review[] {
    if (!validId(userId)) throw new ReviewError(400, "INVALID_INPUT");
    if (userId !== actor.id && !isAdmin(actor)) {
      throw new ReviewError(403, "FORBIDDEN");
    }
    return [...this.reviews.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  list(actor: Actor, filter: Record<string, unknown> = {}): Review[] {
    if (!isAdmin(actor)) throw new ReviewError(403, "FORBIDDEN");
    const { resourceId, userId, rating } = filter;
    if (
      (resourceId !== undefined && typeof resourceId !== "string") ||
      (userId !== undefined && typeof userId !== "string") ||
      (rating !== undefined && (typeof rating !== "string" && typeof rating !== "number"))
    ) {
      throw new ReviewError(400, "INVALID_INPUT");
    }
    const numRating = rating !== undefined ? Number(rating) : undefined;
    return [...this.reviews.values()]
      .filter(
        (r) =>
          (resourceId === undefined || r.resourceId === resourceId) &&
          (userId === undefined || r.userId === userId) &&
          (numRating === undefined || r.rating === numRating)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
