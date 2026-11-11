/**
 * @file EstadoVacio.tsx
 * @description Mensaje de estado vacío con acción opcional.
 */

import type { ReactNode } from 'react';

/** Propiedades del estado vacío. */
interface EstadoVacioProps {
  /** Título principal. */
  titulo: string;
  /** Texto explicativo. */
  texto?: string;
  /** Icono o ilustración. */
  icono?: ReactNode;
  /** Acción sugerida. */
  accion?: ReactNode;
}

/**
 * Bloque informativo para listados sin datos.
 *
 * @param props - Título, texto, icono y acción.
 * @returns Contenedor centrado.
 */
export default function EstadoVacio({
  titulo,
  texto,
  icono,
  accion,
}: EstadoVacioProps) {
  return (
    <div className="estado-vacio">
      {icono && <div className="estado-vacio__icono">{icono}</div>}
      <h3 className="estado-vacio__titulo">{titulo}</h3>
      {texto && <p className="estado-vacio__texto">{texto}</p>}
      {accion}
    </div>
  );
}
