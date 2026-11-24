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

/** Madre o padre del recién nacido; los campos vacíos significan "sin informar". */
export interface DatosTutor {
  /** RUT normalizado `12345678-5`. */
  rut: string;
  nombres: string;
  apellidos: string;
  /** Teléfono `+56XXXXXXXXX`. */
  telefono: string;
}

/** Ficha clínica del paciente neonatal normalizada para la interfaz. */
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
  /** Peso al nacer en gramos. */
  pesoNacimiento: number;
  /** Peso actual en gramos. */
  peso: number;
  fechaIngreso: string;
  diagnostico: string;
  madre: DatosTutor;
  padre: DatosTutor;
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

/** Datos requeridos para registrar o editar un paciente neonatal. */
export interface PacientePayload {
  identificador: string;
  nombreCompleto: string;
  sexo: 'F' | 'M';
  fechaNacimiento: string;
  edadGestacional: number;
  /** Peso al nacer en gramos. */
  pesoNacimiento: number;
  /** Peso actual en gramos (si se omite al crear, asume el peso de nacimiento). */
  peso?: number | null;
  diagnostico?: string;
  medicoId?: number | null;
  cunaId?: number | null;
  madre?: DatosTutor;
  padre?: DatosTutor;
}

export type TipoMovimientoCuna =
  'asignacion' | 'traslado' | 'intercambio' | 'liberacion' | 'egreso';

/** Cambio de ubicación del paciente dentro de la unidad. */
export interface MovimientoCuna {
  id: number;
  tipo: TipoMovimientoCuna;
  etiqueta: string;
  desde: string | null;
  hacia: string | null;
  registradoPor: string | null;
  fecha: string;
}

/** Datos requeridos para registrar el egreso o alta de un paciente. */
export interface EgresoPayload {
  resultado: ResultadoEgreso;
  causa?: CausaEgreso | null;
  notas?: string;
}

/** Medición puntual en el historial de evolución ponderal del paciente. */
export interface RegistroPeso {
  id: number;
  pesoG: number;
  fecha: string;
  registradoPor: string | null;
}

/** Lectura instantánea de signos vitales y estado de dispositivos de soporte. */
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

/** Criterios opcionales para filtrar el listado de pacientes. */
export interface FiltrosPacientes {
  search?: string;
  sexo?: 'F' | 'M';
  estado?: EstadoPaciente;
  /** `true`: en la unidad; `false`: egresados, trasladados o fallecidos. */
  activo?: boolean;
  medicoId?: number;
  cunaId?: number;
  ingresoDesde?: string;
  ingresoHasta?: string;
  pagina?: number;
}

/** Médico neonatólogo disponible para asignación clínica. */
export interface Medico {
  id: number;
  nombreCompleto: string;
  turno: string | null;
}
