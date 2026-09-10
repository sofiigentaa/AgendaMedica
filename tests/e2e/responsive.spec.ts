import { test, expect } from '@playwright/test';
import { resetAppState } from './helpers';

// Runs under the "mobile" Playwright project (Pixel 7 viewport, see
// playwright.config.ts) to sanity-check the app is usable on a phone before
// a demo: bottom nav instead of the desktop tab bar, no horizontal overflow,
// and the floating "+" action reachable.

async function hasHorizontalOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

test.describe('Mobile responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('shows the mobile bottom navigation instead of the desktop tab bar', async ({ page }) => {
    await expect(page.locator('#mobile-bottom-navigation')).toBeVisible();
    await expect(page.locator('#tab-agenda')).toBeHidden();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('the "+" floating action button opens the new appointment form without horizontal overflow', async ({
    page
  }) => {
    await page.locator('#btn-mobile-fab-new-appointment').click();
    await expect(page.getByText('Crear Nuevo Turno')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.getByText('Cerrar Ventana').click();
    await expect(page.getByText('Crear Nuevo Turno')).toHaveCount(0);
  });

  test('navigating to Pacientes and Finanzas via the bottom nav works without overflow', async ({ page }) => {
    await page.getByText('Pacientes', { exact: true }).click();
    await expect(page.locator('#btn-add-patient-main')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.getByText('Finanzas', { exact: true }).click();
    await expect(page.getByText('Balance Diario', { exact: false }).first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
