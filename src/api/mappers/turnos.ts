/**
 * @file turnos.ts
 * @description Traducción de turnos, asignaciones, directorio de personal y "mis cunas".
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

function horas(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const minutos = (hf * 60 + mf - (hi * 60 + mi) + 24 * 60) % (24 * 60);
  return minutos / 60 || 24;
}

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

export function mapMiembro(datos: Api['StaffMember']): MiembroPersonal {
  return {
    id: datos.id,
    nombreCompleto: datos.full_name,
    iniciales: iniciales(datos.full_name),
    rol: ROL_DESDE_API[datos.role],
    turno: (datos.shift as ClaveTurno | null) ?? null,
  };
}

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
