-- ═══════════════════════════════════════════════════════════════════════════
-- 29 Jewellery Sale Dashboard — Database Schema
-- SQLite (better-sqlite3) — WAL mode, foreign keys enabled
-- 
-- Usage:
--   sqlite3 data/dashboard.db < schema.sql
--   OR: backend auto-creates tables on first run via initDb()
-- ═══════════════════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: follow_ups
-- Purpose: Customer interaction records (calls, visits, messages)
-- Origin: Migrated from localStorage key 'crmFollowUps'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follow_ups (
    id                TEXT PRIMARY KEY,           -- UUID-like: {timestamp}-{random hex}
    customer_key      TEXT NOT NULL,              -- Phone number or buyer name (unique customer identifier)
    customer_name     TEXT NOT NULL,              -- Customer display name
    contact_date      TEXT NOT NULL,              -- ISO date: YYYY-MM-DD
    interaction_type  TEXT NOT NULL DEFAULT 'Call',  -- 'Call' | 'SMS' | 'Viber' | 'Visit' | 'Other'
    notes             TEXT DEFAULT '',            -- Free-text interaction notes
    status            TEXT NOT NULL DEFAULT 'Pending',  -- 'Pending' | 'Interested' | 'Converted' | 'Lost'
    interest_level    TEXT NOT NULL DEFAULT 'Medium',   -- 'Low' | 'Medium' | 'High'
    next_action_date  TEXT DEFAULT '',            -- ISO date for follow-up scheduling
    photo             TEXT DEFAULT '',            -- Base64-encoded JPEG/PNG
    audio             TEXT DEFAULT '',            -- Base64-encoded audio
    created_at        TEXT NOT NULL,              -- ISO 8601 timestamp
    updated_at        TEXT NOT NULL               -- ISO 8601 timestamp
);

-- Index for fast customer lookup
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_key);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_follow_ups_created ON follow_ups(created_at);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: customer_dobs
-- Purpose: Customer date of birth records
-- Origin: Migrated from localStorage key 'crmDobs'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_dobs (
    customer_key      TEXT PRIMARY KEY,           -- Phone number or buyer name
    dob               TEXT NOT NULL,              -- ISO date: YYYY-MM-DD
    updated_at        TEXT NOT NULL               -- ISO 8601 timestamp
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: redemptions
-- Purpose: Birthday gift redemption records (one per customer per year)
-- Origin: Migrated from localStorage key 'crmRedemptionHistory'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS redemptions (
    id                TEXT PRIMARY KEY,           -- UUID-like: {timestamp}-{random hex}
    customer_key      TEXT NOT NULL,              -- Phone number or buyer name
    year              INTEGER NOT NULL,           -- Redemption year (e.g., 2025)
    gift_description  TEXT DEFAULT '',            -- Description of gift given
    interaction_date  TEXT NOT NULL,              -- ISO date: YYYY-MM-DD
    staff_name        TEXT DEFAULT '',            -- Staff who handled the redemption
    photo             TEXT DEFAULT '',            -- Base64-encoded JPEG/PNG (proof photo)
    notes             TEXT DEFAULT '',            -- Additional notes
    created_at        TEXT NOT NULL,              -- ISO 8601 timestamp
    updated_at        TEXT NOT NULL,              -- ISO 8601 timestamp
    UNIQUE(customer_key, year)                    -- One redemption per customer per year
);

-- Index for fast customer lookup
CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON redemptions(customer_key);

-- Index for sorting by year
CREATE INDEX IF NOT EXISTS idx_redemptions_year ON redemptions(year DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: auth_tokens
-- Purpose: Session token storage for authentication
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_tokens (
    token             TEXT PRIMARY KEY,           -- 64-char hex token
    username          TEXT NOT NULL,              -- Authenticated username
    created_at        TEXT NOT NULL,              -- ISO 8601 timestamp
    expires_at        TEXT NOT NULL               -- ISO 8601 timestamp (24h expiry)
);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: sync_log
-- Purpose: Google Sheets sync history for debugging/auditing
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source            TEXT NOT NULL,              -- 'sales' | 'targets'
    row_count         INTEGER,                    -- Number of rows fetched
    status            TEXT NOT NULL,              -- 'success' | 'error'
    error             TEXT,                       -- Error message if failed
    synced_at         TEXT NOT NULL               -- ISO 8601 timestamp
);

-- Index for recent sync history
CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- Views
-- ═══════════════════════════════════════════════════════════════════════════

-- View: customers_with_upcoming_birthdays
-- Purpose: Quick lookup of customers with DOBs in the current month
CREATE VIEW IF NOT EXISTS customers_with_upcoming_birthdays AS
SELECT 
    cd.customer_key,
    cd.dob,
    CAST(strftime('%m', cd.dob) AS INTEGER) AS dob_month,
    CAST(strftime('%d', cd.dob) AS INTEGER) AS dob_day
FROM customer_dobs cd
WHERE CAST(strftime('%m', cd.dob) AS INTEGER) = CAST(strftime('%m', 'now') AS INTEGER)
ORDER BY dob_day ASC;

-- View: current_year_redemptions
-- Purpose: All redemptions for the current year
CREATE VIEW IF NOT EXISTS current_year_redemptions AS
SELECT 
    r.id,
    r.customer_key,
    r.year,
    r.gift_description,
    r.interaction_date,
    r.staff_name,
    r.photo,
    r.notes,
    r.created_at,
    r.updated_at
FROM redemptions r
WHERE r.year = CAST(strftime('%Y', 'now') AS INTEGER);

-- View: customer_crm_summary
-- Purpose: Aggregated CRM data per customer
CREATE VIEW IF NOT EXISTS customer_crm_summary AS
SELECT 
    cd.customer_key,
    cd.dob,
    (SELECT COUNT(*) FROM follow_ups fu WHERE fu.customer_key = cd.customer_key) AS follow_up_count,
    (SELECT GROUP_CONCAT(DISTINCT fu.status) FROM follow_ups fu WHERE fu.customer_key = cd.customer_key) AS follow_up_statuses,
    (SELECT COUNT(*) FROM redemptions r WHERE r.customer_key = cd.customer_key) AS total_redemptions,
    (SELECT COUNT(*) FROM redemptions r WHERE r.customer_key = cd.customer_key AND r.year = CAST(strftime('%Y', 'now') AS INTEGER)) AS current_year_redemptions
FROM customer_dobs cd;

-- ═══════════════════════════════════════════════════════════════════════════
-- Triggers
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger: auto-update updated_at on follow_ups
CREATE TRIGGER IF NOT EXISTS trg_follow_ups_updated_at
    AFTER UPDATE ON follow_ups
    FOR EACH ROW
    BEGIN
        UPDATE follow_ups SET updated_at = datetime('now') WHERE id = OLD.id;
    END;

-- Trigger: auto-update updated_at on redemptions
CREATE TRIGGER IF NOT EXISTS trg_redemptions_updated_at
    AFTER UPDATE ON redemptions
    FOR EACH ROW
    BEGIN
        UPDATE redemptions SET updated_at = datetime('now') WHERE id = OLD.id;
    END;

-- Trigger: log sync errors
CREATE TRIGGER IF NOT EXISTS trg_sync_log_insert
    AFTER INSERT ON sync_log
    FOR EACH ROW
    WHEN NEW.status = 'error'
    BEGIN
        -- Keep only last 100 error logs
        DELETE FROM sync_log 
        WHERE id NOT IN (
            SELECT id FROM sync_log WHERE status = 'error' ORDER BY id DESC LIMIT 100
        );
    END;
