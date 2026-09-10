import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  createAuthController,
  parseCookies,
  resolveAdminCredentials,
  MAX_FAILED_ATTEMPTS
} from '../../src/server/auth';

function mockReq(partial: Partial<Request> & { body?: unknown; headers?: Record<string, string> }): Request {
  return {
    headers: partial.headers || {},
    body: partial.body || {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' }
  } as Request;
}

function mockRes() {
  const headers: Record<string, string | string[]> = {};
  const res = {
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value;
    }
  };
  return res as unknown as Response & { headers: Record<string, string | string[]> };
}

describe('auth helpers', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'secret-pass-1';
  });

  it('parses cookies including encoded values', () => {
    expect(parseCookies('agenda_session=abc%2Fde; other=1')).toEqual({
      agenda_session: 'abc/de',
      other: '1'
    });
    expect(parseCookies(undefined)).toEqual({});
  });

  it('requires ADMIN_PASSWORD in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;
    expect(() => resolveAdminCredentials()).toThrow(/ADMIN_PASSWORD/);
    process.env.NODE_ENV = previous;
    process.env.ADMIN_PASSWORD = 'secret-pass-1';
  });

  it('accepts the configured credentials and issues a session', async () => {
    const auth = createAuthController();
    const result = await auth.login(
      mockReq({ body: { username: 'admin', password: 'secret-pass-1' } })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const res = mockRes();
    auth.applyLoginCookie(res, result.token);
    const cookie = String(res.headers['Set-Cookie'] || '');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('agenda_session=');

    const session = auth.readSession(
      mockReq({ headers: { cookie: `agenda_session=${encodeURIComponent(result.token)}` } })
    );
    expect(session?.username).toBe('admin');
  });

  it('rejects invalid credentials with a generic error', async () => {
    const auth = createAuthController();
    const result = await auth.login(
      mockReq({ body: { username: 'admin', password: 'nope' } })
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.status).toBe(401);
      expect(result.error).toMatch(/incorrectos/i);
    }
  });

  it('locks the IP after repeated failures', async () => {
    const auth = createAuthController();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await auth.login(mockReq({ body: { username: 'admin', password: 'nope' } }));
    }
    const locked = await auth.login(
      mockReq({ body: { username: 'admin', password: 'secret-pass-1' } })
    );
    expect(locked.ok).toBe(false);
    if (locked.ok === false) {
      expect(locked.status).toBe(429);
    }
  });

  it('clears the session on logout', async () => {
    const auth = createAuthController();
    const result = await auth.login(
      mockReq({ body: { username: 'admin', password: 'secret-pass-1' } })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cookie = `agenda_session=${encodeURIComponent(result.token)}`;
    auth.logout(mockReq({ headers: { cookie } }));
    expect(auth.readSession(mockReq({ headers: { cookie } }))).toBeNull();
  });
});
