import { Patient, Appointment, DailySummary, AutoBackupConfig, BackupHistoryItem, PaymentMethod, HolidayOrNonWorkingDay } from '../types';
import { TREATMENTS } from '../data/treatments';

const PATIENTS_STORAGE_KEY = 'agenda_medica_patients_v1';
const APPOINTMENTS_STORAGE_KEY = 'agenda_medica_appointments_v1';
const BACKUP_CONFIG_KEY = 'agenda_medica_backup_config_v1';
const BACKUP_HISTORY_KEY = 'agenda_medica_backup_history_v1';
const HOLIDAYS_STORAGE_KEY = 'agenda_medica_holidays_v1';

// Official clinic working days (0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday)
export const CLINIC_WORKING_DAYS = [1, 2, 5]; // Lunes, Martes, Viernes
export const CLINIC_WORKING_HOURS = {
  start: '14:30',
  end: '20:00',
  label: '14:30 a 20:00 hs'
};

export const INITIAL_HOLIDAYS: HolidayOrNonWorkingDay[] = [
  {
    id: 'hol-1',
    date: '2026-01-01',
    reason: 'Año Nuevo',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-2',
    date: '2026-05-01',
    reason: 'Día del Trabajador',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-3',
    date: '2026-05-25',
    reason: 'Día de la Revolución de Mayo',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-4',
    date: '2026-06-20',
    reason: 'Paso a la Inmortalidad del Gral. Belgrano / Día de la Bandera (Rosario)',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-5',
    date: '2026-07-09',
    reason: 'Día de la Independencia',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-6',
    date: '2026-08-17',
    reason: 'Paso a la Inmortalidad del Gral. José de San Martín',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-7',
    date: '2026-10-12',
    reason: 'Día del Respeto a la Diversidad Cultural',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-8',
    date: '2026-12-08',
    reason: 'Inmaculada Concepción de María',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'hol-9',
    date: '2026-12-25',
    reason: 'Navidad',
    type: 'feriado',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export function loadHolidays(): HolidayOrNonWorkingDay[] {
  try {
    const data = localStorage.getItem(HOLIDAYS_STORAGE_KEY);
    if (!data) {
      saveHolidays(INITIAL_HOLIDAYS);
      return INITIAL_HOLIDAYS;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading holidays from localStorage', error);
    return INITIAL_HOLIDAYS;
  }
}

export function saveHolidays(holidays: HolidayOrNonWorkingDay[]): void {
  try {
    localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(holidays));
  } catch (error) {
    console.error('Error saving holidays to localStorage', error);
  }
}

export function isClinicWorkingDay(dateStr: string): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, 2 = Martes, 5 = Viernes
  return CLINIC_WORKING_DAYS.includes(dayOfWeek);
}

export function getNextWorkingDay(dateStr: string): string {
  if (!dateStr) return getTodayDateString();
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + i);
    const dayOfWeek = nextDate.getDay();
    if (CLINIC_WORKING_DAYS.includes(dayOfWeek)) {
      const ny = nextDate.getFullYear();
      const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nd = String(nextDate.getDate()).padStart(2, '0');
      return `${ny}-${nm}-${nd}`;
    }
  }
  return dateStr;
}

export function getPrevWorkingDay(dateStr: string): string {
  if (!dateStr) return getTodayDateString();
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  for (let i = 1; i <= 7; i++) {
    const prevDate = new Date(baseDate);
    prevDate.setDate(baseDate.getDate() - i);
    const dayOfWeek = prevDate.getDay();
    if (CLINIC_WORKING_DAYS.includes(dayOfWeek)) {
      const ny = prevDate.getFullYear();
      const nm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const nd = String(prevDate.getDate()).padStart(2, '0');
      return `${ny}-${nm}-${nd}`;
    }
  }
  return dateStr;
}

export function getDayOfWeekName(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()] || '';
  } catch {
    return '';
  }
}

export function getHolidayInfo(dateStr: string, holidays?: HolidayOrNonWorkingDay[]): HolidayOrNonWorkingDay | undefined {
  if (!dateStr || !holidays || !Array.isArray(holidays)) return undefined;
  return holidays.find((h) => h && h.date === dateStr);
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDatePretty(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  if (!dateString.includes('-')) return dateString;
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Initial seed patients
export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    dni: '34.892.120',
    nombre: 'Valentina',
    apellido: 'Rossi',
    email: 'valentina.rossi@gmail.com',
    telefono: '+54 9 341 588-4321',
    fechaNacimiento: '1989-04-15',
    coberturaTipo: 'obra_social',
    obraSocial: 'Swiss Medical Group',
    numeroAfiliado: 'SM-90238411-01',
    notasMedicas: 'Tratamiento por arañitas en miembros inferiores. Sin antecedentes alérgicos.',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'pat-2',
    dni: '28.114.903',
    nombre: 'Gonzalo',
    apellido: 'Martínez',
    email: 'gmartinez_rosario@hotmail.com',
    telefono: '+54 9 341 612-9844',
    fechaNacimiento: '1981-11-20',
    coberturaTipo: 'obra_social',
    obraSocial: 'La Segunda (Seguros / Salud)',
    numeroAfiliado: 'LS-440912-3',
    notasMedicas: 'Derivado por pesadez en gemelos post jornada laboral.',
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-08-05T12:00:00.000Z'
  },
  {
    id: 'pat-3',
    dni: '41.520.678',
    nombre: 'Camila',
    apellido: 'Benítez',
    email: 'camilabenitez.arg@gmail.com',
    telefono: '+54 9 341 334-7712',
    fechaNacimiento: '1998-07-09',
    coberturaTipo: 'particular',
    obraSocial: 'Particular',
    notasMedicas: 'Consulta estética para esclero y láser.',
    createdAt: '2026-08-10T09:30:00.000Z',
    updatedAt: '2026-08-10T09:30:00.000Z'
  },
  {
    id: 'pat-4',
    dni: '22.405.319',
    nombre: 'Esteban',
    apellido: 'Gómez Ferreyra',
    email: 'estebangomezf@yahoo.com.ar',
    telefono: '+54 9 341 498-1120',
    fechaNacimiento: '1972-03-30',
    coberturaTipo: 'obra_social',
    obraSocial: 'OSDE',
    numeroAfiliado: '21-0498210-9',
    notasMedicas: 'Control anual y eco doppler venoso bilateral.',
    createdAt: '2026-08-12T14:15:00.000Z',
    updatedAt: '2026-08-12T14:15:00.000Z'
  },
  {
    id: 'pat-5',
    dni: '38.740.912',
    nombre: 'Lucía',
    apellido: 'Santoro',
    email: 'lucia.santoro@outlook.com',
    telefono: '+54 9 341 721-0099',
    fechaNacimiento: '1995-09-18',
    coberturaTipo: 'obra_social',
    obraSocial: 'IAPOS (Santa Fe / Rosario)',
    numeroAfiliado: 'IAP-884129',
    notasMedicas: 'Mesoterapia corporal en zona de muslos.',
    createdAt: '2026-08-15T11:00:00.000Z',
    updatedAt: '2026-08-15T11:00:00.000Z'
  }
];

export function getInitialAppointments(): Appointment[] {
  // Si "hoy" no es un día de atención (ej. se carga la demo un miércoles,
  // jueves, sábado o domingo), los turnos de ejemplo se agendan en el
  // próximo día hábil en vez de quedar en un día que el médico no atiende.
  const todayStr = getTodayDateString();
  const today = isClinicWorkingDay(todayStr) ? todayStr : getNextWorkingDay(todayStr);
  return [
    {
      id: 'apt-1',
      pacienteId: 'pat-1',
      pacienteNombre: 'Valentina Rossi',
      pacienteDni: '34.892.120',
      pacienteTelefono: '+54 9 341 588-4321',
      pacienteEmail: 'valentina.rossi@gmail.com',
      pacienteFechaNacimiento: '1989-04-15',
      coberturaTipo: 'obra_social',
      obraSocial: 'Swiss Medical Group',
      numeroAfiliado: 'SM-90238411-01',
      fecha: today,
      horaInicio: '08:30',
      tratamientoId: 'esclero',
      tratamientoNombre: 'Esclero',
      duracionMinutos: 30,
      horaFin: '09:00',
      honorarios: 32000,
      estado: 'atendido',
      estadoPago: 'pagado',
      metodoPago: 'transferencia',
      recordatorioEnviado: true,
      ultimoRecordatorioAt: '2026-08-25T20:00:00.000Z',
      observaciones: 'Segunda sesión en pierna derecha. Trajo medias elásticas.',
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-26T09:00:00.000Z'
    },
    {
      id: 'apt-2',
      pacienteId: 'pat-2',
      pacienteNombre: 'Gonzalo Martínez',
      pacienteDni: '28.114.903',
      pacienteTelefono: '+54 9 341 612-9844',
      pacienteEmail: 'gmartinez_rosario@hotmail.com',
      pacienteFechaNacimiento: '1981-11-20',
      coberturaTipo: 'obra_social',
      obraSocial: 'La Segunda (Seguros / Salud)',
      numeroAfiliado: 'LS-440912-3',
      fecha: today,
      horaInicio: '09:00',
      tratamientoId: 'eco_doppler',
      tratamientoNombre: 'Eco Doppler',
      duracionMinutos: 30,
      horaFin: '09:30',
      honorarios: 28000,
      estado: 'atendido',
      estadoPago: 'pagado',
      metodoPago: 'efectivo',
      recordatorioEnviado: true,
      ultimoRecordatorioAt: '2026-08-25T20:00:00.000Z',
      observaciones: 'Eco Doppler venoso completo de ambos miembros.',
      createdAt: '2026-08-20T11:00:00.000Z',
      updatedAt: '2026-08-26T09:35:00.000Z'
    },
    {
      id: 'apt-3',
      pacienteId: 'pat-3',
      pacienteNombre: 'Camila Benítez',
      pacienteDni: '41.520.678',
      pacienteTelefono: '+54 9 341 334-7712',
      pacienteEmail: 'camilabenitez.arg@gmail.com',
      pacienteFechaNacimiento: '1998-07-09',
      coberturaTipo: 'particular',
      obraSocial: 'Particular',
      fecha: today,
      horaInicio: '09:30',
      tratamientoId: 'esclero_laser',
      tratamientoNombre: 'Esclero y Láser',
      duracionMinutos: 45,
      horaFin: '10:15',
      honorarios: 55000,
      estado: 'confirmado',
      estadoPago: 'pendiente',
      metodoPago: 'pendiente',
      recordatorioEnviado: true,
      ultimoRecordatorioAt: '2026-08-25T20:05:00.000Z',
      observaciones: 'Sesión combinada. Se le entregó folleto de cuidados solares.',
      createdAt: '2026-08-21T09:00:00.000Z',
      updatedAt: '2026-08-26T09:25:00.000Z'
    },
    {
      id: 'apt-4',
      pacienteId: 'pat-4',
      pacienteNombre: 'Esteban Gómez Ferreyra',
      pacienteDni: '22.405.319',
      pacienteTelefono: '+54 9 341 498-1120',
      pacienteEmail: 'estebangomezf@yahoo.com.ar',
      pacienteFechaNacimiento: '1972-03-30',
      coberturaTipo: 'obra_social',
      obraSocial: 'OSDE',
      numeroAfiliado: '21-0498210-9',
      fecha: today,
      horaInicio: '10:30',
      tratamientoId: 'eco_foam',
      tratamientoNombre: 'Eco Foam y Esclero',
      duracionMinutos: 30,
      horaFin: '11:00',
      honorarios: 45000,
      estado: 'confirmado',
      estadoPago: 'pendiente',
      metodoPago: 'pendiente',
      recordatorioEnviado: true,
      ultimoRecordatorioAt: '2026-08-25T20:10:00.000Z',
      observaciones: 'Traer medias compresión 20-30 mmHg.',
      createdAt: '2026-08-22T14:00:00.000Z',
      updatedAt: '2026-08-25T20:10:00.000Z'
    },
    {
      id: 'apt-5',
      pacienteId: 'pat-5',
      pacienteNombre: 'Lucía Santoro',
      pacienteDni: '38.740.912',
      pacienteTelefono: '+54 9 341 721-0099',
      pacienteEmail: 'lucia.santoro@outlook.com',
      pacienteFechaNacimiento: '1995-09-18',
      coberturaTipo: 'obra_social',
      obraSocial: 'IAPOS (Santa Fe / Rosario)',
      numeroAfiliado: 'IAP-884129',
      fecha: today,
      horaInicio: '11:00',
      tratamientoId: 'mesoterapia',
      tratamientoNombre: 'Mesoterapia',
      duracionMinutos: 15,
      horaFin: '11:15',
      honorarios: 22000,
      estado: 'confirmado',
      estadoPago: 'pendiente',
      metodoPago: 'pendiente',
      recordatorioEnviado: false,
      observaciones: 'Sesión de mantenimiento.',
      createdAt: '2026-08-23T15:00:00.000Z',
      updatedAt: '2026-08-23T15:00:00.000Z'
    },
    {
      id: 'apt-6',
      pacienteId: 'pat-1',
      pacienteNombre: 'Valentina Rossi',
      pacienteDni: '34.892.120',
      pacienteTelefono: '+54 9 341 588-4321',
      pacienteEmail: 'valentina.rossi@gmail.com',
      pacienteFechaNacimiento: '1989-04-15',
      coberturaTipo: 'obra_social',
      obraSocial: 'Swiss Medical Group',
      numeroAfiliado: 'SM-90238411-01',
      fecha: today,
      horaInicio: '11:30',
      tratamientoId: 'consulta',
      tratamientoNombre: 'Consulta Médica',
      duracionMinutos: 15,
      horaFin: '11:45',
      honorarios: 15000,
      estado: 'confirmado',
      estadoPago: 'pendiente',
      metodoPago: 'pendiente',
      recordatorioEnviado: false,
      observaciones: 'Revisión general y plan de tratamiento.',
      createdAt: '2026-08-24T16:00:00.000Z',
      updatedAt: '2026-08-24T16:00:00.000Z'
    },
    {
      id: 'apt-7',
      pacienteId: 'pat-3',
      pacienteNombre: 'Camila Benítez',
      pacienteDni: '41.520.678',
      pacienteTelefono: '+54 9 341 334-7712',
      pacienteEmail: 'camilabenitez.arg@gmail.com',
      pacienteFechaNacimiento: '1998-07-09',
      coberturaTipo: 'particular',
      obraSocial: 'Particular',
      fecha: today,
      horaInicio: '12:00',
      tratamientoId: 'laser',
      tratamientoNombre: 'Láser',
      duracionMinutos: 30,
      horaFin: '12:30',
      honorarios: 38000,
      estado: 'confirmado',
      estadoPago: 'pendiente',
      metodoPago: 'pendiente',
      recordatorioEnviado: false,
      observaciones: 'Láser en rostro / telangiectasias alares.',
      createdAt: '2026-08-24T16:30:00.000Z',
      updatedAt: '2026-08-24T16:30:00.000Z'
    }
  ];
}

// Local Storage helpers
export function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
      return INITIAL_PATIENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading patients from localStorage', err);
    return INITIAL_PATIENTS;
  }
}

export function savePatients(patients: Patient[]): void {
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  } catch (err) {
    console.error('Error saving patients to localStorage', err);
  }
}

export function loadAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialAppointments();
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading appointments from localStorage', err);
    return getInitialAppointments();
  }
}

export function saveAppointments(appointments: Appointment[]): void {
  try {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
  } catch (err) {
    console.error('Error saving appointments to localStorage', err);
  }
}

export function loadBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore
  }
  return {
    enabled: false,
    nightlyHour: 21,
    nightlyMinute: 0,
    autoDownloadExcel: false,
    autoDownloadCsv: false,
    saveLocalHistory: true,
    lastBackupDate: undefined,
    lastBackupTime: undefined
  };
}

export function saveBackupConfig(config: AutoBackupConfig): void {
  try {
    localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving backup config', e);
  }
}

export function loadBackupHistory(): BackupHistoryItem[] {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading backup history', e);
  }
  return [];
}

export function saveBackupHistoryItem(item: BackupHistoryItem): void {
  try {
    const list = loadBackupHistory();
    // Keep max 30 days of snapshots
    const updated = [item, ...list.filter((x) => x.id !== item.id)].slice(0, 30);
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving backup history item', e);
  }
}

export function deleteBackupHistoryItem(id: string): BackupHistoryItem[] {
  try {
    const list = loadBackupHistory();
    const updated = list.filter((x) => x.id !== id);
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting backup history item', e);
    return [];
  }
}

export function clearAllBackupHistory(): void {
  try {
    localStorage.removeItem(BACKUP_HISTORY_KEY);
  } catch (e) {
    console.error('Error clearing backup history', e);
  }
}

/**
 * Computes daily summary for a specific date (YYYY-MM-DD).
 */
export function computeDailySummary(appointments: Appointment[], date: string): DailySummary {
  const dayAppts = appointments.filter((a) => a.fecha === date);

  let totalEsperados = 0;
  let totalPercibidos = 0;
  let atendidos = 0;
  let confirmados = 0;
  let cancelados = 0;
  let noAsistio = 0;

  const porMetodoPago: Record<PaymentMethod, number> = {
    efectivo: 0,
    transferencia: 0,
    debito: 0,
    credito: 0,
    obra_social_directo: 0,
    pendiente: 0
  };

  const porTratamiento: Record<string, { cantidad: number; total: number }> = {};
  const porObraSocial: Record<string, { cantidad: number; total: number }> = {};

  // Initialize treatments map
  TREATMENTS.forEach((t) => {
    porTratamiento[t.name] = { cantidad: 0, total: 0 };
  });

  dayAppts.forEach((appt) => {
    const fee = Number(appt.honorarios) || 0;
    
    if (appt.estado !== 'cancelado') {
      totalEsperados += fee;
    }

    if (appt.estado === 'atendido') {
      atendidos++;
    } else if (appt.estado === 'confirmado') {
      confirmados++;
    } else if (appt.estado === 'cancelado') {
      cancelados++;
    } else if (appt.estado === 'no_asistio') {
      noAsistio++;
    }

    // Revenue collected
    if (appt.estadoPago === 'pagado' || (appt.estado === 'atendido' && appt.estadoPago !== 'bonificado')) {
      totalPercibidos += fee;

      const m = appt.metodoPago || 'efectivo';
      porMetodoPago[m] = (porMetodoPago[m] || 0) + fee;
    }

    // By treatment
    const treatName = appt.tratamientoNombre || 'Otros';
    if (!porTratamiento[treatName]) {
      porTratamiento[treatName] = { cantidad: 0, total: 0 };
    }
    if (appt.estado !== 'cancelado') {
      porTratamiento[treatName].cantidad += 1;
      porTratamiento[treatName].total += fee;
    }

    // By insurance
    const insName = appt.obraSocial || 'Particular';
    if (!porObraSocial[insName]) {
      porObraSocial[insName] = { cantidad: 0, total: 0 };
    }
    if (appt.estado !== 'cancelado') {
      porObraSocial[insName].cantidad += 1;
      porObraSocial[insName].total += fee;
    }
  });

  return {
    fecha: date,
    totalHonorariosEsperados: totalEsperados,
    totalHonorariosPercibidos: totalPercibidos,
    turnosTotales: dayAppts.length,
    turnosAtendidos: atendidos,
    turnosConfirmados: confirmados,
    turnosCancelados: cancelados,
    turnosNoAsistio: noAsistio,
    porMetodoPago,
    porTratamiento,
    porObraSocial
  };
}
