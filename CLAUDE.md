# CLAUDE.md

## Reglas de trabajo

- Antes de subir cualquier cambio, probar que el proyecto compila correctamente ejecutando `npm run build`.
- Solo después de confirmar que el build pasa sin errores, hacer commit y push a `main`.

## Deploy

- Render está conectado al repo de GitHub con auto-deploy: un push a `main` dispara el deploy solo, sin tener que entrar al dashboard de Render ni hacer "Clear build cache & deploy" a mano. Eso solo hace falta si un deploy puntual se traba.
- El deploy tarda unos minutos en quedar "Live" — si algo no se ve reflejado justo después de pushear, probablemente sea eso, no que el cambio esté mal.

## Previsualizar cambios sin esperar el deploy

Para ver un cambio al instante en vez de esperar a Render:

```bash
cp .env.example .env
# completar SESSION_SECRET, AUTH_PASSWORD_HASH (con `npm run hash-password -- "una-contraseña"`) y TEST_RESET_TOKEN
npx prisma migrate dev --name init   # crea la base SQLite local (dev.db) y carga los datos de ejemplo
npm run dev                          # levanta el server en http://localhost:3000
```

Esto corre contra una base SQLite local (`dev.db`), separada de la base real de producción — no toca los datos del consultorio.
