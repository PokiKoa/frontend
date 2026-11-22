/**
 * @file authService.ts
 * @description Ciclo de vida de la sesión y doble factor contra `/api/v1/auth/`.
 */

import { api, guardarAccessToken, renovarAccessToken } from '@/api/axios';
import { mapUsuario } from '@/api/mappers/auth';
import type { Api } from '@/api/tipos';
import type { Credenciales, Usuario } from '@/types/auth';

/**
 * Inicia sesión con las credenciales del usuario y almacena el access token en memoria.
 * El refresh token queda en la cookie httpOnly que fija el backend.
 *
 * @param credenciales - Usuario, contraseña y código OTP opcional.
 * @returns Usuario autenticado mapeado al dominio.
 */
export async function iniciarSesion(
  credenciales: Credenciales
): Promise<Usuario> {
  const { data } = await api.post<Api['LoginResponse']>('/auth/login/', {
    username: credenciales.username.trim(),
    password: credenciales.password,
    otp_code: credenciales.codigoOtp?.trim() || undefined,
  });
  guardarAccessToken(data.access);
  return mapUsuario(data.user);
}

/**
 * Intenta recuperar la sesión al abrir o recargar la aplicación renovando el token
 * mediante la cookie httpOnly vigente.
 *
 * @returns Usuario autenticado o `null` si no existe una sesión válida.
 */
export async function restaurarSesion(): Promise<Usuario | null> {
  try {
    await renovarAccessToken();
  } catch {
    return null;
  }
  return obtenerUsuarioActual();
}

/**
 * Obtiene el perfil del usuario actualmente autenticado.
 *
 * @returns Datos del usuario en sesión.
 */
export async function obtenerUsuarioActual(): Promise<Usuario> {
  const { data } = await api.get<Api['User']>('/auth/me/');
  return mapUsuario(data);
}

/**
 * Revoca el refresh token en el servidor y limpia el access token local,
 * incluso si la petición al backend falla. Es idempotente en el servidor.
 */
export async function cerrarSesion(): Promise<void> {
  try {
    await api.post('/auth/logout/');
  } finally {
    guardarAccessToken(null);
  }
}

/**
 * Actualiza la contraseña del usuario autenticado y reemplaza el access token local
 * con el nuevo token emitido por el servidor.
 *
 * @param actual - Contraseña vigente.
 * @param nueva - Nueva contraseña a establecer.
 */
export async function cambiarContrasena(
  actual: string,
  nueva: string
): Promise<void> {
  const { data } = await api.post<{ access: string }>(
    '/auth/change-password/',
    {
      current_password: actual,
      new_password: nueva,
    }
  );
  guardarAccessToken(data.access);
}

/** Datos generados al iniciar el aprovisionamiento de autenticación de dos factores (TOTP). */
export interface ConfiguracionDobleFactor {
  /** Clave secreta TOTP en base32. */
  secreto: string;
  /** URI `otpauth://` para generar el código QR en la aplicación autenticadora. */
  uriAprovisionamiento: string;
}

/**
 * Solicita al servidor un nuevo secreto TOTP para configurar 2FA.
 * El doble factor queda activo solo tras confirmar un código válido.
 *
 * @returns Secreto y URI de aprovisionamiento TOTP.
 */
export async function prepararDobleFactor(): Promise<ConfiguracionDobleFactor> {
  const { data } =
    await api.post<Api['TwoFactorSetupResponse']>('/auth/2fa/setup/');
  return { secreto: data.secret, uriAprovisionamiento: data.provisioning_uri };
}

/**
 * Confirma y activa la autenticación de dos factores con un código TOTP válido.
 *
 * @param codigo - Código temporal de verificación generado por la app autenticadora.
 */
export async function activarDobleFactor(codigo: string): Promise<void> {
  await api.post('/auth/2fa/enable/', { otp_code: codigo.trim() });
}

/**
 * Desactiva la autenticación de dos factores tras validar un código TOTP vigente.
 *
 * @param codigo - Código temporal de verificación generado por la app autenticadora.
 */
export async function desactivarDobleFactor(codigo: string): Promise<void> {
  await api.post('/auth/2fa/disable/', { otp_code: codigo.trim() });
}