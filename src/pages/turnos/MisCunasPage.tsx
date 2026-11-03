/**
 * @file MisCunasPage.tsx
 * @description Vista del profesional: cunas y pacientes que la jefatura le
 * asignó para el día en curso, con los últimos signos vitales registrados.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { obtenerMensajeError } from '@/api/axios';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import { decimal } from '@/api/mappers/alertas';
import type { Api } from '@/api/tipos';
import { useAuth } from '@/context/AuthContext';
import { useRangosVitales } from '@/hooks/useRangosVitales';
import { useTiempoReal } from '@/hooks/useTiempoReal';
import { turnosService } from '@/services/turnosService';
import type { MisCunas, RespuestaMisCunas } from '@/types/turnos';
import { signoEnRango } from '@/utils/rangos';
import { formatearFecha, formatearHora } from '@/utils/fechas';

import './MisCunasPage.css';

/**
 * Presenta una lectura de signos vitales con su unidad.
 *
 * @param valor - Lectura numérica o `null`.
 * @param unidad - Unidad de medida.
 * @returns Texto legible o `—`.
 */
function leerVital(valor: number | null, unidad: string): string {
  return valor === null ? '—' : `${valor} ${unidad}`;
}

/**
 * Página "Mis cunas" del profesional autenticado.
 *
 * @returns Tarjetas con las cunas asignadas y sus signos vitales.
 */
export default function MisCunasPage() {
  const { usuario } = useAuth();
  const rangos = useRangosVitales();

  const [respuesta, setRespuesta] = useState<RespuestaMisCunas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  /**
   * Recupera las cunas asignadas al usuario para hoy.
   */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      setRespuesta(await turnosService.misCunas());
    } catch (fallo) {
      setError(obtenerMensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Las lecturas de mis cunas se aplican en vivo; los cambios de alertas recargan el turno
  useTiempoReal('/ws/v1/monitoring/stream/', (evento) => {
    if (evento.event.startsWith('alert.')) {
      void cargar();
      return;
    }
    if (evento.event !== 'telemetry.reading' || !evento.reading) return;
    const lectura = evento.reading as Api['VitalSignReading'];
    const alertasCambian =
      ((evento.active_alerts as unknown[] | undefined)?.length ?? 0) > 0 ||
      ((evento.auto_resolved_alerts as unknown[] | undefined)?.length ?? 0) > 0;
    setRespuesta((actual) => {
      if (
        !actual ||
        !actual.cunas.some((cuna) => cuna.cunaId === evento.crib_id)
      )
        return actual;
      return {
        ...actual,
        cunas: actual.cunas.map((cuna) =>
          cuna.cunaId === evento.crib_id
            ? {
                ...cuna,
                ritmoCardiaco: lectura.heart_rate,
                spo2: lectura.spo2,
                temperatura: decimal(lectura.temperature),
              }
            : cuna
        ),
      };
    });
    if (
      alertasCambian &&
      respuesta?.cunas.some((cuna) => cuna.cunaId === evento.crib_id)
    ) {
      void cargar();
    }
  });

  const cunas = useMemo(() => respuesta?.cunas ?? [], [respuesta]);

  /** Cunas con al menos una alerta activa. */
  const conAlertas = useMemo(
    () => cunas.filter((cuna) => cuna.alertasActivas > 0),
    [cunas]
  );

  /** Cunas que tienen un paciente ingresado. */
  const conPaciente = useMemo(
    () => cunas.filter((cuna) => cuna.pacienteId !== null),
    [cunas]
  );

  const nombre = (usuario?.nombreCompleto ?? '').split(' ')[0] || 'equipo';

  /**
   * Renderiza la tarjeta de una cuna asignada.
   *
   * @param cuna - Cuna con paciente y telemetría.
   * @returns Tarjeta clínica.
   */
  const renderCuna = (cuna: MisCunas) => {
    const vitales: Array<{
      clave: 'ritmoCardiaco' | 'spo2' | 'temperatura';
      icono: 'corazon' | 'gota' | 'temperatura';
      etiqueta: string;
      valor: number | null;
      unidad: string;
    }> = [
      {
        clave: 'ritmoCardiaco',
        icono: 'corazon',
        etiqueta: 'FC',
        valor: cuna.ritmoCardiaco,
        unidad: 'bpm',
      },
      {
        clave: 'spo2',
        icono: 'gota',
        etiqueta: 'SpO₂',
        valor: cuna.spo2,
        unidad: '%',
      },
      {
        clave: 'temperatura',
        icono: 'temperatura',
        etiqueta: 'Temp.',
        valor: cuna.temperatura,
        unidad: '°C',
      },
    ];

    return (
      <article
        key={cuna.cunaId}
        className={`mis-cunas__tarjeta${
          cuna.alertasActivas > 0 ? ' mis-cunas__tarjeta--alerta' : ''
        }`}
      >
        <header className="mis-cunas__cabecera">
          <div>
            <p className="mis-cunas__cuna">Cuna {cuna.cunaIdentificador}</p>
            <p className="mis-cunas__turno">
              <Icono nombre="reloj" tamano={12} />
              {cuna.turno} · {formatearHora(cuna.horaInicio)} –{' '}
              {formatearHora(cuna.horaFin)}
            </p>
          </div>
          {cuna.alertasActivas > 0 ? (
            <Badge tono="critico" punto>
              {cuna.alertasActivas}{' '}
              {cuna.alertasActivas === 1 ? 'alerta' : 'alertas'}
            </Badge>
          ) : (
            <Badge tono="exito" punto>
              Estable
            </Badge>
          )}
        </header>

        <div className="mis-cunas__paciente">
          {cuna.pacienteNombre ? (
            <>
              <p className="mis-cunas__paciente-nombre">
                {cuna.pacienteNombre}
              </p>
              <p className="mis-cunas__paciente-id texto-mono">
                {cuna.pacienteIdentificador ?? 'Sin identificador'}
              </p>
            </>
          ) : (
            <p className="mis-cunas__paciente-vacio">
              Cuna sin paciente asignado. Mantén la unidad preparada.
            </p>
          )}
        </div>

        <ul className="mis-cunas__vitales">
          {vitales.map((vital) => {
            const enRango = signoEnRango(vital.clave, vital.valor, rangos);
            return (
              <li
                key={vital.clave}
                className={`mis-cunas__vital${
                  enRango ? '' : ' mis-cunas__vital--fuera'
                }`}
              >
                <span className="mis-cunas__vital-icono" aria-hidden="true">
                  <Icono nombre={vital.icono} tamano={14} />
                </span>
                <span className="mis-cunas__vital-etiqueta">
                  {vital.etiqueta}
                </span>
                <strong className="mis-cunas__vital-valor">
                  {leerVital(vital.valor, vital.unidad)}
                </strong>
              </li>
            );
          })}
        </ul>

        <footer className="mis-cunas__pie">
          {cuna.pacienteId ? (
            <Link
              to={`/pacientes/${cuna.pacienteId}`}
              className="boton boton--fantasma boton--sm"
            >
              Ver ficha clínica
              <Icono nombre="flecha" tamano={13} />
            </Link>
          ) : (
            <span className="mis-cunas__pie-nota">
              Sin ficha clínica asociada
            </span>
          )}
        </footer>
      </article>
    );
  };

  return (
    <div className="pagina mis-cunas">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Mis cunas</h2>
          <p className="pagina__descripcion">
            Hola, {nombre}. Estas son las cunas y los pacientes que tienes a
            cargo en tu turno vigente, con telemetría en vivo.
          </p>
        </div>
        <div className="pagina__acciones">
          <Button
            variante="secundario"
            onClick={() => void cargar()}
            cargando={cargando}
          >
            Actualizar
          </Button>
        </div>
      </header>

      <section className="mis-cunas__resumen" aria-label="Resumen del turno">
        <div className="mis-cunas__resumen-item">
          <Icono nombre="misCunas" tamano={18} />
          <div>
            <strong>{respuesta?.total ?? 0}</strong>
            <span>Cunas asignadas</span>
          </div>
        </div>
        <div className="mis-cunas__resumen-item">
          <Icono nombre="pacientes" tamano={18} />
          <div>
            <strong>{conPaciente.length}</strong>
            <span>Pacientes a cargo</span>
          </div>
        </div>
        <div
          className={`mis-cunas__resumen-item${
            conAlertas.length > 0 ? ' mis-cunas__resumen-item--critico' : ''
          }`}
        >
          <Icono nombre="alertas" tamano={18} />
          <div>
            <strong>{conAlertas.length}</strong>
            <span>Cunas con alertas</span>
          </div>
        </div>
        <div className="mis-cunas__resumen-item">
          <Icono nombre="calendario" tamano={18} />
          <div>
            <strong className="mis-cunas__resumen-fecha">
              {formatearFecha(respuesta?.fecha ?? new Date())}
            </strong>
            <span>Día del turno</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Cargando tus cunas…" />
      ) : cunas.length === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes cunas asignadas"
          texto="La jefatura de turno publica las asignaciones del día. Si crees que es un error, comunícate con tu coordinador."
          icono={<Icono nombre="misCunas" tamano={28} />}
        />
      ) : (
        <section className="mis-cunas__rejilla" aria-label="Cunas asignadas">
          {cunas.map(renderCuna)}
        </section>
      )}
    </div>
  );
}
