import { test, expect } from '@playwright/test';
import { resetAppState } from './helpers';

const SEARCH_PLACEHOLDER = 'Buscar por DNI, Nombre, Apellido, Teléfono o Cobertura...';

test.describe('Patients — roster CRUD & validation', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await page.locator('#tab-pacientes').click();
  });

  test('creates a new patient and it shows up in the roster', async ({ page }) => {
    await page.locator('#btn-add-patient-main').click();
    await expect(page.getByText('Registrar Nuevo Paciente')).toBeVisible();

    await page.getByPlaceholder('Ej. Valentina').fill('Test');
    await page.getByPlaceholder('Ej. Rossi').fill('Paciente');
    await page.locator('#input-patient-dni').fill('99.999.001');
    await page.getByPlaceholder('Ej. +54 9 341 588-4321').fill('+54 9 341 000-1111');
    await page.locator('form input[type="date"]').fill('1990-01-01');

    await page.getByRole('button', { name: 'Guardar Paciente' }).click();
    await expect(page.getByText('Registrar Nuevo Paciente')).toHaveCount(0);

    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('99.999.001');
    await expect(page.getByText('Paciente, Test')).toBeVisible();
  });

  test('rejects a duplicate DNI', async ({ page }) => {
    // Seeded patient Valentina Rossi has DNI 34.892.120.
    await page.locator('#btn-add-patient-main').click();
    await page.getByPlaceholder('Ej. Valentina').fill('Otra');
    await page.getByPlaceholder('Ej. Rossi').fill('Persona');
    await page.locator('#input-patient-dni').fill('34.892.120');
    await page.getByPlaceholder('Ej. +54 9 341 588-4321').fill('+54 9 341 222-3333');
    await page.locator('form input[type="date"]').fill('1990-01-01');

    await page.getByRole('button', { name: 'Guardar Paciente' }).click();
    await expect(page.getByText(/Ya existe un paciente registrado con el DNI/)).toBeVisible();
    // Modal must stay open — the duplicate was not saved.
    await expect(page.getByText('Registrar Nuevo Paciente')).toBeVisible();
  });

  test('rejects numbers/symbols in the name field', async ({ page }) => {
    await page.locator('#btn-add-patient-main').click();
    await page.getByPlaceholder('Ej. Valentina').fill('Test123');
    await page.getByPlaceholder('Ej. Rossi').fill('Paciente');
    await page.locator('#input-patient-dni').fill('99.999.002');
    await page.getByPlaceholder('Ej. +54 9 341 588-4321').fill('+54 9 341 444-5555');
    await page.locator('form input[type="date"]').fill('1990-01-01');

    await page.getByRole('button', { name: 'Guardar Paciente' }).click();
    await expect(page.getByText('no puede contener comas, números ni símbolos')).toBeVisible();
  });

  test('edits a patient and the change persists after reload', async ({ page }) => {
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('34.892.120');
    await expect(page.getByText('Rossi, Valentina')).toBeVisible();

    await page.getByTitle('Editar paciente').click();
    await expect(page.getByText('Editar Paciente')).toBeVisible();

    await page.getByPlaceholder('Ej. +54 9 341 588-4321').fill('+54 9 341 999-0000');
    await page.getByRole('button', { name: 'Actualizar Paciente' }).click();
    await expect(page.getByText('Editar Paciente')).toHaveCount(0);

    await expect(page.getByText('+54 9 341 999-0000')).toBeVisible();

    await page.reload();
    await page.locator('#tab-pacientes').click();
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('34.892.120');
    await expect(page.getByText('+54 9 341 999-0000')).toBeVisible();
  });

  test('deletes a patient and it stays gone after reload', async ({ page }) => {
    await page.locator('#btn-add-patient-main').click();
    await page.getByPlaceholder('Ej. Valentina').fill('Borrar');
    await page.getByPlaceholder('Ej. Rossi').fill('Descartable');
    await page.locator('#input-patient-dni').fill('99.999.003');
    await page.getByPlaceholder('Ej. +54 9 341 588-4321').fill('+54 9 341 666-7777');
    await page.locator('form input[type="date"]').fill('1990-01-01');
    await page.getByRole('button', { name: 'Guardar Paciente' }).click();

    // Registering a brand-new patient auto-opens the "new appointment" modal
    // preselecting them (a real UX shortcut, not a test artifact) — close it
    // before interacting with the roster again.
    await page.getByText('Crear Nuevo Turno').waitFor();
    await page.getByText('Cerrar Ventana').click();

    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('99.999.003');
    await expect(page.getByText('Descartable, Borrar')).toBeVisible();

    await page.getByTitle('Eliminar paciente').click();
    // exact:true avoids matching the card's icon-only delete button, whose
    // accessible name ("Eliminar paciente", lowercase "p") would otherwise
    // also satisfy a case-insensitive name match.
    await page.getByRole('button', { name: 'Eliminar Paciente', exact: true }).click();
    await expect(page.getByText('Descartable, Borrar')).toHaveCount(0);

    await page.reload();
    await page.locator('#tab-pacientes').click();
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('99.999.003');
    await expect(page.getByText('Descartable, Borrar')).toHaveCount(0);
  });
});
