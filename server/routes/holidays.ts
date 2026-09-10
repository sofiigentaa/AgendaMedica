import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export function createHolidaysRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    res.json(holidays);
  });

  // Upsert by date (Holiday.date is unique) — creates the mark if the date
  // isn't one yet, or updates its reason/type in place if it already is.
  router.put('/:date', async (req: Request, res: Response) => {
    const { date } = req.params;
    const { reason, type, notes } = req.body || {};
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      res.status(400).json({ error: 'Falta el motivo' });
      return;
    }

    const saved = await prisma.holiday.upsert({
      where: { date },
      create: { date, reason: trimmedReason, type: type || 'feriado', notes: notes || null },
      update: { reason: trimmedReason, type: type || undefined, notes: notes || null }
    });
    res.json(saved);
  });

  router.delete('/:date', async (req: Request, res: Response) => {
    const { date } = req.params;
    await prisma.holiday.deleteMany({ where: { date } });
    res.json({ success: true });
  });

  return router;
}
