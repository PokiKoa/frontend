# 01 · Intervención 3 (exportador CSV) y modularización del frontend

## Intervención 3

| Aspecto | Registro |
|---|---|
| **Problema** | `services/reportesService.ts` mezclaba llamadas HTTP, generación de CSV y descarga. La prueba del CSV vivía en el mapper e importaba el servicio. La bitácora de auditoría no se podía exportar. |
| **Ubicación** | `src/services/reportesService.ts`, `src/pages/reportes/ReportesPage.tsx`, `src/pages/registros/RegistrosPage.tsx` |
| **Consecuencia** | Lógica CSV imposible de reutilizar o probar aislada; un segundo export obligaba a copiarla. |
| **Prioridad** | Media: impacto moderado (1 flujo, 2 con la auditoría) y esfuerzo bajo (función pura nueva y dos cambios de llamada). |
| **Solución** | `src/utils/csv.ts` con contrato definido y probado primero (`00ff6ac`). `reporteACsv` pasa al mapper sobre `toCsv` (`8f7e820`), protegido por un snapshot previo (`ecfbd9d`). Segundo consumidor real: `registrosACsv` y botón «Exportar CSV» de auditoría (`d504172`, `5c2e8bd`). |
| **PR** | [#103](https://github.com/PokiKoa/frontend/pull/103) → integrado en `main` por [#106](https://github.com/PokiKoa/frontend/pull/106) |

| Indicador | Antes | Después |
|---|---|---|
| Implementaciones de escapado CSV y descarga | 1, acoplada al servicio de reportes | 1 en `utils/csv.ts`, sin E/S HTTP |
| Flujos que exportan CSV con la misma implementación | 1 (reportes) | **2** (reportes y auditoría) |
| Responsabilidades de `reportesService.ts` | HTTP + CSV + descarga | Solo HTTP |

## Contrato del componente reutilizable

| Aspecto | Definición |
|---|---|
| **Nombre y propósito** | `toCsv(rows)` serializa filas a CSV; `downloadCsv(content, filename)` descarga el texto como archivo. |
| **Entrada** | `rows: ReadonlyArray<ReadonlyArray<string \| number \| null \| undefined>>`; `content: string`, `filename: string` |
| **Salida** | `toCsv` → `string` con separador `;` y filas unidas por `\r\n`, sin salto final. `null`/`undefined` quedan como celda vacía. Las celdas con `;`, `"` o saltos de línea van entre comillas. Los textos que empiezan con `= + - @` llevan el prefijo `'` (protección contra inyección de fórmulas). `downloadCsv` → `void`, descarga con BOM UTF-8. |
| **Errores** | `downloadCsv` lanza `Error('El nombre del archivo CSV es obligatorio.')` si el nombre está vacío. `toCsv` no lanza. |
| **Consumidores** | `api/mappers/reportes.ts` (`reporteACsv`) y `api/mappers/registros.ts` (`registrosACsv`); las páginas `ReportesPage` y `RegistrosPage` llaman a `downloadCsv`. |

**Ejemplo desde otro archivo**

```ts
import { downloadCsv, toCsv } from '@/utils/csv';

const csv = toCsv([['Cuna', 'Estado'], ['C-01', 'ocupada']]);
// csv === 'Cuna;Estado\r\nC-01;ocupada'
downloadCsv(csv, 'cunas.csv');
```

**Cómo comprobarlo**

- `npx vitest run src/utils/csv.test.ts src/api/mappers`
- En la app: como `admin`, abrir **Auditoría** y pulsar **Exportar CSV** → se descarga `poki-koa-auditoria-<fecha>.csv` (hasta 100 registros, límite del backend).

## Modularización del frontend

**Organización elegida:** por capas técnicas y, en `pages/`, por pantalla. Se justifica porque varias pantallas comparten servicios, mappers y reglas puras; separar por capas evita duplicarlos.

| Carpeta | Responsabilidad | Regla de límite |
|---|---|---|
| `api/` y `api/mappers/` | Cliente HTTP/WebSocket, tipos generados y traducción contrato → modelo de UI (incluye los CSV de dominio) | Sin React |
| `services/` | Llamadas HTTP por módulo | Solo HTTP |
| `hooks/queries/` | Carga y caché con TanStack Query | Usa `services/` |
| `utils/` | Funciones puras reutilizables (`csv.ts`, `estados.ts`, `roles.ts`, `fechas.ts`…) | Sin E/S |
| `pages/` | Presentación, una carpeta por pantalla | Sin reglas de negocio |

Cambios del Hito 3:

| Cambio | Commits | Indicador |
|---|---|---|
| Reglas «plan activo» e «indicación vigente» en `utils/estados.ts` | `0052ae9`, `b1c763d` | Comparaciones en línea de `'Activo'`/`'Vigente'` en páginas: 10 → 0 |
| `useSerieQuery` y paso de `ReportesPage` a TanStack Query | `5316cd2`, `ee2d906` | Carga manual en `ReportesPage` (`useState` + `allSettled` + `useEffect`): eliminada |
| CSV de dominio en `api/mappers/` y `services/` solo HTTP | `8f7e820` | `reportesService.ts`: 3 responsabilidades → 1 |

**Caso comparado antes/después:** exportar el reporte a CSV desde `ReportesPage` produce el mismo archivo (lo fija el snapshot `ecfbd9d`, que pasa antes y después del cambio).

Estructura completa: [`docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md).

## Deuda postergada

Páginas con carga manual de datos (`DashboardPage`, `TurnosPage`, `RegistrosPage`, `MapaCunasPage`, `PlanesPage`, `AlertasPage`, `MedicamentosPage`, `MisCunasPage`): solo se migró `ReportesPage` para validar el patrón. Se revisa al modificar cada página.
