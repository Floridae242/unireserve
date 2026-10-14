import { NotificationError } from "./notifications";

export type AuthUser = { id: string; email: string; role: string };
export type VerifyToken = (authorization: string | undefined) => Promise<AuthUser>;

// Auth tokens are opaque, so every request is checked against member1's POST /auth/verify.
export function httpVerifier(authUrl: string, timeoutMs = 3000): VerifyToken {
  return async (authorization) => {
    if (!authorization || !/^Bearer [a-f0-9]{64}$/.test(authorization)) {
      throw new NotificationError(401, "INVALID_TOKEN");
    }
    let response: Response;
    try {
      response = await fetch(`${authUrl}/auth/verify`, {
        method: "POST", headers: { Authorization: authorization }, signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new NotificationError(503, "AUTH_UNAVAILABLE");
    }
    if (response.status === 401) throw new NotificationError(401, "INVALID_TOKEN");
    if (!response.ok) throw new NotificationError(503, "AUTH_UNAVAILABLE");
    try {
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("user" in body)) {
        throw new Error("Invalid Auth response");
      }
      const user = body.user;
      if (!user || typeof user !== "object" ||
          !("id" in user) || typeof user.id !== "string" || !user.id.trim() ||
          !("email" in user) || typeof user.email !== "string" || !user.email.trim() ||
          !("role" in user) || typeof user.role !== "string" || !user.role.trim()) {
        throw new Error("Invalid Auth user");
      }
      return { id: user.id, email: user.email, role: user.role };
    } catch {
      throw new NotificationError(503, "AUTH_UNAVAILABLE");
    }
  };
}
