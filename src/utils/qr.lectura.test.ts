import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';

import { codigoDesdeQr, urlQrCuna } from './qr';

/** Rasteriza la matriz del QR a RGBA, como un cuadro de la cámara. */
function rasterizar(texto: string, escala = 6, margen = 4) {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: 'M' });
  const lado = (modules.size + margen * 2) * escala;
  const datos = new Uint8ClampedArray(lado * lado * 4).fill(255);
  for (let fila = 0; fila < modules.size; fila += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (!modules.get(fila, col)) continue;
      for (let dy = 0; dy < escala; dy += 1) {
        for (let dx = 0; dx < escala; dx += 1) {
          const y = (fila + margen) * escala + dy;
          const x = (col + margen) * escala + dx;
          datos.fill(0, (y * lado + x) * 4, (y * lado + x) * 4 + 3);
        }
      }
    }
  }
  return { datos, lado };
}

describe('QR de cuna de punta a punta', () => {
  it('lo que se imprime se lee y vuelve al código de la cuna', () => {
    for (const codigo of ['C-01', 'UCI 3', 'Neo-12B']) {
      const { datos, lado } = rasterizar(
        urlQrCuna(codigo, 'https://pokikoa.cl')
      );
      const leido = jsQR(datos, lado, lado);
      expect(leido?.data).toBe(urlQrCuna(codigo, 'https://pokikoa.cl'));
      expect(codigoDesdeQr(leido?.data ?? '')).toBe(codigo);
    }
  });
});
