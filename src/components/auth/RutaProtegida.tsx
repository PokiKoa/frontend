/**
 * @file RutaProtegida.tsx
 * @description Guardián de rutas privadas: exige sesión y, opcionalmente, que
 * el rol tenga acceso a la pantalla indicada.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import Spinner from '@/components/ui/Spinner/Spinner';
import { useAuth } from '@/context/AuthContext';
import { puedeVer, rutaInicio, type Pantalla } from '@/utils/roles';

interface Props {
  pantalla?: Pantalla;
}

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
