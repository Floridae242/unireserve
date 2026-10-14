export type BookingEvent = {
  userId: string; bookingId: string; type: "BOOKING_CREATED" | "BOOKING_CANCELLED"; message: string;
};
export type Notify = (event: BookingEvent) => Promise<boolean>;

// Best effort: the booking is already saved, so a failure is logged and reported as notificationSent: false.
// Notification de-duplicates userId + bookingId + type, so retrying the same event is safe.
export function httpNotifier(notificationUrl: string, serviceKey: string, timeoutMs = 3000, attempts = 2): Notify {
  return async (event) => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetch(`${notificationUrl}/notifications`, {
          method: "POST", headers: { "Content-Type": "application/json", "X-Service-Key": serviceKey },
          body: JSON.stringify(event), signal: AbortSignal.timeout(timeoutMs),
        });
        await response.body?.cancel();
        if (response.ok) return true;
        if (response.status < 500) break; // 4xx means a bad request or key; retrying will not help.
      } catch {
        // Network error or timeout: try again.
      }
    }
    console.error(`Notification ${event.type} failed for booking ${event.bookingId}`);
    return false;
  };
}
