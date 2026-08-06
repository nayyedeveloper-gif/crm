#!/usr/bin/env python3
"""One-shot import of Laravel CRM CSVs into Sale-CRM PostgreSQL.

Expects CSVs in tmp_crm_import/ (exported from shop_sales).
Prefer the Spring endpoint POST /api/legacy/import/crm when the backend
has LEGACY_MYSQL_ENABLED=true — this script is a fallback for local bulk load.
"""
# Kept as operational helper; see docs/LEGACY_MYSQL_BRIDGE.md
print("Use: Sale-CRM backend POST /api/legacy/import/crm (preferred)")
print("Or re-run the approved CSV import from the agent session.")
