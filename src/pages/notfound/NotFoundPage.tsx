/**
 * @file NotFoundPage.tsx
 * @description Página 404 para rutas inexistentes o movidas.
 */

import { Link } from 'react-router-dom';

import Icono from '@/components/ui/Iconos/Iconos';

import './NotFoundPage.css';

/**
 * Pantalla de ruta no encontrada.
 *
 * @returns Mensaje de error con accesos de recuperación.
 */
export default function NotFoundPage() {
  return (
    <main className="no-encontrado">
      <div className="no-encontrado__tarjeta">
        <span className="no-encontrado__marca" aria-hidden="true">
          <Icono nombre="escudo" tamano={22} />
        </span>

        <p className="no-encontrado__codigo" aria-hidden="true">
          404
        </p>

        <h1 className="no-encontrado__titulo">No encontramos esta página</h1>
        <p className="no-encontrado__texto">
          La ruta que intentaste abrir no existe, cambió de dirección o ya no
          forma parte de Poki Koa. Revisa el enlace o vuelve al panel para
          continuar con la operación clínica.
        </p>

        <div className="no-encontrado__acciones">
          <Link to="/" className="boton boton--primario boton--md">
            <Icono nombre="panel" tamano={15} />
            Volver al panel
          </Link>
          <Link to="/login" className="boton boton--secundario boton--md">
            Ir al acceso
          </Link>
        </div>

        <p className="no-encontrado__pie">
          Si el problema persiste, comunícate con el administrador del sistema.
        </p>
      </div>
    </main>
  );
}
