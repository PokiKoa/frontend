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

export type EstadoSesion = 'cargando' | 'autenticado' | 'anonimo';

export interface AuthContextValue {
  estado: EstadoSesion;
  usuario: Usuario | null;
  iniciarSesion: (credenciales: Credenciales) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  recargarUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return contexto;
}
