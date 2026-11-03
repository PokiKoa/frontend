/**
 * @file Table.tsx
 * @description Tabla genérica con columnas configurables, estado de carga,
 * mensaje de vacío y navegación por fila.
 */

import type { ReactNode } from 'react';

import './Table.css';

/** Definición de una columna. */
export interface TableColumn<T> {
  /** Identificador único de la columna. */
  key: string;
  /** Texto de cabecera. */
  label: string;
  /** Render personalizado de la celda. */
  render?: (row: T) => ReactNode;
  /** Alineación del contenido. */
  align?: 'left' | 'center' | 'right';
  /** Ancho CSS de la columna. */
  width?: string;
}

/** Propiedades de la tabla. */
export interface TableProps<T> {
  /** Columnas a mostrar. */
  columns: TableColumn<T>[];
  /** Filas de datos. */
  data: T[];
  /** Clave estable por fila. */
  rowKey: (row: T) => string | number;
  /** Mensaje cuando no hay datos. */
  vacio?: string;
  /** Muestra el estado de carga. */
  cargando?: boolean;
  /** Acción al hacer clic en una fila. */
  onRowClick?: (row: T) => void;
  /** Etiqueta accesible de la tabla. */
  etiqueta?: string;
}

/**
 * Tabla de datos reutilizable.
 *
 * @param props - Columnas, filas y estados.
 * @returns Tabla HTML con cabecera y cuerpo.
 */
export default function Table<T>({
  columns,
  data,
  rowKey,
  vacio = 'No hay registros para mostrar.',
  cargando = false,
  onRowClick,
  etiqueta,
}: TableProps<T>) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla" aria-label={etiqueta}>
        <thead>
          <tr>
            {columns.map((columna) => (
              <th
                key={columna.key}
                style={{
                  width: columna.width,
                  textAlign: columna.align ?? 'left',
                }}
              >
                {columna.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {cargando && (
            <tr>
              <td className="tabla__vacia" colSpan={columns.length}>
                Cargando información…
              </td>
            </tr>
          )}

          {!cargando && data.length === 0 && (
            <tr>
              <td className="tabla__vacia" colSpan={columns.length}>
                {vacio}
              </td>
            </tr>
          )}

          {!cargando &&
            data.map((fila) => (
              <tr
                key={rowKey(fila)}
                className={onRowClick ? 'tabla__fila--clicable' : undefined}
                onClick={onRowClick ? () => onRowClick(fila) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault();
                          onRowClick(fila);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((columna) => (
                  <td
                    key={columna.key}
                    style={{ textAlign: columna.align ?? 'left' }}
                  >
                    {columna.render
                      ? columna.render(fila)
                      : String(
                          (fila as Record<string, unknown>)[columna.key] ?? '—'
                        )}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
