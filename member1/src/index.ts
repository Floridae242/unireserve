import { createApp } from "./app";
import { adminCredentials, AuthService } from "./auth";
async function start() {
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  const service = new AuthService(Number(process.env.TOKEN_TTL_SECONDS ?? 3600));
  const admin = adminCredentials(process.env);
  if (admin) await service.provisionAdmin(admin);
  const server = createApp(service).listen(port, () => console.log(`Auth service listening on port ${port}`));
  server.on("error", () => { console.error("Auth service failed to listen"); process.exitCode = 1; });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
void start().catch(() => {
  console.error("Auth startup failed: check PORT, TOKEN_TTL_SECONDS and optional ADMIN_EMAIL/ADMIN_PASSWORD");
  process.exitCode = 1;
});
