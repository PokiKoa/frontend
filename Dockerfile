# Imagen de producción del frontend: compila con Node 24 y sirve dist/ con nginx sin root.
# La misma imagen sirve a cualquier centro: no lleva ningún dominio.
#
#   docker build -t poki-koa-frontend:prod .
#   docker run --rm -p 127.0.0.1:8080:8080 poki-koa-frontend:prod
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite incrusta las VITE_* al compilar. Los valores por defecto usan el mismo origen que la
# página (el proxy enruta /api y /ws al backend) y los QR toman la dirección desde la que se
# abre la app, así que normalmente no hace falta pasar ninguno.
ARG VITE_PUBLIC_URL=
ARG VITE_API_URL=/api/v1
ARG VITE_WS_URL=
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
