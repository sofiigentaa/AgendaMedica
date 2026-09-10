import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = 'agenda_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // jornada de consultorio
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const SCRYPT_KEYLEN = 64;

export type SessionRecord = {
  username: string;
  createdAt: number;
  expiresAt: number;
};

export type LoginResult =
  | { ok: true; token: string; username: string }
  | { ok: false; status: number; error: string };

type FailedAttempt = {
  count: number;
  lockedUntil: number;
};

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  const len = Math.max(aBuf.length, bBuf.length);
  const aPad = Buffer.alloc(len);
  const bPad = Buffer.alloc(len);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  const sameLen = aBuf.length === bBuf.length;
  return timingSafeEqual(aPad, bPad) && sameLen;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function resolveAdminCredentials(): { username: string; password: string } {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (isProduction() && !password) {
    throw new Error(
      'ADMIN_PASSWORD es obligatorio en producción. Definilo en el entorno antes de iniciar el servidor.'
    );
  }
  return {
    username: username || 'admin',
    password: password || 'EsteticaLaser.2026'
  };
}

export async function hashPassword(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
}

export function createAuthController() {
  const { username: adminUsername, password: adminPassword } = resolveAdminCredentials();
  const passwordSalt = randomBytes(16);
  let passwordHash: Buffer | null = null;
  const hashReady = hashPassword(adminPassword, passwordSalt).then((hash) => {
    passwordHash = hash;
  });

  const sessions = new Map<string, SessionRecord>();
  const failedByIp = new Map<string, FailedAttempt>();

  function pruneSessions(now = Date.now()) {
    for (const [token, session] of sessions) {
      if (session.expiresAt <= now) sessions.delete(token);
    }
  }

  function getLock(ip: string, now = Date.now()): FailedAttempt {
    const existing = failedByIp.get(ip);
    if (!existing) {
      const fresh: FailedAttempt = { count: 0, lockedUntil: 0 };
      failedByIp.set(ip, fresh);
      return fresh;
    }
    if (existing.lockedUntil && existing.lockedUntil <= now) {
      existing.count = 0;
      existing.lockedUntil = 0;
    }
    return existing;
  }

  async function verifyPassword(candidate: string): Promise<boolean> {
    await hashReady;
    if (!passwordHash) return false;
    const candidateHash = await hashPassword(candidate, passwordSalt);
    if (candidateHash.length !== passwordHash.length) return false;
    return timingSafeEqual(candidateHash, passwordHash);
  }

  function createSession(username: string): string {
    pruneSessions();
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    sessions.set(token, {
      username,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS
    });
    return token;
  }

  function setSessionCookie(res: Response, token: string) {
    const parts = [
      `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
    ];
    if (isProduction()) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  function clearSessionCookie(res: Response) {
    const secure = isProduction() ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
    );
  }

  function readSession(req: Request): SessionRecord | null {
    pruneSessions();
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return null;
    }
    return session;
  }

  async function login(req: Request): Promise<LoginResult> {
    await hashReady;
    const ip = clientIp(req);
    const now = Date.now();
    const lock = getLock(ip, now);
    if (lock.lockedUntil > now) {
      return {
        ok: false,
        status: 429,
        error: 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.'
      };
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return { ok: false, status: 400, error: 'Ingresá usuario y contraseña.' };
    }

    const userOk = timingSafeStringEqual(username, adminUsername);
    const passOk = await verifyPassword(password);

    if (!userOk || !passOk) {
      lock.count += 1;
      if (lock.count >= MAX_FAILED_ATTEMPTS) {
        lock.lockedUntil = now + LOCKOUT_MS;
        return {
          ok: false,
          status: 429,
          error: 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.'
        };
      }
      return { ok: false, status: 401, error: 'Usuario o contraseña incorrectos.' };
    }

    failedByIp.delete(ip);
    const token = createSession(adminUsername);
    return { ok: true, token, username: adminUsername };
  }

  function logout(req: Request) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) sessions.delete(token);
  }

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const session = readSession(req);
    if (!session) {
      res.status(401).json({ error: 'Sesión requerida.' });
      return;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    next();
  }

  function applyLoginCookie(res: Response, token: string) {
    setSessionCookie(res, token);
  }

  return {
    adminUsername,
    login,
    logout,
    readSession,
    requireAuth,
    applyLoginCookie,
    clearSessionCookie,
    // exposed for tests
    _sessions: sessions,
    _failedByIp: failedByIp
  };
}

export type AuthController = ReturnType<typeof createAuthController>;

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  const scriptSrc = isProduction()
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ')
  );
  next();
}
