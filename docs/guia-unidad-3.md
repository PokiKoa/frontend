# Guía Unidad 3: frontend

La ficha principal, con las intervenciones 1 y 2, la revisión de dependencia y la deuda pendiente, está en el backend: [`poki-koa-backend/docs/guia-unidad-3.md`](https://github.com/Asulx/poki-koa-backend/blob/refactor/unidad-3/docs/guia-unidad-3.md). Este archivo detalla la intervención 3 y la modularización del frontend (rama `refactor/unidad-3`).

## Intervención 3: exportador CSV reutilizable

| Aspecto | Registro |
|---|---|
| Problema | `services/reportesService.ts` mezclaba las llamadas HTTP con la generación CSV y la descarga en el navegador. La prueba del CSV estaba en el mapper e importaba el servicio. La bitácora de auditoría no se podía exportar. |
| Ubicación | `src/services/reportesService.ts`, `src/pages/reportes/ReportesPage.tsx`, `src/pages/registros/RegistrosPage.tsx` |
| Prioridad | Media |
| Solución | Nuevo componente `src/utils/csv.ts`, cuyo contrato se definió y probó antes de implementarlo (`00ff6ac`). `reporteACsv` pasa al mapper sobre `toCsv` (`8f7e820`), protegido por un snapshot previo (`ecfbd9d`). Segundo consumidor real: exportación de la bitácora (`d504172`, `5c2e8bd`). |
| Responsable | _(integrante)_ |

| Indicador | Antes | Después |
|---|---|---|
| Implementaciones de escapado CSV y descarga | 1, acoplada al servicio de reportes | 1 en `utils/csv.ts`, sin E/S HTTP |
| Flujos que exportan CSV | 1 (reportes) | 2 (reportes y auditoría), con la misma implementación |
| Responsabilidades de `reportesService.ts` | HTTP, CSV y descarga | Solo HTTP |

### Interfaz del componente reutilizable

| Aspecto | Definición |
|---|---|
| Nombre y propósito | `toCsv(rows)` serializa filas a CSV. `downloadCsv(content, filename)` descarga el texto como archivo. |
| Entrada | `rows: ReadonlyArray<ReadonlyArray<string \| number \| null \| undefined>>`; `content: string`, `filename: string` |
| Salida | `toCsv` devuelve un `string` con separador `;` (`CSV_SEPARATOR`) y filas unidas por `\r\n`, sin salto final. `null` y `undefined` quedan como celda vacía. Las celdas que contienen `;`, `"` o saltos de línea van entre comillas. Los textos que empiezan con `= + - @` llevan el prefijo `'` (protección contra inyección de fórmulas). `downloadCsv` devuelve `void` y descarga el archivo con BOM UTF-8. |
| Errores | `downloadCsv` lanza `Error('El nombre del archivo CSV es obligatorio.')` si el nombre está vacío. `toCsv` no lanza errores. |
| Consumidores | `api/mappers/reportes.ts` (`reporteACsv`) y `api/mappers/registros.ts` (`registrosACsv`). Las páginas `ReportesPage` y `RegistrosPage` llaman a `downloadCsv`. |

Ejemplo de uso desde otro archivo:

```ts
import { downloadCsv, toCsv } from '@/utils/csv';

const csv = toCsv([['Cuna', 'Estado'], ['C-01', 'ocupada']]);
// csv === 'Cuna;Estado\r\nC-01;ocupada'
downloadCsv(csv, 'cunas.csv');
```

Para comprobarlo:

- Ejecutar `npx vitest run src/utils/csv.test.ts src/api/mappers`.
- Probar en la aplicación: como `admin`, abrir Auditoría y pulsar **Exportar CSV**. Se descarga `poki-koa-auditoria-<fecha>.csv` con hasta 100 registros que cumplen los filtros.

## Modularización del frontend

| Cambio | Commits | Indicador |
|---|---|---|
| Reglas de estado en `utils/estados.ts` (`esPlanActivo`, `esIndicacionVigente`, conteos) | `0052ae9`, `b1c763d` | Comparaciones en línea de `'Activo'`/`'Vigente'` en las páginas: 10 → 0 |
| Consulta `useSerieQuery` y paso de `ReportesPage` a TanStack Query | `5316cd2`, `ee2d906` | Carga manual en `ReportesPage` (`useState` + `allSettled` + `useEffect`): eliminada |
| `services/` solo para HTTP; CSV de dominio en `api/mappers/` | `8f7e820` | — |

La estructura resultante está en [ARQUITECTURA.md](ARQUITECTURA.md).

Las páginas que aún no usan `hooks/queries/` figuran como deuda en la ficha del backend.

## Comandos

```bash
npm ci
npm run test:coverage   # 119 pruebas (102 antes)
npm run lint && npm run format:check && npm run build
npm run dev             # requiere el backend en http://localhost:8000
```
