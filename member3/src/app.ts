import express, { ErrorRequestHandler } from "express";
import {
  ResourceError,
  ResourceService,
  validateCreateInput,
  validateUpdateInput,
} from "./resources";
import { OptionalVerifyToken, VerifyToken } from "./auth-client";

export type AppOptions = {
  service?: ResourceService;
  verifyToken?: VerifyToken;
  verifyOptionalToken?: OptionalVerifyToken;
};

export function createApp({
  service = new ResourceService(),
  verifyToken,
  verifyOptionalToken,
}: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "resource" }));

  app.use(express.json({ limit: "8kb" }));

  // List resources: public/students see only active resources (REQ-RES-01); admin can see all or filter.
  app.get("/resources", async (req, res) => {
    const authHeader = req.get("authorization");
    let user = null;
    if (verifyOptionalToken) {
      user = await verifyOptionalToken(authHeader);
    }

    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const isAdmin = user?.role === "admin";

    if (!isAdmin) {
      // Non-admin always gets activeOnly: true
      return res.json({ resources: service.list({ activeOnly: true, type }) });
    }

    // Admin can specify active filter or get all by default
    let active: boolean | undefined = undefined;
    if (req.query.active === "true") active = true;
    else if (req.query.active === "false") active = false;

    return res.json({ resources: service.list({ active, type }) });
  });

  // Get single resource (called by Booking or clients)
  app.get("/resources/:id", async (req, res) => {
    const authHeader = req.get("authorization");
    if (verifyOptionalToken && authHeader) {
      await verifyOptionalToken(authHeader);
    }
    const resource = service.get(req.params.id);
    if (!resource) {
      throw new ResourceError(404, "RESOURCE_NOT_FOUND");
    }
    return res.json({ resource });
  });

  // Create resource (Admin only)
  app.post("/resources", async (req, res) => {
    if (!verifyToken) throw new ResourceError(503, "AUTH_UNAVAILABLE");
    const user = await verifyToken(req.get("authorization"));
    if (user.role !== "admin") throw new ResourceError(403, "FORBIDDEN");

    const input = validateCreateInput(req.body);
    const resource = service.create(input);
    return res.status(201).json({ resource });
  });

  // Update resource (Admin only)
  app.patch("/resources/:id", async (req, res) => {
    if (!verifyToken) throw new ResourceError(503, "AUTH_UNAVAILABLE");
    const user = await verifyToken(req.get("authorization"));
    if (user.role !== "admin") throw new ResourceError(403, "FORBIDDEN");

    const updates = validateUpdateInput(req.body);
    const resource = service.update(req.params.id, updates);
    return res.json({ resource });
  });

  // Delete resource (Admin only)
  app.delete("/resources/:id", async (req, res) => {
    if (!verifyToken) throw new ResourceError(503, "AUTH_UNAVAILABLE");
    const user = await verifyToken(req.get("authorization"));
    if (user.role !== "admin") throw new ResourceError(403, "FORBIDDEN");

    service.delete(req.params.id);
    return res.status(204).end();
  });

  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));

  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ResourceError) {
      res.status(error.status).json({ error: error.code });
      return;
    }
    if (error.type === "entity.parse.failed") {
      res.status(400).json({ error: "INVALID_JSON" });
      return;
    }
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "PAYLOAD_TOO_LARGE" });
      return;
    }
    console.error("Unhandled resource request error", error);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(errors);

  return app;
}
