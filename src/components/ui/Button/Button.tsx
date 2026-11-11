/**
 * @file Button.tsx
 * @description Botón único del sistema de diseño. Cubre todas las variantes
 * visuales, tamaños y el estado de carga usado por los formularios.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import './Button.css';

/** Variantes visuales disponibles. */
export type VarianteBoton =
  'primario' | 'secundario' | 'fantasma' | 'peligro' | 'exito';

/** Tamaños disponibles. */
export type TamanoBoton = 'sm' | 'md' | 'lg';

/** Propiedades del componente. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual. */
  variante?: VarianteBoton;
  /** Tamaño del botón. */
  tamano?: TamanoBoton;
  /** Muestra un indicador y bloquea la interacción. */
  cargando?: boolean;
  /** Icono opcional a la izquierda del texto. */
  icono?: ReactNode;
  /** Ocupa todo el ancho disponible. */
  anchoCompleto?: boolean;
}

/**
 * Botón reutilizable con variantes, tamaños y estado de carga.
 *
 * @param props - Propiedades del botón.
 * @returns Elemento `<button>` estilizado.
 */
export default function Button({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  icono,
  anchoCompleto = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...resto
}: ButtonProps) {
  const clases = [
    'boton',
    `boton--${variante}`,
    `boton--${tamano}`,
    anchoCompleto ? 'boton--ancho' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? (
        <span className="boton__spinner" aria-hidden="true" />
      ) : (
        icono && <span className="boton__icono">{icono}</span>
      )}
      <span>{children}</span>
    </button>
  );
}
