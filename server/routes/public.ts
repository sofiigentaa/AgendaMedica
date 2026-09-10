import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';

// Patients confirm/cancel their own appointment from a WhatsApp link — they
// never log in, so these two routes are intentionally NOT behind
// requireAuth. To keep that safe:
//  - each route only ever touches ONE appointment (looked up by its id,
//    a long random cuid — not sequential/guessable) and only ever writes a
//    fixed, narrow set of fields (never arbitrary data from the request body);
//  - the response back to the patient's browser is limited to the handful
//    of fields the confirmation screen actually shows (date/time/treatment),
//    never the rest of that appointment's or any other patient's data;
//  - rate-limited per IP to blunt scripted guessing across ids.
const publicActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }
});

function toPatientSummary(appt: { fecha: string; horaInicio: string; tratamientoNombre: string }) {
  return { fecha: appt.fecha, horaInicio: appt.horaInicio, tratamientoNombre: appt.tratamientoNombre };
}

export function createPublicRouter(): Router {
  const router = Router();
  router.use(publicActionRateLimiter);

  router.post('/appointments/:id/confirm', async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Turno no encontrado' });
      return;
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        estado: 'confirmado',
        recordatorioEnviado: true,
        respuestaPacienteTipo: 'confirmado',
        respuestaPacienteAt: new Date().toISOString()
      }
    });
    res.json(toPatientSummary(updated));
  });

  router.post('/appointments/:id/cancel', async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Turno no encontrado' });
      return;
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        estado: 'cancelado',
        respuestaPacienteTipo: 'cancelado',
        respuestaPacienteAt: new Date().toISOString()
      }
    });
    res.json(toPatientSummary(updated));
  });

  return router;
}
