import { test, expect } from '@playwright/test';
import { TEST_PASSWORD } from './helpers';

// Exercises the real login form end-to-end (unlike every other spec, which
// uses resetAppState()'s fast API-based login to skip straight to the
// feature under test).
test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh, logged-out browser context — Playwright already gives each
    // test its own cookie jar, so simply navigating here (no prior login
    // call) is enough to land on the login screen.
    await page.goto('/');
  });

  test('shows the login screen when not authenticated', async ({ page }) => {
    await expect(page.getByText('Contraseña del consultorio')).toBeVisible();
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
  });

  test('rejects an incorrect password', async ({ page }) => {
    await page.getByPlaceholder('••••••••').fill('la-clave-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Contraseña incorrecta')).toBeVisible();
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
  });

  test('logs in with the correct shared password and reaches the agenda', async ({ page }) => {
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.locator('#tab-agenda')).toBeVisible();
  });

  test('a session survives a reload (cookie-based)', async ({ page }) => {
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.locator('#tab-agenda')).toBeVisible();

    await page.reload();
    await expect(page.locator('#tab-agenda')).toBeVisible();
  });

  test('the staff-only API rejects requests without a session', async ({ page }) => {
    const res = await page.request.get('/api/patients');
    expect(res.status()).toBe(401);
  });
});
