/**
 * @file pacientes.ts
 * @description Traducción de pacientes, egresos, pesos y lecturas de signos vitales entre el backend v2 y la UI.
 */

import { decimal } from '@/api/mappers/alertas';
import { ETIQUETA_TURNO } from '@/api/mappers/auth';
import type { Api } from '@/api/tipos';
import type { ClaveTurno } from '@/types/auth';
import type {
  CausaEgreso,
  DatosTutor,
  EgresoPayload,
  EstadoPaciente,
  LecturaVital,
  Medico,
  MovimientoCuna,
  Paciente,
  PacientePayload,
  RegistroPeso,
  ResultadoEgreso,
  TipoMovimientoCuna,
} from '@/types/paciente';

/**
 * Invierte las claves y valores de un diccionario estricto `Record<A, B>` hacia `Record<B, A>`.
 *
 * @param mapa - Diccionario origen con claves y valores de tipo `string`.
 * @returns Diccionario invertido donde los valores originales pasan a ser claves.
 */
function invertir<A extends string, B extends string>(
  mapa: Record<A, B>
): Record<B, A> {
  return Object.fromEntries(
    Object.entries(mapa).map(([a, b]) => [b, a])
  ) as Record<B, A>;
}

export const ESTADO_PACIENTE_DESDE_API: Record<
  Api['PatientStatusEnum'],
  EstadoPaciente
> = {
  active: 'activo',
  discharged: 'egresado',
  transferred: 'trasladado',
  deceased: 'fallecido',
};
export const ESTADO_PACIENTE_HACIA_API = invertir(ESTADO_PACIENTE_DESDE_API);

export const ETIQUETA_ESTADO_PACIENTE: Record<EstadoPaciente, string> = {
  activo: 'En unidad',
  egresado: 'Egresado (alta)',
  trasladado: 'Trasladado',
  fallecido: 'Fallecido',
};

export const RESULTADO_DESDE_API: Record<
  Api['DischargeOutcomeEnum'],
  ResultadoEgreso
> = {
  survived: 'sobrevivio',
  transferred: 'trasladado',
  deceased: 'fallecido',
  unknown: 'desconocido',
};
export const RESULTADO_HACIA_API = invertir(RESULTADO_DESDE_API);

export const ETIQUETA_RESULTADO: Record<ResultadoEgreso, string> = {
  sobrevivio: 'Alta domiciliaria',
  trasladado: 'Traslado a otra unidad',
  fallecido: 'Fallecimiento',
  desconocido: 'Desconocido',
};

export const CAUSA_DESDE_API: Record<Api['DischargeCauseEnum'], CausaEgreso> = {
  none: 'no_aplica',
  prematurity: 'prematuridad',
  perinatal_asphyxia: 'asfixia_perinatal',
  sepsis: 'sepsis',
  congenital_malformation: 'malformacion_congenita',
  hypothermia: 'hipotermia',
  other: 'otra',
};
export const CAUSA_HACIA_API = invertir(CAUSA_DESDE_API);

export const ETIQUETA_CAUSA: Record<CausaEgreso, string> = {
  no_aplica: 'No aplica',
  prematuridad: 'Prematuridad',
  asfixia_perinatal: 'Asfixia perinatal',
  sepsis: 'Sepsis / infección',
  malformacion_congenita: 'Malformación congénita',
  hipotermia: 'Hipotermia',
  otra: 'Otra causa',
};

type ClaveTutor = 'mother' | 'father';
type CamposTutoresApi = Pick<
  Api['PatientUpdate'],
  `${ClaveTutor}_${'rut' | 'first_names' | 'last_names' | 'phone'}`
>;

/**
 * Extrae y normaliza los campos de identificación y contacto de la madre o del padre desde el DTO de paciente.
 *
 * @param datos - DTO de paciente recibido desde el backend (`Api['Patient']`).
 * @param clave - Prefijo del tutor a extraer (`'mother'` o `'father'`).
 * @returns Estructura `DatosTutor` con cadenas vacías por defecto si los campos vienen nulos.
 */
function mapTutor(datos: Api['Patient'], clave: ClaveTutor): DatosTutor {
  return {
    rut: datos[`${clave}_rut`] ?? '',
    nombres: datos[`${clave}_first_names`] ?? '',
    apellidos: datos[`${clave}_last_names`] ?? '',
    telefono: datos[`${clave}_phone`] ?? '',
  };
}

/**
 * Serializa los datos de madre y padre para crear o editar un paciente;
 * enviar cadenas vacías borra el dato correspondiente en el backend.
 *
 * @param datos - Payload de paciente capturado en la UI (`PacientePayload`).
 * @returns Objeto parcial con los campos de tutores recortados listos para el contrato de API.
 */
function tutoresHaciaApi(datos: PacientePayload): CamposTutoresApi {
  const campos: CamposTutoresApi = {};
  for (const [clave, tutor] of [
    ['mother', datos.madre],
    ['father', datos.padre],
  ] as const) {
    if (!tutor) continue;
    campos[`${clave}_rut`] = tutor.rut.trim();
    campos[`${clave}_first_names`] = tutor.nombres.trim();
    campos[`${clave}_last_names`] = tutor.apellidos.trim();
    campos[`${clave}_phone`] = tutor.telefono.trim();
  }
  return campos;
}

export const TIPO_MOVIMIENTO_DESDE_API: Record<
  Api['CribMovementKindEnum'],
  TipoMovimientoCuna
> = {
  assign: 'asignacion',
  move: 'traslado',
  swap: 'intercambio',
  release: 'liberacion',
  discharge: 'egreso',
};

/**
 * Transforma un registro de historial de movimiento de cuna de la API v2 al modelo `MovimientoCuna`.
 *
 * @param datos - DTO de movimiento de cuna proveniente del backend (`Api['CribMovement']`).
 * @returns Entidad `MovimientoCuna` con tipo traducido y códigos de cuna origen/destino.
 */
export function mapMovimientoCuna(datos: Api['CribMovement']): MovimientoCuna {
  return {
    id: datos.id,
    tipo: TIPO_MOVIMIENTO_DESDE_API[datos.kind],
    etiqueta: datos.kind_label,
    desde: datos.from_crib_code || null,
    hacia: datos.to_crib_code || null,
    registradoPor: datos.moved_by_name || null,
    fecha: datos.moved_at,
  };
}

/**
 * Transforma un DTO completo de paciente de la API v2 al modelo de dominio `Paciente` de la UI.
 *
 * @param datos - DTO de paciente recibido desde el backend (`Api['Patient']`).
 * @returns Entidad `Paciente` normalizada con tutores, estado clínico y datos de alta si aplica.
 */
export function mapPaciente(datos: Api['Patient']): Paciente {
  const estado = ESTADO_PACIENTE_DESDE_API[datos.status];
  return {
    id: datos.id,
    identificador: datos.medical_record_number,
    nombreCompleto: datos.full_name,
    sexo: datos.sex,
    fechaNacimiento: datos.birth_date,
    edadDias: datos.age_days,
    edadGestacional: Number(datos.gestational_age_weeks),
    pesoNacimiento: datos.birth_weight_g,
    peso: datos.current_weight_g,
    fechaIngreso: datos.admitted_at,
    diagnostico: datos.diagnosis,
    madre: mapTutor(datos, 'mother'),
    padre: mapTutor(datos, 'father'),
    medicoId: datos.attending_physician,
    medicoNombre: datos.attending_physician_name || null,
    cunaId: datos.crib,
    cunaIdentificador: datos.crib_code || null,
    estado,
    activo: estado === 'activo',
    fechaAlta: datos.discharged_at,
    resultadoAlta: datos.discharge_outcome
      ? RESULTADO_DESDE_API[datos.discharge_outcome]
      : null,
    causaAlta: datos.discharge_cause
      ? CAUSA_DESDE_API[datos.discharge_cause]
      : null,
    notasAlta: datos.discharge_notes,
  };
}

/**
 * Transforma los datos de ingreso de un nuevo paciente al contrato de creación esperado por la API v2.
 *
 * @param datos - Datos del formulario de ingreso (`PacientePayload`).
 * @returns Payload normalizado (`Api['PatientCreate']`) con textos recortados y edad gestacional a 1 decimal.
 */
export function mapPacienteCreacion(
  datos: PacientePayload
): Api['PatientCreate'] {
  return {
    medical_record_number: datos.identificador.trim(),
    full_name: datos.nombreCompleto.trim(),
    sex: datos.sexo,
    birth_date: datos.fechaNacimiento,
    gestational_age_weeks: datos.edadGestacional.toFixed(1),
    birth_weight_g: datos.pesoNacimiento,
    current_weight_g: datos.peso ?? null,
    diagnosis: datos.diagnostico?.trim() ?? '',
    attending_physician_id: datos.medicoId ?? null,
    crib_id: datos.cunaId ?? null,
    ...tutoresHaciaApi(datos),
  };
}

/**
 * Construye el payload de actualización parcial de un paciente para la API v2.
 * El identificador (RN) y el peso al nacer son inmutables en v2; el diagnóstico y el médico
 * tratante solo se incluyen cuando el rol del usuario tiene permisos clínicos para modificarlos.
 *
 * @param datos - Datos editados del paciente (`PacientePayload`).
 * @param opciones - Objeto desestructurado `{ incluirDatosMedicos }` que indica si se incluyen `diagnosis` y `attending_physician_id`.
 * @returns Payload de actualización listo para enviar al backend (`Api['PatientUpdate']`).
 */
export function mapPacienteEdicion(
  datos: PacientePayload,
  { incluirDatosMedicos }: { incluirDatosMedicos: boolean }
): Api['PatientUpdate'] {
  const cambios: Api['PatientUpdate'] = {
    full_name: datos.nombreCompleto.trim(),
    sex: datos.sexo,
    birth_date: datos.fechaNacimiento,
    gestational_age_weeks: datos.edadGestacional.toFixed(1),
    ...tutoresHaciaApi(datos),
  };
  if (incluirDatosMedicos) {
    cambios.diagnosis = datos.diagnostico?.trim() ?? '';
    cambios.attending_physician_id = datos.medicoId ?? null;
  }
  return cambios;
}

/**
 * Transforma los datos del formulario de egreso clínico al contrato esperado por la API v2.
 *
 * @param datos - Datos de alta, traslado o fallecimiento (`EgresoPayload`).
 * @returns Payload de egreso normalizado (`Api['PatientDischarge']`).
 */
export function mapEgreso(datos: EgresoPayload): Api['PatientDischarge'] {
  return {
    outcome: RESULTADO_HACIA_API[datos.resultado],
    cause: datos.causa ? CAUSA_HACIA_API[datos.causa] : null,
    notes: datos.notas?.trim() ?? '',
  };
}

/**
 * Transforma un registro histórico de peso de la API v2 al modelo `RegistroPeso` de la UI.
 *
 * @param datos - DTO de registro de peso proveniente del backend (`Api['WeightRecord']`).
 * @returns Entidad `RegistroPeso` con peso en gramos, fecha y responsable del registro.
 */
export function mapPeso(datos: Api['WeightRecord']): RegistroPeso {
  return {
    id: datos.id,
    pesoG: datos.weight_g,
    fecha: datos.recorded_at,
    registradoPor: datos.recorded_by_name || null,
  };
}

/**
 * Transforma una lectura de signos vitales de la API v2 al modelo `LecturaVital` de la UI.
 *
 * @param datos - DTO de lectura de telemetría recibido desde el backend (`Api['VitalSignReading']`).
 * @returns Entidad `LecturaVital` con temperatura parseada (0 por defecto) y estados de dispositivos.
 */
export function mapLectura(datos: Api['VitalSignReading']): LecturaVital {
  return {
    id: datos.id,
    cunaId: datos.crib,
    cunaIdentificador: datos.crib_code,
    pacienteId: datos.patient,
    ritmoCardiaco: datos.heart_rate,
    spo2: datos.spo2,
    temperatura: decimal(datos.temperature) ?? 0,
    dormido: datos.sleep_state === 'asleep',
    canulaConectada: datos.cannula_connected,
    viaIvActiva: datos.iv_line_active,
    fecha: datos.recorded_at,
  };
}

/**
 * Transforma un miembro del personal médico de la API v2 al modelo reducido `Medico` para selectores de UI.
 *
 * @param datos - DTO de miembro del personal recibido desde el backend (`Api['StaffMember']`).
 * @returns Entidad `Medico` con nombre completo y etiqueta legible de turno asignado.
 */
export function mapMedico(datos: Api['StaffMember']): Medico {
  return {
    id: datos.id,
    nombreCompleto: datos.full_name,
    turno: datos.shift ? ETIQUETA_TURNO[datos.shift as ClaveTurno] : null,
  };
}
