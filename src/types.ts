export type TreatmentType =
  | 'consulta'
  | 'eco_doppler'
  | 'eco_foam'
  | 'esclero'
  | 'esclero_laser'
  | 'laser'
  | 'mesoterapia'
  | 'no_dar';

export interface Treatment {
  id: TreatmentType;
  name: string;
  durationMinutes: number; // 15, 30, 45 min
  defaultFee: number;
  description: string;
  prepInstructions: string;
  postCareInstructions: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export type InsuranceType =
  | 'swiss_medical'
  | 'la_segunda'
  | 'osde'
  | 'iapos'
  | 'federada_salud'
  | 'galeno'
  | 'medife'
  | 'sancor_salud'
  | 'medicus'
  | 'prevencion_salud'
  | 'jerarquicos'
  | 'omint'
  | 'osecac'
  | 'particular'
  | 'otra'
  | string;

export interface InsuranceOption {
  id: string;
  name: string;
  category: 'obra_social' | 'prepaga' | 'particular';
  copagoEstimado?: number;
}

export interface Patient {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string; // Móvil para WhatsApp
  fechaNacimiento: string; // YYYY-MM-DD
  coberturaTipo: 'obra_social' | 'particular';
  obraSocial: string; // ej. Swiss Medical Group, La Segunda, etc.
  numeroAfiliado?: string;
  notasMedicas?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | 'confirmado'
  | 'atendido'
  | 'cancelado'
  | 'no_asistio';

export type PaymentStatus = 'pendiente' | 'pagado' | 'facturado' | 'bonificado';

export type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'debito'
  | 'credito'
  | 'obra_social_directo'
  | 'pendiente';

export interface Appointment {
  id: string;
  pacienteId: string;
  // Patient snapshot in case patient record is deleted
  pacienteNombre: string;
  pacienteDni: string;
  pacienteTelefono: string;
  pacienteEmail: string;
  pacienteFechaNacimiento?: string;
  coberturaTipo: 'obra_social' | 'particular';
  obraSocial: string;
  numeroAfiliado?: string;

  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  tratamientoId: TreatmentType;
  tratamientoNombre: string;
  duracionMinutos: number; // 15, 30, 45 min
  horaFin: string; // HH:mm auto calculated

  honorarios: number; // Fee amount ($)
  estado: AppointmentStatus;
  estadoPago: PaymentStatus;
  metodoPago: PaymentMethod;
  
  recordatorioEnviado: boolean;
  ultimoRecordatorioAt?: string;
  
  observaciones?: string;
  esBloqueo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomMessageTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
}

export interface HolidayOrNonWorkingDay {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string; // e.g. "Feriado Nacional", "No laborable", "Vacaciones", etc.
  type: 'feriado' | 'no_laborable' | 'vacaciones';
  notes?: string;
  createdAt: string;
}

export interface DailySummary {
  fecha: string;
  totalHonorariosEsperados: number;
  totalHonorariosPercibidos: number;
  turnosTotales: number;
  turnosAtendidos: number;
  turnosConfirmados: number;
  turnosCancelados: number;
  turnosNoAsistio: number;
  porMetodoPago: Record<PaymentMethod, number>;
  porTratamiento: Record<string, { cantidad: number; total: number }>;
  porObraSocial: Record<string, { cantidad: number; total: number }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'agent';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'book_appointment' | 'confirm_reminder' | 'download_prep';
    payload?: any;
    label?: string;
  };
}

export interface AutoBackupConfig {
  enabled: boolean;
  nightlyHour: number; // e.g. 21 (21:00)
  nightlyMinute: number; // e.g. 30
  autoDownloadExcel: boolean;
  autoDownloadCsv: boolean;
  saveLocalHistory: boolean;
  lastBackupDate?: string;
  lastBackupTime?: string;
}

export interface BackupHistoryItem {
  id: string;
  date: string;
  timestamp: string;
  appointmentsCount: number;
  patientsCount: number;
  totalRevenue: number;
  jsonData: string;
}
