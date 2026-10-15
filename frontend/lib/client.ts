import type { Resource, Booking } from "./types";
export const errors: Record<string, string> = {
  UNAUTHENTICATED: "กรุณาเข้าสู่ระบบอีกครั้ง",
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบอีกครั้ง",
  FORBIDDEN: "คุณไม่มีสิทธิ์ทำรายการนี้",
  BOOKING_TIME_CONFLICT: "ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่",
  BOOKING_PERIOD_CLOSED: "ช่วงเวลานี้ปิดรับการจอง",
  RESOURCE_INACTIVE: "ทรัพยากรนี้ยังไม่เปิดให้จอง",
  INVALID_CREDENTIALS: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  EMAIL_EXISTS: "อีเมลนี้ถูกใช้แล้ว",
  INVALID_INPUT: "กรุณาตรวจสอบข้อมูลอีกครั้ง",
  AUTH_UNAVAILABLE: "บริการเข้าสู่ระบบยังไม่พร้อม กรุณาลองใหม่",
  SERVICE_UNAVAILABLE: "บริการยังไม่พร้อม กรุณาลองใหม่ภายหลัง",
  INVALID_TIME_RANGE: "เลือกเวลาเริ่มในอนาคต และเวลาสิ้นสุดหลังเวลาเริ่ม",
  BOOKING_NOT_CANCELLABLE: "ไม่สามารถยกเลิกการจองนี้ได้",
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers:
      method !== "GET" ? { "Content-Type": "application/json" } : undefined,
    body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined,
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ error: "SERVICE_UNAVAILABLE" }));
  if (response.status === 401 && typeof window !== "undefined")
    window.dispatchEvent(new Event("session-expired"));
  if (!response.ok)
    throw new ApiError(
      errors[data.error] ?? `ทำรายการไม่สำเร็จ (${response.status})`,
      response.status,
    );
  return data;
}
export function filterResources(
  items: Resource[],
  query: string,
  type: string,
  capacity: number,
) {
  return items.filter(
    (r) =>
      (!query ||
        `${r.name} ${r.description}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!type || r.type === type) &&
      r.capacity >= capacity,
  );
}
export function bookingRange(start: string, end: string, now = Date.now()) {
  const a = new Date(start).getTime(),
    b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new Error("กรุณาระบุวันและเวลาเริ่มและสิ้นสุดให้ครบถ้วน");
  if (a <= now)
    throw new Error("เวลาเริ่มผ่านไปแล้ว กรุณาเลือกเวลาเริ่มใหม่ที่อยู่ในอนาคต");
  if (b <= a)
    throw new Error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");
  return {
    startTime: new Date(a).toISOString(),
    endTime: new Date(b).toISOString(),
  };
}
export const canCancel = (b: Booking, now = Date.now()) =>
  b.status === "CONFIRMED" && new Date(b.startTime).getTime() > now;
export const dateTime = (s: string) =>
  new Date(s).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
