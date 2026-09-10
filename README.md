# Agenda Médica & Turnos - Estética Láser Rosario

Sistema de gestión de turnos para un consultorio médico. Full-stack (React + Express + PostgreSQL) con login compartido del consultorio, pensado para que varios dispositivos (recepción, distintos profesionales) trabajen sobre la misma agenda en tiempo real desde cualquier lugar con internet.

## Funcionalidades principales

- **Login del consultorio**: acceso protegido por contraseña compartida, con cookie de sesión y protección contra fuerza bruta en el login.
- **Agenda de turnos**: alta, edición, cancelación y borrado de turnos, con duración calculada automáticamente según el tratamiento, detección de solapamiento de horarios, bloqueo de días feriados/no laborables y de horarios fuera del rango de atención (Lunes, Martes y Viernes, 14:30–20:00 hs).
- **Bloqueo de horarios ("NO DAR")**: reservar una franja para que no se agenden turnos (cirugía, reunión, etc.).
- **Padrón de pacientes**: alta, edición y borrado, con validación de DNI único (aplicada también a nivel de base de datos) y de campos de nombre.
- **Importación masiva de pacientes** desde Excel/CSV o una hoja de Google Sheets pública, con detección inteligente de encabezados y de celdas combinadas.
- **Cierre diario y honorarios**: resumen financiero por día (esperado vs. percibido, por método de pago, por tratamiento, por obra social) y planillas imprimibles (agenda diaria y cierre de caja).
- **Recordatorios por WhatsApp**: mensaje pre-armado con link de auto-confirmación/cancelación que el paciente puede usar sin acceder al resto de la app ni iniciar sesión.
- **Exportación / respaldo**: descarga de Excel multi-hoja y CSV en cualquier momento, además de la base de datos compartida en sí.

## Stack tecnológico

- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS v4, lucide-react, motion (animaciones), xlsx (lectura/escritura de Excel).
- **Backend**: Express 4 + `tsx`, con autenticación por cookie firmada (JWT + bcrypt), rate limiting en el login y cabeceras de seguridad (helmet).
- **Base de datos**: PostgreSQL en producción vía [Prisma](https://www.prisma.io/) (SQLite en desarrollo local, sin configuración adicional — ver [`DEPLOY.md`](DEPLOY.md) para pasar a Postgres).
- **Testing**: Vitest (lógica de negocio) y Playwright (flujos end-to-end en navegador, contra un servidor y base de datos reales).

## Instalación

```bash
npm install
cp .env.example .env
# Completá SESSION_SECRET, AUTH_PASSWORD_HASH y TEST_RESET_TOKEN en .env (ver sección de abajo)
npx prisma migrate dev --name init   # crea la base SQLite local y aplica el esquema
```

## Ejecución

```bash
npm run dev       # servidor de desarrollo (Vite + Express) en http://localhost:3000
npm run build      # build de producción (frontend + servidor)
npm start          # aplica migraciones pendientes y sirve el build de producción
```

## Variables de entorno

Ver [`.env.example`](.env.example) para el detalle completo. Resumen:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a la base (SQLite en dev, PostgreSQL en producción) |
| `SESSION_SECRET` | Firma las cookies de sesión — generalo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AUTH_PASSWORD_HASH` | Hash bcrypt de la contraseña del consultorio — generalo con `npm run hash-password -- "la-contraseña"` |
| `TEST_RESET_TOKEN` | Solo para tests E2E; el endpoint que protege no existe en producción |
| `LOGIN_RATE_LIMIT` | Opcional; intentos de login permitidos por IP cada 15 min (default 8) |

## Testing

```bash
npm test           # tests unitarios de lógica de negocio (Vitest)
npm run test:e2e   # tests end-to-end contra un servidor y base de datos reales (Playwright)
npm run test:all   # ambas suites
```

- **Unitarios** (`tests/unit/`): cálculo de horarios/duraciones, resumen financiero diario, normalización de teléfonos y generación de recordatorios de WhatsApp, generación de CSV, e importación/parseo de planillas de pacientes (incluye detección de encabezados, celdas combinadas y fechas en distintos formatos).
- **End-to-end** (`tests/e2e/`, requieren `npx playwright install chromium` una sola vez): login y sesión, alta/edición/borrado de turnos y pacientes, detección de solapamiento de horarios, reglas de negocio (no agendar en día no laborable ni en el pasado), feriados, persistencia real en base de datos, resumen financiero, backup manual y verificación de que la app es usable en mobile sin overflow horizontal.
- **Casos de prueba manuales**: [`docs/casos-de-prueba-manuales.md`](docs/casos-de-prueba-manuales.md) — checklist para validar la app a mano (demo, smoke test), con la equivalencia de cada caso en la suite automatizada.

## Build

```bash
npm run build   # vite build (frontend) + esbuild (servidor)
npm run lint    # typecheck (tsc --noEmit)
```

## Base de datos

```bash
npm run db:migrate   # crea/aplica una migración en desarrollo
npm run db:deploy    # aplica migraciones pendientes (usado por npm start)
npm run db:seed      # carga el set de datos de ejemplo (pacientes/turnos/feriados)
npm run db:studio    # explorador visual de la base (Prisma Studio)
```

El esquema de desarrollo/tests (SQLite) vive en [`prisma/schema.prisma`](prisma/schema.prisma); el de producción (PostgreSQL) en [`prisma/production/schema.prisma`](prisma/production/schema.prisma) — son dos archivos porque Prisma no permite elegir el motor por variable de entorno (ver [`DEPLOY.md`](DEPLOY.md) para el detalle). Cada paciente/turno/feriado se guarda y actualiza como un registro individual (no un "array completo" reemplazado entero), para que dos dispositivos editando cosas distintas al mismo tiempo no se pisen entre sí.

## Deploy

Ver [`DEPLOY.md`](DEPLOY.md) para la guía completa (Railway/Render, Postgres, HTTPS, contraseña del consultorio). En resumen: `npm start` aplica las migraciones pendientes (`prisma migrate deploy`) y levanta el servidor en el puerto `PORT` (por defecto `3000`) — cualquier hosting que corra Node y te dé una base PostgreSQL alcanza.
