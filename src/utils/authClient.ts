export type AuthUser = {
  username: string;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchCurrentSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await parseJson(res);
    if (typeof data.username === 'string' && data.username) {
      return { username: data.username };
    }
    return null;
  } catch {
    return null;
  }
}

export async function loginRequest(
  username: string,
  password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await parseJson(res);
    if (!res.ok) {
      const error =
        typeof data.error === 'string' ? data.error : 'No se pudo iniciar sesión. Intentá de nuevo.';
      return { ok: false, error };
    }
    if (typeof data.username !== 'string') {
      return { ok: false, error: 'Respuesta inválida del servidor.' };
    }
    return { ok: true, user: { username: data.username } };
  } catch {
    return { ok: false, error: 'No hay conexión con el servidor. Revisá que la agenda esté en marcha.' };
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch {
    // Si el servidor no responde, igual se limpia el estado local.
  }
}
