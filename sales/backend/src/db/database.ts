import Database from 'better-sqlite3';
import type { Database as DBType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: DBType;

export const getDb = (): DBType => {
  if (db) return db;

  const dbPath = path.resolve(process.env.DB_PATH || './data/dashboard.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
};

const SCHEMA_PATH = path.resolve(process.cwd(), 'db/schema.sql');

export const initDb = (): DBType => {
  const database = getDb();

  // Core tables — always created inline (fast, idempotent)
  database.exec(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      customer_key TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      contact_date TEXT NOT NULL,
      interaction_type TEXT NOT NULL DEFAULT 'Call',
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      interest_level TEXT NOT NULL DEFAULT 'Medium',
      next_action_date TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      audio TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_key);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_created ON follow_ups(created_at);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

    CREATE TABLE IF NOT EXISTS customer_dobs (
      customer_key TEXT PRIMARY KEY,
      dob TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id TEXT PRIMARY KEY,
      customer_key TEXT NOT NULL,
      year INTEGER NOT NULL,
      gift_description TEXT DEFAULT '',
      interaction_date TEXT NOT NULL,
      staff_name TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(customer_key, year)
    );

    CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON redemptions(customer_key);
    CREATE INDEX IF NOT EXISTS idx_redemptions_year ON redemptions(year DESC);

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      row_count INTEGER,
      status TEXT NOT NULL,
      error TEXT,
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced_at DESC);
  `);

  // Load views and triggers from schema.sql if available
  if (fs.existsSync(SCHEMA_PATH)) {
    try {
      const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      // Extract CREATE VIEW and CREATE TRIGGER blocks (they end with END;)
      const viewMatches = schemaSql.match(/CREATE\s+VIEW\s+[^;]+;/gi) || [];
      const triggerMatches = schemaSql.match(/CREATE\s+TRIGGER\s+[\s\S]*?END;/gi) || [];
      const statements = [...viewMatches, ...triggerMatches];
      for (const stmt of statements) {
        try {
          database.exec(stmt);
        } catch {
          // Views/triggers may already exist — safe to skip
        }
      }
    } catch {
      // Schema file is optional — core tables already created above
    }
  }

  return database;
};
