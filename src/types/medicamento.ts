/**
 * @file medicamento.ts
 * @description Catálogo de farmacia con stock e indicaciones médicas por paciente.
 */

/** Vías de administración clínica habilitadas (intravenosa, intramuscular, endotraqueal, oral, subcutánea). */
export type ViaAdministracion = 'IV' | 'IM' | 'ET' | 'PO' | 'SC';

export type EstadoPrescripcion = 'Vigente' | 'Completada' | 'Cancelada';

/** Ítem disponible en el catálogo de farmacia con su control de inventario. */
export interface MedicamentoCatalogo {
  id: number;
  nombre: string;
  principioActivo: string;
  /** Concentración en mg por unidad de dispensación. */
  dosisMg: number;
  unidad: string;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  activo: boolean;
}

/** Datos requeridos para crear o actualizar un ítem del catálogo de farmacia. */
export interface CatalogoPayload {
  nombre: string;
  principioActivo: string;
  dosisMg: number;
  unidad: string;
  stock: number;
  stockMinimo: number;
  activo: boolean;
}

/** Indicación médica: dosis única o esquema cada N horas desde `inicio`. */
export interface Medicamento {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  cuna: string;
  medicamentoId: number;
  nombre: string;
  unidad: string;
  dosis: string;
  unidadesPorDosis: number;
  via: ViaAdministracion;
  inicio: string;
  /** Intervalo entre tomas en horas; `null` indica dosis única. */
  frecuenciaHoras: number | null;
  fin: string | null;
  estado: EstadoPrescripcion;
  proximaDosis: string | null;
  atrasada: boolean;
  dosisAdministradas: number;
  ultimaDosis: string | null;
  prescritoPor: string;
  motivoCancelacion: string;
}

/** Datos requeridos para registrar una nueva prescripción médica. */
export interface MedicamentoPayload {
  /** Identificador numérico del paciente receptor. */
  paciente: number;
  medicamentoId: number;
  dosis: string;
  unidadesPorDosis: number;
  via: ViaAdministracion;
  /** Fecha y hora local `YYYY-MM-DDTHH:mm` de la primera dosis. */
  inicio: string;
  frecuenciaHoras: number | null;
  fin: string | null;
}

/** Registro individual de una dosis administrada al paciente. */
export interface Administracion {
  id: number;
  programadaPara: string;
  administradaEn: string;
  administradaPor: string;
  unidades: number;
  notas: string;
}