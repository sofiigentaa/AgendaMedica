import { test, expect } from '@playwright/test';
import { STAFF_PASSWORD, STAFF_USERNAME, loginAsStaff } from './helpers';

test.describe('Staff login', () => {
  test('blocks the agenda until a valid session exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
    await expect(page.getByText('Ingreso al consultorio')).toBeVisible();
  });

  test('rejects an invalid password without exposing the agenda', async ({ page }) => {
    await page.goto('/');
    await page.locator('#login-username').fill(STAFF_USERNAME);
    await page.locator('#login-password').fill('clave-incorrecta');
    await page.locator('#btn-login').click();
    await expect(page.locator('#login-error')).toContainText('incorrectos');
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
  });

  test('lets authorized staff in and out', async ({ page }) => {
    await loginAsStaff(page);
    await expect(page.locator('#tab-agenda')).toBeVisible();
    await expect(page.getByText('Estética Láser Rosario').first()).toBeVisible();

    await page.locator('#btn-logout').click();
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#tab-agenda')).toHaveCount(0);
  });

  test('protects server backup endpoints without a session cookie', async ({ request }) => {
    const anonymous = await request.get('/api/backup/list');
    expect(anonymous.status()).toBe(401);
  });

  test('allows backup listing after login', async ({ page }) => {
    await loginAsStaff(page);
    const authed = await page.request.get('/api/backup/list');
    expect(authed.status()).toBe(200);
    const body = await authed.json();
    expect(Array.isArray(body.backups)).toBe(true);
  });
});
