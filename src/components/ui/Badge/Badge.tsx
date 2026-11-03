/**
 * @file Badge.tsx
 * @description Etiqueta compacta de estado usada en tablas y fichas.
 */

import type { ReactNode } from 'react';

/** Tonos semánticos disponibles. */
export type TonoBadge = 'neutro' | 'exito' | 'aviso' | 'critico' | 'info';

/** Propiedades del badge. */
interface BadgeProps {
  /** Tono visual. */
  tono?: TonoBadge;
  /** Muestra un punto de color a la izquierda. */
  punto?: boolean;
  /** Contenido. */
  children: ReactNode;
}

/**
 * Insignia de estado.
 *
 * @param props - Tono, punto y contenido.
 * @returns Etiqueta estilizada.
 */
export default function Badge({
  tono = 'neutro',
  punto = false,
  children,
}: BadgeProps) {
  return (
    <span className={`badge badge--${tono}`}>
      {punto && <span className={`punto punto--${tono}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
