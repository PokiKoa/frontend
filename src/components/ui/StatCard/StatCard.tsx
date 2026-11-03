/**
 * @file StatCard.tsx
 * @description Tarjeta de indicador para el dashboard y reportes.
 */

import type { ReactNode } from 'react';

import './StatCard.css';

/** Tonos disponibles para el indicador. */
export type TonoStat = 'primario' | 'exito' | 'aviso' | 'critico' | 'info';

/** Propiedades de la tarjeta. */
interface StatCardProps {
  /** Etiqueta superior. */
  etiqueta: string;
  /** Valor principal. */
  valor: string | number;
  /** Detalle inferior. */
  detalle?: string;
  /** Icono decorativo. */
  icono?: ReactNode;
  /** Tono del valor y del icono. */
  tono?: TonoStat;
}

/**
 * Indicador numérico del panel.
 *
 * @param props - Etiqueta, valor, detalle, icono y tono.
 * @returns Tarjeta compacta.
 */
export default function StatCard({
  etiqueta,
  valor,
  detalle,
  icono,
  tono = 'primario',
}: StatCardProps) {
  return (
    <article className={`stat stat--${tono}`}>
      <div className="stat__texto">
        <p className="stat__etiqueta">{etiqueta}</p>
        <p className="stat__valor">{valor}</p>
        {detalle && <p className="stat__detalle">{detalle}</p>}
      </div>
      {icono && (
        <span className="stat__icono" aria-hidden="true">
          {icono}
        </span>
      )}
    </article>
  );
}
