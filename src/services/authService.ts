/**
 * @file authService.ts
 * @description Ciclo de vida de la sesión contra `/api/v1/auth/`.
 */

import { api, guardarAccessToken, renovarAccessToken } from '@/api/axios';
import { mapUsuario } from '@/api/mappers/auth';
import type { Api } from '@/api/tipos';
import type { Credenciales, Usuario } from '@/types/auth';

/**
 * Inicia sesión. El refresh token queda en la cookie httpOnly que fija el backend.
 *
 * @returns Usuario autenticado.
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
 * Recupera la sesión al abrir o recargar la aplicación a partir de la cookie.
 *
 * @returns Usuario o `null` si no hay sesión vigente.
 */
export async function restaurarSesion(): Promise<Usuario | null> {
  try {
    await renovarAccessToken();
  } catch {
    return null;
  }
  return obtenerUsuarioActual();
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  const { data } = await api.get<Api['User']>('/auth/me/');
  return mapUsuario(data);
}

/** Revoca el refresh token y borra la cookie; es idempotente en el backend. */
export async function cerrarSesion(): Promise<void> {
  try {
    await api.post('/auth/logout/');
  } finally {
    guardarAccessToken(null);
  }
}

/** Cambia la contraseña propia; el backend cierra las demás sesiones y renueva los tokens. */
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
