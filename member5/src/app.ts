import express, { ErrorRequestHandler, Request } from "express";
import { ReviewError, ReviewService, reviewInput } from "./reviews";
import { VerifyToken } from "./auth-client";
import { GetBooking } from "./booking-client";

export type AppOptions = {
  service?: ReviewService;
  verifyToken: VerifyToken;
  getBooking: GetBooking;
};

export function createApp({ service = new ReviewService(), verifyToken, getBooking }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "review" }));
  app.use(express.json({ limit: "8kb" }));

  const actor = (req: Request) => verifyToken(req.get("authorization"));

  app.post("/reviews", async (req, res) => {
    const user = await actor(req);
    const input = reviewInput(req.body);
    const booking = await getBooking(input.bookingId, req.get("authorization") as string);
    const review = service.create(user, input, booking);
    res.status(201).json({ review });
  });

  app.get("/reviews/resource/:resourceId", async (req, res) => {
    await actor(req);
    res.json({ reviews: service.listForResource(req.params.resourceId) });
  });

  app.get("/reviews/user/:userId", async (req, res) => {
    const user = await actor(req);
    res.json({ reviews: service.listForUser(req.params.userId, user) });
  });

  app.get("/reviews/:id", async (req, res) => {
    await actor(req);
    res.json({ review: service.get(req.params.id) });
  });

  app.get("/reviews", async (req, res) => {
    const user = await actor(req);
    res.json({ reviews: service.list(user, req.query) });
  });

  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));

  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ReviewError) {
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
    console.error("Unhandled review request error", error);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(errors);

  return app;
}
