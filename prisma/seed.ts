// Local/dev-only convenience seed — populates the database with the same
// sample patients/appointments/holidays the app used to auto-generate into
// localStorage on first load. Never runs automatically against a real
// deployment; run it deliberately with `npm run db:seed`.
import { PrismaClient } from '@prisma/client';
import { INITIAL_PATIENTS, getInitialAppointments, INITIAL_HOLIDAYS } from '../src/utils/storage';

const prisma = new PrismaClient();

async function main() {
  for (const p of INITIAL_PATIENTS) {
    await prisma.patient.upsert({
      where: { id: p.id },
      create: {
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
      },
      update: {}
    });
  }

  for (const a of getInitialAppointments()) {
    await prisma.appointment.upsert({
      where: { id: a.id },
      create: {
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
      },
      update: {}
    });
  }

  for (const h of INITIAL_HOLIDAYS) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      create: { date: h.date, reason: h.reason, type: h.type, notes: h.notes || null },
      update: {}
    });
  }

  console.log(`Seed OK: ${INITIAL_PATIENTS.length} pacientes, ${getInitialAppointments().length} turnos, ${INITIAL_HOLIDAYS.length} feriados.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
