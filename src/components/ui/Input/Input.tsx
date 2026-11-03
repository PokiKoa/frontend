/**
 * @file Input.tsx
 * @description Campo de entrada con etiqueta, ayuda y error. Reenvía la ref
 * para integrarse con `react-hook-form`.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import './Input.css';

/** Propiedades del campo. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible. */
  etiqueta?: string;
  /** Mensaje de error de validación. */
  error?: string;
  /** Texto de ayuda bajo el campo. */
  ayuda?: string;
  /** Icono decorativo a la izquierda. */
  icono?: ReactNode;
}

/**
 * Input controlado o registrado en un formulario.
 *
 * @param props - Atributos nativos más etiqueta, ayuda y error.
 * @param ref - Referencia al elemento `<input>`.
 * @returns Campo con su contenedor semántico.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { etiqueta, error, ayuda, icono, className = '', id, ...resto },
  ref
) {
  const identificador = id ?? resto.name;

  return (
    <div className="campo">
      {etiqueta && (
        <label className="campo__label" htmlFor={identificador}>
          {etiqueta}
        </label>
      )}

      <div className="campo__envoltura">
        {icono && (
          <span className="campo__icono" aria-hidden="true">
            {icono}
          </span>
        )}
        <input
          ref={ref}
          id={identificador}
          className={`campo__control ${icono ? 'campo__control--con-icono' : ''} ${
            error ? 'campo__control--error' : ''
          } ${className}`.trim()}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${identificador}-error`
              : ayuda
                ? `${identificador}-ayuda`
                : undefined
          }
          {...resto}
        />
      </div>

      {error && (
        <span className="campo__error" id={`${identificador}-error`}>
          {error}
        </span>
      )}

      {!error && ayuda && (
        <span className="campo__ayuda" id={`${identificador}-ayuda`}>
          {ayuda}
        </span>
      )}
    </div>
  );
});

export default Input;
