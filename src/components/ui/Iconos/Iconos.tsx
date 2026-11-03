/**
 * @file Iconos.tsx
 * @description Iconografía SVG compartida. Se dibuja con `currentColor` para
 * heredar el color del contexto y se mantiene sin dependencias externas.
 */

import type { ReactNode, SVGProps } from 'react';

/** Nombres de iconos disponibles. */
export type NombreIcono =
  | 'panel'
  | 'cunas'
  | 'pacientes'
  | 'medicamentos'
  | 'planes'
  | 'alertas'
  | 'turnos'
  | 'misCunas'
  | 'reportes'
  | 'registros'
  | 'configuracion'
  | 'menu'
  | 'campana'
  | 'salir'
  | 'buscar'
  | 'mas'
  | 'editar'
  | 'ojo'
  | 'descargar'
  | 'reloj'
  | 'corazon'
  | 'gota'
  | 'temperatura'
  | 'check'
  | 'cerrar'
  | 'volver'
  | 'usuario'
  | 'candado'
  | 'escudo'
  | 'filtro'
  | 'calendario'
  | 'cama'
  | 'alta'
  | 'mantenimiento'
  | 'flecha';

/** Trazos de cada icono (viewBox 24x24, sin relleno). */
const TRAZOS: Record<NombreIcono, ReactNode> = {
  panel: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  cunas: (
    <>
      <path d="M3 18V8m0 4h18m0 6V10a2 2 0 0 0-2-2h-8v6" />
      <path d="M6 12V6h3a3 3 0 0 1 3 3v3" />
      <circle cx="7" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </>
  ),
  pacientes: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  medicamentos: (
    <>
      <path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </>
  ),
  planes: (
    <>
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="m8 14 2.5 2.5L16 11" />
    </>
  ),
  alertas: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  turnos: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  misCunas: (
    <>
      <path d="M3 18V8m0 4h18m0 6V10a2 2 0 0 0-2-2h-8v6" />
      <path d="M6 12V6h3a3 3 0 0 1 3 3v3" />
    </>
  ),
  reportes: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 17v-3M12 17v-6M16 17v-4" />
    </>
  ),
  registros: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  campana: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  salir: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  editar: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  ojo: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  descargar: (
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  corazon: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  gota: <path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0Z" />,
  temperatura: (
    <>
      <path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0Z" />
      <path d="M12 8v7" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  volver: <path d="M19 12H5M12 19l-7-7 7-7" />,
  usuario: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  candado: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  filtro: <path d="M22 3H2l8 9.5V19l4 2v-8.5Z" />,
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  cama: (
    <>
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20" />
      <path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
    </>
  ),
  alta: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  mantenimiento: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3Z" />
      <path d="M14.7 6.3 17 4l3 3-2.3 2.3" />
    </>
  ),
  flecha: <path d="M5 12h14M12 5l7 7-7 7" />,
};

/** Propiedades del icono. */
interface IconoProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /** Icono a dibujar. */
  nombre: NombreIcono;
  /** Tamaño en píxeles (ancho y alto). */
  tamano?: number;
}

/**
 * Icono SVG del sistema.
 *
 * @param props - Nombre, tamaño y atributos SVG.
 * @returns Elemento `<svg>` con trazo actual.
 */
export default function Icono({ nombre, tamano = 18, ...resto }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
