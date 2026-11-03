/**
 * @file auth.ts
 * @description Traducción de usuarios y roles entre el backend v2 y la interfaz.
 */

import type { Api } from '@/api/tipos';
import type { ClaveTurno, Rol, Usuario } from '@/types/auth';

export const ROL_DESDE_API: Record<Api['RoleEnum'], Rol> = {
  admin: 'administrador',
  neonatologist: 'medico',
  nurse: 'enfermeria',
  pharmacist: 'farmacia',
};

export const ROL_HACIA_API: Record<Rol, Api['RoleEnum']> = {
  administrador: 'admin',
  medico: 'neonatologist',
  enfermeria: 'nurse',
  farmacia: 'pharmacist',
};

export const ETIQUETA_TURNO: Record<ClaveTurno, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
};

/** Iniciales de un nombre completo (máximo dos letras). */
export function iniciales(nombre: string): string {
  const partes = nombre
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((parte) => /^\p{L}/u.test(parte) && !parte.endsWith('.'));
  const letras = partes.length > 1 ? [partes[0], partes.at(-1)!] : partes;
  return letras.map((parte) => parte[0]!.toUpperCase()).join('') || 'PK';
}

export function mapUsuario(datos: Api['User']): Usuario {
  return {
    id: datos.id,
    username: datos.username,
    email: datos.email,
    nombreCompleto: datos.full_name,
    iniciales: iniciales(datos.full_name),
    rol: ROL_DESDE_API[datos.role],
    turno: (datos.shift as ClaveTurno | null) ?? null,
    activo: datos.is_active,
    dobleFactorActivo: datos.is_two_factor_enabled,
    bloqueado: datos.is_temporarily_locked,
    ultimoAcceso: datos.last_login,
    creadoEn: datos.created_at,
  };
}
