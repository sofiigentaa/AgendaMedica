# Agenda Médica & Turnos — Estética Láser Rosario

Sistema de gestión de turnos para consultorio de estética láser: agenda diaria (lunes, martes y viernes, 14:30–20:00), padrón de pacientes, honorarios, recordatorios por WhatsApp, importación Excel/CSV y respaldos locales.

## Funcionalidades principales

- Agenda de turnos con duraciones por tratamiento y detección de solapamientos
- Bloqueo de horarios (NO DAR) y feriados / días no laborables
- Padrón de pacientes (alta, edición, baja, DNI único, importación Excel/Google Sheets)
- Cierre diario de honorarios y estados de pago
- Recordatorios WhatsApp con links de confirmar / cancelar turno (pantalla aislada para el paciente)
- Exportación Excel/CSV/JSON y backups en `localStorage` (más historial en memoria del servidor)

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Express, `xlsx`. Persistencia principal: **localStorage** del navegador.

## Instalación y ejecución

```bash
npm install
cp .env.example .env   # opcional; PORT=3000 por defecto
npm run dev            # http://localhost:3000
```

Producción:

```bash
npm run build
NODE_ENV=production npm start
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto del servidor (default `3000`) |
| `NODE_ENV` | `production` sirve `dist/` estático |
| `GEMINI_API_KEY` | No se usa en el código actual |

## Testing (¿el proyecto funciona?)

```bash
npm test
```

Ejecuta tests de lógica (Vitest) y flujos E2E (Playwright). Resultado verde = funcionalidades principales OK.

Por separado:

```bash
npm run test:unit    # reglas de negocio, persistencia helpers, import/export
npm run test:e2e     # navegador: agenda, pacientes, CRUD, API health
npx tsc --noEmit     # typecheck (`npm run lint`)
npm run build
```

La primera vez, instalar Chromium de Playwright: `npx playwright install chromium`.

## Deploy

App SPA + API mínima (`GET /api/health`, `POST /api/backup/save`, `GET /api/backup/list`). El backup de servidor es **en memoria** (se pierde al reiniciar). Los datos clínicos viven en el navegador.

Build: `npm run build` y `NODE_ENV=production npm start`, o servir `dist/` detrás de un proxy que también corra el servidor Express.
