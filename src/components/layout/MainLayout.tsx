/**
 * @file MainLayout.tsx
 * @description Estructura base de las pantallas privadas: sidebar, cabecera
 * y área de contenido.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';

import './Layout.css';

/**
 * Layout principal de la aplicación.
 *
 * @returns Contenedor con navegación y contenido de la ruta activa.
 */
export default function MainLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="layout">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="layout__principal">
        <Header onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
