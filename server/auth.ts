import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const COOKIE_NAME = 'agenda_session';
const SESSION_HOURS = 12;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET no está configurado. Definilo como variable de entorno (ver README) antes de arrancar el servidor.'
    );
  }
  return secret;
}

function getPasswordHash(): string {
  const hash = process.env.AUTH_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      'AUTH_PASSWORD_HASH no está configurado. Generalo con "node scripts/hash-password.mjs <contraseña>" y definilo como variable de entorno (ver README).'
    );
  }
  return hash;
}

// Blunts brute-force guessing of the single shared clinic password — this
// app has no per-user accounts to lock out individually, so the login route
// itself is the only thing standing between an internet-exposed deployment
// and someone trying passwords in a loop. Configurable via env so the E2E
// suite (which legitimately logs in once per test) can raise it well above
// the production default instead of tripping over its own test traffic.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá unos minutos antes de volver a intentar.' }
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  try {
    jwt.verify(token, getSecret());
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Falta la contraseña' });
      return;
    }

    let isValid: boolean;
    try {
      isValid = await bcrypt.compare(password, getPasswordHash());
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error de configuración del servidor' });
      return;
    }

    if (!isValid) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }

    const token = jwt.sign({ clinic: true }, getSecret(), { expiresIn: `${SESSION_HOURS}h` });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // 'strict' rather than 'lax': the app is always navigated to directly
      // (typed URL / bookmark / WhatsApp opens a *different*, cookie-less
      // public route), never arrived at via a cross-site link that needs the
      // session cookie attached — so there's no legitimate case to weaken
      // this for, and 'strict' closes off a class of CSRF against the
      // staff-only API that 'lax' would still allow via top-level GET nav.
      sameSite: 'strict',
      maxAge: SESSION_HOURS * 60 * 60 * 1000
    });
    res.json({ success: true });
  });

  router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });

  router.get('/me', (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.json({ authenticated: false });
      return;
    }
    try {
      jwt.verify(token, getSecret());
      res.json({ authenticated: true });
    } catch {
      res.json({ authenticated: false });
    }
  });

  return router;
}
