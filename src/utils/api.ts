import { Patient, Appointment, HolidayOrNonWorkingDay, AutoBackupConfig, BackupHistoryItem } from '../types';

export class ApiError extends Error {}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Response body wasn't JSON — keep the generic status-based message.
    }
    throw new ApiError(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---

export function login(password: string): Promise<void> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
}

export function logout(): Promise<void> {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function checkSession(): Promise<boolean> {
  const data = await request<{ authenticated: boolean }>('/api/auth/me');
  return data.authenticated;
}

// --- Patients ---

export function fetchPatients(): Promise<Patient[]> {
  return request('/api/patients');
}

export function savePatient(patient: Patient): Promise<Patient> {
  return request(`/api/patients/${patient.id}`, { method: 'PUT', body: JSON.stringify(patient) });
}

export function deletePatient(id: string): Promise<void> {
  return request(`/api/patients/${id}`, { method: 'DELETE' });
}

export function bulkCreatePatients(
  patients: Patient[]
): Promise<{ created: Patient[]; skippedDuplicateDni: string[] }> {
  return request('/api/patients/bulk', { method: 'POST', body: JSON.stringify(patients) });
}

export function deleteAllPatients(): Promise<void> {
  return request('/api/patients', { method: 'DELETE' });
}

// --- Appointments ---

export function fetchAppointments(): Promise<Appointment[]> {
  return request('/api/appointments');
}

export function saveAppointment(appointment: Appointment): Promise<Appointment> {
  return request(`/api/appointments/${appointment.id}`, { method: 'PUT', body: JSON.stringify(appointment) });
}

export function deleteAppointment(id: string): Promise<void> {
  return request(`/api/appointments/${id}`, { method: 'DELETE' });
}

export function deleteAllAppointments(): Promise<void> {
  return request('/api/appointments', { method: 'DELETE' });
}

// --- Holidays ---

export function fetchHolidays(): Promise<HolidayOrNonWorkingDay[]> {
  return request('/api/holidays');
}

export function saveHoliday(
  date: string,
  reason: string,
  type?: HolidayOrNonWorkingDay['type']
): Promise<HolidayOrNonWorkingDay> {
  return request(`/api/holidays/${date}`, { method: 'PUT', body: JSON.stringify({ reason, type }) });
}

export function deleteHoliday(date: string): Promise<void> {
  return request(`/api/holidays/${date}`, { method: 'DELETE' });
}

// --- Backups ---

export function fetchBackupHistory(): Promise<BackupHistoryItem[]> {
  return request('/api/backups/history');
}

export function createBackupHistoryItem(item: BackupHistoryItem): Promise<BackupHistoryItem> {
  return request('/api/backups/history', { method: 'POST', body: JSON.stringify(item) });
}

export function fetchBackupConfig(): Promise<AutoBackupConfig> {
  return request('/api/backups/config');
}

export function saveBackupConfig(config: AutoBackupConfig): Promise<AutoBackupConfig> {
  return request('/api/backups/config', { method: 'PUT', body: JSON.stringify(config) });
}

// --- Demo data ---

export function loadDemoData(): Promise<{ patients: Patient[]; appointments: Appointment[] }> {
  return request('/api/demo/load', { method: 'POST' });
}

// --- Public (patient self-service, no auth) ---

export interface PublicAppointmentSummary {
  fecha: string;
  horaInicio: string;
  tratamientoNombre: string;
}

export function confirmAppointmentPublic(id: string): Promise<PublicAppointmentSummary> {
  return request(`/api/public/appointments/${encodeURIComponent(id)}/confirm`, { method: 'POST' });
}

export function cancelAppointmentPublic(id: string): Promise<PublicAppointmentSummary> {
  return request(`/api/public/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
