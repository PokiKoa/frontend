import { describe, expect, it } from 'vitest';

import dockerfile from '../../Dockerfile?raw';
import nginxConf from '../../docker/nginx.conf?raw';
import securityHeaders from '../../docker/security-headers.conf?raw';

const SNIPPET_PATH = '/etc/nginx/snippets/security-headers.conf';

// nginx descarta los add_header heredados cuando una location define los suyos, así que
// cada location tiene que incluir el archivo de cabeceras por su cuenta
function locationBlocks(conf: string): string[] {
  return [...conf.matchAll(/location\s+[^{]+\{([^}]*)\}/g)].map((m) => m[1]);
}

describe('cabeceras de seguridad de la imagen nginx', () => {
  it('cada location incluye el archivo de cabeceras', () => {
    const blocks = locationBlocks(nginxConf);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    for (const block of blocks) {
      expect(block).toContain(`include ${SNIPPET_PATH};`);
    }
  });

  it('el Dockerfile copia las cabeceras a la ruta que incluye nginx', () => {
    expect(dockerfile).toContain(
      `COPY docker/security-headers.conf ${SNIPPET_PATH}`
    );
  });

  it.each([
    ['X-Frame-Options', '"DENY"'],
    ['Content-Security-Policy', "frame-ancestors 'none'"],
    ['X-Content-Type-Options', '"nosniff"'],
    ['Strict-Transport-Security', 'max-age=31536000'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Permissions-Policy', 'camera=(self)'],
  ])('define %s también en respuestas de error', (header, value) => {
    const line = securityHeaders
      .split('\n')
      .find((l) => l.startsWith(`add_header ${header} `));
    expect(line).toBeDefined();
    expect(line).toContain(value);
    expect(line?.trimEnd()).toMatch(/ always;$/);
  });
});
