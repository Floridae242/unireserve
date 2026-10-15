import test from "node:test";
import assert from "node:assert/strict";
import { filterResources, bookingRange, canCancel } from "../lib/client";
const resources = [
  {
    id: "1",
    name: "Meeting room",
    description: "quiet",
    type: "room",
    capacity: 8,
    active: true,
  },
  {
    id: "2",
    name: "Projector",
    description: "HD",
    type: "equipment",
    capacity: 1,
    active: false,
  },
];
test("resource search combines text, type and capacity", () => {
  assert.equal(filterResources(resources, "meeting", "room", 5).length, 1);
  assert.equal(filterResources(resources, "meeting", "equipment", 0).length, 0);
  assert.equal(filterResources(resources, "", "", 10).length, 0);
});
test("booking validates ordered future instants and converts timezone", () => {
  assert.deepEqual(
    bookingRange("2030-01-02T10:00:00+07:00", "2030-01-02T11:00:00+07:00", 0),
    {
      startTime: "2030-01-02T03:00:00.000Z",
      endTime: "2030-01-02T04:00:00.000Z",
    },
  );
  assert.throws(() => bookingRange("bad", "bad", 0), /กรุณาระบุวัน/);
  assert.throws(() => bookingRange("2030-01-02", "2030-01-01", 0), /เวลาสิ้นสุดต้อง/);
  assert.throws(() => bookingRange("2020-01-01", "2020-01-02", Date.now()), /เวลาเริ่มผ่านไปแล้ว/);
  const now = Date.parse("2026-10-15T20:36:00+07:00");
  assert.throws(() => bookingRange("2026-10-15T20:35:00+07:00", "2026-10-16T07:35:00+07:00", now), /เวลาเริ่มผ่านไปแล้ว/);
});
test("only future confirmed bookings expose cancellation", () => {
  const b = {
    id: "1",
    userId: "u",
    resourceId: "r",
    startTime: "2030-01-01",
    endTime: "2030-01-02",
    status: "CONFIRMED",
  };
  assert.equal(canCancel(b, 0), true);
  assert.equal(canCancel({ ...b, status: "CANCELLED" }, 0), false);
  assert.equal(canCancel(b, new Date("2030-01-02").getTime()), false);
});

test("client sends JSON for empty mutations and preserves auth status", async () => {
  const { api, ApiError } = await import("../lib/client");
  const original = globalThis.fetch;
  try {
    let options: RequestInit | undefined;
    globalThis.fetch = async (_url, init) => {
      options = init;
      return new Response(JSON.stringify({ error: "UNAUTHENTICATED" }), {
        status: 401,
      });
    };
    await assert.rejects(
      api("/auth/logout", "POST"),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );
    assert.equal(options?.body, "{}");
    assert.deepEqual(options?.headers, { "Content-Type": "application/json" });
  } finally {
    globalThis.fetch = original;
  }
});
