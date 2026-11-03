/**
 * @file Card.tsx
 * @description Contenedor de contenido con cabecera opcional y acciones.
 */

import type { ReactNode } from 'react';

import './Card.css';

/** Propiedades de la tarjeta. */
export interface CardProps {
  /** Título de la tarjeta. */
  titulo?: string;
  /** Texto secundario bajo el título. */
  subtitulo?: string;
  /** Acciones alineadas a la derecha de la cabecera. */
  acciones?: ReactNode;
  /** Clase adicional. */
  className?: string;
  /** Contenido interno. */
  children: ReactNode;
}

/**
 * Tarjeta contenedora del sistema de diseño.
 *
 * @param props - Título, acciones y contenido.
 * @returns Bloque visual con superficie y borde.
 */
export default function Card({
  titulo,
  subtitulo,
  acciones,
  className = '',
  children,
}: CardProps) {
  return (
    <section className={`tarjeta ${className}`.trim()}>
      {(titulo || acciones) && (
        <header className="tarjeta__cabecera">
          <div>
            {titulo && <h2 className="tarjeta__titulo">{titulo}</h2>}
            {subtitulo && <p className="tarjeta__subtitulo">{subtitulo}</p>}
          </div>
          {acciones && <div className="tarjeta__acciones">{acciones}</div>}
        </header>
      )}
      <div className="tarjeta__cuerpo">{children}</div>
    </section>
  );
}
