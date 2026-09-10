# Agenda Médica & Turnos — Estética Láser Rosario

Sistema de gestión de turnos para un consultorio de estética vascular/láser. Full-stack SPA (React + Express) pensada para uso local/offline en un único consultorio, sin backend de base de datos: todo el estado vive en `localStorage` del navegador. El personal entra con una pantalla de login; la sesión se valida en el servidor.

## Funcionalidades principales

- **Agenda de turnos**: alta, edición, cancelación y borrado de turnos, con duración calculada automáticamente según el tratamiento, detección de solapamiento de horarios, bloqueo de días feriados/no laborables y de horarios fuera del rango de atención (Lunes, Martes y Viernes, 14:30–20:00 hs).
- **Bloqueo de horarios ("NO DAR")**: reservar una franja para que no se agenden turnos (cirugía, reunión, etc.).
- **Padrón de pacientes**: alta, edición y borrado, con validación de DNI único y de campos de nombre.
- **Importación masiva de pacientes** desde Excel/CSV o una hoja de Google Sheets pública, con detección inteligente de encabezados y de celdas combinadas.
- **Cierre diario y honorarios**: resumen financiero por día (esperado vs. percibido, por método de pago, por tratamiento, por obra social) y planillas imprimibles (agenda diaria y cierre de caja).
- **Recordatorios por WhatsApp**: mensaje pre-armado con link de auto-confirmación/cancelación que el paciente puede usar sin acceder al resto de la app.
- **Exportación / respaldo**: descarga de Excel multi-hoja, CSV y backup manual desde el navegador (no hay persistencia en servidor).

## Stack tecnológico

- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS v4, lucide-react, motion (animaciones), xlsx (lectura/escritura de Excel).
- **Backend**: Express 4 + `tsx`, sirviendo el frontend (vía Vite en dev, estático en prod), autenticación de sesión (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) y un endpoint de salud (`/api/health`). Los respaldos en servidor (`/api/backup/*`) exigen sesión. No hay base de datos: la persistencia real es `localStorage` en el navegador de quien usa la app.
- **Testing**: Vitest (lógica de negocio) y Playwright (flujos end-to-end en navegador).

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev       # servidor de desarrollo (Vite + Express) en http://localhost:3000
npm run build      # build de producción (frontend + servidor)
npm start          # sirve el build de producción
```

## Variables de entorno

Copiá `.env.example` a `.env` y definí las credenciales del consultorio:

| Variable | Uso |
| --- | --- |
| `ADMIN_USERNAME` | Usuario de ingreso (por defecto `admin`). |
| `ADMIN_PASSWORD` | Contraseña del personal. **Obligatoria en producción** (`NODE_ENV=production`). En desarrollo, si no se define, se usa una clave local documentada abajo. |
| `TRUST_PROXY` | Poné `1` si la app está detrás de un reverse proxy, para que el límite de intentos de login use la IP real. |
| `PORT` | Puerto HTTP (por defecto `3000`). |

En desarrollo local, si no hay `.env`, el usuario es `admin` y la contraseña es `EsteticaLaser.2026`. Cambiala antes de publicar.

La sesión dura 8 horas, viaja en una cookie `HttpOnly` + `SameSite=Lax` (y `Secure` en producción). Tras 5 intentos fallidos desde la misma IP, el ingreso se bloquea 15 minutos. Los links de confirmar/cancelar turno que recibe el paciente por WhatsApp siguen funcionando sin login y no muestran la agenda.

`.env.example` también documenta `GEMINI_API_KEY` y `APP_URL` heredadas de la plantilla original de AI Studio; no las usa el código actual.

## Testing

```bash
npm test           # tests unitarios de lógica de negocio (Vitest)
npm run test:e2e   # tests end-to-end en navegador (Playwright)
npm run test:all   # ambas suites
```

- **Unitarios** (`tests/unit/`): cálculo de horarios/duraciones, resumen financiero diario, normalización de teléfonos y generación de recordatorios de WhatsApp, generación de CSV, importación/parseo de planillas de pacientes, y autenticación (hash de contraseña, cookie de sesión y bloqueo por intentos fallidos).
- **End-to-end** (`tests/e2e/`, requieren `npx playwright install chromium` una sola vez): ingreso con usuario y contraseña, alta/edición/borrado de turnos y pacientes, detección de solapamiento de horarios, reglas de negocio (no agendar en día no laborable ni en el pasado), persistencia tras recargar la página, resumen financiero, backup manual y verificación de que la app es usable en mobile sin overflow horizontal.

## Build

```bash
npm run build   # vite build (frontend) + esbuild (servidor)
npm run lint    # typecheck (tsc --noEmit)
```

## Deploy

`npm run build` genera `dist/` (assets del frontend + `dist/server.cjs`). `npm start` sirve ese build con Express en el puerto `PORT` (por defecto `3000`). Al no depender de una base de datos externa, el único requisito de la plataforma de hosting es correr Node y exponer un puerto — los datos de cada consultorio quedan en el navegador de quien la usa, no en el servidor.
