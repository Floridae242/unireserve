import { createApp } from "./app";
import { httpVerifier } from "./auth-client";

const port = Number(process.env.PORT ?? 3003);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const url = (name: string, fallback: string) => (process.env[name] ?? fallback).replace(/\/+$/, "");

const { verify, verifyOptional } = httpVerifier(url("AUTH_URL", "http://localhost:3001"));
const app = createApp({
  verifyToken: verify,
  verifyOptionalToken: verifyOptional,
});

const server = app.listen(port, () => console.log(`Resource service listening on port ${port}`));
server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
