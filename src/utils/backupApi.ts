const MAX_BACKUP_ITEMS = 5000;

export interface BackupSavePayload {
  date?: unknown;
  appointments?: unknown;
  patients?: unknown;
  summary?: unknown;
  timestamp?: unknown;
}

export function validateBackupSavePayload(body: unknown): { ok: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Payload inválido' };
  }

  const { appointments, patients } = body as BackupSavePayload;

  if (appointments !== undefined && !Array.isArray(appointments)) {
    return { ok: false, error: 'appointments debe ser un array' };
  }
  if (patients !== undefined && !Array.isArray(patients)) {
    return { ok: false, error: 'patients debe ser un array' };
  }
  if (Array.isArray(appointments) && appointments.length > MAX_BACKUP_ITEMS) {
    return { ok: false, error: 'Demasiados turnos en el backup' };
  }
  if (Array.isArray(patients) && patients.length > MAX_BACKUP_ITEMS) {
    return { ok: false, error: 'Demasiados pacientes en el backup' };
  }

  return { ok: true };
}
