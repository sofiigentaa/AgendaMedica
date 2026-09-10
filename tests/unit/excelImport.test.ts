import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  normalizeDateString,
  parseRawRowsToPatients,
  worksheetToSmartRows,
  extractGoogleSheetsInfo,
  WrongSheetError,
} from '../../src/utils/excelImport';

describe('normalizeDateString', () => {
  it('keeps an already-ISO date, padding single digits', () => {
    expect(normalizeDateString('1990-4-5')).toBe('1990-04-05');
    expect(normalizeDateString('1990-04-15')).toBe('1990-04-15');
  });

  it('parses DD/MM/YYYY into ISO', () => {
    expect(normalizeDateString('15/04/1990')).toBe('1990-04-15');
  });

  it('parses DD-MM-YY with a 2-digit year using the 50-cutoff rule', () => {
    expect(normalizeDateString('15-04-90')).toBe('1990-04-15');
    expect(normalizeDateString('15-04-05')).toBe('2005-04-15');
  });

  it('parses a raw Excel serial date number', () => {
    // Serial 32948 corresponds to 1990-03-16 in Excel's 1900 date system
    expect(normalizeDateString('32948')).toBe('1990-03-16');
  });

  it('returns empty string for unparseable or empty input', () => {
    expect(normalizeDateString('')).toBe('');
    expect(normalizeDateString('not a date')).toBe('');
  });

  it('rejects an out-of-range day/month in DD/MM/YYYY form', () => {
    expect(normalizeDateString('32/13/1990')).toBe('');
  });
});

describe('extractGoogleSheetsInfo', () => {
  it('extracts the sheet id and gid from a full URL', () => {
    const { sheetId, gid } = extractGoogleSheetsInfo(
      'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjK/edit#gid=123456'
    );
    expect(sheetId).toBe('1AbCdEfGhIjK');
    expect(gid).toBe('123456');
  });

  it('defaults gid to "0" when absent', () => {
    const { sheetId, gid } = extractGoogleSheetsInfo('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjK/edit');
    expect(sheetId).toBe('1AbCdEfGhIjK');
    expect(gid).toBe('0');
  });

  it('returns nulls for an unrelated URL', () => {
    const { sheetId } = extractGoogleSheetsInfo('https://example.com/not-a-sheet');
    expect(sheetId).toBeNull();
  });
});

function sheetFromRows(rows: (string | number)[][]) {
  return XLSX.utils.aoa_to_sheet(rows);
}

describe('worksheetToSmartRows', () => {
  it('detects the header row even when preceded by title rows', () => {
    const ws = sheetFromRows([
      ['Padrón de Pacientes'],
      ['Nombre', 'Apellido', 'DNI', 'Telefono'],
      ['Valentina', 'Rossi', '34892120', '3415884321'],
    ]);
    const rows = worksheetToSmartRows(ws);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Nombre']).toBe('Valentina');
    expect(rows[0]['DNI']).toBe('34892120');
  });

  it('throws WrongSheetError when the sheet looks like the daily agenda instead of the patients roster', () => {
    const ws = sheetFromRows([
      ['Horario', 'Paciente', 'Tratamiento', 'Duracion', 'Honorario'],
      ['14:30', 'Valentina Rossi', 'Esclero', '30', '32000'],
    ]);
    expect(() => worksheetToSmartRows(ws)).toThrow(WrongSheetError);
  });

  it('treats an unlabeled leftmost text column as the full name column', () => {
    const ws = sheetFromRows([
      ['', 'DNI', 'Telefono'],
      ['Rossi Valentina', '34892120', '3415884321'],
    ]);
    const rows = worksheetToSmartRows(ws);
    expect(rows[0]['Nombre Completo']).toBe('Rossi Valentina');
  });
});

describe('parseRawRowsToPatients', () => {
  it('returns a failure result for an empty input', () => {
    const result = parseRawRowsToPatients([]);
    expect(result.success).toBe(false);
    expect(result.patients).toHaveLength(0);
  });

  it('parses separate nombre/apellido columns', () => {
    const result = parseRawRowsToPatients([
      { Nombre: 'Valentina', Apellido: 'Rossi', DNI: '34892120', Telefono: '3415884321' },
    ]);
    expect(result.success).toBe(true);
    expect(result.patients[0].nombre).toBe('Valentina');
    expect(result.patients[0].apellido).toBe('Rossi');
    expect(result.patients[0].coberturaTipo).toBe('particular');
  });

  it('splits a combined "Apellido, Nombre" column', () => {
    const result = parseRawRowsToPatients([{ 'Apellido, Nombre': 'Rossi, Valentina' }]);
    expect(result.patients[0].apellido).toBe('Rossi');
    expect(result.patients[0].nombre).toBe('Valentina');
  });

  it('splits a combined full-name column without a comma (surname first)', () => {
    const result = parseRawRowsToPatients([{ Paciente: 'Abaca Sandra Noemi' }]);
    expect(result.patients[0].apellido).toBe('Abaca');
    expect(result.patients[0].nombre).toBe('Sandra Noemi');
  });

  it('flags rows missing both nombre and apellido as errors instead of silently dropping them', () => {
    const result = parseRawRowsToPatients([{ DNI: '123', __originalRow: 5 }]);
    expect(result.patients).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('marks coverage as obra_social when a real insurer name is present', () => {
    const result = parseRawRowsToPatients([
      { Nombre: 'Gonzalo', Apellido: 'Martínez', 'Obra Social': 'OSDE' },
    ]);
    expect(result.patients[0].coberturaTipo).toBe('obra_social');
    expect(result.patients[0].obraSocial).toBe('OSDE');
  });

  it('does not let "Tipo Doc" steal the DNI value meant for "N Doc"', () => {
    const result = parseRawRowsToPatients([
      { Nombre: 'Valentina', Apellido: 'Rossi', 'Tipo Doc': 'DNI', 'N Doc': '34892120' },
    ]);
    expect(result.patients[0].dni).toBe('34892120');
  });

  it('falls back to placeholder DNI/phone when missing, without crashing', () => {
    const result = parseRawRowsToPatients([{ Nombre: 'Valentina', Apellido: 'Rossi' }]);
    expect(result.patients[0].dni).toBe('Sin DNI');
    expect(result.patients[0].telefono).toContain('+54');
  });
});
