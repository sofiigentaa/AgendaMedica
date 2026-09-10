import { describe, it, expect } from 'vitest';
import { generateAppointmentsCSV } from '../../src/utils/export';
import type { Appointment } from '../../src/types';

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-1',
    pacienteId: 'pat-1',
    pacienteNombre: 'Valentina Rossi',
    pacienteDni: '34.892.120',
    pacienteTelefono: '+54 9 341 588-4321',
    pacienteEmail: 'valentina@example.com',
    pacienteFechaNacimiento: '1989-04-15',
    coberturaTipo: 'obra_social',
    obraSocial: 'Swiss Medical',
    fecha: '2026-01-05',
    horaInicio: '14:30',
    tratamientoId: 'esclero',
    tratamientoNombre: 'Esclero',
    duracionMinutos: 30,
    horaFin: '15:00',
    honorarios: 32000,
    estado: 'confirmado',
    estadoPago: 'pendiente',
    metodoPago: 'pendiente',
    recordatorioEnviado: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('generateAppointmentsCSV', () => {
  it('only includes appointments for the requested date', () => {
    const appts = [
      makeAppointment({ id: 'a', fecha: '2026-01-05' }),
      makeAppointment({ id: 'b', fecha: '2026-02-10' }),
    ];
    const csv = generateAppointmentsCSV('2026-01-05', appts);
    const dataLines = csv.split('\r\n').slice(1).filter(Boolean);
    expect(dataLines).toHaveLength(1);
  });

  it('starts with a UTF-8 BOM for Excel compatibility', () => {
    const csv = generateAppointmentsCSV('2026-01-05', [makeAppointment()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('escapes embedded double quotes in free-text fields', () => {
    const appt = makeAppointment({ pacienteNombre: 'Ana "La Doctora" Pérez' });
    const csv = generateAppointmentsCSV('2026-01-05', [appt]);
    expect(csv).toContain('""La Doctora""');
  });

  it('renders the birthdate as DD/MM/AAAA', () => {
    const csv = generateAppointmentsCSV('2026-01-05', [makeAppointment({ pacienteFechaNacimiento: '1989-04-15' })]);
    expect(csv).toContain('15/04/1989');
  });

  it('produces an empty data section (header only) when there are no matching appointments', () => {
    const csv = generateAppointmentsCSV('2026-01-05', []);
    const lines = csv.replace('﻿', '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1); // just the header row
  });
});
