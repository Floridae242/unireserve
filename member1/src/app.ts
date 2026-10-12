import express, { ErrorRequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { AuthError, AuthService } from "./auth";

export function createApp(service = new AuthService()) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth" }));
  app.use("/auth", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "TOO_MANY_REQUESTS" } }));
  app.use(express.json({ limit: "8kb" }));
  app.post("/auth/register", async (req, res) => res.status(201).json({ user: await service.register(req.body) }));
  app.post("/auth/login", async (req, res) => res.json(await service.login(req.body)));
  app.post("/auth/verify", (req, res) => {
    const token = req.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    res.json({ valid: true, user: service.verify(token) });
  });
  app.get("/users/:id", (req, res) => {
    const token = req.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const user = service.verify(token);
    if (user.id !== req.params.id) throw new AuthError(403, "FORBIDDEN");
    res.json({ user });
  });
  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AuthError) { res.status(error.status).json({ error: error.code }); return; }
    if (error.type === "entity.parse.failed") { res.status(400).json({ error: "INVALID_JSON" }); return; }
    if (error.type === "entity.too.large") { res.status(413).json({ error: "PAYLOAD_TOO_LARGE" }); return; }
    console.error("Unhandled auth request error", error);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(errors);
  return app;
}
