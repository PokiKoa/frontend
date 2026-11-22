/**
 * @file TarjetaFamilia.tsx
 * @description Datos de contacto de la madre y el padre en la ficha del paciente.
 */

import type { DatosTutor } from '@/types/paciente';
import { formatearRut, formatearTelefono } from '@/utils/contacto';

/** Propiedades del componente `TarjetaFamilia`. */
interface Props {
  /** Datos de identificación y contacto registrados para la madre. */
  madre: DatosTutor;
  /** Datos de identificación y contacto registrados para el padre. */
  padre: DatosTutor;
}

/**
 * Verifica si el tutor tiene al menos un campo de identificación o contacto informado.
 *
 * @param tutor - Estructura con los datos del tutor (`DatosTutor`).
 * @returns `true` si existe RUT, nombres, apellidos o teléfono; `false` si está completamente vacío.
 */
function informado(tutor: DatosTutor): boolean {
  return Boolean(
    tutor.rut || tutor.nombres || tutor.apellidos || tutor.telefono
  );
}

/**
 * Renderiza el bloque individual de información de un tutor (madre o padre)
 * con su nombre completo, RUT formateado y enlace telefónico `tel:`.
 *
 * @param props - Título del rol (`"Madre"` o `"Padre"`) y datos del tutor (`DatosTutor`).
 * @returns Elemento `div` con los datos formateados o un aviso si no hay registros.
 */
function Tutor({ titulo, tutor }: { titulo: string; tutor: DatosTutor }) {
  const nombre = [tutor.nombres, tutor.apellidos].filter(Boolean).join(' ');
  return (
    <div className="ficha__tutor">
      <span className="ficha__tutor-rol">{titulo}</span>
      {informado(tutor) ? (
        <>
          <p className="ficha__fuerte">{nombre || 'Nombre sin informar'}</p>
          <p className="ficha__secundario">
            RUT {tutor.rut ? formatearRut(tutor.rut) : 'sin informar'}
          </p>
          {tutor.telefono ? (
            <a className="ficha__telefono" href={`tel:${tutor.telefono}`}>
              {formatearTelefono(tutor.telefono)}
            </a>
          ) : (
            <p className="ficha__secundario">Sin teléfono</p>
          )}
        </>
      ) : (
        <p className="ficha__secundario">Sin datos registrados.</p>
      )}
    </div>
  );
}

/**
 * Renderiza la tarjeta de antecedentes familiares del paciente neonatal,
 * mostrando lado a lado los datos de contacto de la madre y el padre.
 *
 * @param props - Propiedades del componente (`{ madre, padre }`).
 * @returns Sección `<section>` con ambos bloques `Tutor`.
 */
export default function TarjetaFamilia({ madre, padre }: Props) {
  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">Madre y padre</h2>
      </header>
      <div className="tarjeta__cuerpo ficha__familia">
        <Tutor titulo="Madre" tutor={madre} />
        <Tutor titulo="Padre" tutor={padre} />
      </div>
    </section>
  );
}
