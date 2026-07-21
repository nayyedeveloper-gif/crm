import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fetchSalesData, fetchTargetData } from '../src/services/sheets.service.js';
import { getDb, initDb } from '../src/db/database.js';

dotenv.config();

interface SyncOptions {
  reset: boolean;
  dryRun: boolean;
  salesSource?: string;
  targetsSource?: string;
}

const parseSafeDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
};

const parseNumeric = (value: any): number => {
  if (value == null || value === '') return 0;
  const num = parseFloat(String(value).replace(/[,$]/g, '').trim());
  return isNaN(num) ? 0 : num;
};

const sanitizePhone = (value: any): string => {
  if (!value) return '';
  return String(value).trim();
};

const detectReason = (row: any): string => {
  const reasons: string[] = [];
  const reasonRaw =
    row['ဆိုင်သို့လာသောအကြောင်းအရင်း'] ||
    row['အကြောင်းအရာ'] ||
    row['Reason'] ||
    row['reason'] ||
    row['အကြောင်းရာ'] ||
    '';
  if (reasonRaw) reasons.push(String(reasonRaw).trim());

  // Heuristic: detect sale categories from item/amount fields
  const amount = parseNumeric(row['Amount'] || row['တန်ဖိုးမြောက်'] || row['Total']);
  if (amount > 0) {
    const item = row['Item Category'] || row['Item Main Group'] || row['အမျိုးအစား'] || '';
    const itemLower = String(item).toLowerCase();
    if (itemLower.includes('gold') || itemLower.includes('ရွှေ')) reasons.push('G Sale');
    if (itemLower.includes('dia') || itemLower.includes('စိန်')) reasons.push('Dia Sale');
    if (itemLower.includes('pt') || itemLower.includes('ပက်တက်ရမ်')) reasons.push('PT Sale');
  }

  // Default if still empty
  if (reasons.length === 0) return 'Other';
  return reasons[0];
};

const syncSalesToDb = async (db: any, options: SyncOptions) => {
  let rows: any[] = [];
  if (options.salesSource) {
    const raw = fs.readFileSync(options.salesSource, 'utf-8');
    const parsed = JSON.parse(raw);
    rows = parsed.data || parsed;
    console.log(`📄 Loaded ${rows.length.toLocaleString()} rows from ${options.salesSource}`);
  } else {
    const result = await fetchSalesData();
    rows = result.rows;
    console.log(`🌐 Fetched ${rows.length.toLocaleString()} rows from Google Sheets`);
  }

  if (options.dryRun) {
    console.log('   [dry-run] Would insert into sheet_sales_archive');
    return;
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sheet_sales_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      date TEXT,
      branch TEXT,
      customer_service TEXT,
      counter_staff TEXT,
      salesperson TEXT,
      customer_name TEXT,
      group_size TEXT,
      reason TEXT,
      item_type TEXT,
      amount REAL,
      qty REAL,
      gram REAL,
      purity TEXT,
      phone TEXT,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    )
  `).run();

  if (options.reset) {
    db.prepare('DELETE FROM sheet_sales_archive').run();
    console.log('   🗑 Existing sales archive cleared');
  }

  const insert = db.prepare(`
    INSERT INTO sheet_sales_archive (
      timestamp, date, branch, customer_service, counter_staff, salesperson,
      customer_name, group_size, reason, item_type, amount, qty, gram, purity, phone, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const insertedAt = new Date().toISOString();

  const insertMany = db.transaction((salesRows: any[]) => {
    for (const row of salesRows) {
      const dateStr = row.Date || row.Timestamp?.split(' ')[0];
      const parsedDate = parseSafeDate(dateStr);
      insert.run(
        row.Timestamp || '',
        row.Date || '',
        row['Branch အမည်'] || '',
        row['Customer Service အမည်'] || '',
        row['ပို့ဆောင်ပေးခဲ့သော အရောင်းကောင်တာ တာဝန်ခံ အမည်'] || '',
        row['အရောင်းသမားအမည်'] || '',
        row['ဝယ်သူ အမည်'] || '',
        row['တဖွဲ့တွင်ပါဝင်သောလူဦးရေ'] || '',
        detectReason(row),
        row['Item Category'] || row['Item Main Group'] || row['အမျိုးအစား'] || '',
        parseNumeric(row['Amount'] || row['တန်ဖိုးမြောက်'] || row['Total']),
        parseNumeric(row['Qty'] || row['ပမာဏ'] || row['Quantity']),
        parseNumeric(row['Gram'] || row['ဂရမ်'] || row['Weight']),
        row['ပဲရည်'] || row['ပဲရည် '] || row['Purity'] || '',
        sanitizePhone(row['Phone'] || row['ဖုန်းနံပါတ်'] || ''),
        JSON.stringify(row),
        insertedAt
      );
    }
  });

  insertMany(rows);
  console.log(`   ✓ ${rows.length.toLocaleString()} sales rows archived`);

  // Log sync
  db.prepare('INSERT INTO sync_log (source, row_count, status, synced_at) VALUES (?, ?, ?, ?)')
    .run('sales', rows.length, 'success', now);
};

const syncTargetsToDb = async (db: any, options: SyncOptions) => {
  let data: any;
  if (options.targetsSource) {
    const raw = fs.readFileSync(options.targetsSource, 'utf-8');
    data = JSON.parse(raw).data || JSON.parse(raw);
    console.log(`📄 Loaded targets from ${options.targetsSource}`);
  } else {
    const result = await fetchTargetData();
    data = result.data;
    console.log('🌐 Fetched target sheet data from Google Sheets');
  }

  if (options.dryRun) {
    console.log('   [dry-run] Would insert into sheet_targets_archive');
    return;
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sheet_targets_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      shop TEXT NOT NULL,
      is_total INTEGER DEFAULT 0,
      diamond_qty REAL,
      diamond_amount REAL,
      pt_qty REAL,
      pt_amount REAL,
      gold15_qty REAL,
      gold15_amount REAL,
      gold16_qty REAL,
      gold16_amount REAL,
      total_qty REAL,
      total_amount REAL,
      synced_at TEXT NOT NULL,
      UNIQUE(month, shop)
    )
  `).run();

  if (options.reset) {
    db.prepare('DELETE FROM sheet_targets_archive').run();
    console.log('   🗑 Existing targets archive cleared');
  }

  const insert = db.prepare(`
    INSERT INTO sheet_targets_archive (
      month, shop, is_total, diamond_qty, diamond_amount, pt_qty, pt_amount,
      gold15_qty, gold15_amount, gold16_qty, gold16_amount, total_qty, total_amount, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(month, shop) DO UPDATE SET
      diamond_qty = excluded.diamond_qty,
      diamond_amount = excluded.diamond_amount,
      pt_qty = excluded.pt_qty,
      pt_amount = excluded.pt_amount,
      gold15_qty = excluded.gold15_qty,
      gold15_amount = excluded.gold15_amount,
      gold16_qty = excluded.gold16_qty,
      gold16_amount = excluded.gold16_amount,
      total_qty = excluded.total_qty,
      total_amount = excluded.total_amount,
      synced_at = excluded.synced_at
  `);

  const now = new Date().toISOString();

  const insertMany = db.transaction((entries: any[]) => {
    for (const entry of entries) insert.run(...entry);
  });

  const entries: any[] = [
    [
      data.month, 'Total', 1,
      data.total.diamond.qty, data.total.diamond.amount,
      data.total.pt.qty, data.total.pt.amount,
      data.total.gold15.qty, data.total.gold15.amount,
      data.total.gold16.qty, data.total.gold16.amount,
      data.total.total.qty, data.total.total.amount,
      now,
    ],
    ...Object.values(data.shops).map((s: any) => [
      data.month, s.shop, 0,
      s.diamond.qty, s.diamond.amount,
      s.pt.qty, s.pt.amount,
      s.gold15.qty, s.gold15.amount,
      s.gold16.qty, s.gold16.amount,
      s.total.qty, s.total.amount,
      now,
    ]),
  ];

  insertMany(entries);
  console.log(`   ✓ ${entries.length.toLocaleString()} target entries archived`);

  db.prepare('INSERT INTO sync_log (source, row_count, status, synced_at) VALUES (?, ?, ?, ?)')
    .run('targets', entries.length, 'success', now);
};

const run = async () => {
  const args = process.argv.slice(2);
  const salesSourceArg = args.find((a) => a.startsWith('--sales-source='));
  const targetsSourceArg = args.find((a) => a.startsWith('--targets-source='));
  const legacySourceArg = args.find((a) => a.startsWith('--source='));

  const options: SyncOptions = {
    reset: args.includes('--reset'),
    dryRun: args.includes('--dry-run'),
    salesSource: salesSourceArg ? salesSourceArg.split('=')[1] : legacySourceArg?.includes('sales') ? legacySourceArg.split('=')[1] : undefined,
    targetsSource: targetsSourceArg ? targetsSourceArg.split('=')[1] : legacySourceArg?.includes('targets') ? legacySourceArg.split('=')[1] : undefined,
  };

  console.log('\n📦 Google Sheets → Database Sync');
  console.log(`   Reset: ${options.reset}`);
  console.log(`   Dry run: ${options.dryRun}`);
  console.log(`   Sales source: ${options.salesSource || 'Google Sheets'}`);
  console.log(`   Targets source: ${options.targetsSource || 'Google Sheets'}\n`);

  const db = initDb();

  try {
    await syncSalesToDb(db, options);
    await syncTargetsToDb(db, options);

    console.log('\n✅ Sync complete');
  } catch (err: any) {
    console.error('\n❌ Sync failed:', err.message);
    // Log error
    try {
      db.prepare('INSERT INTO sync_log (source, status, error, synced_at) VALUES (?, ?, ?, ?)')
        .run('sync', 'error', err.message, new Date().toISOString());
    } catch {}
    process.exit(1);
  }
};

run();
