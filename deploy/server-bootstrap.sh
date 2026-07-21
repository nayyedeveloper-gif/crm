#!/usr/bin/env bash
# First-time server setup: clone repo into /var/www/ecommerce
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/nayyedeveloper-gif/crm.git}"
APP_ROOT="${APP_ROOT:-/var/www/ecommerce}"

if [[ -d "$APP_ROOT/.git" ]]; then
  echo "Already a git repo: $APP_ROOT"
  exit 0
fi

mkdir -p "$(dirname "$APP_ROOT")"
if [[ -d "$APP_ROOT" ]]; then
  echo "Backing up existing $APP_ROOT to ${APP_ROOT}.bak.$(date +%s)"
  mv "$APP_ROOT" "${APP_ROOT}.bak.$(date +%s)"
fi

git clone "$REPO_URL" "$APP_ROOT"
chmod +x "$APP_ROOT/deploy/server-deploy.sh"
echo "Cloned. Copy shared/backend.env then run: $APP_ROOT/deploy/server-deploy.sh"
