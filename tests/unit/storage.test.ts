import { describe, it, expect, beforeEach } from 'vitest';
import {
  isClinicWorkingDay,
  getNextWorkingDay,
  getPrevWorkingDay,
  getDayOfWeekName,
  formatDatePretty,
  computeDailySummary,
  loadPatients,
  savePatients,
  loadAppointments,
  saveAppointments,
  INITIAL_PATIENTS,
  getInitialAppointments,
  CLINIC_WORKING_DAYS,
} from '../../src/utils/storage';
import type { Appointment } from '../../src/types';

beforeEach(() => {
  localStorage.clear();
});

describe('isClinicWorkingDay', () => {
  it('accepts Monday, Tuesday and Friday', () => {
    // 2026-01-05 = Monday, 2026-01-06 = Tuesday, 2026-01-09 = Friday
    expect(isClinicWorkingDay('2026-01-05')).toBe(true);
    expect(isClinicWorkingDay('2026-01-06')).toBe(true);
    expect(isClinicWorkingDay('2026-01-09')).toBe(true);
  });

  it('rejects Wednesday, Thursday, Saturday and Sunday', () => {
    expect(isClinicWorkingDay('2026-01-07')).toBe(false); // Wed
    expect(isClinicWorkingDay('2026-01-08')).toBe(false); // Thu
    expect(isClinicWorkingDay('2026-01-10')).toBe(false); // Sat
    expect(isClinicWorkingDay('2026-01-11')).toBe(false); // Sun
  });

  it('returns false for an empty date', () => {
    expect(isClinicWorkingDay('')).toBe(false);
  });
});

describe('getNextWorkingDay / getPrevWorkingDay', () => {
  it('finds the next working day skipping non-working days', () => {
    // Tuesday 2026-01-06 -> next working day is Friday 2026-01-09
    expect(getNextWorkingDay('2026-01-06')).toBe('2026-01-09');
  });

  it('finds the previous working day skipping non-working days', () => {
    // Friday 2026-01-09 -> previous working day is Tuesday 2026-01-06
    expect(getPrevWorkingDay('2026-01-09')).toBe('2026-01-06');
  });

  it('always returns a day that is itself a working day', () => {
    const next = getNextWorkingDay('2026-01-07');
    expect(CLINIC_WORKING_DAYS).toContain(new Date(next + 'T00:00:00').getDay());
  });
});

describe('getDayOfWeekName', () => {
  it('returns the Spanish day name', () => {
    expect(getDayOfWeekName('2026-01-05')).toBe('Lunes');
    expect(getDayOfWeekName('2026-01-09')).toBe('Viernes');
  });

  it('returns empty string for invalid input', () => {
    expect(getDayOfWeekName('')).toBe('');
    expect(getDayOfWeekName('not-a-date')).toBe('');
  });
});

describe('formatDatePretty', () => {
  it('formats an ISO date into a readable Spanish string', () => {
    const formatted = formatDatePretty('2026-01-05');
    expect(formatted.toLowerCase()).toContain('lunes');
    expect(formatted).toContain('2026');
  });

  it('returns the input unchanged for invalid dates', () => {
    expect(formatDatePretty('')).toBe('');
    expect(formatDatePretty('garbage')).toBe('garbage');
  });
});

function makeAppointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'apt-test',
    pacienteId: 'pat-test',
    pacienteNombre: 'Test Paciente',
    pacienteDni: '1',
    pacienteTelefono: '1',
    pacienteEmail: '',
    coberturaTipo: 'particular',
    obraSocial: 'Particular',
    fecha: '2026-01-05',
    horaInicio: '14:30',
    tratamientoId: 'consulta',
    tratamientoNombre: 'Consulta Médica',
    duracionMinutos: 15,
    horaFin: '14:45',
    honorarios: 15000,
    estado: 'confirmado',
    estadoPago: 'pendiente',
    metodoPago: 'pendiente',
    recordatorioEnviado: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeDailySummary', () => {
  it('ignores appointments from other dates', () => {
    const appts = [makeAppointment({ id: 'a', fecha: '2026-02-01' })];
    const summary = computeDailySummary(appts, '2026-01-05');
    expect(summary.turnosTotales).toBe(0);
  });

  it('excludes cancelled appointments from expected revenue', () => {
    const appts = [
      makeAppointment({ id: 'a', honorarios: 10000, estado: 'confirmado' }),
      makeAppointment({ id: 'b', honorarios: 20000, estado: 'cancelado' }),
    ];
    const summary = computeDailySummary(appts, '2026-01-05');
    expect(summary.totalHonorariosEsperados).toBe(10000);
    expect(summary.turnosCancelados).toBe(1);
    expect(summary.turnosTotales).toBe(2);
  });

  it('counts revenue collected only for paid appointments', () => {
    const appts = [
      makeAppointment({ id: 'a', honorarios: 10000, estadoPago: 'pagado', metodoPago: 'efectivo' }),
      makeAppointment({ id: 'b', honorarios: 20000, estadoPago: 'pendiente' }),
    ];
    const summary = computeDailySummary(appts, '2026-01-05');
    expect(summary.totalHonorariosPercibidos).toBe(10000);
    expect(summary.porMetodoPago.efectivo).toBe(10000);
  });

  it('counts an attended appointment as collected even if not explicitly marked paid, unless bonified', () => {
    const appts = [
      makeAppointment({ id: 'a', honorarios: 5000, estado: 'atendido', estadoPago: 'pendiente' }),
      makeAppointment({ id: 'b', honorarios: 7000, estado: 'atendido', estadoPago: 'bonificado' }),
    ];
    const summary = computeDailySummary(appts, '2026-01-05');
    expect(summary.totalHonorariosPercibidos).toBe(5000);
  });

  it('aggregates totals by treatment and by insurance', () => {
    const appts = [
      makeAppointment({ id: 'a', tratamientoNombre: 'Láser', honorarios: 38000, obraSocial: 'OSDE' }),
      makeAppointment({ id: 'b', tratamientoNombre: 'Láser', honorarios: 38000, obraSocial: 'OSDE' }),
    ];
    const summary = computeDailySummary(appts, '2026-01-05');
    expect(summary.porTratamiento['Láser'].cantidad).toBe(2);
    expect(summary.porTratamiento['Láser'].total).toBe(76000);
    expect(summary.porObraSocial['OSDE'].cantidad).toBe(2);
  });
});

describe('localStorage persistence round-trip', () => {
  it('loadPatients seeds and returns INITIAL_PATIENTS when storage is empty', () => {
    const patients = loadPatients();
    expect(patients.length).toBe(INITIAL_PATIENTS.length);
    expect(localStorage.getItem('agenda_medica_patients_v1')).not.toBeNull();
  });

  it('savePatients + loadPatients round-trips custom data', () => {
    const custom = [{ ...INITIAL_PATIENTS[0], id: 'pat-custom', nombre: 'Custom' }];
    savePatients(custom);
    const loaded = loadPatients();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].nombre).toBe('Custom');
  });

  it('loadAppointments seeds and returns initial demo appointments when storage is empty', () => {
    const appts = loadAppointments();
    expect(appts.length).toBe(getInitialAppointments().length);
  });

  it('saveAppointments + loadAppointments round-trips custom data', () => {
    const custom = [makeAppointment({ id: 'apt-custom' })];
    saveAppointments(custom);
    const loaded = loadAppointments();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('apt-custom');
  });
});
