/**
 * @file ReportesPage.tsx
 * @description Centro de reportes: consolidado operacional, serie histórica
 * de actividad, distribuciones clínicas y exportación del resumen en CSV.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { obtenerMensajeError } from '@/api/axios';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import StatCard from '@/components/ui/StatCard/StatCard';
import { useToast } from '@/context/ToastContext';
import { ESTADO_CUNA_REPORTE } from '@/api/mappers/reportes';
import { reporteACsv } from '@/api/mappers/reportes';
import { reportesService } from '@/services/reportesService';
import { downloadCsv } from '@/utils/csv';
import { fechaHoy } from '@/utils/fechas';
import type {
  DistribucionReporte,
  ResumenOperacion,
  SerieActividad,
} from '@/types/reporte';
import { porcentaje } from '@/utils/calculos';
import { formatearFechaHora, tiempoRelativo } from '@/utils/fechas';

import './ReportesPage.css';

/** Ventanas temporales disponibles para la serie. */
const PERIODOS = [7, 14, 30, 90] as const;

/** Etiqueta legible de cada estado de cuna. */

/**
 * Centro de reportes operacionales.
 *
 * @returns Indicadores, gráfico de tendencia y distribuciones.
 */
export default function ReportesPage() {
  const { exito, error: notificarError } = useToast();

  const [resumen, setResumen] = useState<ResumenOperacion | null>(null);
  const [serie, setSerie] = useState<SerieActividad | null>(null);
  const [distribucion, setDistribucion] = useState<DistribucionReporte | null>(
    null
  );
  const [dias, setDias] = useState<number>(14);
  const [cargando, setCargando] = useState(true);
  const [cargandoSerie, setCargandoSerie] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  /**
   * Carga el consolidado y las distribuciones en paralelo.
   */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    const [reporteRes, serieRes] = await Promise.allSettled([
      reportesService.reporte(),
      reportesService.serie(dias),
    ]);

    if (reporteRes.status === 'fulfilled') {
      setResumen(reporteRes.value.resumen);
      setDistribucion(reporteRes.value.distribucion);
    }
    if (serieRes.status === 'fulfilled') setSerie(serieRes.value);

    const fallidos = [reporteRes, serieRes].filter(
      (resultado) => resultado.status === 'rejected'
    );
    if (fallidos.length > 0) {
      setError(
        'Algunos datos no pudieron cargarse. Revisa la conexión con el servidor.'
      );
    }

    setCargando(false);
  }, [dias]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Cambia la ventana temporal y recarga solo la serie.
   *
   * @param nuevo - Cantidad de días.
   */
  const cambiarPeriodo = async (nuevo: number) => {
    if (nuevo === dias) return;
    setDias(nuevo);
    setCargandoSerie(true);

    try {
      setSerie(await reportesService.serie(nuevo));
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setCargandoSerie(false);
    }
  };

  /**
   * Descarga el consolidado en CSV.
   */
  const exportar = async () => {
    if (!resumen || !distribucion) return;
    setExportando(true);
    try {
      downloadCsv(
        reporteACsv({ resumen, distribucion }, serie),
        `poki-koa-reporte-${fechaHoy()}.csv`
      );
      exito('Reporte CSV descargado.');
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setExportando(false);
    }
  };

  const datosSerie = useMemo(
    () =>
      (serie?.serie ?? []).map((punto) => ({
        ...punto,
        etiqueta: punto.fecha.slice(5).replace('-', '/'),
      })),
    [serie]
  );

  const totalCunas = useMemo(
    () =>
      (distribucion?.cunas ?? []).reduce(
        (total, item) => total + item.cantidad,
        0
      ),
    [distribucion]
  );

  const totalAlertas = useMemo(
    () =>
      (distribucion?.alertas ?? []).reduce(
        (total, item) => total + item.cantidad,
        0
      ),
    [distribucion]
  );

  const totalPrescripciones = useMemo(
    () =>
      (distribucion?.medicamentos ?? []).reduce(
        (total, item) => total + item.cantidad,
        0
      ),
    [distribucion]
  );

  if (cargando && !resumen) {
    return <Spinner bloque texto="Cargando reportes…" />;
  }

  return (
    <div className="pagina reportes">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Reportes operacionales</h2>
          <p className="pagina__descripcion">
            Consolidado de la unidad neonatal
            {resumen?.generadoEn
              ? ` · actualizado ${tiempoRelativo(resumen.generadoEn)}`
              : ''}
            .
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
          <Button
            icono={<Icono nombre="descargar" tamano={15} />}
            onClick={() => void exportar()}
            cargando={exportando}
          >
            Exportar CSV
          </Button>
        </div>
      </header>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <section className="rejilla rejilla--4" aria-label="Indicadores clave">
        <StatCard
          etiqueta="Pacientes activos"
          valor={resumen?.pacientesActivos ?? 0}
          detalle={`${resumen?.totalPacientes ?? 0} registrados · ${resumen?.pacientesDadosDeAlta ?? 0} con alta`}
          icono={<Icono nombre="pacientes" />}
          tono="primario"
        />
        <StatCard
          etiqueta="Ocupación"
          valor={`${resumen?.ocupacionPorcentaje ?? 0}%`}
          detalle={`${resumen?.cunasOcupadas ?? 0} de ${resumen?.totalCunas ?? 0} cunas`}
          icono={<Icono nombre="cunas" />}
          tono="info"
        />
        <StatCard
          etiqueta="Alertas activas"
          valor={resumen?.alertasActivas ?? 0}
          detalle={`${resumen?.alertasCriticas ?? 0} críticas sin resolver`}
          icono={<Icono nombre="alertas" />}
          tono={(resumen?.alertasCriticas ?? 0) > 0 ? 'critico' : 'exito'}
        />
        <StatCard
          etiqueta="Indicaciones vigentes"
          valor={resumen?.medicamentosPendientes ?? 0}
          detalle={`${resumen?.totalMedicamentos ?? 0} indicaciones en total · ${resumen?.medicamentosStockCritico ?? 0} con stock crítico`}
          icono={<Icono nombre="medicamentos" />}
          tono={(resumen?.medicamentosPendientes ?? 0) > 0 ? 'aviso' : 'exito'}
        />
      </section>

      <section className="tarjeta reportes__tendencia">
        <header className="tarjeta__cabecera">
          <div>
            <h2 className="tarjeta__titulo">Actividad asistencial</h2>
            <p className="tarjeta__subtitulo">
              Ingresos de pacientes y alertas generadas por día.
            </p>
          </div>
          <div className="reportes__periodos" role="group" aria-label="Periodo">
            {PERIODOS.map((periodo) => (
              <button
                key={periodo}
                type="button"
                className={`chip ${dias === periodo ? 'chip--activo' : ''}`}
                onClick={() => void cambiarPeriodo(periodo)}
                disabled={cargandoSerie}
                aria-pressed={dias === periodo}
              >
                {periodo} días
              </button>
            ))}
          </div>
        </header>

        <div className="tarjeta__cuerpo reportes__grafico">
          {cargandoSerie ? (
            <Spinner bloque texto="Actualizando serie…" />
          ) : datosSerie.length === 0 ? (
            <p className="estado-vacio__texto">
              Sin actividad registrada en el periodo seleccionado.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={datosSerie}>
                <defs>
                  <linearGradient
                    id="reporteIngresos"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#1f5e72" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#1f5e72" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="reporteAlertas"
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
                  minTickGap={18}
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
                  labelFormatter={(etiqueta) => `Día ${etiqueta}`}
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke="#1f5e72"
                  strokeWidth={2}
                  fill="url(#reporteIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="alertas"
                  name="Alertas"
                  stroke="#b03a2e"
                  strokeWidth={2}
                  fill="url(#reporteAlertas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <footer className="reportes__leyenda">
          <span className="reportes__leyenda-item reportes__leyenda-item--ingresos">
            Ingresos
          </span>
          <span className="reportes__leyenda-item reportes__leyenda-item--alertas">
            Alertas
          </span>
          <span className="reportes__leyenda-nota">
            {serie ? `${serie.dias} días analizados` : 'Sin datos'}
          </span>
        </footer>
      </section>

      <div className="reportes__distribuciones">
        <Card
          titulo="Estado de cunas"
          subtitulo={`${totalCunas} cunas monitorizadas`}
        >
          <ul className="reportes__lista">
            {(distribucion?.cunas ?? []).map((item) => (
              <li key={item.estado} className="reportes__fila">
                <div className="reportes__fila-cabecera">
                  <span className="reportes__fila-nombre">
                    <span
                      className={`punto punto--${ESTADO_CUNA_REPORTE[item.estado].tono}`}
                      aria-hidden="true"
                    />
                    {ESTADO_CUNA_REPORTE[item.estado].etiqueta}
                  </span>
                  <strong>{item.cantidad}</strong>
                </div>
                <div className="barra-progreso">
                  <div
                    className="barra-progreso__relleno"
                    style={{
                      width: `${porcentaje(item.cantidad, totalCunas)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          titulo="Alertas por tipo"
          subtitulo={`${totalAlertas} alertas activas`}
        >
          {(distribucion?.alertas ?? []).length === 0 ? (
            <p className="estado-vacio__texto">
              Sin alertas activas: la unidad está estable.
            </p>
          ) : (
            <ul className="reportes__lista">
              {(distribucion?.alertas ?? []).map((item) => (
                <li key={item.tipo} className="reportes__fila">
                  <div className="reportes__fila-cabecera">
                    <span className="reportes__fila-nombre">
                      {item.etiqueta}
                    </span>
                    <strong>{item.cantidad}</strong>
                  </div>
                  <div className="barra-progreso">
                    <div
                      className="barra-progreso__relleno reportes__relleno--alerta"
                      style={{
                        width: `${porcentaje(item.cantidad, totalAlertas)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Indicaciones médicas"
          subtitulo={`${totalPrescripciones} indicaciones registradas`}
        >
          {(distribucion?.medicamentos ?? []).length === 0 ? (
            <p className="estado-vacio__texto">
              Aún no hay indicaciones registradas.
            </p>
          ) : (
            <ul className="reportes__lista">
              {(distribucion?.medicamentos ?? []).map((item) => (
                <li key={item.estado} className="reportes__fila">
                  <div className="reportes__fila-cabecera">
                    <span className="reportes__fila-nombre">{item.estado}</span>
                    <Badge
                      tono={
                        item.estado.toLowerCase().includes('vigente')
                          ? 'aviso'
                          : 'exito'
                      }
                    >
                      {item.cantidad}
                    </Badge>
                  </div>
                  <div className="barra-progreso">
                    <div
                      className="barra-progreso__relleno"
                      style={{
                        width: `${porcentaje(item.cantidad, totalPrescripciones)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card titulo="Personal por turno" subtitulo="Cobertura del día">
          {(distribucion?.personal ?? []).length === 0 ? (
            <p className="estado-vacio__texto">
              No hay personal asignado para hoy.
            </p>
          ) : (
            <ul className="reportes__personal">
              {(distribucion?.personal ?? []).map((item) => (
                <li key={item.turno}>
                  <span className="reportes__personal-turno">
                    <Icono nombre="turnos" tamano={14} />
                    <span>
                      <strong>{item.turno}</strong>
                      <small className="texto-mono">
                        {item.horaInicio} – {item.horaFin}
                      </small>
                    </span>
                  </span>
                  <Badge tono={item.cantidad > 0 ? 'info' : 'neutro'}>
                    {item.cantidad}{' '}
                    {item.cantidad === 1 ? 'persona' : 'personas'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <footer className="reportes__pie">
        <span>
          <Icono nombre="escudo" tamano={13} /> Datos agregados por el servidor
          de Poki Koa.
        </span>
        <span>Generado {formatearFechaHora(resumen?.generadoEn ?? null)}</span>
      </footer>
    </div>
  );
}
