# Arquitectura del frontend — Poki Koa v2

## Capas

```text
pages/*  ──usa──▶  hooks/queries/*  ──usa──▶  services/*  ──usa──▶  api/axios.ts ──HTTP──▶ backend /api/v1
   │                   │                                          (vía proxy de Vite)
   │                   └──traduce con──▶ api/mappers/*  ◀── tipos de api/schema.d.ts
   │                                                         (generados del OpenAPI)
   └──usa──▶ hooks/useTiempoReal ──▶ api/tiempoReal.ts ──WS──▶ backend /ws/v1
```

- **`api/axios.ts`**: única instancia HTTP. El access token vive en memoria y se renueva una sola vez ante 401 aunque haya varias peticiones en vuelo (el backend rota el refresh en cada uso). Si la renovación falla, avisa a `alExpirarSesion` y `AuthContext` vuelve al login.
- **`api/queryClient.ts`** y **`hooks/queries/*`**: capa de TanStack Query sobre los servicios (Axios sigue siendo el único cliente HTTP). Ver la sección siguiente.
- **`api/tiempoReal.ts`**: `ConexionTiempoReal` mantiene el WebSocket. Se autentica con el subprotocolo `bearer`, envía ping cada 25 s y reconecta con espera exponencial (máximo 30 s). Ante un `4401` renueva el token y vuelve a conectar; ante `4403` o `4404` no reintenta.
- **`api/mappers/*`**: traducción del contrato del backend (inglés) a los modelos de la interfaz (español), uno por módulo y con pruebas. Concentra las conversiones: decimales como texto, enums, fechas con zona y nombres de campos.
- **`services/*`**: una función por operación del API. Las funciones puras que aplican eventos del WebSocket sobre el estado (`aplicarEventoAlertas`, `aplicarEventoCunas`) viven aquí y tienen pruebas.
- **`utils/roles.ts`**: qué pantallas y acciones ve cada rol. Refleja la matriz RBAC del backend (`docs/SECURITY_AND_RBAC.md` del backend), que sigue siendo la autoridad.
- **`utils/rangos.ts`**: los rangos normales de signos vitales salen de `/alert-thresholds/default/`. El frontend no define rangos propios, para que haya una sola fuente de verdad.

## Consultas y mutaciones (TanStack Query)

`QueryClientProvider` envuelve la app en `App.tsx`. Política global en `api/queryClient.ts`:

| Valor                   | Decisión                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `staleTime` 30 s        | Los datos clínicos cambian durante el turno: se refrescan pronto, pero no en cada render.       |
| `gcTime` 5 min          | Una consulta sin pantalla que la use se descarta de memoria a los 5 minutos.                    |
| Reintentos de lectura   | Máximo 2, solo ante fallos de red o 5xx; un 4xx (permisos, no encontrado) no se reintenta.      |
| Reintentos de escritura | Ninguno: repetir una escritura podría duplicar un registro clínico.                             |
| Sin persistencia        | La caché vive solo en memoria; no se guarda información clínica en `localStorage` ni IndexedDB. |

Cada módulo expone en `hooks/queries/<módulo>.ts`:

- una fábrica de claves (`pacientesKeys`) ordenada de lo general a lo específico, para invalidar por prefijo;
- `*QueryOptions` (usadas por los hooks y por las pruebas, sin React) y los hooks `usePacientesQuery`, `usePacienteQuery`, `useMedicosQuery`, `useCunasQuery`, `useReporteQuery`;
- mutaciones `useCrearPacienteMutation`, `useActualizarPacienteMutation`, `useEgresarPacienteMutation` y `useEliminarPacienteMutation`. Al terminar, `invalidarPacientes` marca como desactualizados los listados y fichas de pacientes, la ocupación de cunas y los contadores del reporte.

Las pantallas no llaman a `pacientesService` directamente para estas operaciones: usan el hook y leen `isPending`, `isError` y `isFetching`. `usePacientesQuery` conserva la página anterior mientras llega la siguiente (`keepPreviousData`), así filtrar o paginar no vacía la tabla. Las peticiones idénticas simultáneas se comparten en una sola. En desarrollo se monta `ReactQueryDevtools` (carga diferida; no entra al build de producción).

Para agregar un módulo: crear `hooks/queries/<módulo>.ts` con sus claves y `queryOptions`, reutilizando la función del servicio como `queryFn`, y llamar a `invalidarPacientes` (o una función equivalente) en el `onSuccess` de sus mutaciones.

## Pantallas y endpoints

| Pantalla          | Ruta                                        | Endpoints                                                                                                                                     | Tiempo real                    |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Login             | `/login`                                    | `auth/login/` (+ `otp_code`)                                                                                                                  | —                              |
| Panel general     | `/`                                         | `reports/summary/`, `reports/series/`, `alerts/?is_open=true`                                                                                 | `monitoring/stream/` (alertas) |
| Mapa de cunas     | `/mapa`                                     | `monitoring/overview/`, `cribs/{id}/assign-patient/`, `release/`, `PATCH cribs/{id}/`, `patients/`                                            | `monitoring/stream/`           |
| Mis cunas         | `/mis-cunas`                                | `shift-assignments/mine/`, `shifts/`                                                                                                          | `monitoring/stream/`           |
| Pacientes         | `/pacientes`                                | `patients/` (filtros y paginación del backend), `reports/summary/`                                                                            | —                              |
| Ingreso / edición | `/pacientes/nuevo`, `/pacientes/:id/editar` | `patients/`, `PATCH patients/{id}/`, `staff/?role=neonatologist`, `monitoring/overview/`                                                      | —                              |
| Ficha clínica     | `/pacientes/:id`                            | `patients/{id}/`, `vitals/`, `weights/`, `discharge/`, `alerts/?patient=`, `care-plans/?patient=`, `observations/`, `prescriptions/?patient=` | `patients/{id}/stream/`        |
| Medicamentos      | `/medicamentos`                             | `medication-catalog/`, `prescriptions/`, `administer/`, `administrations/`, `cancel/`                                                         | —                              |
| Planes de cuidado | `/planes`                                   | `care-plans/` (suspender = `PATCH status=suspended`)                                                                                          | —                              |
| Alertas           | `/alertas`                                  | `alerts/`, `acknowledge/`, `resolve/`                                                                                                         | `monitoring/stream/`           |
| Turnos            | `/turnos`                                   | `shifts/`, `shift-assignments/`, `staff/`, `monitoring/overview/`                                                                             | —                              |
| Reportes          | `/reportes`                                 | `reports/summary/`, `reports/series/?days=`, `shifts/` (CSV en el cliente)                                                                    | —                              |
| Auditoría         | `/registros`                                | `audit-logs/`, `audit-logs/summary/`                                                                                                          | —                              |
| Configuración     | `/configuracion`                            | `auth/me/`, `auth/change-password/`, `auth/2fa/setup/`, `enable/`, `disable/`, `auth/logout/`                                                 | —                              |

## Roles

| Pantalla                                        | Administrador                             | Neonatología                       | Enfermería  | Farmacia                                  |
| ----------------------------------------------- | ----------------------------------------- | ---------------------------------- | ----------- | ----------------------------------------- |
| Panel, mapa, pacientes, planes, alertas, turnos | Sí                                        | Sí                                 | Sí          | —                                         |
| Mis cunas                                       | —                                         | Sí                                 | Sí          | —                                         |
| Medicamentos                                    | Catálogo y stock; indicaciones en lectura | Prescribir, administrar y cancelar | Administrar | Catálogo y stock; indicaciones en lectura |
| Reportes, configuración                         | Sí                                        | Sí                                 | Sí          | Sí                                        |
| Auditoría                                       | Sí                                        | —                                  | —           | —                                         |

Acciones destacadas:

- Solo **neonatología** edita diagnóstico y médico tratante, registra egresos y prescribe.
- **Neonatología y enfermería** admiten pacientes, registran pesos, planes y observaciones, y administran dosis.
- **Administrador**: mantenimiento de cunas y asignaciones de turno.
- **Farmacia y administrador**: catálogo de medicamentos.

## Decisiones

- **Proxy de Vite en desarrollo**: el navegador ve un solo origen, así que no hay CORS y la cookie `SameSite=Lax` del refresh se envía. En producción, el frontend y el API se publican bajo el mismo dominio o se configura `REFRESH_COOKIE_SAMESITE=None` en el backend.
- **Estado en vivo sin volver a pedir datos**: las lecturas del WebSocket se aplican en memoria. Cuando cambian las alertas o el estado de una cuna, se recarga el resumen, porque los conteos solo se pueden recalcular en el backend.
- **Sin bibliotecas nuevas**: los gráficos usan `recharts` (ya incluido), el CSV se genera con `Blob` y los tipos del API con `openapi-typescript` vía `npx`, con versión fija y sin dependencia.
- **Fechas**: formato `dd-mm-aaaa` y zona `America/Santiago`, igual que el backend. Las fechas sin hora se interpretan al mediodía para no cambiar de día.

## Historia de esta rama

`rewrite/v2` se reconstruyó desde `develop` trayendo el diseño de Figma (`feat/ui-figma-integracion`, commit `d8482cd`) por módulos, cada uno conectado al backend v2 en su propio commit. La rama de Figma queda intacta como referencia visual.
