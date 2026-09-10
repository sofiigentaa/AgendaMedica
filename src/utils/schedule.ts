import { Appointment } from '../types';

/**
 * Two time ranges overlap when each starts before the other ends (HH:mm, same day).
 */
export function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && endA > startB;
}

/**
 * Appointments that collide with a proposed slot on the same date.
 * Cancelled appointments are ignored. `excludeId` is used when editing.
 */
export function findOverlappingAppointments(
  appointments: Appointment[],
  fecha: string,
  horaInicio: string,
  horaFin: string,
  excludeId?: string
): Appointment[] {
  if (!fecha || !horaInicio || !horaFin) return [];
  return appointments.filter((a) => {
    if (excludeId && a.id === excludeId) return false;
    if (a.fecha !== fecha) return false;
    if (a.estado === 'cancelado') return false;
    return timeRangesOverlap(horaInicio, horaFin, a.horaInicio, a.horaFin);
  });
}

export function isValidTimeHHmm(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isOutsideClinicHours(horaInicio: string, horaFin: string, start = '14:30', end = '20:00'): boolean {
  if (!horaInicio || !isValidTimeHHmm(horaInicio)) return false;
  return horaInicio < start || Boolean(horaFin && horaFin > end);
}
