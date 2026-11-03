import { describe, expect, it } from 'vitest';

import { desdeControl } from './eventos';

/** Nodo mínimo: `closest` responde según esté o no dentro de un control. */
const nodo = (dentroDeControl: boolean) => ({
  closest: (selector: string) =>
    dentroDeControl && selector.includes('button') ? {} : null,
});

describe('desdeControl', () => {
  it('detecta clics nacidos en un botón o sus hijos', () => {
    expect(desdeControl(nodo(true) as unknown as EventTarget)).toBe(true);
  });

  it('deja pasar clics en el resto de la fila', () => {
    expect(desdeControl(nodo(false) as unknown as EventTarget)).toBe(false);
    expect(desdeControl(null)).toBe(false);
    expect(desdeControl({} as EventTarget)).toBe(false);
  });
});
