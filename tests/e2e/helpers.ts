import type { Page } from '@playwright/test';

// Mirrors CLINIC_WORKING_DAYS in src/utils/storage.ts (Mon, Tue, Fri).
export const CLINIC_WORKING_DAYS = [1, 2, 5];

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWorkingDay(d: Date): boolean {
  return CLINIC_WORKING_DAYS.includes(d.getDay());
}

export function nextWorkingDayFrom(d: Date): Date {
  const copy = new Date(d);
  for (let i = 0; i < 8; i++) {
    copy.setDate(copy.getDate() + 1);
    if (isWorkingDay(copy)) return copy;
  }
  return copy;
}

/**
 * Mirrors getInitialAppointments()'s date choice in src/utils/storage.ts:
 * demo seed appointments land on today if today is a working day, otherwise
 * on the next working day after today.
 */
export function seedDataDateString(): string {
  const today = new Date();
  const date = isWorkingDay(today) ? today : nextWorkingDayFrom(today);
  return toISODate(date);
}

/**
 * A working day guaranteed to have none of the demo seed appointments, so
 * tests that create appointments from a clean slate don't collide with them.
 */
export function freeWorkingDayDateString(): string {
  const seedDate = new Date(seedDataDateString() + 'T00:00:00');
  return toISODate(nextWorkingDayFrom(seedDate));
}

/** Loads the app with a clean localStorage so every test starts from the
 * same seeded demo data instead of leftovers from a previous test. */
export async function resetAppState(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function goToDate(page: Page, dateStr: string) {
  await page.locator('#input-current-date').fill(dateStr);
}
