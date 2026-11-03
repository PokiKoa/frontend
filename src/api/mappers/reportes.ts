/**
 * @file reportes.ts
 * @description Traducción de `/reports/summary/`, `/reports/series/` y `/shifts/`.
 */

import { ETIQUETA_TIPO, TIPO_DESDE_API } from '@/api/mappers/alertas';
import type { Api } from '@/api/tipos';
import type { ReporteOperacion, SerieActividad } from '@/types/reporte';

export const ETIQUETA_ESTADO_INDICACION: Record<
  Api['PrescriptionStatusEnum'],
  string
> = {
  active: 'Vigentes',
  completed: 'Completadas',
  cancelled: 'Canceladas',
};

export function mapReporte(
  datos: Api['OperationsSummary'],
  turnos: Api['Shift'][]
): ReporteOperacion {
  const cunas = datos.cribs.by_status;
  const indicaciones = datos.prescriptions.by_status;
  const totalIndicaciones = Object.values(indicaciones).reduce(
    (a, b) => a + b,
    0
  );

  return {
    resumen: {
      totalPacientes: datos.patients.total,
      pacientesActivos: datos.patients.active,
      pacientesDadosDeAlta: datos.patients.discharged,
      totalCunas: datos.cribs.total,
      cunasOcupadas: cunas.occupied,
      cunasDisponibles: cunas.available,
      cunasMantenimiento: cunas.maintenance,
      cunasFueraDeLinea: cunas.offline,
      ocupacionPorcentaje: datos.cribs.occupancy_percent,
      totalMedicamentos: totalIndicaciones,
      medicamentosPendientes: indicaciones.active ?? 0,
      medicamentosAdministrados: datos.prescriptions.administrations_today,
      medicamentosStockCritico: datos.medications_low_stock,
      alertasActivas: datos.alerts.open,
      alertasCriticas: datos.alerts.open_by_severity.critical ?? 0,
      planesActivos: datos.care_plans_active,
      personalActivo: datos.staff.active,
      turnosActivos: turnos.length,
      asignacionesHoy: datos.staff.assignments_current_shift_day,
      generadoEn: datos.generated_at,
    },
    distribucion: {
      cunas: [
        { estado: 'ocupada', cantidad: cunas.occupied },
        { estado: 'disponible', cantidad: cunas.available },
        { estado: 'mantenimiento', cantidad: cunas.maintenance },
        { estado: 'fuera_linea', cantidad: cunas.offline },
      ],
      alertas: Object.entries(datos.alerts.open_by_type)
        .map(([tipo, cantidad]) => {
          const clave = TIPO_DESDE_API[tipo as Api['AlertTypeEnum']] ?? 'otra';
          return { tipo: clave, etiqueta: ETIQUETA_TIPO[clave], cantidad };
        })
        .sort((a, b) => b.cantidad - a.cantidad),
      medicamentos: (
        Object.keys(
          ETIQUETA_ESTADO_INDICACION
        ) as Api['PrescriptionStatusEnum'][]
      ).map((estado) => ({
        estado: ETIQUETA_ESTADO_INDICACION[estado],
        cantidad: indicaciones[estado] ?? 0,
      })),
      personal: turnos.map((turno) => ({
        turno: turno.label,
        cantidad: datos.staff.by_shift[turno.value] ?? 0,
        horaInicio: turno.starts_at,
        horaFin: turno.ends_at,
      })),
    },
  };
}

export function mapSerie(puntos: Api['ActivityPoint'][]): SerieActividad {
  return {
    dias: puntos.length,
    serie: puntos.map((punto) => ({
      fecha: punto.date,
      ingresos: punto.admissions,
      alertas: punto.alerts,
    })),
  };
}
