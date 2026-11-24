# 02 · Verificación y entrega del frontend

## Ejecutado el 2026-11-23 (Node con `npm ci`, sobre `main` + cierre)

| Comprobación | Resultado |
|---|---|
| `npm run lint` (oxlint) | Sin hallazgos |
| `npm run format:check` (Prettier) | Sin diferencias |
| `npm run test:coverage` (Vitest) | **129 pruebas pasan**, 4 omitidas (e2e); 28 archivos de prueba; cobertura de líneas 71 % |
| `npm run build` (`tsc -b && vite build`) | Correcto |
| Tipos de la API | Regenerados con `npm run api:types` desde el contrato actual del backend (commit `7cd085f`) |

Línea base del Hito 3: 102 pruebas → 129 ahora.

## Flujo integrado con el backend

El frontend consume el contrato validado por el backend (`openapi/schema.yml`). Los tres casos de integración (egreso válido, rechazo por rol/datos inválidos, recurso ausente) se ejecutaron contra la API real y están documentados en [`hito3/04-integracion.md` del backend](https://github.com/PokiKoa/backend/blob/main/hito3/04-integracion.md). La comprobación visual en el navegador no se automatizó y queda para la demostración de la Sumativa 3.

## Versión y paquete

- Tag **`2.1.0`** (`package.json` y `package-lock.json` coinciden). Es compatible con `2.0.0`: no cambia la interfaz pública, solo tipos regenerados, licencias y documentación.
- Paquete: GitHub Release `2.1.0` con el ZIP del código, `.env.example` y `THIRD_PARTY_LICENSES.md`; imagen Docker con la SPA tras nginx (`Dockerfile`, ver «Despliegue con Docker» en el README).
- CI: [ejecuciones en `main`](https://github.com/PokiKoa/frontend/actions?query=branch%3Amain).
- Revisión por otro equipo: **pendiente**, ver [backend `05-entrega.md` §5](https://github.com/PokiKoa/backend/blob/main/hito3/05-entrega.md).
