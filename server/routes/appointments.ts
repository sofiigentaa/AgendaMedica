import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export function createAppointmentsRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
    });
    res.json(appointments);
  });

  // Upsert by id, same rationale as patients: one record per write, so
  // concurrent edits from different devices to different appointments never
  // clobber each other (unlike the old "save the whole array" pattern this
  // app used with localStorage).
  router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body || {};

    const required = ['fecha', 'horaInicio', 'tratamientoId', 'tratamientoNombre', 'horaFin', 'estado', 'estadoPago', 'metodoPago'];
    const missing = required.filter((field) => data[field] === undefined || data[field] === null || data[field] === '');
    if (missing.length > 0) {
      res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}` });
      return;
    }

    const record = {
      pacienteId: String(data.pacienteId || ''),
      pacienteNombre: String(data.pacienteNombre || ''),
      pacienteDni: String(data.pacienteDni || ''),
      pacienteTelefono: String(data.pacienteTelefono || ''),
      pacienteEmail: data.pacienteEmail || '',
      pacienteFechaNacimiento: data.pacienteFechaNacimiento || '',
      coberturaTipo: data.coberturaTipo || 'particular',
      obraSocial: data.obraSocial || 'Particular',
      numeroAfiliado: data.numeroAfiliado || '',
      fecha: String(data.fecha),
      horaInicio: String(data.horaInicio),
      tratamientoId: String(data.tratamientoId),
      tratamientoNombre: String(data.tratamientoNombre),
      duracionMinutos: Number(data.duracionMinutos) || 0,
      horaFin: String(data.horaFin),
      honorarios: Number(data.honorarios) || 0,
      estado: String(data.estado),
      estadoPago: String(data.estadoPago),
      metodoPago: String(data.metodoPago),
      recordatorioEnviado: Boolean(data.recordatorioEnviado),
      ultimoRecordatorioAt: data.ultimoRecordatorioAt || null,
      respuestaPacienteTipo: data.respuestaPacienteTipo || null,
      respuestaPacienteAt: data.respuestaPacienteAt || null,
      observaciones: data.observaciones || '',
      esBloqueo: Boolean(data.esBloqueo)
    };

    const saved = await prisma.appointment.upsert({
      where: { id },
      create: { id, ...record },
      update: record
    });
    res.json(saved);
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.appointment.deleteMany({ where: { id } });
    res.json({ success: true });
  });

  router.delete('/', async (_req: Request, res: Response) => {
    await prisma.appointment.deleteMany({});
    res.json({ success: true });
  });

  return router;
}
