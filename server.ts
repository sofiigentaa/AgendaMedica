import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
// Monkey-patches Express so a rejected Promise inside an async route handler
// is forwarded to the error-handling middleware below, instead of just
// hanging the request forever with no response (Express 4 doesn't do this
// on its own — easy to miss per-route, so patched globally here once).
import 'express-async-errors';
import { createServer as createViteServer } from 'vite';
import { createAuthRouter, requireAuth } from './server/auth';
import { createPatientsRouter } from './server/routes/patients';
import { createAppointmentsRouter } from './server/routes/appointments';
import { createHolidaysRouter } from './server/routes/holidays';
import { createBackupsRouter } from './server/routes/backups';
import { createPublicRouter } from './server/routes/public';
import { createTestUtilsRouter } from './server/routes/testUtils';
import { createDemoRouter } from './server/routes/demo';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Fail fast and loud on boot if the app is misconfigured, rather than
// starting "successfully" and only breaking (confusingly, for whoever hits
// it first) the moment someone tries to log in or the DB is touched.
if (isProduction) {
  const required = ['DATABASE_URL', 'SESSION_SECRET', 'AUTH_PASSWORD_HASH'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `No se puede iniciar: faltan variables de entorno obligatorias: ${missing.join(', ')}. Ver README/DEPLOY.md.`
    );
    process.exit(1);
  }
}

const app = express();

app.disable('x-powered-by');
// CSP is left to the default (report-only-free) helmet policy off — this SPA
// loads its own bundled JS/CSS with no external scripts, so a custom CSP
// isn't load-bearing here, but the rest of helmet's headers (HSTS in prod,
// no-sniff, frameguard, etc.) are a cheap, real hardening win for an app
// that's now reachable over the public internet.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Auth (login/logout/session check) — not behind requireAuth by definition.
app.use('/api/auth', createAuthRouter());

// 3. Patient self-service confirm/cancel links from WhatsApp reminders —
// intentionally public, see server/routes/public.ts for why that's safe.
app.use('/api/public', createPublicRouter());

// 4. Everything else under /api is the clinic staff's data — requires the
// shared session cookie from /api/auth/login.
app.use('/api/patients', requireAuth, createPatientsRouter());
app.use('/api/appointments', requireAuth, createAppointmentsRouter());
app.use('/api/holidays', requireAuth, createHolidaysRouter());
app.use('/api/backups', requireAuth, createBackupsRouter());
app.use('/api/demo', requireAuth, createDemoRouter());

// 5. Test-only helper to reset the database between E2E test runs. Never
// mounted in production, and additionally gated by a shared-secret header
// (see server/routes/testUtils.ts) so it's never reachable there even if
// NODE_ENV were somehow misconfigured.
if (!isProduction) {
  app.use('/api/test', createTestUtilsRouter());
}

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Last-resort error handler: logs the real error server-side but never
  // leaks a stack trace or internal error message to the client — just a
  // generic 500. Must be registered after everything else (4-arg signature
  // is what makes Express treat this as an error handler).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({ error: 'Error interno del servidor' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Agenda Médica iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer();
