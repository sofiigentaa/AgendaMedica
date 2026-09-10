import { test, expect, Page } from '@playwright/test';
import { resetAppState, goToDate, freeWorkingDayDateString, seedDataDateString } from './helpers';

async function openNewAppointmentAtFreeSlot(page: Page, time: string) {
  await page.locator(`button[title*="Libre: Agendar turno a las ${time}"]`).first().click();
  await expect(page.getByText('Crear Nuevo Turno')).toBeVisible();
}

async function selectPatient(page: Page, searchTerm: string, optionLabel: string) {
  await page.locator('#select-appointment-patient').fill(searchTerm);
  await page.getByText(optionLabel, { exact: true }).click();
}

async function selectTreatment(page: Page, treatmentLabel: string) {
  // Exact match on the treatment name div (not hasText, which would also
  // match "Esclero" as a substring of "Esclero y Láser"). The click bubbles
  // up to the enclosing <button>'s onClick handler.
  await page.getByText(treatmentLabel, { exact: true }).click();
}

async function fillPaymentFields(page: Page, estadoPago = 'pendiente', metodoPago = 'pendiente') {
  await page.locator('#select-payment-status').selectOption(estadoPago);
  await page.locator('#select-payment-method').selectOption(metodoPago);
}

// The treatment name is also present (as a substring, inside a hidden
// <option>) in the calendar's treatment filter <select>, so a plain
// getByText() match is ambiguous / can resolve to a non-visible node.
// Scoping to <span> with an exact match targets only the visible badge
// rendered on the appointment card.
function treatmentBadge(page: Page, treatmentLabel: string) {
  return page.locator('span').filter({ hasText: new RegExp(`^${treatmentLabel}$`) });
}

// Same ambiguity as above: "Atendido / Listo" etc. also exists as a hidden
// <option> inside the always-present inline status <select> on the card —
// and a status filter <select> with the same option values also sits in the
// search/filter bar above the card. Scope to the select that is the sibling
// of the "Estado del turno" label to land on the one specific card control.
function statusSelect(page: Page) {
  return page.getByText('Estado del turno', { exact: true }).locator('xpath=..').locator('select');
}

test.describe('Appointments — core CRUD & business rules', () => {
  let freeDate: string;

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    freeDate = freeWorkingDayDateString();
    await goToDate(page, freeDate);
  });

  test('creates a new appointment and shows it on the agenda', async ({ page }) => {
    await openNewAppointmentAtFreeSlot(page, '14:30');
    await selectPatient(page, 'Rossi', 'Rossi, Valentina');
    await selectTreatment(page, 'Esclero');
    await fillPaymentFields(page, 'pagado', 'efectivo');

    await page.locator('#btn-save-appointment').click();
    await expect(page.getByText('Crear Nuevo Turno')).toHaveCount(0);

    await expect(page.getByText('Valentina Rossi')).toBeVisible();
    await expect(treatmentBadge(page, 'Esclero')).toBeVisible();
  });

  test('blocks saving when the chosen time overlaps an existing appointment', async ({ page }) => {
    // First appointment: 14:30 - 15:00 (Esclero, 30 min).
    await openNewAppointmentAtFreeSlot(page, '14:30');
    await selectPatient(page, 'Rossi', 'Rossi, Valentina');
    await selectTreatment(page, 'Esclero');
    await fillPaymentFields(page);
    await page.locator('#btn-save-appointment').click();
    await expect(page.getByText('Crear Nuevo Turno')).toHaveCount(0);

    // Second attempt: open a different free slot, then move its start time to
    // 14:45, which overlaps the 14:30-15:00 appointment just created.
    await openNewAppointmentAtFreeSlot(page, '16:00');
    await selectPatient(page, 'Martínez', 'Martínez, Gonzalo');
    await selectTreatment(page, 'Consulta Médica');
    await fillPaymentFields(page);

    await page.locator('#input-appointment-time').fill('14:45');

    await expect(page.getByText('HORARIO OCUPADO', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#btn-save-appointment')).toBeDisabled();
  });

  test('refuses to save an appointment on a non-working day or a past date', async ({ page }) => {
    await openNewAppointmentAtFreeSlot(page, '14:30');
    await selectPatient(page, 'Rossi', 'Rossi, Valentina');
    await selectTreatment(page, 'Esclero');
    await fillPaymentFields(page);

    // Wednesday is never a clinic working day — the date input itself
    // refuses to move there (Navbar/AppointmentModal share this rule), so
    // the previously-picked working day must remain in the field.
    const before = await page.locator('#input-appointment-date').inputValue();
    const [y, m, d] = before.split('-').map(Number);
    const base = new Date(y, m - 1, d);
    let probe = new Date(base);
    for (let i = 0; i < 7; i++) {
      probe = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate() + 1);
      if (probe.getDay() === 3) break; // Wednesday
    }
    const wednesdayStr = `${probe.getFullYear()}-${String(probe.getMonth() + 1).padStart(2, '0')}-${String(
      probe.getDate()
    ).padStart(2, '0')}`;

    await page.locator('#input-appointment-date').fill(wednesdayStr);
    await expect(page.locator('#input-appointment-date')).toHaveValue(before);
  });

  test('edits an existing appointment (status & payment) and persists after reload', async ({ page }) => {
    await openNewAppointmentAtFreeSlot(page, '14:30');
    await selectPatient(page, 'Benítez', 'Benítez, Camila');
    await selectTreatment(page, 'Láser');
    await fillPaymentFields(page, 'pendiente', 'pendiente');
    await page.locator('#btn-save-appointment').click();
    await expect(page.getByText('Crear Nuevo Turno')).toHaveCount(0);

    await page.getByTitle('Editar turno').click();
    await expect(page.getByText('Editar Turno Médico')).toBeVisible();

    await page.locator('#select-appointment-status').selectOption('atendido');
    await page.locator('#select-payment-status').selectOption('pagado');
    await page.locator('#select-payment-method').selectOption('efectivo');
    await page.locator('#btn-save-appointment').click();
    await expect(page.getByText('Editar Turno Médico')).toHaveCount(0);

    await expect(statusSelect(page)).toHaveValue('atendido');

    // Reload to confirm the change survived (real DB persistence, not just React state).
    await page.reload();
    await goToDate(page, freeDate);
    await expect(statusSelect(page)).toHaveValue('atendido');
  });

  test('deletes an appointment and it no longer appears after reload', async ({ page }) => {
    await openNewAppointmentAtFreeSlot(page, '14:30');
    await selectPatient(page, 'Santoro', 'Santoro, Lucía');
    await selectTreatment(page, 'Mesoterapia');
    await fillPaymentFields(page);
    await page.locator('#btn-save-appointment').click();
    await expect(page.getByText('Lucía Santoro')).toBeVisible();

    await page.getByTitle('Eliminar turno').click();
    // exact:true is required — the card's icon-only delete button also has
    // an accessible name of "Eliminar turno" (from its title attribute,
    // lowercase "turno"), which a case-insensitive match would also catch.
    await page.getByRole('button', { name: 'Eliminar Turno', exact: true }).click();

    await expect(page.getByText('Lucía Santoro')).toHaveCount(0);

    await page.reload();
    await goToDate(page, freeDate);
    await expect(page.getByText('Lucía Santoro')).toHaveCount(0);
  });

  test('the demo seed data for the upcoming working day is visible and consistent', async ({ page }) => {
    await goToDate(page, seedDataDateString());
    // Valentina Rossi has two seeded appointments that day (Esclero + Consulta).
    await expect(page.getByText('Valentina Rossi').first()).toBeVisible();
    await expect(page.getByText('Gonzalo Martínez').first()).toBeVisible();
  });
});
