import { google } from 'googleapis';

// Sin esta variable configurada, "Limpiar Turnos Cancelados" sigue
// funcionando igual que antes (solo borra localmente) — escribir de vuelta
// en Google Sheets es una mejora opcional, no un requisito para usar la app.
function getServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
}

export function isGoogleSheetsWriteConfigured(): boolean {
  return getServiceAccountCredentials() !== null;
}

/** A1-notation column letter for a 0-based column index (0 -> A, 1 -> B, 26 -> AA, ...). */
function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Marca como cancelada la celda de nombre de paciente de la fila exacta de
 * donde se importó un turno — usado por "Limpiar Turnos Cancelados" para que
 * el médico vea en la propia planilla que ese turno se canceló, sin perder de
 * vista de quién era (mantiene el nombre y le agrega "- CANCELADO" al lado,
 * en vez de reemplazarlo por solo esa palabra).
 */
export async function writeCancelledMarkerToSheet(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  columnIndex: number,
  pacienteNombre: string
): Promise<void> {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new Error('GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY no está configurado.');
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const column = columnIndexToLetter(columnIndex);
  const range = `${sheetName}!${column}${rowNumber}`;
  const value = pacienteNombre.trim() ? `${pacienteNombre.trim()} - CANCELADO` : 'CANCELADO';

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] }
  });
}
