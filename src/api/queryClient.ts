/**
 * @file queryClient.ts
 * @description Cliente de TanStack Query con la política de caché de la
 * aplicación. Axios sigue siendo el único cliente HTTP: las consultas solo
 * orquestan la caché, el estado de carga y los reintentos.
 *
 * Los datos clínicos cambian durante el turno y no se persisten: la caché vive
 * únicamente en memoria y se descarta al cerrar o recargar la pestaña.
 */

import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

/** Tiempo en que un dato se considera fresco y no se vuelve a pedir. */
export const STALE_TIME_MS = 30_000;
/** Tiempo que una consulta sin observadores permanece en memoria. */
export const GC_TIME_MS = 5 * 60_000;
/** Reintentos máximos de una lectura que falla por red o error del servidor. */
export const MAX_REINTENTOS_LECTURA = 2;

/**
 * Decide si una lectura fallida se reintenta.
 *
 * Un error 4xx (sesión, permisos, recurso inexistente) no se corrige
 * reintentando; solo se repiten los fallos de red y los 5xx. El 401 ya lo
 * resuelve el interceptor de Axios renovando el token.
 *
 * @param intentosPrevios - Cuántas veces ya falló la consulta.
 * @param error - Error capturado en la última petición.
 * @returns `true` si se debe reintentar (fallo de red o HTTP >= 500 bajo el límite), o `false` en caso contrario.
 */
export function debeReintentarLectura(
  intentosPrevios: number,
  error: unknown
): boolean {
  if (intentosPrevios >= MAX_REINTENTOS_LECTURA) return false;
  if (axios.isAxiosError(error) && error.response) {
    return error.response.status >= 500;
  }
  return true;
}

/**
 * Crea una instancia de `QueryClient` con la política global de caché y reintentos.
 * Se expone como función fábrica para que las pruebas unitarias obtengan una caché aislada.
 *
 * @returns Nueva instancia de `QueryClient` configurada sin reintentos en mutaciones.
 */
export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        retry: debeReintentarLectura,
        refetchOnWindowFocus: true,
      },
      // Una escritura repetida podría duplicar un registro clínico
      mutations: { retry: false },
    },
  });
}

/** Cliente compartido por toda la aplicación. */
export const queryClient = crearQueryClient();