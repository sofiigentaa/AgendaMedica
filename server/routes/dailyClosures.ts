import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export function createDailyClosuresRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const closures = await prisma.dailyClosure.findMany({ orderBy: { date: 'asc' } });
    res.json(closures);
  });

  router.post('/:date', async (req: Request, res: Response) => {
    const { date } = req.params;
    const { totalPercibido } = req.body || {};
    const existing = await prisma.dailyClosure.findUnique({ where: { date } });
    if (existing) {
      res.status(409).json({ error: 'La caja de este día ya fue cerrada.' });
      return;
    }
    const saved = await prisma.dailyClosure.create({
      data: { date, totalPercibido: Number(totalPercibido) || 0 }
    });
    res.json(saved);
  });

  router.delete('/:date', async (req: Request, res: Response) => {
    const { date } = req.params;
    await prisma.dailyClosure.deleteMany({ where: { date } });
    res.json({ success: true });
  });

  return router;
}
