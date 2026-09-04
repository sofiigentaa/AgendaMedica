import { Appointment } from '../types';
import { getTreatmentById } from '../data/treatments';
import { formatDatePretty } from './storage';

export interface ReminderPayload {
  recipientPhone: string;
  recipientName: string;
  whatsappLink: string;
  messageText: string;
  emailSubject: string;
  emailBody: string;
}

export function cleanPhoneNumber(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  // Remove non-digit chars
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // If starts with 0 (e.g. 0341...), remove 0
  let clean = digits;
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  // If it's an Argentine number (starts with 341 or 549341 etc.)
  if (clean.startsWith('341') || clean.length === 10) {
    clean = '549' + clean;
  } else if (clean.startsWith('54') && !clean.startsWith('549')) {
    clean = '549' + clean.substring(2);
  }
  return clean;
}

export function generateAppointmentReminder(
  appt: Appointment,
  clinicName: string = 'Estética Láser Rosario',
  clinicAddress: string = 'Rosario, Santa Fe'
): ReminderPayload {
  const patientName = appt.pacienteNombre || 'Paciente';
  const treatmentName = appt.tratamientoNombre || 'Consulta Médica';
  const treatment = getTreatmentById(appt.tratamientoId || 'consulta');
  const prettyDate = formatDatePretty(appt.fecha);
  const cleanPhone = cleanPhoneNumber(appt.pacienteTelefono || '');

  // Self-service confirmation URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const confirmLink = baseUrl ? `${baseUrl}/?confirm_turno=${encodeURIComponent(appt.id || '')}` : '';
  const cancelLink = baseUrl ? `${baseUrl}/?cancel_turno=${encodeURIComponent(appt.id || '')}` : '';

  const messageText = `Hola *${patientName}*! 👋

Te recordamos tu turno médico en *${clinicName}*:
📅 *Fecha:* ${prettyDate}
⏰ *Horario:* ${appt.horaInicio || ''} hs a ${appt.horaFin || ''} hs (${appt.duracionMinutos || 15} minutos)
🩺 *Tratamiento:* ${treatmentName}
🏥 *Cobertura:* ${appt.obraSocial || 'Particular'}
📍 *Dirección:* ${clinicAddress}

ℹ️ *Indicaciones previas:*
_${treatment.prepInstructions || 'No requiere preparación previa.'}_

👉 *Para confirmar tu asistencia, respondé este mensaje con "CONFIRMO" o hacé clic aquí:*
${confirmLink ? confirmLink : 'Por favor responder "CONFIRMO"'}

👉 *Si necesitás cancelar o reprogramar:*
${cancelLink ? cancelLink : 'Por favor avisanos con anticipación'}

¡Muchas gracias!
*${clinicName}*`;

  const encodedText = encodeURIComponent(messageText);
  const whatsappLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

  const emailSubject = `Recordatorio de Turno Médico - ${treatmentName} (${prettyDate} ${appt.horaInicio || ''} hs)`;
  const emailBody = `Estimado/a ${patientName},

Le recordamos su próximo turno en ${clinicName}:
- Fecha: ${prettyDate}
- Horario: ${appt.horaInicio || ''} a ${appt.horaFin || ''} hs (Duración: ${appt.duracionMinutos || 15} min)
- Tratamiento: ${treatmentName}
- Cobertura: ${appt.obraSocial || 'Particular'}
- Dirección: ${clinicAddress}

Indicaciones de preparación:
${treatment.prepInstructions || 'No requiere preparación previa.'}

En caso de no poder asistir, le solicitamos comunicarse para reprogramar el turno.

Atentamente,
Equipo Médico - ${clinicName}`;

  return {
    recipientPhone: cleanPhone,
    recipientName: patientName,
    whatsappLink,
    messageText,
    emailSubject,
    emailBody
  };
}
