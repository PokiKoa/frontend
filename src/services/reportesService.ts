/**
 * @file reportesService.ts
 * @description Indicadores operativos y exportación del consolidado en CSV.
 */

import { api } from '@/api/axios';
import { mapReporte, mapSerie } from '@/api/mappers/reportes';
import type { Api } from '@/api/tipos';
import type { ReporteOperacion, SerieActividad } from '@/types/reporte';

export async function obtenerReporte(): Promise<ReporteOperacion> {
  const [resumen, turnos] = await Promise.all([
    api.get<Api['OperationsSummary']>('/reports/summary/'),
    api.get<Api['Shift'][]>('/shifts/'),
  ]);
  return mapReporte(resumen.data, turnos.data);
}

export async function obtenerSerie(dias = 14): Promise<SerieActividad> {
  const { data } = await api.get<Api['ActivityPoint'][]>('/reports/series/', {
    params: { days: dias },
  });
  return mapSerie(data);
}

function celda(valor: string | number): string {
  const texto = String(valor);
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Arma el CSV del consolidado (separador `;`, el que espera Excel en es-CL).
 */
export function reporteACsv(
  reporte: ReporteOperacion,
  serie: SerieActividad | null
): string {
  const { resumen, distribucion } = reporte;
  const filas: Array<Array<string | number>> = [
    ['Sección', 'Indicador', 'Valor'],
    ['Pacientes', 'Total', resumen.totalPacientes],
    ['Pacientes', 'Activos', resumen.pacientesActivos],
    ['Pacientes', 'Egresados', resumen.pacientesDadosDeAlta],
    ['Cunas', 'Total', resumen.totalCunas],
    ['Cunas', 'Ocupación (%)', resumen.ocupacionPorcentaje],
    ...distribucion.cunas.map((c) => ['Cunas', c.estado, c.cantidad]),
    [
      'Medicación',
      'Dosis administradas hoy',
      resumen.medicamentosAdministrados,
    ],
    [
      'Medicación',
      'Fármacos con stock crítico',
      resumen.medicamentosStockCritico,
    ],
    ...distribucion.medicamentos.map((m) => [
      'Indicaciones',
      m.estado,
      m.cantidad,
    ]),
    ['Alertas', 'Abiertas', resumen.alertasActivas],
    ['Alertas', 'Críticas abiertas', resumen.alertasCriticas],
    ...distribucion.alertas.map((a) => [
      'Alertas por tipo',
      a.etiqueta,
      a.cantidad,
    ]),
    ['Planes', 'Activos', resumen.planesActivos],
    ['Personal', 'Activo', resumen.personalActivo],
    ...distribucion.personal.map((p) => [
      'Personal por turno',
      p.turno,
      p.cantidad,
    ]),
    ...(serie?.serie ?? []).flatMap((p) => [
      ['Ingresos por día', p.fecha, p.ingresos],
      ['Alertas por día', p.fecha, p.alertas],
    ]),
    ['Generado', 'Fecha', resumen.generadoEn],
  ];
  return filas.map((fila) => fila.map(celda).join(';')).join('\r\n');
}

/** Descarga el consolidado como archivo en el navegador. */
export function descargarCsv(contenido: string, nombre: string): void {
  // BOM para que Excel reconozca UTF-8 (tildes y ñ)
  const archivo = new Blob(['﻿', contenido], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export const reportesService = {
  reporte: obtenerReporte,
  serie: obtenerSerie,
};
