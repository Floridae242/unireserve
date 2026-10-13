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
    const body = await response.json() as { user?: AuthUser };
    if (!body.user?.id) throw new NotificationError(503, "AUTH_UNAVAILABLE");
    return body.user;
  };
}
