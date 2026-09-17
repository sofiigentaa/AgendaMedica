import * as XLSX from 'xlsx';
import { Appointment, Patient, TreatmentType } from '../types';
import { TREATMENTS, calculateEndTime, calculateDurationMinutes } from '../data/treatments';
import { normalizeDateString } from './excelImport';

export interface TurnoImportWarning {
  sheet: string;
  fecha: string;
  detail: string;
}

export interface TurnosImportResult {
  success: boolean;
  appointments: Appointment[];
  warnings: TurnoImportWarning[];
  errors: string[];
  totalSlotsScanned: number;
  importedCount: number;
  skippedNoPatientMatch: number;
}

/**
 * Same normalization used across excelImport.ts: strips accents, lowercases,
 * removes spaces/punctuation so header labels compare cleanly regardless of
 * capitalization or the exact punctuation used in the template
 * ("Nº Documento", "Hora de finalización", "Apellido, Nombre", etc.).
 */
function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_\-.\/()[\]#:*,+]/g, '');
}

function normalizeDni(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Copies merged-cell values down/across into every cell the merge covers,
 * same approach as excelImport.ts's expandMergedCells (duplicated here to
 * keep this module independent — patient and turno sheets are read from
 * separate XLSX.WorkSheet objects and never share a worksheet instance).
 */
function expandMergedCells(worksheet: XLSX.WorkSheet, raw2D: any[][]): void {
  const merges = worksheet['!merges'] as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> | undefined;
  if (!merges || merges.length === 0) return;
  merges.forEach((merge) => {
    const topLeftRow = raw2D[merge.s.r];
    if (!topLeftRow) return;
    const topLeftValue = topLeftRow[merge.s.c];
    if (topLeftValue === undefined || topLeftValue === null || topLeftValue === '') return;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      if (!raw2D[r]) raw2D[r] = [];
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (raw2D[r][c] === undefined || raw2D[r][c] === null || raw2D[r][c] === '') {
          raw2D[r][c] = topLeftValue;
        }
      }
    }
  });
}

/**
 * Converts a "Horario" / "Hora de finalización" cell into "HH:MM", handling
 * both a typed clock string ("14:30" / "14:30:00") and a genuine Excel time
 * cell (a fraction of a day, e.g. 0.604166... for 14:30). Returns '' if the
 * cell isn't recognizable as a time at all — this doubles as the signal that
 * a row isn't a real time-slot row (see scanning loop below).
 */
function normalizeClockTime(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = parseFloat(trimmed);
    if (n >= 0 && n < 1) {
      const totalMinutes = Math.round(n * 24 * 60);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * Converts a "Duracion" cell into whole minutes. The template stores this as
 * a duration-shaped time value ("0:15:00" = 15 min), but also tolerates a
 * plain number of minutes typed directly, or an Excel duration serial
 * (fraction of a day).
 */
function parseDurationMinutes(raw: string): number {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 0;

  const hhmmss = trimmed.match(/^(\d{1,3}):(\d{2})(:(\d{2}))?$/);
  if (hhmmss) {
    const h = parseInt(hhmmss[1], 10);
    const m = parseInt(hhmmss[2], 10);
    const s = hhmmss[4] ? parseInt(hhmmss[4], 10) : 0;
    return Math.round(h * 60 + m + s / 60);
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = parseFloat(trimmed);
    // A bare number under 1 is almost certainly an Excel duration serial
    // (fraction of a day); anything else is treated as literal minutes.
    if (n > 0 && n < 1) return Math.round(n * 24 * 60);
    if (n >= 1 && n <= 600) return Math.round(n);
  }

  return 0;
}

function parseHonorarios(raw: string): number {
  const cleaned = (raw || '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Locates the "Dia" and "Fecha" header labels within a block-start row and
 * returns their column positions, instead of assuming fixed columns 0/1 —
 * the real template shifts these labels to different columns from sheet to
 * sheet (e.g. column B/C in some months, B/F in others). The day-name and
 * date VALUES on the row right below the header always line up with these
 * same column indices, so the caller reads them from there.
 */
function findDiaFechaColumns(row: string[]): { diaCol: number; fechaCol: number } | null {
  let diaCol = -1;
  let fechaCol = -1;
  for (let i = 0; i < row.length; i++) {
    const norm = normalizeKey(row[i]);
    if (norm === 'dia' && diaCol === -1) diaCol = i;
    if (norm === 'fecha' && fechaCol === -1) fechaCol = i;
  }
  return diaCol === -1 || fechaCol === -1 ? null : { diaCol, fechaCol };
}

interface ColumnMap {
  horario: number;
  nombre: number;
  tipoDoc: number;
  nDocumento: number;
  celular: number;
  telFijo: number;
  obraSocial: number;
  tratamiento: number;
  duracion: number;
  horaFin: number;
  honorario: number;
}

function mapHeaderColumns(headerRow: string[]): ColumnMap | null {
  const find = (...keywords: string[]): number => {
    for (let i = 0; i < headerRow.length; i++) {
      const norm = normalizeKey(headerRow[i]);
      if (!norm) continue;
      if (keywords.some((kw) => norm.includes(kw))) return i;
    }
    return -1;
  };

  const horario = find('horario', 'hora');
  const nombre = find('apellidonombre', 'nombreapellido', 'paciente');
  if (horario === -1 || nombre === -1) return null;

  return {
    horario,
    nombre,
    tipoDoc: find('tipodoc'),
    nDocumento: find('ndocumento', 'documento', 'dni'),
    celular: find('celular', 'movil', 'whatsapp'),
    telFijo: find('telfijo', 'telefonofijo'),
    obraSocial: find('obrasocial', 'cobertura', 'prepaga'),
    tratamiento: find('tratamiento'),
    duracion: find('duracion'),
    horaFin: find('horadefinalizacion', 'horafin', 'finalizacion'),
    honorario: find('honorario', 'arancel', 'monto')
  };
}

/**
 * Reads the "Variables" sheet (Tratamientos / Duración lookup table) into a
 * normalized-name → minutes map, used as a fallback whenever a turno row's
 * own "Duracion" cell is empty.
 */
function buildDurationLookup(workbook: XLSX.WorkBook): Map<string, number> {
  const lookup = new Map<string, number>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (raw2D.length === 0) continue;

    for (let i = 0; i < Math.min(raw2D.length, 5); i++) {
      const row = (raw2D[i] || []).map((c: any) => (c !== undefined && c !== null ? String(c) : ''));
      const treatCol = row.findIndex((c) => normalizeKey(c).includes('tratamiento'));
      const durCol = row.findIndex((c) => normalizeKey(c).includes('duracion'));
      if (treatCol === -1 || durCol === -1) continue;

      // Found the header row of the Variables sheet — read every row below it.
      for (let r = i + 1; r < raw2D.length; r++) {
        const dataRow = (raw2D[r] || []).map((c: any) => (c !== undefined && c !== null ? String(c) : ''));
        const name = (dataRow[treatCol] || '').trim();
        if (!name) continue;
        const minutes = parseDurationMinutes(dataRow[durCol] || '');
        if (minutes > 0) lookup.set(normalizeKey(name), minutes);
      }
      break;
    }
  }

  return lookup;
}

/** Fuzzy-matches a free-text treatment name against the app's fixed treatment list. */
function matchTreatment(rawName: string): { id: TreatmentType; name: string; defaultFee: number } | null {
  const norm = normalizeKey(rawName);
  if (!norm) return null;
  let best: { id: TreatmentType; name: string; defaultFee: number } | null = null;
  let bestLen = 0;
  for (const t of TREATMENTS) {
    if (t.id === 'no_dar') continue;
    const tNorm = normalizeKey(t.name);
    if (tNorm === norm) return { id: t.id, name: t.name, defaultFee: t.defaultFee };
    if (norm.includes(tNorm) || tNorm.includes(norm)) {
      if (tNorm.length > bestLen) {
        best = { id: t.id, name: t.name, defaultFee: t.defaultFee };
        bestLen = tNorm.length;
      }
    }
  }
  return best;
}

/**
 * Parses the full Turnos/Agenda workbook: scans every sheet for repeating
 * "Dia" / "Fecha" day-blocks (one per day, each with its own header row and
 * a stack of time-slot rows below it — see the template's real layout), and
 * turns the occupied slots into Appointment records matched against the
 * existing patient list by DNI.
 *
 * Per the confirmed behaviour: a turno whose DNI isn't found in `patients`
 * is skipped (not created), and reported back as a warning so it can be
 * loaded by hand instead.
 */
function parseTurnosWorkbookBuffer(buffer: ArrayBuffer, patients: Patient[]): TurnosImportResult {
  try {
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const durationLookup = buildDurationLookup(workbook);
    const patientByDni = new Map<string, Patient>();
    patients.forEach((p) => {
      const norm = normalizeDni(p.dni);
      if (norm) patientByDni.set(norm, p);
    });

    const appointments: Appointment[] = [];
    const warnings: TurnoImportWarning[] = [];
    let totalSlotsScanned = 0;
    let skippedNoPatientMatch = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (raw2D.length === 0) continue;
      expandMergedCells(worksheet, raw2D);
      const rows = raw2D.map((row) => (row || []).map((c: any) => (c !== undefined && c !== null ? String(c) : '')));

      let i = 0;
      while (i < rows.length) {
        const diaFechaCols = findDiaFechaColumns(rows[i]);
        if (!diaFechaCols) {
          i++;
          continue;
        }

        // rows[i] = [.., "Dia", .., "Fecha", ..], rows[i+1] = [.., "VIERNES", .., 46024, ..]
        // (day-name/date values line up with the same columns as the labels above them),
        // rows[i+2] = column headers, rows[i+3..] = time-slot rows.
        const dayNameRow = rows[i + 1] || [];
        const fecha = normalizeDateString(dayNameRow[diaFechaCols.fechaCol] || '');
        const headerRow = rows[i + 2] || [];
        const columns = mapHeaderColumns(headerRow);

        if (!fecha || !columns) {
          // No pudimos leer este bloque con confianza; lo saltamos como
          // advertencia en vez de arriesgarnos a interpretarlo mal.
          warnings.push({
            sheet: sheetName,
            fecha: dayNameRow[1] || '(fecha no reconocida)',
            detail: 'No se pudo leer la fecha o los encabezados de este bloque de día; se omitió por completo.'
          });
          i += 3;
          continue;
        }

        // El template marca un horario reservado (cirugía, reunión, ausencia,
        // etc.) escribiendo "NO DAR" o "NO ESTOY" en la columna de nombre
        // para cada franja que cubre, con el resto de la fila en "#N/A" (una
        // búsqueda de paciente que no encontró nada). En vez de tratarlas
        // como turnos con paciente no encontrado (que las dejaba afuera
        // silenciosamente) o crear un bloqueo separado por cada franja de
        // 15/30 min, se fusionan las franjas consecutivas en un único
        // bloqueo de agenda — el mismo tipo de registro que crea "Bloquear
        // Horario (NO DAR)" a mano — así el calendario muestra un solo
        // bloque en vez de una fila de mini-bloqueos pegados.
        let noDarStart: string | null = null;
        let noDarEnd: string | null = null;
        const noDarLabels: string[] = [];
        const flushNoDarRun = () => {
          if (!noDarStart || !noDarEnd) return;
          // El médico puede escribir "NO DAR", "NO ESTOY" u otra variante en
          // cada franja bloqueada — se conserva ese texto tal cual en vez de
          // un motivo genérico fijo, para que la agenda diga exactamente lo
          // mismo que la planilla (si una franja mezcla más de un texto, se
          // muestran todos separados por "/").
          const label = noDarLabels.join(' / ') || 'NO DAR';
          const now = new Date().toISOString();
          appointments.push({
            id: `turno-imp-${Date.now()}-${appointments.length}-${Math.random().toString(36).substr(2, 4)}`,
            pacienteId: 'bloqueo-agenda',
            pacienteNombre: `⛔ ${label} - Horario Bloqueado`,
            pacienteDni: '-',
            pacienteTelefono: '-',
            pacienteEmail: '',
            pacienteFechaNacimiento: '',
            coberturaTipo: 'particular',
            obraSocial: 'NO DAR',
            numeroAfiliado: '',
            fecha,
            horaInicio: noDarStart,
            tratamientoId: 'no_dar',
            tratamientoNombre: '⛔ NO DAR (Horario Bloqueado)',
            duracionMinutos: calculateDurationMinutes(noDarStart, noDarEnd),
            horaFin: noDarEnd,
            honorarios: 0,
            estado: 'confirmado',
            estadoPago: 'bonificado',
            metodoPago: 'pendiente',
            recordatorioEnviado: false,
            esBloqueo: true,
            observaciones: `Importado desde la hoja de Google Sheets (${label}).`,
            createdAt: now,
            updatedAt: now
          });
          noDarStart = null;
          noDarEnd = null;
          noDarLabels.length = 0;
        };

        let r = i + 3;
        while (r < rows.length) {
          const row = rows[r];
          const horaInicio = normalizeClockTime(row[columns.horario] || '');
          if (!horaInicio) {
            flushNoDarRun();
            break; // fin del bloque (fila Total, fila en blanco, o próximo Dia/Fecha)
          }

          totalSlotsScanned++;
          const nombreCombinado = (row[columns.nombre] || '').trim();

          const nombreCombinadoKey = normalizeKey(nombreCombinado);
          if (nombreCombinadoKey === 'nodar' || nombreCombinadoKey === 'noestoy') {
            const duracionCell = columns.duracion >= 0 ? row[columns.duracion] || '' : '';
            const horaFinCell = columns.horaFin >= 0 ? normalizeClockTime(row[columns.horaFin] || '') : '';
            let duracionMinutos = parseDurationMinutes(duracionCell);
            let horaFin = horaFinCell;
            if (duracionMinutos <= 0 && horaFin) {
              duracionMinutos = calculateDurationMinutes(horaInicio, horaFin);
            }
            if (duracionMinutos <= 0) duracionMinutos = 15;
            if (!horaFin) horaFin = calculateEndTime(horaInicio, duracionMinutos);

            if (!noDarStart) noDarStart = horaInicio;
            noDarEnd = horaFin;
            const label = nombreCombinado.toUpperCase();
            if (!noDarLabels.includes(label)) noDarLabels.push(label);
            r++;
            continue;
          }

          flushNoDarRun();

          if (!nombreCombinado) {
            r++;
            continue; // horario libre, sin turno cargado
          }

          const nDocumentoRaw = columns.nDocumento >= 0 ? row[columns.nDocumento] || '' : '';
          const dniNorm = normalizeDni(nDocumentoRaw);
          const matchedPatient = dniNorm ? patientByDni.get(dniNorm) : undefined;

          if (!matchedPatient) {
            skippedNoPatientMatch++;
            warnings.push({
              sheet: sheetName,
              fecha,
              detail: `${horaInicio} — ${nombreCombinado}${
                nDocumentoRaw ? ` (Doc. ${nDocumentoRaw})` : ' (sin N° de Documento)'
              }: no se encontró un paciente con ese DNI en el Padrón. No se importó; cargalo a mano si corresponde.`
            });
            r++;
            continue;
          }

          const tratamientoRaw = columns.tratamiento >= 0 ? row[columns.tratamiento] || '' : '';
          const matchedTreatment = matchTreatment(tratamientoRaw);
          const treatmentId: TreatmentType = matchedTreatment?.id || 'consulta';
          const treatmentName = matchedTreatment?.name || 'Consulta Médica';
          if (tratamientoRaw && !matchedTreatment) {
            warnings.push({
              sheet: sheetName,
              fecha,
              detail: `${horaInicio} — ${nombreCombinado}: el tratamiento "${tratamientoRaw}" no coincide con ninguno de los tratamientos configurados; se importó como "Consulta Médica".`
            });
          }

          const duracionCell = columns.duracion >= 0 ? row[columns.duracion] || '' : '';
          const horaFinCell = columns.horaFin >= 0 ? normalizeClockTime(row[columns.horaFin] || '') : '';

          let duracionMinutos = parseDurationMinutes(duracionCell);
          let horaFin = horaFinCell;

          if (duracionMinutos <= 0 && horaFin) {
            duracionMinutos = calculateDurationMinutes(horaInicio, horaFin);
          }
          if (duracionMinutos <= 0 && tratamientoRaw) {
            duracionMinutos = durationLookup.get(normalizeKey(tratamientoRaw)) || 0;
          }
          if (duracionMinutos <= 0) {
            duracionMinutos = matchedTreatment
              ? TREATMENTS.find((t) => t.id === matchedTreatment.id)?.durationMinutes || 15
              : 15;
          }
          if (!horaFin) {
            horaFin = calculateEndTime(horaInicio, duracionMinutos);
          }

          const honorariosCell = columns.honorario >= 0 ? row[columns.honorario] || '' : '';
          const honorarios = parseHonorarios(honorariosCell) || matchedTreatment?.defaultFee || 0;

          const telefono =
            (columns.celular >= 0 ? row[columns.celular] : '') ||
            (columns.telFijo >= 0 ? row[columns.telFijo] : '') ||
            matchedPatient.telefono;

          const now = new Date().toISOString();
          appointments.push({
            id: `turno-imp-${Date.now()}-${appointments.length}-${Math.random().toString(36).substr(2, 4)}`,
            pacienteId: matchedPatient.id,
            pacienteNombre: `${matchedPatient.apellido}, ${matchedPatient.nombre}`.replace(/^, /, ''),
            pacienteDni: matchedPatient.dni,
            pacienteTelefono: telefono || matchedPatient.telefono,
            pacienteEmail: matchedPatient.email || '',
            pacienteFechaNacimiento: matchedPatient.fechaNacimiento,
            coberturaTipo: matchedPatient.coberturaTipo,
            obraSocial: matchedPatient.obraSocial,
            numeroAfiliado: matchedPatient.numeroAfiliado,
            fecha,
            horaInicio,
            tratamientoId: treatmentId,
            tratamientoNombre: treatmentName,
            duracionMinutos,
            horaFin,
            honorarios,
            estado: 'confirmado',
            estadoPago: 'pendiente',
            metodoPago: 'pendiente',
            recordatorioEnviado: false,
            sourceSheetName: sheetName,
            sourceRowNumber: r + 1,
            sourceNameColumn: columns.nombre,
            createdAt: now,
            updatedAt: now
          });

          r++;
        }

        flushNoDarRun(); // por si la racha de "NO DAR" llega hasta el final de la hoja, sin fila en blanco

        i = r; // seguir escaneando desde donde terminó el bloque (fila Total / blanco / próximo Dia-Fecha)
      }
    }

    // La planilla real tiene hojas "Copia de <Mes>" que son un duplicado casi
    // exacto de la hoja original (mismas fechas/turnos) — sin este filtro,
    // cada turno y cada bloqueo (NO DAR / NO ESTOY) del mes duplicado
    // aparecería dos veces en la agenda. Se descarta cualquier entrada que
    // coincida en fecha + horario + tratamiento + DNI con una ya vista,
    // sin importar de qué hoja vino.
    const seenKeys = new Set<string>();
    const dedupedAppointments = appointments.filter((appt) => {
      const key = `${appt.fecha}|${appt.horaInicio}|${appt.horaFin}|${appt.tratamientoId}|${appt.pacienteDni}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Cuando una hoja "Copia de <Mes>" diverge de la original (una se editó
    // después, la otra no), sus bloqueos "NO DAR"/"NO ESTOY" para el mismo
    // día terminan con horarios distintos que se SOLAPAN en vez de ser
    // idénticos (ej. 19:00–20:15 y 19:30–20:45) — el filtro de arriba no los
    // agarra porque no coinciden exactamente. Se fusionan por separado: para
    // cada fecha, cualquier bloqueo cuyo horario se solape o toque con otro
    // se combina en uno solo, desde el inicio más temprano hasta el fin más
    // tardío. Los turnos con paciente real NO se tocan acá — dos turnos
    // distintos pegados uno con otro son perfectamente válidos.
    const blocks = dedupedAppointments.filter((a) => a.esBloqueo);
    const nonBlocks = dedupedAppointments.filter((a) => !a.esBloqueo);
    const blocksByDate = new Map<string, Appointment[]>();
    for (const block of blocks) {
      const list = blocksByDate.get(block.fecha) || [];
      list.push(block);
      blocksByDate.set(block.fecha, list);
    }
    const mergedBlocks: Appointment[] = [];
    for (const dayBlocks of blocksByDate.values()) {
      dayBlocks.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      let current: Appointment | null = null;
      for (const block of dayBlocks) {
        if (current && block.horaInicio <= current.horaFin) {
          if (block.horaFin > current.horaFin) {
            current.horaFin = block.horaFin;
            current.duracionMinutos = calculateDurationMinutes(current.horaInicio, current.horaFin);
          }
        } else {
          if (current) mergedBlocks.push(current);
          current = { ...block };
        }
      }
      if (current) mergedBlocks.push(current);
    }
    const finalAppointments = [...nonBlocks, ...mergedBlocks];

    return {
      success: finalAppointments.length > 0,
      appointments: finalAppointments,
      warnings,
      errors: finalAppointments.length === 0 && warnings.length === 0
        ? ['No se encontró ningún bloque de día reconocible (encabezados "Dia" / "Fecha") en ninguna hoja del archivo.']
        : [],
      totalSlotsScanned,
      importedCount: finalAppointments.length,
      skippedNoPatientMatch
    };
  } catch (err: any) {
    return {
      success: false,
      appointments: [],
      warnings: [],
      errors: [`Error al procesar el archivo Excel: ${err.message || 'Formato no soportado'}`],
      totalSlotsScanned: 0,
      importedCount: 0,
      skippedNoPatientMatch: 0
    };
  }
}

/** Reads a local .xlsx/.xls file (from a file picker) and parses it. */
export async function parseTurnosWorkbook(file: File, patients: Patient[]): Promise<TurnosImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseTurnosWorkbookBuffer(e.target?.result as ArrayBuffer, patients));
    reader.onerror = () =>
      resolve({
        success: false,
        appointments: [],
        warnings: [],
        errors: ['Error de lectura del archivo en el navegador.'],
        totalSlotsScanned: 0,
        importedCount: 0,
        skippedNoPatientMatch: 0
      });
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads the FULL Google Sheets workbook (every tab: meses, Pacientes,
 * Variables) as a real multi-sheet .xlsx via Google's own export endpoint —
 * unlike the CSV export used for the Pacientes-only import, this pulls every
 * tab in one request, which is required here since turnos are spread across
 * one tab per month. Requires the sheet to be shared as "Cualquiera con el
 * enlace puede ver".
 */
export async function fetchTurnosWorkbookFromGoogleSheets(
  sheetUrl: string,
  patients: Patient[]
): Promise<TurnosImportResult> {
  const match = sheetUrl.trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = match ? match[1] : null;

  if (!sheetId) {
    return {
      success: false,
      appointments: [],
      warnings: [],
      errors: ['El enlace de Google Sheets configurado no es válido.'],
      totalSlotsScanned: 0,
      importedCount: 0,
      skippedNoPatientMatch: 0
    };
  }

  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: no se pudo acceder a la hoja de cálculo.`);
    }
    const buffer = await response.arrayBuffer();

    // Si la hoja es privada, Google devuelve una página HTML de login en vez
    // del archivo — se detecta mirando los primeros bytes antes de intentar
    // leerla como Excel (que fallaría con un error mucho menos claro).
    const head = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 15));
    if (head.includes('<!DOCTYPE') || head.includes('<html')) {
      return {
        success: false,
        appointments: [],
        warnings: [],
        errors: [
          'La hoja de Google Sheets es privada. Configurala con "Cualquier persona con el enlace puede ver" en Google Drive/Sheets.'
        ],
        totalSlotsScanned: 0,
        importedCount: 0,
        skippedNoPatientMatch: 0
      };
    }

    return parseTurnosWorkbookBuffer(buffer, patients);
  } catch (err: any) {
    return {
      success: false,
      appointments: [],
      warnings: [],
      errors: [`No se pudo descargar la hoja de Google Sheets: ${err.message || 'Error de conexión'}`],
      totalSlotsScanned: 0,
      importedCount: 0,
      skippedNoPatientMatch: 0
    };
  }
}
