import { createApp } from "./app";
import { httpVerifier } from "./auth-client";
import { httpResourceLookup } from "./resource-client";
import { httpNotifier } from "./notification-client";

const port = Number(process.env.PORT ?? 3004);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const serviceKey = process.env.SERVICE_KEY ?? "";
if (serviceKey.length < 16) throw new Error("SERVICE_KEY must be at least 16 characters");
const url = (name: string, fallback: string) => (process.env[name] ?? fallback).replace(/\/+$/, "");
const app = createApp({
  verifyToken: httpVerifier(url("AUTH_URL", "http://localhost:3001")),
  getResource: httpResourceLookup(url("RESOURCE_URL", "http://localhost:3003")),
  notify: httpNotifier(url("NOTIFICATION_URL", "http://localhost:3002"), serviceKey),
});
const server = app.listen(port, () => console.log(`Booking service listening on port ${port}`));
server.on("error", (error) => { console.error(error); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
