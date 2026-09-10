import { Router, Request, Response } from 'express';
import { prisma } from '../db';

// Wipes all data so E2E tests (and local manual testing) start from a clean
// slate — the equivalent of the old localStorage.clear(). Only ever mounted
// outside production (see server.ts) and additionally gated by a shared
// secret header, so it can never be reachable on a real deployment even by
// mistake.
export function createTestUtilsRouter(): Router {
  const router = Router();

  router.post('/reset', async (req: Request, res: Response) => {
    if (req.headers['x-test-reset-token'] !== process.env.TEST_RESET_TOKEN) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.holiday.deleteMany({});
    await prisma.backupHistoryItem.deleteMany({});
    await prisma.backupConfig.deleteMany({});
    res.json({ success: true });
  });

  return router;
}
