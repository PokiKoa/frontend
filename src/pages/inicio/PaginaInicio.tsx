/**
 * @file PaginaInicio.tsx
 * @description Redirige `/` a la pantalla de inicio del rol (farmacia no usa el panel clínico).
 */

import { Navigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { rutaInicio } from '@/utils/roles';

export default function PaginaInicio() {
  const { usuario } = useAuth();
  const destino = rutaInicio(usuario);
  return destino === '/' ? null : <Navigate to={destino} replace />;
}
