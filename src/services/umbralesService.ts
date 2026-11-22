/**
 * @file umbralesService.ts
 * @description Umbrales de alerta globales (`/alert-thresholds/default/`) y por
 * paciente (`/patients/{id}/alert-thresholds/`).
 */

import { api } from '@/api/axios';
import type { Api } from '@/api/tipos';

/** Configuración completa de umbrales de signos vitales. */
export type Umbrales = Api['AlertThresholdConfig'];

/** Subconjunto parcial de umbrales permitido en operaciones de actualización. */
export type CambiosUmbrales = Api['AlertThresholdConfigUpdate'];

/** Promesa cacheada en memoria con los umbrales globales vigentes de la sesión. */
let porDefecto: Promise<Umbrales> | null = null;

/**
 * Obtiene los umbrales clínicos globales por defecto.
 * Cachea la promesa en memoria para compartir el resultado entre pantallas durante
 * la sesión y la invalida automáticamente si la petición falla.
 *
 * @returns Configuración de umbrales globales vigente.
 */
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

/**
 * Actualiza parcialmente los umbrales clínicos globales y sincroniza la caché
 * en memoria con la respuesta del servidor.
 *
 * @param cambios - Valores de umbrales a modificar.
 * @returns Configuración de umbrales globales actualizada.
 */
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

/**
 * Obtiene la configuración de umbrales clínicos específica de un paciente.
 *
 * @param id - Identificador numérico del paciente.
 * @returns Configuración de umbrales asociada al paciente.
 */
export async function obtenerUmbralesPaciente(id: number): Promise<Umbrales> {
  const { data } = await api.get<Umbrales>(`/patients/${id}/alert-thresholds/`);
  return data;
}

/**
 * Actualiza parcialmente los umbrales clínicos específicos de un paciente.
 *
 * @param id - Identificador numérico del paciente.
 * @param cambios - Valores de umbrales a modificar para el paciente.
 * @returns Configuración de umbrales del paciente actualizada.
 */
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