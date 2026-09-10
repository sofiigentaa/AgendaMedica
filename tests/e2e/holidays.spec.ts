import { test, expect } from '@playwright/test';
import { resetAppState, goToDate, freeWorkingDayDateString } from './helpers';

// Regression test for a real bug found after the initial closure pass:
// editing the reason of an ALREADY-marked holiday used to silently REMOVE
// the holiday instead of updating its reason, because handleToggleHoliday
// (src/App.tsx) treated every call as an add/remove toggle regardless of
// what reason text was submitted. Fixed to upsert in place when a holiday
// already exists for that date.

test.describe('Holiday / non-working day marking', () => {
  let freeDate: string;

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    freeDate = freeWorkingDayDateString();
    await goToDate(page, freeDate);
  });

  test('marks a day as a holiday with a custom reason', async ({ page }) => {
    await page.locator('#btn-holiday-toggle').click();
    await expect(page.getByText('Designar Feriado / No Laborable')).toBeVisible();

    await page.getByPlaceholder('Ej. Feriado Nacional, Día no laborable, Vacaciones...').fill('Congreso Médico');
    await page.getByRole('button', { name: 'Guardar Feriado' }).click();

    await expect(page.getByText('DÍA FERIADO / NO LABORABLE: Congreso Médico')).toBeVisible();
  });

  test('editing the reason of an already-marked holiday updates it in place instead of removing the mark', async ({
    page
  }) => {
    await page.locator('#btn-holiday-toggle').click();
    await page.getByPlaceholder('Ej. Feriado Nacional, Día no laborable, Vacaciones...').fill('Congreso Médico');
    await page.getByRole('button', { name: 'Guardar Feriado' }).click();
    await expect(page.getByText('DÍA FERIADO / NO LABORABLE: Congreso Médico')).toBeVisible();

    // Reopen — the reason field must be pre-filled with the current reason.
    await page.locator('#btn-holiday-toggle').click();
    const reasonInput = page.getByPlaceholder('Ej. Feriado Nacional, Día no laborable, Vacaciones...');
    await expect(reasonInput).toHaveValue('Congreso Médico');

    // Change it to a different reason and save.
    await reasonInput.fill('Vacaciones Médicas');
    await page.getByRole('button', { name: 'Guardar Feriado' }).click();

    // The day must STILL be marked as a holiday, now with the new reason —
    // this is the exact scenario that used to un-mark the day entirely.
    await expect(page.getByText('DÍA FERIADO / NO LABORABLE: Vacaciones Médicas')).toBeVisible();

    // And it must survive in localStorage (real persistence, not just React
    // state). Read it directly instead of navigating the date input back to
    // freeDate after reload — the app correctly refuses to *type* your way
    // onto a day that's marked as a holiday (Navbar's own date-field guard),
    // so re-driving that same input here would just be fighting that rule.
    const holidaysRaw = await page.evaluate(() => localStorage.getItem('agenda_medica_holidays_v1'));
    const holidays = JSON.parse(holidaysRaw || '[]');
    const saved = holidays.find((h: { date: string }) => h.date === freeDate);
    expect(saved?.reason).toBe('Vacaciones Médicas');
  });

  test('removing a holiday clears the mark entirely', async ({ page }) => {
    await page.locator('#btn-holiday-toggle').click();
    await page.getByPlaceholder('Ej. Feriado Nacional, Día no laborable, Vacaciones...').fill('Congreso Médico');
    await page.getByRole('button', { name: 'Guardar Feriado' }).click();
    await expect(page.getByText('DÍA FERIADO / NO LABORABLE: Congreso Médico')).toBeVisible();

    await page.locator('#btn-holiday-toggle').click();
    await page.getByRole('button', { name: 'Quitar Feriado (Habilitar)' }).click();

    await expect(page.getByText('DÍA FERIADO / NO LABORABLE', { exact: false })).toHaveCount(0);
  });
});
