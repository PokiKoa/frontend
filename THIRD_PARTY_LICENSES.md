# Licencias de terceros (frontend)

Dependencias directas de ejecución, con las versiones de `package-lock.json` (v2.1.0). Las dependencias de producción (directas y transitivas) usan licencias permisivas: MIT (89), ISC (18), BSD-3-Clause y Apache-2.0 (`jsqr`). Al redistribuir hay que **conservar el aviso de copyright y el texto de la licencia** de cada una; los textos están en `node_modules/<paquete>/LICENSE`.

| Paquete | Versión | Licencia | Proyecto |
|---|---|---|---|
| @hookform/resolvers | 5.9.1 | MIT | https://github.com/react-hook-form/resolvers |
| @tanstack/react-query | 5.106.1 | MIT | https://github.com/TanStack/query |
| axios | 1.20.0 | MIT | https://github.com/axios/axios |
| jsqr | 1.4.0 | Apache-2.0 | https://github.com/cozmo/jsQR |
| qrcode | 1.5.4 | MIT | https://github.com/soldair/node-qrcode |
| react-dom | 19.2.8 | MIT | https://github.com/react/react |
| react-hook-form | 7.87.0 | MIT | https://github.com/react-hook-form/react-hook-form |
| react-router-dom | 7.18.3 | MIT | https://github.com/remix-run/react-router |
| react | 19.2.8 | MIT | https://github.com/react/react |
| recharts | 3.10.1 | MIT | https://github.com/recharts/recharts |
| zod | 4.6.7 | MIT | https://github.com/colinhacks/zod |

Para regenerar la lista completa:

```bash
npx license-checker-rseidelsohn --production --summary
```
