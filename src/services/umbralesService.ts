/**
 * @file umbralesService.ts
 * @description Umbrales de alerta globales (`/alert-thresholds/default/`) y por
 * paciente (`/patients/{id}/alert-thresholds/`).
 */

import { api } from '@/api/axios';
import type { Api } from '@/api/tipos';

export type Umbrales = Api['AlertThresholdConfig'];
export type CambiosUmbrales = Api['AlertThresholdConfigUpdate'];

let porDefecto: Promise<Umbrales> | null = null;

/** Umbrales globales; la respuesta se comparte entre pantallas durante la sesión. */
export function obtenerUmbralesPorDefecto(): Promise<Umbrales> {
  porDefecto ??= api
    .get<Umbrales>('/alert-thresholds/default/')
    .then(({ data }) => data)
    .catch((error: unknown) => {
      porDefecto = null;
      throw error;
    });
  return porDefecto;
}

export async function actualizarUmbralesPorDefecto(
  cambios: CambiosUmbrales
): Promise<Umbrales> {
  const { data } = await api.patch<Umbrales>(
    '/alert-thresholds/default/',
    cambios
  );
  porDefecto = Promise.resolve(data);
  return data;
}

export async function obtenerUmbralesPaciente(id: number): Promise<Umbrales> {
  const { data } = await api.get<Umbrales>(`/patients/${id}/alert-thresholds/`);
  return data;
}

export async function actualizarUmbralesPaciente(
  id: number,
  cambios: CambiosUmbrales
): Promise<Umbrales> {
  const { data } = await api.patch<Umbrales>(
    `/patients/${id}/alert-thresholds/`,
    cambios
  );
  return data;
}
