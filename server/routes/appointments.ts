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

  // Literal-path routes (/duplicates) must be registered before the
  // parameterized /:id routes below — otherwise Express would match
  // "/duplicates" against ":id" before ever reaching these handlers.

  // Groups appointments by fecha+horaInicio+horaFin+tratamientoId+DNI (the
  // same key the Google Sheets sync uses to avoid re-importing something
  // already synced) and reports any group with more than one row — left
  // over from syncs run before that de-duplication existed. Read-only: lets
  // the UI show a preview/count before anyone commits to deleting anything.
  router.get('/duplicates', async (_req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }, { createdAt: 'asc' }]
    });
    const groups = new Map<string, typeof appointments>();
    for (const appt of appointments) {
      const key = `${appt.fecha}|${appt.horaInicio}|${appt.horaFin}|${appt.tratamientoId}|${appt.pacienteDni}`;
      const group = groups.get(key);
      if (group) group.push(appt);
      else groups.set(key, [appt]);
    }
    const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
    const extraCount = duplicateGroups.reduce((sum, g) => sum + (g.length - 1), 0);
    res.json({
      duplicateGroupsCount: duplicateGroups.length,
      extraCount,
      groups: duplicateGroups.map((g) => ({
        fecha: g[0].fecha,
        horaInicio: g[0].horaInicio,
        horaFin: g[0].horaFin,
        pacienteNombre: g[0].pacienteNombre,
        count: g.length
      }))
    });
  });

  // Deletes the extra copies of each duplicate group found above, always
  // keeping the oldest record (the one created first) in each group.
  router.delete('/duplicates', async (_req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }, { createdAt: 'asc' }]
    });
    const groups = new Map<string, typeof appointments>();
    for (const appt of appointments) {
      const key = `${appt.fecha}|${appt.horaInicio}|${appt.horaFin}|${appt.tratamientoId}|${appt.pacienteDni}`;
      const group = groups.get(key);
      if (group) group.push(appt);
      else groups.set(key, [appt]);
    }
    const idsToDelete = [...groups.values()]
      .filter((g) => g.length > 1)
      .flatMap((g) => g.slice(1).map((a) => a.id));
    if (idsToDelete.length > 0) {
      await prisma.appointment.deleteMany({ where: { id: { in: idsToDelete } } });
    }
    res.json({ removed: idsToDelete.length });
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
