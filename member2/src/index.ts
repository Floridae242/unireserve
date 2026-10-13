import { createApp } from "./app";
import { httpVerifier } from "./auth-client";

const port = Number(process.env.PORT ?? 3002);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const serviceKey = process.env.SERVICE_KEY ?? "";
if (serviceKey.length < 16) throw new Error("SERVICE_KEY must be at least 16 characters");
const authUrl = (process.env.AUTH_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const app = createApp({ verifyToken: httpVerifier(authUrl), serviceKey });
const server = app.listen(port, () => console.log(`Notification service listening on port ${port}`));
server.on("error", (error) => { console.error(error); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
