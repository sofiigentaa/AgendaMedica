import { Router, Request, Response } from 'express';
import { Appointment } from '@prisma/client';
import { prisma } from '../db';
import { calculateDurationMinutes } from '../../src/data/treatments';

// Turnos con paciente real: se agrupan por igualdad EXACTA de
// fecha+horario+tratamiento+DNI (misma clave que usa la sincronización de
// Google Sheets para no reimportar algo ya sincronizado).
function exactDuplicateGroups(appointments: Appointment[]): Appointment[][] {
  const groups = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    if (appt.esBloqueo) continue;
    const key = `${appt.fecha}|${appt.horaInicio}|${appt.horaFin}|${appt.tratamientoId}|${appt.pacienteDni}`;
    const group = groups.get(key);
    if (group) group.push(appt);
    else groups.set(key, [appt]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

// Bloqueos (NO DAR / NO ESTOY): dos hojas "Copia de <Mes>" que divergieron
// con el tiempo pueden generar bloqueos para el mismo día que se SOLAPAN con
// horarios distintos (ej. 19:00–20:15 y 19:30–20:45) en vez de ser
// idénticos, así que se agrupan por solapamiento de horario dentro de la
// misma fecha, no por igualdad exacta.
function overlappingBlockGroups(appointments: Appointment[]): Appointment[][] {
  const blocksByDate = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    if (!appt.esBloqueo) continue;
    const list = blocksByDate.get(appt.fecha) || [];
    list.push(appt);
    blocksByDate.set(appt.fecha, list);
  }
  const groups: Appointment[][] = [];
  for (const dayBlocks of blocksByDate.values()) {
    dayBlocks.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.createdAt.getTime() - b.createdAt.getTime());
    let currentGroup: Appointment[] = [];
    let currentEnd = '';
    for (const block of dayBlocks) {
      if (currentGroup.length > 0 && block.horaInicio <= currentEnd) {
        currentGroup.push(block);
        if (block.horaFin > currentEnd) currentEnd = block.horaFin;
      } else {
        if (currentGroup.length > 1) groups.push(currentGroup);
        currentGroup = [block];
        currentEnd = block.horaFin;
      }
    }
    if (currentGroup.length > 1) groups.push(currentGroup);
  }
  return groups;
}

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

  // Read-only preview: reports both exact-duplicate turnos and
  // overlapping-but-not-identical bloqueos, so the UI can show a count
  // before anyone commits to deleting/merging anything.
  router.get('/duplicates', async (_req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }, { createdAt: 'asc' }]
    });
    const groups = [...exactDuplicateGroups(appointments), ...overlappingBlockGroups(appointments)];
    const extraCount = groups.reduce((sum, g) => sum + (g.length - 1), 0);
    res.json({
      duplicateGroupsCount: groups.length,
      extraCount,
      groups: groups.map((g) => ({
        fecha: g[0].fecha,
        horaInicio: g.reduce((min, a) => (a.horaInicio < min ? a.horaInicio : min), g[0].horaInicio),
        horaFin: g.reduce((max, a) => (a.horaFin > max ? a.horaFin : max), g[0].horaFin),
        pacienteNombre: g[0].pacienteNombre,
        count: g.length
      }))
    });
  });

  // Resolves every group found above: exact turno duplicates just lose their
  // extra copies; overlapping bloqueos keep the oldest record but stretched
  // to cover the full merged range (min start, max end) and lose the rest —
  // always keeping the oldest (first-created) row of each group.
  router.delete('/duplicates', async (_req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }, { createdAt: 'asc' }]
    });

    const idsToDelete: string[] = [];
    for (const group of exactDuplicateGroups(appointments)) {
      idsToDelete.push(...group.slice(1).map((a) => a.id));
    }

    for (const group of overlappingBlockGroups(appointments)) {
      const [keep, ...rest] = group;
      idsToDelete.push(...rest.map((a) => a.id));
      const horaInicio = group.reduce((min, a) => (a.horaInicio < min ? a.horaInicio : min), keep.horaInicio);
      const horaFin = group.reduce((max, a) => (a.horaFin > max ? a.horaFin : max), keep.horaFin);
      if (horaInicio !== keep.horaInicio || horaFin !== keep.horaFin) {
        await prisma.appointment.update({
          where: { id: keep.id },
          data: { horaInicio, horaFin, duracionMinutos: calculateDurationMinutes(horaInicio, horaFin) }
        });
      }
    }

    if (idsToDelete.length > 0) {
      await prisma.appointment.deleteMany({ where: { id: { in: idsToDelete } } });
    }
    res.json({ removed: idsToDelete.length });
  });

  // Elimina TODOS los turnos con estado "cancelado", en cualquier fecha —
  // pedido desde Vista Día como forma de mantener la agenda limpia de
  // cancelaciones viejas que ya no aportan nada.
  router.delete('/cancelados', async (_req: Request, res: Response) => {
    const { count } = await prisma.appointment.deleteMany({ where: { estado: 'cancelado' } });
    res.json({ removed: count });
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
