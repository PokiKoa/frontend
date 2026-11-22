/**
 * @file notificaciones.ts
 * @description Notificaciones limpiadas por cada usuario. Limpiar solo las
 * oculta del panel de la cabecera: las alertas siguen abiertas en Alertas, y
 * una alerta nueva o que sube de severidad vuelve a aparecer.
 */

import type { Notificacion } from '@/types/alerta';

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en notificaciones: ${mensaje}`);
  }
}

const PREFIJO = 'poki-koa:notificaciones-limpiadas:';

/**
 * Lee desde `localStorage` el conjunto de claves de notificación limpiadas por el usuario;
 * retorna un conjunto vacío si no hay sesión o el almacenamiento no está disponible.
 *
 * @param usuarioId - Identificador del usuario autenticado.
 * @returns Conjunto de claves persistidas como limpiadas.
 */
export function leerLimpiadas(usuarioId: number | undefined): Set<string> {
  if (usuarioId === undefined) return new Set();
  try {
    const guardado = window.localStorage.getItem(`${PREFIJO}${usuarioId}`);
    const claves: unknown = guardado ? JSON.parse(guardado) : [];
    return new Set(
      Array.isArray(claves)
        ? claves.filter((c): c is string => typeof c === 'string')
        : []
    );
  } catch {
    return new Set();
  }
}

/**
 * Persiste en `localStorage` las claves de notificación limpiadas por el usuario.
 * Ignora silenciosamente fallos de cuota o modo privado para degradar a limpieza en memoria.
 *
 * @param usuarioId - Identificador del usuario autenticado.
 * @param claves - Conjunto de claves a guardar.
 */
export function guardarLimpiadas(
  usuarioId: number | undefined,
  claves: Set<string>
): void {
  if (usuarioId === undefined) return;
  try {
    window.localStorage.setItem(
      `${PREFIJO}${usuarioId}`,
      JSON.stringify([...claves])
    );
  } catch {
    // Modo privado o almacenamiento bloqueado: se limpian solo en esta sesión
  }
}

/**
 * Filtra las notificaciones activas que aún no han sido limpiadas por el usuario.
 *
 * Pre: `notificaciones` es una lista válida y `limpiadas` contiene claves de alerta (`id:severidad`).
 * Post: Retorna un subconjunto ordenado de `notificaciones` cuya `clave` no pertenece a `limpiadas`.
 * Invariante: No muta el arreglo `notificaciones` ni el conjunto `limpiadas`; el total visible
 * nunca supera `notificaciones.length`.
 */
export function notificacionesVisibles(
  notificaciones: Notificacion[],
  limpiadas: Set<string>
): Notificacion[] {
  const visibles = notificaciones.filter((item) => !limpiadas.has(item.clave));

  asegurar(
    visibles.length <= notificaciones.length,
    'el total de notificaciones visibles no puede superar el total recibido.'
  );

  return visibles;
}

/**
 * Construye el conjunto de claves a persistir al limpiar el panel, conservando
 * exclusivamente las notificaciones actualmente vigentes para purgar alertas ya cerradas.
 *
 * Pre: `notificaciones` es una lista válida de notificaciones activas.
 * Post: Retorna un `Set<string>` con las claves únicas de `notificaciones` (`size <= notificaciones.length`).
 * Invariante: No muta el arreglo `notificaciones`.
 */
export function clavesAlLimpiar(notificaciones: Notificacion[]): Set<string> {
  const claves = new Set(notificaciones.map((item) => item.clave));

  asegurar(
    claves.size <= notificaciones.length,
    'el conjunto de claves limpiadas no puede tener más elementos que las notificaciones actuales.'
  );

  return claves;
}