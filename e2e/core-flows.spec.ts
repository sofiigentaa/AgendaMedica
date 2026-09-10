import { test, expect, Page } from '@playwright/test';

function nextClinicIsoDate(): string {
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dow = d.getDay();
    if (dow === 1 || dow === 2 || dow === 5) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return now.toISOString().slice(0, 10);
}

async function gotoFreshApp(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-seeded', '1');
    }
  });
  await page.goto('/');
  await expect(page.getByText('Agenda Médica Rosario')).toBeVisible();
}

async function goToDayWithSlots(page: Page) {
  for (let i = 0; i < 8; i++) {
    if ((await page.locator('[data-slot]').count()) > 0) return;
    await page.locator('#btn-next-day').click();
  }
}

test.describe('flujo principal de la agenda', () => {
  test('health check de API y carga de la app', async ({ page, request }) => {
    const health = await request.get('/api/health');
    expect(health.ok()).toBeTruthy();
    const body = await health.json();
    expect(body.status).toBe('ok');

    const invalidBackup = await request.post('/api/backup/save', { data: { appointments: 'x' } });
    expect(invalidBackup.status()).toBe(400);

    const validBackup = await request.post('/api/backup/save', {
      data: { date: '2026-09-11', appointments: [], patients: [], summary: { totalHonorariosPercibidos: 0 } },
    });
    expect(validBackup.ok()).toBeTruthy();

    const list = await request.get('/api/backup/list');
    expect((await list.json()).backups.length).toBeGreaterThan(0);

    await gotoFreshApp(page);
    await expect(page.locator('#tab-agenda')).toBeVisible();
  });

  test('navega pestañas, crea paciente, agenda y edita turno, persiste y confirma por URL', async ({
    page,
  }) => {
    await gotoFreshApp(page);

    await page.locator('#tab-finanzas').click();
    await expect(page.getByText('Balance Diario de Honorarios & Cierre de Caja')).toBeVisible();

    await page.locator('#tab-backups').click();
    await expect(page.getByText(/Sistema de Respaldo/i)).toBeVisible();

    await page.locator('#tab-pacientes').click();
    await expect(page.getByText('Rossi, Valentina')).toBeVisible();

    await page.locator('#input-patient-search').fill('dni-inexistente-xyz');
    await expect(page.getByText('No se encontraron pacientes')).toBeVisible();
    await page.locator('#input-patient-search').fill('');

    await page.locator('#btn-add-patient-main').click();
    await expect(page.getByRole('heading', { name: 'Registrar Nuevo Paciente' })).toBeVisible();

    await page.locator('#input-patient-nombre').fill('Ana');
    await page.locator('#input-patient-apellido').fill('Pérez Demo');
    await page.locator('#input-patient-dni').fill('40.111.222');
    await page.locator('#input-patient-birthdate').fill('1992-03-12');
    await page.locator('#input-patient-phone').fill('3415551234');
    await page.locator('#btn-save-patient').click();

    await expect(page.getByRole('heading', { name: 'Crear Nuevo Turno' })).toBeVisible();

    const clinicDate = nextClinicIsoDate();
    await page.locator('#input-appointment-date').fill(clinicDate);
    await page.locator('#input-appointment-time').fill('19:30');
    await page.getByTestId('treatment-consulta').click();
    await page.locator('#select-payment-status').selectOption('pendiente');
    await page.locator('#select-payment-method').selectOption('pendiente');
    await page.locator('#btn-save-appointment').click();

    const sameDay = page.getByTestId('btn-confirm-modal');
    if (await sameDay.isVisible().catch(() => false)) {
      await sameDay.click();
    }

    await page.locator('#tab-agenda').click();
    await page.locator('#input-current-date').fill(clinicDate);
    await expect(page.getByText('Ana Pérez Demo').first()).toBeVisible();

    await page.locator('[data-slot="19:30"]').click();
    await expect(page.getByRole('heading', { name: 'Editar Turno Médico' })).toBeVisible();
    await page.locator('#select-appointment-status').selectOption('atendido');
    await page.locator('#btn-save-appointment').click();
    await expect(page.getByText('Ana Pérez Demo').first()).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem('agenda_medica_appointments_v1'));
    expect(stored).toContain('Ana Pérez Demo');
    const appointments = JSON.parse(stored || '[]') as Array<{ id: string; pacienteNombre: string }>;
    const created = appointments.find((a) => a.pacienteNombre === 'Ana Pérez Demo');
    expect(created).toBeTruthy();

    await page.goto(`/?confirm_turno=${created!.id}`);
    await expect(page.getByRole('heading', { name: '¡Turno confirmado!' })).toBeVisible();
    await expect(page.locator('#tab-agenda')).toHaveCount(0);

    await page.goto('/');
    await page.locator('#tab-pacientes').click();
    await expect(page.getByText('Pérez Demo, Ana')).toBeVisible();
  });

  test('bloquea DNI duplicado y solapamiento de horarios', async ({ page }) => {
    await gotoFreshApp(page);
    await page.locator('#tab-pacientes').click();
    await page.locator('#btn-add-patient-main').click();
    await page.locator('#input-patient-nombre').fill('Copia');
    await page.locator('#input-patient-apellido').fill('Rossi');
    await page.locator('#input-patient-dni').fill('34892120');
    await page.locator('#input-patient-birthdate').fill('1990-01-01');
    await page.locator('#input-patient-phone').fill('3411111111');
    await page.locator('#btn-save-patient').click();
    await expect(page.getByText(/Ya existe un paciente registrado con el DNI/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.locator('#tab-agenda').click();
    await goToDayWithSlots(page);
    const occupied = page.locator('[data-slot][data-occupied="true"]').first();
    await occupied.click();
    await expect(page.getByRole('heading', { name: 'Editar Turno Médico' })).toBeVisible();
    const occupiedTime = await page.locator('#input-appointment-time').inputValue();
    await page.getByRole('button', { name: 'Cerrar Ventana' }).click();

    const freeSlot = page.locator('[data-slot][data-occupied="false"]').first();
    await freeSlot.click();
    await expect(page.getByRole('heading', { name: 'Crear Nuevo Turno' })).toBeVisible();
    await page.locator('#select-appointment-patient').fill('Rossi');
    await page.getByText('Rossi, Valentina').first().click();
    await page.locator('#input-appointment-time').fill(occupiedTime);
    await page.getByTestId('treatment-consulta').click();
    await page.locator('#select-payment-status').selectOption('pendiente');
    await page.locator('#select-payment-method').selectOption('pendiente');
    await expect(page.getByText(/Horario ocupado/i).first()).toBeVisible();
  });
});
