import { test, expect } from '@playwright/test';
import { resetAppState, goToDate, seedDataDateString } from './helpers';

test.describe('Financial summary & backups', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await goToDate(page, seedDataDateString());
  });

  test('daily financial summary reflects the seeded appointments totals', async ({ page }) => {
    await page.locator('#tab-finanzas').click();
    // Seed data: 7 appointments totalling $235.000 expected, of which
    // $60.000 (apt-1 + apt-2) is already marked as collected ("pagado").
    await expect(page.getByText('235.000', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('60.000', { exact: false }).first()).toBeVisible();
  });

  test('manual backup download produces a CSV file for the current day', async ({ page }) => {
    await page.locator('#tab-backups').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btn-run-manual-snapshot').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^Backup_AgendaMedica_\d{8}\.csv$/);
    await expect(page.getByText('descargado exitosamente', { exact: false })).toBeVisible();
  });
});
