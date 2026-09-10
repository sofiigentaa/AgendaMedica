# Desplegar Agenda Médica en internet (multi-dispositivo)

Esta guía deja la app accesible desde cualquier dispositivo con internet, con una base de datos PostgreSQL real compartida entre todos y login con la contraseña del consultorio.

Se usa **Railway** como ejemplo (tiene Postgres + HTTPS gratis para empezar). Render funciona igual de bien; los pasos son casi idénticos.

## 1. Crear la base de datos

1. Entrá a [railway.app](https://railway.app) y creá una cuenta (podés usar tu GitHub).
2. **New Project → Provision PostgreSQL**. Railway crea la base y te da una `DATABASE_URL` — copiala, la necesitás en el paso 3.

## 2. Cambiar el motor de base de datos a Postgres

Este repo viene configurado para SQLite en desarrollo (no requiere instalar nada localmente). Para producción, cambiá una sola línea:

En `prisma/schema.prisma`:
```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

Y generá la migración para Postgres:
```bash
npx prisma migrate dev --name init_postgres
```

Commiteá ese cambio (el `schema.prisma` modificado + la carpeta `prisma/migrations/` nueva).

## 3. Generar los secretos

Desde tu máquina, en la carpeta del proyecto:

```bash
# Contraseña del consultorio (elegí una vos, no la escribas en ningún lado sin hashear)
npm run hash-password -- "la-contraseña-que-va-a-usar-el-consultorio"
# Copia la línea AUTH_PASSWORD_HASH=... que imprime

# Secreto de sesión (una sola vez, guardalo)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Desplegar el servicio web

1. En Railway, dentro del mismo proyecto: **New → GitHub Repo** y elegí este repositorio (necesitás haberlo pusheado a GitHub primero).
2. En la pestaña **Variables** del servicio, cargá:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La que te dio Railway en el paso 1 (referenciala con `${{Postgres.DATABASE_URL}}` si Railway te lo ofrece automáticamente) |
   | `SESSION_SECRET` | El valor generado en el paso 3 |
   | `AUTH_PASSWORD_HASH` | El hash generado en el paso 3 (todo el string `$2b$12$...`) |
   | `NODE_ENV` | `production` |

   No hace falta `TEST_RESET_TOKEN` ni `LOGIN_RATE_LIMIT` en producción (son solo para tests).

3. Railway detecta que es un proyecto Node y corre `npm install`, `npm run build` y `npm start` automáticamente (definidos en `package.json`). `npm start` aplica las migraciones pendientes (`prisma migrate deploy`) antes de arrancar el servidor.
4. Cuando termine el deploy, Railway te da una URL pública `https://tu-app.up.railway.app` con HTTPS ya incluido.

## 5. Primer ingreso

Abrí la URL, ingresá con la contraseña que elegiste en el paso 3. La base arranca vacía — desde **Backups → Gestionar / Restablecer Agenda → Cargar datos de demostración** podés cargar el set de ejemplo si querés mostrarla en una demo, o simplemente empezar a cargar pacientes reales.

## Notas

- **`prisma` (el CLI) queda como devDependency**, no dependency — esto funciona en Railway/Render porque ambos instalan devDependencies durante el build y las mantienen disponibles para el `start` (no hacen un "prune" de dev deps entre build y runtime, a diferencia de un Dockerfile multi-stage). Si migrás a otra plataforma que sí podea las devDependencies, movés `prisma` a `dependencies` en `package.json`.
- **Cambiar la contraseña del consultorio**: generá un nuevo hash con `npm run hash-password` y actualizá la variable `AUTH_PASSWORD_HASH` en el hosting — no hace falta redeployar el código.
- **Backup de la base**: Railway/Render ofrecen backups automáticos de Postgres desde su panel. Además, la app tiene su propio botón de backup manual (CSV/Excel) en la pestaña Backups, para tener una copia aparte.
