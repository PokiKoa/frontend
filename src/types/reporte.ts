/**
 * @file reporte.ts
 * @description Indicadores operativos de la unidad (`/reports/`).
 */

/** Métricas consolidadas del estado actual de pacientes, cunas, farmacia, alertas y turnos. */
export interface ResumenOperacion {
  totalPacientes: number;
  pacientesActivos: number;
  pacientesDadosDeAlta: number;
  totalCunas: number;
  cunasOcupadas: number;
  cunasDisponibles: number;
  cunasMantenimiento: number;
  cunasFueraDeLinea: number;
  ocupacionPorcentaje: number;
  totalMedicamentos: number;
  /** Indicaciones vigentes (aún con dosis por administrar). */
  medicamentosPendientes: number;
  /** Dosis registradas hoy. */
  medicamentosAdministrados: number;
  medicamentosStockCritico: number;
  alertasActivas: number;
  alertasCriticas: number;
  planesActivos: number;
  personalActivo: number;
  turnosActivos: number;
  asignacionesHoy: number;
  generadoEn: string;
}

/** Punto diario de ingresos y alertas dentro de una serie temporal. */
export interface PuntoSerie {
  fecha: string;
  ingresos: number;
  alertas: number;
}

/** Serie histórica de actividad operativa para una ventana de días. */
export interface SerieActividad {
  dias: number;
  serie: PuntoSerie[];
}

export type EstadoCunaReporte =
  'ocupada' | 'disponible' | 'mantenimiento' | 'fuera_linea';

/** Conteo de cunas agrupado por estado operativo para gráficos de distribución. */
export interface DistribucionCunasItem {
  estado: EstadoCunaReporte;
  cantidad: number;
}

/** Conteo de alertas agrupado por categoría clínica o técnica. */
export interface DistribucionAlertasItem {
  tipo: string;
  etiqueta: string;
  cantidad: number;
}

/** Conteo de prescripciones agrupado por estado. */
export interface DistribucionMedicamentosItem {
  estado: string;
  cantidad: number;
}

/** Dotación de personal asignado y horario de cada bloque de turno. */
export interface PersonalTurnoItem {
  turno: string;
  cantidad: number;
  horaInicio: string;
  horaFin: string;
}

/** Desgloses agrupados para visualizaciones del panel de reportes. */
export interface DistribucionReporte {
  cunas: DistribucionCunasItem[];
  alertas: DistribucionAlertasItem[];
  medicamentos: DistribucionMedicamentosItem[];
  personal: PersonalTurnoItem[];
}

/** Resumen y distribución salen de la misma respuesta del backend. */
export interface ReporteOperacion {
  resumen: ResumenOperacion;
  distribucion: DistribucionReporte;
}
