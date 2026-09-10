# Agenda Médica & Turnos — Estética Láser Rosario

Sistema de gestión de turnos para un consultorio de estética vascular/láser. Full-stack SPA (React + Express) pensada para uso local/offline en un único consultorio, sin backend de base de datos: todo el estado vive en `localStorage` del navegador.

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
- **Backend**: Express 4 + `tsx`, sirviendo el frontend (vía Vite en dev, estático en prod) y un endpoint de salud (`/api/health`). No hay base de datos: la persistencia real es `localStorage` en el navegador de quien usa la app.
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

No son necesarias para ejecutar la app: la agenda funciona enteramente con `localStorage`, sin llamadas a APIs externas. `.env.example` documenta variables (`GEMINI_API_KEY`, `APP_URL`) heredadas de la plantilla original de AI Studio; ninguna es utilizada actualmente por el código.

## Testing

```bash
npm test           # tests unitarios de lógica de negocio (Vitest)
npm run test:e2e   # tests end-to-end en navegador (Playwright)
npm run test:all   # ambas suites
```

- **Unitarios** (`tests/unit/`): cálculo de horarios/duraciones, resumen financiero diario, normalización de teléfonos y generación de recordatorios de WhatsApp, generación de CSV, e importación/parseo de planillas de pacientes (incluye detección de encabezados, celdas combinadas y fechas en distintos formatos).
- **End-to-end** (`tests/e2e/`, requieren `npx playwright install chromium` una sola vez): alta/edición/borrado de turnos y pacientes, detección de solapamiento de horarios, reglas de negocio (no agendar en día no laborable ni en el pasado), persistencia tras recargar la página, resumen financiero, backup manual y verificación de que la app es usable en mobile sin overflow horizontal.

## Build

```bash
npm run build   # vite build (frontend) + esbuild (servidor)
npm run lint    # typecheck (tsc --noEmit)
```

## Deploy

`npm run build` genera `dist/` (assets del frontend + `dist/server.cjs`). `npm start` sirve ese build con Express en el puerto `PORT` (por defecto `3000`). Al no depender de una base de datos externa, el único requisito de la plataforma de hosting es correr Node y exponer un puerto — los datos de cada consultorio quedan en el navegador de quien la usa, no en el servidor.
