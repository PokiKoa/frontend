/**
 * @file eventos.ts
 * @description Utilidades para eventos del DOM.
 */

const CONTROLES = 'button, a, input, select, textarea, label';

/**
 * Indica si un evento del DOM se originó dentro de un control interactivo
 * (`button`, `a`, `input`, `select`, `textarea` o `label`). Las filas clicables
 * lo usan para evitar que las acciones internas disparen la navegación de la fila.
 *
 * @param objetivo - Elemento destino (`event.target`) sobre el cual ocurrió el evento.
 * @returns `true` si el objetivo es o está contenido dentro de un control interactivo.
 */
export function desdeControl(objetivo: EventTarget | null): boolean {
  const nodo = objetivo as { closest?: (selector: string) => unknown } | null;
  return (
    typeof nodo?.closest === 'function' && nodo.closest(CONTROLES) !== null
  );
}