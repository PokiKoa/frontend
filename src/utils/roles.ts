/**
 * @file roles.ts
 * @description Permisos de la interfaz por rol. Reflejan la matriz RBAC del
 * backend (docs/SECURITY_AND_RBAC.md); el backend sigue siendo la autoridad y
 * rechaza cualquier acción no permitida aunque la interfaz la mostrara.
 */

import type { Rol, Usuario } from '@/types/auth';

const ETIQUETAS_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  medico: 'Neonatología',
  enfermeria: 'Matronería / Enfermería',
  farmacia: 'Farmacia',
};

export type Pantalla =
  | 'panel'
  | 'mapa'
  | 'misCunas'
  | 'pacientes'
  | 'medicamentos'
  | 'planes'
  | 'alertas'
  | 'turnos'
  | 'reportes'
  | 'registros'
  | 'configuracion';

const CLINICOS: Rol[] = ['administrador', 'medico', 'enfermeria'];

/** Roles que pueden abrir cada pantalla. */
export const ACCESO_PANTALLAS: Record<Pantalla, Rol[]> = {
  panel: CLINICOS,
  mapa: CLINICOS,
  misCunas: ['medico', 'enfermeria'],
  pacientes: CLINICOS,
  medicamentos: [...CLINICOS, 'farmacia'],
  planes: CLINICOS,
  alertas: CLINICOS,
  turnos: CLINICOS,
  reportes: [...CLINICOS, 'farmacia'],
  registros: ['administrador'],
  configuracion: [...CLINICOS, 'farmacia'],
};

/** Pantalla de inicio por rol: farmacia no tiene acceso al panel clínico. */
export function rutaInicio(usuario: Usuario | null | undefined): string {
  return usuario?.rol === 'farmacia' ? '/medicamentos' : '/';
}

export function etiquetaRol(rol: Rol | null | undefined): string {
  return rol ? ETIQUETAS_ROL[rol] : 'Sin rol';
}

function tieneRol(usuario: Usuario | null | undefined, roles: Rol[]): boolean {
  return Boolean(usuario && roles.includes(usuario.rol));
}

export const puedeVer = (
  usuario: Usuario | null | undefined,
  pantalla: Pantalla
) => tieneRol(usuario, ACCESO_PANTALLAS[pantalla]);

export const esAdministrador = (u: Usuario | null | undefined) =>
  tieneRol(u, ['administrador']);

/** Admisión, edición de datos de enfermería, peso, planes y observaciones. */
export const puedeGestionarClinica = (u: Usuario | null | undefined) =>
  tieneRol(u, ['medico', 'enfermeria']);

/** Registrar el ingreso de un paciente (`POST /patients/`). */
export const puedeAdmitirPaciente = (u: Usuario | null | undefined) =>
  tieneRol(u, ['medico', 'enfermeria']);

/** Diagnóstico, médico tratante, egreso, prescripción y cancelación de indicaciones. */
export const esMedico = (u: Usuario | null | undefined) =>
  tieneRol(u, ['medico']);

export const puedeAdministrarDosis = (u: Usuario | null | undefined) =>
  tieneRol(u, ['medico', 'enfermeria']);

export const puedeGestionarCatalogo = (u: Usuario | null | undefined) =>
  tieneRol(u, ['administrador', 'farmacia']);

export const puedeAsignarCunas = (u: Usuario | null | undefined) =>
  tieneRol(u, CLINICOS);

export const puedeGestionarCunas = esAdministrador;

export const puedeAtenderAlertas = (u: Usuario | null | undefined) =>
  tieneRol(u, CLINICOS);

export const puedeConfigurarUmbrales = (u: Usuario | null | undefined) =>
  tieneRol(u, ['administrador', 'medico']);

export const puedeAdministrarTurnos = esAdministrador;

export const puedeVerAuditoria = esAdministrador;
