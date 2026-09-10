const INVALID_NAME_CHARS_REGEX = /[,;0-9]/;

export function normalizeDniDigits(dni: string): string {
  return (dni || '').replace(/\D/g, '');
}

export function hasInvalidPersonNameChars(value: string): boolean {
  return INVALID_NAME_CHARS_REGEX.test(value || '');
}

export function isDuplicatePatientDni(
  dni: string,
  patients: Array<{ id: string; dni: string }>,
  excludeId?: string | null
): boolean {
  const normalized = normalizeDniDigits(dni);
  if (!normalized) return false;
  return patients.some((p) => p.id !== excludeId && normalizeDniDigits(p.dni) === normalized);
}

export function isFutureBirthDate(fechaNacimiento: string, todayIso: string): boolean {
  return Boolean(fechaNacimiento && fechaNacimiento > todayIso);
}
