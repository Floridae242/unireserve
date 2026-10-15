export const SESSION_COOKIE = 'unireserve_session';
type Service = 'AUTH_URL' | 'RESOURCE_URL' | 'BOOKING_URL' | 'NOTIFICATION_URL' | 'REVIEW_URL';
type Options = { fetch?: typeof fetch; env?: Record<string, string | undefined> };
class GatewayError extends Error { constructor(public status: number, message: string) { super(message); } }
const defaults: Record<Service, string> = { AUTH_URL: 'http://localhost:3001', NOTIFICATION_URL: 'http://localhost:3002', RESOURCE_URL: 'http://localhost:3003', BOOKING_URL: 'http://localhost:3004', REVIEW_URL: 'http://localhost:3005' };
const routes: [RegExp, string[], Service][] = [
  [/^resources$/, ['GET', 'POST'], 'RESOURCE_URL'],
  [/^resources\/[a-zA-Z0-9_-]+$/, ['GET', 'PATCH', 'DELETE'], 'RESOURCE_URL'],
  [/^bookings$/, ['GET', 'POST'], 'BOOKING_URL'],
  [/^bookings\/user\/[a-zA-Z0-9_-]+$/, ['GET'], 'BOOKING_URL'],
  [/^bookings\/[a-zA-Z0-9_-]+$/, ['GET'], 'BOOKING_URL'],
  [/^bookings\/[a-zA-Z0-9_-]+\/cancel$/, ['PATCH'], 'BOOKING_URL'],
  [/^closures$/, ['GET', 'POST'], 'BOOKING_URL'],
  [/^closures\/[a-zA-Z0-9_-]+$/, ['DELETE'], 'BOOKING_URL'],
  [/^notifications\/user\/[a-zA-Z0-9_-]+$/, ['GET'], 'NOTIFICATION_URL'],
  [/^notifications\/[a-zA-Z0-9_-]+\/read$/, ['PATCH'], 'NOTIFICATION_URL'],
  [/^reviews$/, ['GET', 'POST'], 'REVIEW_URL'],
  [/^reviews\/(?:resource|user)\/[a-zA-Z0-9_-]+$/, ['GET'], 'REVIEW_URL'],
  [/^reviews\/[a-zA-Z0-9_-]+$/, ['GET'], 'REVIEW_URL'],
];
function publicUser(value: unknown) {
  if (!value || typeof value !== 'object') throw new GatewayError(503, 'SERVICE_UNAVAILABLE');
  const u = value as Record<string, unknown>;
  if (typeof u.id !== 'string' || typeof u.email !== 'string' || !['student', 'admin'].includes(String(u.role))) throw new GatewayError(503, 'SERVICE_UNAVAILABLE');
  return { id: u.id, email: u.email, role: u.role };
}
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/^(token|password|hash|salt|secret)$/i.test(key)).map(([k,v]) => [k, clean(v)]));
  return value;
}
async function bodyJson(req: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') ?? '')) throw new GatewayError(415, 'JSON_REQUIRED');
  const reader = req.body?.getReader();
  if (!reader) throw new GatewayError(400, 'INVALID_JSON');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new GatewayError(413, 'PAYLOAD_TOO_LARGE'); }
    chunks.push(value);
  }
  const joined = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
  try { return JSON.stringify(JSON.parse(new TextDecoder().decode(joined))); } catch { throw new GatewayError(400, 'INVALID_JSON'); }
}
export async function handleApi(req: Request, options: Options = {}): Promise<Response> {
  const env = options.env ?? process.env; const transport = options.fetch ?? fetch;
  const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
  const respond = (data: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
  const cookie = (token: string, ttl: number) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${(env.COOKIE_SECURE === 'true' || (env.COOKIE_SECURE !== 'false' && env.NODE_ENV === 'production')) ? '; Secure' : ''}`;
  try {
    const url = new URL(req.url); const path = url.pathname.replace(/^\/api\//, '');
    const mutating = ['POST', 'PATCH', 'DELETE'].includes(req.method);
    if (mutating) {
      let expectedOrigin = url.origin;
      if (env.APP_ORIGIN !== undefined) {
        let configured: URL;
        try { configured = new URL(env.APP_ORIGIN); } catch { throw new GatewayError(503, 'INVALID_CONFIG'); }
        if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password || configured.pathname !== '/' || configured.search || configured.hash) throw new GatewayError(503, 'INVALID_CONFIG');
        expectedOrigin = configured.origin;
      } else if (env.NODE_ENV === 'production') {
        throw new GatewayError(503, 'INVALID_CONFIG');
      }
      if (req.headers.get('origin') !== expectedOrigin) throw new GatewayError(403, 'INVALID_ORIGIN');
    }
    const token = req.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    const validToken = token && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
    async function upstream(service: Service, target: string, method: string, body?: string) {
      const base = new URL(env[service] ?? defaults[service]);
      if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new GatewayError(503, 'SERVICE_UNAVAILABLE');
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await transport(new URL(target, base), { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(validToken ? { Authorization: `Bearer ${validToken}` } : {}) }, body, signal: controller.signal, cache: 'no-store', redirect: 'error' });
        if (response.status === 204) return { status: 204, data: null };
        const data = await response.json() as Record<string, unknown>;
        if (!response.ok) {
          const retry = response.headers.get('retry-after');
          if (response.status === 429 && retry && /^\d{1,6}$/.test(retry)) headers.set('Retry-After', retry);
          const status = response.status >= 400 && response.status < 500 ? response.status : 503;
          const code = typeof data?.error === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(data.error) ? data.error : 'SERVICE_UNAVAILABLE';
          throw new GatewayError(status, code);
        }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new GatewayError(503, 'SERVICE_UNAVAILABLE');
        return { status: response.status, data };
      } catch (error) { if (error instanceof GatewayError) throw error; throw new GatewayError(503, 'SERVICE_UNAVAILABLE'); }
      finally { clearTimeout(timer); }
    }
    if (path === 'auth/logout' && req.method === 'POST') { await bodyJson(req); headers.set('Set-Cookie', cookie('', 0)); return respond({ ok: true }); }
    if (path === 'auth/session' && req.method === 'GET') {
      if (!validToken) throw new GatewayError(401, 'UNAUTHENTICATED');
      const result = await upstream('AUTH_URL', '/auth/verify', 'POST');
      if (result.data?.valid !== true) throw new GatewayError(503, 'SERVICE_UNAVAILABLE');
      return respond({ user: publicUser(result.data?.user) });
    }
    if (['auth/login', 'auth/register'].includes(path) && req.method === 'POST') {
      const result = await upstream('AUTH_URL', `/${path}`, 'POST', await bodyJson(req));
      const user = publicUser(result.data?.user);
      if (path === 'auth/login') {
        const data = result.data!;
        if (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token) || !Number.isSafeInteger(data.expiresIn) || Number(data.expiresIn) < 1) throw new GatewayError(503, 'SERVICE_UNAVAILABLE');
        headers.set('Set-Cookie', cookie(data.token, Math.min(Number(data.expiresIn), 86400)));
      }
      return respond({ user }, result.status);
    }
    const route = routes.find(([pattern, methods]) => pattern.test(path) && methods.includes(req.method));
    if (!route) throw new GatewayError(404, 'NOT_FOUND');
    if (!(path.startsWith('resources') && req.method === 'GET') && !validToken) throw new GatewayError(401, 'UNAUTHENTICATED');
    const body = mutating ? await bodyJson(req) : undefined;
    const result = await upstream(route[2], `/${path}${url.search}`, req.method, body);
    return respond(clean(result.data), result.status);
  } catch (error) {
    if (error instanceof GatewayError) return respond({ error: error.message }, error.status);
    return respond({ error: 'SERVICE_UNAVAILABLE' }, 503);
  }
}
