import { describe, it, expect } from 'vitest';
import { cleanPhoneNumber, generateAppointmentReminder } from '../../src/utils/whatsapp';
import type { Appointment } from '../../src/types';

describe('cleanPhoneNumber', () => {
  it('returns empty string for missing input', () => {
    expect(cleanPhoneNumber(undefined)).toBe('');
    expect(cleanPhoneNumber('')).toBe('');
  });

  it('strips formatting characters and adds the AR country/mobile prefix for a local Rosario number', () => {
    expect(cleanPhoneNumber('341 588-4321')).toBe('5493415884321');
  });

  it('strips a leading 0 before normalizing', () => {
    expect(cleanPhoneNumber('0341 5884321')).toBe('5493415884321');
  });

  it('normalizes a number already carrying the country code without the mobile "9"', () => {
    expect(cleanPhoneNumber('+54 341 5884321')).toBe('5493415884321');
  });

  it('leaves an already-correct full international mobile number untouched', () => {
    expect(cleanPhoneNumber('+54 9 341 588-4321')).toBe('5493415884321');
  });
});

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-1',
    pacienteId: 'pat-1',
    pacienteNombre: 'Valentina Rossi',
    pacienteDni: '34.892.120',
    pacienteTelefono: '+54 9 341 588-4321',
    pacienteEmail: 'valentina@example.com',
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

describe('generateAppointmentReminder', () => {
  it('builds a WhatsApp link with the cleaned phone number and encoded message', () => {
    const payload = generateAppointmentReminder(makeAppointment());
    expect(payload.recipientPhone).toBe('5493415884321');
    expect(payload.whatsappLink).toContain('https://api.whatsapp.com/send?phone=5493415884321');
    expect(payload.whatsappLink).toContain('text=');
  });

  it('includes the patient name, treatment and clinic name in the plain message text', () => {
    const payload = generateAppointmentReminder(makeAppointment());
    expect(payload.messageText).toContain('Valentina Rossi');
    expect(payload.messageText).toContain('Esclero');
    expect(payload.messageText).toContain('Estética Láser Rosario');
  });

  it('builds a matching email subject and body', () => {
    const payload = generateAppointmentReminder(makeAppointment());
    expect(payload.emailSubject).toContain('Esclero');
    expect(payload.emailBody).toContain('Valentina Rossi');
  });
});
