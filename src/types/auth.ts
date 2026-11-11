/**
 * @file auth.ts
 * @description Modelos de sesión y usuario usados por la interfaz.
 */

/** Rol clínico en español; se traduce desde los roles del backend en `mappers/auth`. */
export type Rol = 'administrador' | 'medico' | 'enfermeria' | 'farmacia';

/** Clave de turno del backend (`morning`, `afternoon`, `night`). */
export type ClaveTurno = 'morning' | 'afternoon' | 'night';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  nombreCompleto: string;
  iniciales: string;
  rol: Rol;
  turno: ClaveTurno | null;
  activo: boolean;
  dobleFactorActivo: boolean;
  bloqueado: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
}

export interface Credenciales {
  username: string;
  password: string;
  /** Código TOTP de 6 dígitos, solo si la cuenta tiene 2FA activo. */
  codigoOtp?: string;
}
