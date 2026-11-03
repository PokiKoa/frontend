/**
 * @file medicamento.ts
 * @description Catálogo de farmacia con stock e indicaciones médicas por paciente.
 */

export type ViaAdministracion = 'IV' | 'IM' | 'ET' | 'PO' | 'SC';

export type EstadoPrescripcion = 'Vigente' | 'Completada' | 'Cancelada';

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

export interface MedicamentoPayload {
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

export interface Administracion {
  id: number;
  programadaPara: string;
  administradaEn: string;
  administradaPor: string;
  unidades: number;
  notas: string;
}
