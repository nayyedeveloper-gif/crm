#!/usr/bin/env bash
# Run on production server after: git pull
# Usage: ./deploy/server-deploy.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/ecommerce}"
cd "$APP_ROOT"

echo "==> Pull latest (if not already done)"
git pull --ff-only

echo "==> Build backend"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$PATH"
cd backend
mvn -q -DskipTests package
cp -f target/sale-crm-backend.jar "$APP_ROOT/backend/sale-crm-backend.jar"
cd "$APP_ROOT"

echo "==> Build sales embed"
cd "$APP_ROOT/sales"
if [[ -f package-lock.json ]]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi
npm run build
cd "$APP_ROOT"

echo "==> Build frontend + sales embed"
cd frontend
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run build
cd "$APP_ROOT"

echo "==> Restart services"
pm2 restart ecommerce-api ecommerce-web

echo "==> Health check"
sleep 12
curl -fsS http://127.0.0.1:8090/api/actuator/health
echo
curl -fsS -o /dev/null -w "web: %{http_code}\n" http://127.0.0.1:3002/
echo "Deploy complete."
