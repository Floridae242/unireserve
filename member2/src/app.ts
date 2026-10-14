import { createHash, timingSafeEqual } from "node:crypto";
import express, { ErrorRequestHandler } from "express";
import { NotificationError, NotificationService } from "./notifications";
import { VerifyToken } from "./auth-client";

export type AppOptions = { service?: NotificationService; verifyToken: VerifyToken; serviceKey: string };
const digest = (value: string) => createHash("sha256").update(value).digest();

export function createApp({ service = new NotificationService(), verifyToken, serviceKey }: AppOptions) {
  // Only internal services (e.g. Booking) holding the shared key may create notifications.
  const isInternal = (key: string | undefined) => key !== undefined && timingSafeEqual(digest(key), digest(serviceKey));
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification" }));
  app.use(express.json({ limit: "8kb" }));
  app.post("/notifications", (req, res) => {
    if (!isInternal(req.get("x-service-key"))) throw new NotificationError(401, "INVALID_SERVICE_KEY");
    const { notification, created } = service.create(req.body);
    res.status(created ? 201 : 200).json({ notification });
  });
  app.get("/notifications/user/:userId", async (req, res) => {
    const user = await verifyToken(req.get("authorization"));
    if (user.id !== req.params.userId) throw new NotificationError(403, "FORBIDDEN");
    res.json({ notifications: service.listForUser(user.id) });
  });
  app.patch("/notifications/:id/read", async (req, res) => {
    const user = await verifyToken(req.get("authorization"));
    res.json({ notification: service.markRead(req.params.id, user.id) });
  });
  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof NotificationError) { res.status(error.status).json({ error: error.code }); return; }
    if (error.type === "entity.parse.failed") { res.status(400).json({ error: "INVALID_JSON" }); return; }
    if (error.type === "entity.too.large") { res.status(413).json({ error: "PAYLOAD_TOO_LARGE" }); return; }
    console.error("Unhandled notification request error", error);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(errors);
  return app;
}
