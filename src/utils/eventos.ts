/**
 * @file eventos.ts
 * @description Utilidades para eventos del DOM.
 */

const CONTROLES = 'button, a, input, select, textarea, label';

/**
 * `true` si el evento nace en un control interactivo (botón, enlace, campo).
 * Las filas clicables lo usan para que las acciones de sus botones no
 * disparen además la navegación de la fila.
 */
export function desdeControl(objetivo: EventTarget | null): boolean {
  const nodo = objetivo as { closest?: (selector: string) => unknown } | null;
  return (
    typeof nodo?.closest === 'function' && nodo.closest(CONTROLES) !== null
  );
}
