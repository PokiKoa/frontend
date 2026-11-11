## 1. Qué es este proyecto

**Poki Koa** es el frontend de un sistema de monitoreo neonatal para unidades de neonatología: panel de la unidad, mapa de cunas con telemetría en vivo, pacientes (recién nacidos), medicación, planes de cuidado, alertas, turnos, reportes y auditoría.

Este repositorio es **solo frontend** (React + Vite). El backend vive en otro repositorio: [poki-koa-backend](https://github.com/Asulx/poki-koa-backend). Ambos repos se clonan uno al lado del otro porque este frontend genera sus tipos desde `../backend/openapi/schema.yml`.

## 2. Stack y Arquitectura

| Tema | Valor |
|---|---|
| Lenguaje | TypeScript |
| Framework | React 19 + Vite |
| Routing | React Router 7 |
| Formularios / validación | React Hook Form + Zod |
| HTTP / tiempo real | Axios + WebSockets (`/ws/v1/`) |
| Gráficos | Recharts |
| Gestor / Linter / Formateo | npm, `oxlint`, `prettier` |
| Tests | Vitest + `@vitest/coverage-v8` |
| Tipos del API | Generados desde `../backend/openapi/schema.yml` vía `openapi-typescript` (`src/api/schema.d.ts`) |

### Estructura (`src/`)
- `api`: cliente HTTP, tipos generados del contrato OpenAPI y `mappers/` entre el contrato del backend y los modelos de UI.
- `components`: componentes compartidos por dominio (`auth`, `medicamentos`, `pacientes`, `qr`, `layout`, `ui`).
- `pages`: una carpeta por vista/ruta (`dashboard`, `mapa`, `pacientes`, `medicamentos`, `planes`, `alertas`, `turnos`, `reportes`, `registros`, `configuracion`, `login`, `qr`, `notfound`).
- `routes`: definición de rutas y guards de acceso.
- `context`, `hooks`, `services`, `schemas` (Zod), `types`, `utils`, `styles`.
- `__e2e__`: pruebas end-to-end (`POKI_E2E=1`).

### Documentación de arquitectura (`docs/`)
- [ARQUITECTURA.md](docs/ARQUITECTURA.md): arquitectura del frontend.
- [guia-unidad-3.md](docs/guia-unidad-3.md): evidencias de la Guía Unidad 3 (exportador CSV reutilizable y modularización).
- `docs/academico/`, `docs/analisis-impacto-neonatologia.md`: documentación académica/soporte, no normativa para desarrollo.

## 3. Comandos

Ejecutar desde la raíz del repositorio:

```bash
npm ci                     # instala dependencias (usar ci, no install, salvo que se agregue una dependencia)
npm run dev                # servidor de desarrollo Vite (proxy hacia VITE_BACKEND_ORIGIN)
npm run build              # tsc -b + build de producción
npm run lint                # oxlint
npm run format              # prettier --write sobre src/**/*.{ts,tsx,css,md}
npm run format:check         # prettier --check (usar en CI, nunca --write silencioso sobre commits ajenos)
npm run test                 # vitest run
npm run test:coverage        # vitest run --coverage
npm run test:e2e             # POKI_E2E=1 vitest run src/__e2e__ (requiere backend levantado)
npm run api:types            # regenera src/api/schema.d.ts desde ../backend/openapi/schema.yml
```

El backend debe estar corriendo en `http://localhost:8000` (o el valor de `VITE_BACKEND_ORIGIN`) para desarrollo y para `test:e2e`.

## 4. Seguridad y datos

- Cero secretos en el repositorio: toda configuración de entorno vive en `.env` (`cp .env.example .env`), nunca hardcodeada.
- **Usa solo datos ficticios.** Nunca cargues datos reales de pacientes ni los vuelques en logs, capturas o commits.
- En desarrollo, el API se consume a través del proxy de Vite (mismo origen) para que el navegador pueda enviar la cookie httpOnly del refresh token; no apuntar el cliente HTTP directo al backend salteando el proxy.

## 5. Reglas para agentes de IA

- Lee el código antes de afirmar un comportamiento; no inventes rutas, componentes, campos del API ni resultados de pruebas.
- Identificadores en inglés (variables, funciones, tipos, props); textos de UI, mensajes de error y comentarios en español.
- Comentarios en español, solo cuando expliquen un *porqué* no obvio (sin JSDoc redundante).
- Si el contrato del API cambia en el backend, regenera `src/api/schema.d.ts` con `npm run api:types` en el mismo commit; no edites ese archivo a mano.
- Una sola fuente de verdad por tipo/validación compartida (p. ej. esquemas Zod en `schemas/`, no duplicados en componentes).
- Si una prueba falla, corrige la causa; no relajes aserciones ni elimines tests para que pasen.
- Mantén un estilo clínico sobrio en la UI: sin emojis, sin gradientes, esquinas redondeadas estandarizadas.
- Antes de reportar una tarea de UI como completa, levanta `npm run dev` y prueba el flujo principal y casos borde en el navegador cuando sea posible; si no se puede probar visualmente, dilo explícitamente.
- Toda tarea debe separarse en commits pequeños y comprensibles en español; nunca envíes todo en un solo commit.
