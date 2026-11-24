/**
 * @file AuthContext.tsx
 * @description Estado global de la sesión. Al abrir la aplicación intenta
 * restaurarla desde la cookie httpOnly del refresh; el access token nunca se
 * guarda en el navegador.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { alExpirarSesion } from '@/api/axios';
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
  obtenerUsuarioActual,
  restaurarSesion,
} from '@/services/authService';
import type { Credenciales, Usuario } from '@/types/auth';

/** Estados posibles del ciclo de vida de la sesión en el cliente. */
export type EstadoSesion = 'cargando' | 'autenticado' | 'anonimo';

/** Contrato de estado y acciones expuestas por `AuthContext`. */
export interface AuthContextValue {
  /** Estado actual de verificación o autenticación de la sesión. */
  estado: EstadoSesion;
  /** Usuario autenticado activo, o `null` si la sesión es anónima o aún está cargando. */
  usuario: Usuario | null;
  /** Autentica al usuario con sus credenciales y actualiza el estado global. */
  iniciarSesion: (credenciales: Credenciales) => Promise<Usuario>;
  /** Cierra la sesión en el backend y limpia el estado local incluso si la petición falla. */
  cerrarSesion: () => Promise<void>;
  /** Vuelve a consultar los datos del usuario actual desde el servidor y sincroniza el contexto. */
  recargarUsuario: () => Promise<void>;
}

/** Contexto interno de autenticación. */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Proveedor global de autenticación que restaura la sesión al montar la aplicación
 * y escucha eventos de expiración de token emitidos por el cliente HTTP.
 *
 * @param props - Árbol de componentes hijos (`{ children }`).
 * @returns Proveedor de contexto `AuthContext.Provider` con el estado y métodos de sesión.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const establecer = useCallback((siguiente: Usuario | null) => {
    setUsuario(siguiente);
    setEstado(siguiente ? 'autenticado' : 'anonimo');
  }, []);

  useEffect(() => {
    let vigente = true;
    void restaurarSesion().then((restaurado) => {
      if (vigente) establecer(restaurado);
    });
    const cancelar = alExpirarSesion(() => establecer(null));
    return () => {
      vigente = false;
      cancelar();
    };
  }, [establecer]);

  const iniciarSesion = useCallback(
    async (credenciales: Credenciales) => {
      const autenticado = await iniciarSesionApi(credenciales);
      establecer(autenticado);
      return autenticado;
    },
    [establecer]
  );

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionApi();
    } catch {
      // Aunque el backend no responda, la sesión local se descarta igual
    } finally {
      establecer(null);
    }
  }, [establecer]);

  const recargarUsuario = useCallback(async () => {
    establecer(await obtenerUsuarioActual());
  }, [establecer]);

  const valor = useMemo<AuthContextValue>(
    () => ({ estado, usuario, iniciarSesion, cerrarSesion, recargarUsuario }),
    [estado, usuario, iniciarSesion, cerrarSesion, recargarUsuario]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

/**
 * Hook de acceso al contexto global de autenticación.
 *
 * @throws {Error} Si se invoca fuera de un árbol envuelto por `<AuthProvider>`.
 * @returns Objeto `AuthContextValue` con el estado de sesión, el usuario actual y las acciones de autenticación.
 */
// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return contexto;
}
