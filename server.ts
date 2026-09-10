import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createAuthController, securityHeaders } from './src/server/auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const auth = createAuthController();

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  const result = await auth.login(req);
  if (result.ok === false) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  auth.applyLoginCookie(res, result.token);
  res.json({ success: true, username: result.username });
});

app.post('/api/auth/logout', (req, res) => {
  auth.logout(req);
  auth.clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const session = auth.readSession(req);
  if (!session) {
    res.status(401).json({ error: 'Sesión requerida.' });
    return;
  }
  res.json({ username: session.username });
});

type ServerBackup = {
  id: string;
  date: string;
  timestamp: string;
  appointmentsCount: number;
  patientsCount: number;
  totalRevenue: number;
  data: unknown;
};

const serverBackupStore: ServerBackup[] = [];

app.post('/api/backup/save', auth.requireAuth, (req, res) => {
  try {
    const { date, appointments, patients, summary, timestamp } = req.body || {};
    serverBackupStore.push({
      id: `backup-${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: timestamp || new Date().toISOString(),
      appointmentsCount: Array.isArray(appointments) ? appointments.length : 0,
      patientsCount: Array.isArray(patients) ? patients.length : 0,
      totalRevenue: summary?.totalHonorariosPercibidos || 0,
      data: { appointments, patients, summary }
    });

    if (serverBackupStore.length > 60) {
      serverBackupStore.shift();
    }

    res.json({ success: true, message: 'Backup diario registrado exitosamente en el servidor' });
  } catch {
    res.status(500).json({ error: 'Error guardando backup' });
  }
});

app.get('/api/backup/list', auth.requireAuth, (_req, res) => {
  res.json({
    backups: serverBackupStore.map((b) => ({
      id: b.id,
      date: b.date,
      timestamp: b.timestamp,
      appointmentsCount: b.appointmentsCount,
      patientsCount: b.patientsCount,
      totalRevenue: b.totalRevenue
    }))
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Agenda Médica iniciado en http://0.0.0.0:${PORT}`);
    if (process.env.NODE_ENV !== 'production' && !process.env.ADMIN_PASSWORD) {
      console.log('Acceso local: usuario "admin" — definí ADMIN_PASSWORD para cambiar la contraseña de desarrollo.');
    }
  });
}

startServer();
