/**
 * @file turnos.ts
 * @description Traducción de turnos, asignaciones, directorio de personal y "mis cunas" entre el backend v2 y la UI.
 */

import { iniciales, ROL_DESDE_API } from '@/api/mappers/auth';
import { mapCuna } from '@/api/mappers/cunas';
import type { Api } from '@/api/tipos';
import type { ClaveTurno } from '@/types/auth';
import type {
  Asignacion,
  AsignacionPayload,
  MiembroPersonal,
  RespuestaMisCunas,
  Turno,
} from '@/types/turnos';

/**
 * Calcula la duración en horas entre dos horas en formato `HH:mm`, soportando turnos nocturnos
 * que cruzan la medianoche (ej. `20:00` a `08:00` = `12` horas; horas iguales = `24`).
 *
 * @param inicio - Hora de inicio del turno (`HH:mm`).
 * @param fin - Hora de término del turno (`HH:mm`).
 * @returns Duración total del turno expresada en horas.
 */
function horas(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const minutos = (hf * 60 + mf - (hi * 60 + mi) + 24 * 60) % (24 * 60);
  return minutos / 60 || 24;
}

/**
 * Transforma un DTO de turno de la API v2 al modelo `Turno` utilizado en la UI.
 *
 * @param datos - DTO de turno recibido desde el backend (`Api['Shift']`).
 * @returns Entidad `Turno` con identificador, horarios, duración calculada en horas y estado actual.
 */
export function mapTurno(datos: Api['Shift']): Turno {
  return {
    id: datos.value as ClaveTurno,
    nombre: datos.label,
    horaInicio: datos.starts_at,
    horaFin: datos.ends_at,
    activo: true,
    duracionHoras: horas(datos.starts_at, datos.ends_at),
    actual: datos.is_current,
  };
}

/**
 * Transforma una asignación de turno de la API v2 al modelo `Asignacion`,
 * enriqueciéndola con el nombre y horarios del turno correspondiente.
 *
 * @param datos - DTO de asignación recibido desde el backend (`Api['ShiftAssignment']`).
 * @param turnos - Catálogo de turnos (`Turno[]`) para resolver etiqueta y franja horaria.
 * @returns Entidad `Asignacion` normalizada con iniciales del profesional y datos de cuna.
 */
export function mapAsignacion(
  datos: Api['ShiftAssignment'],
  turnos: Turno[]
): Asignacion {
  const turno = turnos.find((t) => t.id === datos.shift);
  return {
    id: datos.id,
    usuarioId: datos.user,
    usuarioNombre: datos.user_name,
    usuarioIniciales: iniciales(datos.user_name),
    usuarioRol: ROL_DESDE_API[datos.user_role as Api['RoleEnum']] ?? null,
    turnoId: datos.shift as ClaveTurno,
    turnoNombre: turno?.nombre ?? datos.shift,
    turnoHoraInicio: turno?.horaInicio ?? '',
    turnoHoraFin: turno?.horaFin ?? '',
    cunaId: datos.crib,
    cunaIdentificador: datos.crib_code,
    fecha: datos.date,
    creadoPor: datos.created_by,
    creadoEn: datos.created_at,
  };
}

/**
 * Transforma los datos de formulario de una asignación al contrato esperado por la API v2.
 *
 * @param datos - Datos de asignación capturados en la interfaz (`AsignacionPayload`).
 * @returns Payload normalizado (`Api['ShiftAssignmentCreate']`) listo para enviar al backend.
 */
export function mapAsignacionPayload(
  datos: AsignacionPayload
): Api['ShiftAssignmentCreate'] {
  return {
    user_id: datos.usuario,
    crib_id: datos.cuna,
    date: datos.fecha,
    shift: datos.turno,
  };
}

/**
 * Transforma un miembro del personal de la API v2 al modelo `MiembroPersonal` para selectores de turnos.
 *
 * @param datos - DTO de miembro del personal recibido desde el backend (`Api['StaffMember']`).
 * @returns Entidad `MiembroPersonal` con iniciales calculadas, rol traducido y turno asignado.
 */
export function mapMiembro(datos: Api['StaffMember']): MiembroPersonal {
  return {
    id: datos.id,
    nombreCompleto: datos.full_name,
    iniciales: iniciales(datos.full_name),
    rol: ROL_DESDE_API[datos.role],
    turno: (datos.shift as ClaveTurno | null) ?? null,
  };
}

/**
 * Transforma la respuesta del turno activo del usuario (`MyShift`) al modelo `RespuestaMisCunas`,
 * mapeando cada cuna asignada junto con los signos vitales actuales y el horario del turno.
 *
 * @param datos - DTO del turno actual del profesional recibido desde el backend (`Api['MyShift']`).
 * @param turnos - Catálogo de turnos (`Turno[]`) para resolver el nombre y horario del turno activo.
 * @returns Objeto `RespuestaMisCunas` con la fecha, total de cunas y detalle clínico resumido de cada una.
 */
export function mapMisCunas(
  datos: Api['MyShift'],
  turnos: Turno[]
): RespuestaMisCunas {
  const turno = turnos.find((t) => t.id === datos.shift);
  return {
    fecha: datos.date,
    total: datos.cribs.length,
    cunas: datos.cribs.map((cruda) => {
      const cuna = mapCuna(cruda);
      return {
        cunaId: cuna.id,
        cunaIdentificador: cuna.identificador,
        turno: turno?.nombre ?? datos.shift,
        horaInicio: turno?.horaInicio ?? '',
        horaFin: turno?.horaFin ?? '',
        pacienteId: cuna.pacienteId,
        pacienteNombre: cuna.pacienteNombre,
        pacienteIdentificador: cuna.pacienteIdentificador,
        ritmoCardiaco: cuna.ritmoCardiaco,
        spo2: cuna.spo2,
        temperatura: cuna.temperatura,
        alertasActivas: cuna.alertasAbiertas,
      };
    }),
  };
}