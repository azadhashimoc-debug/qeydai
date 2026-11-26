#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/panelim}"
ENV_FILE="${ENV_FILE:-/etc/panelim/panelim.env}"
SERVICE_NAME="${SERVICE_NAME:-panelim}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"

cd "$APP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "==> 1/5 Preflight environment check"
npm run check:env

echo "==> 2/5 Installing dependencies"
npm ci

echo "==> 3/5 Applying PostgreSQL migrations"
npm run migrate

echo "==> 4/5 Building production Next.js bundle"
npm run build

echo "==> 5/5 Restarting ${SERVICE_NAME} and verifying health"
sudo systemctl restart "$SERVICE_NAME"

for i in $(seq 1 20); do
  if curl -fsS "$HEALTH_URL" | grep -q '"status":"ok"'; then
    echo "Deploy healthy: $HEALTH_URL"
    exit 0
  fi
  sleep 1
done

echo "Healthcheck failed on $HEALTH_URL" >&2
sudo journalctl -u "$SERVICE_NAME" -n 40 --no-pager >&2
exit 1
