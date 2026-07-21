# 29 Jewellery Sale Dashboard API

Backend API for the Sale Dashboard. Fetches Google Sheets data with caching, provides CRM database (SQLite), and exposes RESTful APIs usable by this project and other projects.

## Quick Start

```bash
cd backend
cp .env.example .env   # Edit values as needed
npm install
npm run dev            # Starts on http://localhost:3001
```

## Architecture

```
backend/
├── src/
│   ├── index.ts                 # Express server entry point
│   ├── types/index.ts           # Shared TypeScript types
│   ├── db/
│   │   └── database.ts          # SQLite setup + schema initialization
│   ├── services/
│   │   ├── cache.service.ts     # In-memory TTL cache
│   │   ├── sheets.service.ts    # Google Sheets CSV fetch + parse
│   │   ├── crm.service.ts       # CRM database operations
│   │   └── auth.service.ts      # Token generation + validation
│   └── routes/
│       ├── sales.routes.ts      # Sales data + targets
│       ├── crm.routes.ts        # CRM follow-ups, DOBs, redemptions
│       └── auth.routes.ts       # Login + verify
├── package.json
├── tsconfig.json
└── .env.example
```

## API Endpoints

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health + uptime |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with username/password → returns token |
| GET | `/api/auth/verify` | Verify token validity |

**Login Request:**
```json
{ "username": "Sale", "password": "AGM292929" }
```

**Login Response:**
```json
{ "success": true, "data": { "token": "...", "username": "Sale" }, "expiresAt": "..." }
```

### Sales (Google Sheets data, cached)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sales` | All sales rows (cached, auto-refreshes) |
| GET | `/api/sales/branches` | Unique branch list |
| GET | `/api/sales/months` | Unique month list from data |
| GET | `/api/sales/filter?month=July&branches=Shop-1,Shop-2` | Filtered sales data |
| GET | `/api/sales/targets` | Target sheet data |
| POST | `/api/sales/refresh` | Force refresh cache |

**Response format:**
```json
{
  "success": true,
  "data": [...],
  "cached": true,
  "lastUpdated": "2025-07-20T10:30:00.000Z"
}
```

### CRM — Follow-ups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/follow-ups` | All follow-ups (flat array) |
| GET | `/api/crm/follow-ups?grouped=true` | All follow-ups grouped by customer |
| GET | `/api/crm/follow-ups/:customerKey` | Follow-ups for a customer |
| POST | `/api/crm/follow-ups` | Create follow-up |
| PUT | `/api/crm/follow-ups/:id` | Update follow-up |
| DELETE | `/api/crm/follow-ups/:id` | Delete follow-up |

**Create Request:**
```json
{
  "customerKey": "0123456789",
  "customerName": "U Mya",
  "contactDate": "2025-07-20",
  "interactionType": "Call",
  "notes": "Interested in gold necklace",
  "status": "Interested",
  "interestLevel": "High",
  "nextActionDate": "2025-07-25",
  "photo": "",
  "audio": ""
}
```

### CRM — DOBs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/dobs` | All DOBs (key-value map) |
| GET | `/api/crm/dobs/:customerKey` | DOB for a customer |
| PUT | `/api/crm/dobs` | Create or update DOB |
| DELETE | `/api/crm/dobs/:customerKey` | Delete DOB |

**Upsert Request:**
```json
{ "customerKey": "0123456789", "dob": "1990-05-15" }
```

### CRM — Redemptions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/redemptions` | All redemptions |
| GET | `/api/crm/redemptions?grouped=true` | Grouped by customer |
| GET | `/api/crm/redemptions/:customerKey` | Redemptions for a customer |
| GET | `/api/crm/redemptions/:customerKey?currentYear=true` | Current year only |
| POST | `/api/crm/redemptions` | Create or update (upsert by customer+year) |
| PUT | `/api/crm/redemptions/:id` | Update redemption |
| DELETE | `/api/crm/redemptions/:id` | Delete redemption |

### CRM — Redeemed Status
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/redeemed` | Which customers redeemed this year |

### CRM — Bulk Import/Export (for migration)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/export` | All CRM data in one response |
| POST | `/api/crm/import` | Bulk import from localStorage format |

**Import format (matches localStorage structure):**
```json
{
  "followUps": {
    "0123456789": [{ "customerName": "U Mya", "contactDate": "2025-07-20", ... }]
  },
  "dobs": { "0123456789": "1990-05-15" },
  "redemptions": {
    "0123456789": [{ "year": 2025, "giftDescription": "Pendant", ... }]
  }
}
```

## Using from Other Projects

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Sale","password":"AGM292929"}'

# Get sales data
curl http://localhost:3001/api/sales

# Get filtered sales
curl "http://localhost:3001/api/sales/filter?month=July&branches=Shop-1,Shop-2"

# Create a follow-up
curl -X POST http://localhost:3001/api/crm/follow-ups \
  -H "Content-Type: application/json" \
  -d '{"customerKey":"123","customerName":"U Mya","contactDate":"2025-07-20","interactionType":"Call"}'

# Get all CRM data
curl http://localhost:3001/api/crm/export
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `SALES_SHEET_URL` | — | Google Sheets CSV export URL |
| `TARGET_SHEET_URL` | — | Target sheet CSV export URL |
| `CACHE_TTL_MS` | `180000` | Cache TTL (3 min) |
| `AUTH_USERNAME` | `Sale` | Login username |
| `AUTH_PASSWORD` | `AGM292929` | Login password |
| `JWT_SECRET` | — | Token signing secret |
| `DB_PATH` | `./data/dashboard.db` | SQLite file path |

## Database

SQLite via `better-sqlite3`. Database file is created at `DB_PATH` on first run.

Core tables:
- `follow_ups` — Customer interaction records
- `customer_dobs` — Birthday dates
- `redemptions` — Birthday gift redemption records (unique per customer+year)
- `auth_tokens` — Token storage
- `sync_log` — Sheet sync history

Archive tables (created by sync scripts):
- `sheet_sales_archive` — Historical sales rows from Google Sheets
- `sheet_targets_archive` — Historical target data from Google Sheets
- `sales_export_archive` — Raw JSON exports
- `target_export_archive` — Structured target exports

Views:
- `customers_with_upcoming_birthdays` — Current month birthdays
- `current_year_redemptions` — This year's redemptions
- `customer_crm_summary` — Per-customer CRM aggregates

## Scripts

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |

### Export Google Sheets Data

| Command | Description |
|---------|-------------|
| `npm run export:sheets` | Export sales + targets to JSON + CSV |
| `npm run export:sheets:sql` | Export + generate SQL backup |
| `tsx scripts/export-sheets.ts --json-only` | JSON only |
| `tsx scripts/export-sheets.ts --csv-only` | CSV only |
| `tsx scripts/export-sheets.ts --sql` | Include SQL backup |

Exported files are saved to `backend/exports/`.

### Check Google Sheets URLs

| Command | Description |
|---------|-------------|
| `npm run check:sheets` | Verify sales + target sheet URLs are accessible |

This prints status codes, content types, and a preview. If a sheet returns HTML instead of CSV, it is not published correctly.

### Sync Google Sheets to Database

| Command | Description |
|---------|-------------|
| `npm run sync:sheets` | Sync sales + targets into SQLite archive |
| `npm run sync:sheets:reset` | Sync after clearing archive tables |
| `tsx scripts/sync-to-db.ts --dry-run` | Validate without writing |
| `tsx scripts/sync-to-db.ts --sales-source=exports/sales_...json --targets-source=exports/targets_...json` | Import from export files |

**Best practice:** Run `export:sheets` first for backup, then `sync:sheets` for DB archive.

### Current Google Sheets Status (from `npm run check:sheets`)

- **Sales sheet**: `400 Bad Request` — URL is not accessible. Likely needs to be re-published or the sheet ID changed.
- **Target sheet**: `200 OK` — valid CSV, ~20 lines.

To fix the sales sheet:
1. Open the Google Sheet
2. Go to **File → Share → Publish to web**
3. Select the correct sheet and format = CSV
4. Copy the new `/export?format=csv&gid=...` URL
5. Update `SALES_SHEET_URL` in `.env`

## Migration Checklist

1. **Backup current Google Sheets data**
   ```bash
   npm run export:sheets:sql
   ```

2. **Migrate frontend CRM data from localStorage**
   - Open browser console
   - Run `JSON.stringify({followUps: JSON.parse(localStorage.getItem('crmFollowUps') || '{}'), dobs: JSON.parse(localStorage.getItem('crmDobs') || '{}'), redemptions: JSON.parse(localStorage.getItem('crmRedemptionHistory') || '{}')})`
   - Save to `crm-backup.json`
   - POST to `/api/crm/import` or use curl

3. **Archive historical sheets data**
   ```bash
   npm run sync:sheets:reset
   ```

4. **Switch frontend to use API**
   - Update `App.tsx` to call `/api/sales` instead of direct CSV URL
   - Update CRM components to call `/api/crm/*` endpoints

5. **Production deployment**
   - Change `DB_PATH` to persistent location
   - Update `CORS_ORIGIN` to frontend domain
   - Change `AUTH_PASSWORD` and `JWT_SECRET`
