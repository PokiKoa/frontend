/**
 * @file TurnosPage.tsx
 * @description Vista de jefatura de turnos: catálogo vigente, turno actual,
 * asignación de personal a turnos y cunas por fecha, y baja de asignaciones.
 * La escritura está reservada a administradores; el resto de roles solo lee.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Modal from '@/components/ui/Modal/Modal';
import Spinner from '@/components/ui/Spinner/Spinner';
import Table, { type TableColumn } from '@/components/ui/Table/Table';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cunasService } from '@/services/cunasService';
import { turnosService } from '@/services/turnosService';
import type { Cuna } from '@/types/cuna';
import type { ClaveTurno } from '@/types/auth';
import type { Asignacion, MiembroPersonal, Turno } from '@/types/turnos';
import { fechaHoy, formatearFecha, formatearHora } from '@/utils/fechas';
import { etiquetaRol, puedeAdministrarTurnos } from '@/utils/roles';

import './TurnosPage.css';

/** Borrador del formulario de asignación. */
interface BorradorAsignacion {
  usuario: string;
  turno: string;
  cuna: string;
}

/** Borrador vacío del formulario. */
const BORRADOR_VACIO: BorradorAsignacion = {
  usuario: '',
  turno: '',
  cuna: '',
};

/**
 * Devuelve la fecha límite inferior aceptada por el backend (un año atrás).
 *
 * @returns Fecha ISO corta.
 */
function fechaMinima(): string {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 1);
  return limite.toISOString().slice(0, 10);
}

/**
 * Describe el horario de un turno.
 *
 * @param turno - Turno del catálogo.
 * @returns Rango legible `HH:mm – HH:mm`.
 */
function describirHorario(turno: Turno): string {
  return `${formatearHora(turno.horaInicio)} – ${formatearHora(turno.horaFin)}`;
}

/**
 * Página de turnos y asignaciones.
 *
 * @returns Catálogo, formulario de asignación y tabla del día seleccionado.
 */
export default function TurnosPage() {
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();
  const puedeEscribir = puedeAdministrarTurnos(usuario);

  const [fecha, setFecha] = useState(fechaHoy);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [personal, setPersonal] = useState<MiembroPersonal[]>([]);
  const [cunas, setCunas] = useState<Cuna[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const [cargando, setCargando] = useState(true);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(true);
  const [error, setError] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  const [borrador, setBorrador] = useState<BorradorAsignacion>(BORRADOR_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [asignacionAEliminar, setAsignacionAEliminar] =
    useState<Asignacion | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /**
   * Carga catálogos estables (turnos, personal y cunas) y el turno vigente.
   */
  const cargarCatalogos = useCallback(async () => {
    setCargando(true);
    setError('');

    const [turnosRes, personalRes, cunasRes] = await Promise.allSettled([
      turnosService.listarTurnos(),
      turnosService.personalAsignable(),
      cunasService.listar(),
    ]);

    if (turnosRes.status === 'fulfilled') {
      setTurnos(turnosRes.value);
      setTurnoActual(turnosRes.value.find((turno) => turno.actual) ?? null);
    }
    if (personalRes.status === 'fulfilled') setPersonal(personalRes.value);
    if (cunasRes.status === 'fulfilled') setCunas(cunasRes.value);

    const fallo = [turnosRes, personalRes, cunasRes].find(
      (resultado) => resultado.status === 'rejected'
    );
    if (fallo && fallo.status === 'rejected') {
      setError(obtenerMensajeError(fallo.reason));
    }

    setCargando(false);
  }, []);

  /**
   * Carga las asignaciones de la fecha seleccionada.
   *
   * @param dia - Fecha ISO corta.
   */
  const cargarAsignaciones = useCallback(
    async (dia: string) => {
      setCargandoAsignaciones(true);
      try {
        setAsignaciones(await turnosService.listarAsignaciones(dia));
      } catch (fallo) {
        notificarError(obtenerMensajeError(fallo));
      } finally {
        setCargandoAsignaciones(false);
      }
    },
    [notificarError]
  );

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos]);

  useEffect(() => {
    void cargarAsignaciones(fecha);
  }, [fecha, cargarAsignaciones]);

  const turnosActivos = useMemo(
    () => turnos.filter((turno) => turno.activo),
    [turnos]
  );

  /**
   * Personal asignable: neonatología y enfermería (el backend rechaza otros roles).
   */
  const personalOrdenado = useMemo(
    () =>
      personal
        .slice()
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es')),
    [personal]
  );

  /**
   * Valida el borrador antes de enviarlo.
   *
   * @returns Mensaje de error o cadena vacía si es válido.
   */
  const validarBorrador = (): string => {
    if (!borrador.usuario) return 'Selecciona al profesional a asignar.';
    if (!borrador.turno) return 'Selecciona el turno que cubrirá.';
    if (!borrador.cuna) return 'Selecciona la cuna a cargo.';
    if (!fecha) return 'Selecciona una fecha válida.';
    return '';
  };

  /**
   * Persiste la asignación y refresca el listado del día.
   */
  const asignar = async () => {
    const mensaje = validarBorrador();
    if (mensaje) {
      setErrorFormulario(mensaje);
      return;
    }

    setGuardando(true);
    setErrorFormulario('');

    try {
      await turnosService.crearAsignacion({
        usuario: Number(borrador.usuario),
        turno: borrador.turno as ClaveTurno,
        cuna: Number(borrador.cuna),
        fecha,
      });
      exito('Asignación registrada correctamente.');
      setBorrador((actual) => ({ ...BORRADOR_VACIO, turno: actual.turno }));
      await cargarAsignaciones(fecha);
    } catch (fallo) {
      setErrorFormulario(obtenerMensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Elimina la asignación confirmada.
   */
  const eliminar = async () => {
    if (!asignacionAEliminar) return;

    setEliminando(true);
    try {
      await turnosService.eliminarAsignacion(asignacionAEliminar.id);
      exito('Asignación eliminada.');
      setAsignacionAEliminar(null);
      await cargarAsignaciones(fecha);
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setEliminando(false);
    }
  };

  /**
   * Refresca catálogos, turno actual y asignaciones del día.
   */
  const actualizarTodo = async () => {
    await Promise.all([cargarCatalogos(), cargarAsignaciones(fecha)]);
  };

  const columnas: TableColumn<Asignacion>[] = [
    {
      key: 'profesional',
      label: 'Profesional',
      render: (fila) => (
        <div className="turnos__persona">
          <span className="turnos__avatar" aria-hidden="true">
            {fila.usuarioIniciales || 'PK'}
          </span>
          <div>
            <p className="turnos__fuerte">{fila.usuarioNombre}</p>
            <p className="turnos__secundario">{etiquetaRol(fila.usuarioRol)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'turno',
      label: 'Turno',
      render: (fila) => (
        <div>
          <p className="turnos__fuerte">{fila.turnoNombre}</p>
          <p className="turnos__secundario texto-mono">
            {formatearHora(fila.turnoHoraInicio)} –{' '}
            {formatearHora(fila.turnoHoraFin)}
          </p>
        </div>
      ),
    },
    {
      key: 'cuna',
      label: 'Cuna',
      render: (fila) =>
        fila.cunaIdentificador ? (
          <Badge tono="info">Cuna {fila.cunaIdentificador}</Badge>
        ) : (
          <span className="turnos__secundario">Sin cuna específica</span>
        ),
    },
    {
      key: 'registro',
      label: 'Registrado',
      render: (fila) => (
        <span className="turnos__secundario">
          {formatearFecha(fila.creadoEn)}
        </span>
      ),
    },
  ];

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (fila) => (
        <Button
          variante="fantasma"
          tamano="sm"
          onClick={() => setAsignacionAEliminar(fila)}
        >
          Eliminar
        </Button>
      ),
    });
  }

  return (
    <div className="pagina turnos">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Turnos y asignaciones</h2>
          <p className="pagina__descripcion">
            Cobertura de la unidad neonatal por turno y cuna. La jefatura
            administra las asignaciones; el resto del personal consulta.
          </p>
        </div>
        <div className="pagina__acciones">
          <Button
            variante="secundario"
            onClick={() => void actualizarTodo()}
            cargando={cargando}
          >
            Actualizar
          </Button>
        </div>
      </header>

      {!puedeEscribir && (
        <div className="mensaje mensaje--info" role="status">
          <Icono nombre="candado" tamano={16} />
          <span>
            Vista de solo lectura. Solo la jefatura puede crear o eliminar
            asignaciones de turno.
          </span>
        </div>
      )}

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <section
        className="turnos__cabecera-operativa"
        aria-label="Turno vigente"
      >
        <div className="turnos__actual">
          <span className="turnos__actual-icono" aria-hidden="true">
            <Icono nombre="reloj" tamano={20} />
          </span>
          <div>
            <p className="turnos__actual-etiqueta">Turno en curso</p>
            {turnoActual ? (
              <p className="turnos__actual-valor">
                {turnoActual.nombre}
                <span className="turnos__actual-horario">
                  {describirHorario(turnoActual)}
                </span>
              </p>
            ) : (
              <p className="turnos__actual-valor turnos__actual-valor--vacio">
                Fuera de turno configurado
              </p>
            )}
          </div>
        </div>

        <div className="turnos__meta">
          <span className="chip">
            <Icono nombre="turnos" tamano={13} />
            {turnosActivos.length} turnos activos
          </span>
          <span className="chip">
            <Icono nombre="calendario" tamano={13} />
            {asignaciones.length} asignaciones el {formatearFecha(fecha)}
          </span>
        </div>
      </section>

      <section className="seccion" aria-label="Catálogo de turnos">
        <h3 className="seccion__titulo">
          <Icono nombre="turnos" tamano={16} />
          Catálogo de turnos
        </h3>

        {cargando ? (
          <Spinner bloque texto="Cargando turnos…" />
        ) : (
          <div className="rejilla rejilla--3">
            {turnos.map((turno) => {
              const esActual = turnoActual?.id === turno.id;
              return (
                <article
                  key={turno.id}
                  className={`turnos__tarjeta${
                    esActual ? ' turnos__tarjeta--actual' : ''
                  }`}
                >
                  <header className="turnos__tarjeta-cabecera">
                    <div>
                      <p className="turnos__fuerte">{turno.nombre}</p>
                      <p className="turnos__secundario texto-mono">
                        {describirHorario(turno)}
                      </p>
                    </div>
                    <Badge tono={turno.activo ? 'exito' : 'neutro'} punto>
                      {turno.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </header>
                  <footer className="turnos__tarjeta-pie">
                    <span className="turnos__secundario">
                      {turno.duracionHoras} h de cobertura
                    </span>
                    {esActual && (
                      <span className="turnos__marca-actual">En curso</span>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="turnos__operacion">
        <section className="seccion" aria-label="Asignaciones del día">
          <div className="turnos__barra">
            <h3 className="seccion__titulo">
              <Icono nombre="misCunas" tamano={16} />
              Asignaciones del día
            </h3>
            <label className="turnos__fecha">
              <Icono nombre="calendario" tamano={15} />
              <span className="oculto-visual">Fecha de asignaciones</span>
              <input
                type="date"
                className="campo__control"
                value={fecha}
                min={fechaMinima()}
                onChange={(evento) => {
                  setFecha(evento.target.value);
                  setErrorFormulario('');
                }}
              />
            </label>
          </div>

          {cargandoAsignaciones ? (
            <Spinner bloque texto="Cargando asignaciones…" />
          ) : asignaciones.length === 0 ? (
            <EstadoVacio
              titulo="Sin asignaciones para esta fecha"
              texto={
                puedeEscribir
                  ? 'Registra la primera asignación con el formulario lateral.'
                  : 'La jefatura aún no ha publicado la cobertura de este día.'
              }
              icono={<Icono nombre="calendario" tamano={26} />}
            />
          ) : (
            <section className="tarjeta tarjeta--sin-relleno">
              <Table
                columns={columnas}
                data={asignaciones}
                rowKey={(fila) => fila.id}
                etiqueta="Asignaciones de turno del día"
              />
            </section>
          )}
        </section>

        {puedeEscribir && (
          <section
            className="tarjeta turnos__formulario"
            aria-label="Nueva asignación"
          >
            <header className="tarjeta__cabecera">
              <div>
                <h2 className="tarjeta__titulo">Nueva asignación</h2>
                <p className="tarjeta__subtitulo">
                  Profesional, turno y cuna para el {formatearFecha(fecha)}.
                </p>
              </div>
            </header>

            <div className="tarjeta__cuerpo">
              <form
                className="turnos__campos"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void asignar();
                }}
                noValidate
              >
                {errorFormulario && (
                  <div className="mensaje mensaje--error" role="alert">
                    <span aria-hidden="true">!</span>
                    <span>{errorFormulario}</span>
                  </div>
                )}

                <div className="campo">
                  <label className="campo__label" htmlFor="turno-profesional">
                    Profesional *
                  </label>
                  <select
                    id="turno-profesional"
                    className="campo__control"
                    value={borrador.usuario}
                    onChange={(evento) =>
                      setBorrador((actual) => ({
                        ...actual,
                        usuario: evento.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona una persona…</option>
                    {personalOrdenado.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.nombreCompleto} · {etiquetaRol(persona.rol)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__label" htmlFor="turno-turno">
                    Turno *
                  </label>
                  <select
                    id="turno-turno"
                    className="campo__control"
                    value={borrador.turno}
                    onChange={(evento) =>
                      setBorrador((actual) => ({
                        ...actual,
                        turno: evento.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona un turno…</option>
                    {turnosActivos.map((turno) => (
                      <option key={turno.id} value={turno.id}>
                        {turno.nombre} · {describirHorario(turno)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__label" htmlFor="turno-cuna">
                    Cuna *
                  </label>
                  <select
                    id="turno-cuna"
                    className="campo__control"
                    value={borrador.cuna}
                    onChange={(evento) =>
                      setBorrador((actual) => ({
                        ...actual,
                        cuna: evento.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona una cuna…</option>
                    {cunas.map((cuna) => (
                      <option key={cuna.id} value={cuna.id}>
                        {cuna.identificador}
                        {cuna.pacienteNombre ? ` · ${cuna.pacienteNombre}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="campo__ayuda">
                    Una persona puede tener varias cunas en el mismo turno.
                  </span>
                </div>

                <Button
                  type="submit"
                  icono={<Icono nombre="mas" tamano={15} />}
                  cargando={guardando}
                  anchoCompleto
                >
                  Registrar asignación
                </Button>
              </form>
            </div>
          </section>
        )}
      </div>

      <Modal
        abierto={Boolean(asignacionAEliminar)}
        titulo="Eliminar asignación"
        descripcion="La baja libera la cobertura de esa persona para el turno y la cuna seleccionados."
        ancho="sm"
        onCerrar={() => {
          if (!eliminando) setAsignacionAEliminar(null);
        }}
        pie={
          <>
            <Button
              variante="secundario"
              onClick={() => setAsignacionAEliminar(null)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variante="peligro"
              onClick={() => void eliminar()}
              cargando={eliminando}
            >
              Eliminar asignación
            </Button>
          </>
        }
      >
        <p className="turnos__confirmacion">
          Se eliminará la asignación de{' '}
          <strong>{asignacionAEliminar?.usuarioNombre}</strong> al turno{' '}
          <strong>{asignacionAEliminar?.turnoNombre}</strong> del{' '}
          {formatearFecha(fecha)}
          {asignacionAEliminar?.cunaIdentificador
            ? ` (cuna ${asignacionAEliminar.cunaIdentificador})`
            : ''}
          .
        </p>
      </Modal>
    </div>
  );
}
