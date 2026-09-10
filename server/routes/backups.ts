import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export function createBackupsRouter(): Router {
  const router = Router();

  router.get('/history', async (_req: Request, res: Response) => {
    const items = await prisma.backupHistoryItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json(items);
  });

  router.post('/history', async (req: Request, res: Response) => {
    const data = req.body || {};
    const saved = await prisma.backupHistoryItem.create({
      data: {
        id: data.id || `backup-${Date.now()}`,
        date: data.date,
        timestamp: data.timestamp,
        appointmentsCount: Number(data.appointmentsCount) || 0,
        patientsCount: Number(data.patientsCount) || 0,
        totalRevenue: Number(data.totalRevenue) || 0,
        jsonData: data.jsonData || '{}'
      }
    });

    // Keep only the last 30 snapshots.
    const extra = await prisma.backupHistoryItem.findMany({
      orderBy: { createdAt: 'desc' },
      skip: 30,
      select: { id: true }
    });
    if (extra.length > 0) {
      await prisma.backupHistoryItem.deleteMany({ where: { id: { in: extra.map((e) => e.id) } } });
    }

    res.json(saved);
  });

  router.delete('/history/:id', async (req: Request, res: Response) => {
    await prisma.backupHistoryItem.deleteMany({ where: { id: req.params.id } });
    res.json({ success: true });
  });

  router.delete('/history', async (_req: Request, res: Response) => {
    await prisma.backupHistoryItem.deleteMany({});
    res.json({ success: true });
  });

  router.get('/config', async (_req: Request, res: Response) => {
    const config = await prisma.backupConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {}
    });
    res.json(config);
  });

  router.put('/config', async (req: Request, res: Response) => {
    const data = req.body || {};
    const saved = await prisma.backupConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        enabled: Boolean(data.enabled),
        nightlyHour: Number(data.nightlyHour) || 21,
        nightlyMinute: Number(data.nightlyMinute) || 0,
        autoDownloadExcel: Boolean(data.autoDownloadExcel),
        autoDownloadCsv: Boolean(data.autoDownloadCsv),
        saveLocalHistory: data.saveLocalHistory !== false,
        lastBackupDate: data.lastBackupDate || null,
        lastBackupTime: data.lastBackupTime || null
      },
      update: {
        enabled: Boolean(data.enabled),
        nightlyHour: Number(data.nightlyHour) || 21,
        nightlyMinute: Number(data.nightlyMinute) || 0,
        autoDownloadExcel: Boolean(data.autoDownloadExcel),
        autoDownloadCsv: Boolean(data.autoDownloadCsv),
        saveLocalHistory: data.saveLocalHistory !== false,
        lastBackupDate: data.lastBackupDate || null,
        lastBackupTime: data.lastBackupTime || null
      }
    });
    res.json(saved);
  });

  return router;
}
