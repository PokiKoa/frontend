/**
 * @file medicamentos.ts
 * @description Traducción del catálogo de fármacos, prescripciones y registros de administración entre el backend v2 y la UI.
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
 * Convierte una fecha/hora local en formato `YYYY-MM-DDTHH:mm` (proveniente de inputs `datetime-local`)
 * a una cadena ISO 8601 en UTC exigida por el backend.
 *
 * @param valor - Cadena de fecha y hora en formato local del navegador.
 * @returns Fecha serializada en formato ISO 8601 con zona UTC.
 * @throws {RangeError} Si la cadena recibida no representa una fecha válida parseable por `Date`.
 */
export function localAIso(valor: string): string {
  return new Date(valor).toISOString();
}

/**
 * Transforma un ítem del catálogo de medicamentos de la API v2 al modelo `MedicamentoCatalogo` de la UI.
 *
 * @param datos - DTO de medicamento recibido desde el backend (`Api['MedicationCatalogItem']`).
 * @returns Entidad `MedicamentoCatalogo` con concentración numérica y bandera de stock bajo.
 */
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

/**
 * Transforma el payload de formulario de catálogo al contrato de creación esperado por la API v2.
 *
 * @param datos - Datos capturados en la interfaz (`CatalogoPayload`).
 * @returns Payload normalizado (`Api['MedicationCatalogCreate']`) con textos recortados y dosis a 2 decimales.
 */
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

/**
 * Transforma una prescripción médica de la API v2 al modelo `Medicamento` utilizado en la interfaz.
 *
 * @param datos - DTO de prescripción recibido desde el backend (`Api['Prescription']`).
 * @returns Entidad `Medicamento` con estado traducido, conteo de dosis y estado de atraso.
 */
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

/**
 * Transforma el payload de una nueva indicación médica al contrato de creación de la API v2,
 * omitiendo la fecha de término cuando se trata de una dosis única (`frecuenciaHoras` nulo o cero).
 *
 * @param datos - Datos de prescripción ingresados en la UI (`MedicamentoPayload`).
 * @returns Payload listo para enviar al endpoint de prescripciones (`Api['PrescriptionCreate']`).
 */
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

/**
 * Transforma un registro de administración de dosis de la API v2 al modelo `Administracion` de la UI.
 *
 * @param datos - DTO de administración recibido desde el backend (`Api['MedicationAdministration']`).
 * @returns Entidad `Administracion` con marcas temporales, responsable y unidades descontadas.
 */
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

/**
 * Genera una descripción legible de la periodicidad de una prescripción médica.
 *
 * @param prescripcion - Entidad `Medicamento` evaluada.
 * @returns `"Cada X h"` si posee frecuencia periódica, o `"Dosis única"` en caso contrario.
 */
export function describirEsquema(prescripcion: Medicamento): string {
  return prescripcion.frecuenciaHoras
    ? `Cada ${prescripcion.frecuenciaHoras} h`
    : 'Dosis única';
}
