import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { INITIAL_PATIENTS, getInitialAppointments } from '../../src/utils/storage';

// Backs the "Cargar datos de demostración" action in Reset Agenda — replaces
// the current patients/appointments with the same fixed sample dataset the
// app used to inject into a fresh localStorage. Staff-only (mounted behind
// requireAuth in server.ts), and — unlike the old client-only version —
// this now actually replaces shared data everyone's devices see, so it's
// meant for a demo/training environment, not to be clicked casually against
// a database with real patients in it.
export function createDemoRouter(): Router {
  const router = Router();

  router.post('/load', async (_req: Request, res: Response) => {
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});

    await prisma.patient.createMany({
      data: INITIAL_PATIENTS.map((p) => ({
        id: p.id,
        dni: p.dni,
        nombre: p.nombre,
        apellido: p.apellido,
        email: p.email,
        telefono: p.telefono,
        fechaNacimiento: p.fechaNacimiento,
        coberturaTipo: p.coberturaTipo,
        obraSocial: p.obraSocial,
        numeroAfiliado: p.numeroAfiliado || '',
        notasMedicas: p.notasMedicas || ''
      }))
    });

    await prisma.appointment.createMany({
      data: getInitialAppointments().map((a) => ({
        id: a.id,
        pacienteId: a.pacienteId,
        pacienteNombre: a.pacienteNombre,
        pacienteDni: a.pacienteDni,
        pacienteTelefono: a.pacienteTelefono,
        pacienteEmail: a.pacienteEmail || '',
        pacienteFechaNacimiento: a.pacienteFechaNacimiento || '',
        coberturaTipo: a.coberturaTipo,
        obraSocial: a.obraSocial,
        numeroAfiliado: a.numeroAfiliado || '',
        fecha: a.fecha,
        horaInicio: a.horaInicio,
        tratamientoId: a.tratamientoId,
        tratamientoNombre: a.tratamientoNombre,
        duracionMinutos: a.duracionMinutos,
        horaFin: a.horaFin,
        honorarios: a.honorarios,
        estado: a.estado,
        estadoPago: a.estadoPago,
        metodoPago: a.metodoPago,
        recordatorioEnviado: a.recordatorioEnviado,
        ultimoRecordatorioAt: a.ultimoRecordatorioAt || null,
        observaciones: a.observaciones || '',
        esBloqueo: Boolean(a.esBloqueo)
      }))
    });

    const [patients, appointments] = await Promise.all([
      prisma.patient.findMany({ orderBy: { apellido: 'asc' } }),
      prisma.appointment.findMany({ orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }] })
    ]);
    res.json({ patients, appointments });
  });

  return router;
}
