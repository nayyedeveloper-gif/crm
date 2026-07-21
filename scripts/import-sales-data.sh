#!/usr/bin/env bash
# One-time / recurring sales CSV import into PostgreSQL via CRM API.
# Usage:
#   SALES_CRM_USER=admin SALES_CRM_PASS='...' ./scripts/import-sales-data.sh /path/to/transactions.csv [/path/to/targets.csv]
set -euo pipefail

API_BASE="${SALES_API_BASE:-https://shop.29jewellery.com/api}"
USER="${SALES_CRM_USER:?Set SALES_CRM_USER}"
PASS="${SALES_CRM_PASS:?Set SALES_CRM_PASS}"
TX_FILE="${1:?Transactions CSV path required}"
TARGET_FILE="${2:-}"
TARGET_MONTH="${SALES_TARGET_MONTH:-July}"

TOKEN="$(curl -fsS -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")"

echo "Importing transactions from $TX_FILE ..."
curl -fsS -X POST "$API_BASE/sales/import/transactions?replaceAll=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@${TX_FILE}"

echo
if [[ -n "$TARGET_FILE" && -f "$TARGET_FILE" ]]; then
  echo "Importing targets ($TARGET_MONTH) from $TARGET_FILE ..."
  curl -fsS -X POST "$API_BASE/sales/import/targets?month=${TARGET_MONTH}&replaceMonth=true" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@${TARGET_FILE}"
  echo
fi

curl -fsS "$API_BASE/sales/status" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
