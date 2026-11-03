/**
 * @file paciente.ts
 * @description Pacientes neonatales, su evolución ponderal y lecturas de signos vitales.
 */

export type EstadoPaciente = 'activo' | 'egresado' | 'trasladado' | 'fallecido';

export type ResultadoEgreso =
  'sobrevivio' | 'trasladado' | 'fallecido' | 'desconocido';

export type CausaEgreso =
  | 'no_aplica'
  | 'prematuridad'
  | 'asfixia_perinatal'
  | 'sepsis'
  | 'malformacion_congenita'
  | 'hipotermia'
  | 'otra';

export interface Paciente {
  id: number;
  /** Número de ficha clínica (RN). */
  identificador: string;
  nombreCompleto: string;
  sexo: 'F' | 'M';
  fechaNacimiento: string;
  edadDias: number;
  /** Semanas de gestación al nacer (admite decimales). */
  edadGestacional: number;
  pesoNacimiento: number;
  /** Peso actual en gramos. */
  peso: number;
  fechaIngreso: string;
  diagnostico: string;
  medicoId: number | null;
  medicoNombre: string | null;
  cunaId: number | null;
  cunaIdentificador: string | null;
  estado: EstadoPaciente;
  activo: boolean;
  fechaAlta: string | null;
  resultadoAlta: ResultadoEgreso | null;
  causaAlta: CausaEgreso | null;
  notasAlta: string;
}

export interface PacientePayload {
  identificador: string;
  nombreCompleto: string;
  sexo: 'F' | 'M';
  fechaNacimiento: string;
  edadGestacional: number;
  pesoNacimiento: number;
  peso?: number | null;
  diagnostico?: string;
  medicoId?: number | null;
  cunaId?: number | null;
}

export interface EgresoPayload {
  resultado: ResultadoEgreso;
  causa?: CausaEgreso | null;
  notas?: string;
}

export interface RegistroPeso {
  id: number;
  pesoG: number;
  fecha: string;
  registradoPor: string | null;
}

export interface LecturaVital {
  id: number;
  cunaId: number;
  cunaIdentificador: string;
  pacienteId: number | null;
  ritmoCardiaco: number;
  spo2: number;
  temperatura: number;
  dormido: boolean;
  canulaConectada: boolean;
  viaIvActiva: boolean;
  fecha: string;
}

export interface FiltrosPacientes {
  search?: string;
  sexo?: 'F' | 'M';
  estado?: EstadoPaciente;
  medicoId?: number;
  cunaId?: number;
  ingresoDesde?: string;
  ingresoHasta?: string;
  pagina?: number;
}

export interface Medico {
  id: number;
  nombreCompleto: string;
  turno: string | null;
}
