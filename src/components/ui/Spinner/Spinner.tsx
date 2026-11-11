/**
 * @file Spinner.tsx
 * @description Indicador de carga reutilizable.
 */

/** Propiedades del indicador. */
interface SpinnerProps {
  /** Texto opcional bajo el indicador. */
  texto?: string;
  /** Ocupa una altura mínima de bloque. */
  bloque?: boolean;
}

/**
 * Indicador circular de progreso.
 *
 * @param props - Texto y modo bloque.
 * @returns Indicador animado accesible.
 */
export default function Spinner({ texto, bloque = false }: SpinnerProps) {
  if (!bloque) {
    return (
      <span
        className="spinner"
        role="status"
        aria-label={texto ?? 'Cargando'}
      />
    );
  }

  return (
    <div className="cargando" role="status" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      {texto && <p>{texto}</p>}
    </div>
  );
}
