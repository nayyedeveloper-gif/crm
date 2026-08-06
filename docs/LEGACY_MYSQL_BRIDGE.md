# Legacy MySQL bridge (Laravel `shop_sales` → Sale-CRM)

Sale-CRM keeps **PostgreSQL** as the primary database.  
During migration, the backend can also **read** the existing Laravel MySQL DB (`shop_sales`) via a second datasource (JdbcTemplate, read-only pool).

## Architecture

```
Next/React  →  Spring Boot (/api/legacy/**)  →  MySQL shop_sales (Laravel)
                      │
                      └── PostgreSQL salecrm (primary / Flyway)
```

Frontend never connects to MySQL.

## 1. Create MySQL read-only user (on 167.71.223.157)

```bash
mysql -u root -p < backend/scripts/create-legacy-mysql-readonly-user.sql
```

Edit the password in that SQL file before running.

## 2. SSH tunnel (local Mac → server MySQL)

MySQL listens on `127.0.0.1:3306` on the server. From your laptop:

```bash
ssh -L 3307:127.0.0.1:3306 root@167.71.223.157
```

Keep that session open. JDBC then uses `localhost:3307`.

## 3. Enable in Sale-CRM backend

Export env (or put in your process manager / `.env` loader):

```bash
export LEGACY_MYSQL_ENABLED=true
export LEGACY_MYSQL_URL='jdbc:mysql://127.0.0.1:3307/shop_sales?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Yangon'
export LEGACY_MYSQL_USERNAME=shop_sale_java
export LEGACY_MYSQL_PASSWORD='your-password'
```

If the backend runs **on the same server** as MySQL, use port `3306` and no tunnel:

```bash
export LEGACY_MYSQL_URL='jdbc:mysql://127.0.0.1:3306/shop_sales?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Yangon'
```

Restart Spring Boot.

## 4. API endpoints (JWT required)

Base path already includes `/api`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/legacy/health` | Connection + row counts |
| GET | `/api/legacy/tables` | Whitelisted tables |
| GET | `/api/legacy/tables/{table}?page=0&size=50` | Paginated rows |
| GET | `/api/legacy/tables/{table}/{id}` | Single row |
| GET | `/api/legacy/crm-histories?q=` | Search CRM (~25k rows) |
| GET | `/api/legacy/master-setup?q=&branchId=` | Search vouchers (~6.6k) |

Auth: `ADMIN` or any of `CRM_VIEW`, `SALES_VIEW`, `BACKUP_MANAGE`.

Passwords / remember tokens are stripped from responses.

## 5. Frontend usage example

```ts
const res = await fetch(`${API_BASE}/legacy/crm-histories?page=0&size=50&q=`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

## 6. Important rules

- `ddl-auto` / Flyway stay on **PostgreSQL only** — never point Flyway at MySQL.
- Legacy pool is **read-only** (`Hikari readOnly=true` + MySQL `SELECT` grant).
- Schema changes to `shop_sales` remain owned by **Laravel** until cutover.
- When migration is done: copy needed data into PostgreSQL, then set `LEGACY_MYSQL_ENABLED=false`.

## CRM data import (Laravel → PostgreSQL)

One-shot (idempotent) import of CRM tables into Sale-CRM primary DB:

| Legacy MySQL | Sale-CRM PostgreSQL |
|---|---|
| `crm_histories` (~25k) | `crm_history` (+ `invite_status`, `legacy_id`) |
| `crm_staff_performance_targets` | `staff_performance_targets` |
| `crm_customer_interactions` | empty today — skipped |

### Run import

1. Enable legacy MySQL (tunnel or same host) — see section 3 above.
2. Restart backend so Flyway applies `V41__crm_legacy_import.sql`.
3. As ADMIN:

```bash
curl -X POST 'http://localhost:8080/api/legacy/import/crm?replaceLegacyRows=true' \
  -H "Authorization: Bearer $TOKEN"
```

`replaceLegacyRows=true` deletes previous imported rows (`legacy_id IS NOT NULL`) and demo seed rows before re-import.

Branch mapping uses shop names / `S1`→`SHOP-01` / `T2`→`BA-AN`.  
Region mapping uses Myanmar name hints → `MMR00x` codes.

