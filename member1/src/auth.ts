import { randomBytes, randomUUID, scrypt, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export type PublicUser = { id: string; email: string; role: "student" | "admin" };
type User = PublicUser & { salt: string; hash: Buffer };
export class AuthError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function credentials(body: unknown): { email: string; password: string } {
  if (!body || typeof body !== "object") throw new AuthError(400, "INVALID_INPUT");
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new AuthError(400, "INVALID_INPUT");
  }
  return { email: email.trim().toLowerCase(), password };
}
const publicUser = (user: User): PublicUser => ({ id: user.id, email: user.email, role: user.role });
const tokenKey = (token: string) => createHash("sha256").update(token).digest("hex");

// Classroom single-process storage: restarting the service clears all data.
export class AuthService {
  private users = new Map<string, User>();
  private sessions = new Map<string, { email: string; expiresAt: number }>();
  constructor(private ttlSeconds = 3600, private now = () => Date.now()) {
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 86400) {
      throw new Error("TOKEN_TTL_SECONDS must be an integer between 1 and 86400");
    }
  }
  async register(body: unknown): Promise<PublicUser> {
    return this.createUser(body, "student");
  }
  async provisionAdmin(body: unknown): Promise<PublicUser> {
    return this.createUser(body, "admin");
  }
  private async createUser(body: unknown, role: PublicUser["role"]): Promise<PublicUser> {
    const { email, password } = credentials(body);
    const salt = randomBytes(16).toString("hex");
    const hash = await derive(password, salt, 64) as Buffer;
    // Recheck after async hashing to prevent concurrent duplicate registrations.
    if (this.users.has(email)) throw new AuthError(409, "EMAIL_ALREADY_EXISTS");
    const user: User = { id: randomUUID(), email, role, salt, hash };
    this.users.set(email, user);
    return publicUser(user);
  }
  async login(body: unknown) {
    const { email, password } = credentials(body);
    const user = this.users.get(email);
    const hash = await derive(password, user?.salt ?? "invalid-user-salt", 64) as Buffer;
    if (!user || !timingSafeEqual(user.hash, hash)) throw new AuthError(401, "INVALID_CREDENTIALS");
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= this.now()) this.sessions.delete(key);
    }
    const token = randomBytes(32).toString("hex");
    this.sessions.set(tokenKey(token), { email, expiresAt: this.now() + this.ttlSeconds * 1000 });
    return { token, expiresIn: this.ttlSeconds, user: publicUser(user) };
  }
  verify(token: unknown): PublicUser {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new AuthError(401, "INVALID_TOKEN");
    const key = tokenKey(token);
    const session = this.sessions.get(key);
    if (!session || session.expiresAt <= this.now()) {
      this.sessions.delete(key);
      throw new AuthError(401, "INVALID_TOKEN");
    }
    const user = this.users.get(session.email);
    if (!user) throw new AuthError(401, "INVALID_TOKEN");
    return publicUser(user);
  }
}

export function adminCredentials(env: Record<string, string | undefined>): ReturnType<typeof credentials> | undefined {
  if (env.ADMIN_EMAIL === undefined && env.ADMIN_PASSWORD === undefined) return undefined;
  if (env.ADMIN_EMAIL === undefined || env.ADMIN_PASSWORD === undefined) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured together");
  return credentials({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
}
