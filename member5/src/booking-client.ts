import { BookingSummary, ReviewError } from "./reviews";

export type GetBooking = (bookingId: string, authorization: string) => Promise<BookingSummary>;

export function httpBookingLookup(bookingUrl: string, timeoutMs = 3000): GetBooking {
  return async (bookingId, authorization) => {
    let response: Response;
    try {
      response = await fetch(`${bookingUrl}/bookings/${bookingId}`, {
        method: "GET",
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ReviewError(503, "BOOKING_UNAVAILABLE");
    }

    if (response.status === 404) throw new ReviewError(404, "BOOKING_NOT_FOUND");
    if (response.status === 403) throw new ReviewError(403, "FORBIDDEN");
    if (response.status === 401) throw new ReviewError(401, "INVALID_TOKEN");
    if (!response.ok) throw new ReviewError(503, "BOOKING_UNAVAILABLE");

    try {
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("booking" in body)) {
        throw new Error("Invalid booking response structure");
      }
      const b = (body as Record<string, unknown>).booking as Record<string, unknown>;
      if (
        !b ||
        typeof b !== "object" ||
        typeof b.id !== "string" ||
        typeof b.userId !== "string" ||
        typeof b.resourceId !== "string" ||
        typeof b.status !== "string"
      ) {
        throw new Error("Invalid booking fields");
      }
      return {
        id: b.id,
        userId: b.userId,
        resourceId: b.resourceId,
        status: b.status,
      };
    } catch {
      throw new ReviewError(503, "BOOKING_UNAVAILABLE");
    }
  };
}
