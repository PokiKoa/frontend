/**
 * @file tipos.ts
 * @description Alias sobre los tipos generados del contrato OpenAPI del backend v2.
 * Regenerar con `npm run api:types` cuando cambie `openapi/schema.yml`.
 */

import type { components } from './schema';

/** Esquemas del API tal como los define el backend (campos en inglés). */
export type Api = components['schemas'];

/** Envoltura de paginación estándar de los listados del backend. */
export interface Paginado<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
