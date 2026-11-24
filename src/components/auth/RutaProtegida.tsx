/**
 * @file RutaProtegida.tsx
 * @description Guardián de rutas privadas: exige sesión activa y, opcionalmente,
 * verifica que el rol del usuario tenga permiso para acceder a la pantalla indicada.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import Spinner from '@/components/ui/Spinner/Spinner';
import { useAuth } from '@/context/AuthContext';
import { puedeVer, rutaInicio, type Pantalla } from '@/utils/roles';

/** Propiedades del componente guardián `RutaProtegida`. */
interface Props {
  /** Identificador opcional de la pantalla cuya autorización se desea validar según el rol. */
  pantalla?: Pantalla;
}

/**
 * Envuelve rutas privadas para exigir autenticación y control de acceso basado en rol:
 * - Muestra un indicador de carga mientras se verifica la sesión inicial.
 * - Redirige a `/login` conservando la ruta de origen si el usuario no está autenticado.
 * - Redirige a la vista de inicio del usuario si intenta acceder a una `pantalla` no permitida.
 *
 * @param props - Propiedades del componente (`{ pantalla }`).
 * @returns `Spinner` durante la verificación, redirección `Navigate` si falta sesión/permiso, o `Outlet` con las rutas hijas.
 */
export default function RutaProtegida({ pantalla }: Props) {
  const { estado, usuario } = useAuth();
  const ubicacion = useLocation();

  if (estado === 'cargando') {
    return <Spinner bloque texto="Verificando sesión…" />;
  }

  if (estado !== 'autenticado' || !usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }}
      />
    );
  }

  if (pantalla && !puedeVer(usuario, pantalla)) {
    return <Navigate to={rutaInicio(usuario)} replace />;
  }

  return <Outlet />;
}
