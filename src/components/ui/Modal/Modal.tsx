/**
 * @file Modal.tsx
 * @description Diálogo modal accesible con cierre por `Esc`, clic en el fondo
 * y bloqueo del desplazamiento del documento.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import './Modal.css';

/** Propiedades del modal. */
export interface ModalProps {
  /** Controla la visibilidad. */
  abierto: boolean;
  /** Título del diálogo. */
  titulo: string;
  /** Descripción opcional bajo el título. */
  descripcion?: string;
  /** Acción de cierre. */
  onCerrar: () => void;
  /** Contenido principal. */
  children: ReactNode;
  /** Pie de acciones fijo. */
  pie?: ReactNode;
  /** Ancho máximo del diálogo. */
  ancho?: 'sm' | 'md' | 'lg';
}

/**
 * Modal reutilizable.
 *
 * @param props - Estado, título, contenido y acciones.
 * @returns Diálogo montado en `document.body` o `null` si está cerrado.
 */
export default function Modal({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  children,
  pie,
  ancho = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!abierto) return;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar();
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alPresionar);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener('keydown', alPresionar);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="modal"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        className={`modal__dialogo modal__dialogo--${ancho}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        <header className="modal__cabecera">
          <div>
            <h2 className="modal__titulo" id="modal-titulo">
              {titulo}
            </h2>
            {descripcion && <p className="modal__descripcion">{descripcion}</p>}
          </div>
          <button
            type="button"
            className="modal__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="modal__cuerpo">{children}</div>

        {pie && <footer className="modal__pie">{pie}</footer>}
      </div>
    </div>,
    document.body
  );
}
