# Hito 3 — Frontend (ISF224)

Parte del frontend del Hito 3 de **Poki Koa**, versión `2.1.0`. El informe principal (diagnóstico de las tres intervenciones, integración, entrega y cierre) está en el backend: [`hito3/` del backend](https://github.com/PokiKoa/backend/tree/main/hito3).

| Archivo | Contenido |
|---|---|
| [01 · Intervención CSV y modularización](01-intervencion-csv-y-modularizacion.md) | Intervención 3, contrato de `toCsv`/`downloadCsv`, organización de `src/` antes y después |
| [02 · Verificación y entrega](02-verificacion-y-entrega.md) | Suite, cobertura, build, CI, tag y paquete |

Licencias de terceros: [`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md).

## Prueba rápida

```bash
npm ci
npm run lint && npm run format:check
npm run test:coverage      # 129 pruebas, 4 omitidas (e2e)
npm run build
```

Para ejecutar la aplicación completa hace falta el backend: README de la raíz, «Instalación paso a paso».
