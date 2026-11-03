/**
 * @file reporte.ts
 * @description Indicadores operativos de la unidad (`/reports/`).
 */

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

export interface PuntoSerie {
  fecha: string;
  ingresos: number;
  alertas: number;
}

export interface SerieActividad {
  dias: number;
  serie: PuntoSerie[];
}

export type EstadoCunaReporte =
  'ocupada' | 'disponible' | 'mantenimiento' | 'fuera_linea';

export interface DistribucionCunasItem {
  estado: EstadoCunaReporte;
  cantidad: number;
}

export interface DistribucionAlertasItem {
  tipo: string;
  etiqueta: string;
  cantidad: number;
}

export interface DistribucionMedicamentosItem {
  estado: string;
  cantidad: number;
}

export interface PersonalTurnoItem {
  turno: string;
  cantidad: number;
  horaInicio: string;
  horaFin: string;
}

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
