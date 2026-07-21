import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import { fetchSalesData, fetchTargetData, refreshAllSheets } from '../src/services/sheets.service.js';

dotenv.config();

const OUTPUT_DIR = path.resolve(process.cwd(), 'exports');

type ExportFormat = 'json' | 'csv' | 'sql';

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const rowsToCsv = (rows: Record<string, any>[]): string => {
  if (rows.length === 0) return '';
  return Papa.unparse(rows, { skipEmptyLines: true });
};

const generateSqlBackup = (salesRows: any[], targetData: any, ts: string) => {
  const filePath = path.join(OUTPUT_DIR, `backup_${ts}.sql`);
  const lines: string[] = [];

  lines.push('-- Google Sheets Backup');
  lines.push(`-- Exported at: ${new Date().toISOString()}`);
  lines.push(`-- Sales rows: ${salesRows.length.toLocaleString()}`);
  lines.push(`-- Target shops: ${Object.keys(targetData.shops).length.toLocaleString()}`);
  lines.push('');

  lines.push('CREATE TABLE IF NOT EXISTS sales_export_archive (');
  lines.push('  id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('  exported_at TEXT NOT NULL,');
  lines.push('  raw_json TEXT NOT NULL');
  lines.push(');');
  lines.push('');

  lines.push('CREATE TABLE IF NOT EXISTS target_export_archive (');
  lines.push('  id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('  exported_at TEXT NOT NULL,');
  lines.push('  month TEXT,');
  lines.push('  shop TEXT,');
  lines.push('  diamond_qty REAL,');
  lines.push('  diamond_amount REAL,');
  lines.push('  pt_qty REAL,');
  lines.push('  pt_amount REAL,');
  lines.push('  gold15_qty REAL,');
  lines.push('  gold15_amount REAL,');
  lines.push('  gold16_qty REAL,');
  lines.push('  gold16_amount REAL,');
  lines.push('  total_qty REAL,');
  lines.push('  total_amount REAL');
  lines.push(');');
  lines.push('');

  const exportedAt = new Date().toISOString();
  const salesJson = JSON.stringify(salesRows).replace(/'/g, "''");
  lines.push(`INSERT INTO sales_export_archive (exported_at, raw_json) VALUES ('${exportedAt}', '${salesJson}');`);
  lines.push('');

  const insertTarget = (shop: string, s: any) => {
    const escape = (v: any) => (typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`);
    lines.push(
      `INSERT INTO target_export_archive (exported_at, month, shop, diamond_qty, diamond_amount, pt_qty, pt_amount, gold15_qty, gold15_amount, gold16_qty, gold16_amount, total_qty, total_amount) VALUES ` +
      `('${exportedAt}', '${targetData.month}', ${escape(shop)}, ${s.diamond.qty}, ${s.diamond.amount}, ${s.pt.qty}, ${s.pt.amount}, ${s.gold15.qty}, ${s.gold15.amount}, ${s.gold16.qty}, ${s.gold16.amount}, ${s.total.qty}, ${s.total.amount});`
    );
  };

  insertTarget('Total', targetData.total);
  Object.values(targetData.shops).forEach((s: any) => insertTarget(s.shop, s));

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`   🛡 SQL Backup: ${filePath}`);
};

const loadSalesFromFile = (filePath: string): { rows: any[]; lastUpdated: string } => {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const parsed = JSON.parse(raw);
  return {
    rows: parsed.data || parsed,
    lastUpdated: parsed.meta?.lastUpdated || new Date().toISOString(),
  };
};

const loadTargetsFromFile = (filePath: string): { data: any; lastUpdated: string } => {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const parsed = JSON.parse(raw);
  return {
    data: parsed.data || parsed,
    lastUpdated: parsed.meta?.lastUpdated || new Date().toISOString(),
  };
};

const run = async () => {
  const args = process.argv.slice(2);
  const formats: ExportFormat[] = ['json', 'csv'];
  if (args.includes('--sql') || args.includes('-s')) formats.push('sql');
  if (args.includes('--json-only')) formats.splice(0, formats.length, 'json');
  if (args.includes('--csv-only')) formats.splice(0, formats.length, 'csv');

  const salesSource = args.find((a) => a.startsWith('--sales-source='))?.split('=')[1];
  const targetsSource = args.find((a) => a.startsWith('--targets-source='))?.split('=')[1];
  const skipFetch = args.includes('--skip-fetch');

  ensureDir(OUTPUT_DIR);

  if (!skipFetch && !salesSource && !targetsSource) {
    await refreshAllSheets();
  }

  const ts = timestamp();
  console.log(`\n🗄 Starting export to: ${OUTPUT_DIR}`);
  console.log(`   Formats: ${formats.join(', ')}`);
  if (salesSource) console.log(`   Sales source: ${salesSource}`);
  if (targetsSource) console.log(`   Targets source: ${targetsSource}`);
  console.log('');

  try {
    let salesRows: any[];
    let targetData: any;
    let salesLastUpdated: string;
    let targetsLastUpdated: string;

    if (salesSource) {
      const loaded = loadSalesFromFile(salesSource);
      salesRows = loaded.rows;
      salesLastUpdated = loaded.lastUpdated;
      console.log(`📄 Loaded ${salesRows.length.toLocaleString()} sales rows from ${salesSource}`);
    } else {
      const result = await fetchSalesData();
      salesRows = result.rows;
      salesLastUpdated = result.lastUpdated;
      console.log(`   ✓ ${salesRows.length.toLocaleString()} sales rows fetched`);
    }

    if (targetsSource) {
      const loaded = loadTargetsFromFile(targetsSource);
      targetData = loaded.data;
      targetsLastUpdated = loaded.lastUpdated;
      console.log(`📄 Loaded target data from ${targetsSource}`);
    } else {
      const result = await fetchTargetData();
      targetData = result.data;
      targetsLastUpdated = result.lastUpdated;
      console.log(`   ✓ ${Object.keys(targetData.shops).length.toLocaleString()} target shops fetched`);
    }

    const baseName = `sales_${ts}`;
    const targetsBaseName = `targets_${ts}`;

    if (formats.includes('json')) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${baseName}.json`),
        JSON.stringify({
          meta: { source: process.env.SALES_SHEET_URL, exportedAt: new Date().toISOString(), lastUpdated: salesLastUpdated, rowCount: salesRows.length },
          data: salesRows,
        }, null, 2),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${targetsBaseName}.json`),
        JSON.stringify({
          meta: { source: process.env.TARGET_SHEET_URL, exportedAt: new Date().toISOString(), lastUpdated: targetsLastUpdated, shopCount: Object.keys(targetData.shops).length },
          data: targetData,
        }, null, 2),
        'utf-8'
      );
      console.log(`   📝 JSON: ${baseName}.json, ${targetsBaseName}.json`);
    }

    if (formats.includes('csv')) {
      const cleanRows = salesRows.map((r) => {
        const clean: Record<string, any> = {};
        for (const [key, value] of Object.entries(r)) {
          clean[key] = typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
        }
        return clean;
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, `${baseName}.csv`), rowsToCsv(cleanRows), 'utf-8');

      const targetRows = [
        { shop: 'Total', diamond_qty: targetData.total.diamond.qty, diamond_amount: targetData.total.diamond.amount, pt_qty: targetData.total.pt.qty, pt_amount: targetData.total.pt.amount, gold15_qty: targetData.total.gold15.qty, gold15_amount: targetData.total.gold15.amount, gold16_qty: targetData.total.gold16.qty, gold16_amount: targetData.total.gold16.amount, total_qty: targetData.total.total.qty, total_amount: targetData.total.total.amount },
        ...Object.values(targetData.shops).map((s: any) => ({ shop: s.shop, diamond_qty: s.diamond.qty, diamond_amount: s.diamond.amount, pt_qty: s.pt.qty, pt_amount: s.pt.amount, gold15_qty: s.gold15.qty, gold15_amount: s.gold15.amount, gold16_qty: s.gold16.qty, gold16_amount: s.gold16.amount, total_qty: s.total.qty, total_amount: s.total.amount })),
      ];
      fs.writeFileSync(path.join(OUTPUT_DIR, `${targetsBaseName}.csv`), rowsToCsv(targetRows), 'utf-8');
      console.log(`   📝 CSV: ${baseName}.csv, ${targetsBaseName}.csv`);
    }

    if (formats.includes('sql')) {
      console.log('\n🛡 Generating SQL backup...');
      generateSqlBackup(salesRows, targetData, ts);
    }

    console.log('\n✅ Export complete');
  } catch (err: any) {
    console.error('\n❌ Export failed:', err.message);
    console.error('   Hint: If the Google Sheet is not accessible, download a CSV/JSON export and use --sales-source=path/to/file.json');
    process.exit(1);
  }
};

run();
