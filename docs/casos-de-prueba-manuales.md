# Casos de prueba manuales - Agenda Médica & Turnos

Checklist para validar la app a mano (demo, smoke test antes de una entrevista, etc.). Cubre lo mismo que la suite automatizada (`tests/unit/`, `tests/e2e/`) — usá esto cuando quieras verificar visualmente o no puedas correr `npm test` / `npm run test:e2e`.

Convención: **Precondición** → **Pasos** → **Resultado esperado**. Prioridad: 🔴 Crítico · 🟡 Importante · ⚪ Secundario.

El consultorio solo atiende **Lunes, Martes y Viernes de 14:30 a 20:00 hs** — varios casos dependen de elegir un día válido.

---

## 1. Turnos (Agenda)

### TC-01 🔴 Crear un turno nuevo
1. Pestaña **Agenda de Turnos**, elegí un Lunes/Martes/Viernes futuro.
2. Tocá un horario libre en la grilla ("Horarios de Consulta") o el botón **Agendar Turno**.
3. Buscá y seleccioná un paciente del padrón.
4. Elegí un tratamiento (verificá que la duración y el horario de fin se calculen solos).
5. Completá Estado de Pago y Medio de Pago.
6. **Agendar Turno**.

**Esperado:** el modal se cierra y el turno aparece en la agenda con paciente, tratamiento y horario correctos.

### TC-02 🔴 Detección de solapamiento de horarios
1. Con un turno ya creado a las 14:30 (30 min), creá otro turno.
2. En "Hora Inicio" escribí un horario que caiga dentro del rango ocupado (ej. 14:45).

**Esperado:** aparece el cartel rojo "HORARIO OCUPADO" con los datos de quién ocupa ese horario, y el botón **Agendar Turno** queda deshabilitado.

### TC-03 🔴 Editar un turno existente
1. Abrí un turno desde la agenda (ícono lápiz).
2. Cambiá Estado del Turno a "Atendido / Listo" y Estado de Pago a "Pagado".
3. Guardar Cambios.

**Esperado:** la tarjeta del turno refleja el nuevo estado. Recargá la página (F5) y verificá que el cambio siga ahí (no se pierde: se guarda en el navegador).

### TC-04 🔴 Eliminar un turno
1. En la tarjeta de un turno, ícono de tacho → confirmar "Eliminar Turno" en el diálogo.

**Esperado:** el turno desaparece de la agenda y sigue sin aparecer después de recargar la página.

### TC-05 🟡 Bloquear un horario ("NO DAR")
1. Botón **Bloquear Horario (NO DAR)** en un horario libre.
2. Elegí un motivo (o escribí uno) y guardá.

**Esperado:** el horario queda marcado como bloqueado (franja negra "⛔ NO DAR") y no se puede agendar un turno de paciente ahí hasta desbloquearlo.

### TC-06 🔴 No se puede agendar en día no laborable ni feriado
1. Intentá cambiar la fecha del turno a un Miércoles, Jueves, Sábado o Domingo.
2. Intentá elegir un feriado nacional (ej. 25/12).

**Esperado:** en ambos casos la fecha no se actualiza y aparece un aviso rojo explicando por qué (día no laborable / feriado).

### TC-07 🟡 No se puede agendar en el pasado ni fuera del horario de atención
1. Intentá crear un turno con fecha anterior a hoy.
2. Intentá un horario de inicio antes de las 14:30 o que termine después de las 20:00.

**Esperado:** en ambos casos se bloquea el guardado con un aviso explicando el motivo.

### TC-08 ⚪ Aviso de turnos duplicados el mismo día
1. Creá un segundo turno (de otro horario) en un día que ya tiene turnos cargados.

**Esperado:** antes de guardar aparece una confirmación "Ya hay turnos ese día — ¿agendar igual?".

---

## 2. Pacientes (Padrón)

### TC-09 🔴 Alta de paciente
1. Pestaña **Padrón de Pacientes** → **Nuevo Paciente**.
2. Completá Nombre, Apellido, DNI, Teléfono y Fecha de Nacimiento (todos obligatorios).
3. Guardar Paciente.

**Esperado:** se cierra el modal, se abre automáticamente "Crear Nuevo Turno" con ese paciente preseleccionado (atajo para darle turno enseguida), y el paciente aparece en el padrón al buscarlo por DNI.

### TC-10 🔴 DNI duplicado
1. Intentá registrar un paciente nuevo con el mismo DNI de uno ya existente.

**Esperado:** error "Ya existe un paciente registrado con el DNI ..." y el paciente no se guarda.

### TC-11 🟡 Validación de nombre
1. En Nombre o Apellido, escribí algo con números o una coma (ej. "Juan123").

**Esperado:** error "no puede contener comas, números ni símbolos" y no se guarda.

### TC-12 🟡 Editar y eliminar paciente
1. Editá el teléfono de un paciente existente y guardá → verificá que se actualice en la tarjeta y tras recargar la página.
2. Eliminá un paciente (ícono tacho + confirmar) → verificá que desaparezca del padrón y siga sin aparecer tras recargar.

### TC-13 ⚪ Importar pacientes desde Excel/CSV o Google Sheets
1. Botón **Importar Hoja Google Sheet** (Navbar) o desde Padrón.
2. Subí un Excel/CSV con columnas Nombre, Apellido, DNI, Teléfono, etc. (o pegá el link de una hoja de Google Sheets pública).

**Esperado:** se muestra una vista previa de los pacientes detectados y, al confirmar, se agregan al padrón sin duplicar los que ya existen (por DNI).

---

## 3. Finanzas

### TC-14 🔴 Resumen financiero diario
1. Pestaña **Cierre Diario & Honorarios**, en un día con turnos cargados.

**Esperado:** se ven los totales de Honorarios Esperados y Percibidos, y coinciden con la suma manual de los turnos de ese día (esperado = todos los no cancelados; percibido = los marcados "Pagado").

### TC-15 ⚪ Impresión de agenda diaria y cierre de caja
1. Desde Agenda o Finanzas, botón de impresión correspondiente.

**Esperado:** se abre una ventana/pestaña nueva con el reporte formateado, con botón para Imprimir/Guardar PDF.

---

## 4. Backups

### TC-16 🟡 Backup manual
1. Pestaña **Backups** → **Generar y Descargar Backup Ahora**.

**Esperado:** se descarga un archivo `.csv` con los turnos del día y aparece el mensaje "Backup descargado exitosamente".

---

## 5. Recordatorios de WhatsApp

### TC-17 🟡 Enviar recordatorio
1. En una tarjeta de turno, botón **WhatsApp**.

**Esperado:** se abre WhatsApp Web/app con un mensaje pre-armado (fecha, hora, tratamiento, y links de confirmar/cancelar) al número del paciente.

### TC-18 🔴 Pantalla de confirmación/cancelación del paciente (aislada)
1. Copiá el link "confirmar" de un mensaje generado (tiene `?confirm_turno=<id>`) y abrilo en una pestaña nueva/incógnito.

**Esperado:** se ve **solo** una pantalla mínima de "¡Turno confirmado!" — nunca la agenda completa, el padrón de pacientes ni ningún otro turno. Repetí con `?cancel_turno=<id>` para el caso de cancelación.

---

## 6. Responsive (mobile)

### TC-19 🟡 Uso en celular
1. Achicá la ventana del navegador a ancho de celular (~400px) o abrí en un teléfono.

**Esperado:** aparece la barra de navegación inferior (Agenda / Pacientes / botón "+" / Finanzas / Más) en vez de las pestañas de escritorio; ningún contenido se corta ni genera scroll horizontal; el botón "+" abre el formulario de nuevo turno correctamente.

---

## Equivalencia con los tests automatizados

| Caso manual | Test automatizado |
|---|---|
| TC-01, TC-06, TC-07 | `tests/e2e/appointments.spec.ts` |
| TC-02 | `tests/e2e/appointments.spec.ts` → "blocks saving when the chosen time overlaps..." |
| TC-03, TC-04 | `tests/e2e/appointments.spec.ts` → "edits...", "deletes..." |
| TC-09 a TC-12 | `tests/e2e/patients.spec.ts` |
| TC-14 | `tests/e2e/dashboard.spec.ts` → "daily financial summary..." |
| TC-16 | `tests/e2e/dashboard.spec.ts` → "manual backup download..." |
| TC-18 | `tests/e2e/smoke.spec.ts` → "does not expose the admin agenda..." |
| TC-19 | `tests/e2e/responsive.spec.ts` |
| Cálculo de horarios, resumen financiero, importación de Excel, teléfonos/WhatsApp | `tests/unit/*.test.ts` |

TC-05, TC-08, TC-13, TC-15, TC-17 no tienen equivalente automatizado (UI de solo lectura, ventanas externas o flujos de archivo real) — quedan como verificación manual.
