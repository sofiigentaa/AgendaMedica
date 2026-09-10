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
 * tests that create appointments from a clean slate don't collide with
 * them.
 */
export function freeWorkingDayDateString(): string {
  const seedDate = new Date(seedDataDateString() + 'T00:00:00');
  return toISODate(nextWorkingDayFrom(seedDate));
}

export const TEST_PASSWORD = process.env.TEST_AUTH_PASSWORD || 'demo1234';

/**
 * Equivalent of the old localStorage.clear() + reload: wipes the (test-only)
 * database via the /api/test/reset endpoint, logs the browser context in
 * (bypassing the login form — that flow has its own dedicated coverage in
 * auth.spec.ts), loads the same fixed demo dataset the app used to
 * auto-seed into localStorage, then lands on the agenda.
 */
export async function resetAppState(page: Page) {
  const resetRes = await page.request.post('/api/test/reset', {
    headers: { 'x-test-reset-token': process.env.TEST_RESET_TOKEN || '' }
  });
  // Fail loudly instead of silently leaking one test's data into the next —
  // a wrong/missing TEST_RESET_TOKEN makes this 403 (see the note on the
  // dotenv import in playwright.config.ts for why that env var can go missing).
  if (!resetRes.ok()) {
    throw new Error(`resetAppState: POST /api/test/reset failed (${resetRes.status()}): ${await resetRes.text()}`);
  }

  const loginRes = await page.request.post('/api/auth/login', { data: { password: TEST_PASSWORD } });
  if (!loginRes.ok()) {
    throw new Error(`resetAppState: POST /api/auth/login failed (${loginRes.status()}): ${await loginRes.text()}`);
  }

  const demoRes = await page.request.post('/api/demo/load');
  if (!demoRes.ok()) {
    throw new Error(`resetAppState: POST /api/demo/load failed (${demoRes.status()}): ${await demoRes.text()}`);
  }

  await page.goto('/');
}

export async function goToDate(page: Page, dateStr: string) {
  await page.locator('#input-current-date').fill(dateStr);
}
