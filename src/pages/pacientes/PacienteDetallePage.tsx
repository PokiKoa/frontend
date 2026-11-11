/**
 * @file PacienteDetallePage.tsx
 * @description Ficha clínica del paciente: datos generales, signos vitales en
 * vivo (canal WebSocket del paciente), curva de peso, diagnóstico y alertas.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { obtenerMensajeError } from '@/api/axios';
import { describirEsquema } from '@/api/mappers/medicamentos';
import {
  mapLectura,
  ETIQUETA_ESTADO_PACIENTE,
  ETIQUETA_RESULTADO,
} from '@/api/mappers/pacientes';
import type { Api } from '@/api/tipos';
import HistorialCunas from '@/components/pacientes/HistorialCunas';
import ModalEgreso from '@/components/pacientes/ModalEgreso';
import ModalEliminarPaciente from '@/components/pacientes/ModalEliminarPaciente';
import ObservacionesPaciente from '@/components/pacientes/ObservacionesPaciente';
import TarjetaFamilia from '@/components/pacientes/TarjetaFamilia';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRangosVitales } from '@/hooks/useRangosVitales';
import { useTiempoReal } from '@/hooks/useTiempoReal';
import { alertasService } from '@/services/alertasService';
import { medicamentosService } from '@/services/medicamentosService';
import { pacientesService } from '@/services/pacientesService';
import { planesService } from '@/services/planesService';
import type { Alerta } from '@/types/alerta';
import type { EstadoNavegacionQr } from '@/types/cuna';
import type { Medicamento } from '@/types/medicamento';
import type { LecturaVital, Paciente, RegistroPeso } from '@/types/paciente';
import type { PlanCuidado } from '@/types/plan';
import { formatearEdadDias } from '@/utils/calculos';
import {
  formatearEdadGestacional,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
} from '@/utils/fechas';
import { signoEnRango, type SignoVital } from '@/utils/rangos';
import {
  esAdministrador,
  esMedico,
  puedeGestionarClinica,
} from '@/utils/roles';
import {
  contarIndicacionesVigentes,
  contarPlanesActivos,
  esIndicacionVigente,
  esPlanActivo,
} from '@/utils/estados';

import './PacienteDetalle.css';

const LECTURAS_GRAFICO = 60;

export default function PacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const pacienteId = Number(id);
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const desdeQrCuna = (ubicacion.state as EstadoNavegacionQr | null)
    ?.desdeQrCuna;
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();
  const rangos = useRangosVitales();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lecturas, setLecturas] = useState<LecturaVital[]>([]);
  const [pesos, setPesos] = useState<RegistroPeso[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [planes, setPlanes] = useState<PlanCuidado[]>([]);
  const [indicaciones, setIndicaciones] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [egresoAbierto, setEgresoAbierto] = useState(false);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [guardandoPeso, setGuardandoPeso] = useState(false);

  const cargarAlertas = useCallback(async () => {
    try {
      const { alertas: lista } = await alertasService.listar({ pacienteId });
      setAlertas(lista);
    } catch {
      setAlertas([]);
    }
  }, [pacienteId]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    Promise.all([
      pacientesService.obtener(pacienteId),
      pacientesService.lecturas(pacienteId, { tamano: LECTURAS_GRAFICO }),
      pacientesService.pesos(pacienteId),
    ])
      .then(([datos, listaLecturas, listaPesos]) => {
        if (!vigente) return;
        setPaciente(datos);
        setLecturas(listaLecturas);
        setPesos(listaPesos);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(obtenerMensajeError(fallo));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    void cargarAlertas();
    medicamentosService
      .listarPrescripciones({ pacienteId })
      .then((lista) => {
        if (vigente) setIndicaciones(lista);
      })
      .catch(() => {
        if (vigente) setIndicaciones([]);
      });
    planesService
      .listar({ pacienteId })
      .then((lista) => {
        if (vigente) setPlanes(lista);
      })
      .catch(() => {
        if (vigente) setPlanes([]);
      });
    return () => {
      vigente = false;
    };
  }, [pacienteId, cargarAlertas]);

  // El canal del paciente solo existe mientras está en la unidad
  useTiempoReal(
    paciente?.activo ? `/ws/v1/patients/${pacienteId}/stream/` : null,
    (evento) => {
      if (evento.event === 'telemetry.reading' && evento.reading) {
        const lectura = mapLectura(evento.reading as Api['VitalSignReading']);
        setLecturas((actuales) =>
          [lectura, ...actuales].slice(0, LECTURAS_GRAFICO)
        );
        const cambianAlertas =
          ((evento.auto_resolved_alerts as unknown[] | undefined)?.length ??
            0) > 0 ||
          ((evento.active_alerts as unknown[] | undefined)?.length ?? 0) > 0;
        if (cambianAlertas) void cargarAlertas();
      } else if (evento.event.startsWith('alert.')) {
        void cargarAlertas();
      }
    }
  );

  const ultima = lecturas[0] ?? null;

  const serieVitales = useMemo(
    () =>
      lecturas
        .slice()
        .reverse()
        .map((lectura) => ({
          hora: formatearHora(lectura.fecha),
          fc: lectura.ritmoCardiaco,
          spo2: lectura.spo2,
        })),
    [lecturas]
  );

  const seriePesos = useMemo(
    () =>
      pesos
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((registro) => ({
          fecha: formatearFecha(registro.fecha),
          peso: registro.pesoG,
        })),
    [pesos]
  );

  const registrarPeso = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const gramos = Number(nuevoPeso);
    if (!Number.isInteger(gramos) || gramos < 200 || gramos > 10000) {
      notificarError('Ingresa un peso entre 200 y 10.000 g (gramos enteros).');
      return;
    }
    setGuardandoPeso(true);
    try {
      const registro = await pacientesService.registrarPeso(pacienteId, gramos);
      setPesos((actuales) => [registro, ...actuales]);
      setPaciente((actual) =>
        actual ? { ...actual, peso: registro.pesoG } : actual
      );
      setNuevoPeso('');
      exito('Peso registrado.');
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setGuardandoPeso(false);
    }
  };

  if (cargando) {
    return <Spinner bloque texto="Cargando ficha clínica…" />;
  }

  if (!paciente) {
    return (
      <div className="pagina">
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error || 'No se encontró el paciente solicitado.'}</span>
        </div>
        <Link to="/pacientes" className="boton boton--secundario boton--md">
          Volver al listado
        </Link>
      </div>
    );
  }

  const activo = paciente.activo;
  const gestiona = puedeGestionarClinica(usuario) && activo;

  const claseVital = (tipo: SignoVital, valor: number | null | undefined) =>
    signoEnRango(tipo, valor, rangos)
      ? 'ficha__vital'
      : 'ficha__vital ficha__vital--fuera';

  return (
    <div className="pagina ficha">
      <header className="pagina__cabecera">
        <div>
          <Link to="/pacientes" className="pagina__volver">
            <Icono nombre="volver" tamano={14} />
            Volver al listado
          </Link>
          <div className="ficha__identidad">
            <span className="ficha__avatar" aria-hidden="true">
              {paciente.nombreCompleto.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2 className="pagina__titulo">{paciente.nombreCompleto}</h2>
              <p className="ficha__meta">
                <span className="texto-mono">{paciente.identificador}</span>
                {' · '}
                {paciente.sexo === 'F' ? 'Femenino' : 'Masculino'}
                {' · '}
                {formatearEdadDias(paciente.edadDias)} de vida
                {' · '}
                {formatearEdadGestacional(paciente.edadGestacional)} de
                gestación
              </p>
            </div>
          </div>
        </div>

        <div className="pagina__acciones">
          <Badge tono={activo ? 'exito' : 'neutro'} punto>
            {ETIQUETA_ESTADO_PACIENTE[paciente.estado]}
          </Badge>
          {gestiona && (
            <Button
              variante="secundario"
              icono={<Icono nombre="editar" tamano={14} />}
              onClick={() => navegar(`/pacientes/${paciente.id}/editar`)}
            >
              Editar
            </Button>
          )}
          {activo && esMedico(usuario) && (
            <Button
              variante="peligro"
              icono={<Icono nombre="alta" tamano={14} />}
              onClick={() => setEgresoAbierto(true)}
            >
              Registrar egreso
            </Button>
          )}
          {esAdministrador(usuario) && (
            <Button
              variante="fantasma"
              icono={<Icono nombre="papelera" tamano={14} />}
              onClick={() => setEliminarAbierto(true)}
            >
              Eliminar definitivamente
            </Button>
          )}
        </div>
      </header>

      {desdeQrCuna && (
        <div className="mensaje mensaje--info" role="status">
          <Icono nombre="qr" tamano={16} />
          <span>
            Abierto desde el QR de la cuna <strong>{desdeQrCuna}</strong>.
          </span>
        </div>
      )}

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="ficha__rejilla">
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <h2 className="tarjeta__titulo">Datos generales</h2>
          </header>
          <div className="tarjeta__cuerpo ficha__datos">
            <div>
              <span>Cuna asignada</span>
              <strong>{paciente.cunaIdentificador ?? 'Sin asignar'}</strong>
            </div>
            <div>
              <span>Médico tratante</span>
              <strong>{paciente.medicoNombre ?? 'Sin asignar'}</strong>
            </div>
            <div>
              <span>Fecha de ingreso</span>
              <strong>{formatearFecha(paciente.fechaIngreso)}</strong>
            </div>
            <div>
              <span>Fecha de nacimiento</span>
              <strong>{formatearFecha(paciente.fechaNacimiento)}</strong>
            </div>
            <div>
              <span>Peso de nacimiento</span>
              <strong>{paciente.pesoNacimiento} g</strong>
            </div>
            <div>
              <span>Peso actual</span>
              <strong>{paciente.peso} g</strong>
            </div>
            {!activo && (
              <div>
                <span>Egreso</span>
                <strong>
                  {paciente.resultadoAlta
                    ? ETIQUETA_RESULTADO[paciente.resultadoAlta]
                    : '—'}{' '}
                  · {formatearFecha(paciente.fechaAlta)}
                </strong>
              </div>
            )}
          </div>
        </section>

        <section className="tarjeta ficha__vitales-tarjeta">
          <header className="tarjeta__cabecera">
            <h2 className="tarjeta__titulo">Signos vitales</h2>
            <span className="badge badge--info">
              {ultima
                ? `Lectura ${formatearHora(ultima.fecha)}`
                : 'Sin lecturas'}
            </span>
          </header>
          <div className="tarjeta__cuerpo ficha__vitales">
            <div className={claseVital('ritmoCardiaco', ultima?.ritmoCardiaco)}>
              <Icono nombre="corazon" tamano={18} />
              <strong>{ultima?.ritmoCardiaco ?? '—'}</strong>
              <span>lpm</span>
            </div>
            <div className={claseVital('spo2', ultima?.spo2)}>
              <Icono nombre="gota" tamano={18} />
              <strong>{ultima?.spo2 ?? '—'}</strong>
              <span>% SpO₂</span>
            </div>
            <div className={claseVital('temperatura', ultima?.temperatura)}>
              <Icono nombre="temperatura" tamano={18} />
              <strong>{ultima?.temperatura ?? '—'}</strong>
              <span>°C</span>
            </div>
          </div>
          {ultima && (
            <div className="ficha__soportes">
              <span
                className={
                  ultima.canulaConectada
                    ? 'badge badge--info'
                    : 'badge badge--critico'
                }
              >
                Cánula {ultima.canulaConectada ? 'conectada' : 'desconectada'}
              </span>
              <span
                className={
                  ultima.viaIvActiva
                    ? 'badge badge--info'
                    : 'badge badge--neutro'
                }
              >
                Vía IV {ultima.viaIvActiva ? 'activa' : 'inactiva'}
              </span>
              <span className="badge badge--neutro">
                {ultima.dormido ? 'Dormido' : 'Despierto'}
              </span>
            </div>
          )}
        </section>
      </div>

      <section className="tarjeta">
        <header className="tarjeta__cabecera">
          <div>
            <h2 className="tarjeta__titulo">Tendencia de signos vitales</h2>
            <p className="tarjeta__subtitulo">
              Últimas {serieVitales.length} lecturas
            </p>
          </div>
        </header>
        <div className="tarjeta__cuerpo">
          {serieVitales.length === 0 ? (
            <p className="texto-muted texto-pequeno">
              Aún no hay telemetría para este paciente.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={serieVitales}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4edf0"
                  vertical={false}
                />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 11, fill: '#78919a' }}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 11, fill: '#78919a' }} width={36} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="fc"
                  name="FC (lpm)"
                  stroke="#b03a2e"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="spo2"
                  name="SpO₂ (%)"
                  stroke="#1f5e72"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="ficha__rejilla ficha__rejilla--inferior">
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <h2 className="tarjeta__titulo">Diagnóstico</h2>
          </header>
          <div className="tarjeta__cuerpo ficha__textos">
            <p>{paciente.diagnostico || 'Sin diagnóstico registrado.'}</p>
            {paciente.notasAlta && (
              <div>
                <h3>Notas de egreso</h3>
                <p>{paciente.notasAlta}</p>
              </div>
            )}
          </div>
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Curva de peso</h2>
              <p className="tarjeta__subtitulo">{pesos.length} registros</p>
            </div>
          </header>
          <div className="tarjeta__cuerpo">
            {seriePesos.length > 1 && (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={seriePesos}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e4edf0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 11, fill: '#78919a' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78919a' }}
                    width={44}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    name="Peso (g)"
                    stroke="#1f5e72"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {gestiona && (
              <form
                className="ficha__peso"
                onSubmit={(evento) => void registrarPeso(evento)}
              >
                <input
                  className="campo__control"
                  type="number"
                  min={200}
                  max={10000}
                  step={1}
                  value={nuevoPeso}
                  onChange={(evento) => setNuevoPeso(evento.target.value)}
                  placeholder="Peso en gramos"
                  aria-label="Nuevo peso en gramos"
                />
                <Button type="submit" tamano="sm" cargando={guardandoPeso}>
                  Registrar peso
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>

      <div className="ficha__rejilla ficha__rejilla--inferior">
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Planes de cuidado</h2>
              <p className="tarjeta__subtitulo">
                {contarPlanesActivos(planes)} activos
              </p>
            </div>
            <Link to="/planes" className="boton boton--fantasma boton--sm">
              Gestionar planes
            </Link>
          </header>
          <div className="tarjeta__cuerpo ficha__planes">
            {planes.length === 0 ? (
              <p className="texto-muted texto-pequeno">
                Sin planes de cuidado.
              </p>
            ) : (
              planes.map((plan) => (
                <article key={plan.id} className="ficha__alerta">
                  <span
                    className={`punto ${esPlanActivo(plan) ? 'punto--exito' : ''}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="ficha__fuerte">
                      {plan.areaCuidado} · {plan.frecuencia}
                    </p>
                    <p className="ficha__secundario">{plan.intervencion}</p>
                  </div>
                  <Badge tono={esPlanActivo(plan) ? 'exito' : 'neutro'}>
                    {plan.estado}
                  </Badge>
                </article>
              ))
            )}
          </div>
        </section>

        <ObservacionesPaciente
          pacienteId={paciente.id}
          puedeEscribir={gestiona}
        />
      </div>

      <div className="ficha__rejilla ficha__rejilla--inferior">
        <TarjetaFamilia madre={paciente.madre} padre={paciente.padre} />
        <HistorialCunas
          pacienteId={paciente.id}
          version={`${paciente.cunaId ?? 'sin-cuna'}-${paciente.estado}`}
        />
      </div>

      <section className="tarjeta">
        <header className="tarjeta__cabecera">
          <div>
            <h2 className="tarjeta__titulo">Indicaciones médicas</h2>
            <p className="tarjeta__subtitulo">
              {contarIndicacionesVigentes(indicaciones)} vigentes
            </p>
          </div>
          <Link to="/medicamentos" className="boton boton--fantasma boton--sm">
            Ir a medicamentos
          </Link>
        </header>
        <div className="tarjeta__cuerpo ficha__planes">
          {indicaciones.length === 0 ? (
            <p className="texto-muted texto-pequeno">
              Sin indicaciones registradas.
            </p>
          ) : (
            indicaciones.map((item) => (
              <article key={item.id} className="ficha__alerta">
                <span
                  className={`punto ${item.atrasada ? 'punto--critico' : esIndicacionVigente(item) ? 'punto--aviso' : ''}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="ficha__fuerte">
                    {item.nombre} · {item.dosis} · {item.via}
                  </p>
                  <p className="ficha__secundario">
                    {describirEsquema(item)} · {item.dosisAdministradas} dosis
                    {item.proximaDosis
                      ? ` · próxima ${formatearFechaHora(item.proximaDosis)}`
                      : ''}
                  </p>
                </div>
                <Badge
                  tono={
                    item.atrasada
                      ? 'critico'
                      : esIndicacionVigente(item)
                        ? 'aviso'
                        : 'neutro'
                  }
                >
                  {item.atrasada ? 'Atrasada' : item.estado}
                </Badge>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="tarjeta">
        <header className="tarjeta__cabecera">
          <div>
            <h2 className="tarjeta__titulo">Historial de alertas</h2>
            <p className="tarjeta__subtitulo">
              {alertas.length} eventos recientes
            </p>
          </div>
          <Link to="/alertas" className="boton boton--fantasma boton--sm">
            Ver alertas
          </Link>
        </header>
        <div className="tarjeta__cuerpo ficha__alertas">
          {alertas.length === 0 ? (
            <p className="texto-muted texto-pequeno">
              El paciente no registra alertas.
            </p>
          ) : (
            alertas.slice(0, 6).map((alerta) => (
              <article key={alerta.id} className="ficha__alerta">
                <span
                  className={`punto ${alerta.nivel === 'Critica' ? 'punto--critico' : 'punto--aviso'}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="ficha__fuerte">{alerta.mensaje}</p>
                  <p className="ficha__secundario">
                    {alerta.tipoDisplay} ·{' '}
                    {formatearFechaHora(alerta.fechaHora)}
                    {alerta.estado === 'resuelta' ? ' · resuelta' : ''}
                  </p>
                </div>
                <Badge tono={alerta.nivel === 'Critica' ? 'critico' : 'aviso'}>
                  {alerta.nivelDisplay}
                </Badge>
              </article>
            ))
          )}
        </div>
      </section>

      <ModalEgreso
        paciente={egresoAbierto ? paciente : null}
        onCerrar={() => setEgresoAbierto(false)}
        onEgresado={(egresado) => {
          setEgresoAbierto(false);
          setPaciente(egresado);
        }}
      />

      <ModalEliminarPaciente
        paciente={eliminarAbierto ? paciente : null}
        onCerrar={() => setEliminarAbierto(false)}
        onEliminado={() => navegar('/pacientes', { replace: true })}
      />
    </div>
  );
}
