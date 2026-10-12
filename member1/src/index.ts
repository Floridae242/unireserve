import { createApp } from "./app";
import { AuthService } from "./auth";

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const service = new AuthService(Number(process.env.TOKEN_TTL_SECONDS ?? 3600));
const server = createApp(service).listen(port, () => console.log(`Auth service listening on port ${port}`));
server.on("error", (error) => { console.error(error); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
