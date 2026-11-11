/**
 * @file TarjetaFamilia.tsx
 * @description Datos de contacto de la madre y el padre en la ficha del paciente.
 */

import type { DatosTutor } from '@/types/paciente';
import { formatearRut, formatearTelefono } from '@/utils/contacto';

interface Props {
  madre: DatosTutor;
  padre: DatosTutor;
}

function informado(tutor: DatosTutor): boolean {
  return Boolean(
    tutor.rut || tutor.nombres || tutor.apellidos || tutor.telefono
  );
}

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
