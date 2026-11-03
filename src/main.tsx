/**
 * @file main.tsx
 * @description Punto de entrada de React. Monta la aplicación dentro de
 * `StrictMode` y carga los estilos globales.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error(
    'No se encontró el elemento #root para montar la aplicación.'
  );
}

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>
);
