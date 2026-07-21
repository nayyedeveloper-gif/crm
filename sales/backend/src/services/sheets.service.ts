import Papa from 'papaparse';
import type { SaleRow, TargetSheetData, ShopTarget, CategoryTarget } from '../types/index.js';
import { getCached, setCached, clearCache, getCacheInfo } from './cache.service.js';

const SALES_CACHE_KEY = 'sales_data';
const TARGETS_CACHE_KEY = 'targets_data';

const buildFetchUrl = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cachebust=${Date.now()}`;
};

export const fetchSalesData = async (): Promise<{ rows: SaleRow[]; cached: boolean; lastUpdated: string }> => {
  const cached = getCached<SaleRow[]>(SALES_CACHE_KEY);
  if (cached) {
    const info = getCacheInfo(SALES_CACHE_KEY);
    return {
      rows: cached,
      cached: true,
      lastUpdated: info ? new Date(info.age + Date.now() - info.age).toISOString() : new Date().toISOString(),
    };
  }

  const url = process.env.SALES_SHEET_URL;
  if (!url) throw new Error('SALES_SHEET_URL is not configured');

  const response = await fetch(buildFetchUrl(url), { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sales data: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  if (!csvText || csvText.trim().startsWith('<!DOCTYPE html>')) {
    throw new Error('Received HTML instead of CSV. Make sure the Google Sheet is published to the web.');
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/\s+/g, ' '),
      complete: (results) => {
        const validData = (results.data as SaleRow[]).filter(
          (row) => row.Timestamp || row.Date || row['Branch အမည်']
        );
        if (validData.length === 0) {
          reject(new Error('No valid data found in the CSV'));
          return;
        }
        setCached(SALES_CACHE_KEY, validData);
        resolve({ rows: validData, cached: false, lastUpdated: new Date().toISOString() });
      },
      error: (err: Error) => reject(err),
    });
  });
};

const parseNumericCell = (value: string | undefined): number => {
  if (!value) return 0;
  const cleaned = String(value).replace(/[,$]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const normalizeBranchName = (name: string): string => {
  return name.toLowerCase().replace(/^29\s*/i, '').replace(/\s+/g, ' ').trim();
};

export const fetchTargetData = async (): Promise<{ data: TargetSheetData; cached: boolean; lastUpdated: string }> => {
  const cached = getCached<TargetSheetData>(TARGETS_CACHE_KEY);
  if (cached) {
    const info = getCacheInfo(TARGETS_CACHE_KEY);
    return {
      data: cached,
      cached: true,
      lastUpdated: info ? new Date(info.age + Date.now() - info.age).toISOString() : new Date().toISOString(),
    };
  }

  const url = process.env.TARGET_SHEET_URL;
  if (!url) throw new Error('TARGET_SHEET_URL is not configured');

  const response = await fetch(buildFetchUrl(url), { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to fetch target data: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  if (!csvText || csvText.trim().startsWith('<!DOCTYPE html>')) {
    throw new Error('Received HTML instead of CSV for target sheet');
  }

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 3) {
    throw new Error('Target sheet does not contain enough rows');
  }

  const dataRows = lines.slice(2);
  const shops: Record<string, ShopTarget> = {};
  let total: Omit<ShopTarget, 'shop'> | null = null;

  dataRows.forEach((line) => {
    const cols = parseCsvLine(line);
    if (cols.length < 11) return;
    const shop = (cols[0] || '').trim();
    if (!shop) return;

    const entry: ShopTarget = {
      shop,
      diamond: { qty: parseNumericCell(cols[1]), amount: parseNumericCell(cols[2]) },
      pt: { qty: parseNumericCell(cols[3]), amount: parseNumericCell(cols[4]) },
      gold15: { qty: parseNumericCell(cols[5]), amount: parseNumericCell(cols[6]) },
      gold16: { qty: parseNumericCell(cols[7]), amount: parseNumericCell(cols[8]) },
      total: { qty: parseNumericCell(cols[9]), amount: parseNumericCell(cols[10]) },
    };

    if (shop.toLowerCase() === 'total') {
      total = { diamond: entry.diamond, pt: entry.pt, gold15: entry.gold15, gold16: entry.gold16, total: entry.total };
    } else {
      shops[normalizeBranchName(shop)] = entry;
      if (shop !== normalizeBranchName(shop)) shops[shop] = entry;
    }
  });

  if (!total) {
    total = {
      diamond: { qty: 0, amount: 0 },
      pt: { qty: 0, amount: 0 },
      gold15: { qty: 0, amount: 0 },
      gold16: { qty: 0, amount: 0 },
      total: { qty: 0, amount: 0 },
    };
    Object.values(shops).forEach((s) => {
      total!.diamond.qty += s.diamond.qty;
      total!.diamond.amount += s.diamond.amount;
      total!.pt.qty += s.pt.qty;
      total!.pt.amount += s.pt.amount;
      total!.gold15.qty += s.gold15.qty;
      total!.gold15.amount += s.gold15.amount;
      total!.gold16.qty += s.gold16.qty;
      total!.gold16.amount += s.gold16.amount;
      total!.total.qty += s.total.qty;
      total!.total.amount += s.total.amount;
    });
  }

  const data: TargetSheetData = { month: new Date().toLocaleString('en-US', { month: 'long' }), total, shops };
  setCached(TARGETS_CACHE_KEY, data);
  return { data, cached: false, lastUpdated: new Date().toISOString() };
};

export const refreshAllSheets = async (): Promise<void> => {
  clearCache(SALES_CACHE_KEY);
  clearCache(TARGETS_CACHE_KEY);
  await Promise.allSettled([fetchSalesData(), fetchTargetData()]);
};
