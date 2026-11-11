# Poki Koa — Frontend de monitoreo neonatal

Interfaz web (React 19 + Vite + TypeScript) del sistema Poki Koa para unidades de neonatología: panel de la unidad, mapa de cunas con telemetría en vivo, pacientes, medicación, planes de cuidado, alertas, turnos, reportes y auditoría. Consume el **backend v2** (`/api/v1/` y WebSockets `/ws/v1/`).

> Solo datos ficticios. Nunca cargues datos reales de pacientes en entornos de desarrollo o pruebas.

## Requisitos

| Herramienta         | Versión                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| Node.js             | 24                                                                             |
| npm                 | 11                                                                             |
| Backend Poki Koa v2 | [poki-koa-backend](https://github.com/Asulx/poki-koa-backend)                  |
| Para el backend     | Python 3.12+, [`uv`](https://docs.astral.sh/uv/) y Docker (PostgreSQL y Redis) |

## Instalación paso a paso

Clona ambos repositorios uno al lado del otro, porque el frontend genera sus tipos desde `../backend/openapi/schema.yml`:

```bash
mkdir poki-koa && cd poki-koa
git clone https://github.com/Asulx/poki-koa-backend.git
git clone https://github.com/PokiKoa/frontend.git
```

### Instalación automática (recomendada)

Cada repositorio tiene un script que verifica los requisitos, prepara todo y, si algo falta, explica cómo corregirlo. Se pueden ejecutar varias veces:

```bash
cd backend  && ./scripts/setup.sh --run   # terminal 1: PostgreSQL, Redis, migraciones, seed_demo y uvicorn
cd frontend && ./scripts/setup.sh --run   # terminal 2: .env, npm ci y npm run dev
```

Opcional (terminal 3): `cd backend && uv run poki_koa simulate_telemetry --anomaly-rate 0.2 --interval 3`.

Los pasos manuales equivalentes son los siguientes.

### 1. Backend (terminal 1)

```bash
cd backend
cp .env.example .env              # fija settings de desarrollo
docker compose up -d db redis     # PostgreSQL y Redis
uv sync
uv run poki_koa migrate
uv run poki_koa seed_demo         # usuarios, cunas, pacientes y medicamentos ficticios
uv run uvicorn poki_koa.asgi:application --app-dir src --reload
```

El API queda en `http://localhost:8000/api/v1/` (Swagger en `/api/v1/docs/`).

### 2. Telemetría simulada (terminal 2, opcional pero recomendado)

```bash
cd backend
uv run poki_koa simulate_telemetry --anomaly-rate 0.2 --interval 3
```

Envía lecturas a las cunas ocupadas, con episodios que generan y resuelven alertas, para ver el panel, el mapa y las fichas en vivo.

### 3. Frontend (terminal 3)

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Abre **http://localhost:5173**. Vite redirige `/api` y `/ws` al backend (proxy), así que el navegador ve un solo origen.

### Usuarios de demostración (`seed_demo`)

| Usuario        | Contraseña     | Rol                     | Pantalla inicial                           |
| -------------- | -------------- | ----------------------- | ------------------------------------------ |
| `admin`        | `admin2026`    | Administrador           | Panel general                              |
| `dr.soto`      | `Clinica#2026` | Neonatología            | Panel general                              |
| `matrona.diaz` | `Clinica#2026` | Matronería / Enfermería | Panel general (tiene cunas en "Mis cunas") |
| `qf.silva`     | `Clinica#2026` | Farmacia                | Medicamentos                               |

## Variables de entorno (`.env`)

| Variable              | Por defecto             | Uso                                                                                                |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`        | `/api/v1`               | Ruta base del API. En desarrollo pasa por el proxy de Vite.                                        |
| `VITE_WS_URL`         | vacío                   | Origen de los WebSockets (`wss://…`). Vacío = mismo origen de la página.                           |
| `VITE_BACKEND_ORIGIN` | `http://localhost:8000` | Destino del proxy de Vite (solo `npm run dev`).                                                    |
| `VITE_PUBLIC_URL`     | vacío                   | Dirección que se imprime en los QR de las cunas. Vacío = la dirección desde la que se abre la app. |

## Scripts

| Comando                           | Qué hace                                                               |
| --------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo con proxy al backend.                           |
| `npm run build`                   | Verifica tipos (`tsc -b`) y genera `dist/`.                            |
| `npm run preview`                 | Sirve el build localmente.                                             |
| `npm test`                        | Pruebas unitarias (Vitest).                                            |
| `npm run test:coverage`           | Pruebas con reporte de cobertura en `coverage/`.                       |
| `npm run test:e2e`                | Prueba de contrato contra un backend real con `seed_demo` (ver abajo). |
| `npm run lint`                    | Lint con oxlint.                                                       |
| `npm run format` / `format:check` | Formatea o verifica el formato con Prettier.                           |
| `npm run api:types`               | Regenera `src/api/schema.d.ts` desde el OpenAPI del backend.           |

CI (`.github/workflows/ci.yml`) corre formato, lint, build y pruebas en cada push y pull request.

## Cómo se conecta con el backend

- **Sesión:** `POST /auth/login/` devuelve el access token y deja el refresh en una cookie `HttpOnly`. El access token vive **solo en memoria**. Ante un 401, el cliente (`src/api/axios.ts`) hace una única renovación compartida (`/auth/refresh/`) y reintenta. Al recargar la página, `AuthContext` restaura la sesión desde la cookie.
- **2FA:** si la cuenta lo tiene activo, el login pide el código de 6 dígitos (`two_factor_required`).
- **Tiempo real:** `useTiempoReal(ruta)` abre `ws/v1/...` con el subprotocolo `["bearer", token]`, reconecta con espera exponencial y renueva el token ante el cierre `4401`. Canales usados: `monitoring/stream/` (panel, mapa, alertas, mis cunas, cabecera) y `patients/{id}/stream/` (ficha).
- **Tipos:** `src/api/schema.d.ts` se genera desde el contrato OpenAPI versionado del backend. Las respuestas en inglés pasan por `src/api/mappers/*` a modelos en español (`src/types/*`); ninguna pantalla lee el JSON crudo.
- **Datos remotos:** `@tanstack/react-query` administra consultas, caché y mutaciones de pacientes sobre los mismos servicios Axios (`src/hooks/queries/*`, política en `src/api/queryClient.ts`). La caché es solo en memoria. Detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
- **Errores:** el backend responde `{"error": {"code", "message", "details"}}`; `obtenerMensajeError` muestra el detalle más específico.

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Códigos QR de las cunas

Cada cuna lleva pegado un QR con la URL `<app>/qr/cuna/<código>`. El QR identifica a la **cuna**, no al paciente: al escanearlo se abre la ficha de quien la ocupe en ese momento, así la misma etiqueta sirve todos los días. Si la cuna está libre, se muestra su estado.

- **Imprimir:** Mapa de cunas → **Códigos QR** genera una hoja con una etiqueta por cuna. El código impreso es el mismo de la etiqueta (`C-01`); si se renombra una cuna, hay que volver a imprimir su QR.
- **Escanear:** con la app de cámara del teléfono (abre el navegador; si no hay sesión, pide login y vuelve a la ficha) o con el botón **QR** de la cabecera, que usa la cámara dentro de la app.
- **Desde un teléfono en la misma red:** levanta Vite con `npm run dev -- --host` e imprime los QR con la IP del computador (ej. `http://192.168.1.20:5173`) en el campo de dirección de la hoja o en `VITE_PUBLIC_URL`. El lector dentro de la app necesita HTTPS (o `localhost`), porque los navegadores solo dan acceso a la cámara en conexiones seguras; la app de cámara del teléfono funciona igual por HTTP.

## Prueba de contrato contra el backend real

Con el backend levantado y `seed_demo` cargado (crea datos ficticios adicionales):

```bash
npm run test:e2e                                          # usa http://localhost:8000/api/v1
POKI_E2E_API=http://localhost:8001/api/v1 npm run test:e2e  # otro backend
```

## Problemas comunes

| Síntoma                                                    | Causa y solución                                                                                                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "No se pudo conectar con el servidor"                      | El backend no está corriendo en `VITE_BACKEND_ORIGIN`. Levántalo con `uvicorn` (no con `runserver`, que no sirve WebSockets).                                               |
| Al recargar la página se pierde la sesión                  | Abre la app por `http://localhost:5173` y no apuntes `VITE_API_URL` directo a `:8000`: la cookie de refresh es `SameSite=Lax` y solo viaja en el mismo sitio. Usa el proxy. |
| El panel no se actualiza solo                              | No hay telemetría: corre `simulate_telemetry`. El rol farmacia no usa WebSockets.                                                                                           |
| Login responde 429                                         | Límite de 5 intentos por minuto del backend; espera un minuto.                                                                                                              |
| `npm ci` falla por el lockfile                             | Usa Node 24 / npm 11 y no edites `package-lock.json` a mano.                                                                                                                |
| Errores al levantar el backend (Docker, Python, `psycopg`) | Ejecuta `./scripts/setup.sh` en `../backend`: detecta el problema e indica la solución. Ver también "Problemas comunes" en el README del backend.                           |
| Tipos desactualizados tras cambiar el backend              | `npm run api:types` (requiere el backend clonado en `../backend`).                                                                                                          |

## Estructura

```text
src/
├── api/            # cliente HTTP, WebSocket, tipos generados y mappers por módulo
├── components/     # ui/ (sistema de diseño), layout/, auth/, pacientes/, medicamentos/
├── context/        # AuthContext (sesión) y ToastContext (avisos)
├── hooks/          # useTiempoReal, useRangosVitales y queries/ (TanStack Query por módulo)
├── pages/          # una carpeta por pantalla
├── routes/         # tabla de rutas privadas por pantalla y rol
├── schemas/        # validación de formularios (Zod)
├── services/       # acceso al API por módulo
├── styles/         # tokens, tipografía y estilos globales
├── types/          # modelos de la interfaz (en español)
└── utils/          # fechas (America/Santiago), roles, rangos vitales, cálculos
```

Convenciones: alias `@` → `src`, Prettier (`npm run format`), comentarios solo para explicar un porqué, textos de interfaz en español.
