/**
 * @file notificaciones.ts
 * @description Notificaciones limpiadas por cada usuario. Limpiar solo las
 * oculta del panel de la cabecera: las alertas siguen abiertas en Alertas, y
 * una alerta nueva o que sube de severidad vuelve a aparecer.
 */

import type { Notificacion } from '@/types/alerta';

const PREFIJO = 'poki-koa:notificaciones-limpiadas:';

/** Claves limpiadas por el usuario; vacío si el navegador no permite guardar. */
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

/** Notificaciones que siguen visibles en el panel. */
export function notificacionesVisibles(
  notificaciones: Notificacion[],
  limpiadas: Set<string>
): Notificacion[] {
  return notificaciones.filter((item) => !limpiadas.has(item.clave));
}

/**
 * Claves a guardar al limpiar: solo las de las notificaciones actuales, así
 * las de alertas ya cerradas no se acumulan.
 */
export function clavesAlLimpiar(notificaciones: Notificacion[]): Set<string> {
  return new Set(notificaciones.map((item) => item.clave));
}
