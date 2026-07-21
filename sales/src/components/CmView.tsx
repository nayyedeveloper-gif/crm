import React, { useMemo, useState, Fragment, memo, useCallback, useEffect, useRef } from'react';
import { Download, Building2, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Search, Calendar, Maximize2, Minimize2 } from'lucide-react';
import { DataRow } from'../types';
import { branchFilterShowsAll, formatGramValue, getExtractedReason, gramToKpy, GRAMS_PER_KYATTHAR, parseNumericCell, parseSafeDate } from'../utils';
import * as XLSX from'xlsx';
interface CmViewProps {
 data: DataRow[];
 allData?: DataRow[];
 selectedMonth: string;
 selectedBranches: string[];
 highPerformanceMode?: boolean;
 initialViewMode?: ViewMode;
 fixedViewMode?: ViewMode;
 monthMode?: 'current' |'all';
 cusListAsTable?: boolean;
}

type ItemSaleAmountRange ='<30' |'30-50' |'50-100' |'100+';

/** Shared Item Sale / Item Rate — သိန်း units (1 သိန်း = 100,000 MMK): 30 / 50 / 100 သိန်း */
const ITEM_AMOUNT_THRESHOLDS = {
 low: 30 * 100_000, // သိန်း 30 = 3,000,000
 mid: 50 * 100_000, // သိန်း 50 = 5,000,000
 high: 100 * 100_000, // သိန်း 100 = 10,000,000
} as const;

const matchesItemAmountRange = (amount: number, range: ItemSaleAmountRange | null) => {
 if (!range) return true;
 if (range ==='<30') return amount < ITEM_AMOUNT_THRESHOLDS.low;
 if (range ==='30-50') return amount >= ITEM_AMOUNT_THRESHOLDS.low && amount < ITEM_AMOUNT_THRESHOLDS.mid;
 if (range ==='50-100') return amount >= ITEM_AMOUNT_THRESHOLDS.mid && amount < ITEM_AMOUNT_THRESHOLDS.high;
 return amount >= ITEM_AMOUNT_THRESHOLDS.high;
};

const getItemRateAmountRangeKey = (amount: number): ItemSaleAmountRange => {
 if (amount < ITEM_AMOUNT_THRESHOLDS.low) return'<30';
 if (amount < ITEM_AMOUNT_THRESHOLDS.mid) return'30-50';
 if (amount < ITEM_AMOUNT_THRESHOLDS.high) return'50-100';
 return'100+';
};

const ITEM_AMOUNT_RANGE_OPTIONS: { range: ItemSaleAmountRange; label: string }[] = [
 { range: '<30', label: 'သိန်း 30 အောက်' },
 { range: '30-50', label: 'သိန်း 30-50ကြား' },
 { range: '50-100', label: 'သိန်း 50-100ကြား' },
 { range: '100+', label: 'သိန်း 100 အထက်' },
];

const ITEM_RATE_RANGE_COLUMNS: { key: ItemSaleAmountRange; label: string }[] = [
 { key: '<30', label: 'သိန်း 30 အောက်' },
 { key: '30-50', label: 'သိန်း 30-50ကြား' },
 { key: '50-100', label: 'သိန်း 50-100ကြား' },
 { key: '100+', label: 'သိန်း 100 အထက်' },
];

const emptyItemRateQtys = (): Record<ItemSaleAmountRange, number> => ({
'<30': 0,
'30-50': 0,
'50-100': 0,
'100+': 0,
});

const getItemRateCellClass = (key: ItemSaleAmountRange, active: boolean) => {
 if (!active) return'text-[#8c8c8c]';
 if (key ==='<30') return'bg-gray-100 text-[#8c8c8c] border border-[#e8e8e8]';
 if (key ==='30-50') return'bg-amber-50 text-amber-700 border border-amber-200';
 if (key ==='50-100') return'bg-sky-50 text-sky-700 border border-sky-200';
 return'bg-violet-50 text-violet-700 border border-violet-200';
};

/** Gold weight price ranges in Pae (P) / Kyat (K). 1K = 16.329g, 1K = 16P */
const GRAMS_PER_PAE = GRAMS_PER_KYATTHAR / 16;

type GoldPriceRangeKey =
 |'below_1p' |'1p_2p' |'2p_4p' |'4p_6p' |'6p_8p' |'8p_12p'
 |'12p_1k' |'1k_1k8p' |'1k8p_2k' |'2k_3k' |'3k_4k'
 |'4k_5k' |'5k_6k' |'6k_7k' |'7k_8k' |'8k_9k'
 |'9k_10k' |'above_10k';

const GOLD_PRICE_RANGES: { key: GoldPriceRangeKey; label: string; minGram: number; maxGram: number }[] = [
 { key: 'below_1p', label: '1P အောက်', minGram: 0, maxGram: 1 * GRAMS_PER_PAE },
 { key: '1p_2p', label: '1P-2P', minGram: 1 * GRAMS_PER_PAE, maxGram: 2 * GRAMS_PER_PAE },
 { key: '2p_4p', label: '2P-4P', minGram: 2 * GRAMS_PER_PAE, maxGram: 4 * GRAMS_PER_PAE },
 { key: '4p_6p', label: '4P-6P', minGram: 4 * GRAMS_PER_PAE, maxGram: 6 * GRAMS_PER_PAE },
 { key: '6p_8p', label: '6P-8P', minGram: 6 * GRAMS_PER_PAE, maxGram: 8 * GRAMS_PER_PAE },
 { key: '8p_12p', label: '8P-12P', minGram: 8 * GRAMS_PER_PAE, maxGram: 12 * GRAMS_PER_PAE },
 { key: '12p_1k', label: '12P-1K', minGram: 12 * GRAMS_PER_PAE, maxGram: GRAMS_PER_KYATTHAR },
 { key: '1k_1k8p', label: '1K-1K 8P', minGram: GRAMS_PER_KYATTHAR, maxGram: GRAMS_PER_KYATTHAR + 8 * GRAMS_PER_PAE },
 { key: '1k8p_2k', label: '1K 8P-2K', minGram: GRAMS_PER_KYATTHAR + 8 * GRAMS_PER_PAE, maxGram: 2 * GRAMS_PER_KYATTHAR },
 { key: '2k_3k', label: '2K-3K', minGram: 2 * GRAMS_PER_KYATTHAR, maxGram: 3 * GRAMS_PER_KYATTHAR },
 { key: '3k_4k', label: '3K-4K', minGram: 3 * GRAMS_PER_KYATTHAR, maxGram: 4 * GRAMS_PER_KYATTHAR },
 { key: '4k_5k', label: '4K-5K', minGram: 4 * GRAMS_PER_KYATTHAR, maxGram: 5 * GRAMS_PER_KYATTHAR },
 { key: '5k_6k', label: '5K-6K', minGram: 5 * GRAMS_PER_KYATTHAR, maxGram: 6 * GRAMS_PER_KYATTHAR },
 { key: '6k_7k', label: '6K-7K', minGram: 6 * GRAMS_PER_KYATTHAR, maxGram: 7 * GRAMS_PER_KYATTHAR },
 { key: '7k_8k', label: '7K-8K', minGram: 7 * GRAMS_PER_KYATTHAR, maxGram: 8 * GRAMS_PER_KYATTHAR },
 { key: '8k_9k', label: '8K-9K', minGram: 8 * GRAMS_PER_KYATTHAR, maxGram: 9 * GRAMS_PER_KYATTHAR },
 { key: '9k_10k', label: '9K-10K', minGram: 9 * GRAMS_PER_KYATTHAR, maxGram: 10 * GRAMS_PER_KYATTHAR },
 { key: 'above_10k', label: '10K ထက်', minGram: 10 * GRAMS_PER_KYATTHAR, maxGram: Infinity },
];

const getGoldPriceRangeKey = (gram: number): GoldPriceRangeKey => {
 for (const range of GOLD_PRICE_RANGES) {
 if (gram >= range.minGram && gram < range.maxGram) return range.key;
 }
 return'above_10k';
};

const emptyGoldPriceRangeQtys = (): Record<GoldPriceRangeKey, number> => {
 const obj = {} as Record<GoldPriceRangeKey, number>;
 GOLD_PRICE_RANGES.forEach(({ key }) => { obj[key] = 0; });
 return obj;
};

type GoldRateItemData = {
 itemMainGroup: string;
 branchQtys: Record<string, number>;
 totalQty: number;
 rangeData: Record<GoldPriceRangeKey, { branchQtys: Record<string, number>; totalQty: number }>;
};

type GoldRateTypeData = {
 items: GoldRateItemData[];
 totalQty: number;
 branchQtys: Record<string, number>;
};

type GoldRateAggregation = {
 branches: string[];
 goldTypes: { gold15: GoldRateTypeData | null; gold16: GoldRateTypeData | null };
};

const EMPTY_GOLD_RATE: GoldRateAggregation = {
 branches: [],
 goldTypes: { gold15: null, gold16: null },
};

const buildGoldRateAggregation = (
 source: DataRow[],
 selectedBranches: string[],
 branchFilter: string | null,
 monthFilter: string | null,
 monthMode: 'current' |'all',
): GoldRateAggregation => {
 if (source.length === 0) return EMPTY_GOLD_RATE;

 const groupKey = getItemMainGroupKey(source[0]);
 const purityKey = getPurityColumnKey(source[0]);
 const showAllBranches = branchFilterShowsAll(selectedBranches);

 const branchSet = new Set<string>();
 const gold15Map = new Map<string, GoldRateItemData>();
 const gold16Map = new Map<string, GoldRateItemData>();
 const gold15BranchQtys: Record<string, number> = {};
 const gold16BranchQtys: Record<string, number> = {};
 let gold15Total = 0;
 let gold16Total = 0;

 const getOrCreateItem = (map: Map<string, GoldRateItemData>, itemMainGroup: string): GoldRateItemData => {
 let item = map.get(itemMainGroup);
 if (!item) {
 const rangeData = {} as Record<GoldPriceRangeKey, { branchQtys: Record<string, number>; totalQty: number }>;
 GOLD_PRICE_RANGES.forEach(({ key }) => {
 rangeData[key] = { branchQtys: {}, totalQty: 0 };
 });
 item = { itemMainGroup, branchQtys: {}, totalQty: 0, rangeData };
 map.set(itemMainGroup, item);
 }
 return item;
 };

 for (let i = 0; i < source.length; i++) {
 const row = source[i];
 const reason = (getExtractedReason(row) ||'').trim();

 // Only Gold Sale rows
 if (!GOLD_SALE_REASONS.has(reason)) continue;

 // Branch filter
 if (!showAllBranches && !selectedBranches.includes(row['Branch အမည်'] ||'')) continue;
 if (branchFilter && (row['Branch အမည်'] ||'') !== branchFilter) continue;

 // Month filter
 if (monthFilter) {
 const rowMonth = getRowMonthName(row);
 if (rowMonth !== monthFilter) continue;
 }

 const branch = row['Branch အမည်'] ||'Unknown';
 const mainGroup = getItemMainGroupValue(row, groupKey);
 if (!mainGroup) continue;

 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 const isGold16 = goldCat ==='၁၆ပဲရည်';

 const { q, g } = parseRowQtyGram(row);
 if (q === 0) continue;

 branchSet.add(branch);
 const map = isGold16 ? gold16Map : gold15Map;
 const branchQtys = isGold16 ? gold16BranchQtys : gold15BranchQtys;
 const item = getOrCreateItem(map, mainGroup);

 // Level 1: item × branch totals
 item.branchQtys[branch] = (item.branchQtys[branch] || 0) + q;
 item.totalQty += q;

 // Level 2: item × range × branch
 const rangeKey = getGoldPriceRangeKey(g);
 const rangeEntry = item.rangeData[rangeKey];
 rangeEntry.branchQtys[branch] = (rangeEntry.branchQtys[branch] || 0) + q;
 rangeEntry.totalQty += q;

 // Gold type totals
 branchQtys[branch] = (branchQtys[branch] || 0) + q;
 if (isGold16) gold16Total += q; else gold15Total += q;
 }

 const buildTypeData = (
 map: Map<string, GoldRateItemData>,
 branchQtys: Record<string, number>,
 totalQty: number,
 ): GoldRateTypeData | null => {
 if (map.size === 0) return null;
 const items = Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
 return { items, totalQty, branchQtys };
 };

 return {
 branches: Array.from(branchSet).sort(),
 goldTypes: {
 gold15: buildTypeData(gold15Map, gold15BranchQtys, gold15Total),
 gold16: buildTypeData(gold16Map, gold16BranchQtys, gold16Total),
 },
 };
};

const getRowAmount = (row: DataRow) => {
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 return isNaN(amount) ? 0 : amount;
};

type MetricMode ='amount' |'gram' |'qty';
type ViewMode ='full' |'net' |'allBranch' |'itemSale' |'itemRate' |'cusList';
type SortField ='branchName' |'totalQty' |'totalSale' |'totalRc' |'netSale' |'diaSale' |'goldSale' |'gold15Sale' |'gold16Sale' |'ptSale' |'diaRc' |'goldRc' |'gold15Rc' |'gold16Rc' |'ptRc' |'diaSaleQty' |'diaSaleAmount' |'goldSaleQty' |'goldSaleAmount' |'gold15SaleQty' |'gold15SaleAmount' |'gold16SaleQty' |'gold16SaleAmount' |'ptSaleQty' |'ptSaleAmount' |'totalSaleQty' |'totalSaleAmount' |'diaRcQty' |'diaRcAmount' |'gold15RcQty' |'gold15RcAmount' |'gold16RcQty' |'gold16RcAmount' |'ptRcQty' |'ptRcAmount' |'totalRcQty' |'totalRcAmount' |'netSaleQty' |'netSaleAmount';
type SortOrder ='asc' |'desc';
type CusSortField ='totalQty' |'totalAmount' |'netSaleAmount';

const GOLD_SALE_REASONS = new Set(['G Sale','G Sale','Gold Sale','Gold Sale','Gold အရောင်း']);
const DIA_SALE_REASONS = new Set(['Dia Sale','Dia Sale','Dia အရောင်း']);
const PT_SALE_REASONS = new Set(['PT Sale','PT Sale','PT အရောင်း']);
const DIA_RC_REASONS = new Set(['Dia RC','Dia RC','Dia Rc','Dia Rc','Dia အဝယ်']);
const GOLD_RC_REASONS = new Set(['G RC','G RC','Gold RC','Gold RC','G Rc','G Rc','Gold Rc','Gold Rc','Gold အဝယ်']);
const PT_RC_REASONS = new Set(['PT RC','PT RC','PT Rc','PT Rc','PT အဝယ်']);

const SALE_REASONS = new Set([
'Dia Sale','Dia Sale','Dia အရောင်း',
'G Sale','G Sale','Gold Sale','Gold Sale','Gold အရောင်း',
'PT Sale','PT Sale','PT အရောင်း',
]);

const RC_REASONS = new Set([
'Dia RC','Dia RC','Dia Rc','Dia Rc','Dia အဝယ်',
'G RC','G RC','Gold RC','Gold RC','G Rc','G Rc','Gold Rc','Gold Rc','Gold အဝယ်',
'PT RC','PT RC','PT Rc','PT Rc','PT အဝယ်',
]);

type PurityCell = { qty: number; gram: number };

const emptyPurityCell = (): PurityCell => ({ qty: 0, gram: 0 });

const getPurityColumnKey = (sampleRow?: DataRow) => {
 if (!sampleRow) return'ပဲရည်';
 const keys = Object.keys(sampleRow);
 return (
 keys.find((k) => k.trim() ==='ပဲရည်') ||
 keys.find((k) => k.replace(/\s/g,'') ==='ပဲရည်') ||
 keys.find((k) => k.includes('ပဲရည်')) ||
'ပဲရည်'
 );
};

const getRowBranch = (row: DataRow) =>
 String(row['Branch'] ?? row['Branch'] ?? row['Branch အမည်'] ?? 'Unknown').trim();

const DEFAULT_DIAMOND_TARGET = 1000000; // Default 1,000,000 MMK per shop
const DEFAULT_PT_TARGET = 1000000; // Default 1,000,000 MMK per shop
const DEFAULT_GOLD_TARGET = 1000000; // Default 1,000,000 MMK per shop

const GOLD_PURITY_CATEGORIES = [
'၁၆ပဲရည်',
'၁၅ ပဲရည်',
];

const getGoldPurityCategory = (purity: string): string => {
 const p = purity.trim();
 if (p ==='၁၆ ပဲရည်' || p ==='16' || p ==='၁၆' || p ==='AC' || p ==='ac' || p.includes('စံချိန်မီရွှေ')) return'၁၆ပဲရည်';
 if (p ==='၁၅ ပဲရည်' || p ==='15' || p ==='၁၅' || p ==='အောက်ပဲရည်' || (parseFloat(p) > 0 && parseFloat(p) < 15)) return'၁၅ ပဲရည်';
 return p;
};

const getGoldTargetByPurity = (rows: DataRow[], purityCategory: string) => {
 const purityKey = getPurityColumnKey(rows[0]);
 const targets: Record<string, number> = {};
 rows.forEach((row) => {
 if (!isGoldSaleRow(row)) return;
 const purity = getPurityValue(row, purityKey);
 if (!purity) return;
 const category = getGoldPurityCategory(purity);
 if (category !== purityCategory) return;
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 targets[branch] = (targets[branch] || 0) + a;
 });
 return targets;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getPreviousMonthName = (selectedMonth: string) => {
 const currentIdx = MONTHS.indexOf(selectedMonth);
 return currentIdx > 0 ? MONTHS[currentIdx - 1] : MONTHS[11];
};

const getPreviousMonthTargets = (allData: DataRow[] | undefined, selectedMonth: string, reasons: string[]) => {
 const prevMonth = getPreviousMonthName(selectedMonth);
 const prevMonthTargets: Record<string, number> = {};
 if (allData && allData.length > 0) {
 allData.forEach((row) => {
 const rowDate = getRowDate(row);
 if (!rowDate) return;
 const rowMonth = rowDate.toLocaleDateString('en-US', { month: 'long' });
 if (rowMonth !== prevMonth) return;
 const rowReason = (getExtractedReason(row) ||'').trim();
 if (reasons.includes(rowReason)) {
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 prevMonthTargets[branch] = (prevMonthTargets[branch] || 0) + a;
 }
 });
 }
 return prevMonthTargets;
};

const getPurityValue = (row: DataRow, purityKey: string) => {
 const raw = row[purityKey] ?? row['ပဲရည်'] ?? row['ပဲရည်'];
 if (raw == null || String(raw).trim() ==='') return null;
 return String(raw).trim();
};

const sortPurityLabels = (labels: string[]) =>
 [...labels].sort((a, b) => {
 const numA = parseFloat(a);
 const numB = parseFloat(b);
 if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
 return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
 });

const isGoldSaleRow = (row: DataRow) => {
 const reason = (getExtractedReason(row) ||'').trim();
 return GOLD_SALE_REASONS.has(reason);
};

const isSaleReasonRow = (row: DataRow) => {
 const reason = (getExtractedReason(row) ||'').trim();
 return SALE_REASONS.has(reason);
};

const isRcReasonRow = (row: DataRow) => {
 const reason = (getExtractedReason(row) ||'').trim();
 return RC_REASONS.has(reason);
};

const getItemCategoryKey = (sampleRow?: DataRow) => {
 if (!sampleRow) return'Item Category';
 const keys = Object.keys(sampleRow);
 return (
 keys.find((k) => k.trim().toLowerCase() ==='item category') ||
 keys.find((k) => k.toLowerCase().includes('item category')) ||
'Item Category'
 );
};

const getItemCategoryValue = (row: DataRow, categoryKey: string) => {
 const raw =
 row[categoryKey] ??
 row['Item Category'] ??
 row['item category'] ??
 row['Item category'] ??
 row['ITEM CATEGORY'];
 if (raw == null || String(raw).trim() ==='') return null;
 return String(raw).trim();
};

const getItemMainGroupKey = (sampleRow?: DataRow) => {
 if (!sampleRow) return'Item Main Group';
 const keys = Object.keys(sampleRow);
 return (
 keys.find((k) => k.trim().replace(/\s+/g,'').toLowerCase() ==='item main group') ||
 keys.find((k) => k.toLowerCase().includes('main group')) ||
 keys.find((k) => k.trim().replace(/\s+/g,'').toLowerCase() ==='item category') ||
 keys.find((k) => k.toLowerCase() ==='category') ||
'Item Main Group'
 );
};

const getItemMainGroupValue = (row: DataRow, groupKey: string) => {
 const raw =
 row[groupKey] ??
 row['Item Main Group'] ??
 row['item main group'] ??
 row['Item Main group'] ??
 row['Item Category'] ??
 row['Category'];
 if (raw == null || String(raw).trim() ==='') return null;
 return String(raw).trim();
};

const findColumnKey = (sampleRow: DataRow | undefined, ...patterns: string[]) => {
 if (!sampleRow) return patterns[0];
 const keys = Object.keys(sampleRow);
 for (const pattern of patterns) {
 const found = keys.find((k) => k.trim().toLowerCase() === pattern.toLowerCase());
 if (found) return found;
 }
 for (const pattern of patterns) {
 const found = keys.find((k) => k.toLowerCase().includes(pattern.toLowerCase()));
 if (found) return found;
 }
 return patterns[0];
};

const getCellText = (value: unknown) => {
 if (value == null || String(value).trim() ==='') return'-';
 return String(value).trim();
};

const renderCellText = (value: unknown) => {
 const text = getCellText(value);
 return text ==='-' ? <span className="text-gray-400">-</span> : <span>{text}</span>;
};

const renderAmount = (amount: number) =>
 amount === 0 ? <span className="text-gray-400">-</span> : <span>{amount.toLocaleString()}</span>;

const formatCompactAmountValue = (amount: number): string => {
 if (amount === 0) return'-';
 const abs = Math.abs(amount);
 if (abs >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1).replace(/\.0$/,'') +'B';
 if (abs >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(/\.0$/,'') +'M';
 if (abs >= 1_000) return (amount / 1_000).toFixed(1).replace(/\.0$/,'') +'K';
 return String(amount);
};

const renderCompactAmount = (amount: number) => {
 if (amount === 0) return <span className="text-gray-400">-</span>;
 return <span>{formatCompactAmountValue(amount)}</span>;
};

const renderNetAmount = (amount: number) => {
 if (amount === 0) return <span className="text-gray-400">-</span>;
 return (
 <span className={amount < 0 ? 'text-rose-600 font-semibold' : 'text-blue-700 font-semibold'}>
 {amount.toLocaleString()}
 </span>
 );
};

const getRowDate = (row: DataRow) => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 return parseSafeDate(dateStr);
};

const MONTH_LONG_NAMES = [
'January','February','March','April','May','June',
'July','August','September','October','November','December',
] as const;

const getRowMonthName = (row: DataRow) => {
 const d = getRowDate(row);
 return d ? MONTH_LONG_NAMES[d.getMonth()] : '';
};

const EMPTY_ITEM_SALE_TOTALS = {
 saleQty: 0,
 saleGram: 0,
 saleAmount: 0,
 rcQty: 0,
 rcGram: 0,
 rcAmount: 0,
 totalQty: 0,
 totalGram: 0,
 totalAmount: 0,
};

type ItemCategorySalesResult = {
 rows: Array<{
 category: string;
 itemMainGroup: string;
 diaCategory: string;
 goldCategory: string;
 ptCategory: string;
 branch: string;
 saleQty: number;
 saleGram: number;
 saleAmount: number;
 rcQty: number;
 rcGram: number;
 rcAmount: number;
 totalQty: number;
 totalGram: number;
 totalAmount: number;
 branchBreakdown: Array<{
 branch: string;
 saleQty: number;
 saleGram: number;
 saleAmount: number;
 rcQty: number;
 rcGram: number;
 rcAmount: number;
 totalQty: number;
 totalGram: number;
 totalAmount: number;
 }>;
 }>;
 grandTotal: typeof EMPTY_ITEM_SALE_TOTALS;
 categoryKey: string;
 aggregateByCategoryOnly: boolean;
};

type ItemRateSalesResult = {
 rows: Array<{
 category: string;
 itemMainGroup: string;
 branch: string;
 qtys: Record<ItemSaleAmountRange, number>;
 totalQty: number;
 branchBreakdown: Array<{
 branch: string;
 qtys: Record<ItemSaleAmountRange, number>;
 totalQty: number;
 }>;
 }>;
 grandTotal: { qtys: Record<ItemSaleAmountRange, number>; totalQty: number };
 categoryKey: string;
 aggregateByCategoryOnly: boolean;
};

const EMPTY_ITEM_CATEGORY_SALES: ItemCategorySalesResult = {
 rows: [],
 grandTotal: EMPTY_ITEM_SALE_TOTALS,
 categoryKey: '-',
 aggregateByCategoryOnly: true,
};

const EMPTY_ITEM_RATE_SALES: ItemRateSalesResult = {
 rows: [],
 grandTotal: { qtys: emptyItemRateQtys(), totalQty: 0 },
 categoryKey: '-',
 aggregateByCategoryOnly: true,
};

type ItemAggOptions = {
 selectedBranches: string[];
 typeFilter: 'dia' |'pt' |'gold15' |'gold16' | null;
 branchFilter: string | null;
 monthFilter: string | null;
 amountFilter: ItemSaleAmountRange | null;
 computeSale: boolean;
 computeRate: boolean;
};

/** Single-pass Item Sale + Item Rate aggregation (skips work when compute flags are false). */
const buildItemSaleAndRateAggregates = (
 source: DataRow[],
 options: ItemAggOptions
): { itemCategorySales: ItemCategorySalesResult; itemRateSales: ItemRateSalesResult } => {
 const { computeSale, computeRate } = options;
 if ((!computeSale && !computeRate) || source.length === 0) {
 return { itemCategorySales: EMPTY_ITEM_CATEGORY_SALES, itemRateSales: EMPTY_ITEM_RATE_SALES };
 }

 const groupKey = getItemMainGroupKey(source[0]);
 const purityKey = getPurityColumnKey(source[0]);
 const aggregateByCategoryOnly = branchFilterShowsAll(options.selectedBranches);
 const { typeFilter, branchFilter, monthFilter, amountFilter } = options;

 type BranchSale = { saleQty: number; saleGram: number; saleAmount: number; rcQty: number; rcGram: number; rcAmount: number };
 type SaleGroup = {
 itemMainGroup: string;
 branch: string;
 saleQty: number;
 saleGram: number;
 saleAmount: number;
 rcQty: number;
 rcGram: number;
 rcAmount: number;
 branches: Map<string, BranchSale>;
 };
 type BranchRate = { qtys: Record<ItemSaleAmountRange, number>; totalQty: number };
 type RateGroup = {
 itemMainGroup: string;
 branch: string;
 qtys: Record<ItemSaleAmountRange, number>;
 totalQty: number;
 branches: Map<string, BranchRate>;
 };

 const saleMap = computeSale ? new Map<string, SaleGroup>() : null;
 const rateMap = computeRate ? new Map<string, RateGroup>() : null;

 const getRowItemType = (reason: string, row: DataRow): 'dia' |'pt' |'gold15' |'gold16' | null => {
 if (DIA_SALE_REASONS.has(reason) || DIA_RC_REASONS.has(reason)) return'dia';
 if (PT_SALE_REASONS.has(reason) || PT_RC_REASONS.has(reason)) return'pt';
 if (GOLD_SALE_REASONS.has(reason) || GOLD_RC_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 return goldCat ==='၁၆ပဲရည်' ? 'gold16' : 'gold15';
 }
 return null;
 };

 for (let i = 0; i < source.length; i++) {
 const row = source[i];
 const reason = (getExtractedReason(row) ||'').trim();
 const isSale = SALE_REASONS.has(reason);
 const isRc = RC_REASONS.has(reason);
 if (!isSale && !isRc) continue;
 if (computeRate && !computeSale && !isSale) continue;

 const amount = getRowAmount(row);
 if (!matchesItemAmountRange(amount, amountFilter)) continue;

 const branch = getRowBranch(row);
 if (branchFilter && branch !== branchFilter) continue;

 if (monthFilter && getRowMonthName(row) !== monthFilter) continue;

 if (typeFilter && getRowItemType(reason, row) !== typeFilter) continue;

 const mainGroup = getItemMainGroupValue(row, groupKey);
 if (!mainGroup) continue;

 if (computeSale && saleMap) {
 const { q, g } = parseRowQtyGram(row);
 const mapKey = aggregateByCategoryOnly ? mainGroup : `${branch}\0${mainGroup}`;
 let entry = saleMap.get(mapKey);
 if (!entry) {
 entry = {
 itemMainGroup: mainGroup,
 branch: aggregateByCategoryOnly ? '' : branch,
 saleQty: 0,
 saleGram: 0,
 saleAmount: 0,
 rcQty: 0,
 rcGram: 0,
 rcAmount: 0,
 branches: new Map(),
 };
 saleMap.set(mapKey, entry);
 }
 if (isSale) {
 entry.saleQty += q;
 entry.saleGram += g;
 entry.saleAmount += amount;
 } else {
 entry.rcQty += q;
 entry.rcGram += g;
 entry.rcAmount += amount;
 }
 if (aggregateByCategoryOnly) {
 const branchEntry = entry.branches.get(branch) || {
 saleQty: 0, saleGram: 0, saleAmount: 0, rcQty: 0, rcGram: 0, rcAmount: 0,
 };
 if (isSale) {
 branchEntry.saleQty += q;
 branchEntry.saleGram += g;
 branchEntry.saleAmount += amount;
 } else {
 branchEntry.rcQty += q;
 branchEntry.rcGram += g;
 branchEntry.rcAmount += amount;
 }
 entry.branches.set(branch, branchEntry);
 }
 }

 if (computeRate && rateMap && isSale) {
 const { q } = parseRowQtyGram(row);
 if (q === 0) continue;
 const rangeKey = getItemRateAmountRangeKey(amount);
 const mapKey = aggregateByCategoryOnly ? mainGroup : `${branch}\0${mainGroup}`;
 let entry = rateMap.get(mapKey);
 if (!entry) {
 entry = {
 itemMainGroup: mainGroup,
 branch: aggregateByCategoryOnly ? '' : branch,
 qtys: emptyItemRateQtys(),
 totalQty: 0,
 branches: new Map(),
 };
 rateMap.set(mapKey, entry);
 }
 entry.qtys[rangeKey] += q;
 entry.totalQty += q;
 if (aggregateByCategoryOnly) {
 const branchEntry = entry.branches.get(branch) || { qtys: emptyItemRateQtys(), totalQty: 0 };
 branchEntry.qtys[rangeKey] += q;
 branchEntry.totalQty += q;
 entry.branches.set(branch, branchEntry);
 }
 }
 }

 let itemCategorySales: ItemCategorySalesResult = EMPTY_ITEM_CATEGORY_SALES;
 if (saleMap) {
 const rows = Array.from(saleMap.values())
 .map((entry) => ({
 category: entry.itemMainGroup,
 itemMainGroup: entry.itemMainGroup,
 diaCategory: '',
 goldCategory: '',
 ptCategory: '',
 branch: entry.branch,
 saleQty: entry.saleQty,
 saleGram: entry.saleGram,
 saleAmount: entry.saleAmount,
 rcQty: entry.rcQty,
 rcGram: entry.rcGram,
 rcAmount: entry.rcAmount,
 totalQty: entry.saleQty - entry.rcQty,
 totalGram: entry.saleGram - entry.rcGram,
 totalAmount: entry.saleAmount - entry.rcAmount,
 branchBreakdown: Array.from(entry.branches.entries())
 .map(([branch, stats]) => ({
 branch,
 saleQty: stats.saleQty,
 saleGram: stats.saleGram,
 saleAmount: stats.saleAmount,
 rcQty: stats.rcQty,
 rcGram: stats.rcGram,
 rcAmount: stats.rcAmount,
 totalQty: stats.saleQty - stats.rcQty,
 totalGram: stats.saleGram - stats.rcGram,
 totalAmount: stats.saleAmount - stats.rcAmount,
 }))
 .sort((a, b) => b.saleAmount - a.saleAmount || a.branch.localeCompare(b.branch)),
 }))
 .sort((a, b) =>
 b.saleAmount - a.saleAmount ||
 a.branch.localeCompare(b.branch) ||
 a.itemMainGroup.localeCompare(b.itemMainGroup)
 );

 const grandTotal = rows.reduce(
 (sum, row) => ({
 saleQty: sum.saleQty + row.saleQty,
 saleGram: sum.saleGram + row.saleGram,
 saleAmount: sum.saleAmount + row.saleAmount,
 rcQty: sum.rcQty + row.rcQty,
 rcGram: sum.rcGram + row.rcGram,
 rcAmount: sum.rcAmount + row.rcAmount,
 totalQty: sum.totalQty + row.totalQty,
 totalGram: sum.totalGram + row.totalGram,
 totalAmount: sum.totalAmount + row.totalAmount,
 }),
 { ...EMPTY_ITEM_SALE_TOTALS }
 );

 itemCategorySales = { rows, grandTotal, categoryKey: groupKey, aggregateByCategoryOnly };
 }

 let itemRateSales: ItemRateSalesResult = EMPTY_ITEM_RATE_SALES;
 if (rateMap) {
 const rows = Array.from(rateMap.values())
 .map((entry) => ({
 category: entry.itemMainGroup,
 itemMainGroup: entry.itemMainGroup,
 branch: entry.branch,
 qtys: entry.qtys,
 totalQty: entry.totalQty,
 branchBreakdown: Array.from(entry.branches.entries())
 .map(([branch, stats]) => ({
 branch,
 qtys: stats.qtys,
 totalQty: stats.totalQty,
 }))
 .sort((a, b) => b.totalQty - a.totalQty || a.branch.localeCompare(b.branch)),
 }))
 .sort((a, b) => b.totalQty - a.totalQty || a.itemMainGroup.localeCompare(b.itemMainGroup));

 const grandTotal = rows.reduce(
 (sum, row) => {
 ITEM_RATE_RANGE_COLUMNS.forEach(({ key }) => {
 sum.qtys[key] += row.qtys[key];
 });
 sum.totalQty += row.totalQty;
 return sum;
 },
 { qtys: emptyItemRateQtys(), totalQty: 0 }
 );

 itemRateSales = { rows, grandTotal, categoryKey: groupKey, aggregateByCategoryOnly };
 }

 return { itemCategorySales, itemRateSales };
};

const formatDisplayDate = (date: Date) => {
 const d = date.getDate().toString().padStart(2,'0');
 const m = (date.getMonth() + 1).toString().padStart(2,'0');
 const y = date.getFullYear();
 return `${d}.${m}.${y}`;
};

const formatDayLabel = (dateStr: string) => {
 const date = parseSafeDate(dateStr);
 if (!date) return dateStr;
 return formatDisplayDate(date);
};

const expandedToneText = {
 sale: 'text-gray-900',
 rc: 'text-gray-600',
 net: 'text-gray-900 font-semibold',
 neutral: 'text-[#8c8c8c]',
} as const;

const ExpandedBreakdownPanel = memo(function ExpandedBreakdownPanel({
 title,
 icon: Icon,
 children,
}: {
 title: string;
 icon: React.ComponentType<{ className?: string }>;
 children: React.ReactNode;
}) {
 return (
 <div className="mx-3 my-2 ml-7 rounded-xl bg-white border border-[#e8e8e8] overflow-hidden">
 <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
 <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
 <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
 </div>
 {children}
 </div>
 );
});

const ExpandedMetricBadge = memo(function ExpandedMetricBadge({
 value,
 tone ='neutral',
}: {
 value: string | number;
 tone?: keyof typeof expandedToneText;
}) {
 const display = value === 0 || value ==='0' || value ==='-' ? '-' : value;
 return (
 <span
 className={`inline-flex min-w-[2.5rem] justify-center text-[11px] tabular-nums ${expandedToneText[tone]}`}
 >
 {display}
 </span>
 );
});

const ExpandedColumnHeader = memo(function ExpandedColumnHeader({
 label,
 tone ='neutral',
 className ='',
}: {
 label: string;
 tone?: 'sale' |'rc' |'net' |'neutral';
 className?: string;
}) {
 return (
 <span className={`text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center ${className}`}>
 {label}
 </span>
 );
});

const getReportTableColSpan = (mode: ViewMode) => {
 if (mode ==='allBranch') return 11;
 if (mode ==='full') return 23;
 return 6;
};

const getDaysSinceDate = (date: Date | null) => {
 if (!date) return null;
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const target = new Date(date);
 target.setHours(0, 0, 0, 0);
 return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
};

const renderTownship = (township: string) => {
 if (township ==='-') return <span className="text-gray-400">-</span>;
 return (
 <span className="block w-full px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-100/80 text-[12px] font-medium leading-snug whitespace-normal break-words text-center">
 {township}
 </span>
 );
};

const CUS_LIST_COL =
'w-[10%] px-2 py-3 text-[12px] align-middle break-words';

const renderDaysSinceVisit = (days: number | null) => {
 if (days == null) return <span className="text-gray-400">-</span>;
 const color =
 days >= 90 ? 'text-rose-600 bg-rose-50' : days >= 30 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50';
 return (
 <span className={`inline-flex items-center justify-center text-[12px] font-bold px-2 py-0.5 rounded-lg ${color}`}>
 {days} ရက်
 </span>
 );
};

const parseRowQtyGram = (row: DataRow) => {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 const g = parseNumericCell(row['Gram']);
 return { q, g };
};

const renderPurityQty = (qty: number) =>
 qty === 0 ? <span className="text-gray-400">-</span> : <span>{qty}</span>;

const renderPurityGram = (gram: number) =>
 gram === 0 ? <span className="text-gray-400">-</span> : <span>{formatGramValue(gram)}</span>;

const goldWeightCellClass = (variant: 'data' |'total' |'grand', withBorderRight: boolean) => {
 const base =
 variant ==='grand'
 ? 'py-2.5 px-2 text-center text-[12px] font-bold text-gray-900 tabular-nums'
 : variant ==='total'
 ? 'py-2.5 px-2 text-center text-[12px] font-bold text-gray-900 tabular-nums'
 : 'py-2.5 px-2 text-center text-[12px] text-[#8c8c8c] tabular-nums';
 return `${base}${withBorderRight ? ' border-r border-gray-300' : ''}`;
};

const renderGoldWeightCells = (
 gram: number,
 mode: 'gram' |'kpy',
 variant: 'data' |'total' |'grand' ='data',
 isLastInRow = false
) => {
 const values =
 gram === 0
 ? mode ==='kpy'
 ? [null, null, null]
 : [null]
 : mode ==='kpy'
 ? (() => {
 const { k, p, y } = gramToKpy(gram);
 return [k, p, y];
 })()
 : [formatGramValue(gram)];

 return values.map((val, i) => {
 const isLast = isLastInRow && i === values.length - 1;
 return (
 <td key={i} className={goldWeightCellClass(variant, !isLast)}>
 {val == null ? <span className="text-gray-400">-</span> : val}
 </td>
 );
 });
};

function CmView({ data, allData, selectedMonth, selectedBranches, highPerformanceMode, initialViewMode, fixedViewMode, monthMode, cusListAsTable = false }: CmViewProps) {
 const reportData = useMemo(() => monthMode ==='all' ? (allData || data) : data, [monthMode, data, allData]);
 const showItemBranchColumn = !branchFilterShowsAll(selectedBranches);
 const [metricMode, setMetricMode] = useState<MetricMode>('amount');
 const [viewMode, setViewMode] = useState<ViewMode>(fixedViewMode || initialViewMode ||'full');
 const [targetTab, setTargetTab] = useState<'diamond' |'pt' |'gold'>('diamond');
 const [goldPurityTab, setGoldPurityTab] = useState<string>('');
 const [sortField, setSortField] = useState<SortField>('branchName');
 const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
 const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
 const [expandedItemCategory, setExpandedItemCategory] = useState<string | null>(null);
 const [expandedGoldRateType, setExpandedGoldRateType] = useState<'gold15' |'gold16' | null>(null);
 const [expandedGoldRateItem, setExpandedGoldRateItem] = useState<string | null>(null);
 const [expandedCusRow, setExpandedCusRow] = useState<string | null>(null);
 const [expandedCusBranch, setExpandedCusBranch] = useState<string | null>(null);
 const [cusItemCategoryFilter, setCusItemCategoryFilter] = useState<string | null>(null);
 const [cusItemTypeFilter, setCusItemTypeFilter] = useState<'dia' |'pt' |'gold15' |'gold16' | null>(null);
 const [itemSaleTypeFilter, setItemSaleTypeFilter] = useState<'dia' |'pt' |'gold15' |'gold16' | null>(null);
 const [itemSaleBranchFilter, setItemSaleBranchFilter] = useState<string | null>(null);
 const [itemSaleMonthFilter, setItemSaleMonthFilter] = useState<string | null>(null);
 const [itemSaleMonthMode, setItemSaleMonthMode] = useState<'current' |'all'>('current');
 const [itemSaleAmountFilter, setItemSaleAmountFilter] = useState<ItemSaleAmountRange | null>(null);
 const [cusSearchBuyer, setCusSearchBuyer] = useState('');
 const [cusSearchDaysSince, setCusSearchDaysSince] = useState('');

 // Debounced search values
 const [debouncedBuyer, setDebouncedBuyer] = useState('');
 const [debouncedDaysSince, setDebouncedDaysSince] = useState('');

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedBuyer(cusSearchBuyer), 300);
 return () => clearTimeout(timer);
 }, [cusSearchBuyer]);

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedDaysSince(cusSearchDaysSince), 300);
 return () => clearTimeout(timer);
 }, [cusSearchDaysSince]);
 const [cusSortField, setCusSortField] = useState<CusSortField>('netSaleAmount');
 const [cusSortOrder, setCusSortOrder] = useState<SortOrder>('desc');
 const [goldGramDisplay, setGoldGramDisplay] = useState<'gram' |'kpy'>('gram');
 const [expandedDay, setExpandedDay] = useState<string | null>(null);
 const [showCusSummary, setShowCusSummary] = useState(false);
 const [activeDaysFilter, setActiveDaysFilter] = useState<'green' |'yellow' |'red' | null>(null);
 const [customerTierFilter, setCustomerTierFilter] = useState<'VIP' |'VVIP' |'CIP' |'CARE' | null>(null);
 const [cusMonthFilter, setCusMonthFilter] = useState<'current' |'all'>('current');
 const [cusBranchFilter, setCusBranchFilter] = useState<string | null>(null);
 const [cusVisibleCount, setCusVisibleCount] = useState(8);
 const [fullscreenTable, setFullscreenTable] = useState<string | null>(null);

 useEffect(() => {
 setCusVisibleCount(8);
 }, [debouncedBuyer, debouncedDaysSince, cusSortField, cusSortOrder, cusItemTypeFilter, cusItemCategoryFilter, activeDaysFilter, customerTierFilter, cusMonthFilter, cusBranchFilter]);
 const [shopTargetExpanded, setShopTargetExpanded] = useState(false);

 const handleSort = useCallback((field: SortField) => {
 if (sortField === field) {
 setSortOrder(sortOrder ==='asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortOrder('desc'); // Default to high-to-low on first click
 }
 }, [sortField, sortOrder]);

 const toggleDayExpansion = (date: string) => {
 setExpandedDay(prev => prev === date ? null : date);
 };

 const renderSortHeader = useCallback((field: SortField, label: string, align: 'left' |'center' ='center') => {
 const isSelected = sortField === field;
 return (
 <div
 onClick={() => handleSort(field)}
 className={`flex items-center gap-1 cursor-pointer hover:text-[#8c8c8c] transition-colors select-none
 ${align ==='center' ? 'justify-center mx-auto w-fit' : 'justify-start'}`}
 >
 <span>{label}</span>
 {isSelected ? (
 sortOrder ==='asc' ? <ArrowUp className="w-3 h-3 text-[#8c8c8c] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#8c8c8c] shrink-0" />
 ) : (
 <ArrowUpDown className="w-3 h-3 text-[#8c8c8c] shrink-0" />
 )}
 </div>
 );
 }, [sortField, sortOrder, handleSort]);

 const handleCusSort = useCallback((field: CusSortField) => {
 if (cusSortField === field) {
 setCusSortOrder(cusSortOrder ==='asc' ? 'desc' : 'asc');
 } else {
 setCusSortField(field);
 setCusSortOrder('desc');
 }
 }, [cusSortField, cusSortOrder]);

 const renderCusSortHeader = useCallback((field: CusSortField, label: string) => {
 const isSelected = cusSortField === field;
 return (
 <div
 onClick={() => handleCusSort(field)}
 className="flex items-center gap-1 cursor-pointer hover:text-[#8c8c8c] transition-colors select-none justify-center mx-auto w-fit"
 >
 <span>{label}</span>
 {isSelected ? (
 cusSortOrder ==='asc' ? (
 <ArrowUp className="w-3 h-3 text-[#8c8c8c] shrink-0" />
 ) : (
 <ArrowDown className="w-3 h-3 text-[#8c8c8c] shrink-0" />
 )
 ) : (
 <ArrowUpDown className="w-3 h-3 text-[#8c8c8c] shrink-0" />
 )}
 </div>
 );
 }, [cusSortField, cusSortOrder, handleCusSort]);

 // Group and aggregate data by branch and date (heavy computation - only depends on data)
 const cmAggregatedData = useMemo(() => {
 const cmContactKey = findColumnKey(reportData[0],'Contact Number','Contact','Phone');
 type AggData = {
 totalQty: number;
 diaSale: { amount: number; gram: number; qty: number };
 goldSale: { amount: number; gram: number; qty: number };
 gold15Sale: { amount: number; gram: number; qty: number };
 gold16Sale: { amount: number; gram: number; qty: number };
 ptSale: { amount: number; gram: number; qty: number };
 diaRc: { amount: number; gram: number; qty: number };
 goldRc: { amount: number; gram: number; qty: number };
 gold15Rc: { amount: number; gram: number; qty: number };
 gold16Rc: { amount: number; gram: number; qty: number };
 ptRc: { amount: number; gram: number; qty: number };
 categories: Record<string, {
 diaSale: { amount: number; gram: number; qty: number };
 goldSale: { amount: number; gram: number; qty: number };
 ptSale: { amount: number; gram: number; qty: number };
 diaRc: { amount: number; gram: number; qty: number };
 goldRc: { amount: number; gram: number; qty: number };
 ptRc: { amount: number; gram: number; qty: number };
 totalSale: { amount: number; gram: number; qty: number };
 totalRc: { amount: number; gram: number; qty: number };
 customers: Set<string>;
 }>;
 };

 const emptyAgg = (): AggData => ({
 totalQty: 0,
 diaSale: { amount: 0, gram: 0, qty: 0 },
 goldSale: { amount: 0, gram: 0, qty: 0 },
 gold15Sale: { amount: 0, gram: 0, qty: 0 },
 gold16Sale: { amount: 0, gram: 0, qty: 0 },
 ptSale: { amount: 0, gram: 0, qty: 0 },
 diaRc: { amount: 0, gram: 0, qty: 0 },
 goldRc: { amount: 0, gram: 0, qty: 0 },
 gold15Rc: { amount: 0, gram: 0, qty: 0 },
 gold16Rc: { amount: 0, gram: 0, qty: 0 },
 ptRc: { amount: 0, gram: 0, qty: 0 },
 categories: {}
 });

 const emptyCategory = () => ({
 diaSale: { amount: 0, gram: 0, qty: 0 },
 goldSale: { amount: 0, gram: 0, qty: 0 },
 ptSale: { amount: 0, gram: 0, qty: 0 },
 diaRc: { amount: 0, gram: 0, qty: 0 },
 goldRc: { amount: 0, gram: 0, qty: 0 },
 ptRc: { amount: 0, gram: 0, qty: 0 },
 totalSale: { amount: 0, gram: 0, qty: 0 },
 totalRc: { amount: 0, gram: 0, qty: 0 },
 customers: new Set<string>()
 });

 const branches: Record<string, AggData & {
 branchName: string;
 daily: Record<string, AggData & { date: string }>;
 }> = {};

 reportData.forEach((row) => {
 const branch = row['Branch အမည်'] ||'Unknown';
 const dateStr = row.Date ||'Unknown Date';
 
 if (!branches[branch]) {
 branches[branch] = {
 branchName: branch,
 ...emptyAgg(),
 daily: {}
 };
 }

 const branchObj = branches[branch];

 if (!branchObj.daily[dateStr]) {
 branchObj.daily[dateStr] = {
 date: dateStr,
 ...emptyAgg(),
 };
 }
 const dayObj = branchObj.daily[dateStr];

 // Parse quantity
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;

 // Parse gram
 const g = parseNumericCell(row['Gram']);

 // Parse amount
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;

 // Aggregate total Qty for branch and day
 branchObj.totalQty += q;
 dayObj.totalQty += q;

 const reason = (getExtractedReason(row) ||'').trim();

 // Helper to update both branch and day aggregations
 const updateAgg = (field: 'diaSale'|'goldSale'|'gold15Sale'|'gold16Sale'|'ptSale'|'diaRc'|'goldRc'|'gold15Rc'|'gold16Rc'|'ptRc') => {
 branchObj[field].amount += a;
 branchObj[field].gram += g;
 branchObj[field].qty += q;
 dayObj[field].amount += a;
 dayObj[field].gram += g;
 dayObj[field].qty += q;
 };

 // Category aggregation
 const category = row['Item Category'] || row['Category'] ||'Other';
 if (!branchObj.categories[category]) {
 branchObj.categories[category] = emptyCategory();
 }
 if (!dayObj.categories[category]) {
 dayObj.categories[category] = emptyCategory();
 }

 const branchCat = branchObj.categories[category];
 const dayCat = dayObj.categories[category];

 const contact = cmContactKey ? String(row[cmContactKey] ||'').trim() : '';
 const customerName = row['ဝယ်သူ အမည်'] || row['Customer Name'] || row['ဖောက်သည်အမည်'] || row['Customer'] ||'Unknown';
 const customerId = contact || String(customerName).trim() ||'Unknown';
 branchCat.customers.add(customerId);
 dayCat.customers.add(customerId);

 const updateCatAgg = (field: 'diaSale'|'goldSale'|'ptSale'|'diaRc'|'goldRc'|'ptRc') => {
 branchCat[field].amount += a;
 branchCat[field].gram += g;
 branchCat[field].qty += q;
 dayCat[field].amount += a;
 dayCat[field].gram += g;
 dayCat[field].qty += q;
 };

 // Dia Sale
 if (['Dia Sale','Dia Sale','Dia အရောင်း'].includes(reason)) {
 updateAgg('diaSale');
 updateCatAgg('diaSale');
 branchCat.totalSale.amount += a;
 branchCat.totalSale.gram += g;
 branchCat.totalSale.qty += q;
 dayCat.totalSale.amount += a;
 dayCat.totalSale.gram += g;
 dayCat.totalSale.qty += q;
 }
 // Gold Sale / G Sale
 else if (['G Sale','G Sale','Gold Sale','Gold Sale','Gold အရောင်း'].includes(reason)) {
 updateAgg('goldSale');
 updateCatAgg('goldSale');
 // Split by purity
 const _purityKey = getPurityColumnKey(row);
 const _purity = getPurityValue(row, _purityKey);
 const _goldCat = _purity ? getGoldPurityCategory(_purity) : null;
 if (_goldCat ==='၁၆ပဲရည်') { updateAgg('gold16Sale'); } else { updateAgg('gold15Sale'); }
 branchCat.totalSale.amount += a;
 branchCat.totalSale.gram += g;
 branchCat.totalSale.qty += q;
 dayCat.totalSale.amount += a;
 dayCat.totalSale.gram += g;
 dayCat.totalSale.qty += q;
 }
 // PT Sale
 else if (['PT Sale','PT Sale','PT အရောင်း'].includes(reason)) {
 updateAgg('ptSale');
 updateCatAgg('ptSale');
 branchCat.totalSale.amount += a;
 branchCat.totalSale.gram += g;
 branchCat.totalSale.qty += q;
 dayCat.totalSale.amount += a;
 dayCat.totalSale.gram += g;
 dayCat.totalSale.qty += q;
 }
 // Dia RC
 else if (['Dia RC','Dia RC','Dia Rc','Dia Rc','Dia အဝယ်'].includes(reason)) {
 updateAgg('diaRc');
 updateCatAgg('diaRc');
 branchCat.totalRc.amount += a;
 branchCat.totalRc.gram += g;
 branchCat.totalRc.qty += q;
 dayCat.totalRc.amount += a;
 dayCat.totalRc.gram += g;
 dayCat.totalRc.qty += q;
 }
 // Gold RC / G RC
 else if (['G RC','G RC','Gold RC','Gold RC','G Rc','G Rc','Gold Rc','Gold Rc','Gold အဝယ်'].includes(reason)) {
 updateAgg('goldRc');
 updateCatAgg('goldRc');
 // Split by purity
 const _purityKeyRc = getPurityColumnKey(row);
 const _purityRc = getPurityValue(row, _purityKeyRc);
 const _goldCatRc = _purityRc ? getGoldPurityCategory(_purityRc) : null;
 if (_goldCatRc ==='၁၆ပဲရည်') { updateAgg('gold16Rc'); } else { updateAgg('gold15Rc'); }
 branchCat.totalRc.amount += a;
 branchCat.totalRc.gram += g;
 branchCat.totalRc.qty += q;
 dayCat.totalRc.amount += a;
 dayCat.totalRc.gram += g;
 dayCat.totalRc.qty += q;
 }
 // PT RC
 else if (['PT RC','PT RC','PT Rc','PT Rc','PT အဝယ်'].includes(reason)) {
 updateAgg('ptRc');
 updateCatAgg('ptRc');
 branchCat.totalRc.amount += a;
 branchCat.totalRc.gram += g;
 branchCat.totalRc.qty += q;
 dayCat.totalRc.amount += a;
 dayCat.totalRc.gram += g;
 dayCat.totalRc.qty += q;
 }
 });

 const list = Object.values(branches).map(b => ({
 ...b,
 dailyList: Object.values(b.daily).sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())
 }));

 return list;
 }, [reportData]);

 // Sort aggregated data (lightweight - only depends on sort fields and metric mode)
 const cmData = useMemo(() => {
 const list = [...cmAggregatedData];

 // Sort list based on selected field and order
 list.sort((a, b) => {
 let valA: any = a.branchName;
 let valB: any = b.branchName;

 const totalSaleA = a.diaSale.amount + a.goldSale.amount + a.ptSale.amount;
 const totalSaleB = b.diaSale.amount + b.goldSale.amount + b.ptSale.amount;
 const totalRcA = a.diaRc.amount + a.goldRc.amount + a.ptRc.amount;
 const totalRcB = b.diaRc.amount + b.goldRc.amount + b.ptRc.amount;

 const totalSaleGramA = a.diaSale.gram + a.goldSale.gram + a.ptSale.gram;
 const totalSaleGramB = b.diaSale.gram + b.goldSale.gram + b.ptSale.gram;
 const totalRcGramA = a.diaRc.gram + a.goldRc.gram + a.ptRc.gram;
 const totalRcGramB = b.diaRc.gram + b.goldRc.gram + b.ptRc.gram;

 const totalSaleQtyA = a.diaSale.qty + a.goldSale.qty + a.ptSale.qty;
 const totalSaleQtyB = b.diaSale.qty + b.goldSale.qty + b.ptSale.qty;
 const totalRcQtyA = a.diaRc.qty + a.goldRc.qty + b.ptRc.qty;
 const totalRcQtyB = b.diaRc.qty + b.goldRc.qty + b.ptRc.qty;

 if (sortField ==='totalQty') {
 valA = a.totalQty;
 valB = b.totalQty;
 } else if (sortField ==='totalSale') {
 valA = metricMode ==='amount' ? totalSaleA : metricMode ==='gram' ? totalSaleGramA : totalSaleQtyA;
 valB = metricMode ==='amount' ? totalSaleB : metricMode ==='gram' ? totalSaleGramB : totalSaleQtyB;
 } else if (sortField ==='totalRc') {
 valA = metricMode ==='amount' ? totalRcA : metricMode ==='gram' ? totalRcGramA : totalRcQtyA;
 valB = metricMode ==='amount' ? totalRcB : metricMode ==='gram' ? totalRcGramB : totalRcQtyB;
 } else if (sortField ==='netSale') {
 valA = metricMode ==='amount' ? (totalSaleA - totalRcA) : metricMode ==='gram' ? (totalSaleGramA - totalRcGramA) : (totalSaleQtyA - totalRcQtyA);
 valB = metricMode ==='amount' ? (totalSaleB - totalRcB) : metricMode ==='gram' ? (totalSaleGramB - totalRcGramB) : (totalSaleQtyB - totalRcQtyB);
 } else if (sortField ==='diaSale') {
 valA = metricMode ==='amount' ? a.diaSale.amount : metricMode ==='gram' ? a.diaSale.gram : a.diaSale.qty;
 valB = metricMode ==='amount' ? b.diaSale.amount : metricMode ==='gram' ? b.diaSale.gram : b.diaSale.qty;
 } else if (sortField ==='goldSale') {
 valA = metricMode ==='amount' ? a.goldSale.amount : metricMode ==='gram' ? a.goldSale.gram : a.goldSale.qty;
 valB = metricMode ==='amount' ? b.goldSale.amount : metricMode ==='gram' ? b.goldSale.gram : b.goldSale.qty;
 } else if (sortField ==='gold15Sale') {
 valA = metricMode ==='amount' ? a.gold15Sale.amount : metricMode ==='gram' ? a.gold15Sale.gram : a.gold15Sale.qty;
 valB = metricMode ==='amount' ? b.gold15Sale.amount : metricMode ==='gram' ? b.gold15Sale.gram : b.gold15Sale.qty;
 } else if (sortField ==='gold16Sale') {
 valA = metricMode ==='amount' ? a.gold16Sale.amount : metricMode ==='gram' ? a.gold16Sale.gram : a.gold16Sale.qty;
 valB = metricMode ==='amount' ? b.gold16Sale.amount : metricMode ==='gram' ? b.gold16Sale.gram : b.gold16Sale.qty;
 } else if (sortField ==='ptSale') {
 valA = metricMode ==='amount' ? a.ptSale.amount : metricMode ==='gram' ? a.ptSale.gram : a.ptSale.qty;
 valB = metricMode ==='amount' ? b.ptSale.amount : metricMode ==='gram' ? b.ptSale.gram : b.ptSale.qty;
 } else if (sortField ==='diaRc') {
 valA = metricMode ==='amount' ? a.diaRc.amount : metricMode ==='gram' ? a.diaRc.gram : a.diaRc.qty;
 valB = metricMode ==='amount' ? b.diaRc.amount : metricMode ==='gram' ? b.diaRc.gram : b.diaRc.qty;
 } else if (sortField ==='goldRc') {
 valA = metricMode ==='amount' ? a.goldRc.amount : metricMode ==='gram' ? a.goldRc.gram : a.goldRc.qty;
 valB = metricMode ==='amount' ? b.goldRc.amount : metricMode ==='gram' ? b.goldRc.gram : b.goldRc.qty;
 } else if (sortField ==='gold15Rc') {
 valA = metricMode ==='amount' ? a.gold15Rc.amount : metricMode ==='gram' ? a.gold15Rc.gram : a.gold15Rc.qty;
 valB = metricMode ==='amount' ? b.gold15Rc.amount : metricMode ==='gram' ? b.gold15Rc.gram : b.gold15Rc.qty;
 } else if (sortField ==='gold16Rc') {
 valA = metricMode ==='amount' ? a.gold16Rc.amount : metricMode ==='gram' ? a.gold16Rc.gram : a.gold16Rc.qty;
 valB = metricMode ==='amount' ? b.gold16Rc.amount : metricMode ==='gram' ? b.gold16Rc.gram : b.gold16Rc.qty;
 } else if (sortField ==='ptRc') {
 valA = metricMode ==='amount' ? a.ptRc.amount : metricMode ==='gram' ? a.ptRc.gram : a.ptRc.qty;
 valB = metricMode ==='amount' ? b.ptRc.amount : metricMode ==='gram' ? b.ptRc.gram : b.ptRc.qty;
 } else if (sortField ==='diaSaleQty') { valA = a.diaSale.qty; valB = b.diaSale.qty;
 } else if (sortField ==='diaSaleAmount') { valA = a.diaSale.amount; valB = b.diaSale.amount;
 } else if (sortField ==='goldSaleQty') { valA = a.goldSale.qty; valB = b.goldSale.qty;
 } else if (sortField ==='goldSaleAmount') { valA = a.goldSale.amount; valB = b.goldSale.amount;
 } else if (sortField ==='gold16SaleQty') { valA = a.gold16Sale.qty; valB = b.gold16Sale.qty;
 } else if (sortField ==='gold16SaleAmount') { valA = a.gold16Sale.amount; valB = b.gold16Sale.amount;
 } else if (sortField ==='gold15SaleQty') { valA = a.gold15Sale.qty; valB = b.gold15Sale.qty;
 } else if (sortField ==='gold15SaleAmount') { valA = a.gold15Sale.amount; valB = b.gold15Sale.amount;
 } else if (sortField ==='ptSaleQty') { valA = a.ptSale.qty; valB = b.ptSale.qty;
 } else if (sortField ==='ptSaleAmount') { valA = a.ptSale.amount; valB = b.ptSale.amount;
 } else if (sortField ==='totalSaleQty') { valA = totalSaleQtyA; valB = totalSaleQtyB;
 } else if (sortField ==='totalSaleAmount') { valA = totalSaleA; valB = totalSaleB;
 } else if (sortField ==='diaRcQty') { valA = a.diaRc.qty; valB = b.diaRc.qty;
 } else if (sortField ==='diaRcAmount') { valA = a.diaRc.amount; valB = b.diaRc.amount;
 } else if (sortField ==='gold15RcQty') { valA = a.gold15Rc.qty; valB = b.gold15Rc.qty;
 } else if (sortField ==='gold15RcAmount') { valA = a.gold15Rc.amount; valB = b.gold15Rc.amount;
 } else if (sortField ==='gold16RcQty') { valA = a.gold16Rc.qty; valB = b.gold16Rc.qty;
 } else if (sortField ==='gold16RcAmount') { valA = a.gold16Rc.amount; valB = b.gold16Rc.amount;
 } else if (sortField ==='ptRcQty') { valA = a.ptRc.qty; valB = b.ptRc.qty;
 } else if (sortField ==='ptRcAmount') { valA = a.ptRc.amount; valB = b.ptRc.amount;
 } else if (sortField ==='totalRcQty') { valA = totalRcQtyA; valB = totalRcQtyB;
 } else if (sortField ==='totalRcAmount') { valA = totalRcA; valB = totalRcB;
 } else if (sortField ==='netSaleQty') { valA = totalSaleQtyA - totalRcQtyA; valB = totalSaleQtyB - totalRcQtyB;
 } else if (sortField ==='netSaleAmount') { valA = totalSaleA - totalRcA; valB = totalSaleB - totalRcB;
 }

 if (typeof valA ==='string') {
 return sortOrder ==='asc' 
 ? valA.localeCompare(valB) 
 : valB.localeCompare(valA);
 } else {
 return sortOrder ==='asc' 
 ? valA - valB 
 : valB - valA;
 }
 });

 return list;
 }, [cmAggregatedData, sortField, sortOrder, metricMode]);

 // Totals for all branches
 const totals = useMemo(() => {
 const sum = {
 totalQty: 0,
 diaSale: { amount: 0, gram: 0, qty: 0 },
 goldSale: { amount: 0, gram: 0, qty: 0 },
 gold15Sale: { amount: 0, gram: 0, qty: 0 },
 gold16Sale: { amount: 0, gram: 0, qty: 0 },
 ptSale: { amount: 0, gram: 0, qty: 0 },
 totalSale: { amount: 0, gram: 0, qty: 0 },
 diaRc: { amount: 0, gram: 0, qty: 0 },
 goldRc: { amount: 0, gram: 0, qty: 0 },
 gold15Rc: { amount: 0, gram: 0, qty: 0 },
 gold16Rc: { amount: 0, gram: 0, qty: 0 },
 ptRc: { amount: 0, gram: 0, qty: 0 },
 totalRc: { amount: 0, gram: 0, qty: 0 },
 netSale: { amount: 0, gram: 0, qty: 0 },
 };

 cmAggregatedData.forEach((b) => {
 sum.totalQty += b.totalQty;

 // Dia Sale
 sum.diaSale.amount += b.diaSale.amount;
 sum.diaSale.gram += b.diaSale.gram;
 sum.diaSale.qty += b.diaSale.qty;

 // Gold Sale
 sum.goldSale.amount += b.goldSale.amount;
 sum.goldSale.gram += b.goldSale.gram;
 sum.goldSale.qty += b.goldSale.qty;
 sum.gold15Sale.amount += b.gold15Sale.amount;
 sum.gold15Sale.gram += b.gold15Sale.gram;
 sum.gold15Sale.qty += b.gold15Sale.qty;
 sum.gold16Sale.amount += b.gold16Sale.amount;
 sum.gold16Sale.gram += b.gold16Sale.gram;
 sum.gold16Sale.qty += b.gold16Sale.qty;

 // PT Sale
 sum.ptSale.amount += b.ptSale.amount;
 sum.ptSale.gram += b.ptSale.gram;
 sum.ptSale.qty += b.ptSale.qty;

 // Dia RC
 sum.diaRc.amount += b.diaRc.amount;
 sum.diaRc.gram += b.diaRc.gram;
 sum.diaRc.qty += b.diaRc.qty;

 // Gold RC
 sum.goldRc.amount += b.goldRc.amount;
 sum.goldRc.gram += b.goldRc.gram;
 sum.goldRc.qty += b.goldRc.qty;
 sum.gold15Rc.amount += b.gold15Rc.amount;
 sum.gold15Rc.gram += b.gold15Rc.gram;
 sum.gold15Rc.qty += b.gold15Rc.qty;
 sum.gold16Rc.amount += b.gold16Rc.amount;
 sum.gold16Rc.gram += b.gold16Rc.gram;
 sum.gold16Rc.qty += b.gold16Rc.qty;

 // PT RC
 sum.ptRc.amount += b.ptRc.amount;
 sum.ptRc.gram += b.ptRc.gram;
 sum.ptRc.qty += b.ptRc.qty;
 });

 sum.totalSale.amount = sum.diaSale.amount + sum.goldSale.amount + sum.ptSale.amount;
 sum.totalSale.gram = sum.diaSale.gram + sum.goldSale.gram + sum.ptSale.gram;
 sum.totalSale.qty = sum.diaSale.qty + sum.goldSale.qty + sum.ptSale.qty;

 sum.totalRc.amount = sum.diaRc.amount + sum.goldRc.amount + sum.ptRc.amount;
 sum.totalRc.gram = sum.diaRc.gram + sum.goldRc.gram + sum.ptRc.gram;
 sum.totalRc.qty = sum.diaRc.qty + sum.goldRc.qty + sum.ptRc.qty;

 sum.netSale.amount = sum.totalSale.amount - sum.totalRc.amount;
 sum.netSale.gram = sum.totalSale.gram - sum.totalRc.gram;
 sum.netSale.qty = sum.totalSale.qty - sum.totalRc.qty;

 return sum;
 }, [cmAggregatedData]);

 // Consolidated previous-month data: single pass through allData
 const prevMonthData = useMemo(() => {
 const prevMonth = getPreviousMonthName(selectedMonth);
 const diaSale: Record<string, number> = {};
 const goldSale: Record<string, number> = {};
 const ptSale: Record<string, number> = {};
 const diaRc: Record<string, number> = {};
 const goldRc: Record<string, number> = {};
 const ptRc: Record<string, number> = {};

 if (allData && allData.length > 0) {
 for (let i = 0; i < allData.length; i++) {
 const row = allData[i];
 const rowDate = getRowDate(row);
 if (!rowDate) continue;
 const rowMonth = rowDate.toLocaleDateString('en-US', { month: 'long' });
 if (rowMonth !== prevMonth) continue;
 const reason = (getExtractedReason(row) ||'').trim();
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;

 if (reason ==='Dia Sale' || reason ==='Dia Sale' || reason ==='Dia အရောင်း') {
 diaSale[branch] = (diaSale[branch] || 0) + a;
 } else if (reason ==='G Sale' || reason ==='G Sale' || reason ==='Gold Sale' || reason ==='Gold Sale' || reason ==='Gold အရောင်း') {
 goldSale[branch] = (goldSale[branch] || 0) + a;
 } else if (reason ==='PT Sale' || reason ==='PT Sale' || reason ==='PT အရောင်း') {
 ptSale[branch] = (ptSale[branch] || 0) + a;
 } else if (reason ==='Dia RC' || reason ==='Dia RC' || reason ==='Dia Rc' || reason ==='Dia Rc' || reason ==='Dia အဝယ်') {
 diaRc[branch] = (diaRc[branch] || 0) + a;
 } else if (reason ==='G RC' || reason ==='G RC' || reason ==='Gold RC' || reason ==='Gold RC' || reason ==='G Rc' || reason ==='G Rc' || reason ==='Gold Rc' || reason ==='Gold Rc' || reason ==='Gold အဝယ်') {
 goldRc[branch] = (goldRc[branch] || 0) + a;
 } else if (reason ==='PT RC' || reason ==='PT RC' || reason ==='PT Rc' || reason ==='PT Rc' || reason ==='PT အဝယ်') {
 ptRc[branch] = (ptRc[branch] || 0) + a;
 }
 }
 }

 const sumRecord = (rec: Record<string, number>) => Object.values(rec).reduce((s, v) => s + v, 0);
 const totalSale: Record<string, number> = {};
 const totalRc: Record<string, number> = {};
 const allBranchesSet = new Set([...Object.keys(diaSale), ...Object.keys(goldSale), ...Object.keys(ptSale), ...Object.keys(diaRc), ...Object.keys(goldRc), ...Object.keys(ptRc)]);
 allBranchesSet.forEach(b => {
 totalSale[b] = (diaSale[b] || 0) + (goldSale[b] || 0) + (ptSale[b] || 0);
 totalRc[b] = (diaRc[b] || 0) + (goldRc[b] || 0) + (ptRc[b] || 0);
 });

 const allSaleTargets: Record<string, number> = {};
 allBranchesSet.forEach(b => { allSaleTargets[b] = totalSale[b]; });

 // Diamond target data
 const diamondTargetData = cmAggregatedData.map((branch) => {
 const today = branch.diaSale.amount;
 const target = diaSale[branch.branchName] || DEFAULT_DIAMOND_TARGET;
 const ratio = target > 0 ? today / target : 0;
 const status: 'critical' |'warning' |'good' = ratio >= 1 ? 'good' : ratio >= 0.7 ? 'warning' : 'critical';
 return { shop: branch.branchName, today, target, status };
 });

 // PT target data
 const ptTargetData = cmAggregatedData.map((branch) => {
 const today = branch.ptSale.amount;
 const target = ptSale[branch.branchName] || DEFAULT_PT_TARGET;
 const ratio = target > 0 ? today / target : 0;
 const status: 'critical' |'warning' |'good' = ratio >= 1 ? 'good' : ratio >= 0.7 ? 'warning' : 'critical';
 return { shop: branch.branchName, today, target, status };
 });

 return {
 diamondTargetData,
 ptTargetData,
 prevMonthTotalSales: { perBranch: allSaleTargets, total: sumRecord(allSaleTargets) },
 prevMonthBreakdown: {
 diaSale, goldSale, ptSale, totalSale,
 diaRc, goldRc, ptRc, totalRc,
 totals: {
 diaSale: sumRecord(diaSale), goldSale: sumRecord(goldSale), ptSale: sumRecord(ptSale),
 totalSale: sumRecord(totalSale),
 diaRc: sumRecord(diaRc), goldRc: sumRecord(goldRc), ptRc: sumRecord(ptRc),
 totalRc: sumRecord(totalRc),
 },
 },
 };
 }, [cmAggregatedData, allData, selectedMonth]);

 // Gold target per shop per purity category - Target = previous month's gold sale amount by purity
 const goldTargetData = useMemo(() => {
 const prevMonth = getPreviousMonthName(selectedMonth);
 const prevMonthRows = (allData || []).filter((row) => {
 const rowDate = getRowDate(row);
 if (!rowDate) return false;
 return rowDate.toLocaleDateString('en-US', { month: 'long' }) === prevMonth;
 });

 const result: Record<string, { shop: string; today: number; target: number; status: 'critical' |'warning' |'good' }[]> = {};

 GOLD_PURITY_CATEGORIES.forEach((category) => {
 const todayTargets = getGoldTargetByPurity(data, category);
 const prevTargets = getGoldTargetByPurity(prevMonthRows, category);

 const shops = new Set([...Object.keys(todayTargets), ...Object.keys(prevTargets)]);
 const rows: { shop: string; today: number; target: number; status: 'critical' |'warning' |'good' }[] = [];

 cmAggregatedData.forEach((branch) => {
 const shop = branch.branchName;
 const today = todayTargets[shop] || 0;
 const target = prevTargets[shop] || DEFAULT_GOLD_TARGET;
 if (today === 0 && !prevTargets[shop]) return;
 const ratio = target > 0 ? today / target : 0;
 const status: 'critical' |'warning' |'good' = ratio >= 1 ? 'good' : ratio >= 0.7 ? 'warning' : 'critical';
 rows.push({ shop, today, target, status });
 });

 result[category] = rows;
 });

 return result;
 }, [cmAggregatedData, data, allData, selectedMonth]);


 // Color helper: green if current >= prev (for sales), inverted for RC
 const saleColorClass = (current: number, prev: number) => {
 if (prev === 0) return'';
 return current >= prev ? 'text-emerald-600' : 'text-rose-600';
 };
 const rcColorClass = (current: number, prev: number) => {
 if (prev === 0) return'';
 return current <= prev ? 'text-emerald-600' : 'text-rose-600';
 };

 const goldPuritySales = useMemo(() => {
 type GoldPurityRow = {
 branch: string;
 qty: number;
 gram: number;
 purities: Record<string, PurityCell>;
 };

 const purityKey = getPurityColumnKey(data[0]);
 const purityTypesSet = new Set<string>();
 const branches: Record<string, GoldPurityRow> = {};

 data.forEach((row) => {
 if (!isGoldSaleRow(row)) return;

 const purity = getPurityValue(row, purityKey);
 if (!purity) return;

 purityTypesSet.add(purity);

 const branch = getRowBranch(row);
 const { q, g } = parseRowQtyGram(row);

 if (!branches[branch]) {
 branches[branch] = {
 branch,
 qty: 0,
 gram: 0,
 purities: {},
 };
 }

 const entry = branches[branch];
 entry.qty += q;
 entry.gram += g;

 if (!entry.purities[purity]) {
 entry.purities[purity] = emptyPurityCell();
 }
 entry.purities[purity].qty += q;
 entry.purities[purity].gram += g;
 });

 const purityTypes = sortPurityLabels(Array.from(purityTypesSet));
 const rows = Object.values(branches).sort((a, b) => b.qty - a.qty || a.branch.localeCompare(b.branch));

 const grandTotal = rows.reduce(
 (sum, row) => {
 const nextPurities = { ...sum.purities };
 purityTypes.forEach((type) => {
 const cell = row.purities[type] || emptyPurityCell();
 if (!nextPurities[type]) nextPurities[type] = emptyPurityCell();
 nextPurities[type].qty += cell.qty;
 nextPurities[type].gram += cell.gram;
 });
 return {
 qty: sum.qty + row.qty,
 gram: sum.gram + row.gram,
 purities: nextPurities,
 };
 },
 { qty: 0, gram: 0, purities: {} as Record<string, PurityCell> }
 );

 return { rows, grandTotal, purityTypes, purityKey };
 }, [data]);

 const itemSaleSource = useMemo(() => {
 if (itemSaleMonthMode ==='current') return data;
 // Keep raw allData — sale/RC filtering happens in the single aggregation pass
 return allData || [];
 }, [itemSaleMonthMode, data, allData]);

 const computeItemSale = viewMode ==='itemSale';
 const computeItemRate = viewMode ==='itemRate';

 // Cache aggregates across tab switches; only rebuild when source/filters change
 const itemSaleCacheRef = useRef<{ key: string; data: ItemCategorySalesResult } | null>(null);
 const itemRateCacheRef = useRef<{ key: string; data: ItemRateSalesResult } | null>(null);
 const goldRateCacheRef = useRef<{ key: string; data: GoldRateAggregation } | null>(null);
 const itemFilterMetaCacheRef = useRef<{
 key: string;
 data: { branches: string[]; months: string[] };
 } | null>(null);

 const itemAggCacheKey = useMemo(() => {
 const branchesKey = selectedBranches.slice().sort().join('\0');
 return [
 itemSaleMonthMode,
 itemSaleSource.length,
 // Identity + size catch data refresh without scanning rows
 itemSaleSource === data ? 'cur' : 'all',
 branchesKey,
 itemSaleTypeFilter ?? '',
 itemSaleBranchFilter ?? '',
 itemSaleMonthFilter ?? '',
 itemSaleAmountFilter ?? '',
 selectedMonth,
 ].join('|');
 }, [
 itemSaleMonthMode,
 itemSaleSource,
 data,
 selectedBranches,
 itemSaleTypeFilter,
 itemSaleBranchFilter,
 itemSaleMonthFilter,
 itemSaleAmountFilter,
 selectedMonth,
 ]);

 const itemCategorySales = useMemo(() => {
 const cached = itemSaleCacheRef.current;
 if (cached && cached.key === itemAggCacheKey) {
 return cached.data;
 }
 if (!computeItemSale) {
 // Off-tab: drop stale cache; keep valid cache for instant tab return
 if (cached && cached.key !== itemAggCacheKey) {
 itemSaleCacheRef.current = null;
 }
 return itemSaleCacheRef.current?.data ?? EMPTY_ITEM_CATEGORY_SALES;
 }
 const data = buildItemSaleAndRateAggregates(itemSaleSource, {
 selectedBranches,
 typeFilter: itemSaleTypeFilter,
 branchFilter: itemSaleBranchFilter,
 monthFilter: itemSaleMonthFilter,
 amountFilter: itemSaleAmountFilter,
 computeSale: true,
 computeRate: false,
 }).itemCategorySales;
 itemSaleCacheRef.current = { key: itemAggCacheKey, data };
 return data;
 }, [
 computeItemSale,
 itemAggCacheKey,
 itemSaleSource,
 selectedBranches,
 itemSaleTypeFilter,
 itemSaleBranchFilter,
 itemSaleMonthFilter,
 itemSaleAmountFilter,
 ]);

 const itemRateSales = useMemo(() => {
 const cached = itemRateCacheRef.current;
 if (cached && cached.key === itemAggCacheKey) {
 return cached.data;
 }
 if (!computeItemRate) {
 if (cached && cached.key !== itemAggCacheKey) {
 itemRateCacheRef.current = null;
 }
 return itemRateCacheRef.current?.data ?? EMPTY_ITEM_RATE_SALES;
 }
 const data = buildItemSaleAndRateAggregates(itemSaleSource, {
 selectedBranches,
 typeFilter: itemSaleTypeFilter,
 branchFilter: itemSaleBranchFilter,
 monthFilter: itemSaleMonthFilter,
 amountFilter: itemSaleAmountFilter,
 computeSale: false,
 computeRate: true,
 }).itemRateSales;
 itemRateCacheRef.current = { key: itemAggCacheKey, data };
 return data;
 }, [
 computeItemRate,
 itemAggCacheKey,
 itemSaleSource,
 selectedBranches,
 itemSaleTypeFilter,
 itemSaleBranchFilter,
 itemSaleMonthFilter,
 itemSaleAmountFilter,
 ]);

 const filteredItemCategorySales = itemCategorySales;

 const isGoldRateMode = computeItemRate && (itemSaleTypeFilter ==='gold15' || itemSaleTypeFilter ==='gold16');

 const goldRateData = useMemo(() => {
 const cached = goldRateCacheRef.current;
 if (cached && cached.key === itemAggCacheKey) {
 return cached.data;
 }
 if (!computeItemRate) {
 if (cached && cached.key !== itemAggCacheKey) {
 goldRateCacheRef.current = null;
 }
 return goldRateCacheRef.current?.data ?? EMPTY_GOLD_RATE;
 }
 const data = buildGoldRateAggregation(
 itemSaleSource,
 selectedBranches,
 itemSaleBranchFilter,
 itemSaleMonthFilter,
 itemSaleMonthMode,
 );
 goldRateCacheRef.current = { key: itemAggCacheKey, data };
 return data;
 }, [
 computeItemRate,
 itemAggCacheKey,
 itemSaleSource,
 selectedBranches,
 itemSaleBranchFilter,
 itemSaleMonthFilter,
 itemSaleMonthMode,
 ]);

 const itemSaleFilterMeta = useMemo(() => {
 const metaKey = `${itemAggCacheKey}|${itemSaleMonthMode}`;
 const cached = itemFilterMetaCacheRef.current;
 if (cached && cached.key === metaKey) return cached.data;
 if (!computeItemSale && !computeItemRate) {
 return cached?.data ?? { branches: [] as string[], months: [] as string[] };
 }
 const branchSet = new Set<string>();
 const monthSet = new Set<string>();
 for (let i = 0; i < itemSaleSource.length; i++) {
 const row = itemSaleSource[i];
 branchSet.add(getRowBranch(row));
 if (itemSaleMonthMode ==='all') {
 const month = getRowMonthName(row);
 if (month) monthSet.add(month);
 }
 }
 const data = {
 branches: Array.from(branchSet).sort(),
 months: Array.from(monthSet),
 };
 itemFilterMetaCacheRef.current = { key: metaKey, data };
 return data;
 }, [itemSaleSource, itemSaleMonthMode, computeItemSale, computeItemRate, itemAggCacheKey]);

 const cusSource = useMemo(() => {
 if (cusMonthFilter ==='current') return data;
 return (allData || []).filter((row) => isSaleReasonRow(row) || isRcReasonRow(row));
 }, [cusMonthFilter, data, allData]);

 const cusList = useMemo(() => {
 const firstRow = cusSource[0];
 const contactKey = findColumnKey(firstRow,'Contact Number','Contact','Phone');
 const townshipKey = findColumnKey(firstRow,'Township');
 const map = new Map<
 string,
 {
 branch: string;
 buyerName: string;
 totalQty: number;
 totalAmount: number;
 rcQty: number;
 rcAmount: number;
 netSaleAmount: number;
 contactNumber: string;
 township: string;
 lastSaleDate: Date | null;
 lastRcDate: Date | null;
 lastSaleItem: string;
 lastItemsByType: Partial<Record<'dia' |'pt' |'gold15' |'gold16', { date: Date; item: string }>>;
 transactions: { date: string; branch: string; reason: string; category: string; qty: number; amount: number; type: 'sale' |'rc' }[];
 branchBreakdown: Record<string, {
 totalQty: number;
 totalAmount: number;
 rcQty: number;
 rcAmount: number;
 netSaleAmount: number;
 categories: Record<string, {
 sale: { qty: number; amount: number };
 rc: { qty: number; amount: number };
 total: { qty: number; amount: number };
 itemTypes: Set<'dia' |'pt' |'gold15' |'gold16'>;
 }>;
 itemTypes: Set<'dia' |'pt' |'gold15' |'gold16'>;
 lastItems: Partial<Record<'dia' |'pt' |'gold15' |'gold16', { date: Date; item: string }>>;
 }>;
 }
 >();

 const purityKey = getPurityColumnKey(firstRow);

 const getRowItemType = (row: DataRow): 'dia' |'pt' |'gold15' |'gold16' | null => {
 const reason = (getExtractedReason(row) ||'').trim();
 if (DIA_SALE_REASONS.has(reason) || DIA_RC_REASONS.has(reason)) return'dia';
 if (PT_SALE_REASONS.has(reason) || PT_RC_REASONS.has(reason)) return'pt';
 if (GOLD_SALE_REASONS.has(reason) || GOLD_RC_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 return goldCat ==='၁၆ပဲရည်' ? 'gold16' : 'gold15';
 }
 return null;
 };

 cusSource.forEach((row) => {
 const branch = getRowBranch(row);
 const buyerName = getCellText(row['ဝယ်သူ အမည်']);
 if (buyerName ==='-') return;

 const contactNumber = getCellText(row[contactKey] ?? row['Contact Number']);
 const township = getCellText(row[townshipKey] ?? row['Township']);
 const key = contactNumber !=='-' ? contactNumber : buyerName;
 const { q } = parseRowQtyGram(row);
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const rowDate = getRowDate(row);
 const rowItemCategory = (row['Item Category'] || row['Item Main Group'] || row['Category'] ||'').toString().trim();
 const isSale = isSaleReasonRow(row);
 const isRc = isRcReasonRow(row);
 if (!isSale && !isRc) return;

 const itemType = getRowItemType(row);

 const existing = map.get(key);
 if (existing) {
 if (isSale) {
 existing.totalQty += q;
 existing.totalAmount += a;
 if (rowDate && (!existing.lastSaleDate || rowDate > existing.lastSaleDate)) {
 existing.lastSaleDate = rowDate;
 if (rowItemCategory) existing.lastSaleItem = rowItemCategory;
 }
 // Track per-item-type last sale for the customer overall
 if (itemType && rowDate && rowItemCategory) {
 const current = existing.lastItemsByType[itemType];
 if (!current || rowDate > current.date) {
 existing.lastItemsByType[itemType] = { date: rowDate, item: rowItemCategory };
 }
 }
 }
 if (isRc) {
 existing.rcQty += q;
 existing.rcAmount += a;
 if (rowDate && (!existing.lastRcDate || rowDate > existing.lastRcDate)) {
 existing.lastRcDate = rowDate;
 }
 }
 if (existing.contactNumber ==='-' && contactNumber !=='-') existing.contactNumber = contactNumber;
 if (existing.township ==='-' && township !=='-') existing.township = township;
 existing.transactions.push({
 date: rowDate ? formatDisplayDate(rowDate) : (row.Date ||'-'),
 branch,
 reason: (getExtractedReason(row) ||'').trim(),
 category: rowItemCategory ||'-',
 qty: q,
 amount: a,
 type: isSale ? 'sale' : 'rc',
 });

 // Branch breakdown aggregation
 if (!existing.branchBreakdown[branch]) {
 existing.branchBreakdown[branch] = {
 totalQty: 0,
 totalAmount: 0,
 rcQty: 0,
 rcAmount: 0,
 netSaleAmount: 0,
 categories: {},
 itemTypes: new Set(),
 lastItems: {},
 };
 }
 const branchData = existing.branchBreakdown[branch];
 // Track item type
 const reason = (getExtractedReason(row) ||'').trim();
 if (DIA_SALE_REASONS.has(reason) || DIA_RC_REASONS.has(reason)) {
 branchData.itemTypes.add('dia');
 } else if (PT_SALE_REASONS.has(reason) || PT_RC_REASONS.has(reason)) {
 branchData.itemTypes.add('pt');
 } else if (GOLD_SALE_REASONS.has(reason) || GOLD_RC_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 branchData.itemTypes.add(goldCat ==='၁၆ပဲရည်' ? 'gold16' : 'gold15');
 }
 if (isSale) {
 branchData.totalQty += q;
 branchData.totalAmount += a;
 // Track per-item-type last sale within this branch
 if (itemType && rowDate && rowItemCategory) {
 const current = branchData.lastItems[itemType];
 if (!current || rowDate > current.date) {
 branchData.lastItems[itemType] = { date: rowDate, item: rowItemCategory };
 }
 }
 }
 if (isRc) {
 branchData.rcQty += q;
 branchData.rcAmount += a;
 }
 branchData.netSaleAmount = branchData.totalAmount - branchData.rcAmount;

 // Category aggregation within branch
 const category = row['Item Category'] || row['Category'] ||'Other';
 if (!branchData.categories[category]) {
 branchData.categories[category] = {
 sale: { qty: 0, amount: 0 },
 rc: { qty: 0, amount: 0 },
 total: { qty: 0, amount: 0 },
 itemTypes: new Set(),
 };
 }
 const catData = branchData.categories[category];
 // Track item type per category
 if (DIA_SALE_REASONS.has(reason) || DIA_RC_REASONS.has(reason)) {
 catData.itemTypes.add('dia');
 } else if (PT_SALE_REASONS.has(reason) || PT_RC_REASONS.has(reason)) {
 catData.itemTypes.add('pt');
 } else if (GOLD_SALE_REASONS.has(reason) || GOLD_RC_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 catData.itemTypes.add(goldCat ==='၁၆ပဲရည်' ? 'gold16' : 'gold15');
 }
 if (isSale) {
 catData.sale.qty += q;
 catData.sale.amount += a;
 catData.total.qty += q;
 catData.total.amount += a;
 }
 if (isRc) {
 catData.rc.qty += q;
 catData.rc.amount += a;
 catData.total.qty += q;
 catData.total.amount += a;
 }
 } else {
 const branchBreakdown: Record<string, {
 totalQty: number;
 totalAmount: number;
 rcQty: number;
 rcAmount: number;
 netSaleAmount: number;
 categories: Record<string, {
 sale: { qty: number; amount: number };
 rc: { qty: number; amount: number };
 total: { qty: number; amount: number };
 itemTypes: Set<'dia' |'pt' |'gold15' |'gold16'>;
 }>;
 itemTypes: Set<'dia' |'pt' |'gold15' |'gold16'>;
 lastItems: Partial<Record<'dia' |'pt' |'gold15' |'gold16', { date: Date; item: string }>>;
 }> = {};
 const category = row['Item Category'] || row['Category'] ||'Other';
 const reason = (getExtractedReason(row) ||'').trim();
 const itemTypes = new Set<'dia' |'pt' |'gold15' |'gold16'>();
 if (itemType) itemTypes.add(itemType);
 const lastItems: Partial<Record<'dia' |'pt' |'gold15' |'gold16', { date: Date; item: string }>> = {};
 if (itemType && isSale && rowDate && rowItemCategory) {
 lastItems[itemType] = { date: rowDate, item: rowItemCategory };
 }
 const lastItemsByType: Partial<Record<'dia' |'pt' |'gold15' |'gold16', { date: Date; item: string }>> = {};
 if (itemType && isSale && rowDate && rowItemCategory) {
 lastItemsByType[itemType] = { date: rowDate, item: rowItemCategory };
 }
 branchBreakdown[branch] = {
 totalQty: isSale ? q : 0,
 totalAmount: isSale ? a : 0,
 rcQty: isRc ? q : 0,
 rcAmount: isRc ? a : 0,
 netSaleAmount: (isSale ? a : 0) - (isRc ? a : 0),
 categories: {
 [category]: {
 sale: { qty: isSale ? q : 0, amount: isSale ? a : 0 },
 rc: { qty: isRc ? q : 0, amount: isRc ? a : 0 },
 total: { qty: (isSale ? q : 0) + (isRc ? q : 0), amount: (isSale ? a : 0) + (isRc ? a : 0) },
 itemTypes: new Set(itemTypes),
 }
 },
 itemTypes,
 lastItems,
 };
 map.set(key, {
 branch,
 buyerName,
 transactions: [{
 date: rowDate ? formatDisplayDate(rowDate) : (row.Date ||'-'),
 branch,
 reason: (getExtractedReason(row) ||'').trim(),
 category: rowItemCategory ||'-',
 qty: q,
 amount: a,
 type: isSale ? 'sale' : 'rc',
 }],
 totalQty: isSale ? q : 0,
 totalAmount: isSale ? a : 0,
 rcQty: isRc ? q : 0,
 rcAmount: isRc ? a : 0,
 netSaleAmount: (isSale ? a : 0) - (isRc ? a : 0),
 contactNumber,
 township,
 lastSaleDate: isSale ? rowDate : null,
 lastRcDate: isRc ? rowDate : null,
 lastSaleItem: isSale ? rowItemCategory : '',
 lastItemsByType,
 branchBreakdown
 });
 }
 });

 const rows = Array.from(map.values())
 .map((row) => {
 // Assign to the branch with the highest total amount
 let bestBranch = row.branch;
 let bestAmount = -1;
 Object.entries(row.branchBreakdown).forEach(([b, bd]) => {
 if (bd.totalAmount > bestAmount) {
 bestAmount = bd.totalAmount;
 bestBranch = b;
 }
 });
 const totalAmount = row.totalAmount;
 const customerTier: 'VIP' |'VVIP' |'CIP' | null =
 totalAmount >= 100_000_000 ? 'CIP' :
 totalAmount >= 50_000_000 ? 'VVIP' :
 totalAmount >= 30_000_000 ? 'VIP' : null;
 return {
 ...row,
 branch: bestBranch,
 netSaleAmount: row.totalAmount - row.rcAmount,
 lastSaleDateLabel: row.lastSaleDate ? formatDisplayDate(row.lastSaleDate) : '-',
 daysSinceVisit: getDaysSinceDate(
 row.lastSaleDate && row.lastRcDate
 ? row.lastSaleDate > row.lastRcDate ? row.lastSaleDate : row.lastRcDate
 : row.lastSaleDate || row.lastRcDate
 ),
 customerTier,
 };
 })
 .sort(
 (a, b) =>
 a.branch.localeCompare(b.branch) ||
 a.buyerName.localeCompare(b.buyerName)
 );

 const grandTotal = rows.reduce(
 (sum, row) => ({
 totalQty: sum.totalQty + row.totalQty,
 totalAmount: sum.totalAmount + row.totalAmount,
 rcQty: sum.rcQty + row.rcQty,
 rcAmount: sum.rcAmount + row.rcAmount,
 netSaleAmount: sum.netSaleAmount + row.netSaleAmount,
 }),
 { totalQty: 0, totalAmount: 0, rcQty: 0, rcAmount: 0, netSaleAmount: 0 }
 );

 return { rows, grandTotal };
 }, [cusSource]);

 const filteredCusList = useMemo(() => {
 const qBuyer = debouncedBuyer.trim().toLowerCase();
 const qDays = debouncedDaysSince.trim();

 const rows = cusList.rows.filter((row) => {
 if (qBuyer && !row.buyerName.toLowerCase().includes(qBuyer)) return false;
 if (cusBranchFilter && row.branch !== cusBranchFilter) return false;
 if (qDays) {
 const daysText = row.daysSinceVisit == null ? '' : String(row.daysSinceVisit);
 if (!daysText.includes(qDays)) return false;
 }
 if (cusItemCategoryFilter) {
 const hasCategory = Object.values(row.branchBreakdown).some(
 (bd) => Object.keys(bd.categories).some((cat) => cat === cusItemCategoryFilter)
 );
 if (!hasCategory) return false;
 }
 if (cusItemTypeFilter) {
 const hasType = Object.values(row.branchBreakdown).some(
 (bd) => bd.itemTypes && bd.itemTypes.has(cusItemTypeFilter)
 );
 if (!hasType) return false;
 }
 // Filter by customer tier (use filtered amount-based tier when cusBranchFilter or cusItemTypeFilter is active)
 if (customerTierFilter && (cusBranchFilter || cusItemTypeFilter)) {
 let fSaleAmt = 0;
 Object.entries(row.branchBreakdown).forEach(([branch, bd]) => {
 if (cusBranchFilter && branch !== cusBranchFilter) return;
 if (cusItemTypeFilter) {
 Object.entries(bd.categories).forEach(([, catData]) => {
 if (catData.itemTypes.has(cusItemTypeFilter)) fSaleAmt += catData.sale.amount;
 });
 } else {
 fSaleAmt += bd.totalAmount;
 }
 });
 const fTier: 'VIP' |'VVIP' |'CIP' | null =
 fSaleAmt >= 100_000_000 ? 'CIP' :
 fSaleAmt >= 50_000_000 ? 'VVIP' :
 fSaleAmt >= 30_000_000 ? 'VIP' : null;
 if (customerTierFilter ==='CARE') { if (fTier !== null) return false; }
 else if (fTier !== customerTierFilter) return false;
 } else if (customerTierFilter ==='CARE') {
 if (row.customerTier !== null) return false;
 } else if (customerTierFilter && row.customerTier !== customerTierFilter) return false;
 // Filter by active days filter
 if (activeDaysFilter) {
 const days = row.daysSinceVisit ?? 0;
 if (activeDaysFilter ==='green' && days > 30) return false;
 if (activeDaysFilter ==='yellow' && (days <= 30 || days > 60)) return false;
 if (activeDaysFilter ==='red' && days <= 60) return false;
 }
 return true;
 });

 const sortedRows = [...rows].sort((a, b) => {
 const valA = a[cusSortField];
 const valB = b[cusSortField];
 return cusSortOrder ==='asc' ? valA - valB : valB - valA;
 });

 // When cusBranchFilter or cusItemTypeFilter is active, compute per-row filtered totals
 const rowFilteredTotals = cusBranchFilter || cusItemTypeFilter
 ? sortedRows.map((row) => {
 let fQty = 0, fSaleAmt = 0, fRcAmt = 0;
 let fLastItem: string | undefined;
 let fLastDate: Date | undefined;
 Object.entries(row.branchBreakdown).forEach(([branch, bd]) => {
 if (cusBranchFilter && branch !== cusBranchFilter) return;
 if (cusItemTypeFilter) {
 Object.entries(bd.categories).forEach(([, catData]) => {
 if (catData.itemTypes.has(cusItemTypeFilter)) {
 fQty += catData.total.qty;
 fSaleAmt += catData.sale.amount;
 fRcAmt += catData.rc.amount;
 }
 });
 // Last item of the selected type in this branch
 const li = bd.lastItems[cusItemTypeFilter];
 if (li && (!fLastDate || li.date > fLastDate)) {
 fLastDate = li.date;
 fLastItem = li.item;
 }
 } else {
 fQty += bd.totalQty;
 fSaleAmt += bd.totalAmount;
 fRcAmt += bd.rcAmount;
 // Latest item among all types in this branch
 Object.values(bd.lastItems).forEach((li) => {
 if (li && (!fLastDate || li.date > fLastDate)) {
 fLastDate = li.date;
 fLastItem = li.item;
 }
 });
 }
 });
 const fTier: 'VIP' |'VVIP' |'CIP' | null =
 fSaleAmt >= 100_000_000 ? 'CIP' :
 fSaleAmt >= 50_000_000 ? 'VVIP' :
 fSaleAmt >= 30_000_000 ? 'VIP' : null;
 const fActivityDate = (fLastDate && row.lastRcDate)
 ? (fLastDate > row.lastRcDate ? fLastDate : row.lastRcDate)
 : (fLastDate || row.lastRcDate || undefined);
 const fDaysSinceVisit = fActivityDate != null ? getDaysSinceDate(fActivityDate) : null;
 return { fQty, fSaleAmt, fRcAmt, fNet: fSaleAmt - fRcAmt, fTier, fLastItem, fLastDate, fDaysSinceVisit };
 })
 : null;

 const grandTotal = sortedRows.reduce(
 (sum, row, idx) => {
 if (rowFilteredTotals) {
 const ft = rowFilteredTotals[idx];
 return {
 totalQty: sum.totalQty + ft.fQty,
 totalAmount: sum.totalAmount + ft.fSaleAmt,
 rcQty: sum.rcQty + 0,
 rcAmount: sum.rcAmount + ft.fRcAmt,
 netSaleAmount: sum.netSaleAmount + ft.fNet,
 };
 }
 return {
 totalQty: sum.totalQty + row.totalQty,
 totalAmount: sum.totalAmount + row.totalAmount,
 rcQty: sum.rcQty + row.rcQty,
 rcAmount: sum.rcAmount + row.rcAmount,
 netSaleAmount: sum.netSaleAmount + row.netSaleAmount,
 };
 },
 { totalQty: 0, totalAmount: 0, rcQty: 0, rcAmount: 0, netSaleAmount: 0 }
 );

 // Calculate summary by days since visit categories
 const daysSinceSummary = {
 green: { totalQty: 0, totalAmount: 0, rcQty: 0, rcAmount: 0, netSaleAmount: 0 }, // 0-30 days
 yellow: { totalQty: 0, totalAmount: 0, rcQty: 0, rcAmount: 0, netSaleAmount: 0 }, // 31-60 days
 red: { totalQty: 0, totalAmount: 0, rcQty: 0, rcAmount: 0, netSaleAmount: 0 }, // 61+ days
 };

 sortedRows.forEach((row) => {
 const days = row.daysSinceVisit ?? 0;
 let category: 'green' |'yellow' |'red';
 if (days <= 30) {
 category ='green';
 } else if (days <= 60) {
 category ='yellow';
 } else {
 category ='red';
 }

 daysSinceSummary[category].totalQty += row.totalQty;
 daysSinceSummary[category].totalAmount += row.totalAmount;
 daysSinceSummary[category].rcQty += row.rcQty;
 daysSinceSummary[category].rcAmount += row.rcAmount;
 daysSinceSummary[category].netSaleAmount += row.netSaleAmount;
 });

 return {
 rows: sortedRows,
 grandTotal,
 daysSinceSummary,
 rowFilteredTotals,
 hasFilter: !!(qBuyer || qDays || cusItemCategoryFilter || cusItemTypeFilter || activeDaysFilter || customerTierFilter || cusBranchFilter),
 };
 }, [cusList, debouncedBuyer, debouncedDaysSince, cusSortField, cusSortOrder, cusItemCategoryFilter, cusItemTypeFilter, activeDaysFilter, customerTierFilter, cusBranchFilter]);

 const cusSearchInputClass =
'w-full px-2 py-1.5 text-[11px] rounded-lg border border-[#e8e8e8] bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 focus:outline-none placeholder:text-gray-400';

 const handleExportExcel = useCallback(() => {
 const safeMonth = selectedMonth.replace(/\s+/g,'_');
 const wb = XLSX.utils.book_new();

 // Export CUS List (main rows only, no branch/category breakdown)
 const cusAoa = [
 ['Branch','ဝယ်သူ အမည်','Total Qty (Sale)','Total Amount (Sale)','Total Qty (RC)','Total Amount (RC)','Net Sale','Contact Number','Township','နောက်ဆုံး Sale Date','ဆိုင်သို့မရောက်ဖြစ်သောရက်','Last Item']
 ];

 filteredCusList.rows.forEach((r, idx) => {
 const ft = filteredCusList.rowFilteredTotals?.[idx];
 const lastItem = ft?.fLastItem ?? r.lastSaleItem;
 const lastDate = ft?.fLastDate ? formatDisplayDate(ft.fLastDate) : r.lastSaleDateLabel;
 const daysSinceVisit = ft?.fDaysSinceVisit ?? r.daysSinceVisit;
 cusAoa.push([
 r.branch,
 r.buyerName,
 r.totalQty.toString(),
 r.totalAmount.toString(),
 r.rcQty.toString(),
 r.rcAmount.toString(),
 r.netSaleAmount.toString(),
 r.contactNumber,
 r.township,
 lastDate,
 daysSinceVisit?.toString() ?? '',
 lastItem ||''
 ]);
 });

 const cusSheet = XLSX.utils.aoa_to_sheet(cusAoa);
 XLSX.utils.book_append_sheet(wb, cusSheet,'CUS List');

 // Export Branch Report (Report အားလုံးကြည့်ရန်)
 const branchHeaders = [
'Branch',
'Dia Sale Qty','Dia Sale Amount',
'PT Sale Qty','PT Sale Amount',
'Gold(15) Sale Qty','Gold(15) Sale Amount',
'Gold(16) Sale Qty','Gold(16) Sale Amount',
'Total Sale Qty','Total Sale Amount',
'Dia RC Qty','Dia RC Amount',
'PT RC Qty','PT RC Amount',
'Gold(15) RC Qty','Gold(15) RC Amount',
'Gold(16) RC Qty','Gold(16) RC Amount',
'Total RC Qty','Total RC Amount',
'RC %',
'Net Sale Qty','Net Sale Amount',
 ];

 const branchBody = cmData.map((b) => {
 const tSaleAmount = b.diaSale.amount + b.gold15Sale.amount + b.gold16Sale.amount + b.ptSale.amount;
 const tSaleQty = b.diaSale.qty + b.gold15Sale.qty + b.gold16Sale.qty + b.ptSale.qty;

 const tRcAmount = b.diaRc.amount + b.gold15Rc.amount + b.gold16Rc.amount + b.ptRc.amount;
 const tRcQty = b.diaRc.qty + b.gold15Rc.qty + b.gold16Rc.qty + b.ptRc.qty;

 const nSaleAmount = tSaleAmount - tRcAmount;
 const nSaleQty = tSaleQty - tRcQty;

 return [
 b.branchName,
 b.diaSale.qty, b.diaSale.amount,
 b.ptSale.qty, b.ptSale.amount,
 b.gold15Sale.qty, b.gold15Sale.amount,
 b.gold16Sale.qty, b.gold16Sale.amount,
 tSaleQty, tSaleAmount,
 b.diaRc.qty, b.diaRc.amount,
 b.ptRc.qty, b.ptRc.amount,
 b.gold15Rc.qty, b.gold15Rc.amount,
 b.gold16Rc.qty, b.gold16Rc.amount,
 tRcQty, tRcAmount,
 tSaleAmount !== 0 ? `${((tRcAmount / tSaleAmount) * 100).toFixed(1)}%` : '-',
 nSaleQty, nSaleAmount,
 ];
 });

 branchBody.push([
'Total',
 totals.diaSale.qty, totals.diaSale.amount,
 totals.ptSale.qty, totals.ptSale.amount,
 totals.gold15Sale.qty, totals.gold15Sale.amount,
 totals.gold16Sale.qty, totals.gold16Sale.amount,
 totals.totalSale.qty, totals.totalSale.amount,
 totals.diaRc.qty, totals.diaRc.amount,
 totals.ptRc.qty, totals.ptRc.amount,
 totals.gold15Rc.qty, totals.gold15Rc.amount,
 totals.gold16Rc.qty, totals.gold16Rc.amount,
 totals.totalRc.qty, totals.totalRc.amount,
 totals.totalSale.amount !== 0 ? `${((totals.totalRc.amount / totals.totalSale.amount) * 100).toFixed(1)}%` : '-',
 totals.netSale.qty, totals.netSale.amount,
 ]);

 const branchSheet = XLSX.utils.aoa_to_sheet([branchHeaders, ...branchBody]);
 XLSX.utils.book_append_sheet(wb, branchSheet,'Branch Report');

 // Export Item အလိုက်ရောင်းအား (compute on demand so other tabs stay light)
 const exportItemSales = computeItemSale
 ? filteredItemCategorySales
 : buildItemSaleAndRateAggregates(itemSaleSource, {
 selectedBranches,
 typeFilter: itemSaleTypeFilter,
 branchFilter: itemSaleBranchFilter,
 monthFilter: itemSaleMonthFilter,
 amountFilter: itemSaleAmountFilter,
 computeSale: true,
 computeRate: false,
 }).itemCategorySales;

 const itemHeaders = [
'Branch',
'Item Main Group',
'Sale Qty',
'Sale Gram',
'Sale Amount',
'RC Qty',
'RC Gram',
'RC Amount',
'Total Qty',
'Total Gram',
'Total Amount',
 ];

 const itemBody = exportItemSales.rows.map((row) => [
 row.branch,
 row.itemMainGroup || row.category ||'-',
 row.saleQty,
 row.saleGram,
 row.saleAmount,
 row.rcQty,
 row.rcGram,
 row.rcAmount,
 row.totalQty,
 row.totalGram,
 row.totalAmount,
 ]);

 itemBody.push([
'Grand Total',
'-',
 exportItemSales.grandTotal.saleQty,
 exportItemSales.grandTotal.saleGram,
 exportItemSales.grandTotal.saleAmount,
 exportItemSales.grandTotal.rcQty,
 exportItemSales.grandTotal.rcGram,
 exportItemSales.grandTotal.rcAmount,
 exportItemSales.grandTotal.totalQty,
 exportItemSales.grandTotal.totalGram,
 exportItemSales.grandTotal.totalAmount,
 ]);

 const itemSheet = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemBody]);
 XLSX.utils.book_append_sheet(wb, itemSheet,'Item အလိုက်ရောင်းအား');

 XLSX.writeFile(wb, `CM_View_Full_Report_${safeMonth}.xlsx`);
 }, [
 selectedMonth,
 filteredCusList,
 cmData,
 totals,
 computeItemSale,
 filteredItemCategorySales,
 itemSaleSource,
 selectedBranches,
 itemSaleTypeFilter,
 itemSaleBranchFilter,
 itemSaleMonthFilter,
 itemSaleAmountFilter,
 ]);

 const getMetricValue = useCallback((item: { amount: number; gram: number; qty: number }) => {
 if (metricMode ==='amount') {
 return item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
 }
 if (metricMode ==='gram') {
 return formatGramValue(item.gram);
 }
 return item.qty.toString();
 }, [metricMode]);

 return (
 <div className={`space-y-3 ${fullscreenTable ? 'fixed inset-0 z-50 overflow-auto bg-[#f5f5f5] p-4' : ''}`}>
 {/* Fullscreen Close Button */}
 {fullscreenTable && (
 <button
 onClick={() => setFullscreenTable(null)}
 className="fixed right-4 top-4 z-[60] rounded-md border border-[#e8e8e8] bg-white p-2 text-[#595959] shadow-sm hover:text-[#1677ff]"
 title="Exit Full Screen"
 >
 <Minimize2 className="h-4 w-4" />
 </button>
 )}
 {/* View Actions Bar */}
 {!fixedViewMode && (
 <div className="flex flex-col items-start justify-between gap-2.5 rounded-xl border border-[#e8e8e8] bg-white p-2.5 lg:flex-row lg:items-center">
 {/* Report View Toggles */}
 <div className="flex w-full flex-wrap items-center gap-1.5 lg:w-auto">
 <button
 onClick={() => setViewMode('full')}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors
 ${viewMode ==='full'
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 Report အားလုံးကြည့်ရန်
 </button>
 <button
 onClick={() => setViewMode('net')}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors
 ${viewMode ==='net'
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 Net Sale Report
 </button>
 <button
 onClick={() => setViewMode('allBranch')}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors
 ${viewMode ==='allBranch'
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 All Branch Sale (Dia, Gold, PT)
 </button>
 <button
 onClick={() => setViewMode('itemSale')}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors
 ${viewMode ==='itemSale'
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 Item အလိုက်ရောင်းအား
 </button>
 <button
 onClick={() => setViewMode('itemRate')}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors
 ${viewMode ==='itemRate'
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 Item rate
 </button>
 <button
 onClick={() => setViewMode('cusList')}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors
 ${viewMode ==='cusList'
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 CUS List
 </button>
 </div>

 {/* Metric Toggles & Export */}
 <div className="flex w-full flex-wrap items-center gap-1.5 lg:ml-auto lg:w-auto">
 {(['amount','gram','qty'] as const).map((mode) => (
 <button
 key={mode}
 onClick={() => setMetricMode(mode)}
 className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors
 ${metricMode === mode
 ? 'border-[#1677ff] bg-[#1677ff] text-white'
 : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#262626]'
 }`}
 >
 {mode}
 </button>
 ))}

 <button
 onClick={handleExportExcel}
 className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500 bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-600"
 >
 <Download className="h-3.5 w-3.5" />
 Export Excel
 </button>
 </div>
 </div>
 )}

 {/* Item Sales by Category */}
 {viewMode ==='itemSale' && (
 <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white">
 <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">Item အလိုက်ရောင်းအား</h3>
 <button
 onClick={() => setFullscreenTable(fullscreenTable ==='itemSale' ? null : 'itemSale')}
 className="flex items-center justify-center p-2 bg-[#1677ff] text-white hover:bg-[#4096ff] rounded-lg transition-all border border-[#1677ff]"
 title="Full Screen"
 >
 {fullscreenTable ==='itemSale' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 </div>
 <div className="flex items-center gap-1 flex-wrap">
 <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-[#e8e8e8]">
 <button
 onClick={() => {
 setItemSaleMonthMode('current');
 setItemSaleMonthFilter(null);
 }}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 itemSaleMonthMode ==='current'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 Current Month
 </button>
 <button
 onClick={() => setItemSaleMonthMode('all')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 itemSaleMonthMode ==='all'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 All Month
 </button>
 </div>
 <span className="w-px h-5 bg-gray-200 mx-1" />
 {([
 { type: 'dia' as const, label: 'Dia' },
 { type: 'pt' as const, label: 'PT' },
 { type: 'gold15' as const, label: 'Gold(15)' },
 { type: 'gold16' as const, label: 'Gold(16)' },
 ]).map(({ type, label }) => (
 <button
 key={type}
 onClick={() => setItemSaleTypeFilter(itemSaleTypeFilter === type ? null : type)}
 className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
 itemSaleTypeFilter === type
 ? 'bg-[#1677ff] text-white border border-[#1677ff]'
 : 'bg-gray-50 text-gray-600 border border-[#e8e8e8] hover:bg-gray-100'
 }`}
 >
 {label}
 </button>
 ))}
 <span className="w-px h-5 bg-gray-200 mx-1" />
 <div className="flex items-center gap-1 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Amount:</span>
 {ITEM_AMOUNT_RANGE_OPTIONS.map(({ range, label }) => (
 <button
 key={range}
 onClick={() => setItemSaleAmountFilter(itemSaleAmountFilter === range ? null : range)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
 itemSaleAmountFilter === range
 ? 'bg-violet-600 text-white border border-violet-700'
 : 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100'
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 <span className="w-px h-5 bg-gray-200 mx-1" />
 {itemSaleFilterMeta.branches.length > 1 && (
 <div className="flex items-center gap-1 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Branch:</span>
 {itemSaleFilterMeta.branches.map((branch) => (
 <button
 key={branch}
 onClick={() => setItemSaleBranchFilter(itemSaleBranchFilter === branch ? null : branch)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
 itemSaleBranchFilter === branch
 ? 'bg-emerald-600 text-white border border-emerald-700'
 : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
 }`}
 >
 {branch}
 </button>
 ))}
 </div>
 )}
 {itemSaleMonthMode ==='all' && itemSaleFilterMeta.months.length > 1 && (
 <>
 <span className="w-px h-5 bg-gray-200 mx-1" />
 <div className="flex items-center gap-1 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Month:</span>
 {itemSaleFilterMeta.months.map((month) => (
 <button
 key={month}
 onClick={() => setItemSaleMonthFilter(itemSaleMonthFilter === month ? null : month)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
 itemSaleMonthFilter === month
 ? 'bg-blue-600 text-white border border-blue-700'
 : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
 }`}
 >
 {month}
 </button>
 ))}
 </div>
 </>
 )}
 </div>
 </div>
 <div className="overflow-x-auto max-h-[600px]">
 <table className="w-full table-fixed text-left border-collapse">
 <colgroup>
 {showItemBranchColumn && <col className="w-[10%]" />}
 <col className={showItemBranchColumn ? 'w-[16%]' : 'w-[19%]'} />
 <col className="w-[8%]" />
 <col className="w-[8%]" />
 <col className="w-[11%]" />
 <col className="w-[8%]" />
 <col className="w-[8%]" />
 <col className="w-[11%]" />
 <col className="w-[8%]" />
 <col className="w-[8%]" />
 <col className="w-[11%]" />
 </colgroup>
 <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-100">
 <tr>
 {showItemBranchColumn && (
 <th rowSpan={2} className="py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap align-middle" title="Branch အမည်">
 Branch
 </th>
 )}
 <th rowSpan={2} className="py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider align-middle" title="Item Main Group">
 Item Main Group
 </th>
 <th className="py-2 px-2 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider text-center border-l-2 border-emerald-100 border-b border-emerald-100" colSpan={3} title="ရောင်းအား">
 Sale
 </th>
 <th className="py-2 px-2 text-[10px] font-semibold text-rose-500 uppercase tracking-wider text-center border-l-2 border-rose-100 border-b border-rose-100" colSpan={3} title="Return/Cancel">
 RC
 </th>
 <th className="py-2 px-2 text-[10px] font-semibold text-blue-600 uppercase tracking-wider text-center border-l-2 border-blue-100 border-b border-blue-100" colSpan={3} title="Sale - RC = Net Total">
 Net Total
 </th>
 </tr>
 <tr>
 <th className="py-2 px-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider text-center border-l-2 border-emerald-100" title="အရေအတွက်">
 Qty
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider text-center" title="အလေးချိန်">
 Gram
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider text-center" title="ပမာဏ">
 Amount
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-rose-300 uppercase tracking-wider text-center border-l-2 border-rose-100" title="အရေအတွက်">
 Qty
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-rose-300 uppercase tracking-wider text-center" title="အလေးချိန်">
 Gram
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-rose-300 uppercase tracking-wider text-center" title="ပမာဏ">
 Amount
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider text-center border-l-2 border-blue-100" title="အရေအတွက်">
 Qty
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider text-center" title="အလေးချိန်">
 Gram
 </th>
 <th className="py-2 px-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider text-center" title="ပမာဏ">
 Amount
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {filteredItemCategorySales.rows.length === 0 ? (
 <tr>
 <td colSpan={showItemBranchColumn ? 10 : 9} className="py-10 px-4 text-center text-sm text-gray-400 font-medium">
 Item Main Group ရောင်းအား data မရှိပါ (column: {filteredItemCategorySales.categoryKey})
 </td>
 </tr>
 ) : (
 <>
 {filteredItemCategorySales.rows.map((row) => {
 const isExpandable =
 filteredItemCategorySales.aggregateByCategoryOnly &&
'branchBreakdown' in row &&
 row.branchBreakdown.length > 0;
 const isExpanded = expandedItemCategory === row.category;

 // Hide other item categories when one is expanded
 if (expandedItemCategory && expandedItemCategory !== row.category) {
 return null;
 }

 return (
 <Fragment key={showItemBranchColumn ? `${row.branch}-${row.category}` : row.category}>
 <tr
 className={`transition-colors ${isExpandable ? 'cursor-pointer hover:bg-gray-50/50' : 'hover:bg-gray-50/50'} ${isExpanded ? 'bg-gray-50/30' : ''}`}
 onClick={() => {
 if (!isExpandable) return;
 setExpandedItemCategory(isExpanded ? null : row.category);
 }}
 >
 {showItemBranchColumn && (
 <td className="py-2.5 px-4 text-[12px] font-medium text-[#8c8c8c] whitespace-nowrap truncate">
 {row.branch}
 </td>
 )}
 <td className="py-2.5 px-4 text-[12px] text-[#8c8c8c]">
 <div className="flex items-center gap-1.5 min-w-0">
 {isExpandable && (
 <span className="text-[#8c8c8c] flex-shrink-0">
 {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </span>
 )}
 <span className="truncate">{row.itemMainGroup || row.category ||'-'}</span>
 </div>
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] text-emerald-700 tabular-nums border-l-2 border-emerald-100 bg-emerald-50/30">
 {row.saleQty === 0 ? '-' : row.saleQty}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] text-emerald-700 tabular-nums bg-emerald-50/30">
 {row.saleGram === 0 ? '-' : formatGramValue(row.saleGram)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-semibold text-emerald-800 tabular-nums bg-emerald-50/30">
 {row.saleAmount === 0 ? '-' : renderCompactAmount(row.saleAmount)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] text-rose-600 tabular-nums border-l-2 border-rose-100 bg-rose-50/30">
 {row.rcQty === 0 ? '-' : row.rcQty}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] text-rose-600 tabular-nums bg-rose-50/30">
 {row.rcGram === 0 ? '-' : formatGramValue(row.rcGram)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-semibold text-rose-700 tabular-nums bg-rose-50/30">
 {row.rcAmount === 0 ? '-' : renderCompactAmount(row.rcAmount)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-semibold text-blue-700 tabular-nums border-l-2 border-blue-100 bg-blue-50/30">
 {row.totalQty === 0 ? '-' : row.totalQty}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-semibold text-blue-700 tabular-nums bg-blue-50/30">
 {row.totalGram === 0 ? '-' : formatGramValue(row.totalGram)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-semibold text-blue-800 tabular-nums bg-blue-50/30">
 {row.totalAmount === 0 ? '-' : renderCompactAmount(row.totalAmount)}
 </td>
 </tr>

 {isExpanded && isExpandable && (
 <tr>
 <td colSpan={showItemBranchColumn ? 10 : 9} className="p-0 bg-gray-50/20">
 <ExpandedBreakdownPanel title="Branch Breakdown" icon={Building2}>
 <div className="overflow-x-auto">
 <div className="grid grid-cols-[minmax(8rem,1.1fr)_repeat(9,minmax(3.5rem,1fr))] gap-2 px-4 bg-gray-50/50 border-b border-gray-100/80 min-w-[800px]">
 <div className="row-span-2 flex items-center py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Branch</div>
 <div className="col-span-3 py-1.5 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider text-center border-l-2 border-emerald-100 border-b border-emerald-100">Sale</div>
 <div className="col-span-3 py-1.5 text-[10px] font-semibold text-rose-500 uppercase tracking-wider text-center border-l-2 border-rose-100 border-b border-rose-100">RC</div>
 <div className="col-span-3 py-1.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wider text-center border-l-2 border-blue-100 border-b border-blue-100">Net Total</div>
 <span className="py-1 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider text-center border-l-2 border-emerald-100">Qty</span>
 <span className="py-1 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider text-center">Gram</span>
 <span className="py-1 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider text-center">Amount</span>
 <span className="py-1 text-[9px] font-semibold text-rose-300 uppercase tracking-wider text-center border-l-2 border-rose-100">Qty</span>
 <span className="py-1 text-[9px] font-semibold text-rose-300 uppercase tracking-wider text-center">Gram</span>
 <span className="py-1 text-[9px] font-semibold text-rose-300 uppercase tracking-wider text-center">Amount</span>
 <span className="py-1 text-[9px] font-semibold text-blue-400 uppercase tracking-wider text-center border-l-2 border-blue-100">Qty</span>
 <span className="py-1 text-[9px] font-semibold text-blue-400 uppercase tracking-wider text-center">Gram</span>
 <span className="py-1 text-[9px] font-semibold text-blue-400 uppercase tracking-wider text-center">Amount</span>
 </div>
 <div className="divide-y divide-gray-50 min-w-[800px]">
 {row.branchBreakdown.map((branchRow) => (
 <div
 key={`${row.category}-${branchRow.branch}`}
 className="grid grid-cols-[minmax(8rem,1.1fr)_repeat(9,minmax(3.5rem,1fr))] gap-2 items-center px-4 py-2 hover:bg-gray-50/50 transition-colors"
 >
 <span className="text-[12px] font-medium text-[#8c8c8c] truncate">
 {branchRow.branch}
 </span>
 <div className="flex justify-center">
 <ExpandedMetricBadge value={branchRow.saleQty === 0 ? '-' : branchRow.saleQty} />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.saleGram === 0 ? '-' : formatGramValue(branchRow.saleGram)}
 />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.saleAmount === 0 ? '-' : formatCompactAmountValue(branchRow.saleAmount)}
 />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge value={branchRow.rcQty === 0 ? '-' : branchRow.rcQty} />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.rcGram === 0 ? '-' : formatGramValue(branchRow.rcGram)}
 />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.rcAmount === 0 ? '-' : formatCompactAmountValue(branchRow.rcAmount)}
 />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge value={branchRow.totalQty === 0 ? '-' : branchRow.totalQty} tone="net" />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.totalGram === 0 ? '-' : formatGramValue(branchRow.totalGram)}
 tone="net"
 />
 </div>
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.totalAmount === 0 ? '-' : formatCompactAmountValue(branchRow.totalAmount)}
 tone="net"
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </ExpandedBreakdownPanel>
 </td>
 </tr>
 )}
 </Fragment>
 );
 })}
 <tr className="bg-gray-50/80 font-bold border-t-2 border-gray-100">
 <td
 colSpan={showItemBranchColumn ? 2 : 1}
 className="py-2.5 px-4 text-[12px] font-bold text-gray-900"
 >
 Grand Total
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-emerald-700 tabular-nums border-l-2 border-emerald-100 bg-emerald-50/40">
 {filteredItemCategorySales.grandTotal.saleQty === 0 ? '-' : filteredItemCategorySales.grandTotal.saleQty}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-emerald-700 tabular-nums bg-emerald-50/40">
 {filteredItemCategorySales.grandTotal.saleGram === 0 ? '-' : formatGramValue(filteredItemCategorySales.grandTotal.saleGram)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-emerald-800 tabular-nums bg-emerald-50/40">
 {filteredItemCategorySales.grandTotal.saleAmount === 0 ? '-' : renderCompactAmount(filteredItemCategorySales.grandTotal.saleAmount)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-rose-600 tabular-nums border-l-2 border-rose-100 bg-rose-50/40">
 {filteredItemCategorySales.grandTotal.rcQty === 0 ? '-' : filteredItemCategorySales.grandTotal.rcQty}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-rose-600 tabular-nums bg-rose-50/40">
 {filteredItemCategorySales.grandTotal.rcGram === 0 ? '-' : formatGramValue(filteredItemCategorySales.grandTotal.rcGram)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-rose-700 tabular-nums bg-rose-50/40">
 {filteredItemCategorySales.grandTotal.rcAmount === 0 ? '-' : renderCompactAmount(filteredItemCategorySales.grandTotal.rcAmount)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-blue-700 tabular-nums border-l-2 border-blue-100 bg-blue-50/40">
 {filteredItemCategorySales.grandTotal.totalQty === 0 ? '-' : filteredItemCategorySales.grandTotal.totalQty}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-blue-700 tabular-nums bg-blue-50/40">
 {filteredItemCategorySales.grandTotal.totalGram === 0 ? '-' : formatGramValue(filteredItemCategorySales.grandTotal.totalGram)}
 </td>
 <td className="py-2.5 px-1 text-center text-[12px] font-bold text-blue-800 tabular-nums bg-blue-50/40">
 {filteredItemCategorySales.grandTotal.totalAmount === 0 ? '-' : renderCompactAmount(filteredItemCategorySales.grandTotal.totalAmount)}
 </td>
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Item Rate by Amount Range — per transaction voucher amount */}
 {viewMode ==='itemRate' && (
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">Item rate</h3>
 <button
 onClick={() => setFullscreenTable(fullscreenTable ==='itemRate' ? null : 'itemRate')}
 className="flex items-center justify-center p-2 bg-[#1677ff] text-white hover:bg-[#4096ff] rounded-lg transition-all border border-[#1677ff]"
 title="Full Screen"
 >
 {fullscreenTable ==='itemRate' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 </div>
 <div className="flex items-center gap-1 flex-wrap">
 <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-[#e8e8e8]">
 <button
 onClick={() => {
 setItemSaleMonthMode('current');
 setItemSaleMonthFilter(null);
 }}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 itemSaleMonthMode ==='current'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 Current Month
 </button>
 <button
 onClick={() => setItemSaleMonthMode('all')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 itemSaleMonthMode ==='all'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 All Month
 </button>
 </div>
 <span className="w-px h-5 bg-gray-200 mx-1" />
 {([
 { type: 'dia' as const, label: 'Dia' },
 { type: 'pt' as const, label: 'PT' },
 { type: 'gold15' as const, label: 'Gold(15)' },
 { type: 'gold16' as const, label: 'Gold(16)' },
 ]).map(({ type, label }) => (
 <button
 key={type}
 onClick={() => setItemSaleTypeFilter(itemSaleTypeFilter === type ? null : type)}
 className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
 itemSaleTypeFilter === type
 ? 'bg-[#1677ff] text-white border border-[#1677ff]'
 : 'bg-gray-50 text-gray-600 border border-[#e8e8e8] hover:bg-gray-100'
 }`}
 >
 {label}
 </button>
 ))}
 <span className="w-px h-5 bg-gray-200 mx-1" />
 <div className="flex items-center gap-1 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Amount:</span>
 {ITEM_AMOUNT_RANGE_OPTIONS.map(({ range, label }) => (
 <button
 key={range}
 onClick={() => setItemSaleAmountFilter(itemSaleAmountFilter === range ? null : range)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
 itemSaleAmountFilter === range
 ? 'bg-violet-600 text-white border border-violet-700'
 : 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100'
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 <span className="w-px h-5 bg-gray-200 mx-1" />
 {itemSaleFilterMeta.branches.length > 1 && (
 <div className="flex items-center gap-1 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Branch:</span>
 {itemSaleFilterMeta.branches.map((branch) => (
 <button
 key={branch}
 onClick={() => setItemSaleBranchFilter(itemSaleBranchFilter === branch ? null : branch)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
 itemSaleBranchFilter === branch
 ? 'bg-emerald-600 text-white border border-emerald-700'
 : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
 }`}
 >
 {branch}
 </button>
 ))}
 </div>
 )}
 {itemSaleMonthMode ==='all' && itemSaleFilterMeta.months.length > 1 && (
 <>
 <span className="w-px h-5 bg-gray-200 mx-1" />
 <div className="flex items-center gap-1 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Month:</span>
 {itemSaleFilterMeta.months.map((month) => (
 <button
 key={month}
 onClick={() => setItemSaleMonthFilter(itemSaleMonthFilter === month ? null : month)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
 itemSaleMonthFilter === month
 ? 'bg-blue-600 text-white border border-blue-700'
 : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
 }`}
 >
 {month}
 </button>
 ))}
 </div>
 </>
 )}
 </div>
 </div>
 {isGoldRateMode ? (
 <div className="overflow-x-auto max-h-[600px]">
 {/* Gold Rate Hierarchical View */}
 {(() => {
 const goldType = itemSaleTypeFilter as'gold15' |'gold16';
 const typeData = goldRateData.goldTypes[goldType];
 const branches = goldRateData.branches;
 if (!typeData || typeData.items.length === 0) {
 return (
 <div className="py-10 px-4 text-center text-sm text-gray-400 font-medium">
 No {goldType ==='gold16' ? 'Gold(16)' : 'Gold(15)'} rate data available
 </div>
 );
 }
 return (
 <table className="w-full table-fixed text-left border-collapse">
 <colgroup>
 <col className="w-[16%]" />
 {branches.map((b) => <col key={b} />)}
 <col className="w-[10%]" />
 </colgroup>
 <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-100">
 <tr>
 <th className="py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
 Item Main Group
 </th>
 {branches.map((branch) => (
 <th key={branch} className="py-2.5 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">
 {branch}
 </th>
 ))}
 <th className="py-2.5 px-3 text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wider text-center border-l border-[#e8e8e8]">
 Total
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {typeData.items.map((item) => {
 const isItemExpanded = expandedGoldRateItem === item.itemMainGroup;
 if (expandedGoldRateItem && expandedGoldRateItem !== item.itemMainGroup) return null;
 return (
 <Fragment key={item.itemMainGroup}>
 <tr
 className={`transition-colors cursor-pointer hover:bg-gray-50/50 ${isItemExpanded ? 'bg-gray-50/30' : ''}`}
 onClick={() => setExpandedGoldRateItem(isItemExpanded ? null : item.itemMainGroup)}
 >
 <td className="py-2.5 px-4 text-[12px] text-[#8c8c8c]">
 <div className="flex items-center gap-1.5 min-w-0">
 <span className="text-[#8c8c8c] flex-shrink-0">
 {isItemExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </span>
 <span className="truncate font-medium text-gray-800">{item.itemMainGroup}</span>
 </div>
 </td>
 {branches.map((branch) => {
 const qty = item.branchQtys[branch] || 0;
 return (
 <td key={branch} className="py-2.5 px-2 text-center border-l border-gray-50">
 {qty > 0 ? (
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums bg-amber-50 text-amber-700 border border-amber-200">
 {qty}
 </span>
 ) : (
 <span className="text-[12px] text-[#8c8c8c]">-</span>
 )}
 </td>
 );
 })}
 <td className="py-2.5 px-3 text-center border-l border-[#e8e8e8]">
 {item.totalQty > 0 ? (
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums bg-[#1677ff] text-white">
 {item.totalQty}
 </span>
 ) : (
 <span className="text-[12px] text-[#8c8c8c]">-</span>
 )}
 </td>
 </tr>
 {isItemExpanded && (
 <tr>
 <td colSpan={branches.length + 2} className="p-0 bg-gray-50/20">
 <ExpandedBreakdownPanel title="Price Range Breakdown" icon={Calendar}>
 <div className="overflow-x-auto">
 <div className="grid gap-1 px-3 py-2 bg-gray-50/50 border-b border-gray-100/80" style={{ gridTemplateColumns: `minmax(7rem,1.3fr) repeat(${branches.length}, minmax(3.5rem,1fr)) minmax(4rem,1fr)` }}>
 <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Price Range</div>
 {branches.map((branch) => (
 <div key={branch} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">
 {branch}
 </div>
 ))}
 <div className="text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wider text-center border-l border-[#e8e8e8]">
 Total
 </div>
 </div>
 <div className="divide-y divide-gray-50">
 {GOLD_PRICE_RANGES.map(({ key: rangeKey, label }) => {
 const rangeData = item.rangeData[rangeKey];
 const hasData = rangeData.totalQty > 0;
 if (!hasData) return null;
 return (
 <div
 key={rangeKey}
 className="grid gap-1 items-center px-3 py-2 hover:bg-gray-50/50 transition-colors"
 style={{ gridTemplateColumns: `minmax(7rem,1.3fr) repeat(${branches.length}, minmax(3.5rem,1fr)) minmax(4rem,1fr)` }}
 >
 <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">{label}</span>
 {branches.map((branch) => {
 const qty = rangeData.branchQtys[branch] || 0;
 return (
 <div key={branch} className="flex justify-center border-l border-gray-50">
 <ExpandedMetricBadge value={qty === 0 ? '-' : qty} />
 </div>
 );
 })}
 <div className="flex justify-center border-l border-[#e8e8e8]">
 {hasData ? (
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums bg-amber-100 text-amber-800 border border-amber-200">
 {rangeData.totalQty}
 </span>
 ) : (
 <span className="text-[11px] text-[#8c8c8c]">-</span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </ExpandedBreakdownPanel>
 </td>
 </tr>
 )}
 </Fragment>
 );
 })}
 {/* Grand Total Row */}
 <tr className="bg-gray-50/80 font-bold border-t-2 border-gray-100">
 <td className="py-2.5 px-4 text-[12px] font-bold text-gray-900">
 Grand Total
 </td>
 {branches.map((branch) => {
 const qty = typeData.branchQtys[branch] || 0;
 return (
 <td key={branch} className="py-2.5 px-2 text-center border-l border-gray-50">
 {qty > 0 ? (
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums bg-amber-100 text-amber-800 border border-amber-200">
 {qty}
 </span>
 ) : (
 <span className="text-[12px] text-[#8c8c8c]">-</span>
 )}
 </td>
 );
 })}
 <td className="py-2.5 px-3 text-center border-l border-[#e8e8e8]">
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums bg-[#1677ff] text-white">
 {typeData.totalQty}
 </span>
 </td>
 </tr>
 </tbody>
 </table>
 );
 })()}
 </div>
 ) : (
 <div className="overflow-x-auto max-h-[600px]">
 <table className="w-full table-fixed text-left border-collapse">
 <colgroup>
 {showItemBranchColumn && <col className="w-[12%]" />}
 <col className={showItemBranchColumn ? 'w-[18%]' : 'w-[22%]'} />
 <col className="w-[14%]" />
 <col className="w-[14%]" />
 <col className="w-[14%]" />
 <col className="w-[14%]" />
 <col className="w-[12%]" />
 </colgroup>
 <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-100">
 <tr>
 {showItemBranchColumn && (
 <th className="py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
 Branch
 </th>
 )}
 <th className="py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
 Item Main Group
 </th>
 {ITEM_RATE_RANGE_COLUMNS.map(({ key, label }) => (
 <th
 key={key}
 className="py-2.5 px-3 text-[10px] font-semibold text-violet-600 uppercase tracking-wider text-center border-l border-violet-100"
 >
 {label}
 </th>
 ))}
 <th className="py-2.5 px-3 text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wider text-center border-l border-[#e8e8e8]">
 Total
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {itemRateSales.rows.length === 0 ? (
 <tr>
 <td colSpan={showItemBranchColumn ? 7 : 6} className="py-10 px-4 text-center text-sm text-gray-400 font-medium">
 Item rate data မရှိပါ (column: {itemRateSales.categoryKey})
 </td>
 </tr>
 ) : (
 <>
 {itemRateSales.rows.map((row) => {
 const key = showItemBranchColumn ? `${row.branch}-${row.category}` : row.category;
 const isExpandable =
 itemRateSales.aggregateByCategoryOnly && row.branchBreakdown.length > 0;
 const isExpanded = expandedItemCategory === row.category;
 if (expandedItemCategory && expandedItemCategory !== row.category) {
 return null;
 }
 return (
 <Fragment key={key}>
 <tr
 className={`transition-colors ${isExpandable ? 'cursor-pointer hover:bg-gray-50/50' : 'hover:bg-gray-50/50'} ${isExpanded ? 'bg-gray-50/30' : ''}`}
 onClick={() => {
 if (!isExpandable) return;
 setExpandedItemCategory(isExpanded ? null : row.category);
 }}
 >
 {showItemBranchColumn && (
 <td className="py-2.5 px-4 text-[12px] font-medium text-[#8c8c8c] whitespace-nowrap truncate">
 {row.branch}
 </td>
 )}
 <td className="py-2.5 px-4 text-[12px] text-[#8c8c8c]">
 <div className="flex items-center gap-1.5 min-w-0">
 {isExpandable && (
 <span className="text-[#8c8c8c] flex-shrink-0">
 {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </span>
 )}
 <span className="truncate font-medium text-gray-800">{row.itemMainGroup}</span>
 </div>
 </td>
 {ITEM_RATE_RANGE_COLUMNS.map(({ key: rangeKey }) => {
 const qty = row.qtys[rangeKey];
 return (
 <td key={rangeKey} className="py-2.5 px-3 text-center border-l border-violet-50">
 {qty > 0 ? (
 <span className={`inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums ${getItemRateCellClass(rangeKey, true)}`}>
 {qty}
 </span>
 ) : (
 <span className="text-[12px] text-[#8c8c8c]">-</span>
 )}
 </td>
 );
 })}
 <td className="py-2.5 px-3 text-center border-l border-[#e8e8e8]">
 {row.totalQty > 0 ? (
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums bg-[#1677ff] text-white">
 {row.totalQty}
 </span>
 ) : (
 <span className="text-[12px] text-[#8c8c8c]">-</span>
 )}
 </td>
 </tr>
 {isExpanded && isExpandable && (
 <tr>
 <td colSpan={showItemBranchColumn ? 7 : 6} className="p-0 bg-gray-50/20">
 <ExpandedBreakdownPanel title="Branch Breakdown" icon={Building2}>
 <div className="overflow-x-auto">
 <div className="grid grid-cols-[minmax(8rem,1.4fr)_repeat(5,minmax(4.5rem,1fr))] gap-2 px-4 bg-gray-50/50 border-b border-gray-100/80 min-w-[640px]">
 <div className="flex items-center py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Branch</div>
 {ITEM_RATE_RANGE_COLUMNS.map(({ key: rangeKey, label }) => (
 <div key={rangeKey} className="py-2 text-[10px] font-semibold text-violet-600 uppercase tracking-wider text-center border-l border-violet-100">
 {label}
 </div>
 ))}
 <div className="py-2 text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wider text-center border-l border-[#e8e8e8]">
 Total
 </div>
 </div>
 <div className="divide-y divide-gray-50 min-w-[640px]">
 {row.branchBreakdown.map((branchRow) => (
 <div
 key={`${row.category}-${branchRow.branch}`}
 className="grid grid-cols-[minmax(8rem,1.4fr)_repeat(5,minmax(4.5rem,1fr))] gap-2 items-center px-4 py-2 hover:bg-gray-50/50 transition-colors"
 >
 <span className="text-[12px] font-medium text-[#8c8c8c] truncate">
 {branchRow.branch}
 </span>
 {ITEM_RATE_RANGE_COLUMNS.map(({ key: rangeKey }) => (
 <div key={rangeKey} className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.qtys[rangeKey] === 0 ? '-' : branchRow.qtys[rangeKey]}
 />
 </div>
 ))}
 <div className="flex justify-center">
 <ExpandedMetricBadge
 value={branchRow.totalQty === 0 ? '-' : branchRow.totalQty}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </ExpandedBreakdownPanel>
 </td>
 </tr>
 )}
 </Fragment>
 );
 })}
 <tr className="bg-gray-50/80 font-bold border-t-2 border-gray-100">
 <td
 colSpan={showItemBranchColumn ? 2 : 1}
 className="py-2.5 px-4 text-[12px] font-bold text-gray-900"
 >
 Grand Total
 </td>
 {ITEM_RATE_RANGE_COLUMNS.map(({ key: rangeKey }) => (
 <td key={rangeKey} className="py-2.5 px-3 text-center border-l border-violet-50">
 <span className={`inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums ${getItemRateCellClass(rangeKey, itemRateSales.grandTotal.qtys[rangeKey] > 0)}`}>
 {itemRateSales.grandTotal.qtys[rangeKey] ||'-'}
 </span>
 </td>
 ))}
 <td className="py-2.5 px-3 text-center border-l border-[#e8e8e8]">
 <span className="inline-flex min-w-[2rem] items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums bg-[#1677ff] text-white">
 {itemRateSales.grandTotal.totalQty ||'-'}
 </span>
 </td>
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* Customer List */}
 {viewMode ==='cusList' && (
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2 flex-wrap">
 <div className="flex items-center gap-2">
 <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">CUS List</h3>
 {cusItemTypeFilter && (
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
 {cusItemTypeFilter ==='dia' ? 'Dia' : cusItemTypeFilter ==='pt' ? 'PT' : cusItemTypeFilter ==='gold15' ? 'Gold(15)' : 'Gold(16)'}
 </span>
 )}
 </div>
 {/* Tier filters */}
 <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-50/80 border border-[#e8e8e8]">
 {([
 { tier: 'VIP' as const, label: 'VIP', count: filteredCusList.rowFilteredTotals ? filteredCusList.rowFilteredTotals.filter(ft => ft.fTier ==='VIP').length : cusList.rows.filter(r => r.customerTier ==='VIP').length },
 { tier: 'VVIP' as const, label: 'VVIP', count: filteredCusList.rowFilteredTotals ? filteredCusList.rowFilteredTotals.filter(ft => ft.fTier ==='VVIP').length : cusList.rows.filter(r => r.customerTier ==='VVIP').length },
 { tier: 'CIP' as const, label: 'CIP', count: filteredCusList.rowFilteredTotals ? filteredCusList.rowFilteredTotals.filter(ft => ft.fTier ==='CIP').length : cusList.rows.filter(r => r.customerTier ==='CIP').length },
 { tier: 'CARE' as const, label: 'Care', count: filteredCusList.rowFilteredTotals ? filteredCusList.rowFilteredTotals.filter(ft => ft.fTier === null).length : cusList.rows.filter(r => r.customerTier === null).length },
 ]).map(({ tier, label, count }) => (
 <button
 key={tier}
 onClick={() => setCustomerTierFilter(customerTierFilter === tier ? null : tier)}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm ${
 customerTierFilter === tier
 ? tier === 'CIP' ? 'bg-purple-600 text-white ring-1 ring-purple-600'
 : tier === 'VVIP' ? 'bg-amber-500 text-white ring-1 ring-amber-500'
 : tier === 'VIP' ? 'bg-sky-500 text-white ring-1 ring-sky-500'
 : 'bg-gray-600 text-white ring-1 ring-gray-600'
 : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
 }`}
 >
 {label} <span className="tabular-nums text-[10px] opacity-90">({count})</span>
 </button>
 ))}
 </div>
 {cusItemCategoryFilter && (
 <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8c8c8c] bg-gray-100 px-2.5 py-1.5 rounded-lg border border-[#e8e8e8]">
 {cusItemCategoryFilter}
 <button
 onClick={() => setCusItemCategoryFilter(null)}
 className="hover:text-gray-900 transition-colors"
 >
 ✕
 </button>
 </span>
 )}
 {/* Item type filters */}
 <div className="flex items-center gap-1 p-1 rounded-xl bg-blue-50/60 border border-blue-100">
 {([
 { type: 'dia' as const, label: 'Dia' },
 { type: 'pt' as const, label: 'PT' },
 { type: 'gold15' as const, label: 'Gold(15)' },
 { type: 'gold16' as const, label: 'Gold(16)' },
 ]).map(({ type, label }) => (
 <button
 key={type}
 onClick={() => setCusItemTypeFilter(cusItemTypeFilter === type ? null : type)}
 className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm ${
 cusItemTypeFilter === type
 ? 'bg-blue-600 text-white ring-1 ring-blue-600'
 : 'bg-white text-blue-600 hover:bg-blue-100'
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 {/* Month Filter Toggle */}
 <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-[#e8e8e8]">
 <button
 onClick={() => setCusMonthFilter('current')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 cusMonthFilter ==='current'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 Current Month
 </button>
 <button
 onClick={() => setCusMonthFilter('all')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 cusMonthFilter ==='all'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 All Month
 </button>
 </div>
 {/* Branch filters */}
 {(() => {
 const branches = [...new Set(cusList.rows.map(r => r.branch))].sort();
 if (branches.length <= 1) return null;
 return (
 <div className="flex items-center gap-1 p-1 rounded-xl bg-emerald-50/60 border border-emerald-100">
 <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider px-1">Branch</span>
 {branches.map((branch) => (
 <button
 key={branch}
 onClick={() => setCusBranchFilter(cusBranchFilter === branch ? null : branch)}
 className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
 cusBranchFilter === branch
 ? 'bg-emerald-600 text-white ring-1 ring-emerald-600'
 : 'bg-white text-emerald-600 hover:bg-emerald-100'
 }`}
 >
 {branch}
 </button>
 ))}
 </div>
 );
 })()}
 <div className="flex items-center gap-1.5">
 <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
 Sale ဦးရေ: <span className="tabular-nums font-bold">{filteredCusList.grandTotal.totalQty.toLocaleString()}</span>
 </span>
 <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
 Cus ဦးရေ: <span className="tabular-nums font-bold">{filteredCusList.rows.length.toLocaleString()}</span>
 </span>
 </div>
 <button
 onClick={() => setShowCusSummary(!showCusSummary)}
 className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
 showCusSummary
 ? 'bg-[#1677ff] text-white shadow-sm'
 : 'bg-white text-gray-600 border border-[#e8e8e8] hover:border-gray-300 hover:text-gray-900 shadow-sm'
 }`}
 >
 Summary
 </button>
 {filteredCusList.hasFilter && (
 <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-[#e8e8e8]">
 {filteredCusList.rows.length} / {cusList.rows.length} ဦး
 </span>
 )}
 <button
 onClick={() => setFullscreenTable(fullscreenTable ==='cusList' ? null : 'cusList')}
 className="flex items-center justify-center p-2 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all border border-[#e8e8e8] shadow-sm"
 title="Full Screen"
 >
 {fullscreenTable ==='cusList' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>

 {/* Summary Card */}
 {showCusSummary && (
 <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
 <div className="space-y-3">
 {/* Green Category - 0-30 days */}
 <div 
 onClick={() => setActiveDaysFilter(activeDaysFilter ==='green' ? null : 'green')}
 className={`bg-white rounded-xl p-4 border cursor-pointer transition-all ${
 activeDaysFilter ==='green' ? 'border-[#1677ff] ring-1 ring-gray-200' : 'border-[#e8e8e8] hover:border-gray-300'
 }`}
 >
 <div className="flex items-center gap-2 mb-3">
 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
 <span className="text-[12px] font-semibold text-[#8c8c8c]">0-30 ရက် (ကောင်း)</span>
 {activeDaysFilter ==='green' && (
 <span className="ml-auto text-[10px] text-gray-400">✓</span>
 )}
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">Sale</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {filteredCusList.daysSinceSummary.green.totalQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.green.totalAmount)}
 </span>
 </div>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">RC</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-600 tabular-nums">
 {filteredCusList.daysSinceSummary.green.rcQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-600 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.green.rcAmount)}
 </span>
 </div>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">Net Sale</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {filteredCusList.daysSinceSummary.green.totalQty - filteredCusList.daysSinceSummary.green.rcQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.green.netSaleAmount)}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Yellow Category - 31-60 days */}
 <div 
 onClick={() => setActiveDaysFilter(activeDaysFilter ==='yellow' ? null : 'yellow')}
 className={`bg-white rounded-xl p-4 border cursor-pointer transition-all ${
 activeDaysFilter ==='yellow' ? 'border-[#1677ff] ring-1 ring-gray-200' : 'border-[#e8e8e8] hover:border-gray-300'
 }`}
 >
 <div className="flex items-center gap-2 mb-3">
 <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
 <span className="text-[12px] font-semibold text-[#8c8c8c]">31-60 ရက် (အလယ်)</span>
 {activeDaysFilter ==='yellow' && (
 <span className="ml-auto text-[10px] text-gray-400">✓</span>
 )}
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">Sale</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {filteredCusList.daysSinceSummary.yellow.totalQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.yellow.totalAmount)}
 </span>
 </div>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">RC</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-600 tabular-nums">
 {filteredCusList.daysSinceSummary.yellow.rcQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-600 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.yellow.rcAmount)}
 </span>
 </div>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">Net Sale</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {filteredCusList.daysSinceSummary.yellow.totalQty - filteredCusList.daysSinceSummary.yellow.rcQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.yellow.netSaleAmount)}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Red Category - 61+ days */}
 <div 
 onClick={() => setActiveDaysFilter(activeDaysFilter ==='red' ? null : 'red')}
 className={`bg-white rounded-xl p-4 border cursor-pointer transition-all ${
 activeDaysFilter ==='red' ? 'border-[#1677ff] ring-1 ring-gray-200' : 'border-[#e8e8e8] hover:border-gray-300'
 }`}
 >
 <div className="flex items-center gap-2 mb-3">
 <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
 <span className="text-[12px] font-semibold text-[#8c8c8c]">61+ ရက် (ဆိုး)</span>
 {activeDaysFilter ==='red' && (
 <span className="ml-auto text-[10px] text-gray-400">✓</span>
 )}
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">Sale</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {filteredCusList.daysSinceSummary.red.totalQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.red.totalAmount)}
 </span>
 </div>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">RC</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-600 tabular-nums">
 {filteredCusList.daysSinceSummary.red.rcQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-600 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.red.rcAmount)}
 </span>
 </div>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="text-[10px] text-gray-400 font-semibold mb-1">Net Sale</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Qty</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {filteredCusList.daysSinceSummary.red.totalQty - filteredCusList.daysSinceSummary.red.rcQty}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-gray-400">Amount</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">
 {renderAmount(filteredCusList.daysSinceSummary.red.netSaleAmount)}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Sort controls */}
 <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2 flex-wrap">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort by:</span>
 {([
 { field: 'totalQty' as const, label: 'Qty' },
 { field: 'totalAmount' as const, label: 'Amount' },
 { field: 'netSaleAmount' as const, label: 'Net Sale' },
 ]).map(({ field, label }) => (
 <button
 key={field}
 onClick={() => handleCusSort(field)}
 className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
 cusSortField === field
 ? 'bg-[#1677ff] text-white'
 : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-[#8c8c8c]'
 }`}
 >
 {label} {cusSortField === field && (cusSortOrder ==='asc' ? '↑' : '↓')}
 </button>
 ))}
 </div>

 {/* Card Grid */}
 <div className="overflow-y-auto max-h-[600px] p-4">
 {cusList.rows.length === 0 ? (
 <div className="py-16 text-center text-sm text-gray-400 font-medium">
 Customer data မရှိပါ
 </div>
 ) : filteredCusList.rows.length === 0 ? (
 <div className="py-16 text-center text-sm text-gray-400 font-medium">
 ရှာဖွေမှတ်တမ်း မတွေ့ပါ
 </div>
 ) : (
 <>
 {cusListAsTable ? (
 <div className="overflow-x-auto max-h-[600px]">
 <table className="w-full text-sm min-w-[1400px]">
 <thead className="sticky top-0 z-10 bg-gray-50 border-b border-[#e8e8e8]">
 <tr>
 <th className="py-2 px-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Branch</th>
 <th className="py-2 px-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Buyer Name</th>
 <th className="py-2 px-2 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider">Sale Qty</th>
 <th className="py-2 px-2 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider">Sale Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider">RC Qty</th>
 <th className="py-2 px-2 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider">RC Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider">Net Sale</th>
 <th className="py-2 px-2 text-center text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tier</th>
 <th className="py-2 px-2 text-center text-[9px] font-bold text-gray-500 uppercase tracking-wider">Days</th>
 <th className="py-2 px-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
 <th className="py-2 px-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Township</th>
 <th className="py-2 px-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Sale Date</th>
 <th className="py-2 px-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Last Item</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredCusList.rows.slice(0, cusVisibleCount).map((row, displayIdx) => {
 const rowKey = `${row.branch}-${row.buyerName}`;
 const isExpanded = expandedCusRow === rowKey;
 const hasBranchBreakdown = Object.keys(row.branchBreakdown).length > 0;
 const ft = filteredCusList.rowFilteredTotals?.[displayIdx];
 const displayQty = ft ? ft.fQty : row.totalQty;
 const displaySale = ft ? ft.fSaleAmt : row.totalAmount;
 const displayRcQty = row.rcQty ?? 0;
 const displayRcAmt = ft ? ft.fRcAmt : row.rcAmount;
 const displayNet = ft ? ft.fNet : row.netSaleAmount;
 const tier = ft ? ft.fTier : row.customerTier;
 const displayLastItem = ft?.fLastItem ?? row.lastSaleItem;
 const displayLastDate = ft?.fLastDate ? formatDisplayDate(ft.fLastDate) : row.lastSaleDateLabel;
 const displayDaysSinceVisit = ft?.fDaysSinceVisit ?? row.daysSinceVisit;
 const tierColor = tier === 'CIP' ? 'bg-purple-100 text-purple-700 border-purple-200'
 : tier === 'VVIP' ? 'bg-amber-100 text-amber-700 border-amber-200'
 : tier === 'VIP' ? 'bg-sky-100 text-sky-700 border-sky-200'
 : 'bg-gray-100 text-gray-500 border-[#e8e8e8]';
 const tierLabel = tier ?? 'CARE';
 return (
 <Fragment key={rowKey}>
 <tr
 className={`hover:bg-gray-50 transition-colors cursor-pointer`}
 onClick={() => setExpandedCusRow(isExpanded ? null : rowKey)}
 >
 <td className="py-2 px-3 text-[11px] font-medium text-[#8c8c8c] whitespace-nowrap">{row.branch}</td>
 <td className="py-2 px-3 text-[11px] font-bold text-gray-900 whitespace-nowrap">
 <ChevronRight className={`inline w-3 h-3 text-gray-400 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 {row.buyerName}
 </td>
 <td className="py-2 px-2 text-[11px] text-[#8c8c8c] text-right tabular-nums">{displayQty === 0 ? '-' : displayQty}</td>
 <td className="py-2 px-2 text-[11px] text-[#8c8c8c] text-right tabular-nums">{renderAmount(displaySale)}</td>
 <td className="py-2 px-2 text-[11px] text-gray-500 text-right tabular-nums">{displayRcQty === 0 ? '-' : displayRcQty}</td>
 <td className="py-2 px-2 text-[11px] text-gray-500 text-right tabular-nums">{renderAmount(displayRcAmt)}</td>
 <td className="py-2 px-2 text-[11px] text-right tabular-nums">{renderNetAmount(displayNet)}</td>
 <td className="py-2 px-2 text-center">
 <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${tierColor}`}>{tierLabel}</span>
 </td>
 <td className="py-2 px-2 text-center">
 {displayDaysSinceVisit != null ? (
 <span className={`text-[10px] font-bold ${
 displayDaysSinceVisit <= 30 ? 'text-emerald-600' :
 displayDaysSinceVisit <= 60 ? 'text-amber-600' : 'text-rose-600'
 }`}>{displayDaysSinceVisit}d</span>
 ) : '-'}
 </td>
 <td className="py-2 px-3 text-[11px] text-gray-600 whitespace-nowrap">{renderCellText(row.contactNumber)}</td>
 <td className="py-2 px-3 text-[11px] text-gray-600">{row.township ==='-' ? '-' : row.township}</td>
 <td className="py-2 px-3 text-[11px] text-gray-500 whitespace-nowrap">{displayLastDate}</td>
 <td className="py-2 px-3 text-[11px] text-gray-600">{displayLastItem ||'-'}</td>
 </tr>
 {isExpanded && hasBranchBreakdown && (
 <tr>
 <td colSpan={13} className="px-6 py-3 bg-gray-50/50">
 <div className="space-y-1.5">
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Branch Breakdown</div>
 {Object.entries(row.branchBreakdown).map(([branchName, data]) => {
 const branchKey = `${rowKey}-${branchName}`;
 const isBranchExpanded = expandedCusBranch === branchKey;
 const filteredCategories = cusItemTypeFilter
 ? Object.entries(data.categories).filter(([, catData]) => catData.itemTypes.has(cusItemTypeFilter))
 : Object.entries(data.categories);
 const hasCategories = filteredCategories.length > 0;
 const fQty = cusItemTypeFilter ? filteredCategories.reduce((s, [, c]) => s + c.total.qty, 0) : data.totalQty;
 const fSale = cusItemTypeFilter ? filteredCategories.reduce((s, [, c]) => s + c.sale.amount, 0) : data.totalAmount;
 const fRc = cusItemTypeFilter ? filteredCategories.reduce((s, [, c]) => s + c.rc.amount, 0) : data.rcAmount;
 const fNet = fSale - fRc;
 return (
 <div key={branchName}>
 <div
 onClick={(e) => { e.stopPropagation(); hasCategories && setExpandedCusBranch(isBranchExpanded ? null : branchKey); }}
 className={`bg-white rounded-lg px-3 py-2 border border-[#e8e8e8] ${hasCategories ? 'cursor-pointer hover:bg-gray-50' : ''}`}
 >
 <div className="flex items-center gap-2 mb-1.5">
 {hasCategories && <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isBranchExpanded ? 'rotate-90' : ''}`} />}
 <span className="text-[11px] font-semibold text-[#8c8c8c]">{branchName}</span>
 </div>
 <div className="grid grid-cols-4 gap-2">
 <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
 <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Qty</div>
 <div className="text-[12px] font-bold text-gray-900 tabular-nums">{fQty.toLocaleString()}</div>
 </div>
 <div className="bg-emerald-50 rounded-md px-2 py-1.5 text-center">
 <div className="text-[9px] font-semibold text-emerald-500/70 uppercase tracking-wider mb-0.5">Sale</div>
 <div className="text-[12px] font-bold text-gray-900 tabular-nums">{renderAmount(fSale)}</div>
 </div>
 <div className="bg-rose-50 rounded-md px-2 py-1.5 text-center">
 <div className="text-[9px] font-semibold text-rose-500/70 uppercase tracking-wider mb-0.5">RC</div>
 <div className="text-[12px] font-bold text-[#8c8c8c] tabular-nums">{renderAmount(fRc)}</div>
 </div>
 <div className="bg-sky-50 rounded-md px-2 py-1.5 text-center">
 <div className="text-[9px] font-semibold text-sky-500/70 uppercase tracking-wider mb-0.5">Net</div>
 <div className="text-[12px] font-bold tabular-nums">{renderNetAmount(fNet)}</div>
 </div>
 </div>
 </div>
 {isBranchExpanded && hasCategories && (
 <div className="mt-1 ml-4 space-y-1">
 {filteredCategories.map(([category, catData]) => {
 const catNet = catData.sale.amount - catData.rc.amount;
 return (
 <div key={category} className="bg-white rounded-md px-3 py-2 border border-gray-100">
 <div className="text-[11px] font-bold text-[#8c8c8c] mb-1">{category}</div>
 <div className="grid grid-cols-4 gap-2">
 <div className="text-center">
 <div className="text-[9px] font-semibold text-gray-400 uppercase">Qty</div>
 <div className="text-[11px] font-bold text-gray-900 tabular-nums">{catData.total.qty.toLocaleString()}</div>
 </div>
 <div className="text-center">
 <div className="text-[9px] font-semibold text-emerald-500/70 uppercase">Sale</div>
 <div className="text-[11px] font-bold text-gray-900 tabular-nums">{renderAmount(catData.sale.amount)}</div>
 </div>
 <div className="text-center">
 <div className="text-[9px] font-semibold text-rose-500/70 uppercase">RC</div>
 <div className="text-[11px] font-bold text-[#8c8c8c] tabular-nums">{renderAmount(catData.rc.amount)}</div>
 </div>
 <div className="text-center">
 <div className="text-[9px] font-semibold text-sky-500/70 uppercase">Net</div>
 <div className="text-[11px] font-bold tabular-nums">{renderNetAmount(catNet)}</div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </td>
 </tr>
 )}
 {isExpanded && (
 <tr>
 <td colSpan={13} className="px-6 py-3 bg-white">
 <div className="rounded-lg border border-[#e8e8e8] overflow-hidden">
 <div className="px-3 py-2 bg-gray-50 border-b border-[#e8e8e8] flex items-center gap-2">
 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Excel Rows</span>
 <span className="text-[10px] text-gray-400">({row.transactions.length} ကြိမ်)</span>
 </div>
 <div className="max-h-[300px] overflow-auto">
 <table className="w-full">
 <thead className="sticky top-0 bg-white">
 <tr className="border-b border-[#e8e8e8]">
 <th className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-left">Date</th>
 <th className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-left">Branch</th>
 <th className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-left">Reason</th>
 <th className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-left">Category</th>
 <th className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">Qty</th>
 <th className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {row.transactions
 .slice()
 .sort((a, b) => b.date.localeCompare(a.date))
 .map((tx, txIdx) => (
 <tr key={txIdx} className="hover:bg-gray-50">
 <td className="px-2 py-1.5 text-[10px] text-[#8c8c8c] whitespace-nowrap">{tx.date}</td>
 <td className="px-2 py-1.5 text-[10px] text-gray-600 whitespace-nowrap">{tx.branch}</td>
 <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">
 <span className={`font-semibold ${tx.type ==='sale' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.reason}</span>
 </td>
 <td className="px-2 py-1.5 text-[10px] text-gray-600">{tx.category}</td>
 <td className="px-2 py-1.5 text-[10px] text-[#8c8c8c] text-right tabular-nums">{tx.qty}</td>
 <td className="px-2 py-1.5 text-[10px] text-[#8c8c8c] text-right tabular-nums">{tx.amount.toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </td>
 </tr>
 )}
 </Fragment>
 );
 })}
 <tr className="border-t-2 border-[#e8e8e8] bg-gray-50">
 <td className="py-2 px-3 text-[11px] font-bold text-gray-900" colSpan={2}>Grand Total</td>
 <td className="py-2 px-2 text-[11px] font-bold text-gray-900 text-right tabular-nums">{filteredCusList.grandTotal.totalQty === 0 ? '-' : filteredCusList.grandTotal.totalQty}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-gray-900 text-right tabular-nums">{renderAmount(filteredCusList.grandTotal.totalAmount)}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#8c8c8c] text-right tabular-nums">{filteredCusList.grandTotal.rcQty === 0 ? '-' : filteredCusList.grandTotal.rcQty}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#8c8c8c] text-right tabular-nums">{renderAmount(filteredCusList.grandTotal.rcAmount)}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-right tabular-nums">{renderNetAmount(filteredCusList.grandTotal.netSaleAmount)}</td>
 <td className="py-2 px-2" colSpan={6} />
 </tr>
 </tbody>
 </table>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
 {filteredCusList.rows.slice(0, cusVisibleCount).map((row, displayIdx) => {
 const rowKey = `${row.branch}-${row.buyerName}`;
 const isExpanded = expandedCusRow === rowKey;
 const hasBranchBreakdown = Object.keys(row.branchBreakdown).length > 0;
 const ft = filteredCusList.rowFilteredTotals?.[displayIdx];
 const displayQty = ft ? ft.fQty : row.totalQty;
 const displaySale = ft ? ft.fSaleAmt : row.totalAmount;
 const displayNet = ft ? ft.fNet : row.netSaleAmount;
 const tier = ft ? ft.fTier : row.customerTier;
 const displayDaysSinceVisit = ft?.fDaysSinceVisit ?? row.daysSinceVisit;
 const tierConfig = tier === 'CIP'
 ? { border: 'border-purple-200', chip: 'bg-purple-50 text-purple-700 border-purple-200', label: 'CIP', accent: 'border-l-purple-500' }
 : tier === 'VVIP'
 ? { border: 'border-amber-200', chip: 'bg-amber-50 text-amber-700 border-amber-200', label: 'VVIP', accent: 'border-l-amber-500' }
 : tier === 'VIP'
 ? { border: 'border-sky-200', chip: 'bg-sky-50 text-sky-700 border-sky-200', label: 'VIP', accent: 'border-l-sky-500' }
 : { border: 'border-[#e8e8e8]', chip: 'bg-[#f5f5f5] text-[#595959] border-[#e8e8e8]', label: 'CARE', accent: 'border-l-[#8c8c8c]' };
 return (
 <div
 key={rowKey}
 className={`relative rounded-xl overflow-hidden border border-[#e8e8e8] border-l-4 ${tierConfig.accent} bg-white transition-colors ${
 isExpanded ? 'ring-2 ring-[#91caff]' : 'hover:border-[#d9d9d9]'
 } cursor-pointer`}
 onClick={() => setExpandedCusRow(isExpanded ? null : rowKey)}
 >
 <div className="relative px-4 pt-3.5 flex items-center justify-between">
 <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md border ${tierConfig.chip}`}>{tierConfig.label}</span>
 {displayDaysSinceVisit != null && (
 <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold shrink-0 ${
 displayDaysSinceVisit <= 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
 displayDaysSinceVisit <= 60 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
 'bg-rose-50 text-rose-700 border border-rose-200'
 }`}>
 <span className="text-[10px] opacity-80">Last</span> {displayDaysSinceVisit}d
 </span>
 )}
 </div>
 <div className="relative px-4 pt-2 pb-2">
 <div className="text-[16px] font-semibold text-[#262626] leading-tight">{row.buyerName}</div>
 <div className="flex items-center gap-1.5 mt-1">
 <span className="text-[11px] text-[#8c8c8c]">📍</span>
 <span className="text-[12px] font-medium text-[#595959]">{renderCellText(row.branch)}</span>
 <ChevronRight className={`w-3 h-3 text-[#8c8c8c] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 </div>
 </div>
 <div className="relative px-4 pb-3">
 <div className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] overflow-hidden">
 <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 px-3 pt-2 pb-1 border-b border-[#f0f0f0]">
 <div />
 <div className="text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wide text-center">Qty</div>
 <div className="text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wide text-center">Amount</div>
 </div>
 <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 px-3 py-2 border-b border-[#f0f0f0]">
 <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide w-8">Sale</div>
 <div className="text-[13px] font-semibold text-[#262626] tabular-nums text-center">{displayQty === 0 ? '—' : displayQty}</div>
 <div className="text-[13px] font-semibold text-[#262626] tabular-nums text-center">{renderAmount(displaySale)}</div>
 </div>
 <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 px-3 py-2 border-b border-[#f0f0f0]">
 <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide w-8">RC</div>
 <div className="text-[12px] font-medium text-[#595959] tabular-nums text-center">{row.rcQty ?? 0}</div>
 <div className="text-[12px] font-medium text-[#595959] tabular-nums text-center">{renderAmount(ft ? ft.fRcAmt : row.rcAmount)}</div>
 </div>
 <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 px-3 py-2">
 <div className="text-[10px] font-semibold text-[#1677ff] uppercase tracking-wide w-8">Net</div>
 <div className="text-[12px] font-medium text-[#8c8c8c] tabular-nums text-center">—</div>
 <div className="text-[13px] font-semibold tabular-nums text-center text-[#262626]">{renderNetAmount(displayNet)}</div>
 </div>
 </div>
 </div>
 {(() => {
 const amt = ft ? ft.fSaleAmt : row.totalAmount;
 const nextTier = tier === 'CIP' ? null
 : tier === 'VVIP' ? { label: 'CIP', threshold: 100_000_000 }
 : tier === 'VIP' ? { label: 'VVIP', threshold: 50_000_000 }
 : { label: 'VIP', threshold: 30_000_000 };
 if (!nextTier || amt >= nextTier.threshold) return null;
 const prevThreshold = tier === 'VVIP' ? 50_000_000 : tier === 'VIP' ? 30_000_000 : 0;
 const progress = Math.min(100, Math.max(0, ((amt - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100));
 const remaining = nextTier.threshold - amt;
 return (
 <div className="relative px-4 pb-2.5">
 <div className="bg-[#fafafa] rounded-lg px-3 py-2 border border-[#e8e8e8]">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Upgrade to {nextTier.label}</span>
 <span className="text-[11px] font-semibold text-[#262626]/90 tabular-nums">{remaining.toLocaleString()} MMK</span>
 </div>
 <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
 <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
 </div>
 </div>
 </div>
 );
 })()}
 <div className="relative px-4 pb-3.5 flex items-center gap-3 min-w-0">
 <div className="flex items-center gap-1.5 min-w-0 shrink-0">
 <span className="text-[12px] text-[#8c8c8c]">📞</span>
 <span className="text-[12px] font-medium text-[#595959] truncate">{renderCellText(row.contactNumber)}</span>
 </div>
 {row.township && row.township !== '-' && (
 <>
 <span className="text-[#d9d9d9] text-[10px]">|</span>
 <div className="flex items-center gap-1.5 min-w-0">
 <span className="text-[12px] text-[#8c8c8c] shrink-0">🏙️</span>
 <span className="text-[12px] font-medium text-[#8c8c8c] truncate">{row.township}</span>
 </div>
 </>
 )}
 </div>
 {isExpanded && hasBranchBreakdown && (
 <div className="border-t border-[#f0f0f0] px-4 py-3 bg-[#fafafa]">
 <div className="text-[11px] font-semibold text-[#262626]/60 uppercase tracking-wider mb-2">Branch Breakdown</div>
 <div className="space-y-1.5">
 {Object.entries(row.branchBreakdown).map(([branchName, data]) => {
 const branchKey = `${rowKey}-${branchName}`;
 const isBranchExpanded = expandedCusBranch === branchKey;
 const filteredCategories = cusItemTypeFilter
 ? Object.entries(data.categories).filter(([, catData]) => catData.itemTypes.has(cusItemTypeFilter))
 : Object.entries(data.categories);
 const hasCategories = filteredCategories.length > 0;
 const fQty = cusItemTypeFilter ? filteredCategories.reduce((s, [, c]) => s + c.total.qty, 0) : data.totalQty;
 const fSale = cusItemTypeFilter ? filteredCategories.reduce((s, [, c]) => s + c.sale.amount, 0) : data.totalAmount;
 const fRc = cusItemTypeFilter ? filteredCategories.reduce((s, [, c]) => s + c.rc.amount, 0) : data.rcAmount;
 const fNet = fSale - fRc;
 return (
 <div key={branchName}>
 <div
 onClick={(e) => { e.stopPropagation(); hasCategories && setExpandedCusBranch(isBranchExpanded ? null : branchKey); }}
 className={`bg-[#fafafa] rounded-lg px-3 py-2 border border-[#e8e8e8] ${hasCategories ? 'cursor-pointer hover:bg-[#f0f0f0]' : ''}`}
 >
 <div className="flex items-center justify-between gap-2 mb-1.5">
 <div className="flex items-center gap-1.5 min-w-0">
 {hasCategories && (
 <ChevronRight className={`w-3 h-3 text-[#8c8c8c] transition-transform shrink-0 ${isBranchExpanded ? 'rotate-90' : ''}`} />
 )}
 <span className="text-[11px] font-semibold text-[#262626] truncate">{branchName}</span>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-1">
 <div className="bg-white/5 rounded-md px-2 py-1.5">
 <div className="text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider mb-0.5">Qty</div>
 <div className="text-[12px] font-semibold text-[#262626] tabular-nums">{fQty.toLocaleString()}</div>
 </div>
 <div className="bg-white/5 rounded-md px-2 py-1.5">
 <div className="text-[9px] font-semibold text-emerald-300/80 uppercase tracking-wider mb-0.5">Sale</div>
 <div className="text-[12px] font-semibold text-[#262626] tabular-nums">{renderAmount(fSale)}</div>
 </div>
 <div className="bg-white/5 rounded-md px-2 py-1.5">
 <div className="text-[9px] font-semibold text-sky-300/80 uppercase tracking-wider mb-0.5">Net</div>
 <div className="text-[12px] font-bold tabular-nums">{renderNetAmount(fNet)}</div>
 </div>
 </div>
 </div>
 {isBranchExpanded && hasCategories && (
 <div className="mt-1 ml-3 space-y-1">
 {filteredCategories.map(([category, catData]) => {
 const catNet = catData.sale.amount - catData.rc.amount;
 return (
 <div key={category} className="bg-white/5 rounded-md px-3 py-2 border border-white/5">
 <div className="text-[12px] font-semibold text-[#262626]/90 mb-1.5">{category}</div>
 <div className="grid grid-cols-3 gap-1">
 <div>
 <div className="text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Qty</div>
 <div className="text-[12px] font-semibold text-[#262626] tabular-nums">{catData.total.qty.toLocaleString()}</div>
 </div>
 <div>
 <div className="text-[9px] font-semibold text-emerald-300/80 uppercase tracking-wider">Sale</div>
 <div className="text-[12px] font-semibold text-[#262626] tabular-nums">{renderAmount(catData.sale.amount)}</div>
 </div>
 <div>
 <div className="text-[9px] font-semibold text-sky-300/80 uppercase tracking-wider">Net</div>
 <div className="text-[12px] font-bold tabular-nums">{renderNetAmount(catNet)}</div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}
 {isExpanded && (
 <div className="border-t border-[#f0f0f0] px-4 py-3 bg-[#fafafa]">
 <div className="text-[11px] font-semibold text-[#262626]/60 uppercase tracking-wider mb-2">Excel Rows ({row.transactions.length} ကြိမ်)</div>
 <div className="max-h-[250px] overflow-auto rounded-lg bg-white/5 border border-[#e8e8e8]">
 <table className="w-full">
 <thead className="sticky top-0 bg-[#f5f5f5]">
 <tr className="border-b border-[#e8e8e8]">
 <th className="px-2 py-1.5 text-[9px] font-semibold text-[#262626]/50 uppercase tracking-wider text-left">Date</th>
 <th className="px-2 py-1.5 text-[9px] font-semibold text-[#262626]/50 uppercase tracking-wider text-left">Branch</th>
 <th className="px-2 py-1.5 text-[9px] font-semibold text-[#262626]/50 uppercase tracking-wider text-left">Reason</th>
 <th className="px-2 py-1.5 text-[9px] font-semibold text-[#262626]/50 uppercase tracking-wider text-right">Qty</th>
 <th className="px-2 py-1.5 text-[9px] font-semibold text-[#262626]/50 uppercase tracking-wider text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {row.transactions
 .slice()
 .sort((a, b) => b.date.localeCompare(a.date))
 .map((tx, txIdx) => (
 <tr key={txIdx} className="hover:bg-white/5">
 <td className="px-2 py-1.5 text-[10px] text-[#595959] whitespace-nowrap">{tx.date}</td>
 <td className="px-2 py-1.5 text-[10px] text-[#8c8c8c] whitespace-nowrap">{tx.branch}</td>
 <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">
 <span className={`font-semibold ${tx.type ==='sale' ? 'text-emerald-300' : 'text-rose-300'}`}>{tx.reason}</span>
 </td>
 <td className="px-2 py-1.5 text-[10px] text-[#595959] text-right tabular-nums">{tx.qty}</td>
 <td className="px-2 py-1.5 text-[10px] text-[#595959] text-right tabular-nums">{tx.amount.toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 {/* Show More (shared) */}
 {filteredCusList.rows.length > cusVisibleCount && (
 <div className="mt-4 flex flex-col items-center gap-1">
 <button
 onClick={() => setCusVisibleCount(c => c + 8)}
 className="px-6 py-2 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl border border-[#e8e8e8] transition-colors"
 >
 Show More ({filteredCusList.rows.length - cusVisibleCount} ဦးကျန်သည်)
 </button>
 </div>
 )}
 {/* Grand Total Bar (card mode only) */}
 {!cusListAsTable && (
 <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl px-5 py-3 border border-gray-100">
 <span className="text-[12px] font-bold text-gray-900">Grand Total</span>
 <div className="flex items-center gap-6">
 <div className="text-center">
 <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Qty</div>
 <div className="text-[13px] font-bold text-gray-900 tabular-nums">{filteredCusList.grandTotal.totalQty === 0 ? '-' : filteredCusList.grandTotal.totalQty}</div>
 </div>
 <div className="text-center">
 <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Sale</div>
 <div className="text-[13px] font-bold text-gray-900 tabular-nums">{renderAmount(filteredCusList.grandTotal.totalAmount)}</div>
 </div>
 <div className="text-center">
 <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Net Sale</div>
 <div className="text-[13px] font-bold tabular-nums">{renderNetAmount(filteredCusList.grandTotal.netSaleAmount)}</div>
 </div>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </div>
 )}

 {/* Main Table */}
 {viewMode !=='itemSale' && viewMode !=='itemRate' && viewMode !=='cusList' && (
 <>
 {(viewMode ==='allBranch' || viewMode ==='full') && (
 <div className="flex items-center justify-between px-1 pb-1">
 <div className="flex items-center gap-2">
 <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">{viewMode ==='full' ? 'Report အားလုံးကြည့်ရန်' : 'Sale View'}</h2>
 <button
 onClick={() => setFullscreenTable(fullscreenTable ==='saleView' ? null : 'saleView')}
 className="flex items-center justify-center p-2 bg-[#1677ff] text-white hover:bg-[#4096ff] rounded-lg transition-all border border-[#1677ff]"
 title="Full Screen"
 >
 {fullscreenTable ==='saleView' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>
 )}
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="overflow-x-auto max-h-[600px]">
 <table className={`w-full text-left border-collapse ${viewMode ==='full' ? 'min-w-[2200px]' : 'min-w-[1450px]'}`}>
 <thead className="sticky top-0 z-20">
 {viewMode ==='allBranch' && (
 <tr className="bg-gray-50/80 border-b border-gray-100">
 <th className="py-2 px-2 text-[10px] font-semibold w-36"></th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center" title="Diamond">
 Diamond
 </th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center" title="Platinum">
 PT
 </th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-amber-500 text-center" title="Gold (16 Pyi)">
 Gold(16)
 </th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-yellow-600 text-center" title="Gold (15 Pyi)">
 Gold(15)
 </th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center" title="စုစုပေါင်း">
 Total
 </th>
 </tr>
 )}
 {viewMode ==='full' && (
 <tr className="bg-gray-50/80 border-b border-gray-100">
 <th className="py-2 px-2 text-[10px] font-semibold w-36"></th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-emerald-600 text-center">Dia Sale</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-emerald-600 text-center">PT Sale</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-amber-600 text-center">Gold(15) Sale</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-amber-500 text-center">Gold(16) Sale</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center">Total Sale</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-rose-500 text-center">Dia RC</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-rose-500 text-center">PT RC</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-rose-500 text-center">Gold(15) RC</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-rose-500 text-center">Gold(16) RC</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-rose-500 text-center">Total RC</th>
 <th colSpan={2} className="py-2 px-2 text-[10px] font-semibold text-blue-600 text-center">Net Sale</th>
 </tr>
 )}
 <tr className="bg-gray-50/80 border-b border-gray-100">
 <th className="py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-36" title="Branch အမည်">
 {renderSortHeader('branchName','Branch','left')}
 </th>
 {viewMode ==='net' && (
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-20" title="အရေအတွက်">
 {renderSortHeader('totalQty','Qty')}
 </th>
 )}
 
 {viewMode ==='allBranch' ? (
 <>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Diamond အရေအတွက်">
 {renderSortHeader('diaSaleQty','Qty')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Diamond ပမာဏ">
 {renderSortHeader('diaSaleAmount','Amount')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="PT အရေအတွက်">
 {renderSortHeader('ptSaleQty','Qty')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="PT ပမာဏ">
 {renderSortHeader('ptSaleAmount','Amount')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(16) အရေအတွက်">
 {renderSortHeader('gold16SaleQty','Qty')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(16) ပမာဏ">
 {renderSortHeader('gold16SaleAmount','Amount')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(15) အရေအတွက်">
 {renderSortHeader('gold15SaleQty','Qty')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(15) ပမာဏ">
 {renderSortHeader('gold15SaleAmount','Amount')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="စုစုပေါင်း အရေအတွက်">
 {renderSortHeader('totalSaleQty','Qty')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="စုစုပေါင်း ပမာဏ">
 {renderSortHeader('totalSaleAmount','Amount')}
 </th>
 </>
 ) : viewMode ==='full' ? (
 <>
 {/* Full Mode Sale Qty/Amount Headers */}
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Diamond Qty">{renderSortHeader('diaSaleQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Diamond Amount">{renderSortHeader('diaSaleAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="PT Qty">{renderSortHeader('ptSaleQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="PT Amount">{renderSortHeader('ptSaleAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(15) Qty">{renderSortHeader('gold15SaleQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(15) Amount">{renderSortHeader('gold15SaleAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(16) Qty">{renderSortHeader('gold16SaleQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(16) Amount">{renderSortHeader('gold16SaleAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Total Sale Qty">{renderSortHeader('totalSaleQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Total Sale Amount">{renderSortHeader('totalSaleAmount','Amount')}</th>

 {/* Full Mode RC Qty/Amount Headers */}
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Diamond RC Qty">{renderSortHeader('diaRcQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Diamond RC Amount">{renderSortHeader('diaRcAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="PT RC Qty">{renderSortHeader('ptRcQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="PT RC Amount">{renderSortHeader('ptRcAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(15) RC Qty">{renderSortHeader('gold15RcQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(15) RC Amount">{renderSortHeader('gold15RcAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(16) RC Qty">{renderSortHeader('gold16RcQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Gold(16) RC Amount">{renderSortHeader('gold16RcAmount','Amount')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Total RC Qty">{renderSortHeader('totalRcQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Total RC Amount">{renderSortHeader('totalRcAmount','Amount')}</th>

 {/* Net Sale Qty/Amount Headers */}
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Net Sale Qty">{renderSortHeader('netSaleQty','Qty')}</th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Net Sale Amount">{renderSortHeader('netSaleAmount','Amount')}</th>
 </>
 ) : (
 <>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="စုစုပေါင်း ရောင်းအား">
 {renderSortHeader('totalSale','Total Sale')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="စုစုပေါင်း Return/Cancel">
 {renderSortHeader('totalRc','Total Rc')}
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="RC % = (Total RC / Total Sale) × 100">
 RC %
 </th>
 <th className="py-2.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center" title="Net Sale = Sale - RC">
 {renderSortHeader('netSale','Net Sale')}
 </th>
 </>
 )}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {cmData.map((branch) => {
 const totalSaleObj = {
 amount: branch.diaSale.amount + branch.goldSale.amount + branch.ptSale.amount,
 gram: branch.diaSale.gram + branch.goldSale.gram + branch.ptSale.gram,
 qty: branch.diaSale.qty + branch.goldSale.qty + branch.ptSale.qty,
 };
 const totalRcObj = {
 amount: branch.diaRc.amount + branch.goldRc.amount + branch.ptRc.amount,
 gram: branch.diaRc.gram + branch.goldRc.gram + branch.ptRc.gram,
 qty: branch.diaRc.qty + branch.goldRc.qty + branch.ptRc.qty,
 };
 const netSaleObj = {
 amount: totalSaleObj.amount - totalRcObj.amount,
 gram: totalSaleObj.gram - totalRcObj.gram,
 qty: totalSaleObj.qty - totalRcObj.qty,
 };

 // Determine if negative for styling
 const currentMetricVal = metricMode ==='amount' ? netSaleObj.amount : metricMode ==='gram' ? netSaleObj.gram : netSaleObj.qty;
 const isNegative = currentMetricVal < 0;

 // Hide other branches when one is expanded
 if (expandedBranch && expandedBranch !== branch.branchName) {
 return null;
 }

 return (
 <Fragment key={branch.branchName}>
 <tr
 className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${expandedBranch === branch.branchName ? 'bg-gray-50/30' : ''}`}
 onClick={() => setExpandedBranch(expandedBranch === branch.branchName ? null : branch.branchName)}
 >
 {/* Branch Name */}
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-1.5">
 <div className="text-[#8c8c8c] group-hover:text-gray-500 transition-colors">
 {expandedBranch === branch.branchName ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </div>
 <span className="text-[12px] font-medium text-[#8c8c8c] group-hover:text-gray-900 transition-colors">
 {branch.branchName}
 </span>
 </div>
 </td>

 {viewMode ==='net' && (
 <td className="py-2.5 px-3 text-center">
 <span className="text-[12px] font-medium text-[#8c8c8c] tabular-nums">
 {branch.totalQty}
 </span>
 </td>
 )}

 {viewMode ==='allBranch' ? (
 <>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]">
 <span className="text-[12px] tabular-nums">{branch.diaSale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.diaSale.amount, prevMonthData.prevMonthBreakdown.diaSale[branch.branchName] || 0) ||'text-gray-900'}`}>
 <span className="text-[12px] font-medium tabular-nums">{branch.diaSale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]">
 <span className="text-[12px] tabular-nums">{branch.ptSale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.ptSale.amount, prevMonthData.prevMonthBreakdown.ptSale[branch.branchName] || 0) ||'text-gray-900'}`}>
 <span className="text-[12px] font-medium tabular-nums">{branch.ptSale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]">
 <span className="text-[12px] tabular-nums">{branch.gold16Sale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.gold16Sale.amount, 0) ||'text-gray-900'}`}>
 <span className="text-[12px] font-medium tabular-nums">{branch.gold16Sale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]">
 <span className="text-[12px] tabular-nums">{branch.gold15Sale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.gold15Sale.amount, 0) ||'text-gray-900'}`}>
 <span className="text-[12px] font-medium tabular-nums">{branch.gold15Sale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]">
 <span className="text-[12px] tabular-nums">{totalSaleObj.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totalSaleObj.amount, prevMonthData.prevMonthBreakdown.totalSale[branch.branchName] || 0) ||'text-gray-900'}`}>
 <span className="text-[12px] font-bold tabular-nums">{totalSaleObj.amount.toLocaleString()}</span>
 </td>
 </>
 ) : viewMode ==='full' ? (
 <>
 {/* Full Mode Sale Qty/Amount */}
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]"><span className="text-[12px] tabular-nums">{branch.diaSale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.diaSale.amount, prevMonthData.prevMonthBreakdown.diaSale[branch.branchName] || 0) ||'text-gray-900'}`}><span className="text-[12px] font-medium tabular-nums">{branch.diaSale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]"><span className="text-[12px] tabular-nums">{branch.ptSale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.ptSale.amount, prevMonthData.prevMonthBreakdown.ptSale[branch.branchName] || 0) ||'text-gray-900'}`}><span className="text-[12px] font-medium tabular-nums">{branch.ptSale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]"><span className="text-[12px] tabular-nums">{branch.gold15Sale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.gold15Sale.amount, 0) ||'text-gray-900'}`}><span className="text-[12px] font-medium tabular-nums">{branch.gold15Sale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]"><span className="text-[12px] tabular-nums">{branch.gold16Sale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(branch.gold16Sale.amount, 0) ||'text-gray-900'}`}><span className="text-[12px] font-medium tabular-nums">{branch.gold16Sale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]"><span className="text-[12px] tabular-nums">{totalSaleObj.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totalSaleObj.amount, prevMonthData.prevMonthBreakdown.totalSale[branch.branchName] || 0) ||'text-gray-900'}`}><span className="text-[12px] font-bold tabular-nums">{totalSaleObj.amount.toLocaleString()}</span></td>

 {/* Full Mode RC Qty/Amount */}
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[12px] tabular-nums">{branch.diaRc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(branch.diaRc.amount, prevMonthData.prevMonthBreakdown.diaRc[branch.branchName] || 0) ||'text-gray-500'}`}><span className="text-[12px] tabular-nums">{branch.diaRc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[12px] tabular-nums">{branch.ptRc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(branch.ptRc.amount, prevMonthData.prevMonthBreakdown.ptRc[branch.branchName] || 0) ||'text-gray-500'}`}><span className="text-[12px] tabular-nums">{branch.ptRc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[12px] tabular-nums">{branch.gold15Rc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(branch.gold15Rc.amount, 0) ||'text-gray-500'}`}><span className="text-[12px] tabular-nums">{branch.gold15Rc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[12px] tabular-nums">{branch.gold16Rc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(branch.gold16Rc.amount, 0) ||'text-gray-500'}`}><span className="text-[12px] tabular-nums">{branch.gold16Rc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[12px] tabular-nums">{totalRcObj.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(totalRcObj.amount, prevMonthData.prevMonthBreakdown.totalRc[branch.branchName] || 0) ||'text-gray-500'}`}><span className="text-[12px] tabular-nums">{totalRcObj.amount.toLocaleString()}</span></td>

 {/* Full Mode Net Sale Qty/Amount */}
 <td className="py-2.5 px-3 text-center text-[#8c8c8c]"><span className="text-[12px] tabular-nums">{netSaleObj.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center text-[12px] tabular-nums font-semibold ${isNegative ? 'text-rose-600' : 'text-gray-900'}`}><span>{netSaleObj.amount.toLocaleString()}</span></td>
 </>
 ) : (
 <>
 <td className={`py-2.5 px-3 text-center ${metricMode ==='amount' ? saleColorClass(totalSaleObj.amount, prevMonthData.prevMonthBreakdown.totalSale[branch.branchName] || 0) : 'text-gray-900'}`}>
 <span className="text-[12px] font-medium tabular-nums">{getMetricValue(totalSaleObj)}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${metricMode ==='amount' ? rcColorClass(totalRcObj.amount, prevMonthData.prevMonthBreakdown.totalRc[branch.branchName] || 0) : 'text-gray-500'}`}>
 <span className="text-[12px] tabular-nums">{getMetricValue(totalRcObj)}</span>
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className={`text-[12px] font-medium tabular-nums ${(() => { const sv = metricMode ==='amount' ? totalSaleObj.amount : metricMode ==='gram' ? totalSaleObj.gram : totalSaleObj.qty; const rv = metricMode ==='amount' ? totalRcObj.amount : metricMode ==='gram' ? totalRcObj.gram : totalRcObj.qty; const pct = sv !== 0 ? (rv / sv) * 100 : 0; return pct >= 10 ? 'text-rose-600' : pct >= 5 ? 'text-amber-600' : 'text-gray-500'; })()}`}>
 {(() => { const sv = metricMode ==='amount' ? totalSaleObj.amount : metricMode ==='gram' ? totalSaleObj.gram : totalSaleObj.qty; const rv = metricMode ==='amount' ? totalRcObj.amount : metricMode ==='gram' ? totalRcObj.gram : totalRcObj.qty; return sv !== 0 ? `${((rv / sv) * 100).toFixed(1)}%` : '-'; })()}
 </span>
 </td>
 <td className={`py-2.5 px-3 text-center text-[12px] tabular-nums font-semibold
 ${isNegative ? 'text-rose-600' : 'text-gray-900'}`}>
 <span>{getMetricValue(netSaleObj)}</span>
 </td>
 </>
 )}
 </tr>

 {/* Daily breakdown panel */}
 {expandedBranch === branch.branchName && (
 <tr className="bg-gray-50/20">
 <td colSpan={getReportTableColSpan(viewMode)} className="p-0">
 <ExpandedBreakdownPanel title="Daily Breakdown" icon={Calendar}>
 <div className="overflow-x-auto">
 {viewMode ==='allBranch' ? (
 <>
 {/* Group header row */}
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(10,minmax(3.75rem,1fr))] gap-1 px-3 pt-2 pb-0 bg-gray-50/50 min-w-[940px]">
 <div />
 <div className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider text-center border-b border-gray-300 pb-0.5">Diamond</div>
 <div className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider text-center border-b border-gray-300 pb-0.5">PT</div>
 <div className="col-span-2 text-[9px] font-semibold text-amber-500 uppercase tracking-wider text-center border-b border-amber-300 pb-0.5">Gold(16)</div>
 <div className="col-span-2 text-[9px] font-semibold text-yellow-600 uppercase tracking-wider text-center border-b border-yellow-300 pb-0.5">Gold(15)</div>
 <div className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider text-center border-b border-gray-300 pb-0.5">Total</div>
 </div>
 {/* Sub-header row */}
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(10,minmax(3.75rem,1fr))] gap-1 px-3 py-1 bg-gray-50/50 border-b border-gray-100/80 min-w-[940px]">
 <ExpandedColumnHeader label="Date" className="text-left" />
 <ExpandedColumnHeader label="Qty" />
 <ExpandedColumnHeader label="Amount" />
 <ExpandedColumnHeader label="Qty" />
 <ExpandedColumnHeader label="Amount" />
 <ExpandedColumnHeader label="Qty" />
 <ExpandedColumnHeader label="Amount" />
 <ExpandedColumnHeader label="Qty" />
 <ExpandedColumnHeader label="Amount" />
 <ExpandedColumnHeader label="Qty" />
 <ExpandedColumnHeader label="Amount" />
 </div>
 <div className="divide-y divide-gray-50 min-w-[940px]">
 {[...branch.dailyList].reverse()
 .filter((day) => {
 // If a day is expanded, only show that day
 if (expandedDay && expandedDay !== day.date) return false;
 return true;
 })
 .map((day) => {
 const daySaleObj = {
 qty: day.diaSale.qty + day.goldSale.qty + day.ptSale.qty,
 amount: day.diaSale.amount + day.goldSale.amount + day.ptSale.amount,
 };
 const isExpanded = expandedDay === day.date;
 const hasCategories = Object.keys(day.categories).length > 0;
 return (
 <div key={`${branch.branchName}-${day.date}`}>
 <div
 onClick={() => hasCategories && toggleDayExpansion(day.date)}
 className={`grid grid-cols-[minmax(6.5rem,1fr)_repeat(10,minmax(3.75rem,1fr))] gap-1 items-center px-3 py-2 hover:bg-gray-50/50 transition-colors ${hasCategories ? 'cursor-pointer' : 'cursor-default'}`}
 >
 <div className="flex items-center gap-2">
 {hasCategories && (
 <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 )}
 <span className="text-[12px] font-medium text-[#8c8c8c] whitespace-nowrap">
 {formatDayLabel(day.date)}
 </span>
 </div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.diaSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.diaSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.ptSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.ptSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold16Sale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold16Sale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold15Sale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold15Sale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={daySaleObj.qty.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={daySaleObj.amount.toLocaleString()} tone="sale" /></div>
 </div>
 {isExpanded && hasCategories && (
 <div className="ml-8 mt-1.5 border-l border-[#e8e8e8] pl-3 space-y-1">
 {Object.entries(day.categories).map(([category, data]) => {
 const catSaleObj = {
 qty: data.diaSale.qty + data.goldSale.qty + data.ptSale.qty,
 amount: data.diaSale.amount + data.goldSale.amount + data.ptSale.amount,
 };
 const customerList = Array.from(data.customers).slice(0, 5);
 const hasMoreCustomers = data.customers.size > 5;
 return (
 <div key={category} className="bg-gray-50/30 rounded-lg">
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(10,minmax(3.75rem,1fr))] gap-1 items-center px-3 py-2">
 <span className="text-[11px] font-semibold text-gray-600">{category}</span>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.diaSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.diaSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.ptSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.ptSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.goldSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.goldSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.goldSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.goldSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={catSaleObj.qty.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={catSaleObj.amount.toLocaleString()} tone="sale" /></div>
 </div>
 <div className="px-3 pb-1.5">
 <div className="text-[10px] text-gray-500 font-medium">
 <span className="text-gray-400">Cus: </span>
 {customerList.join(',')}
 {hasMoreCustomers && <span className="text-gray-400"> +{data.customers.size - 5} more</span>}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </>
 ) : viewMode ==='full' ? (
 <>
 {/* Group header row */}
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(22,minmax(3.75rem,1fr))] gap-1 px-3 pt-2 pb-0 bg-gray-50/50 min-w-[2000px]">
 <div />
 <div className="col-span-2 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider text-center border-b border-emerald-200 pb-0.5">Dia Sale</div>
 <div className="col-span-2 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider text-center border-b border-emerald-200 pb-0.5">PT Sale</div>
 <div className="col-span-2 text-[9px] font-semibold text-amber-600 uppercase tracking-wider text-center border-b border-emerald-200 pb-0.5">Gold(15) Sale</div>
 <div className="col-span-2 text-[9px] font-semibold text-amber-500 uppercase tracking-wider text-center border-b border-emerald-200 pb-0.5">Gold(16) Sale</div>
 <div className="col-span-2 text-[9px] font-semibold text-emerald-700 uppercase tracking-wider text-center border-b border-emerald-200 pb-0.5">Total Sale</div>
 <div className="col-span-2 text-[9px] font-semibold text-rose-500 uppercase tracking-wider text-center border-b border-rose-200 pb-0.5">Dia RC</div>
 <div className="col-span-2 text-[9px] font-semibold text-rose-500 uppercase tracking-wider text-center border-b border-rose-200 pb-0.5">PT RC</div>
 <div className="col-span-2 text-[9px] font-semibold text-rose-500 uppercase tracking-wider text-center border-b border-rose-200 pb-0.5">Gold(15) RC</div>
 <div className="col-span-2 text-[9px] font-semibold text-rose-500 uppercase tracking-wider text-center border-b border-rose-200 pb-0.5">Gold(16) RC</div>
 <div className="col-span-2 text-[9px] font-semibold text-rose-600 uppercase tracking-wider text-center border-b border-rose-200 pb-0.5">Total RC</div>
 <div className="col-span-2 text-[9px] font-semibold text-blue-600 uppercase tracking-wider text-center border-b border-blue-200 pb-0.5">Net Sale</div>
 </div>
 {/* Sub-header row */}
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(22,minmax(3.75rem,1fr))] gap-1 px-3 py-1 bg-gray-50/50 border-b border-gray-100/80 min-w-[2000px]">
 <ExpandedColumnHeader label="Date" className="text-left" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 <ExpandedColumnHeader label="Qty" /><ExpandedColumnHeader label="Amt" />
 </div>
 <div className="divide-y divide-gray-50 min-w-[2000px]">
 {[...branch.dailyList].reverse()
 .filter((day) => {
 // If a day is expanded, only show that day
 if (expandedDay && expandedDay !== day.date) return false;
 return true;
 })
 .map((day) => {
 const daySaleObj = {
 amount: day.diaSale.amount + day.goldSale.amount + day.ptSale.amount,
 qty: day.diaSale.qty + day.goldSale.qty + day.ptSale.qty,
 };
 const dayRcObj = {
 amount: day.diaRc.amount + day.goldRc.amount + day.ptRc.amount,
 qty: day.diaRc.qty + day.goldRc.qty + day.ptRc.qty,
 };
 const dayNetObj = {
 amount: daySaleObj.amount - dayRcObj.amount,
 qty: daySaleObj.qty - dayRcObj.qty,
 };
 const isDayNegative = dayNetObj.amount < 0;
 const isExpanded = expandedDay === day.date;
 const hasCategories = Object.keys(day.categories).length > 0;
 return (
 <div key={`${branch.branchName}-${day.date}`}>
 <div
 onClick={() => hasCategories && toggleDayExpansion(day.date)}
 className={`grid grid-cols-[minmax(6.5rem,1fr)_repeat(22,minmax(3.75rem,1fr))] gap-1 items-center px-3 py-2 hover:bg-gray-50/50 transition-colors ${hasCategories ? 'cursor-pointer' : 'cursor-default'}`}
 >
 <div className="flex items-center gap-2">
 {hasCategories && (
 <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 )}
 <span className="text-[12px] font-medium text-[#8c8c8c] whitespace-nowrap">
 {formatDayLabel(day.date)}
 </span>
 </div>
 {/* Sale Qty/Amount */}
 <div className="flex justify-center"><ExpandedMetricBadge value={day.diaSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.diaSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.ptSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.ptSale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold15Sale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold15Sale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold16Sale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold16Sale.amount.toLocaleString()} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={daySaleObj.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={daySaleObj.amount.toLocaleString()} tone="sale" /></div>
 {/* RC Qty/Amount */}
 <div className="flex justify-center"><ExpandedMetricBadge value={day.diaRc.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.diaRc.amount.toLocaleString()} tone="rc" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.ptRc.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.ptRc.amount.toLocaleString()} tone="rc" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold15Rc.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold15Rc.amount.toLocaleString()} tone="rc" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold16Rc.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.gold16Rc.amount.toLocaleString()} tone="rc" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={dayRcObj.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={dayRcObj.amount.toLocaleString()} tone="rc" /></div>
 {/* Net Sale Qty/Amount */}
 <div className="flex justify-center"><ExpandedMetricBadge value={dayNetObj.qty.toLocaleString()} /></div>
 <div className="flex justify-center">
 {isDayNegative ? (
 <span className="inline-flex min-w-[2.5rem] justify-center text-[11px] font-semibold text-rose-600 tabular-nums">
 {dayNetObj.amount.toLocaleString()}
 </span>
 ) : (
 <ExpandedMetricBadge value={dayNetObj.amount.toLocaleString()} tone="net" />
 )}
 </div>
 </div>
 {isExpanded && hasCategories && (
 <div className="ml-8 mt-1.5 border-l border-[#e8e8e8] pl-3 space-y-1">
 {Object.entries(day.categories).map(([category, data]) => {
 const catSaleObj = {
 amount: data.diaSale.amount + data.goldSale.amount + data.ptSale.amount,
 gram: data.diaSale.gram + data.goldSale.gram + data.ptSale.gram,
 qty: data.diaSale.qty + data.goldSale.qty + data.ptSale.qty,
 };
 const catRcObj = {
 amount: data.diaRc.amount + data.goldRc.amount + data.ptRc.amount,
 gram: data.diaRc.gram + data.goldRc.gram + data.ptRc.gram,
 qty: data.diaRc.qty + data.goldRc.qty + data.ptRc.qty,
 };
 const catNetObj = {
 amount: catSaleObj.amount - catRcObj.amount,
 gram: catSaleObj.gram - catRcObj.gram,
 qty: catSaleObj.qty - catRcObj.qty,
 };
 const customerList = Array.from(data.customers).slice(0, 5);
 const hasMoreCustomers = data.customers.size > 5;
 return (
 <div key={category} className="bg-gray-50/30 rounded-lg">
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(12,minmax(3.75rem,1fr))] gap-1 items-center px-3 py-2">
 <span className="text-[11px] font-medium text-gray-600">{category}</span>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.totalSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.diaSale)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.goldSale)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.goldSale)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.ptSale)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(catSaleObj)} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.diaRc)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.goldRc)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.goldRc)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(data.ptRc)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(catRcObj)} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(catNetObj)} tone="net" /></div>
 </div>
 <div className="px-3 pb-1.5">
 <div className="text-[10px] text-gray-500 font-medium">
 <span className="text-gray-400">Cus: </span>
 {customerList.join(',')}
 {hasMoreCustomers && <span className="text-gray-400"> +{data.customers.size - 5} more</span>}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </>
 ) : (
 <>
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(5,minmax(4.5rem,1fr))] gap-2 px-4 py-2 bg-gray-50/50 border-b border-gray-100/80 min-w-[470px]">
 <ExpandedColumnHeader label="Date" className="text-left" />
 <ExpandedColumnHeader label="Qty" />
 <ExpandedColumnHeader label="Total Sale" />
 <ExpandedColumnHeader label="Total RC" />
 <ExpandedColumnHeader label="RC %" />
 <ExpandedColumnHeader label="Net Sale" />
 </div>
 <div className="divide-y divide-gray-50 min-w-[470px]">
 {[...branch.dailyList].reverse()
 .filter((day) => {
 // If a day is expanded, only show that day
 if (expandedDay && expandedDay !== day.date) return false;
 return true;
 })
 .map((day) => {
 const daySaleObj = {
 amount: day.diaSale.amount + day.goldSale.amount + day.ptSale.amount,
 gram: day.diaSale.gram + day.goldSale.gram + day.ptSale.gram,
 qty: day.diaSale.qty + day.goldSale.qty + day.ptSale.qty,
 };
 const dayRcObj = {
 amount: day.diaRc.amount + day.goldRc.amount + day.ptRc.amount,
 gram: day.diaRc.gram + day.goldRc.gram + day.ptRc.gram,
 qty: day.diaRc.qty + day.goldRc.qty + day.ptRc.qty,
 };
 const dayNetObj = {
 amount: daySaleObj.amount - dayRcObj.amount,
 gram: daySaleObj.gram - dayRcObj.gram,
 qty: daySaleObj.qty - dayRcObj.qty,
 };
 const isDayNegative =
 (metricMode ==='amount' ? dayNetObj.amount : metricMode ==='gram' ? dayNetObj.gram : dayNetObj.qty) < 0;
 const isExpanded = expandedDay === day.date;
 const hasCategories = Object.keys(day.categories).length > 0;
 return (
 <div key={`${branch.branchName}-${day.date}`}>
 <div
 onClick={() => hasCategories && toggleDayExpansion(day.date)}
 className={`grid grid-cols-[minmax(6.5rem,1fr)_repeat(5,minmax(4.5rem,1fr))] gap-2 items-center px-4 py-2 hover:bg-gray-50/50 transition-colors ${hasCategories ? 'cursor-pointer' : 'cursor-default'}`}
 >
 <div className="flex items-center gap-2">
 {hasCategories && (
 <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 )}
 <span className="text-[12px] font-medium text-[#8c8c8c] whitespace-nowrap">
 {formatDayLabel(day.date)}
 </span>
 </div>
 <div className="flex justify-center"><ExpandedMetricBadge value={day.totalQty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(daySaleObj)} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(dayRcObj)} /></div>
 <div className="flex justify-center">
 {(() => { const sv = metricMode ==='amount' ? daySaleObj.amount : metricMode ==='gram' ? daySaleObj.gram : daySaleObj.qty; const rv = metricMode ==='amount' ? dayRcObj.amount : metricMode ==='gram' ? dayRcObj.gram : dayRcObj.qty; if (sv === 0) return <ExpandedMetricBadge value="-" />; const pct = (rv / sv) * 100; return <span className={`inline-flex min-w-[2.5rem] justify-center text-[11px] font-semibold tabular-nums ${pct >= 10 ? 'text-rose-600' : pct >= 5 ? 'text-amber-600' : 'text-gray-500'}`}>{pct.toFixed(1)}%</span>; })()}
 </div>
 <div className="flex justify-center">
 {isDayNegative ? (
 <span className="inline-flex min-w-[2.5rem] justify-center text-[11px] font-semibold text-rose-600 tabular-nums">
 {getMetricValue(dayNetObj)}
 </span>
 ) : (
 <ExpandedMetricBadge value={getMetricValue(dayNetObj)} tone="net" />
 )}
 </div>
 </div>
 {isExpanded && hasCategories && (
 <div className="ml-8 mt-1.5 border-l border-[#e8e8e8] pl-3 space-y-1">
 {Object.entries(day.categories).map(([category, data]) => {
 const catSaleObj = {
 amount: data.diaSale.amount + data.goldSale.amount + data.ptSale.amount,
 gram: data.diaSale.gram + data.goldSale.gram + data.ptSale.gram,
 qty: data.diaSale.qty + data.goldSale.qty + data.ptSale.qty,
 };
 const catRcObj = {
 amount: data.diaRc.amount + data.goldRc.amount + data.ptRc.amount,
 gram: data.diaRc.gram + data.goldRc.gram + data.ptRc.gram,
 qty: data.diaRc.qty + data.goldRc.qty + data.ptRc.qty,
 };
 const catNetObj = {
 amount: catSaleObj.amount - catRcObj.amount,
 gram: catSaleObj.gram - catRcObj.gram,
 qty: catSaleObj.qty - catRcObj.qty,
 };
 const customerList = Array.from(data.customers).slice(0, 5);
 const hasMoreCustomers = data.customers.size > 5;
 return (
 <div key={category} className="bg-gray-50/30 rounded-lg">
 <div className="grid grid-cols-[minmax(6.5rem,1fr)_repeat(5,minmax(4.5rem,1fr))] gap-2 items-center px-4 py-2">
 <span className="text-[11px] font-medium text-gray-600">{category}</span>
 <div className="flex justify-center"><ExpandedMetricBadge value={data.totalSale.qty.toLocaleString()} /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(catSaleObj)} tone="sale" /></div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(catRcObj)} /></div>
 <div className="flex justify-center">
 {(() => { const sv = metricMode ==='amount' ? catSaleObj.amount : metricMode ==='gram' ? catSaleObj.gram : catSaleObj.qty; const rv = metricMode ==='amount' ? catRcObj.amount : metricMode ==='gram' ? catRcObj.gram : catRcObj.qty; if (sv === 0) return <ExpandedMetricBadge value="-" />; const pct = (rv / sv) * 100; return <span className={`inline-flex min-w-[2.5rem] justify-center text-[11px] font-semibold tabular-nums ${pct >= 10 ? 'text-rose-600' : pct >= 5 ? 'text-amber-600' : 'text-gray-500'}`}>{pct.toFixed(1)}%</span>; })()}
 </div>
 <div className="flex justify-center"><ExpandedMetricBadge value={getMetricValue(catNetObj)} tone="net" /></div>
 </div>
 <div className="px-4 pb-1.5">
 <div className="text-[10px] text-gray-500 font-medium">
 <span className="text-gray-400">Cus: </span>
 {customerList.join(',')}
 {hasMoreCustomers && <span className="text-gray-400"> +{data.customers.size - 5} more</span>}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </>
 )}
 </div>
 </ExpandedBreakdownPanel>
 </td>
 </tr>
 )}
 </Fragment>
 );
 })}

 {/* Totals Row */}
 <tr className="bg-gray-50/80 font-bold text-gray-900 sticky bottom-0 border-t-2 border-gray-100">
 <td className="py-2.5 px-3 text-left">
 <span className="text-[11px] font-bold">Grand Total</span>
 </td>
 {viewMode ==='net' && (
 <td className="py-2.5 px-3 text-center">
 <span className="text-[11px] font-bold tabular-nums">
 {totals.totalQty.toLocaleString()}
 </span>
 </td>
 )}

 {viewMode ==='allBranch' ? (
 <>
 <td className="py-2.5 px-3 text-center">
 <span className="text-[11px] tabular-nums">{totals.diaSale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.diaSale.amount, prevMonthData.prevMonthBreakdown.totals.diaSale) ||'text-gray-900'}`}>
 <span className="text-[11px] tabular-nums">{totals.diaSale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className="text-[11px] tabular-nums">{totals.ptSale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.ptSale.amount, prevMonthData.prevMonthBreakdown.totals.ptSale) ||'text-gray-900'}`}>
 <span className="text-[11px] tabular-nums">{totals.ptSale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className="text-[11px] tabular-nums">{totals.gold16Sale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.gold16Sale.amount, 0) ||'text-gray-900'}`}>
 <span className="text-[11px] tabular-nums">{totals.gold16Sale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className="text-[11px] tabular-nums">{totals.gold15Sale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.gold15Sale.amount, 0) ||'text-gray-900'}`}>
 <span className="text-[11px] tabular-nums">{totals.gold15Sale.amount.toLocaleString()}</span>
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className="text-[11px] tabular-nums">{totals.totalSale.qty.toLocaleString()}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.totalSale.amount, prevMonthData.prevMonthBreakdown.totals.totalSale) ||'text-gray-900'}`}>
 <span className="text-[11px] font-bold tabular-nums">{totals.totalSale.amount.toLocaleString()}</span>
 </td>
 </>
 ) : viewMode ==='full' ? (
 <>
 {/* Full Mode Grand Total Sale Qty/Amount */}
 <td className="py-2.5 px-3 text-center"><span className="text-[11px] tabular-nums">{totals.diaSale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.diaSale.amount, prevMonthData.prevMonthBreakdown.totals.diaSale) ||'text-gray-900'}`}><span className="text-[11px] tabular-nums">{totals.diaSale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center"><span className="text-[11px] tabular-nums">{totals.ptSale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.ptSale.amount, prevMonthData.prevMonthBreakdown.totals.ptSale) ||'text-gray-900'}`}><span className="text-[11px] tabular-nums">{totals.ptSale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center"><span className="text-[11px] tabular-nums">{totals.gold15Sale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.gold15Sale.amount, 0) ||'text-gray-900'}`}><span className="text-[11px] tabular-nums">{totals.gold15Sale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center"><span className="text-[11px] tabular-nums">{totals.gold16Sale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.gold16Sale.amount, 0) ||'text-gray-900'}`}><span className="text-[11px] tabular-nums">{totals.gold16Sale.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center"><span className="text-[11px] tabular-nums">{totals.totalSale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${saleColorClass(totals.totalSale.amount, prevMonthData.prevMonthBreakdown.totals.totalSale) ||'text-gray-900'}`}><span className="text-[11px] font-bold tabular-nums">{totals.totalSale.amount.toLocaleString()}</span></td>

 {/* Full Mode Grand Total RC Qty/Amount */}
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[11px] tabular-nums">{totals.diaRc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(totals.diaRc.amount, prevMonthData.prevMonthBreakdown.totals.diaRc) ||'text-gray-500'}`}><span className="text-[11px] tabular-nums">{totals.diaRc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[11px] tabular-nums">{totals.ptRc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(totals.ptRc.amount, prevMonthData.prevMonthBreakdown.totals.ptRc) ||'text-gray-500'}`}><span className="text-[11px] tabular-nums">{totals.ptRc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[11px] tabular-nums">{totals.gold15Rc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(totals.gold15Rc.amount, 0) ||'text-gray-500'}`}><span className="text-[11px] tabular-nums">{totals.gold15Rc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[11px] tabular-nums">{totals.gold16Rc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(totals.gold16Rc.amount, 0) ||'text-gray-500'}`}><span className="text-[11px] tabular-nums">{totals.gold16Rc.amount.toLocaleString()}</span></td>
 <td className="py-2.5 px-3 text-center text-gray-500"><span className="text-[11px] tabular-nums">{totals.totalRc.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center ${rcColorClass(totals.totalRc.amount, prevMonthData.prevMonthBreakdown.totals.totalRc) ||'text-gray-500'}`}><span className="text-[11px] tabular-nums">{totals.totalRc.amount.toLocaleString()}</span></td>

 {/* Full Mode Grand Total Net Sale Qty/Amount */}
 <td className="py-2.5 px-3 text-center"><span className="text-[11px] tabular-nums">{totals.netSale.qty.toLocaleString()}</span></td>
 <td className={`py-2.5 px-3 text-center text-[12px] tabular-nums font-semibold ${totals.netSale.amount < 0 ? 'text-rose-600' : 'text-gray-900'}`}><span>{totals.netSale.amount.toLocaleString()}</span></td>
 </>
 ) : (
 <>
 <td className={`py-2.5 px-3 text-center ${metricMode ==='amount' ? saleColorClass(totals.totalSale.amount, prevMonthData.prevMonthBreakdown.totals.totalSale) : ''}`}>
 <span className="text-[11px] font-bold tabular-nums">{getMetricValue(totals.totalSale)}</span>
 </td>
 <td className={`py-2.5 px-3 text-center ${metricMode ==='amount' ? rcColorClass(totals.totalRc.amount, prevMonthData.prevMonthBreakdown.totals.totalRc) : 'text-gray-500'}`}>
 <span className="text-[11px] tabular-nums">{getMetricValue(totals.totalRc)}</span>
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className={`text-[11px] font-bold tabular-nums ${(() => { const sv = metricMode ==='amount' ? totals.totalSale.amount : metricMode ==='gram' ? totals.totalSale.gram : totals.totalSale.qty; const rv = metricMode ==='amount' ? totals.totalRc.amount : metricMode ==='gram' ? totals.totalRc.gram : totals.totalRc.qty; const pct = sv !== 0 ? (rv / sv) * 100 : 0; return pct >= 10 ? 'text-rose-600' : pct >= 5 ? 'text-amber-600' : 'text-gray-500'; })()}`}>
 {(() => { const sv = metricMode ==='amount' ? totals.totalSale.amount : metricMode ==='gram' ? totals.totalSale.gram : totals.totalSale.qty; const rv = metricMode ==='amount' ? totals.totalRc.amount : metricMode ==='gram' ? totals.totalRc.gram : totals.totalRc.qty; return sv !== 0 ? `${((rv / sv) * 100).toFixed(1)}%` : '-'; })()}
 </span>
 </td>
 <td className={`py-2.5 px-3 text-center font-bold text-[12px] tabular-nums
 ${(metricMode ==='amount' ? totals.netSale.amount : metricMode ==='gram' ? totals.netSale.gram : totals.netSale.qty) < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
 <span>{getMetricValue(totals.netSale)}</span>
 </td>
 </>
 )}
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 </>
 )}

 {/* Shop Target - Combined Diamond + PT + Gold Target (inside All Branch Sale) */}
 {viewMode ==='allBranch' && (() => {
 const targetData = targetTab ==='diamond' ? prevMonthData.diamondTargetData : targetTab ==='pt' ? prevMonthData.ptTargetData : (goldPurityTab ? (goldTargetData[goldPurityTab] || []) : []);
 const goldCategoriesWithData = GOLD_PURITY_CATEGORIES.filter(cat => (goldTargetData[cat] || []).length > 0);

 // Forecast: project month-end total based on current daily pace
 const uniqueDates = new Set<string>();
 data.forEach(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 if (dateStr) uniqueDates.add(dateStr);
 });
 const daysElapsed = uniqueDates.size || 1;
 const monthIdx = MONTHS.indexOf(selectedMonth);
 const totalDays = monthIdx >= 0 ? new Date(new Date().getFullYear(), monthIdx + 1, 0).getDate() : 0;
 const forecastFactor = totalDays > 0 ? totalDays / daysElapsed : 1;
 const computeForecast = (today: number) => totalDays > 0 ? today * forecastFactor : 0;

 return (
 <div className="pt-2">
 <button
 onClick={() => setShopTargetExpanded(!shopTargetExpanded)}
 className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#e8e8e8] hover:border-gray-300 transition-colors group"
 >
 <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">Shop Target များကြည့်ရန်</h2>
 <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${shopTargetExpanded ? 'rotate-180' : ''}`} />
 </button>
 <div
 className={`overflow-hidden transition-all duration-300 ease-in-out ${
 shopTargetExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
 }`}
 >
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100">
 <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
 <button
 onClick={() => setTargetTab('diamond')}
 className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${targetTab ==='diamond' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
 >
 Diamond
 </button>
 <button
 onClick={() => setTargetTab('pt')}
 className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${targetTab ==='pt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
 >
 PT
 </button>
 <button
 onClick={() => { setTargetTab('gold'); setGoldPurityTab(goldCategoriesWithData[0] ||''); }}
 className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${targetTab ==='gold' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
 >
 Gold
 </button>
 </div>
 <span className="text-[10px] text-gray-400 font-medium">Prev. Month Sales</span>
 </div>

 {/* Gold: side-by-side comparison cards */}
 {targetTab ==='gold' ? (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
 {(['၁၆ပဲရည်','၁၅ ပဲရည်'] as const).map((cat) => {
 const catData = goldTargetData[cat] || [];
 return (
 <div key={cat} className="overflow-hidden">
 <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
 <h3 className="text-[13px] font-bold text-gray-900">{cat}</h3>
 </div>
 <div className="overflow-x-auto max-h-[500px]">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10 bg-gray-50/80">
 <tr>
 <th className="py-2.5 px-5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Shop</th>
 <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Today</th>
 <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Target</th>
 <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Forecast</th>
 <th className="py-2.5 px-5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {catData.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-10 px-4 text-center text-[12px] text-[#8c8c8c]">
 No data
 </td>
 </tr>
 ) : (
 <>
 {catData.map((row) => (
 <tr key={row.shop} className="hover:bg-gray-50/50 transition-colors">
 <td className="py-2.5 px-5 text-[12px] font-medium text-[#8c8c8c]">{row.shop}</td>
 <td className="py-2.5 px-3 text-[12px] font-medium text-gray-900 text-right tabular-nums">{renderCompactAmount(row.today)}</td>
 <td className="py-2.5 px-3 text-[12px] text-gray-500 text-right tabular-nums">{renderCompactAmount(row.target)}</td>
 <td className="py-2.5 px-3 text-[12px] text-gray-600 text-right tabular-nums">{renderCompactAmount(computeForecast(row.today))}</td>
 <td className="py-2.5 px-5 text-center">
 <span className={`status-pill status-pill--${row.status}`}>
 <span className={`status-pill__dot ${row.status ==='good' ? '' : 'status-pill__dot--pulse'}`}></span>
 {row.status ==='good' &&'Good'}
 {row.status ==='warning' &&'Warning'}
 {row.status ==='critical' &&'Critical'}
 </span>
 </td>
 </tr>
 ))}
 <tr className="border-t-2 border-gray-100">
 <td className="py-2.5 px-5 text-[12px] font-bold text-gray-900">Total</td>
 <td className="py-2.5 px-3 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {renderCompactAmount(catData.reduce((sum, row) => sum + row.today, 0))}
 </td>
 <td className="py-2.5 px-3 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {renderCompactAmount(catData.reduce((sum, row) => sum + row.target, 0))}
 </td>
 <td className="py-2.5 px-3 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {renderCompactAmount(catData.reduce((sum, row) => sum + computeForecast(row.today), 0))}
 </td>
 <td className="py-2.5 px-5" />
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="overflow-x-auto max-h-[560px]">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10 bg-gray-50/80">
 <tr>
 <th className="py-2.5 px-5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Shop</th>
 <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Today</th>
 <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Target</th>
 <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Forecast</th>
 <th className="py-2.5 px-5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {targetData.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-10 px-4 text-center text-[12px] text-[#8c8c8c]">
 No data
 </td>
 </tr>
 ) : (
 <>
 {targetData.map((row) => (
 <tr key={row.shop} className="hover:bg-gray-50/50 transition-colors">
 <td className="py-2.5 px-5 text-[12px] font-medium text-[#8c8c8c]">{row.shop}</td>
 <td className="py-2.5 px-3 text-[12px] font-medium text-gray-900 text-right tabular-nums">{renderCompactAmount(row.today)}</td>
 <td className="py-2.5 px-3 text-[12px] text-gray-500 text-right tabular-nums">{renderCompactAmount(row.target)}</td>
 <td className="py-2.5 px-3 text-[12px] text-gray-600 text-right tabular-nums">{renderCompactAmount(computeForecast(row.today))}</td>
 <td className="py-2.5 px-5 text-center">
 <span className={`status-pill status-pill--${row.status}`}>
 <span className={`status-pill__dot ${row.status ==='good' ? '' : 'status-pill__dot--pulse'}`}></span>
 {row.status ==='good' &&'Good'}
 {row.status ==='warning' &&'Warning'}
 {row.status ==='critical' &&'Critical'}
 </span>
 </td>
 </tr>
 ))}
 <tr className="border-t-2 border-gray-100">
 <td className="py-2.5 px-5 text-[12px] font-bold text-gray-900">Total</td>
 <td className="py-2.5 px-3 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {renderCompactAmount(targetData.reduce((sum, row) => sum + row.today, 0))}
 </td>
 <td className="py-2.5 px-3 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {renderCompactAmount(targetData.reduce((sum, row) => sum + row.target, 0))}
 </td>
 <td className="py-2.5 px-3 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {renderCompactAmount(targetData.reduce((sum, row) => sum + computeForecast(row.today), 0))}
 </td>
 <td className="py-2.5 px-5" />
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })()}

 {/* Gold Sales by Purity — only in Report အားလုံးကြည့်ရန် */}
 {viewMode ==='full' && (
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">Gold (ပဲရည်အလိုက်ရောင်းအား)</h3>
 <button
 onClick={() => setFullscreenTable(fullscreenTable ==='goldPurity' ? null : 'goldPurity')}
 className="flex items-center justify-center p-2 bg-[#1677ff] text-white hover:bg-[#4096ff] rounded-lg transition-all border border-[#1677ff]"
 title="Full Screen"
 >
 {fullscreenTable ==='goldPurity' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 </div>
 <div className="flex bg-gray-100 p-0.5 rounded-lg shrink-0">
 <button
 type="button"
 onClick={() => setGoldGramDisplay('gram')}
 className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
 goldGramDisplay ==='gram'
 ? 'bg-white text-gray-900 shadow-sm'
 : 'text-gray-400 hover:text-gray-600'
 }`}
 >
 Gram
 </button>
 <button
 type="button"
 onClick={() => setGoldGramDisplay('kpy')}
 className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
 goldGramDisplay ==='kpy'
 ? 'bg-white text-gray-900 shadow-sm'
 : 'text-gray-400 hover:text-gray-600'
 }`}
 >
 K, P, Y
 </button>
 </div>
 </div>
 <div className="overflow-x-auto max-h-[600px]">
 {(() => {
 const goldWeightCols = goldGramDisplay ==='kpy' ? 3 : 1;
 const purityGroupCols = 1 + goldWeightCols;
 const purityCount = Math.max(goldPuritySales.purityTypes.length, 1);
 const tableColSpan = 1 + purityCount * purityGroupCols + purityGroupCols;

 return (
 <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
 <thead className="sticky top-0 z-10">
 <tr className="bg-gray-50/80 border-b border-gray-100">
 <th
 rowSpan={2}
 className="py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider align-middle whitespace-nowrap w-[15%]"
 >
 Shop Name
 </th>
 {goldPuritySales.purityTypes.length > 0 ? (
 goldPuritySales.purityTypes.map((type) => (
 <th
 key={type}
 colSpan={purityGroupCols}
 className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center"
 >
 {type}
 </th>
 ))
 ) : (
 <th colSpan={purityGroupCols} className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center">
 -
 </th>
 )}
 <th colSpan={purityGroupCols} className="py-2 px-2 text-[10px] font-semibold text-gray-500 text-center">
 Total
 </th>
 </tr>
 <tr className="bg-gray-50/50 border-b border-gray-100">
 {(goldPuritySales.purityTypes.length > 0 ? goldPuritySales.purityTypes : ['-']).flatMap((type) => [
 <th
 key={`${type}-qty`}
 className="py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-[8%]"
 >
 Qty
 </th>,
 ...(goldGramDisplay ==='kpy'
 ? (['K','P','Y'] as const).map((label) => (
 <th
 key={`${type}-${label}`}
 className="py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-[8%]"
 >
 {label}
 </th>
 ))
 : [
 <th
 key={`${type}-gram`}
 className="py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-[12%]"
 >
 Gram
 </th>,
 ]),
 ])}
 <th className="py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-[8%]">
 Qty
 </th>
 {goldGramDisplay ==='kpy' ? (
 (['K','P','Y'] as const).map((label) => (
 <th
 key={`total-${label}`}
 className="py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-[8%]"
 >
 {label}
 </th>
 ))
 ) : (
 <th className="py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center w-[12%]">Gram</th>
 )}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {goldPuritySales.rows.length === 0 ? (
 <tr>
 <td
 colSpan={tableColSpan}
 className="py-8 px-4 text-center text-[12px] text-[#8c8c8c]"
 >
 Gold Sale data မရှိပါ (ပဲရည် column: {goldPuritySales.purityKey})
 </td>
 </tr>
 ) : (
 <>
 {goldPuritySales.rows.map((row) => (
 <tr key={row.branch} className="hover:bg-gray-50/50 transition-colors">
 <td className="py-2.5 px-4 text-[12px] font-medium text-[#8c8c8c] whitespace-nowrap">
 {row.branch}
 </td>
 {goldPuritySales.purityTypes.map((type) => {
 const cell = row.purities[type] || emptyPurityCell();
 return (
 <React.Fragment key={type}>
 <td className="py-2.5 px-2 text-center text-[12px] text-[#8c8c8c] tabular-nums">
 {renderPurityQty(cell.qty)}
 </td>
 {renderGoldWeightCells(cell.gram, goldGramDisplay,'data')}
 </React.Fragment>
 );
 })}
 <td className="py-2.5 px-2 text-center text-[12px] font-bold text-gray-900 tabular-nums">
 {renderPurityQty(row.qty)}
 </td>
 {renderGoldWeightCells(row.gram, goldGramDisplay,'total', true)}
 </tr>
 ))}
 <tr className="bg-gray-50/80 border-t-2 border-gray-100">
 <td className="py-2.5 px-4 text-[12px] font-bold text-gray-900">Grand Total</td>
 {goldPuritySales.purityTypes.map((type) => {
 const cell = goldPuritySales.grandTotal.purities[type] || emptyPurityCell();
 return (
 <React.Fragment key={type}>
 <td className="py-2.5 px-2 text-center text-[12px] font-bold text-gray-900 tabular-nums">
 {renderPurityQty(cell.qty)}
 </td>
 {renderGoldWeightCells(cell.gram, goldGramDisplay,'grand')}
 </React.Fragment>
 );
 })}
 <td className="py-2.5 px-2 text-center text-[12px] font-bold text-gray-900 tabular-nums">
 {renderPurityQty(goldPuritySales.grandTotal.qty)}
 </td>
 {renderGoldWeightCells(goldPuritySales.grandTotal.gram, goldGramDisplay,'grand', true)}
 </tr>
 </>
 )}
 </tbody>
 </table>
 );
 })()}
 </div>
 </div>
 )}
 </div>
 );
}

export default memo(CmView);
