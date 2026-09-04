import * as XLSX from 'xlsx';
import { Appointment, Patient, DailySummary } from '../types';
import { formatDatePretty } from './storage';
import { formatCurrency } from '../data/treatments';
 
/**
 * Formats a birthdate value as "DD/MM/AAAA" for spreadsheet columns. Tolerant
 * of ISO ("1990-04-15"), already-DD/MM/YYYY text, and raw Excel serial-date
 * numbers left over from patients imported before dates were normalized on
 * import — so already-imported records display correctly without needing to
 * be re-imported. Returns '-' when the value is missing or unparseable.
 */
function formatShortDate(dateString?: string | null): string {
  const trimmed = (dateString || '').trim();
  if (!trimmed) return '-';
 
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    if (year && month && day) {
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  }
 
  // Already DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return `${day}/${month}/${year}`;
  }
 
  // Excel serial date number (patient imported before date normalization existed)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = parseFloat(trimmed);
    if (serial > 1 && serial < 100000) {
      const utcDays = Math.floor(serial - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      }
    }
  }
 
  return '-';
}
 
/**
 * Generates an Excel workbook (.xlsx) containing comprehensive daily records:
 * 1. Sheet "Turnos del Día"
 * 2. Sheet "Cierre y Balance Financiero"
 * 3. Sheet "Padrón de Pacientes"
 */
export function generateDailyExcelWorkbook(
  date: string,
  appointments: Appointment[],
  patients: Patient[],
  summary: DailySummary
): Blob {
  const dayAppointments = appointments.filter((a) => a.fecha === date);
 
  // 1. Appointments Table Data
  const apptsData = dayAppointments.map((apt, index) => ({
    '#': index + 1,
    'Hora Inicio': apt.horaInicio,
    'Hora Fin': apt.horaFin,
    'Duración (min)': apt.duracionMinutos,
    'Paciente': apt.pacienteNombre,
    'DNI': apt.pacienteDni,
    'Fecha de Nacimiento': formatShortDate(apt.pacienteFechaNacimiento),
    'Celular': apt.pacienteTelefono,
    'Email': apt.pacienteEmail || '-',
    'Tratamiento': apt.tratamientoNombre,
    'Cobertura': apt.coberturaTipo === 'obra_social' ? 'Obra Social / Prepaga' : 'Particular',
    'Obra Social / Prepaga': apt.obraSocial,
    'N° Afiliado': apt.numeroAfiliado || '-',
    'Honorarios ($)': apt.honorarios,
    'Estado del Turno': apt.estado.toUpperCase(),
    'Estado de Pago': apt.estadoPago.toUpperCase(),
    'Medio de Pago': (apt.metodoPago || '-').toUpperCase(),
    'Observaciones': apt.observaciones || '-'
  }));
 
  // 2. Financial Summary Sheet
  const summaryData = [
    { 'Concepto': 'Clínica', 'Detalle': 'Estética Láser Rosario' },
    { 'Concepto': 'Fecha de Cierre', 'Detalle': formatDatePretty(date) },
    { 'Concepto': 'Total Turnos Agendados', 'Detalle': summary.turnosTotales },
    { 'Concepto': 'Turnos Atendidos / Listos', 'Detalle': summary.turnosAtendidos },
    { 'Concepto': 'Turnos Confirmados', 'Detalle': summary.turnosConfirmados },
    { 'Concepto': 'Turnos Cancelados', 'Detalle': summary.turnosCancelados },
    { 'Concepto': 'Turnos No Asistió', 'Detalle': summary.turnosNoAsistio },
    { 'Concepto': '-------------------', 'Detalle': '-------------------' },
    { 'Concepto': 'TOTAL HONORARIOS ESPERADOS ($)', 'Detalle': summary.totalHonorariosEsperados },
    { 'Concepto': 'TOTAL HONORARIOS PERCIBIDOS ($)', 'Detalle': summary.totalHonorariosPercibidos },
    { 'Concepto': '-------------------', 'Detalle': '-------------------' },
    { 'Concepto': 'Cobrado en Efectivo ($)', 'Detalle': summary.porMetodoPago.efectivo || 0 },
    { 'Concepto': 'Cobrado por Transferencia ($)', 'Detalle': summary.porMetodoPago.transferencia || 0 },
    { 'Concepto': 'Cobrado por Débito ($)', 'Detalle': summary.porMetodoPago.debito || 0 },
    { 'Concepto': 'Cobrado por Crédito ($)', 'Detalle': summary.porMetodoPago.credito || 0 },
    { 'Concepto': 'Liquidación Obra Social Directa ($)', 'Detalle': summary.porMetodoPago.obra_social_directo || 0 },
    { 'Concepto': 'Pendiente de Cobro ($)', 'Detalle': summary.porMetodoPago.pendiente || 0 }
  ];
 
  // 3. Treatment Breakdown Data
  const treatmentsData = Object.entries(summary.porTratamiento).map(([tratamiento, stats]) => ({
    'Tratamiento': tratamiento,
    'Cantidad de Turnos': stats.cantidad,
    'Subtotal Recaudado ($)': stats.total
  }));
 
  // 4. Patients Directory
  const patientsData = patients.map((p, idx) => ({
    '#': idx + 1,
    'DNI': p.dni,
    'Nombre Completo': `${p.apellido}, ${p.nombre}`,
    'Celular': p.telefono,
    'Email': p.email,
    'Fecha de Nacimiento': formatShortDate(p.fechaNacimiento),
    'Cobertura': p.coberturaTipo === 'obra_social' ? 'Obra Social' : 'Particular',
    'Obra Social': p.obraSocial,
    'N° Afiliado': p.numeroAfiliado || '-',
    'Notas Médicas': p.notasMedicas || '-'
  }));
 
  // Create workbook
  const wb = XLSX.utils.book_new();
 
  // Add sheets
  const wsAppts = XLSX.utils.json_to_sheet(apptsData);
  XLSX.utils.book_append_sheet(wb, wsAppts, 'Turnos del Día');
 
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Cierre y Balance');
 
  const wsTreatments = XLSX.utils.json_to_sheet(treatmentsData);
  XLSX.utils.book_append_sheet(wb, wsTreatments, 'Detalle Tratamientos');
 
  const wsPatients = XLSX.utils.json_to_sheet(patientsData);
  XLSX.utils.book_append_sheet(wb, wsPatients, 'Padrón de Pacientes');
 
  // Convert to array buffer blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
 
/**
 * Generates standard UTF-8 CSV with semicolon separators (Excel-friendly in Latin America).
 */
export function generateAppointmentsCSV(date: string, appointments: Appointment[]): string {
  const dayAppointments = appointments.filter((a) => a.fecha === date);
 
  const headers = [
    'Fecha',
    'Hora Inicio',
    'Hora Fin',
    'Duracion Min',
    'Paciente',
    'DNI',
    'Fecha de Nacimiento',
    'Celular',
    'Email',
    'Tratamiento',
    'Cobertura',
    'Obra Social',
    'Nro Afiliado',
    'Honorarios ARS',
    'Estado Turno',
    'Estado Pago',
    'Metodo Pago',
    'Observaciones'
  ];
 
  const rows = dayAppointments.map((apt) => [
    apt.fecha,
    apt.horaInicio,
    apt.horaFin,
    apt.duracionMinutos,
    `"${(apt.pacienteNombre || '').replace(/"/g, '""')}"`,
    `"${apt.pacienteDni}"`,
    `"${formatShortDate(apt.pacienteFechaNacimiento)}"`,
    `"${apt.pacienteTelefono}"`,
    `"${apt.pacienteEmail || ''}"`,
    `"${apt.tratamientoNombre}"`,
    `"${apt.coberturaTipo}"`,
    `"${apt.obraSocial}"`,
    `"${apt.numeroAfiliado || ''}"`,
    apt.honorarios,
    `"${apt.estado}"`,
    `"${apt.estadoPago}"`,
    `"${apt.metodoPago}"`,
    `"${(apt.observaciones || '').replace(/"/g, '""')}"`
  ]);
 
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  return csvContent;
}
 
/**
 * Triggers direct browser download of a file blob or string.
 */
export function triggerFileDownload(content: Blob | string, filename: string, mimeType?: string): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType || 'text/csv;charset=utf-8;' });
 
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
 
/**
 * Executes a full backup export package (Excel + CSV + JSON snapshot)
 */
export function exportFullBackupPackage(
  date: string,
  appointments: Appointment[],
  patients: Patient[],
  summary: DailySummary
): { excelFileName: string; csvFileName: string; jsonFileName: string } {
  const dateTag = date.replace(/-/g, '');
  const excelName = `AgendaMedica_${dateTag}_CierreDia.xlsx`;
  const csvName = `AgendaMedica_${dateTag}_Turnos.csv`;
  const jsonName = `AgendaMedica_Backup_Completo_${dateTag}.json`;
 
  // 1. Download Excel
  const excelBlob = generateDailyExcelWorkbook(date, appointments, patients, summary);
  triggerFileDownload(excelBlob, excelName);
 
  // 2. Download CSV
  const csvContent = generateAppointmentsCSV(date, appointments);
  setTimeout(() => {
    triggerFileDownload(csvContent, csvName, 'text/csv;charset=utf-8;');
  }, 400);
 
  return {
    excelFileName: excelName,
    csvFileName: csvName,
    jsonFileName: jsonName
  };
}
 
