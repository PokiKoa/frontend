import { describe, expect, it } from 'vitest';

import { codigoDesdeQr, rutaQrCuna, urlQrCuna } from './qr';

describe('QR de cunas', () => {
  it('arma la ruta y la URL con el código de la cuna', () => {
    expect(rutaQrCuna('C-01')).toBe('/qr/cuna/C-01');
    expect(rutaQrCuna(' UCI 3 ')).toBe('/qr/cuna/UCI%203');
    expect(urlQrCuna('C-01', 'https://pokikoa.cl/')).toBe(
      'https://pokikoa.cl/qr/cuna/C-01'
    );
  });

  it('lee el código desde URLs de cualquier origen y desde rutas', () => {
    expect(codigoDesdeQr('https://pokikoa.cl/qr/cuna/C-01')).toBe('C-01');
    expect(codigoDesdeQr('http://192.168.1.20:5173/qr/cuna/C-02/')).toBe(
      'C-02'
    );
    expect(codigoDesdeQr('/qr/cuna/UCI%203')).toBe('UCI 3');
    expect(codigoDesdeQr(urlQrCuna('C-04', 'https://a.cl'))).toBe('C-04');
  });

  it('rechaza contenido que no es un QR de cuna', () => {
    expect(codigoDesdeQr('')).toBeNull();
    expect(codigoDesdeQr('https://ejemplo.com/phishing')).toBeNull();
    expect(codigoDesdeQr('https://pokikoa.cl/pacientes/3')).toBeNull();
    expect(codigoDesdeQr('/qr/cuna/')).toBeNull();
    expect(codigoDesdeQr('/qr/cuna/%E0%A4%A')).toBeNull();
    expect(codigoDesdeQr('texto cualquiera')).toBeNull();
  });
});
