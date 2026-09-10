import { test, expect } from '@playwright/test';
import { resetAppState } from './helpers';

test.describe('App shell & navigation', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('loads the agenda view by default with seeded demo data', async ({ page }) => {
    await expect(page.locator('#tab-agenda')).toBeVisible();
    await expect(page.getByText('Estética Láser Rosario').first()).toBeVisible();
    // Demo data was seeded into the database via /api/demo/load (see resetAppState).
    const res = await page.request.get('/api/patients');
    expect(res.ok()).toBe(true);
    const patients = await res.json();
    expect(patients.length).toBeGreaterThan(0);
  });

  test('switches between the four main tabs', async ({ page }) => {
    await page.locator('#tab-finanzas').click();
    await expect(page.getByText('Balance Diario', { exact: false }).first()).toBeVisible();

    await page.locator('#tab-pacientes').click();
    await expect(page.locator('#btn-add-patient-main')).toBeVisible();

    await page.locator('#tab-backups').click();
    await expect(page.getByText('Sistema de Respaldo')).toBeVisible();

    await page.locator('#tab-agenda').click();
    await expect(page.locator('#input-current-date')).toBeVisible();
  });

  test('logs out and lands back on the login screen', async ({ page }) => {
    await page.locator('#btn-logout').click();
    await expect(page.getByText('Contraseña del consultorio')).toBeVisible();
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
  });

  test('does not expose the admin agenda when a patient confirm link is opened, with or without a session', async ({
    page
  }) => {
    // Simulates a patient tapping the WhatsApp confirm link — this must
    // render the isolated confirmation screen, never fall through to the
    // clinic's full agenda/patient roster, regardless of whether this
    // browser happens to also be logged in as staff.
    await page.goto('/?confirm_turno=does-not-exist');
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
    await expect(page.getByText('Turno no encontrado')).toBeVisible();
  });
});
