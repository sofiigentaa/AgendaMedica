# Desplegar Agenda Médica en internet (multi-dispositivo)

Esta guía deja la app accesible desde cualquier dispositivo con internet, con una base de datos PostgreSQL real compartida entre todos y login con la contraseña del consultorio.

Pasos para **Render**. (Railway es prácticamente idéntico: Postgres administrado + Web Service desde GitHub + las mismas variables de entorno.)

## Por qué hay dos esquemas de Prisma

`prisma/schema.prisma` (SQLite) es el que usan `npm run dev` y los tests — cero configuración local. `prisma/production/schema.prisma` (PostgreSQL) es el que usa `npm start` en producción. Prisma no permite elegir el motor de base de datos con una variable de entorno, así que son dos archivos separados con el mismo modelo de datos; `npm start` ya se encarga de generar el cliente correcto y aplicar las migraciones de Postgres antes de arrancar — no hace falta correr nada de Prisma a mano en el deploy.

## 1. Crear la base de datos en Render

1. [dashboard.render.com](https://dashboard.render.com) → **New → PostgreSQL**.
2. Elegí un nombre (ej. `agenda-medica-db`), plan Free para arrancar, región cercana.
3. Cuando termine de crearse, copiá la **Internal Database URL** (si el Web Service va a estar en la misma región — más rápido y no cuenta para límites de conexiones externas) o la **External Database URL** si vas a conectarte desde afuera de Render también.

## 2. Generar los secretos (ya hecho en esta sesión)

```
AUTH_PASSWORD_HASH=<lo generé más arriba con tu contraseña>
SESSION_SECRET=<lo generé más arriba>
```

Si en algún momento querés cambiar la contraseña del consultorio: `npm run hash-password -- "nueva-contraseña"` y actualizá `AUTH_PASSWORD_HASH` en Render (no hace falta redeployar código).

## 3. Crear el Web Service

1. En Render: **New → Web Service** → conectá tu cuenta de GitHub → elegí el repo `AgendaMedica` (tiene que estar pusheado, ya lo está).
2. Configuración:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. **Environment Variables** (pestaña Environment del servicio):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La Internal/External Database URL del paso 1 |
   | `SESSION_SECRET` | La del paso 2 |
   | `AUTH_PASSWORD_HASH` | La del paso 2 (el string completo `$2b$12$...`) |
   | `NODE_ENV` | `production` |

   No hace falta `TEST_RESET_TOKEN` ni `LOGIN_RATE_LIMIT` en producción (son solo para tests).
4. **Create Web Service**. Render instala dependencias, compila, y en el primer arranque `npm start` aplica las migraciones de Postgres automáticamente (crea las tablas) antes de levantar el servidor.
5. Cuando termine, Render te da una URL pública `https://agenda-medica-xxxx.onrender.com` con HTTPS incluido.

## 4. Primer ingreso

Abrí la URL, ingresá con la contraseña del consultorio. La base arranca vacía — desde **Backups → Gestionar / Restablecer Agenda → Cargar datos de demostración** podés cargar el set de ejemplo si querés mostrarla en una demo, o simplemente empezar a cargar pacientes reales.

## 5. Si cambiás el modelo de datos más adelante

Cualquier cambio a los modelos hay que reflejarlo a mano en **ambos** schemas (`prisma/schema.prisma` y `prisma/production/schema.prisma` deben quedar con los mismos modelos).

1. Migración local (SQLite), como siempre:
   ```bash
   npx prisma migrate dev --name mi_cambio
   ```
2. Migración de Postgres, apuntando `DATABASE_URL` a una base Postgres real y de prueba (puede ser una segunda base gratuita en Render, o la misma de producción si no te importa aplicar el cambio ahí directamente):
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate dev --schema prisma/production/schema.prisma --name mi_cambio
   ```
   Esto genera la migración en `prisma/production/migrations/` y la aplica contra esa base en el mismo paso.
3. Commiteá ambas carpetas de migraciones (`prisma/migrations/` y `prisma/production/migrations/`) y pusheá — el próximo deploy en Render aplica la migración de Postgres automáticamente vía `npm start`.

## Notas

- **`prisma` (el CLI) queda como devDependency**, no dependency — funciona en Render porque instala devDependencies durante el build y las mantiene disponibles para el `start` (no hace un "prune" de dev deps entre build y runtime). Si migrás a una plataforma que sí las poda, movés `prisma` a `dependencies`.
- **Un solo servidor/instancia**: `npm start` corre `prisma migrate deploy` en cada arranque. Con más de una instancia arrancando al mismo tiempo esto es seguro igual (Prisma usa un lock), pero para este tamaño de proyecto alcanza y sobra con un plan de una sola instancia.
- **Backup de la base**: Render ofrece backups automáticos de Postgres desde su panel (plan pago) o backups manuales exportables. Además, la app tiene su propio botón de backup manual (CSV/Excel) en la pestaña Backups, para tener una copia aparte sin depender de la plataforma.
