import express, { ErrorRequestHandler, Request } from "express";
import { BookingError, BookingService, bookingInput } from "./bookings";
import { VerifyToken } from "./auth-client";
import { GetResource } from "./resource-client";
import { Notify } from "./notification-client";

export type AppOptions = { service?: BookingService; verifyToken: VerifyToken; getResource: GetResource; notify: Notify };
const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export function createApp({ service = new BookingService(), verifyToken, getResource, notify }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "booking" }));
  app.use(express.json({ limit: "8kb" }));
  const actor = (req: Request) => verifyToken(req.get("authorization"));

  app.post("/bookings", async (req, res) => {
    const user = await actor(req);
    const input = bookingInput(req.body);
    const resource = await getResource(input.resourceId, req.get("authorization") as string);
    if (!resource.active) throw new BookingError(409, "RESOURCE_INACTIVE");
    const booking = service.create(user, input);
    const notificationSent = await notify({ userId: booking.userId, bookingId: booking.id, type: "BOOKING_CREATED",
      message: `Booking confirmed: ${resource.name.slice(0, 100)}, ${when(booking.startTime)} - ${when(booking.endTime)}` });
    res.status(201).json({ booking, notificationSent });
  });
  app.get("/bookings", async (req, res) => {
    res.json({ bookings: service.list(await actor(req), req.query) });
  });
  app.get("/bookings/user/:userId", async (req, res) => {
    res.json({ bookings: service.listForUser(req.params.userId, await actor(req)) });
  });
  app.get("/bookings/:id", async (req, res) => {
    res.json({ booking: service.get(req.params.id, await actor(req)) });
  });
  app.patch("/bookings/:id/cancel", async (req, res) => {
    const booking = service.cancel(req.params.id, await actor(req));
    const notificationSent = await notify({ userId: booking.userId, bookingId: booking.id, type: "BOOKING_CANCELLED",
      message: `Booking cancelled: ${booking.resourceId}, ${when(booking.startTime)} - ${when(booking.endTime)}` });
    res.json({ booking, notificationSent });
  });

  app.get("/closures", async (req, res) => {
    await actor(req);
    res.json({ closures: service.listClosures(req.query.resourceId) });
  });
  app.post("/closures", async (req, res) => {
    res.status(201).json({ closure: service.addClosure(await actor(req), req.body) });
  });
  app.delete("/closures/:id", async (req, res) => {
    service.removeClosure(req.params.id, await actor(req));
    res.status(204).end();
  });

  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof BookingError) { res.status(error.status).json({ error: error.code }); return; }
    if (error.type === "entity.parse.failed") { res.status(400).json({ error: "INVALID_JSON" }); return; }
    if (error.type === "entity.too.large") { res.status(413).json({ error: "PAYLOAD_TOO_LARGE" }); return; }
    console.error("Unhandled booking request error", error);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(errors);
  return app;
}
