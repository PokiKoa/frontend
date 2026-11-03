/**
 * @file HistorialCunas.tsx
 * @description Movimientos del paciente entre cunas: asignaciones, traslados,
 * intercambios y liberaciones. Una liberación no es un egreso: el paciente
 * sigue activo y puede volver a asignarse.
 */

import { useEffect, useState } from 'react';

import Badge, { type TonoBadge } from '@/components/ui/Badge/Badge';
import { pacientesService } from '@/services/pacientesService';
import type { MovimientoCuna, TipoMovimientoCuna } from '@/types/paciente';
import { formatearFechaHora } from '@/utils/fechas';

interface Props {
  pacienteId: number;
  /** Cambia cuando la cuna o el estado del paciente cambian, para recargar. */
  version: string;
}

const TONO: Record<TipoMovimientoCuna, TonoBadge> = {
  asignacion: 'info',
  traslado: 'info',
  intercambio: 'info',
  liberacion: 'aviso',
  egreso: 'neutro',
};

function trayecto(movimiento: MovimientoCuna): string {
  if (movimiento.desde && movimiento.hacia) {
    return `${movimiento.desde} → ${movimiento.hacia}`;
  }
  if (movimiento.hacia) return `Ingresa a ${movimiento.hacia}`;
  return `Deja ${movimiento.desde ?? 'la cuna'}`;
}

export default function HistorialCunas({ pacienteId, version }: Props) {
  const [movimientos, setMovimientos] = useState<MovimientoCuna[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    pacientesService
      .movimientosCuna(pacienteId)
      .then((lista) => {
        if (vigente) setMovimientos(lista);
      })
      .catch(() => {
        if (vigente) setMovimientos([]);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [pacienteId, version]);

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <div>
          <h2 className="tarjeta__titulo">Historial de cunas</h2>
          <p className="tarjeta__subtitulo">
            {movimientos.length} movimientos registrados
          </p>
        </div>
      </header>
      <div className="tarjeta__cuerpo ficha__alertas">
        {cargando ? (
          <p className="texto-muted texto-pequeno">Cargando historial…</p>
        ) : movimientos.length === 0 ? (
          <p className="texto-muted texto-pequeno">
            El paciente no ha ocupado cunas.
          </p>
        ) : (
          movimientos.map((movimiento) => (
            <article key={movimiento.id} className="ficha__alerta">
              <div>
                <p className="ficha__fuerte">{trayecto(movimiento)}</p>
                <p className="ficha__secundario">
                  {formatearFechaHora(movimiento.fecha)}
                  {movimiento.registradoPor
                    ? ` · ${movimiento.registradoPor}`
                    : ''}
                </p>
              </div>
              <Badge tono={TONO[movimiento.tipo]}>{movimiento.etiqueta}</Badge>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
