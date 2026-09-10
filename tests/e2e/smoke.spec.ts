import { test, expect } from '@playwright/test';
import { resetAppState } from './helpers';

test.describe('App shell & navigation', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('loads the agenda view by default with seeded demo data', async ({ page }) => {
    await expect(page.locator('#tab-agenda')).toBeVisible();
    await expect(page.getByText('Estética Láser Rosario').first()).toBeVisible();
    // Demo data seeds patients into localStorage on first load.
    const patientsRaw = await page.evaluate(() => localStorage.getItem('agenda_medica_patients_v1'));
    expect(patientsRaw).not.toBeNull();
    expect(JSON.parse(patientsRaw as string).length).toBeGreaterThan(0);
  });

  test('switches between the four main tabs', async ({ page }) => {
    await page.locator('#tab-finanzas').click();
    await expect(page.getByText('Balance Diario', { exact: false }).first()).toBeVisible();

    await page.locator('#tab-pacientes').click();
    await expect(page.locator('#btn-add-patient-main')).toBeVisible();

    await page.locator('#tab-backups').click();
    await expect(page.getByText('Sistema de Respaldo Offline')).toBeVisible();

    await page.locator('#tab-agenda').click();
    await expect(page.locator('#input-current-date')).toBeVisible();
  });

  test('does not expose the admin agenda when a patient confirm link is opened', async ({ page }) => {
    // Simulates a patient tapping the WhatsApp confirm link for an appointment
    // that doesn't exist — it must render the isolated confirmation screen,
    // never fall through to the clinic's full agenda/patient roster.
    await page.goto('/?confirm_turno=does-not-exist');
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
    await expect(page.getByText('Turno confirmado')).toBeVisible();
  });
});
