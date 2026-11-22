/**
 * @file roles.ts
 * @description Permisos de la interfaz por rol. Reflejan la matriz RBAC del
 * backend (docs/SECURITY_AND_RBAC.md); el backend sigue siendo la autoridad y
 * rechaza cualquier acción no permitida aunque la interfaz la mostrara.
 */

import type { Rol, Usuario } from '@/types/auth';

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en roles: ${mensaje}`);
  }
}

const ETIQUETAS_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  medico: 'Neonatología',
  enfermeria: 'Matronería / Enfermería',
  farmacia: 'Farmacia',
};

/** Identificadores de vistas protegidas por la matriz de control de acceso (RBAC). */
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

/** Matriz de roles autorizados para acceder a cada pantalla de la aplicación. */
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

/**
 * Determina la ruta inicial tras autenticar según el rol del usuario:
 * `farmacia` no tiene acceso al panel clínico y aterriza en `/medicamentos`.
 *
 * Pre: `usuario` es un objeto `Usuario` válido, `null` o `undefined`.
 * Post: Retorna `'/medicamentos'` cuando `usuario?.rol === 'farmacia'`, y `'/'` en cualquier otro caso.
 * Invariante: Siempre retorna una ruta interna absoluta que comienza con `'/'`.
 */
export function rutaInicio(usuario: Usuario | null | undefined): string {
  const ruta = usuario?.rol === 'farmacia' ? '/medicamentos' : '/';

  asegurar(
    ruta.startsWith('/'),
    'la ruta de inicio debe ser una ruta interna absoluta.'
  );

  return ruta;
}

/**
 * Devuelve la etiqueta legible en español correspondiente a un rol del sistema.
 *
 * @param rol - Rol del usuario o valor nulo/indefinido.
 * @returns Nombre legible del rol o `'Sin rol'` si no está definido.
 */
export function etiquetaRol(rol: Rol | null | undefined): string {
  return rol ? ETIQUETAS_ROL[rol] : 'Sin rol';
}

/**
 * Evalúa si un usuario posee alguno de los roles permitidos aplicando política fail-closed.
 *
 * Pre: `usuario` es `Usuario | null | undefined` y `roles` es la lista de roles autorizados.
 * Post: Retorna `true` únicamente cuando `usuario` está definido y `roles.includes(usuario.rol)`;
 * retorna `false` ante ausencia de sesión o rol no autorizado.
 * Invariante: No muta `usuario` ni el arreglo `roles`.
 */
function tieneRol(usuario: Usuario | null | undefined, roles: Rol[]): boolean {
  const autorizado = Boolean(usuario && roles.includes(usuario.rol));

  asegurar(
    usuario !== null && usuario !== undefined ? true : !autorizado,
    'un usuario no autenticado jamás debe recibir autorización RBAC.'
  );

  return autorizado;
}

/**
 * Indica si el usuario tiene permiso para visualizar una pantalla según {@link ACCESO_PANTALLAS}.
 *
 * Pre: `pantalla` es una clave válida de `ACCESO_PANTALLAS`.
 * Post: Retorna `true` si y solo si `usuario` posee un rol incluido en `ACCESO_PANTALLAS[pantalla]`.
 * Invariante: Política fail-closed ante usuario nulo o pantalla sin permisos configurados.
 */
export const puedeVer = (
  usuario: Usuario | null | undefined,
  pantalla: Pantalla
): boolean => {
  const rolesPermitidos = ACCESO_PANTALLAS[pantalla];
  asegurar(
    Array.isArray(rolesPermitidos) && rolesPermitidos.length > 0,
    `la pantalla "${pantalla}" debe tener roles definidos en ACCESO_PANTALLAS.`
  );
  return tieneRol(usuario, rolesPermitidos);
};

/** Indica si el usuario tiene rol exclusivo de administrador del sistema. */
export const esAdministrador = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, ['administrador']);

/** Admisión, edición de datos de enfermería, peso, planes y observaciones. */
export const puedeGestionarClinica = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, ['medico', 'enfermeria']);

/** Registrar el ingreso de un paciente (`POST /patients/`). */
export const puedeAdmitirPaciente = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, ['medico', 'enfermeria']);

/** Diagnóstico, médico tratante, egreso, prescripción y cancelación de indicaciones. */
export const esMedico = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, ['medico']);

/** Registrar la administración de dosis prescritas en pacientes. */
export const puedeAdministrarDosis = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, ['medico', 'enfermeria']);

/** Crear, editar o ajustar stock del catálogo institucional de medicamentos. */
export const puedeGestionarCatalogo = (
  u: Usuario | null | undefined
): boolean => tieneRol(u, ['administrador', 'farmacia']);

/** Asignar, liberar o intercambiar pacientes entre cunas clínicas. */
export const puedeAsignarCunas = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, CLINICOS);

/** Crear, editar o cambiar estado técnico de las cunas de la unidad. */
export const puedeGestionarCunas = esAdministrador;

/** Reconocer y resolver alertas clínicas o técnicas activas. */
export const puedeAtenderAlertas = (u: Usuario | null | undefined): boolean =>
  tieneRol(u, CLINICOS);

/** Modificar los umbrales fisiológicos de advertencia y gravedad de signos vitales. */
export const puedeConfigurarUmbrales = (
  u: Usuario | null | undefined
): boolean => tieneRol(u, ['administrador', 'medico']);

/** Crear y eliminar asignaciones de turnos del personal clínico. */
export const puedeAdministrarTurnos = esAdministrador;

/** Consultar la bitácora completa de auditoría y seguridad. */
export const puedeVerAuditoria = esAdministrador;