import { afterEach, describe, expect, it, vi } from 'vitest';

import { codigoDesdeQr, origenPublico, rutaQrCuna, urlQrCuna } from './qr';

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

describe('origen público de los QR', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('usa VITE_PUBLIC_URL sin la barra final', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://pokikoa.racsu.com/');
    expect(origenPublico()).toBe('https://pokikoa.racsu.com');
    expect(urlQrCuna('C-01', origenPublico())).toBe(
      'https://pokikoa.racsu.com/qr/cuna/C-01'
    );
  });

  it('sin VITE_PUBLIC_URL usa el origen desde el que se abre la app', () => {
    vi.stubEnv('VITE_PUBLIC_URL', '  ');
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    expect(origenPublico()).toBe('http://localhost:5173');
  });
});
