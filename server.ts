import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Server-side auto backup storage endpoint
let serverBackupStore: any[] = [];

app.post('/api/backup/save', (req, res) => {
  try {
    const { date, appointments, patients, summary, timestamp } = req.body;
    serverBackupStore.push({
      id: `backup-${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: timestamp || new Date().toISOString(),
      appointmentsCount: appointments?.length || 0,
      patientsCount: patients?.length || 0,
      totalRevenue: summary?.totalHonorariosPercibidos || 0,
      data: { appointments, patients, summary }
    });

    // Keep last 60 backups
    if (serverBackupStore.length > 60) {
      serverBackupStore.shift();
    }

    res.json({ success: true, message: 'Backup diario registrado exitosamente en el servidor' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error guardando backup' });
  }
});

app.get('/api/backup/list', (req, res) => {
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
  });
}

startServer();
