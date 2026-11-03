/**
 * @file pacientes.ts
 * @description Traducción de pacientes, pesos y lecturas de signos vitales del backend v2.
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

function mapTutor(datos: Api['Patient'], clave: ClaveTutor): DatosTutor {
  return {
    rut: datos[`${clave}_rut`] ?? '',
    nombres: datos[`${clave}_first_names`] ?? '',
    apellidos: datos[`${clave}_last_names`] ?? '',
    telefono: datos[`${clave}_phone`] ?? '',
  };
}

/** Campos de madre y padre para crear o editar; vacío borra el dato en el backend. */
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
 * Cambios de edición. El RN y el peso al nacer no se editan en v2; el
 * diagnóstico y el médico tratante solo los envía quien puede cambiarlos.
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

export function mapEgreso(datos: EgresoPayload): Api['PatientDischarge'] {
  return {
    outcome: RESULTADO_HACIA_API[datos.resultado],
    cause: datos.causa ? CAUSA_HACIA_API[datos.causa] : null,
    notes: datos.notas?.trim() ?? '',
  };
}

export function mapPeso(datos: Api['WeightRecord']): RegistroPeso {
  return {
    id: datos.id,
    pesoG: datos.weight_g,
    fecha: datos.recorded_at,
    registradoPor: datos.recorded_by_name || null,
  };
}

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

export function mapMedico(datos: Api['StaffMember']): Medico {
  return {
    id: datos.id,
    nombreCompleto: datos.full_name,
    turno: datos.shift ? ETIQUETA_TURNO[datos.shift as ClaveTurno] : null,
  };
}
