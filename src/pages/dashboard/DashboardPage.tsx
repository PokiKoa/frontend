/**
 * @file DashboardPage.tsx
 * @description Panel general: métricas operacionales, tendencia de ingresos y
 * alertas, distribución de cunas y accesos rápidos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Badge from '@/components/ui/Badge/Badge';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import StatCard from '@/components/ui/StatCard/StatCard';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_CUNA_REPORTE } from '@/api/mappers/reportes';
import { useTiempoReal } from '@/hooks/useTiempoReal';
import {
  alertasService,
  aplicarEventoAlertas,
} from '@/services/alertasService';
import { reportesService } from '@/services/reportesService';
import type { Alerta } from '@/types/alerta';
import type {
  DistribucionReporte,
  ResumenOperacion,
  SerieActividad,
} from '@/types/reporte';
import { porcentaje } from '@/utils/calculos';
import { formatearFechaHora, tiempoRelativo } from '@/utils/fechas';

import './DashboardPage.css';

/**
 * Panel general del sistema.
 *
 * @returns Tarjetas de indicadores, gráfico y alertas recientes.
 */
export default function DashboardPage() {
  const { usuario } = useAuth();

  const [resumen, setResumen] = useState<ResumenOperacion | null>(null);
  const [serie, setSerie] = useState<SerieActividad | null>(null);
  const [distribucion, setDistribucion] = useState<DistribucionReporte | null>(
    null
  );
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async (vigente: () => boolean) => {
    setError('');
    const [reporteRes, serieRes, alertasRes] = await Promise.allSettled([
      reportesService.reporte(),
      reportesService.serie(14),
      alertasService.abiertas(),
    ]);
    if (!vigente()) return;

    if (reporteRes.status === 'fulfilled') {
      setResumen(reporteRes.value.resumen);
      setDistribucion(reporteRes.value.distribucion);
    } else {
      setError(
        'No fue posible cargar las métricas. Verifica la conexión con el servidor.'
      );
    }
    if (serieRes.status === 'fulfilled') setSerie(serieRes.value);
    if (alertasRes.status === 'fulfilled') setAlertas(alertasRes.value);
    setCargando(false);
  }, []);

  useEffect(() => {
    let vigente = true;
    void cargar(() => vigente);
    // Los indicadores agregados se refrescan cada minuto; las alertas llegan por WebSocket
    const intervalo = window.setInterval(
      () => void cargar(() => vigente),
      60_000
    );
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [cargar]);

  useTiempoReal('/ws/v1/monitoring/stream/', (evento) =>
    setAlertas((actuales) => aplicarEventoAlertas(actuales, evento))
  );

  const datosSerie = useMemo(
    () =>
      (serie?.serie ?? []).map((punto) => ({
        ...punto,
        etiqueta: punto.fecha.slice(5).replace('-', '/'),
      })),
    [serie]
  );

  const ocupacion = resumen
    ? resumen.ocupacionPorcentaje
    : distribucion
      ? porcentaje(
          distribucion.cunas.find((item) => item.estado === 'ocupada')
            ?.cantidad ?? 0,
          distribucion.cunas.reduce((total, item) => total + item.cantidad, 0)
        )
      : 0;

  const alertasCriticas = alertas.filter(
    (alerta) => alerta.nivel === 'Critica'
  );

  const nombre = (usuario?.nombreCompleto ?? '').split(' ')[0] || 'equipo';

  if (cargando && !resumen) {
    return <Spinner bloque texto="Cargando panel operacional…" />;
  }

  return (
    <div className="pagina panel">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Hola, {nombre}</h2>
          <p className="pagina__descripcion">
            Estado consolidado de la unidad neonatal.
            {resumen?.generadoEn
              ? ` Actualizado ${tiempoRelativo(resumen.generadoEn)}.`
              : ''}
          </p>
        </div>
        <div className="pagina__acciones">
          <Link to="/mapa" className="boton boton--secundario boton--md">
            <Icono nombre="cunas" tamano={15} />
            Ver mapa de cunas
          </Link>
          <Link
            to="/pacientes/nuevo"
            className="boton boton--primario boton--md"
          >
            <Icono nombre="mas" tamano={15} />
            Nuevo paciente
          </Link>
        </div>
      </header>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <section className="rejilla rejilla--4" aria-label="Indicadores">
        <StatCard
          etiqueta="Pacientes activos"
          valor={resumen?.pacientesActivos ?? 0}
          detalle={`${resumen?.totalPacientes ?? 0} registrados en total`}
          icono={<Icono nombre="pacientes" />}
          tono="primario"
        />
        <StatCard
          etiqueta="Ocupación de cunas"
          valor={`${ocupacion}%`}
          detalle={`${resumen?.cunasOcupadas ?? 0} de ${resumen?.totalCunas ?? 0} cunas ocupadas`}
          icono={<Icono nombre="cunas" />}
          tono="info"
        />
        <StatCard
          etiqueta="Alertas activas"
          valor={alertas.length}
          detalle={`${alertasCriticas.length} críticas sin resolver`}
          icono={<Icono nombre="alertas" />}
          tono={alertasCriticas.length > 0 ? 'critico' : 'exito'}
        />
        <StatCard
          etiqueta="Medicamentos pendientes"
          valor={resumen?.medicamentosPendientes ?? 0}
          detalle={`${resumen?.medicamentosAdministrados ?? 0} administrados hoy`}
          icono={<Icono nombre="medicamentos" />}
          tono={(resumen?.medicamentosPendientes ?? 0) > 0 ? 'aviso' : 'exito'}
        />
      </section>

      <div className="panel__rejilla">
        <section className="tarjeta panel__grafico">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">
                Actividad de los últimos 14 días
              </h2>
              <p className="tarjeta__subtitulo">
                Ingresos de pacientes y alertas generadas por día.
              </p>
            </div>
            <div className="panel__leyenda">
              <span className="panel__leyenda-item panel__leyenda-item--ingresos">
                Ingresos
              </span>
              <span className="panel__leyenda-item panel__leyenda-item--alertas">
                Alertas
              </span>
            </div>
          </header>
          <div className="tarjeta__cuerpo panel__grafico-cuerpo">
            {datosSerie.length === 0 ? (
              <p className="estado-vacio__texto">
                Sin actividad registrada en el periodo.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={datosSerie}>
                  <defs>
                    <linearGradient
                      id="degradadoIngresos"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#1f5e72"
                        stopOpacity={0.28}
                      />
                      <stop offset="100%" stopColor="#1f5e72" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="degradadoAlertas"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#b03a2e" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#b03a2e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e4edf0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fontSize: 11, fill: '#78919a' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#78919a' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      borderColor: '#cfdde2',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="Ingresos"
                    stroke="#1f5e72"
                    strokeWidth={2}
                    fill="url(#degradadoIngresos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="alertas"
                    name="Alertas"
                    stroke="#b03a2e"
                    strokeWidth={2}
                    fill="url(#degradadoAlertas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="tarjeta panel__ocupacion">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Estado de cunas</h2>
              <p className="tarjeta__subtitulo">Distribución actual</p>
            </div>
          </header>
          <div className="tarjeta__cuerpo panel__ocupacion-cuerpo">
            <div
              className="panel__medidor"
              aria-label={`Ocupación ${ocupacion}%`}
            >
              <span className="panel__medidor-valor">{ocupacion}%</span>
              <span className="panel__medidor-texto">ocupación</span>
            </div>

            <ul className="panel__distribucion">
              {(distribucion?.cunas ?? []).map((item) => (
                <li key={item.estado}>
                  <span
                    className={`punto punto--${ESTADO_CUNA_REPORTE[item.estado].tono}`}
                    aria-hidden="true"
                  />
                  <span className="panel__distribucion-nombre">
                    {ESTADO_CUNA_REPORTE[item.estado].etiqueta}
                  </span>
                  <strong>{item.cantidad}</strong>
                </li>
              ))}
            </ul>

            <div className="panel__resumen-secundario">
              <div>
                <span>Planes activos</span>
                <strong>{resumen?.planesActivos ?? 0}</strong>
              </div>
              <div>
                <span>Personal activo</span>
                <strong>{resumen?.personalActivo ?? 0}</strong>
              </div>
              <div>
                <span>Asignaciones hoy</span>
                <strong>{resumen?.asignacionesHoy ?? 0}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="panel__rejilla panel__rejilla--inferior">
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Alertas sin resolver</h2>
              <p className="tarjeta__subtitulo">
                {alertasCriticas.length} críticas de {alertas.length} activas.
              </p>
            </div>
            <Link to="/alertas" className="boton boton--fantasma boton--sm">
              Ver todas
              <Icono nombre="flecha" tamano={14} />
            </Link>
          </header>
          <div className="tarjeta__cuerpo panel__alertas">
            {alertas.length === 0 ? (
              <p className="panel__vacio">
                Sin alertas activas. La unidad está estable.
              </p>
            ) : (
              <ul>
                {alertas.slice(0, 5).map((alerta) => (
                  <li key={alerta.id}>
                    <span
                      className={`punto ${
                        alerta.nivel === 'Critica'
                          ? 'punto--critico'
                          : 'punto--aviso'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="panel__alerta-mensaje">{alerta.mensaje}</p>
                      <p className="panel__alerta-meta">
                        {alerta.cunaIdentificador
                          ? `Cuna ${alerta.cunaIdentificador} · `
                          : ''}
                        {formatearFechaHora(alerta.fechaHora)}
                      </p>
                    </div>
                    <Badge
                      tono={alerta.nivel === 'Critica' ? 'critico' : 'aviso'}
                    >
                      {alerta.nivelDisplay}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Accesos rápidos</h2>
              <p className="tarjeta__subtitulo">Tareas frecuentes del turno</p>
            </div>
          </header>
          <div className="tarjeta__cuerpo panel__accesos">
            <Link to="/medicamentos" className="panel__acceso">
              <span className="panel__acceso-icono">
                <Icono nombre="medicamentos" />
              </span>
              <span>
                <strong>Prescripciones</strong>
                <small>Administrar dosis pendientes</small>
              </span>
              <Icono nombre="flecha" tamano={15} />
            </Link>
            <Link to="/planes" className="panel__acceso">
              <span className="panel__acceso-icono">
                <Icono nombre="planes" />
              </span>
              <span>
                <strong>Planes de cuidado</strong>
                <small>Revisar intervenciones activas</small>
              </span>
              <Icono nombre="flecha" tamano={15} />
            </Link>
            <Link to="/reportes" className="panel__acceso">
              <span className="panel__acceso-icono">
                <Icono nombre="reportes" />
              </span>
              <span>
                <strong>Reportes</strong>
                <small>Exportar el consolidado del día</small>
              </span>
              <Icono nombre="flecha" tamano={15} />
            </Link>
            <Link to="/mis-cunas" className="panel__acceso">
              <span className="panel__acceso-icono">
                <Icono nombre="misCunas" />
              </span>
              <span>
                <strong>Mis cunas</strong>
                <small>Pacientes asignados a tu turno</small>
              </span>
              <Icono nombre="flecha" tamano={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
