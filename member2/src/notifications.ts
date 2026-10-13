import { randomUUID } from "node:crypto";

export const NOTIFICATION_TYPES = ["BOOKING_CREATED", "BOOKING_CANCELLED", "REVIEW_REMINDER"] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];
export type Notification = {
  id: string; userId: string; bookingId: string | null; type: NotificationType;
  message: string; read: boolean; createdAt: string;
};
export class NotificationError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function notificationInput(body: unknown) {
  if (!body || typeof body !== "object") throw new NotificationError(400, "INVALID_INPUT");
  const { userId, bookingId, type, message } = body as Record<string, unknown>;
  const id = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 64;
  if (!id(userId) || (bookingId !== undefined && bookingId !== null && !id(bookingId)) ||
      !NOTIFICATION_TYPES.includes(type as NotificationType) ||
      typeof message !== "string" || message.trim().length === 0 || message.length > 500) {
    throw new NotificationError(400, "INVALID_INPUT");
  }
  return { userId: (userId as string).trim(), bookingId: bookingId ? (bookingId as string).trim() : null,
    type: type as NotificationType, message: message.trim() };
}

// Classroom single-process storage: restarting the service clears all data.
export class NotificationService {
  private notifications = new Map<string, Notification>();
  constructor(private now = () => Date.now()) {}
  // Same user + booking + type returns the existing record so Booking can retry safely.
  create(body: unknown): { notification: Notification; created: boolean } {
    const input = notificationInput(body);
    if (input.bookingId) {
      for (const existing of this.notifications.values()) {
        if (existing.userId === input.userId && existing.bookingId === input.bookingId &&
            existing.type === input.type) return { notification: existing, created: false };
      }
    }
    const notification: Notification = { id: randomUUID(), ...input, read: false,
      createdAt: new Date(this.now()).toISOString() };
    this.notifications.set(notification.id, notification);
    return { notification, created: true };
  }
  listForUser(userId: string): Notification[] {
    return [...this.notifications.values()].filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  markRead(id: string, userId: string): Notification {
    const notification = this.notifications.get(id);
    if (!notification) throw new NotificationError(404, "NOTIFICATION_NOT_FOUND");
    if (notification.userId !== userId) throw new NotificationError(403, "FORBIDDEN");
    notification.read = true;
    return notification;
  }
}
