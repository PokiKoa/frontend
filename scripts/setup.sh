#!/usr/bin/env bash
# Prepara el frontend para desarrollo local: verifica Node/npm, crea .env, instala
# dependencias y comprueba que el backend responda. Se puede ejecutar varias veces.
#
#   ./scripts/setup.sh          # solo prepara
#   ./scripts/setup.sh --run    # prepara y deja `npm run dev` corriendo
set -euo pipefail

cd "$(dirname "$0")/.."

RUN=0
for arg in "$@"; do
  case "$arg" in
    --run) RUN=1 ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $arg" >&2; exit 2 ;;
  esac
done

paso()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()    { printf '    \033[32m✔\033[0m %s\n' "$*"; }
aviso() { printf '    \033[33m!\033[0m %s\n' "$*"; }
falla() {
  printf '\n\033[1;31m✘ %s\033[0m\n' "$1" >&2
  shift
  for linea in "$@"; do printf '  %s\n' "$linea" >&2; done
  exit 1
}

NODE_MIN=24

paso "Node y npm"
command -v node >/dev/null 2>&1 || falla "No se encontró Node.js." \
  "Instala Node $NODE_MIN (recomendado con nvm: nvm install $NODE_MIN)."
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge "$NODE_MIN" ] || falla "Node $(node -v) es muy antiguo; se requiere Node $NODE_MIN o superior." \
  "Con nvm: nvm install $NODE_MIN && nvm use $NODE_MIN"
[ "$node_major" -eq "$NODE_MIN" ] || aviso "Node $(node -v): el proyecto se prueba en Node $NODE_MIN (CI). Debería funcionar, pero si ves errores raros usa Node $NODE_MIN."
ok "node $(node -v) · npm $(npm -v)"

paso "Archivo .env"
if [ -f .env ]; then
  ok ".env ya existe (no se sobrescribe)"
else
  cp .env.example .env
  ok ".env creado desde .env.example"
fi

paso "Dependencias (npm ci)"
npm ci --no-audit --no-fund || falla "npm ci falló." \
  "Usa Node $NODE_MIN / npm 11 y no edites package-lock.json a mano."
ok "node_modules instalado"

paso "Backend"
backend="$(sed -n 's/^VITE_BACKEND_ORIGIN=//p' .env | tail -1)"
backend="${backend:-http://localhost:8000}"
codigo="$(curl -s -o /dev/null -w '%{http_code}' "$backend/api/v1/" 2>/dev/null || true)"
if [ -n "$codigo" ] && [ "$codigo" != "000" ]; then
  ok "el backend responde en $backend"
else
  aviso "El backend no responde en $backend."
  aviso "Levántalo en otra terminal: cd ../backend && ./scripts/setup.sh --run"
fi

cat <<'EOF'

✔ Frontend listo. Abre http://localhost:5173 tras `npm run dev`.
EOF

if [ "$RUN" -eq 1 ]; then
  paso "Iniciando Vite"
  exec npm run dev
fi
