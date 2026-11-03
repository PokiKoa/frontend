/**
 * @file MapaCunasPage.tsx
 * @description Mapa operativo de cunas. Permite asignar pacientes, liberar
 * cunas y alternar el estado de mantenimiento con confirmación explícita.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Modal from '@/components/ui/Modal/Modal';
import Spinner from '@/components/ui/Spinner/Spinner';
import { ETIQUETA_ESTADO_CUNA } from '@/api/mappers/cunas';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRangosVitales } from '@/hooks/useRangosVitales';
import { useTiempoReal } from '@/hooks/useTiempoReal';
import { aplicarEventoCunas, cunasService } from '@/services/cunasService';
import { pacientesService } from '@/services/pacientesService';
import type { Cuna, EstadoCuna } from '@/types/cuna';
import type { Paciente } from '@/types/paciente';
import { signoEnRango } from '@/utils/rangos';
import { puedeAsignarCunas, puedeGestionarCunas } from '@/utils/roles';
import { tiempoRelativo } from '@/utils/fechas';

import './MapaCunas.css';

/** Filtro de estado seleccionado. */
type FiltroEstado = 'todas' | EstadoCuna;

/** Acción pendiente sobre una cuna. */
type AccionCuna = 'asignar' | 'liberar' | 'mantenimiento';

/**
 * Mapa de cunas de la unidad.
 *
 * @returns Rejilla de cunas con acciones clínicas.
 */
const INSIGNIA_CUNA: Record<EstadoCuna, { clase: string; texto: string }> = {
  ocupada: { clase: 'badge--info', texto: 'En uso' },
  disponible: { clase: 'badge--exito', texto: 'Libre' },
  mantenimiento: { clase: 'badge--aviso', texto: 'Fuera de servicio' },
  fuera_linea: { clase: 'badge--aviso', texto: 'Sin señal' },
};

export default function MapaCunasPage() {
  const { exito, error: notificarError } = useToast();
  const { usuario } = useAuth();
  const rangos = useRangosVitales();
  const asigna = puedeAsignarCunas(usuario);
  const gestiona = puedeGestionarCunas(usuario);

  const [cunas, setCunas] = useState<Cuna[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');

  const [cunaActiva, setCunaActiva] = useState<Cuna | null>(null);
  const [accion, setAccion] = useState<AccionCuna | null>(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState('');
  const [procesando, setProcesando] = useState(false);

  /**
   * Carga cunas y pacientes activos en paralelo.
   */
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError('');

    try {
      const [listaCunas, listaPacientes] = await Promise.all([
        cunasService.listar(),
        pacientesService.sinCuna(),
      ]);
      setCunas(listaCunas);
      setPacientes(listaPacientes);
    } catch (fallo) {
      if (!silencioso) setError(obtenerMensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, []);

  // Las lecturas en vivo se aplican en memoria; los cambios de alertas o de estado recargan el resumen
  const cunasActuales = useRef(cunas);
  cunasActuales.current = cunas;
  useTiempoReal('/ws/v1/monitoring/stream/', (evento) => {
    const siguientes = aplicarEventoCunas(cunasActuales.current, evento);
    if (siguientes === null) void cargar(true);
    else if (siguientes !== cunasActuales.current) setCunas(siguientes);
  });

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resumen = useMemo(() => cunasService.resumir(cunas), [cunas]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return cunas.filter((cuna) => {
      const coincideEstado = filtro === 'todas' || cuna.estado === filtro;
      const coincideTexto =
        !texto ||
        cuna.identificador.toLowerCase().includes(texto) ||
        (cuna.pacienteNombre ?? '').toLowerCase().includes(texto) ||
        (cuna.pacienteIdentificador ?? '').toLowerCase().includes(texto);
      return coincideEstado && coincideTexto;
    });
  }, [cunas, filtro, busqueda]);

  /** Pacientes activos que aún no ocupan una cuna. */
  const disponibles = pacientes;

  /**
   * Abre el modal correspondiente a la acción.
   *
   * @param cuna - Cuna objetivo.
   * @param tipo - Acción a ejecutar.
   */
  const abrirAccion = (cuna: Cuna, tipo: AccionCuna) => {
    setCunaActiva(cuna);
    setAccion(tipo);
    setPacienteSeleccionado('');
  };

  /** Cierra el modal sin ejecutar cambios. */
  const cerrarModal = () => {
    if (procesando) return;
    setCunaActiva(null);
    setAccion(null);
    setPacienteSeleccionado('');
  };

  /**
   * Ejecuta la acción seleccionada y refresca el mapa.
   */
  const confirmar = async () => {
    if (!cunaActiva || !accion) return;

    if (accion === 'asignar' && !pacienteSeleccionado) {
      notificarError('Selecciona un paciente para asignar.');
      return;
    }

    setProcesando(true);

    try {
      if (accion === 'asignar') {
        await cunasService.asignarPaciente(
          cunaActiva.id,
          Number(pacienteSeleccionado)
        );
        exito(`Paciente asignado a la cuna ${cunaActiva.identificador}.`);
      } else if (accion === 'liberar') {
        await cunasService.liberar(cunaActiva.id);
        exito(`Cuna ${cunaActiva.identificador} liberada.`);
      } else {
        const nuevoEstado = !cunaActiva.enMantenimiento;
        await cunasService.cambiarMantenimiento(cunaActiva.id, nuevoEstado);
        exito(
          nuevoEstado
            ? `Cuna ${cunaActiva.identificador} en mantenimiento.`
            : `Cuna ${cunaActiva.identificador} habilitada.`
        );
      }

      cerrarModal();
      await cargar();
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setProcesando(false);
    }
  };

  const tituloModal =
    accion === 'asignar'
      ? `Asignar paciente · Cuna ${cunaActiva?.identificador ?? ''}`
      : accion === 'liberar'
        ? `Liberar cuna ${cunaActiva?.identificador ?? ''}`
        : cunaActiva?.enMantenimiento
          ? `Habilitar cuna ${cunaActiva?.identificador ?? ''}`
          : `Enviar a mantenimiento · Cuna ${cunaActiva?.identificador ?? ''}`;

  return (
    <div className="pagina mapa">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Mapa de cunas</h2>
          <p className="pagina__descripcion">
            Estado en vivo de las unidades de monitoreo y su paciente asignado.
          </p>
        </div>
        <div className="pagina__acciones">
          <Button
            variante="secundario"
            icono={<Icono nombre="filtro" tamano={14} />}
            onClick={() => void cargar()}
            cargando={cargando}
          >
            Actualizar
          </Button>
          <span className="mapa__sincronizacion">
            <span className="punto punto--exito pulse-dot" aria-hidden="true" />
            Sincronizado {tiempoRelativo(new Date())}
          </span>
        </div>
      </header>

      <section className="mapa__resumen" aria-label="Resumen de cunas">
        <button
          type="button"
          className={`mapa__resumen-item ${filtro === 'todas' ? 'mapa__resumen-item--activo' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          <span>Total</span>
          <strong>{cunas.length}</strong>
        </button>
        <button
          type="button"
          className={`mapa__resumen-item ${filtro === 'ocupada' ? 'mapa__resumen-item--activo' : ''}`}
          onClick={() => setFiltro('ocupada')}
        >
          <span className="punto punto--critico" aria-hidden="true" />
          <span>Ocupadas</span>
          <strong>{resumen.ocupada}</strong>
        </button>
        <button
          type="button"
          className={`mapa__resumen-item ${filtro === 'disponible' ? 'mapa__resumen-item--activo' : ''}`}
          onClick={() => setFiltro('disponible')}
        >
          <span className="punto punto--exito" aria-hidden="true" />
          <span>Disponibles</span>
          <strong>{resumen.disponible}</strong>
        </button>
        <button
          type="button"
          className={`mapa__resumen-item ${filtro === 'mantenimiento' ? 'mapa__resumen-item--activo' : ''}`}
          onClick={() => setFiltro('mantenimiento')}
        >
          <span className="punto punto--aviso" aria-hidden="true" />
          <span>Mantenimiento</span>
          <strong>{resumen.mantenimiento}</strong>
        </button>
        <button
          type="button"
          className={`mapa__resumen-item ${filtro === 'fuera_linea' ? 'mapa__resumen-item--activo' : ''}`}
          onClick={() => setFiltro('fuera_linea')}
        >
          <span className="punto" aria-hidden="true" />
          <span>Fuera de línea</span>
          <strong>{resumen.fuera_linea}</strong>
        </button>
      </section>

      <div className="mapa__herramientas">
        <div className="mapa__buscador">
          <Icono nombre="buscar" tamano={16} />
          <input
            type="search"
            placeholder="Buscar por cuna o paciente…"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            aria-label="Buscar cuna o paciente"
          />
        </div>
        <p className="mapa__contador">
          {visibles.length} cuna{visibles.length === 1 ? '' : 's'} visibles
        </p>
      </div>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Cargando cunas…" />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo="Sin cunas para este filtro"
          texto="Prueba con otro estado o limpia la búsqueda."
          icono={<Icono nombre="cunas" tamano={28} />}
          accion={
            <Button
              variante="secundario"
              onClick={() => {
                setFiltro('todas');
                setBusqueda('');
              }}
            >
              Ver todas las cunas
            </Button>
          }
        />
      ) : (
        <div className="mapa__rejilla">
          {visibles.map((cuna) => (
            <article
              key={cuna.id}
              className={`cuna cuna--${cuna.estado}${
                cuna.tieneAlertaCritica ? ' cuna--alerta' : ''
              }`}
            >
              <header className="cuna__cabecera">
                <div>
                  <p className="cuna__numero">Cuna {cuna.identificador}</p>
                  <p className="cuna__estado-texto">
                    {ETIQUETA_ESTADO_CUNA[cuna.estado]}
                  </p>
                </div>
                {cuna.tieneAlertaCritica ? (
                  <span className="badge badge--critico">
                    <span
                      className="punto punto--critico pulse-dot"
                      aria-hidden="true"
                    />
                    Crítica
                  </span>
                ) : (
                  <span className={`badge ${INSIGNIA_CUNA[cuna.estado].clase}`}>
                    {INSIGNIA_CUNA[cuna.estado].texto}
                  </span>
                )}
              </header>

              {cuna.pacienteNombre ? (
                <>
                  <div className="cuna__paciente">
                    <div className="cuna__avatar" aria-hidden="true">
                      {cuna.pacienteNombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="cuna__paciente-nombre">
                        {cuna.pacienteNombre}
                      </p>
                      <p className="cuna__paciente-id">
                        {cuna.pacienteIdentificador ?? 'Sin identificador'}
                      </p>
                    </div>
                  </div>

                  <div className="cuna__vitales">
                    <span
                      className={
                        signoEnRango(
                          'ritmoCardiaco',
                          cuna.ritmoCardiaco,
                          rangos
                        )
                          ? 'cuna__vital'
                          : 'cuna__vital cuna__vital--fuera'
                      }
                    >
                      <Icono nombre="corazon" tamano={13} />
                      {cuna.ritmoCardiaco ?? '—'} lpm
                    </span>
                    <span
                      className={
                        signoEnRango('spo2', cuna.spo2, rangos)
                          ? 'cuna__vital'
                          : 'cuna__vital cuna__vital--fuera'
                      }
                    >
                      <Icono nombre="gota" tamano={13} />
                      {cuna.spo2 ?? '—'}%
                    </span>
                    <span
                      className={
                        signoEnRango('temperatura', cuna.temperatura, rangos)
                          ? 'cuna__vital'
                          : 'cuna__vital cuna__vital--fuera'
                      }
                    >
                      <Icono nombre="temperatura" tamano={13} />
                      {cuna.temperatura ?? '—'} °C
                    </span>
                  </div>
                </>
              ) : (
                <div className="cuna__libre">
                  <Icono nombre="cama" tamano={22} />
                  <p>
                    {cuna.estado === 'mantenimiento'
                      ? 'Unidad en mantenimiento preventivo.'
                      : cuna.estado === 'fuera_linea'
                        ? 'Sin telemetría reciente: revisar el dispositivo.'
                        : 'Cuna disponible para un nuevo ingreso.'}
                  </p>
                </div>
              )}

              <footer className="cuna__pie">
                <span className="cuna__actualizacion">
                  {cuna.ultimaActualizacion
                    ? `Actualizado ${tiempoRelativo(cuna.ultimaActualizacion)}`
                    : 'Sin telemetría'}
                </span>
                <div className="cuna__acciones">
                  {asigna && cuna.pacienteId !== null ? (
                    <Button
                      variante="secundario"
                      tamano="sm"
                      onClick={() => abrirAccion(cuna, 'liberar')}
                    >
                      Liberar
                    </Button>
                  ) : asigna && cuna.estado === 'disponible' ? (
                    <Button
                      variante="primario"
                      tamano="sm"
                      onClick={() => abrirAccion(cuna, 'asignar')}
                    >
                      Asignar
                    </Button>
                  ) : null}
                  {gestiona && cuna.pacienteId === null && (
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => abrirAccion(cuna, 'mantenimiento')}
                    >
                      {cuna.enMantenimiento ? 'Habilitar' : 'Mantenimiento'}
                    </Button>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}

      <Modal
        abierto={Boolean(cunaActiva && accion)}
        titulo={tituloModal}
        descripcion={
          accion === 'asignar'
            ? 'Solo se listan pacientes activos sin cuna asignada.'
            : accion === 'liberar'
              ? 'El paciente quedará sin cuna y la unidad pasará a disponible.'
              : 'El cambio se registra en la bitácora de auditoría.'
        }
        onCerrar={cerrarModal}
        ancho="sm"
        pie={
          <>
            <Button
              variante="secundario"
              onClick={cerrarModal}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              variante={accion === 'liberar' ? 'peligro' : 'primario'}
              onClick={() => void confirmar()}
              cargando={procesando}
            >
              {accion === 'asignar'
                ? 'Asignar paciente'
                : accion === 'liberar'
                  ? 'Liberar cuna'
                  : cunaActiva?.enMantenimiento
                    ? 'Habilitar cuna'
                    : 'Enviar a mantenimiento'}
            </Button>
          </>
        }
      >
        {accion === 'asignar' ? (
          disponibles.length === 0 ? (
            <p className="mensaje mensaje--aviso">
              No hay pacientes activos sin cuna. Registra un ingreso o libera
              otra unidad primero.
            </p>
          ) : (
            <div className="campo">
              <label className="campo__label" htmlFor="paciente-cuna">
                Paciente
              </label>
              <select
                id="paciente-cuna"
                className="campo__control"
                value={pacienteSeleccionado}
                onChange={(evento) =>
                  setPacienteSeleccionado(evento.target.value)
                }
              >
                <option value="">Selecciona un paciente…</option>
                {disponibles.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nombreCompleto} · {paciente.identificador}
                  </option>
                ))}
              </select>
            </div>
          )
        ) : (
          <p className="mapa__confirmacion">
            {accion === 'liberar'
              ? `Se liberará la cuna ${cunaActiva?.identificador} y se desvinculará a ${cunaActiva?.pacienteNombre ?? 'el paciente'}.`
              : cunaActiva?.enMantenimiento
                ? `La cuna ${cunaActiva?.identificador} volverá a estar disponible para asignación.`
                : `La cuna ${cunaActiva?.identificador} dejará de aceptar pacientes hasta que se habilite nuevamente.`}
          </p>
        )}
      </Modal>
    </div>
  );
}
