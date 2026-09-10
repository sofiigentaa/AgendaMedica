import { describe, expect, it } from 'vitest';
import { calculateDurationMinutes, calculateEndTime, formatCurrency, getTreatmentById, TREATMENTS } from '../data/treatments';
import {
  computeDailySummary,
  formatDatePretty,
  getDayOfWeekName,
  getNextWorkingDay,
  getPrevWorkingDay,
  isClinicWorkingDay,
} from './storage';
import { findOverlappingAppointments, isOutsideClinicHours, isValidTimeHHmm, timeRangesOverlap } from './schedule';
import {
  hasInvalidPersonNameChars,
  isDuplicatePatientDni,
  isFutureBirthDate,
  normalizeDniDigits,
} from './patientValidation';
import { cleanPhoneNumber, generateAppointmentReminder } from './whatsapp';
import { normalizeDateString, parseRawRowsToPatients } from './excelImport';
import { generateAppointmentsCSV } from './export';
import { escapeHtml } from './htmlEscape';
import { validateBackupSavePayload } from './backupApi';
import { Appointment } from '../types';

function sampleAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-x',
    pacienteId: 'pat-1',
    pacienteNombre: 'Valentina Rossi',
    pacienteDni: '34892120',
    pacienteTelefono: '+54 9 341 588-4321',
    pacienteEmail: 'v@test.com',
    coberturaTipo: 'particular',
    obraSocial: 'Particular',
    fecha: '2026-09-11',
    horaInicio: '15:00',
    tratamientoId: 'consulta',
    tratamientoNombre: 'Consulta Médica',
    duracionMinutos: 15,
    horaFin: '15:15',
    honorarios: 15000,
    estado: 'confirmado',
    estadoPago: 'pendiente',
    metodoPago: 'pendiente',
    recordatorioEnviado: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('días y horarios de atención', () => {
  it('atiende lunes, martes y viernes', () => {
    expect(isClinicWorkingDay('2026-09-07')).toBe(true); // lunes
    expect(isClinicWorkingDay('2026-09-08')).toBe(true); // martes
    expect(isClinicWorkingDay('2026-09-11')).toBe(true); // viernes
    expect(isClinicWorkingDay('2026-09-10')).toBe(false); // jueves
    expect(isClinicWorkingDay('2026-09-12')).toBe(false); // sábado
  });

  it('salta al próximo día hábil', () => {
    expect(getNextWorkingDay('2026-09-10')).toBe('2026-09-11');
    expect(getPrevWorkingDay('2026-09-11')).toBe('2026-09-08');
    expect(getDayOfWeekName('2026-09-11')).toBe('Viernes');
  });

  it('formatea fechas en español', () => {
    const pretty = formatDatePretty('2026-09-11');
    expect(pretty.toLowerCase()).toContain('viernes');
    expect(pretty).toContain('2026');
  });
});

describe('duración y fin de turno', () => {
  it('calcula hora de fin según duración', () => {
    expect(calculateEndTime('14:30', 30)).toBe('15:00');
    expect(calculateEndTime('19:45', 15)).toBe('20:00');
    expect(calculateDurationMinutes('14:30', '16:00')).toBe(90);
    expect(calculateDurationMinutes('16:00', '14:30')).toBe(0);
  });

  it('aplica duración y honorarios por tratamiento', () => {
    const laser = getTreatmentById('esclero_laser');
    expect(laser.durationMinutes).toBe(45);
    expect(laser.defaultFee).toBe(55000);
    expect(TREATMENTS.some((t) => t.id === 'no_dar')).toBe(true);
  });

  it('valida HH:mm y franja 14:30-20:00', () => {
    expect(isValidTimeHHmm('14:30')).toBe(true);
    expect(isValidTimeHHmm('9:00')).toBe(true);
    expect(isValidTimeHHmm('25:00')).toBe(false);
    expect(isValidTimeHHmm('14')).toBe(false);
    expect(isOutsideClinicHours('13:00', '13:30')).toBe(true);
    expect(isOutsideClinicHours('14:30', '15:00')).toBe(false);
    expect(isOutsideClinicHours('19:45', '20:15')).toBe(true);
  });
});

describe('solapamiento de turnos', () => {
  const existing = [
    sampleAppointment({ id: 'a1', horaInicio: '15:00', horaFin: '15:30' }),
    sampleAppointment({ id: 'a2', horaInicio: '16:00', horaFin: '16:45', estado: 'cancelado' }),
  ];

  it('detecta cruce de horarios', () => {
    expect(timeRangesOverlap('15:00', '15:30', '15:15', '15:45')).toBe(true);
    expect(timeRangesOverlap('15:00', '15:30', '15:30', '16:00')).toBe(false);
  });

  it('ignora cancelados y el propio turno en edición', () => {
    const conflicts = findOverlappingAppointments(existing, '2026-09-11', '15:15', '15:45');
    expect(conflicts.map((c) => c.id)).toEqual(['a1']);

    const editingSelf = findOverlappingAppointments(existing, '2026-09-11', '15:00', '15:30', 'a1');
    expect(editingSelf).toHaveLength(0);

    const overCancelled = findOverlappingAppointments(existing, '2026-09-11', '16:00', '16:30');
    expect(overCancelled).toHaveLength(0);
  });
});

describe('pacientes: DNI, nombre y fecha de nacimiento', () => {
  it('normaliza DNI y detecta duplicados', () => {
    expect(normalizeDniDigits('34.892.120')).toBe('34892120');
    expect(
      isDuplicatePatientDni('34892120', [
        { id: 'pat-1', dni: '34.892.120' },
        { id: 'pat-2', dni: '111' },
      ])
    ).toBe(true);
    expect(
      isDuplicatePatientDni('34.892.120', [{ id: 'pat-1', dni: '34.892.120' }], 'pat-1')
    ).toBe(false);
  });

  it('rechaza nombres con números o comas y fechas futuras', () => {
    expect(hasInvalidPersonNameChars('Rossi, Valentina')).toBe(true);
    expect(hasInvalidPersonNameChars('Valentina')).toBe(false);
    expect(isFutureBirthDate('2099-01-01', '2026-09-10')).toBe(true);
    expect(isFutureBirthDate('1989-04-15', '2026-09-10')).toBe(false);
  });
});

describe('cierre diario de honorarios', () => {
  it('suma esperados y percibidos según estado', () => {
    const summary = computeDailySummary(
      [
        sampleAppointment({ id: '1', honorarios: 10000, estado: 'atendido', estadoPago: 'pagado', metodoPago: 'efectivo' }),
        sampleAppointment({ id: '2', honorarios: 20000, estado: 'confirmado', estadoPago: 'pendiente', metodoPago: 'pendiente' }),
        sampleAppointment({ id: '3', honorarios: 5000, estado: 'cancelado', estadoPago: 'pendiente', metodoPago: 'pendiente' }),
      ],
      '2026-09-11'
    );

    expect(summary.turnosTotales).toBe(3);
    expect(summary.turnosAtendidos).toBe(1);
    expect(summary.turnosConfirmados).toBe(1);
    expect(summary.turnosCancelados).toBe(1);
    expect(summary.totalHonorariosEsperados).toBe(30000);
    expect(summary.totalHonorariosPercibidos).toBe(10000);
    expect(summary.porMetodoPago.efectivo).toBe(10000);
  });
});

describe('WhatsApp y teléfonos', () => {
  it('normaliza celulares argentinos a 549…', () => {
    expect(cleanPhoneNumber('+54 9 341 588-4321')).toMatch(/^549/);
    expect(cleanPhoneNumber('03415884321')).toMatch(/^549/);
    expect(cleanPhoneNumber('')).toBe('');
  });

  it('arma el recordatorio con links de confirmar y cancelar', () => {
    const payload = generateAppointmentReminder(sampleAppointment({ id: 'apt-demo' }));
    expect(payload.messageText).toContain('Estética Láser Rosario');
    expect(payload.messageText).toContain('Consulta Médica');
    expect(payload.whatsappLink).toContain('https://api.whatsapp.com/send');
    expect(payload.messageText).toMatch(/confirm_turno=apt-demo|CONFIRMO/);
  });
});

describe('importación de pacientes y export CSV', () => {
  it('normaliza fechas de planilla', () => {
    expect(normalizeDateString('15/04/1990')).toBe('1990-04-15');
    expect(normalizeDateString('1990-4-5')).toBe('1990-04-05');
    expect(normalizeDateString('')).toBe('');
  });

  it('parsea filas con Nombre y Apellido', () => {
    const result = parseRawRowsToPatients([
      { Nombre: 'María', Apellido: 'González', DNI: '35.420.198', Teléfono: '3415123456' },
      { Nombre: '', Apellido: '', DNI: '1' },
    ]);
    expect(result.importedCount).toBe(1);
    expect(result.patients[0].apellido).toBe('González');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('genera CSV del día con BOM y separador ;', () => {
    const csv = generateAppointmentsCSV('2026-09-11', [sampleAppointment()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Valentina Rossi');
    expect(csv.split('\r\n')[0]).toContain('Hora Inicio');
  });
});

describe('seguridad básica de helpers', () => {
  it('escapa HTML para impresión', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml(`a&b"c'`)).toContain('&amp;');
  });

  it('rechaza backups mal formados', () => {
    expect(validateBackupSavePayload(null).ok).toBe(false);
    expect(validateBackupSavePayload({ appointments: 'nope' }).ok).toBe(false);
    expect(validateBackupSavePayload({ appointments: [], patients: [] }).ok).toBe(true);
  });
});

describe('moneda', () => {
  it('formatea ARS', () => {
    const formatted = formatCurrency(32000);
    expect(formatted).toMatch(/32/);
  });
});
