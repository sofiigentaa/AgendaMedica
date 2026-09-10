import { test, expect } from '@playwright/test';

test('navegación mobile usable: bottom nav, padrón y nuevo turno', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-seeded', '1');
    }
  });
  await page.goto('/');
  await expect(page.getByText('Agenda Médica Rosario')).toBeVisible();

  await expect(page.locator('#btn-mobile-fab-new-appointment')).toBeVisible();
  await page.getByRole('button', { name: 'Pacientes' }).click();
  await expect(page.getByText('Rossi, Valentina')).toBeVisible();

  await page.getByRole('button', { name: 'Agenda' }).click();
  await page.locator('#btn-mobile-fab-new-appointment').click();
  await expect(page.getByRole('heading', { name: 'Crear Nuevo Turno' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar Ventana' }).click();
});
