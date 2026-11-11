/**
 * @file medicamentos.ts
 * @description Traducción del catálogo, las indicaciones y las dosis administradas.
 */

import type { Api } from '@/api/tipos';
import type {
  Administracion,
  CatalogoPayload,
  EstadoPrescripcion,
  Medicamento,
  MedicamentoCatalogo,
  MedicamentoPayload,
} from '@/types/medicamento';

export const ESTADO_PRESCRIPCION_DESDE_API: Record<
  Api['PrescriptionStatusEnum'],
  EstadoPrescripcion
> = {
  active: 'Vigente',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const ETIQUETA_VIA: Record<Api['RouteEnum'], string> = {
  IV: 'Intravenosa',
  IM: 'Intramuscular',
  ET: 'Endotraqueal',
  PO: 'Oral / sonda',
  SC: 'Subcutánea',
};

/**
 * Convierte `YYYY-MM-DDTHH:mm` (input datetime-local, hora del navegador) a
 * ISO con zona, que es lo que exige el backend.
 */
export function localAIso(valor: string): string {
  return new Date(valor).toISOString();
}

export function mapCatalogo(
  datos: Api['MedicationCatalogItem']
): MedicamentoCatalogo {
  return {
    id: datos.id,
    nombre: datos.name,
    principioActivo: datos.active_ingredient,
    dosisMg: Number(datos.concentration_mg),
    unidad: datos.unit,
    stock: datos.stock,
    stockMinimo: datos.min_stock_alert,
    stockBajo: datos.is_low_stock,
    activo: datos.is_active,
  };
}

export function mapCatalogoPayload(
  datos: CatalogoPayload
): Api['MedicationCatalogCreate'] {
  return {
    name: datos.nombre.trim(),
    active_ingredient: datos.principioActivo.trim(),
    concentration_mg: datos.dosisMg.toFixed(2),
    unit: datos.unidad.trim(),
    stock: datos.stock,
    min_stock_alert: datos.stockMinimo,
    is_active: datos.activo,
  };
}

export function mapPrescripcion(datos: Api['Prescription']): Medicamento {
  return {
    id: datos.id,
    pacienteId: datos.patient,
    pacienteNombre: datos.patient_name,
    cuna: 'Sin cuna',
    medicamentoId: datos.medication,
    nombre: datos.medication_name,
    unidad: datos.medication_unit,
    dosis: datos.dose,
    unidadesPorDosis: datos.units_per_administration,
    via: datos.route,
    inicio: datos.starts_at,
    frecuenciaHoras: datos.frequency_hours,
    fin: datos.ends_at,
    estado: ESTADO_PRESCRIPCION_DESDE_API[datos.status],
    proximaDosis: datos.next_dose_at,
    atrasada: datos.is_overdue,
    dosisAdministradas: datos.administrations_count,
    ultimaDosis: datos.last_administered_slot,
    prescritoPor: datos.prescribed_by_name,
    motivoCancelacion: datos.cancellation_reason,
  };
}

export function mapPrescripcionPayload(
  datos: MedicamentoPayload
): Api['PrescriptionCreate'] {
  return {
    patient_id: datos.paciente,
    medication_id: datos.medicamentoId,
    dose: datos.dosis.trim(),
    units_per_administration: datos.unidadesPorDosis,
    route: datos.via,
    starts_at: localAIso(datos.inicio),
    frequency_hours: datos.frecuenciaHoras,
    ends_at: datos.frecuenciaHoras && datos.fin ? localAIso(datos.fin) : null,
  };
}

export function mapAdministracion(
  datos: Api['MedicationAdministration']
): Administracion {
  return {
    id: datos.id,
    programadaPara: datos.scheduled_for,
    administradaEn: datos.administered_at,
    administradaPor: datos.administered_by_name,
    unidades: datos.units_deducted,
    notas: datos.notes,
  };
}

/** Texto del esquema de dosis: "Dosis única" o "Cada 8 h". */
export function describirEsquema(prescripcion: Medicamento): string {
  return prescripcion.frecuenciaHoras
    ? `Cada ${prescripcion.frecuenciaHoras} h`
    : 'Dosis única';
}
