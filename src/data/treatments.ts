import { Treatment, InsuranceOption } from '../types';

export const TREATMENTS: Treatment[] = [
  {
    id: 'consulta',
    name: 'Consulta Médica',
    durationMinutes: 15,
    defaultFee: 15000,
    description: 'Evaluación clínica inicial, diagnóstico y control evolutivo.',
    prepInstructions: 'No requiere preparación previa. Traer estudios anteriores.',
    postCareInstructions: 'Seguir indicaciones de la receta médica y pautas de alarma.',
    color: '#0284c7', // Sky
    badgeBg: 'bg-sky-50 border-sky-200 text-sky-800',
    badgeText: 'text-sky-700'
  },
  {
    id: 'eco_doppler',
    name: 'Eco Doppler',
    durationMinutes: 30,
    defaultFee: 28000,
    description: 'Ecografía Doppler color vascular (venoso / arterial) de miembros inferiores o cuello.',
    prepInstructions: 'Ropa cómoda y holgada. Fácil de retirar. No requiere ayuno.',
    postCareInstructions: 'Retomar actividad normal de inmediato.',
    color: '#0d9488', // Teal
    badgeBg: 'bg-teal-50 border-teal-200 text-teal-800',
    badgeText: 'text-teal-700'
  },
  {
    id: 'eco_foam',
    name: 'Eco Foam y Esclero',
    durationMinutes: 30,
    defaultFee: 45000,
    description: 'Tratamiento de várices con microespuma ecoguiada y escleroterapia.',
    prepInstructions: 'Traer medias de compresión elástica indicadas en consulta. Higiene previa.',
    postCareInstructions: 'Colocar medias elásticas. Caminata inmediata de 20-30 minutos. Evitar sol y fuentes de calor intenso.',
    color: '#7c3aed', // Violet
    badgeBg: 'bg-purple-50 border-purple-200 text-purple-800',
    badgeText: 'text-purple-700'
  },
  {
    id: 'esclero',
    name: 'Esclero',
    durationMinutes: 30,
    defaultFee: 32000,
    description: 'Infiltración esclerosante para arañitas vasculares y várices finas.',
    prepInstructions: 'No aplicar cremas hidratantes en las piernas el día del turno. Traer medias de compresión.',
    postCareInstructions: 'Caminar 20 minutos post-sesión. Evitar exposición solar directa por 10-15 días. No realizar baños de inmersión calientes.',
    color: '#2563eb', // Blue
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
    badgeText: 'text-blue-700'
  },
  {
    id: 'esclero_laser',
    name: 'Esclero y Láser',
    durationMinutes: 45,
    defaultFee: 55000,
    description: 'Tratamiento combinado fototérmico y químico para máxima efectividad vascular.',
    prepInstructions: 'Piel limpia sin autobronceantes ni cremas. No depilarse 48 hs antes. Traer medias de compresión.',
    postCareInstructions: 'Protector solar FPS 50+ estricto. Uso de medias de compresión graduada. Caminata leve.',
    color: '#db2777', // Pink / Rose
    badgeBg: 'bg-pink-50 border-pink-200 text-pink-800',
    badgeText: 'text-pink-700'
  },
  {
    id: 'laser',
    name: 'Láser',
    durationMinutes: 30,
    defaultFee: 38000,
    description: 'Aplicación de láser específico transdérmico para telangiectasias y lesiones dérmicas.',
    prepInstructions: 'Evitar bronceado previo de 3 semanas. Traer la piel limpia sin maquillaje ni lociones.',
    postCareInstructions: 'Aplicar gel descongestivo / frío local. Usar protector solar cada 2 horas.',
    color: '#ea580c', // Orange
    badgeBg: 'bg-orange-50 border-orange-200 text-orange-800',
    badgeText: 'text-orange-700'
  },
  {
    id: 'mesoterapia',
    name: 'Mesoterapia',
    durationMinutes: 15,
    defaultFee: 22000,
    description: 'Microinyecciones intradérmicas con principios activos localizados.',
    prepInstructions: 'Zona limpia. No tomar aspirinas o anticoagulantes previos si no es por indicación médica estricta.',
    postCareInstructions: 'No realizar masajes bruscos en la zona en las 24 hs posteriores. Evitar natación o sauna el día de aplicación.',
    color: '#059669', // Emerald
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeText: 'text-emerald-700'
  },
  {
    id: 'no_dar',
    name: '⛔ NO DAR (Horario Bloqueado)',
    durationMinutes: 30,
    defaultFee: 0,
    description: 'Horario reservado/bloqueado. No otorgar turnos en esta franja horaria.',
    prepInstructions: 'No aplica.',
    postCareInstructions: 'No aplica.',
    color: '#475569', // Slate
    badgeBg: 'bg-slate-900 border-slate-700 text-amber-300',
    badgeText: 'text-amber-300'
  }
];

export const STATUS_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200'
  },
  atendido: {
    label: 'Atendido / Listo',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200'
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200'
  },
  no_asistio: {
    label: 'No asistió',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  }
};

export const INSURANCES: InsuranceOption[] = [
  { id: 'particular', name: 'Particular', category: 'particular', copagoEstimado: 0 },
  { id: 'la_segunda', name: 'La Segunda', category: 'prepaga', copagoEstimado: 0 },
  { id: 'swiss_medical', name: 'Swiss Medical', category: 'prepaga', copagoEstimado: 0 },
  { id: 'osde', name: 'OSDE', category: 'prepaga', copagoEstimado: 0 },
  { id: 'iapos', name: 'IAPOS', category: 'obra_social', copagoEstimado: 0 },
  { id: 'federada_salud', name: 'Federada Salud', category: 'prepaga', copagoEstimado: 0 },
  { id: 'galeno', name: 'Galeno', category: 'prepaga', copagoEstimado: 0 },
  { id: 'medife', name: 'Medifé', category: 'prepaga', copagoEstimado: 0 },
  { id: 'sancor_salud', name: 'SanCor Salud', category: 'prepaga', copagoEstimado: 0 },
  { id: 'medicus', name: 'Medicus', category: 'prepaga', copagoEstimado: 0 },
  { id: 'prevencion_salud', name: 'Prevención Salud', category: 'prepaga', copagoEstimado: 0 },
  { id: 'jerarquicos', name: 'Jerárquicos Salud', category: 'obra_social', copagoEstimado: 0 },
  { id: 'omint', name: 'OMINT', category: 'prepaga', copagoEstimado: 0 },
  { id: 'osecac', name: 'OSECAC', category: 'obra_social', copagoEstimado: 0 },
  { id: 'otra', name: 'Otra Obra Social / Prepaga', category: 'obra_social', copagoEstimado: 0 }
];

export const INSURANCE_SUGGESTIONS = [
  'Particular',
  'La Segunda',
  'Swiss Medical',
  'OSDE',
  'IAPOS',
  'Federada Salud',
  'Galeno',
  'Medifé',
  'SanCor Salud',
  'Medicus',
  'Prevención Salud',
  'Jerárquicos Salud',
  'OMINT',
  'OSECAC',
  'PAMI',
  'OSDEPYM',
  'Unión Personal',
  'Accord Salud',
  'Avalian'
];

export function getTreatmentById(id: string): Treatment {
  return (
    TREATMENTS.find((t) => t.id === id) || {
      id: 'consulta',
      name: 'Consulta Médica',
      durationMinutes: 15,
      defaultFee: 15000,
      description: 'Consulta médica',
      prepInstructions: 'Sin preparación.',
      postCareInstructions: 'Seguir indicaciones.',
      color: '#0284c7',
      badgeBg: 'bg-sky-50 border-sky-200 text-sky-800',
      badgeText: 'text-sky-700'
    }
  );
}

/**
 * Calculates the end time based on start time (HH:mm) and treatment duration in minutes.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || !startTime.includes(':')) return startTime;
  const [hStr, mStr] = startTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) return startTime;

  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;

  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
}
