import * as XLSX from 'xlsx';
import { Patient } from '../types';
 
export interface ImportResult {
  success: boolean;
  patients: Patient[];
  errors: string[];
  totalRows: number;
  importedCount: number;
}
 
/**
 * Normalizes a birthdate value coming from an imported spreadsheet into the
 * ISO "YYYY-MM-DD" format the app expects (required for <input type="date">
 * to display it, and for the Excel/CSV exports to format it correctly).
 * Handles three shapes seen in real-world sheets:
 *  - Already ISO: "1990-04-15"
 *  - Typed as text: "15/04/1990" or "15-04-1990"
 *  - A genuine Excel date cell, which the reader hands back as a raw serial
 *    number (e.g. "32948") instead of a readable date.
 * Returns '' when the value can't be confidently parsed, rather than guessing.
 */
export function normalizeDateString(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
 
  // Already ISO YYYY-MM-DD (allow single-digit month/day)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    if (y && m && d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
 
  // DD/MM/YYYY or DD-MM-YYYY (2 or 4 digit year)
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
 
  // Excel serial date number (real date cell, not typed as text)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = parseFloat(trimmed);
    if (serial > 1 && serial < 100000) {
      const utcDays = Math.floor(serial - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        if (y >= 1900 && y <= new Date().getFullYear()) {
          return `${y}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        }
      }
    }
    return '';
  }
 
  return '';
}
 
/**
 * Normalizes a header/candidate string for comparison: strips accents, lowercases,
 * and removes spaces/punctuation so things like "Nº Documento", "Tel. Fijo" or
 * "Apellido, Nombre" compare cleanly against plain keywords like "documento" or "apellido".
 */
function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[\s_\-\.\/\(\)\[\]#:\*,\+]/g, ''); // strip spaces/punctuation (including commas)
}
 
const HEADER_HINT_KEYWORDS = [
  'nombre',
  'apellido',
  'paciente',
  'dni',
  'documento',
  'cedula',
  'telefono',
  'celular',
  'whatsapp',
  'email',
  'correo',
  'obrasocial',
  'cobertura',
  'prepaga'
];
 
// Columns that only ever appear on the daily Turnos/Agenda sheet (one row per
// appointment), never on the Pacientes master list. If we see two or more of
// these in the detected header row, this isn't the Pacientes sheet at all —
// importing it as-is would create one "patient" per appointment instead of
// one per actual person, and pull in fields (Tratamiento, Honorario, etc.)
// that don't belong on a patient record.
const AGENDA_ONLY_KEYWORDS = ['horario', 'tratamiento', 'duracion', 'honorario', 'horadefinalizacion', 'horafinalizacion'];
 
/**
 * Thrown when the detected header row belongs to the Turnos/Agenda sheet instead
 * of the Pacientes sheet, so callers can surface a precise, actionable message
 * instead of the generic "couldn't read the sheet" wrapping.
 */
export class WrongSheetError extends Error {}
 
function assertIsPatientsSheet(headers: string[]): void {
  const normalizedHeaders = headers.map((h) => normalizeKey(h));
  const agendaMatches = AGENDA_ONLY_KEYWORDS.filter((kw) => normalizedHeaders.some((h) => h.includes(kw)));
  if (agendaMatches.length >= 2) {
    throw new WrongSheetError(
      'Esta hoja parece ser la de Turnos/Agenda (tiene columnas como Horario, Tratamiento, Duración u Honorario), no la de Pacientes. ' +
        'Seleccioná o pegá la hoja de Pacientes, la que tiene columnas como T Doc, N Doc, Email, Teléfono móvil, Teléfono fijo, Fecha de nacimiento y Cobertura médica.'
    );
  }
}
 
/**
 * Scans the first ~10 non-empty rows of a sheet and returns the index of the row
 * that looks most like a real column-header row (based on keyword matches), instead
 * of blindly assuming row 1 is the header. This is what lets the importer survive
 * sheets that have extra title/date rows above the real header (e.g. "Día / Fecha"
 * and "MARTES / 03/02/2026" rows before the actual "Horario, Apellido y Nombre..." row).
 */
function detectHeaderRowIndex(rows: string[][]): number {
  let bestIdx = 0;
  let bestScore = 0;
  const scanLimit = Math.min(10, rows.length);
 
  for (let i = 0; i < scanLimit; i++) {
    let score = 0;
    rows[i].forEach((cell) => {
      const norm = normalizeKey(cell);
      if (!norm) return;
      if (HEADER_HINT_KEYWORDS.some((kw) => norm.includes(kw))) score++;
    });
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
 
  return bestIdx;
}
 
/**
 * Google Sheets/Excel only stores a value in the TOP-LEFT cell of a merged range —
 * every other cell it covers reads as empty, even though it visually looks filled
 * in the sheet. This is very common in daily-agenda sheets where an appointment
 * longer than one time slot has its name/patient cell merged across several rows.
 * We copy the top-left value down (and across) into every cell the merge covers so
 * those rows don't get treated as missing data.
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
 * Converts a worksheet into an array of plain row objects, using smart header-row
 * detection instead of assuming row 1 holds the column titles. Each returned row
 * object carries a hidden (non-enumerable) __originalRow property so error messages
 * can point at the real row number in the spreadsheet.
 */
export function worksheetToSmartRows(worksheet: XLSX.WorkSheet): any[] {
  const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
 
  // Remember, PER CELL, whether it was blank before we fill in merged-cell values.
  // We only care about this for the name column(s) below: a row whose name cell was
  // originally empty and only "gained" a value because a cell above it was vertically
  // merged into it is a pure visual continuation row (e.g. the 2nd half of a 60-min
  // appointment on a 30-min grid) — not an independent patient/turno — even though
  // that same row may legitimately have its own "Horario" or other values. Other
  // columns (Horario, Duración, etc.) are left alone; only the name-derived ghost
  // rows get dropped.
  const wasBlankBeforeMergeGrid: boolean[][] = raw2D.map((row) =>
    (row || []).map((c) => c === undefined || c === null || String(c).trim() === '')
  );
 
  expandMergedCells(worksheet, raw2D);
 
  const stringRows = raw2D.map((row) => (row || []).map((c) => (c !== undefined && c !== null ? String(c) : '')));
 
  const nonEmptyRows = stringRows
    .map((row, idx) => ({ row, originalRowIndex: idx, originalRowNumber: idx + 1 }))
    .filter((r) => r.row.some((cell) => cell.trim().length > 0));
 
  if (nonEmptyRows.length === 0) return [];
 
  const headerIdx = detectHeaderRowIndex(nonEmptyRows.map((r) => r.row));
  const headers = [...nonEmptyRows[headerIdx].row];
 
  assertIsPatientsSheet(headers);
 
  // Identify which column(s) hold the patient's name, so we can detect ghost rows.
  let nameColIndices: number[] = [];
  headers.forEach((h, colIdx) => {
    const norm = normalizeKey(h);
    if (norm && (norm.includes('nombre') || norm.includes('apellido') || norm.includes('paciente'))) {
      nameColIndices.push(colIdx);
    }
  });
 
  // Fallback: many patient lists keep the full name in the leftmost column WITHOUT
  // giving it a header title at all (it reads as blank). If no column's title
  // mentioned "nombre"/"apellido"/"paciente", and column 0's header is blank, assume
  // column 0 holds the name and label it so the rest of the logic (which matches by
  // header keywords) picks it up as a combined name column.
  if (nameColIndices.length === 0 && (!headers[0] || !headers[0].trim())) {
    const sampleRows = nonEmptyRows.slice(headerIdx + 1, headerIdx + 11);
    const looksLikeText = sampleRows.some((r) => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}/.test(r.row[0] || ''));
    if (looksLikeText) {
      headers[0] = 'Nombre Completo';
      nameColIndices = [0];
    }
  }
 
  const dataEntries = nonEmptyRows.slice(headerIdx + 1).filter((entry) => {
    if (nameColIndices.length === 0) return true; // no name column detected — don't filter
    const blankRow = wasBlankBeforeMergeGrid[entry.originalRowIndex] || [];
    const nameWasEntirelyInherited = nameColIndices.every((c) => blankRow[c] !== false);
    // If every name-related cell in this row was blank before the merge fill, this
    // row contributed no name data of its own — it's a continuation, not a new patient.
    return !nameWasEntirelyInherited;
  });
 
  return dataEntries.map((entry) => {
    const obj: any = {};
    headers.forEach((h, colIdx) => {
      const key = h && h.trim() ? h.trim() : `Columna${colIdx + 1}`;
      // Avoid clobbering a repeated blank/duplicate header
      const finalKey = obj.hasOwnProperty(key) ? `${key}_${colIdx}` : key;
      obj[finalKey] = entry.row[colIdx] !== undefined ? entry.row[colIdx] : '';
    });
    Object.defineProperty(obj, '__originalRow', {
      value: entry.originalRowNumber,
      enumerable: false
    });
    return obj;
  });
}
 
/**
 * Parses raw tabular rows into Patient records
 */
export function parseRawRowsToPatients(rawRows: any[]): ImportResult {
  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      patients: [],
      errors: ['La planilla está vacía o no contiene filas con datos válidos.'],
      totalRows: 0,
      importedCount: 0
    };
  }
 
  const parsedPatients: Patient[] = [];
  const errors: string[] = [];
 
  rawRows.forEach((row, index) => {
    const rowNum = (row && row.__originalRow) || index + 2; // fallback: header assumed row 1
 
    // Look for matching keys ignoring case, accents and spaces. `exclude` lets us
    // skip columns that would otherwise false-positive match (e.g. "Tipo Doc."
    // contains "doc" and would wrongly steal the DNI/document-number field).
    const getField = (candidates: string[], exclude: string[] = []): string => {
      for (const key of Object.keys(row)) {
        const normalizedKey = normalizeKey(key);
        if (exclude.some((ex) => normalizedKey.includes(ex))) continue;
        for (const candidate of candidates) {
          const normalizedCand = normalizeKey(candidate);
          if (normalizedKey === normalizedCand || normalizedKey.includes(normalizedCand)) {
            const val = row[key];
            return val !== undefined && val !== null ? String(val).trim() : '';
          }
        }
      }
      return '';
    };
 
    // Find a single column that holds the FULL name, in one of two shapes:
    //  a) header mentions BOTH "apellido" and "nombre" (e.g. "Apellido, Nombre")
    //  b) header is a generic "full name" label (Nombre Completo, Paciente, etc.) —
    //     this also covers the unlabeled leftmost column, which worksheetToSmartRows
    //     renames to "Nombre Completo" when no other name column was found.
    // This must be handled before the individual nombre/apellido lookups below,
    // otherwise both could independently match the same column and end up with
    // the exact same duplicated full-name value in each field.
    let combinedNameKey: string | null = null;
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey.includes('apellido') && normalizedKey.includes('nombre')) {
        combinedNameKey = key;
        break;
      }
    }
    if (!combinedNameKey) {
      for (const key of Object.keys(row)) {
        const normalizedKey = normalizeKey(key);
        if (
          normalizedKey.includes('nombrecompleto') ||
          normalizedKey === 'paciente' ||
          normalizedKey.includes('nombreyapellido') ||
          normalizedKey.includes('apellidoynombre') ||
          normalizedKey.includes('fullname')
        ) {
          combinedNameKey = key;
          break;
        }
      }
    }
 
    let nombre = '';
    let apellido = '';
 
    if (combinedNameKey) {
      const rawVal = row[combinedNameKey] !== undefined && row[combinedNameKey] !== null ? String(row[combinedNameKey]).trim() : '';
      if (rawVal.includes(',')) {
        // "Apellido, Nombre" format
        const [ap, nom] = rawVal.split(',').map((s) => s.trim());
        apellido = ap || '';
        nombre = nom || '';
      } else if (rawVal) {
        // "Apellido Nombre" format (no comma, space-separated) — this app's sheets
        // consistently list the surname FIRST (e.g. "Abaca Sandra" = Apellido
        // "Abaca", Nombre "Sandra"), so the first word is the apellido and
        // everything after it is the (possibly multi-word) nombre.
        const parts = rawVal.split(' ').filter(Boolean);
        if (parts.length > 1) {
          apellido = parts[0];
          nombre = parts.slice(1).join(' ');
        } else {
          nombre = rawVal;
        }
      }
    } else {
      nombre = getField(['nombre', 'nombres', 'firstname', 'name']);
      apellido = getField(['apellido', 'apellidos', 'lastname', 'surname']);
    }
 
    const nombreCompleto = combinedNameKey
      ? ''
      : getField(['nombrecompleto', 'paciente', 'nombreyapellido', 'apellidoynombre', 'fullname']);
 
    if (!nombre && !apellido && nombreCompleto) {
      const parts = nombreCompleto.split(' ').filter(Boolean);
      if (parts.length > 1) {
        apellido = parts[0];
        nombre = parts.slice(1).join(' ');
      } else {
        nombre = nombreCompleto;
        apellido = '';
      }
    }
 
    if (!nombre && !apellido) {
      errors.push(`Fila ${rowNum}: Se omitió porque no tiene Nombre ni Apellido.`);
      return;
    }
 
    const dni = getField(['dni', 'documento', 'cedula', 'identificacion', 'numdoc', 'doc'], ['tipo', 'tdoc']) || 'Sin DNI';
    const telefono = getField(['telefono', 'tel', 'celular', 'whatsapp', 'movil', 'phone']) || '+54 9 341 000-0000';
    const email = getField(['email', 'correo', 'mail']) || '';
    const obraSocialRaw = getField(['obrasocial', 'cobertura', 'prepaga', 'mutua', 'seguro']) || 'Particular';
    const numeroAfiliado = getField(['numeroafiliado', 'numafiliado', 'afiliado', 'credencial', 'nroafiliado']) || '';
    const fechaNacimiento = normalizeDateString(getField(['fechanacimiento', 'nacimiento', 'fnac', 'birthdate']) || '');
    const notas = getField(['notas', 'observaciones', 'antecedentes', 'comentarios', 'alergias']) || '';
 
    const isParticular =
      obraSocialRaw.toLowerCase().includes('part') ||
      obraSocialRaw.toLowerCase().includes('sin') ||
      obraSocialRaw.toLowerCase().includes('ninguna');
 
    const newPatient: Patient = {
      id: `pat-imp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      nombre: nombre || 'Paciente',
      apellido: apellido || '',
      dni: dni,
      telefono: telefono,
      email: email,
      fechaNacimiento: fechaNacimiento,
      coberturaTipo: isParticular ? 'particular' : 'obra_social',
      obraSocial: obraSocialRaw,
      numeroAfiliado: numeroAfiliado,
      notasMedicas: notas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
 
    parsedPatients.push(newPatient);
  });
 
  return {
    success: parsedPatients.length > 0,
    patients: parsedPatients,
    errors,
    totalRows: rawRows.length,
    importedCount: parsedPatients.length
  };
}
 
/**
 * Extracts Google Sheets document ID and GID from any Google Docs/Drive URL
 */
export function extractGoogleSheetsInfo(url: string): { sheetId: string | null; gid: string | null } {
  try {
    const trimmed = url.trim();
    // Format: /spreadsheets/d/([a-zA-Z0-9-_]+)
    const matchId = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = matchId ? matchId[1] : null;
 
    // GID format: gid=([0-9]+)
    const matchGid = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = matchGid ? matchGid[1] : '0';
 
    return { sheetId, gid };
  } catch {
    return { sheetId: null, gid: null };
  }
}
 
/**
 * Fetches and parses a Google Sheets document via public export URL
 */
export async function fetchPatientsFromGoogleSheets(sheetUrl: string): Promise<ImportResult> {
  const { sheetId, gid } = extractGoogleSheetsInfo(sheetUrl);
 
  if (!sheetId) {
    return {
      success: false,
      patients: [],
      errors: [
        'El enlace no parece ser una URL válida de Google Sheets (ej: https://docs.google.com/spreadsheets/d/...)'
      ],
      totalRows: 0,
      importedCount: 0
    };
  }
 
  // Google Sheets export endpoints to try
  const exportUrls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid || 0}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || 0}`
  ];
 
  let lastError = '';
 
  for (const url of exportUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: No se pudo acceder a la hoja de cálculo.`);
      }
      const csvText = await response.text();
 
      // Check if it returned an HTML login page instead of CSV
      if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
        throw new Error(
          'La hoja de Google Sheets es privada. Asegúrate de configurarla con "Cualquier persona con el enlace puede ver" en Google Drive/Sheets.'
        );
      }
 
      // Read CSV text with XLSX
      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = worksheetToSmartRows(worksheet);
 
      return parseRawRowsToPatients(rawRows);
    } catch (err: any) {
      if (err instanceof WrongSheetError) {
        return {
          success: false,
          patients: [],
          errors: [err.message],
          totalRows: 0,
          importedCount: 0
        };
      }
      lastError = err.message || 'Error al conectar con Google Sheets';
    }
  }
 
  return {
    success: false,
    patients: [],
    errors: [
      `No se pudo leer la hoja de Google Sheets: ${lastError}`,
      'Tip: En Google Sheets ve a "Compartir" y selecciona "Cualquier persona con el enlace (Lector)".'
    ],
    totalRows: 0,
    importedCount: 0
  };
}
 
/**
 * Parses an Excel (.xlsx, .xls) or CSV file containing patient records.
 * Supports flexible column naming (e.g. Nombre, Apellido, DNI, Telefono / Celular / WhatsApp, Email, Obra Social, etc.)
 */
export async function parsePatientsExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
 
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
 
        // Convert sheet to rows using smart header-row detection
        const rawRows = worksheetToSmartRows(worksheet);
        const result = parseRawRowsToPatients(rawRows);
        resolve(result);
      } catch (err: any) {
        if (err instanceof WrongSheetError) {
          resolve({
            success: false,
            patients: [],
            errors: [err.message],
            totalRows: 0,
            importedCount: 0
          });
          return;
        }
        resolve({
          success: false,
          patients: [],
          errors: [`Error al procesar el archivo Excel: ${err.message || 'Formato no soportado'}`],
          totalRows: 0,
          importedCount: 0
        });
      }
    };
 
    reader.onerror = () => {
      resolve({
        success: false,
        patients: [],
        errors: ['Error de lectura del archivo en el navegador.'],
        totalRows: 0,
        importedCount: 0
      });
    };
 
    reader.readAsArrayBuffer(file);
  });
}
 
/**
 * Creates an empty downloadable Excel template for importing patients
 */
export function downloadPatientsImportTemplate(): void {
  const sampleData = [
    {
      'Nombre': 'María',
      'Apellido': 'González',
      'DNI': '35.420.198',
      'Teléfono / WhatsApp': '+54 9 341 512-3456',
      'Email': 'maria.gonzalez@gmail.com',
      'Fecha Nacimiento (AAAA-MM-DD)': '1990-05-14',
      'Obra Social o Prepaga': 'Swiss Medical Group',
      'Nro de Afiliado': 'SM-98213-01',
      'Observaciones / Antecedentes': 'Alergia a la penicilina. Tratamiento previo de várices.'
    },
    {
      'Nombre': 'Lucas',
      'Apellido': 'Martínez',
      'DNI': '38.109.876',
      'Teléfono / WhatsApp': '+54 9 341 698-7744',
      'Email': 'lucas.martinez@hotmail.com',
      'Fecha Nacimiento (AAAA-MM-DD)': '1994-11-20',
      'Obra Social o Prepaga': 'Particular',
      'Nro de Afiliado': '',
      'Observaciones / Antecedentes': 'Consulta estética por telangiectasias alares.'
    },
    {
      'Nombre': 'Sofía',
      'Apellido': 'Álvarez',
      'DNI': '40.765.432',
      'Teléfono / WhatsApp': '+54 9 341 455-8899',
      'Email': 'sofia.alvarez@yahoo.com.ar',
      'Fecha Nacimiento (AAAA-MM-DD)': '1997-03-08',
      'Obra Social o Prepaga': 'La Segunda ART / Salud',
      'Nro de Afiliado': 'LS-440291-B',
      'Observaciones / Antecedentes': 'Eco Doppler programado.'
    }
  ];
 
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Pacientes');
 
  // Generate Excel buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Plantilla_Importar_Pacientes_Rosario.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
 
