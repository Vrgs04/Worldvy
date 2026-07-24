# Worldvy

PWA de palabras en español con identidad propia y tres modos: reto diario persistente, partidas ilimitadas con rotación y contrarreloj de 1, 3 o 5 minutos. No usa cuentas, backend ni telemetría: ajustes, partidas y estadísticas viven exclusivamente en `localStorage`.

## Desarrollo

Requiere Node 22+ y pnpm 10.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

`pnpm check` ejecuta lint, TypeScript estricto, Vitest y el build. `pnpm build` genera `dist`; `pnpm deploy` publica esa carpeta con Wrangler.

## Vocabulario

El generador reproducible `scripts/build-dictionary.ts` procesa listados CSV/TSV UTF-8 de CORPES XXI 1.0 descargados desde la [RAE](https://www.rae.es/banco-de-datos/corpes-xxi). Extrae lemas, normaliza tildes para la mecánica sin confundir Ñ/N, filtra expresiones y símbolos, deduplica, conserva frecuencia y genera listas separadas de intentos y soluciones. Ejecuta:

```bash
pnpm dictionary:build ruta/al/listado-oficial.csv
```

Las inclusiones y exclusiones justificadas están en `data/`. La atribución y separación de licencias están en `NOTICE.md`. El catálogo se describe como vocabulario derivado de fuentes oficiales, no como «todas las palabras de la RAE».

## PWA e instalación

Vite genera manifest y service worker con precaché y limpieza de versiones antiguas. Tras la primera carga, abre el menú del navegador y elige “Instalar aplicación”. La interfaz avisa cuando hay una actualización disponible.

## GitHub y Cloudflare Pages

La rama de producción es `main`; GitHub Actions instala usando el lockfile, valida y despliega `dist`. Configura `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` como secretos, y `CLOUDFLARE_PROJECT_NAME` como variable del repositorio. El token debe limitarse a Cloudflare Pages: Edit. Para desarrollo local copia `.env.example` sin introducir secretos en Git.

## Estructura

- `src/domain`: reglas puras y probadas.
- `src/storage`: esquema tipado, migración y recuperación.
- `src/data`: catálogo usado por la interfaz.
- `scripts`: generador lingüístico reproducible.
- `.github/workflows`: validación y despliegue continuo.

Consulta `CONTRIBUTING.md` antes de enviar cambios. Código MIT; datos derivados CC BY-SA 4.0.
