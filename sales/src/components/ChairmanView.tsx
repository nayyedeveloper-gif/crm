import React, { useMemo, useState, Suspense, lazy } from'react';
import { motion } from'motion/react';
import { Crown, TrendingUp, TrendingDown, Minus, Target, Percent, Gem, RotateCcw, Package, Skull, Users, Star, Heart, Clock, ChevronDown, Download, BarChart3, Maximize2, Minimize2 } from'lucide-react';
import { DataRow } from'../types';
import * as XLSX from'xlsx';
import { getExtractedReason, parseNumericCell, parseSafeDate } from'../utils';
import { findShopTarget, TargetSheetData } from'../targetSheet';

const CmView = lazy(() => import('./CmView'));

interface ChairmanViewProps {
 data: DataRow[];
 allData?: DataRow[];
 selectedMonth?: string;
 targetSheetData?: TargetSheetData | null;
 onCusDetail?: (shop: string) => void;
 selectedBranches?: string[];
}

const formatCompact = (value: number): string => {
 if (value === 0 || Number.isNaN(value)) return'-';
 const abs = Math.abs(value);
 if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/,'') +'B';
 if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/,'') +'M';
 if (abs >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/,'') +'K';
 return value.toLocaleString();
};

const DIA_SALE_REASONS = new Set(['Dia Sale','Dia Sale','Dia အရောင်း']);
const GOLD_SALE_REASONS = new Set(['G Sale','G Sale','Gold Sale','Gold Sale','Gold အရောင်း']);
const PT_SALE_REASONS = new Set(['PT Sale','PT Sale','PT အရောင်း']);

const SALE_REASONS = new Set([...DIA_SALE_REASONS, ...GOLD_SALE_REASONS, ...PT_SALE_REASONS,'Sale','Sale','အရောင်း']);

const DIA_RC_REASONS = new Set(['Dia RC','Dia RC','Dia Rc','Dia Rc','Dia အဝယ်']);
const GOLD_RC_REASONS = new Set(['G RC','G RC','Gold RC','Gold RC','G Rc','G Rc','Gold Rc','Gold Rc','Gold အဝယ်']);
const PT_RC_REASONS = new Set(['PT RC','PT RC','PT Rc','PT Rc','PT အဝယ်']);

const RC_REASONS = new Set([...DIA_RC_REASONS, ...GOLD_RC_REASONS, ...PT_RC_REASONS,'RC','RC','Rc','Rc','အဝယ်']);

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

const getPurityValue = (row: DataRow, purityKey: string) => {
 const raw = row[purityKey] ?? row['ပဲရည်'] ?? row['ပဲရည်'];
 if (raw == null || String(raw).trim() ==='') return null;
 return String(raw).trim();
};

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
 const reason = (getExtractedReason(row) ||'').trim();
 if (!GOLD_SALE_REASONS.has(reason)) return;
 const purity = getPurityValue(row, purityKey);
 if (!purity) return;
 const category = getGoldPurityCategory(purity);
 if (category !== purityCategory) return;
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 targets[branch] = (targets[branch] || 0) + amount;
 });
 return targets;
};

const getPreviousMonthName = (selectedMonth: string) => {
 const idx = MONTHS.indexOf(selectedMonth);
 return idx > 0 ? MONTHS[idx - 1] : MONTHS[11];
};

const getSaleByReason = (rows: DataRow[], reasons: Set<string>) => {
 const targets: Record<string, number> = {};
 rows.forEach((row) => {
 const reason = (getExtractedReason(row) ||'').trim();
 if (!reasons.has(reason)) return;
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 targets[branch] = (targets[branch] || 0) + amount;
 });
 return targets;
};

const getRcByReason = (rows: DataRow[], reasons: Set<string>) => {
 const targets: Record<string, number> = {};
 rows.forEach((row) => {
 const reason = (getExtractedReason(row) ||'').trim();
 if (!reasons.has(reason)) return;
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 targets[branch] = (targets[branch] || 0) + amount;
 });
 return targets;
};

type ShopRow = { shop: string; today: number; target: number; status: 'critical' |'warning' |'good'; rcPctOfSale?: number };

const getGoldRcByPurity = (rows: DataRow[], purityCategory: string) => {
 const purityKey = getPurityColumnKey(rows[0]);
 const targets: Record<string, number> = {};
 rows.forEach((row) => {
 const reason = (getExtractedReason(row) ||'').trim();
 if (!GOLD_RC_REASONS.has(reason)) return;
 const purity = getPurityValue(row, purityKey);
 if (!purity) return;
 const category = getGoldPurityCategory(purity);
 if (category !== purityCategory) return;
 const branch = row['Branch အမည်'] ||'Unknown';
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 targets[branch] = (targets[branch] || 0) + amount;
 });
 return targets;
};

type CustomerCategoryAgg = {
 total: number;
 lastDate: Date | null;
 dia: number;
 pt: number;
 gold16: number;
 gold15: number;
 lastDateDia: Date | null;
 lastDatePt: Date | null;
 lastDateGold16: Date | null;
 lastDateGold15: Date | null;
};

const buildCustomerAggregates = (rows: DataRow[]): { aggregates: Map<string, Map<string, CustomerCategoryAgg>>; latestDate: Date | null } => {
 // First pass: aggregate per branch+customer
 const perBranch = new Map<string, Map<string, CustomerCategoryAgg>>();
 let latestDate: Date | null = null;
 const purityKey = getPurityColumnKey(rows[0]);
 rows.forEach((row) => {
 const date = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 if (date && (!latestDate || date > latestDate)) latestDate = date;
 const reason = (getExtractedReason(row) ||'').trim();
 if (!SALE_REASONS.has(reason)) return;
 const branch = (row['Branch အမည်'] ||'Unknown').trim();
 const contactNum = (row['Contact Number'] || row['Contact'] || row['Phone'] ||'').toString().trim();
 const customerName = (row['ဝယ်သူ အမည်'] || row['Customer အမည်'] ||'').toString().trim();
 const customer = contactNum || customerName;
 if (!customer) return;
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 let cat: 'dia' |'pt' |'gold16' |'gold15' | null = null;
 if (DIA_SALE_REASONS.has(reason)) cat ='dia';
 else if (PT_SALE_REASONS.has(reason)) cat ='pt';
 else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 if (purity) {
 const goldCat = getGoldPurityCategory(purity);
 if (goldCat ==='၁၆ပဲရည်') cat ='gold16';
 else if (goldCat ==='၁၅ ပဲရည်') cat ='gold15';
 }
 }
 if (!perBranch.has(branch)) perBranch.set(branch, new Map());
 const branchMap = perBranch.get(branch)!;
 const existing = branchMap.get(customer);
 if (existing) {
 existing.total += amount;
 if (cat) existing[cat] += amount;
 if (date && (!existing.lastDate || date > existing.lastDate)) existing.lastDate = date;
 if (cat ==='dia' && date && (!existing.lastDateDia || date > existing.lastDateDia)) existing.lastDateDia = date;
 if (cat ==='pt' && date && (!existing.lastDatePt || date > existing.lastDatePt)) existing.lastDatePt = date;
 if (cat ==='gold16' && date && (!existing.lastDateGold16 || date > existing.lastDateGold16)) existing.lastDateGold16 = date;
 if (cat ==='gold15' && date && (!existing.lastDateGold15 || date > existing.lastDateGold15)) existing.lastDateGold15 = date;
 } else {
 branchMap.set(customer, {
 total: amount,
 lastDate: date,
 dia: cat ==='dia' ? amount : 0,
 pt: cat ==='pt' ? amount : 0,
 gold16: cat ==='gold16' ? amount : 0,
 gold15: cat ==='gold15' ? amount : 0,
 lastDateDia: cat ==='dia' ? date : null,
 lastDatePt: cat ==='pt' ? date : null,
 lastDateGold16: cat ==='gold16' ? date : null,
 lastDateGold15: cat ==='gold15' ? date : null,
 });
 }
 });

 // Second pass: merge by customer name, assign to branch with highest total amount
 const customerBestBranch = new Map<string, { branch: string; amount: number }>();
 perBranch.forEach((branchMap, branch) => {
 branchMap.forEach((agg, customer) => {
 const best = customerBestBranch.get(customer);
 if (!best || agg.total > best.amount) {
 customerBestBranch.set(customer, { branch, amount: agg.total });
 }
 });
 });

 const aggregates = new Map<string, Map<string, CustomerCategoryAgg>>();
 const mergedCustomers = new Map<string, CustomerCategoryAgg>();
 perBranch.forEach((branchMap) => {
 branchMap.forEach((agg, customer) => {
 const existing = mergedCustomers.get(customer);
 if (existing) {
 existing.total += agg.total;
 existing.dia += agg.dia;
 existing.pt += agg.pt;
 existing.gold16 += agg.gold16;
 existing.gold15 += agg.gold15;
 if (agg.lastDate && (!existing.lastDate || agg.lastDate > existing.lastDate)) existing.lastDate = agg.lastDate;
 if (agg.lastDateDia && (!existing.lastDateDia || agg.lastDateDia > existing.lastDateDia)) existing.lastDateDia = agg.lastDateDia;
 if (agg.lastDatePt && (!existing.lastDatePt || agg.lastDatePt > existing.lastDatePt)) existing.lastDatePt = agg.lastDatePt;
 if (agg.lastDateGold16 && (!existing.lastDateGold16 || agg.lastDateGold16 > existing.lastDateGold16)) existing.lastDateGold16 = agg.lastDateGold16;
 if (agg.lastDateGold15 && (!existing.lastDateGold15 || agg.lastDateGold15 > existing.lastDateGold15)) existing.lastDateGold15 = agg.lastDateGold15;
 } else {
 mergedCustomers.set(customer, { ...agg });
 }
 });
 });

 // Place each merged customer into their best branch
 mergedCustomers.forEach((agg, customer) => {
 const best = customerBestBranch.get(customer)!;
 if (!aggregates.has(best.branch)) aggregates.set(best.branch, new Map());
 aggregates.get(best.branch)!.set(customer, agg);
 });

 return { aggregates, latestDate };
};

const getCategoryAmount = (agg: CustomerCategoryAgg, category: 'all' |'dia' |'pt' |'gold16' |'gold15'): number => {
 if (category ==='all') return agg.total;
 return agg[category];
};

const getCategoryLastDate = (agg: CustomerCategoryAgg, category: 'all' |'dia' |'pt' |'gold16' |'gold15'): Date | null => {
 if (category ==='all') return agg.lastDate;
 if (category ==='dia') return agg.lastDateDia;
 if (category ==='pt') return agg.lastDatePt;
 if (category ==='gold16') return agg.lastDateGold16;
 if (category ==='gold15') return agg.lastDateGold15;
 return null;
};

type CategoryBreakdown = {
 cats: readonly string[];
 sale: Record<string, { qty: number; gram: number; amount: number }>;
 rc: Record<string, { qty: number; gram: number; amount: number }>;
 saleTotal: { qty: number; gram: number; amount: number };
 rcTotal: { qty: number; gram: number; amount: number };
};

const buildCategoryBreakdown = (rows: DataRow[]): CategoryBreakdown => {
 const cats = ['Dia','PT','Gold(16)','Gold(15)','Other'] as const;
 const sale: Record<string, { qty: number; gram: number; amount: number }> = {};
 const rc: Record<string, { qty: number; gram: number; amount: number }> = {};
 cats.forEach((c) => { sale[c] = { qty: 0, gram: 0, amount: 0 }; rc[c] = { qty: 0, gram: 0, amount: 0 }; });
 const purityKey = getPurityColumnKey(rows[0]);

 rows.forEach((row) => {
 const reason = (getExtractedReason(row) ||'').trim();
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 const g = parseNumericCell(row['Gram']);

 if (DIA_SALE_REASONS.has(reason)) {
 sale['Dia'].qty += q; sale['Dia'].gram += g; sale['Dia'].amount += amount;
 } else if (PT_SALE_REASONS.has(reason)) {
 sale['PT'].qty += q; sale['PT'].gram += g; sale['PT'].amount += amount;
 } else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const cat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 if (cat ==='၁၆ပဲရည်') { sale['Gold(16)'].qty += q; sale['Gold(16)'].gram += g; sale['Gold(16)'].amount += amount; }
 else { sale['Gold(15)'].qty += q; sale['Gold(15)'].gram += g; sale['Gold(15)'].amount += amount; }
 } else if (SALE_REASONS.has(reason)) {
 sale['Other'].qty += q; sale['Other'].gram += g; sale['Other'].amount += amount;
 }

 if (DIA_RC_REASONS.has(reason)) {
 rc['Dia'].qty += q; rc['Dia'].gram += g; rc['Dia'].amount += amount;
 } else if (PT_RC_REASONS.has(reason)) {
 rc['PT'].qty += q; rc['PT'].gram += g; rc['PT'].amount += amount;
 } else if (GOLD_RC_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const cat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 if (cat ==='၁၆ပဲရည်') { rc['Gold(16)'].qty += q; rc['Gold(16)'].gram += g; rc['Gold(16)'].amount += amount; }
 else { rc['Gold(15)'].qty += q; rc['Gold(15)'].gram += g; rc['Gold(15)'].amount += amount; }
 } else if (RC_REASONS.has(reason)) {
 rc['Other'].qty += q; rc['Other'].gram += g; rc['Other'].amount += amount;
 }
 });

 const saleTotal = { qty: 0, gram: 0, amount: 0 };
 const rcTotal = { qty: 0, gram: 0, amount: 0 };
 cats.forEach((c) => {
 saleTotal.qty += sale[c].qty; saleTotal.gram += sale[c].gram; saleTotal.amount += sale[c].amount;
 rcTotal.qty += rc[c].qty; rcTotal.gram += rc[c].gram; rcTotal.amount += rc[c].amount;
 });

 return { cats, sale, rc, saleTotal, rcTotal };
};

export default function ChairmanView({ data: rawData, allData, selectedMonth, targetSheetData, onCusDetail, selectedBranches = ['All'] }: ChairmanViewProps) {
 const [dashboardMonthMode, setDashboardMonthMode] = useState<'current' |'all'>('current');
 const data = useMemo(() => dashboardMonthMode ==='all' ? (allData || rawData) : rawData, [dashboardMonthMode, rawData, allData]);
 const [shopTargetExpanded, setShopTargetExpanded] = useState(false);
 const [customerRateExpanded, setCustomerRateExpanded] = useState(false);
 const [targetViewMode, setTargetViewMode] = useState<'month' |'day'>('day');
 const [customerViewMode, setCustomerViewMode] = useState<'tier' |'dormant'>('tier');
 const [customerCategory, setCustomerCategory] = useState<'all' |'dia' |'pt' |'gold16' |'gold15'>('all');
 const [customerRateMonthMode, setCustomerRateMonthMode] = useState<'current' |'all'>('all');
 const [breakdownExpanded, setBreakdownExpanded] = useState(false);
 const [breakdownMonthMode, setBreakdownMonthMode] = useState<'current' |'all'>('current');
 const [branchView, setBranchView] = useState<'todaySale' |'todayRc' |'mtdSale' |'mtdRc' | null>(null);
 const [branchSeeAll, setBranchSeeAll] = useState(false);
 const [branchCategoryFilter, setBranchCategoryFilter] = useState<'dia' |'pt' |'gold16' |'gold15' | null>(null);
 const [selectedBranchDetail, setSelectedBranchDetail] = useState<string | null>(null);
 const [dailyRange, setDailyRange] = useState<'1W' |'2W' |'3W' |'4W' |'1M'>('1M');
 const [summaryCategoryFilter, setSummaryCategoryFilter] = useState<'dia' |'pt' |'gold15' |'gold16' | null>(null);
 const [cmReportExpanded, setCmReportExpanded] = useState(false);
 const [cmEverExpanded, setCmEverExpanded] = useState(false);
 const [cmOpenSection, setCmOpenSection] = useState<'full' |'net' |'allBranch' |'itemSale' |'itemRate' |'cusList' | null>(null);
 const [cmReportMonthMode, setCmReportMonthMode] = useState<'current' |'all'>('current');
 const [fullscreenSection, setFullscreenSection] = useState<string | null>(null);

 const matchesCategory = (reason: string, row: DataRow, cat: string) => {
 if (cat ==='all') return SALE_REASONS.has(reason);
 if (cat ==='dia') return DIA_SALE_REASONS.has(reason);
 if (cat ==='pt') return PT_SALE_REASONS.has(reason);
 if (cat ==='gold16' || cat ==='gold15') {
 if (!GOLD_SALE_REASONS.has(reason)) return false;
 const purityKey = getPurityColumnKey(row);
 const purity = getPurityValue(row, purityKey);
 if (!purity) return false;
 const goldCat = getGoldPurityCategory(purity);
 return cat ==='gold16' ? goldCat ==='၁၆ပဲရည်' : goldCat ==='၁၅ ပဲရည်';
 }
 return false;
 };

 const metrics = useMemo(() => {
 let todaySale = 0;
 let diaToday = 0;
 let ptToday = 0;
 let gold16Today = 0;
 let gold15Today = 0;
 let diaYesterday = 0;
 let ptYesterday = 0;
 let gold16Yesterday = 0;
 let gold15Yesterday = 0;
 let mtdSale = 0;
 let rcAmount = 0;
 let todayRc = 0;
 let diaTodayRc = 0;
 let ptTodayRc = 0;
 let gold16TodayRc = 0;
 let gold15TodayRc = 0;
 let diaRc = 0;
 let goldRc = 0;
 let gold16Rc = 0;
 let gold15Rc = 0;
 let ptRc = 0;
 let inventoryValue = 0;
 let deadStock = 0;
 let activeCustomers = 0;
 const customerSaleTotals = new Map<string, number>();
 const branchSaleMap = new Map<string, number>();
 const branchRcMap = new Map<string, number>();
 const todayBranchSaleMap = new Map<string, number>();
 const todayBranchRcMap = new Map<string, number>();
 // Per-category branch maps: key = branch, value = { dia, pt, gold16, gold15 }
 const branchCatSaleMap = new Map<string, Record<string, number>>();
 const branchCatRcMap = new Map<string, Record<string, number>>();
 const branchDayMap = new Map<string, Map<string, { sale: number; rc: number; dia: number; pt: number; gold16: number; gold15: number }>>();
 const todayBranchCatSaleMap = new Map<string, Record<string, number>>();
 const todayBranchCatRcMap = new Map<string, Record<string, number>>();
 const purityKey = getPurityColumnKey(data[0]);
 const ensureCatMap = (map: Map<string, Record<string, number>>, branch: string) => {
 if (!map.has(branch)) map.set(branch, { dia: 0, pt: 0, gold16: 0, gold15: 0 });
 return map.get(branch)!;
 };

 // Use selectedMonth from app state (Sale View flow)
 const activeMonth = selectedMonth && selectedMonth !=='All' ? selectedMonth : null;

 // Find latest date in the filtered data (already month-filtered by App.tsx)
 const latestDate = data.reduce<Date | null>((max, row) => {
 const date = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 return date && (!max || date > max) ? date : max;
 }, null);

 const latestDateStr = latestDate
 ? `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2,'0')}-${String(latestDate.getDate()).padStart(2,'0')}`
 : null;

 // Find yesterday's date string
 const yesterdayDate = latestDate ? new Date(latestDate.getTime() - 86400000) : null;
 const yesterdayDateStr = yesterdayDate
 ? `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`
 : null;

 // Collect unique dates for forecast calculation (Sale View flow)
 const uniqueDates = new Set<string>();

 const activeSet = new Set<string>();
 const rcPurityKey = getPurityColumnKey(data[0]);

 data.forEach((row) => {
 const date = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 if (!date) return;
 const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 uniqueDates.add(dateStr);

 const reason = (getExtractedReason(row) ||'').trim();
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 const contactNum = (row['Contact Number'] || row['Contact'] || row['Phone'] ||'').toString().trim();
 const customerName = (row['ဝယ်သူ အမည်'] || row['Customer အမည်'] ||'').toString().trim();
 const customer = contactNum || customerName;

 // data is already filtered by selectedMonth in App.tsx, so all rows are in the selected month
 if (SALE_REASONS.has(reason)) {
 mtdSale += amount;
 if (dateStr === latestDateStr) {
 todaySale += amount;
 if (DIA_SALE_REASONS.has(reason)) diaToday += amount;
 else if (PT_SALE_REASONS.has(reason)) ptToday += amount;
 else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, rcPurityKey);
 if (purity) {
 const cat = getGoldPurityCategory(purity);
 if (cat ==='၁၆ပဲရည်') gold16Today += amount;
 else if (cat ==='၁၅ ပဲရည်') gold15Today += amount;
 }
 }
 }
 if (yesterdayDateStr && dateStr === yesterdayDateStr) {
 if (DIA_SALE_REASONS.has(reason)) diaYesterday += amount;
 else if (PT_SALE_REASONS.has(reason)) ptYesterday += amount;
 else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, rcPurityKey);
 if (purity) {
 const cat = getGoldPurityCategory(purity);
 if (cat ==='၁၆ပဲရည်') gold16Yesterday += amount;
 else if (cat ==='၁၅ ပဲရည်') gold15Yesterday += amount;
 }
 }
 }
 if (customer) activeSet.add(customer);
 }

 if (DIA_RC_REASONS.has(reason)) {
 rcAmount += amount;
 diaRc += amount;
 if (dateStr === latestDateStr) todayRc += amount;
 if (dateStr === latestDateStr) diaTodayRc += amount;
 } else if (GOLD_RC_REASONS.has(reason)) {
 rcAmount += amount;
 goldRc += amount;
 const purity = getPurityValue(row, rcPurityKey);
 if (purity) {
 const cat = getGoldPurityCategory(purity);
 if (cat ==='၁၆ပဲရည်') gold16Rc += amount;
 else if (cat ==='၁၅ ပဲရည်') gold15Rc += amount;
 if (dateStr === latestDateStr) {
 if (cat ==='၁၆ပဲရည်') gold16TodayRc += amount;
 else if (cat ==='၁၅ ပဲရည်') gold15TodayRc += amount;
 }
 }
 } else if (PT_RC_REASONS.has(reason)) {
 rcAmount += amount;
 ptRc += amount;
 if (dateStr === latestDateStr) { todayRc += amount; ptTodayRc += amount; }
 }

 // Per-branch sale and RC tracking
 const branch = (row['Branch အမည်'] || row['Branch'] ||'Unknown').trim();
 if (!branchDayMap.has(branch)) branchDayMap.set(branch, new Map());
 const dayMap = branchDayMap.get(branch)!;
 if (!dayMap.has(dateStr)) dayMap.set(dateStr, { sale: 0, rc: 0, dia: 0, pt: 0, gold16: 0, gold15: 0 });
 const dayData = dayMap.get(dateStr)!;
 if (SALE_REASONS.has(reason)) {
 dayData.sale += amount;
 if (DIA_SALE_REASONS.has(reason)) dayData.dia += amount;
 else if (PT_SALE_REASONS.has(reason)) dayData.pt += amount;
 else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 if (goldCat ==='၁၆ပဲရည်') dayData.gold16 += amount;
 else dayData.gold15 += amount;
 }
 branchSaleMap.set(branch, (branchSaleMap.get(branch) || 0) + amount);
 if (dateStr === latestDateStr) todayBranchSaleMap.set(branch, (todayBranchSaleMap.get(branch) || 0) + amount);
 // Per-category
 const catSale = ensureCatMap(branchCatSaleMap, branch);
 const catTodaySale = ensureCatMap(todayBranchCatSaleMap, branch);
 if (DIA_SALE_REASONS.has(reason)) {
 catSale.dia += amount;
 if (dateStr === latestDateStr) catTodaySale.dia += amount;
 } else if (PT_SALE_REASONS.has(reason)) {
 catSale.pt += amount;
 if (dateStr === latestDateStr) catTodaySale.pt += amount;
 } else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 if (goldCat ==='၁၆ပဲရည်') {
 catSale.gold16 += amount;
 if (dateStr === latestDateStr) catTodaySale.gold16 += amount;
 } else {
 catSale.gold15 += amount;
 if (dateStr === latestDateStr) catTodaySale.gold15 += amount;
 }
 }
 }
 if (DIA_RC_REASONS.has(reason) || GOLD_RC_REASONS.has(reason) || PT_RC_REASONS.has(reason)) {
 dayData.rc += amount;
 branchRcMap.set(branch, (branchRcMap.get(branch) || 0) + amount);
 if (dateStr === latestDateStr) todayBranchRcMap.set(branch, (todayBranchRcMap.get(branch) || 0) + amount);
 // Per-category
 const catRc = ensureCatMap(branchCatRcMap, branch);
 const catTodayRc = ensureCatMap(todayBranchCatRcMap, branch);
 if (DIA_RC_REASONS.has(reason)) {
 catRc.dia += amount;
 if (dateStr === latestDateStr) catTodayRc.dia += amount;
 } else if (PT_RC_REASONS.has(reason)) {
 catRc.pt += amount;
 if (dateStr === latestDateStr) catTodayRc.pt += amount;
 } else if (GOLD_RC_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 const goldCat = purity ? getGoldPurityCategory(purity) : '၁၅ ပဲရည်';
 if (goldCat ==='၁၆ပဲရည်') {
 catRc.gold16 += amount;
 if (dateStr === latestDateStr) catTodayRc.gold16 += amount;
 } else {
 catRc.gold15 += amount;
 if (dateStr === latestDateStr) catTodayRc.gold15 += amount;
 }
 }
 }

 // Track per-customer total sale amount for VIP/VVIP/CIP categorization
 if (SALE_REASONS.has(reason) && customer) {
 customerSaleTotals.set(customer, (customerSaleTotals.get(customer) || 0) + amount);
 }
 });

 // Use allData for all-month customer categorization (per-branch, same as Customer Rate)
 const branchCustomerTotals = new Map<string, Map<string, number>>();
 let allActiveCount = 0;
 (allData || data).forEach((row) => {
 const reason = (getExtractedReason(row) ||'').trim();
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 const contactNum = (row['Contact Number'] || row['Contact'] || row['Phone'] ||'').toString().trim();
 const customerName = (row['ဝယ်သူ အမည်'] || row['Customer အမည်'] ||'').toString().trim();
 const customer = contactNum || customerName;
 const branch = (row['Branch အမည်'] ||'Unknown').trim();
 if (SALE_REASONS.has(reason)) {
 allActiveCount++;
 if (customer) {
 if (!branchCustomerTotals.has(branch)) branchCustomerTotals.set(branch, new Map());
 const branchMap = branchCustomerTotals.get(branch)!;
 branchMap.set(customer, (branchMap.get(customer) || 0) + amount);
 }
 }
 });

 let vipCustomers = 0;
 let vvipCustomers = 0;
 let cipCustomers = 0;
 let careCustomers = 0;
 branchCustomerTotals.forEach((branchMap) => {
 branchMap.forEach((total) => {
 if (total >= 100_000_000) cipCustomers++;
 else if (total >= 50_000_000) vvipCustomers++;
 else if (total >= 30_000_000) vipCustomers++;
 else careCustomers++;
 });
 });
 activeCustomers = vipCustomers + vvipCustomers + cipCustomers + careCustomers;
 if (!inventoryValue) inventoryValue = 38_000_000_000;
 if (!deadStock) deadStock = 2_700_000_000;

 // Forecast: project month-end total based on current daily pace (Sale View flow)
 // daysElapsed = unique dates with data, daysInMonth from selectedMonth
 const daysElapsed = uniqueDates.size || 1;
 const monthIdx = activeMonth ? MONTHS.indexOf(activeMonth) : (latestDate ? latestDate.getMonth() : -1);
 const currentYear = latestDate ? latestDate.getFullYear() : new Date().getFullYear();
 const daysInMonth = monthIdx >= 0 ? new Date(currentYear, monthIdx + 1, 0).getDate() : 30;
 const forecast = daysInMonth > 0 ? (mtdSale / daysElapsed) * daysInMonth : 0;

 // Per-category MTD sales
 let diaMtd = 0;
 let ptMtd = 0;
 let gold16Mtd = 0;
 let gold15Mtd = 0;

 data.forEach((row) => {
 const reason = (getExtractedReason(row) ||'').trim();
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 if (DIA_SALE_REASONS.has(reason)) {
 diaMtd += amount;
 } else if (PT_SALE_REASONS.has(reason)) {
 ptMtd += amount;
 } else if (GOLD_SALE_REASONS.has(reason)) {
 const purity = getPurityValue(row, purityKey);
 if (!purity) return;
 const cat = getGoldPurityCategory(purity);
 if (cat ==='၁၆ပဲရည်') gold16Mtd += amount;
 else if (cat ==='၁၅ ပဲရည်') gold15Mtd += amount;
 }
 });

 // Target = previous month total sale from allData (unfiltered), default 25B if no data
 const targetMonthIdx = activeMonth ? MONTHS.indexOf(activeMonth) : (latestDate ? latestDate.getMonth() : -1);
 const prevMonth = targetMonthIdx > 0 ? MONTHS[targetMonthIdx - 1] : MONTHS[11];
 let target = 0;
 let diaTarget = 0;
 let ptTarget = 0;
 let gold16Target = 0;
 let gold15Target = 0;
 let rcTarget = 0;
 let diaRcTarget = 0;
 let ptRcTarget = 0;
 let gold16RcTarget = 0;
 let gold15RcTarget = 0;

 const useJulyTarget = selectedMonth ==='July' && targetSheetData;
 const branchSaleTargetMap = new Map<string, number>();
 const branchRcTargetMap = new Map<string, number>();
 const branchCatSaleTargetMap = new Map<string, Record<string, number>>();
 const branchCatRcTargetMap = new Map<string, Record<string, number>>();
 if (useJulyTarget) {
 const activeBranchSet = new Set<string>();
 data.forEach((row) => {
 const branch = row['Branch အမည်'];
 if (branch) activeBranchSet.add(branch);
 });
 let targetSource = targetSheetData.total;
 if (activeBranchSet.size === 1) {
 const branch = Array.from(activeBranchSet)[0];
 const shopTarget = findShopTarget(targetSheetData, branch);
 if (shopTarget) targetSource = shopTarget;
 }
 diaTarget = targetSource.diamond.amount;
 ptTarget = targetSource.pt.amount;
 gold15Target = targetSource.gold15.amount;
 gold16Target = targetSource.gold16.amount;
 target = targetSource.total.amount;
 rcTarget = target * 0.35;
 diaRcTarget = diaTarget * 0.35;
 ptRcTarget = ptTarget * 0.35;
 gold16RcTarget = gold16Target * 0.35;
 gold15RcTarget = gold15Target * 0.35;
 // Build per-branch target maps
 Object.values(targetSheetData!.shops).forEach((s) => {
 branchSaleTargetMap.set(s.shop, s.total.amount);
 branchRcTargetMap.set(s.shop, s.total.amount * 0.35);
 branchCatSaleTargetMap.set(s.shop, { dia: s.diamond.amount, pt: s.pt.amount, gold16: s.gold16.amount, gold15: s.gold15.amount });
 branchCatRcTargetMap.set(s.shop, { dia: s.diamond.amount * 0.35, pt: s.pt.amount * 0.35, gold16: s.gold16.amount * 0.35, gold15: s.gold15.amount * 0.35 });
 });
 } else {
 const targetData = allData || data;
 const targetPurityKey = getPurityColumnKey(targetData[0]);
 targetData.forEach((row) => {
 const date = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 if (!date) return;
 const month = date.toLocaleDateString('en-US', { month: 'long' });
 if (month !== prevMonth) return;
 const reason = (getExtractedReason(row) ||'').trim();
 const amount = parseNumericCell(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ']);
 const branch = (row['Branch အမည်'] ||'Unknown').trim();
 if (!branchCatSaleTargetMap.has(branch)) branchCatSaleTargetMap.set(branch, { dia: 0, pt: 0, gold16: 0, gold15: 0 });
 if (!branchCatRcTargetMap.has(branch)) branchCatRcTargetMap.set(branch, { dia: 0, pt: 0, gold16: 0, gold15: 0 });
 if (DIA_SALE_REASONS.has(reason)) {
 const m = branchCatSaleTargetMap.get(branch)!;
 m.dia += amount;
 diaTarget += amount;
 target += amount;
 } else if (PT_SALE_REASONS.has(reason)) {
 ptTarget += amount;
 target += amount;
 const m = branchCatSaleTargetMap.get(branch)!;
 m.pt += amount;
 } else if (GOLD_SALE_REASONS.has(reason)) {
 target += amount;
 const purity = getPurityValue(row, targetPurityKey);
 if (!purity) return;
 const cat = getGoldPurityCategory(purity);
 const m = branchCatSaleTargetMap.get(branch)!;
 if (cat ==='၁၅ ပဲရည်') { gold15Target += amount; m.gold15 += amount; }
 else if (cat ==='၁၆ပဲရည်') { gold16Target += amount; m.gold16 += amount; }
 }
 if (DIA_RC_REASONS.has(reason)) {
 rcTarget += amount;
 diaRcTarget += amount;
 const m = branchCatRcTargetMap.get(branch)!;
 m.dia += amount;
 } else if (PT_RC_REASONS.has(reason)) {
 rcTarget += amount;
 ptRcTarget += amount;
 const m = branchCatRcTargetMap.get(branch)!;
 m.pt += amount;
 } else if (GOLD_RC_REASONS.has(reason)) {
 rcTarget += amount;
 const purity = getPurityValue(row, targetPurityKey);
 if (purity) {
 const cat = getGoldPurityCategory(purity);
 const m = branchCatRcTargetMap.get(branch)!;
 if (cat ==='၁၆ပဲရည်') { gold16RcTarget += amount; m.gold16 += amount; }
 else if (cat ==='၁၅ ပဲရည်') { gold15RcTarget += amount; m.gold15 += amount; }
 }
 }
 });
 if (!target) target = 25_000_000_000;
 }

 const ach = target > 0 ? (mtdSale / target) * 100 : 0;
 const diaAch = diaTarget > 0 ? (diaMtd / diaTarget) * 100 : 0;
 const ptAch = ptTarget > 0 ? (ptMtd / ptTarget) * 100 : 0;
 const gold16Ach = gold16Target > 0 ? (gold16Mtd / gold16Target) * 100 : 0;
 const gold15Ach = gold15Target > 0 ? (gold15Mtd / gold15Target) * 100 : 0;
 const rcPct = mtdSale > 0 ? (rcAmount / mtdSale) * 100 : 0;
 const diaRcPct = mtdSale > 0 ? (diaRc / mtdSale) * 100 : 0;
 const goldRcPct = mtdSale > 0 ? (goldRc / mtdSale) * 100 : 0;
 const gold16RcPct = mtdSale > 0 ? (gold16Rc / mtdSale) * 100 : 0;
 const gold15RcPct = mtdSale > 0 ? (gold15Rc / mtdSale) * 100 : 0;
 const ptRcPct = mtdSale > 0 ? (ptRc / mtdSale) * 100 : 0;
 const netSale = mtdSale - rcAmount;
 const netPct = mtdSale > 0 ? (netSale / mtdSale) * 100 : 0;
 const diaNetPct = mtdSale > 0 ? ((diaMtd - diaRc) / mtdSale) * 100 : 0;
 const ptNetPct = mtdSale > 0 ? ((ptMtd - ptRc) / mtdSale) * 100 : 0;
 const gold16NetPct = mtdSale > 0 ? ((gold16Mtd - gold16Rc) / mtdSale) * 100 : 0;
 const gold15NetPct = mtdSale > 0 ? ((gold15Mtd - gold15Rc) / mtdSale) * 100 : 0;

 const getTrend = (today: number, yesterday: number): 'up' |'down' |'flat' => {
 if (yesterday === 0) return today > 0 ? 'up' : 'flat';
 const diff = today - yesterday;
 if (diff > 0) return'up';
 if (diff < 0) return'down';
 return'flat';
 };

 return {
 todaySale,
 diaToday, ptToday, gold16Today, gold15Today,
 diaTrend: getTrend(diaToday, diaYesterday),
 ptTrend: getTrend(ptToday, ptYesterday),
 gold16Trend: getTrend(gold16Today, gold16Yesterday),
 gold15Trend: getTrend(gold15Today, gold15Yesterday),
 diaYesterday, ptYesterday, gold16Yesterday, gold15Yesterday,
 mtdSale,
 forecast,
 target,
 ach,
 diaMtd, diaTarget, diaAch,
 ptMtd, ptTarget, ptAch,
 gold16Mtd, gold16Target, gold16Ach,
 gold15Mtd, gold15Target, gold15Ach,
 rcAmount,
 rcPct,
 todayRc,
 diaTodayRc, ptTodayRc, gold16TodayRc, gold15TodayRc,
 rcTarget,
 diaRcTarget, ptRcTarget, gold16RcTarget, gold15RcTarget,
 diaRc, diaRcPct,
 goldRc, goldRcPct,
 gold16Rc, gold16RcPct,
 gold15Rc, gold15RcPct,
 ptRc, ptRcPct,
 netSale, netPct, diaNetPct, ptNetPct, gold16NetPct, gold15NetPct,
 inventoryValue,
 deadStock,
 topBranchSale: [...branchSaleMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
 bottomBranchSale: [...branchSaleMap.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3),
 topBranchRc: [...branchRcMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
 bottomBranchRc: [...branchRcMap.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3),
 todayTopBranchSale: [...todayBranchSaleMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
 todayBottomBranchSale: [...todayBranchSaleMap.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3),
 todayTopBranchRc: [...todayBranchRcMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
 todayBottomBranchRc: [...todayBranchRcMap.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3),
 allBranchSale: [...branchSaleMap.entries()].sort((a, b) => b[1] - a[1]),
 allBranchRc: [...branchRcMap.entries()].sort((a, b) => b[1] - a[1]),
 allTodayBranchSale: [...todayBranchSaleMap.entries()].sort((a, b) => b[1] - a[1]),
 allTodayBranchRc: [...todayBranchRcMap.entries()].sort((a, b) => b[1] - a[1]),
 branchCatSaleMap,
 branchCatRcMap,
 todayBranchCatSaleMap,
 todayBranchCatRcMap,
 branchSaleTargetMap,
 branchRcTargetMap,
 branchCatSaleTargetMap,
 branchCatRcTargetMap,
 branchDayMap,
 vipCustomers,
 vvipCustomers,
 cipCustomers,
 careCustomers,
 activeCustomers,
 };
 }, [data, allData, selectedMonth, targetSheetData]);

 // Precompute per-branch-customer aggregates (heavy allData loop runs once per data change)
 const currentCustomerAggregates = useMemo(() => buildCustomerAggregates(rawData), [rawData]);
 const allCustomerAggregates = useMemo(() => buildCustomerAggregates(allData || []), [allData]);

 // Per-shop customer rate: VIP, VVIP, CIP counts per branch
 const customerRate = useMemo(() => {
 const source = customerRateMonthMode ==='all' ? allCustomerAggregates.aggregates : currentCustomerAggregates.aggregates;
 const branches = Array.from(source.keys()).sort();
 return branches.map((shop) => {
 const customerMap = source.get(shop)!;
 let vip = 0, vvip = 0, cip = 0, care = 0;
 let vipAmount = 0, vvipAmount = 0, cipAmount = 0, careAmount = 0;
 customerMap.forEach((agg) => {
 const total = getCategoryAmount(agg, customerCategory);
 if (total >= 100_000_000) { cip++; cipAmount += total; }
 else if (total >= 50_000_000) { vvip++; vvipAmount += total; }
 else if (total >= 30_000_000) { vip++; vipAmount += total; }
 else { care++; careAmount += total; }
 });
 const total = vip + vvip + cip;
 const totalAmount = vipAmount + vvipAmount + cipAmount + careAmount;
 const tierRatio = care > 0 ? total / care : 0;
 const status: 'critical' |'warning' |'good' = tierRatio >= 0.15 ? 'good' : tierRatio >= 0.10 ? 'warning' : 'critical';
 return { shop, vip, vvip, cip, care, total, status, vipAmount, vvipAmount, cipAmount, careAmount, totalAmount };
 });
 }, [currentCustomerAggregates, allCustomerAggregates, customerCategory, customerRateMonthMode]);

 // Dormant customers: 30/60/90+ days since last purchase per branch
 const dormantRate = useMemo(() => {
 const source = customerRateMonthMode ==='all' ? allCustomerAggregates.aggregates : currentCustomerAggregates.aggregates;
 const latestDate = customerRateMonthMode ==='all' ? allCustomerAggregates.latestDate : currentCustomerAggregates.latestDate;
 const branches = Array.from(source.keys()).sort();
 return branches.map((shop) => {
 const customerMap = source.get(shop)!;
 let active = 0, d30 = 0, d60 = 0, d90 = 0;
 let activeAmt = 0, d30Amt = 0, d60Amt = 0, d90Amt = 0;
 customerMap.forEach((agg, customer) => {
 const catLastDate = getCategoryLastDate(agg, customerCategory);
 if (!latestDate || !catLastDate) return;
 const amt = getCategoryAmount(agg, customerCategory);
 if (customerCategory !=='all' && amt <= 0) return;
 const daysDiff = Math.floor((latestDate.getTime() - catLastDate.getTime()) / 86400000);
 if (daysDiff >= 90) { d90++; d90Amt += amt; }
 else if (daysDiff >= 60) { d60++; d60Amt += amt; }
 else if (daysDiff >= 30) { d30++; d30Amt += amt; }
 else { active++; activeAmt += amt; }
 });
 const totalDormant = d30 + d60 + d90;
 const totalCus = active + d30 + d60 + d90;
 const totalAmt = activeAmt + d30Amt + d60Amt + d90Amt;
 const status: 'critical' |'warning' |'good' = totalDormant === 0 ? 'good' : d90 > 0 ? 'critical' : d60 > 0 ? 'warning' : 'good';
 return { shop, active, d30, d60, d90, totalDormant, totalCus, activeAmt, d30Amt, d60Amt, d90Amt, totalAmt, status };
 });
 }, [currentCustomerAggregates, allCustomerAggregates, customerCategory, customerRateMonthMode]);

 // Per-shop target data for Dia, PT, Gold (16), Gold (15) (same flow as CmView Shop Target)
 const shopTargets = useMemo(() => {
 const activeMonth = selectedMonth && selectedMonth !=='All' ? selectedMonth : null;
 const latestDate = rawData.reduce<Date | null>((max, row) => {
 const date = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 return date && (!max || date > max) ? date : max;
 }, null);
 const prevMonth = activeMonth ? getPreviousMonthName(activeMonth) : (latestDate ? getPreviousMonthName(latestDate.toLocaleDateString('en-US', { month: 'long' })) : MONTHS[11]);

 const targetDataSource = allData || rawData;
 const prevMonthRows = (targetDataSource || []).filter((row) => {
 const rowDate = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 if (!rowDate) return false;
 return rowDate.toLocaleDateString('en-US', { month: 'long' }) === prevMonth;
 });

 const useJulyTarget = selectedMonth ==='July' && targetSheetData;
 const sheetTargetMap = useJulyTarget
 ? {
 diamond: Object.fromEntries(
 Object.values(targetSheetData!.shops).map((s) => [s.shop, s.diamond.amount])
 ),
 pt: Object.fromEntries(
 Object.values(targetSheetData!.shops).map((s) => [s.shop, s.pt.amount])
 ),
 gold15: Object.fromEntries(
 Object.values(targetSheetData!.shops).map((s) => [s.shop, s.gold15.amount])
 ),
 gold16: Object.fromEntries(
 Object.values(targetSheetData!.shops).map((s) => [s.shop, s.gold16.amount])
 ),
 }
 : null;

 // Get all branch names from rawData (month-filtered)
 const branchSet = new Set<string>();
 rawData.forEach((row) => {
 const b = row['Branch အမည်'] ||'Unknown';
 if (b) branchSet.add(b);
 });
 const branches = Array.from(branchSet).sort();

 const result: Record<string, { sale: ShopRow[]; rc: ShopRow[] }> = {};

 const getJulyTarget = (category: 'diamond' |'pt' |'gold15' |'gold16'): Record<string, number> => {
 const map: Record<string, number> = {};
 if (!useJulyTarget) return map;
 branches.forEach((shop) => {
 const shopTarget = findShopTarget(targetSheetData, shop);
 if (shopTarget) {
 map[shop] = shopTarget[category].amount;
 }
 });
 return map;
 };

 const computeRows = (
 todayTargets: Record<string, number>,
 targetMap: Record<string, number>,
 isRc: boolean = false,
 saleTargets?: Record<string, number>
 ): ShopRow[] => {
 const rows: ShopRow[] = [];
 branches.forEach((shop) => {
 const today = todayTargets[shop] || 0;
 const target = targetMap[shop] || 0;
 if (today === 0 && target === 0) return;
 const ratio = target > 0 ? today / target : 0;
 const status: 'critical' |'warning' |'good' = isRc
 ? (ratio <= 1 ? 'good' : ratio <= 1.3 ? 'warning' : 'critical')
 : (ratio >= 1 ? 'good' : ratio >= 0.7 ? 'warning' : 'critical');
 const sale = saleTargets ? saleTargets[shop] || 0 : 0;
 const rcPctOfSale = sale > 0 && isRc ? (today / sale) * 100 : undefined;
 rows.push({ shop, today, target, status, rcPctOfSale });
 });
 return rows;
 };

 // Diamond
 const diamondSaleTargets = getSaleByReason(rawData, DIA_SALE_REASONS);
 const diamondTargets = useJulyTarget ? getJulyTarget('diamond') : getSaleByReason(prevMonthRows, DIA_SALE_REASONS);
 const diamondRcTargets = useJulyTarget
 ? Object.fromEntries(Object.entries(diamondTargets).map(([shop, amount]) => [shop, amount * 0.35]))
 : getRcByReason(prevMonthRows, DIA_RC_REASONS);
 result['Diamond'] = {
 sale: computeRows(
 diamondSaleTargets,
 diamondTargets
 ),
 rc: computeRows(
 getRcByReason(rawData, DIA_RC_REASONS),
 diamondRcTargets,
 true,
 diamondSaleTargets
 ),
 };

 // PT
 const ptSaleTargets = getSaleByReason(rawData, PT_SALE_REASONS);
 const ptTargets = useJulyTarget ? getJulyTarget('pt') : getSaleByReason(prevMonthRows, PT_SALE_REASONS);
 const ptRcTargets = useJulyTarget
 ? Object.fromEntries(Object.entries(ptTargets).map(([shop, amount]) => [shop, amount * 0.35]))
 : getRcByReason(prevMonthRows, PT_RC_REASONS);
 result['PT'] = {
 sale: computeRows(
 ptSaleTargets,
 ptTargets
 ),
 rc: computeRows(
 getRcByReason(rawData, PT_RC_REASONS),
 ptRcTargets,
 true,
 ptSaleTargets
 ),
 };

 // Gold by purity
 (['၁၆ပဲရည်','၁၅ ပဲရည်'] as const).forEach((category) => {
 const categoryKey = category ==='၁၆ပဲရည်' ? 'gold16' : 'gold15';
 const goldSaleTargets = getGoldTargetByPurity(rawData, category);
 const goldTargets = useJulyTarget ? getJulyTarget(categoryKey) : getGoldTargetByPurity(prevMonthRows, category);
 const goldRcTargets = useJulyTarget
 ? Object.fromEntries(Object.entries(goldTargets).map(([shop, amount]) => [shop, amount * 0.35]))
 : getGoldRcByPurity(prevMonthRows, category);
 result[category] = {
 sale: computeRows(
 goldSaleTargets,
 goldTargets
 ),
 rc: computeRows(
 getGoldRcByPurity(rawData, category),
 goldRcTargets,
 true,
 goldSaleTargets
 ),
 };
 });

 return result;
 }, [rawData, allData, selectedMonth, targetSheetData]);

 // Forecast helper for shop targets
 const forecastInfo = useMemo(() => {
 const uniqueDates = new Set<string>();
 rawData.forEach((row) => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 if (dateStr) uniqueDates.add(dateStr);
 });
 const daysElapsed = uniqueDates.size || 1;
 const activeMonth = selectedMonth && selectedMonth !=='All' ? selectedMonth : null;
 const latestDate = rawData.reduce<Date | null>((max, row) => {
 const date = parseSafeDate(row.Date || row.Timestamp?.split(' ')[0]);
 return date && (!max || date > max) ? date : max;
 }, null);
 const monthIdx = activeMonth ? MONTHS.indexOf(activeMonth) : (latestDate ? latestDate.getMonth() : -1);
 const currentYear = latestDate ? latestDate.getFullYear() : new Date().getFullYear();
 const totalDays = monthIdx >= 0 ? new Date(currentYear, monthIdx + 1, 0).getDate() : 30;
 const forecastFactor = totalDays > 0 ? totalDays / daysElapsed : 1;
 return { computeForecast: (today: number) => totalDays > 0 ? today * forecastFactor : 0, totalDays, daysElapsed };
 }, [rawData, selectedMonth]);

 // Sale & RC Breakdown by Category (Dia, PT, Gold16, Gold15) with Qty, Gram, Amount
 const currentBreakdown = useMemo(() => buildCategoryBreakdown(rawData), [rawData]);
 const allBreakdown = useMemo(() => buildCategoryBreakdown(allData || []), [allData]);
 const breakdownByCategory = useMemo(() => breakdownMonthMode ==='all' ? allBreakdown : currentBreakdown, [currentBreakdown, allBreakdown, breakdownMonthMode]);

 const renderCompactAmount = (amount: number) => {
 if (amount === 0) return <span className="text-[#8c8c8c]">-</span>;
 const abs = Math.abs(amount);
 let formatted: string;
 if (abs >= 1_000_000_000) formatted = (amount / 1_000_000_000).toFixed(1).replace(/\.0$/,'') +'B';
 else if (abs >= 1_000_000) formatted = (amount / 1_000_000).toFixed(1).replace(/\.0$/,'') +'M';
 else if (abs >= 1_000) formatted = (amount / 1_000).toFixed(1).replace(/\.0$/,'') +'K';
 else formatted = String(amount);
 return <span>{formatted}</span>;
 };

 const renderOverTarget = (today: number, target: number) => {
 const over = targetViewMode ==='day'
 ? Math.max(0, today - (target * forecastInfo.daysElapsed / forecastInfo.totalDays))
 : Math.max(0, today - target);
 if (over === 0) return <span className="text-[#8c8c8c]">-</span>;
 return <span className="text-rose-600">{renderCompactAmount(over)}</span>;
 };

 const renderSaleGap = (today: number, target: number) => {
 const gap = targetViewMode ==='day'
 ? today - (target * forecastInfo.daysElapsed / forecastInfo.totalDays)
 : today - target;
 if (gap === 0) return <span className="text-[#8c8c8c]">-</span>;
 const cls = gap > 0 ? 'text-emerald-600' : 'text-rose-600';
 return <span className={cls}>{renderCompactAmount(Math.abs(gap))}</span>;
 };

 const catFilter = summaryCategoryFilter;
 const catToday = catFilter ==='dia' ? metrics.diaToday : catFilter ==='pt' ? metrics.ptToday : catFilter ==='gold16' ? metrics.gold16Today : catFilter ==='gold15' ? metrics.gold15Today : metrics.todaySale;
 const catMtd = catFilter ==='dia' ? metrics.diaMtd : catFilter ==='pt' ? metrics.ptMtd : catFilter ==='gold16' ? metrics.gold16Mtd : catFilter ==='gold15' ? metrics.gold15Mtd : metrics.mtdSale;
 const catTarget = catFilter ==='dia' ? metrics.diaTarget : catFilter ==='pt' ? metrics.ptTarget : catFilter ==='gold16' ? metrics.gold16Target : catFilter ==='gold15' ? metrics.gold15Target : metrics.target;
 const catForecast = catFilter ? (metrics.mtdSale > 0 ? catMtd * (metrics.forecast / metrics.mtdSale) : 0) : metrics.forecast;
 const catForecastPct = catTarget > 0 ? (catForecast / catTarget) * 100 : 0;
 const catAch = catFilter ? (catTarget > 0 ? (catMtd / catTarget) * 100 : 0) : metrics.ach;
 const catTodayRc = catFilter ==='dia' ? metrics.diaTodayRc : catFilter ==='pt' ? metrics.ptTodayRc : catFilter ==='gold16' ? metrics.gold16TodayRc : catFilter ==='gold15' ? metrics.gold15TodayRc : metrics.todayRc;
 const catRcAmount = catFilter ==='dia' ? metrics.diaRc : catFilter ==='pt' ? metrics.ptRc : catFilter ==='gold16' ? metrics.gold16Rc : catFilter ==='gold15' ? metrics.gold15Rc : metrics.rcAmount;
 const catRcTarget = catFilter ==='dia' ? metrics.diaRcTarget : catFilter ==='pt' ? metrics.ptRcTarget : catFilter ==='gold16' ? metrics.gold16RcTarget : catFilter ==='gold15' ? metrics.gold15RcTarget : metrics.rcTarget;
 const catRcPct = catFilter ? (catMtd > 0 ? (catRcAmount / catMtd) * 100 : 0) : metrics.rcPct;
 const catNetPct = catFilter ? (catMtd > 0 ? ((catMtd - catRcAmount) / catMtd) * 100 : 0) : metrics.netPct;

 const sections = [
 {
 items: [
 { label: 'TODAY SALE', value: formatCompact(catToday), icon: TrendingUp, color: 'text-[#1677ff]', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: formatCompact(metrics.diaToday), color: 'text-cyan-600', trend: metrics.diaTrend, yesterday: metrics.diaYesterday },
 { label: 'PT', value: formatCompact(metrics.ptToday), color: 'text-[#1677ff]', trend: metrics.ptTrend, yesterday: metrics.ptYesterday },
 { label: 'Gold(16)', value: formatCompact(metrics.gold16Today), color: 'text-amber-600', trend: metrics.gold16Trend, yesterday: metrics.gold16Yesterday },
 { label: 'Gold(15)', value: formatCompact(metrics.gold15Today), color: 'text-amber-600', trend: metrics.gold15Trend, yesterday: metrics.gold15Yesterday },
 ] },
 { label: 'MTD SALE', value: formatCompact(catMtd), icon: TrendingUp, color: 'text-[#1677ff]', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: formatCompact(metrics.diaMtd), color: 'text-cyan-600' },
 { label: 'PT', value: formatCompact(metrics.ptMtd), color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: formatCompact(metrics.gold16Mtd), color: 'text-amber-600' },
 { label: 'Gold(15)', value: formatCompact(metrics.gold15Mtd), color: 'text-amber-600' },
 ] },
 { label: 'TARGET', value: formatCompact(catTarget), icon: Target, color: 'text-amber-600', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: formatCompact(metrics.diaTarget), color: 'text-cyan-600' },
 { label: 'PT', value: formatCompact(metrics.ptTarget), color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: formatCompact(metrics.gold16Target), color: 'text-amber-600' },
 { label: 'Gold(15)', value: formatCompact(metrics.gold15Target), color: 'text-amber-600' },
 ] },
 { label: 'FORECAST', value: formatCompact(catForecast), sub: catTarget > 0 ? `${catForecastPct.toFixed(0)}%` : undefined, icon: TrendingUp, color: 'text-[#1677ff]', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: `${formatCompact(metrics.mtdSale > 0 ? metrics.diaMtd * (metrics.forecast / metrics.mtdSale) : 0)} (${metrics.diaTarget > 0 ? ((metrics.mtdSale > 0 ? metrics.diaMtd * (metrics.forecast / metrics.mtdSale) : 0) / metrics.diaTarget * 100).toFixed(0) : 0}%)`, color: 'text-cyan-600' },
 { label: 'PT', value: `${formatCompact(metrics.mtdSale > 0 ? metrics.ptMtd * (metrics.forecast / metrics.mtdSale) : 0)} (${metrics.ptTarget > 0 ? ((metrics.mtdSale > 0 ? metrics.ptMtd * (metrics.forecast / metrics.mtdSale) : 0) / metrics.ptTarget * 100).toFixed(0) : 0}%)`, color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: `${formatCompact(metrics.mtdSale > 0 ? metrics.gold16Mtd * (metrics.forecast / metrics.mtdSale) : 0)} (${metrics.gold16Target > 0 ? ((metrics.mtdSale > 0 ? metrics.gold16Mtd * (metrics.forecast / metrics.mtdSale) : 0) / metrics.gold16Target * 100).toFixed(0) : 0}%)`, color: 'text-amber-600' },
 { label: 'Gold(15)', value: `${formatCompact(metrics.mtdSale > 0 ? metrics.gold15Mtd * (metrics.forecast / metrics.mtdSale) : 0)} (${metrics.gold15Target > 0 ? ((metrics.mtdSale > 0 ? metrics.gold15Mtd * (metrics.forecast / metrics.mtdSale) : 0) / metrics.gold15Target * 100).toFixed(0) : 0}%)`, color: 'text-amber-600' },
 ] },
 { label: 'ACH %', value: `${catAch.toFixed(0)}%`, icon: Percent, color: 'text-amber-600', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: `${metrics.diaAch.toFixed(0)}%`, color: 'text-cyan-600' },
 { label: 'PT', value: `${metrics.ptAch.toFixed(0)}%`, color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: `${metrics.gold16Ach.toFixed(0)}%`, color: 'text-amber-600' },
 { label: 'Gold(15)', value: `${metrics.gold15Ach.toFixed(0)}%`, color: 'text-amber-600' },
 ] },
 ],
 },
 {
 items: [
 { label: 'TODAY RC', value: formatCompact(catTodayRc), icon: RotateCcw, color: 'text-rose-600', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: formatCompact(metrics.diaTodayRc), color: 'text-cyan-600' },
 { label: 'PT', value: formatCompact(metrics.ptTodayRc), color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: formatCompact(metrics.gold16TodayRc), color: 'text-amber-600' },
 { label: 'Gold(15)', value: formatCompact(metrics.gold15TodayRc), color: 'text-amber-600' },
 ] },
 { label: 'MTD RC', value: formatCompact(catRcAmount), icon: RotateCcw, color: 'text-rose-600', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: formatCompact(metrics.diaRc), color: 'text-cyan-600' },
 { label: 'PT', value: formatCompact(metrics.ptRc), color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: formatCompact(metrics.gold16Rc), color: 'text-amber-600' },
 { label: 'Gold(15)', value: formatCompact(metrics.gold15Rc), color: 'text-amber-600' },
 ] },
 { label: 'RC TARGET', value: formatCompact(catRcTarget), icon: Target, color: 'text-rose-600', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: formatCompact(metrics.diaRcTarget), color: 'text-cyan-600' },
 { label: 'PT', value: formatCompact(metrics.ptRcTarget), color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: formatCompact(metrics.gold16RcTarget), color: 'text-amber-600' },
 { label: 'Gold(15)', value: formatCompact(metrics.gold15RcTarget), color: 'text-amber-600' },
 ] },
 { label: 'RC %', value: `${catRcPct.toFixed(1)}%`, icon: RotateCcw, color: 'text-rose-600', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: `${metrics.diaRcPct.toFixed(1)}%`, color: 'text-cyan-600' },
 { label: 'PT', value: `${metrics.ptRcPct.toFixed(1)}%`, color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: `${metrics.gold16RcPct.toFixed(1)}%`, color: 'text-amber-600' },
 { label: 'Gold(15)', value: `${metrics.gold15RcPct.toFixed(1)}%`, color: 'text-amber-600' },
 ] },
 { label: 'NET %', value: `${catNetPct.toFixed(1)}%`, icon: Percent, color: catNetPct >= 65 ? 'text-emerald-600' : 'text-orange-500', breakdown: catFilter ? undefined : [
 { label: 'Dia', value: `${metrics.diaNetPct.toFixed(1)}%`, color: 'text-cyan-600' },
 { label: 'PT', value: `${metrics.ptNetPct.toFixed(1)}%`, color: 'text-[#1677ff]' },
 { label: 'Gold(16)', value: `${metrics.gold16NetPct.toFixed(1)}%`, color: 'text-amber-600' },
 { label: 'Gold(15)', value: `${metrics.gold15NetPct.toFixed(1)}%`, color: 'text-amber-600' },
 ] },
 ],
 },
 {
 items: [
 { label: 'ACTIVE CUSTOMER', value: metrics.activeCustomers.toLocaleString(), icon: Users, color: 'text-cyan-600', breakdown: [
 { label: 'VVIP', value: `${metrics.vvipCustomers.toLocaleString()} (500-1000L)`, color: 'text-amber-600' },
 { label: 'VIP', value: `${metrics.vipCustomers.toLocaleString()} (300-500L)`, color: 'text-amber-600' },
 { label: 'CIP', value: `${metrics.cipCustomers.toLocaleString()} (1000L+)`, color: 'text-purple-600' },
 { label: 'CARE', value: `${metrics.careCustomers.toLocaleString()} (<300L)`, color: 'text-[#8c8c8c]' },
 ] },
 ],
 },
 ];

 return (
 <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-[#f5f5f5] text-[#262626]">
 {fullscreenSection && (
 <button
 onClick={() => setFullscreenSection(null)}
 className="fixed right-4 top-4 z-[60] rounded-lg border border-[#e8e8e8] bg-[#fafafa] p-2 text-[#262626] shadow-lg hover:bg-[#f0f0f0]"
 title="Exit Full Screen"
 >
 <Minimize2 className="h-5 w-5" />
 </button>
 )}
 <div className="p-4 md:p-5">
 {/* Header */}
 <motion.div
 initial={{ opacity: 0, y: -12 }}
 animate={{ opacity: 1, y: 0 }}
 className="border-b border-[#e8e8e8] pb-4 mb-6"
 >
 <div className="flex items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <Crown className="w-6 h-6 text-amber-600" />
 <h1 className="text-lg md:text-xl font-bold tracking-wide uppercase text-[#262626]">
 29 Jewellery Chairman Dashboard (Home)
 </h1>
 </div>
 <div className="flex items-center gap-1 bg-[#f5f5f5] p-1 rounded-lg border border-[#e8e8e8]">
 {(['current','all'] as const).map((mode) => (
 <button
 key={mode}
 onClick={() => setDashboardMonthMode(mode)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap
 ${dashboardMonthMode === mode
 ? 'bg-emerald-500 text-white shadow-sm'
 : 'text-[#8c8c8c] hover:text-[#595959] hover:bg-[#f5f5f5]'
 }`}
 >
 {mode === 'current' ? 'Current Month' : 'All Month'}
 </button>
 ))}
 </div>
 </div>
 {/* Category Filter Toggles */}
 <div className="flex items-center gap-1.5 mt-3 flex-wrap">
 {([
 { key: 'dia', label: 'Dia' },
 { key: 'pt', label: 'PT' },
 { key: 'gold15', label: 'Gold(15)' },
 { key: 'gold16', label: 'Gold(16)' },
 ] as const).map(({ key, label }) => (
 <button
 key={key}
 onClick={() => setSummaryCategoryFilter(summaryCategoryFilter === key ? null : key)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
 summaryCategoryFilter === key
 ? 'bg-amber-500 text-gray-900 border border-amber-400'
 : 'bg-[#fafafa]/60 text-[#8c8c8c] border border-[#e8e8e8] hover:bg-[#f0f0f0]/60 hover:text-[#595959]'
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 </motion.div>

 {/* Sections */}
 <div className="space-y-1">
 {sections.map((section, sectionIdx) => (
 <motion.div
 key={sectionIdx}
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: sectionIdx * 0.1 }}
 className="border-b border-[#e8e8e8] py-5 md:py-6"
 >
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-5">
 {section.items.map((item, idx) => {
 const branchKey: 'todaySale' |'todayRc' |'mtdSale' |'mtdRc' | null =
 item.label ==='TODAY SALE' ? 'todaySale' :
 item.label ==='TODAY RC' ? 'todayRc' :
 item.label ==='MTD SALE' ? 'mtdSale' :
 item.label ==='MTD RC' ? 'mtdRc' : null;
 return (
 <div key={idx} className={`flex flex-col ${branchKey ? 'cursor-pointer' : ''}`} onClick={() => branchKey && setBranchView(branchView === branchKey ? null : branchKey)}>
 <div className="flex items-center gap-2 mb-2">
 <item.icon className={`w-4 h-4 ${item.color}`} />
 <span className={`text-[10px] md:text-[11px] font-semibold tracking-wider uppercase ${branchKey ? (branchView === branchKey ? 'text-[#262626]' : 'text-[#8c8c8c]') : 'text-[#8c8c8c]'}`}>
 {item.label}
 </span>
 {branchKey && (
 <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${branchView === branchKey ? 'bg-[#e6f4ff] text-[#1677ff]' : 'bg-[#f5f5f5] text-[#8c8c8c]'}`}>TOP/BTM</span>
 )}
 </div>
 <div className="flex items-baseline gap-2">
 <span className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight text-[#262626]">
 {item.value}
 </span>
 {item.sub && (
 <span className="text-base md:text-lg font-semibold tabular-nums text-[#1677ff]">
 {item.sub}
 </span>
 )}
 </div>
 {item.breakdown && (
 <div className="flex flex-col gap-y-0.5 mt-1.5">
 {item.breakdown.map((b, bIdx) => (
 <div key={bIdx} className="flex items-center gap-1">
 <span className="text-[8px] md:text-[9px] font-medium text-[#8c8c8c] uppercase w-14">{b.label}</span>
 <span className={`text-[9px] md:text-[10px] font-semibold tabular-nums ${b.color}`}>{b.value}</span>
 {b.trend && (
 <span className={`flex items-center gap-0.5 text-[8px] md:text-[9px] font-medium ${
 b.trend ==='up' ? 'text-emerald-600' : b.trend ==='down' ? 'text-red-500' : 'text-[#8c8c8c]'
 }`}>
 {b.trend ==='up' && <motion.span key="up" initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}><TrendingUp className="w-3 h-3" /></motion.span>}
 {b.trend ==='down' && <motion.span key="down" initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}><TrendingDown className="w-3 h-3" /></motion.span>}
 {b.trend ==='flat' && <motion.span key="flat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}><Minus className="w-3 h-3" /></motion.span>}
 {b.yesterday != null && b.yesterday > 0 && formatCompact(b.yesterday)}
 </span>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </motion.div>
 ))}
 </div>

 {/* Branch Top/Bottom Panel */}
 {branchView && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="overflow-hidden"
 >
 <div className="mt-2 rounded-xl border border-[#e8e8e8] overflow-hidden" style={{ background: "#ffffff" }}>
 {/* Panel Header */}
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e8e8e8]/50" style={{ background: 'rgba(255,255,255,0.03)' }}>
 <div className="flex items-center gap-3">
 <div className={`w-2 h-2 rounded-full ${branchView ==='todayRc' || branchView ==='mtdRc' ? 'bg-rose-400' : 'bg-emerald-400'} shadow-lg`} style={{ boxShadow: `0 0 8px ${branchView ==='todayRc' || branchView ==='mtdRc' ? '#fb7185' : '#34d399'}` }} />
 <h3 className="text-[13px] font-bold text-[#262626] tracking-wide">
 {branchView ==='todaySale' &&'Today Sale'}
 {branchView ==='todayRc' &&'Today RC'}
 {branchView ==='mtdSale' &&'MTD Sale'}
 {branchView ==='mtdRc' &&'MTD RC'}
 </h3>
 <span className="text-[9px] font-bold uppercase tracking-wide text-[#8c8c8c] border border-[#e8e8e8] px-2 py-0.5 rounded-full">Branch Ranking</span>
 </div>
 <button onClick={() => { setBranchView(null); setBranchSeeAll(false); setBranchCategoryFilter(null); setSelectedBranchDetail(null); }} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#fafafa] hover:bg-[#f0f0f0] text-[#8c8c8c] hover:text-[#262626] text-[11px] transition-all">✕</button>
 </div>

 {/* Category Filter Toggles */}
 <div className="flex items-center gap-1.5 px-5 py-2 border-b border-[#f0f0f0]">
 {([
 { key: 'dia', label: 'Dia' },
 { key: 'pt', label: 'PT' },
 { key: 'gold15', label: 'Gold(15)' },
 { key: 'gold16', label: 'Gold(16)' },
 ] as const).map(({ key, label }) => (
 <button
 key={key}
 onClick={() => setBranchCategoryFilter(branchCategoryFilter === key ? null : key)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
 branchCategoryFilter === key
 ? 'bg-blue-600 text-[#262626] border border-blue-700'
 : 'bg-[#e6f4ff] text-[#1677ff] border border-[#91caff] hover:bg-[#bae0ff]'
 }`}
 >
 {label}
 </button>
 ))}
 </div>

 {/* Panel Body */}
 <div>
 {(() => {
 const isRc = branchView ==='todayRc' || branchView ==='mtdRc';
 const isToday = branchView ==='todaySale' || branchView ==='todayRc';
 const catMap = isToday
 ? (isRc ? metrics.todayBranchCatRcMap : metrics.todayBranchCatSaleMap)
 : (isRc ? metrics.branchCatRcMap : metrics.branchCatSaleMap);
 const filterByCategory = (entries: [string, number][]): [string, number][] => {
 if (!branchCategoryFilter) return entries;
 return entries
 .map(([name]) => [name, (catMap.get(name)?.[branchCategoryFilter] || 0)] as [string, number]);
 };
 const allSortedRaw = isToday
 ? (isRc ? metrics.allTodayBranchRc : metrics.allTodayBranchSale)
 : (isRc ? metrics.allBranchRc : metrics.allBranchSale);
 const allSorted = filterByCategory(allSortedRaw).sort((a, b) => b[1] - a[1]);
 const top = allSorted.slice(0, 3);
 const bottom = [...allSorted].sort((a, b) => a[1] - b[1]).slice(0, 3);
 const showTarget = true;
 const targetMap = isRc ? metrics.branchRcTargetMap : metrics.branchSaleTargetMap;
 const catTargetMap = isRc ? metrics.branchCatRcTargetMap : metrics.branchCatSaleTargetMap;
 const maxVal = Math.max(...allSorted.map(([, v]) => v), 1);

 const rankColors = ['text-amber-600','text-[#8c8c8c]','text-orange-500'];
 const rankBg = ['bg-amber-50 border-amber-500/30','bg-gray-500/10 border-gray-500/20','bg-orange-500/10 border-orange-500/20'];
 const catBarColors: Record<string, string> = { dia: 'bg-cyan-400', pt: 'bg-blue-400', gold16: 'bg-amber-400', gold15: 'bg-yellow-400' };
 const catKeys: ('dia' |'pt' |'gold16' |'gold15')[] = ['dia','pt','gold16','gold15'];

 const BranchCard = ({ entries, isTop }: { entries: [string, number][]; isTop: boolean }) => {
 const accentColor = isTop ? (isRc ? '#fb7185' : '#34d399') : (isRc ? '#fb923c' : '#f87171');
 const accentText = isTop ? (isRc ? 'text-rose-600' : 'text-emerald-600') : (isRc ? 'text-orange-500' : 'text-red-500');
 const barColor = isTop ? (isRc ? 'bg-rose-500/60' : 'bg-emerald-500/60') : (isRc ? 'bg-orange-500/60' : 'bg-red-500/60');
 return (
 <div className="p-4">
 <div className="flex items-center gap-2 mb-3">
 <span style={{ color: accentColor }} className="text-[18px] leading-none">{isTop ? '↑' : '↓'}</span>
 <span className={`text-[11px] font-bold uppercase tracking-wide ${accentText}`}>
 {isTop ? 'Top' : 'Bottom'} {branchSeeAll ? 'All' : '3'}
 </span>
 </div>
 <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
 {entries.map(([name, val], i) => {
 const rawTgt = branchCategoryFilter
 ? (catTargetMap.get(name)?.[branchCategoryFilter] || 0)
 : (targetMap.get(name) || 0);
 const tgt = isToday ? rawTgt / forecastInfo.totalDays : rawTgt * forecastInfo.daysElapsed / forecastInfo.totalDays;
 const achPct = tgt > 0 ? (val / tgt) * 100 : 0;
 const barPct = Math.min((val / maxVal) * 100, 100);
 const valDisplay = val === 0 ? '0' : formatCompact(val);
 const catData = catMap.get(name) || { dia: 0, pt: 0, gold16: 0, gold15: 0 };
 const catValues = catKeys.map((k) => ({ key: k, value: catData[k] || 0 }));
 const catTotal = catValues.reduce((s, c) => s + c.value, 0) || val || 1;
 return (
 <div key={i} className="group">
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <span className={`w-5 h-5 flex items-center justify-center rounded-md text-[9px] font-semibold border ${i < 3 ? rankBg[i] : 'bg-[#fafafa] border-[#f0f0f0]'} ${i < 3 ? rankColors[i] : 'text-[#8c8c8c]'}`}>{i + 1}</span>
 <button
 onClick={() => setSelectedBranchDetail(selectedBranchDetail === name ? null : name)}
 className={`text-[11px] font-semibold truncate max-w-[110px] transition-colors ${selectedBranchDetail === name ? 'text-[#1677ff] underline' : 'text-[#595959] hover:text-[#1677ff]'}`}
 >
 {name}
 </button>
 </div>
 <div className="flex items-center gap-2.5 flex-shrink-0">
 {showTarget && tgt > 0 && (
 <div className="flex items-center gap-1">
 <span className="text-[8px] text-gray-600 uppercase">{isToday ? 'daily tgt' : 'day tgt'}</span>
 <span className="text-[9px] font-semibold tabular-nums text-[#8c8c8c]">{formatCompact(tgt)}</span>
 <span className={`text-[8px] font-bold px-1 py-0.5 rounded tabular-nums ${achPct >= 100 ? 'bg-emerald-50 text-emerald-600' : achPct >= 50 ? 'bg-amber-500/20 text-amber-600' : 'bg-red-500/20 text-red-500'}`}>{achPct.toFixed(0)}%</span>
 </div>
 )}
 {showTarget && tgt > 0 && val === 0 && (
 <span className="text-[8px] font-bold px-1 py-0.5 rounded tabular-nums bg-red-500/20 text-red-500">0%</span>
 )}
 <span className={`text-[12px] font-bold tabular-nums ${val === 0 ? 'text-gray-600' : accentText}`}>{valDisplay}</span>
 </div>
 </div>
 <div className="h-1 bg-[#fafafa] rounded-full overflow-hidden flex">
 {branchCategoryFilter ? (
 <div className={`h-full rounded-full transition-all duration-700 ${catBarColors[branchCategoryFilter] || barColor}`} style={{ width: `${barPct}%` }} />
 ) : (
 catValues.map((c) => {
 if (c.value === 0) return null;
 const segmentPct = (c.value / catTotal) * barPct;
 return (
 <div
 key={c.key}
 className={`h-full ${catBarColors[c.key]} first:rounded-l-full last:rounded-r-full`}
 style={{ width: `${segmentPct}%` }}
 />
 );
 })
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 };

 if (branchSeeAll) {
 return (
 <>
 <BranchCard entries={allSorted} isTop={true} />
 </>
 );
 }

 return (
 <>
 <BranchCard entries={top} isTop={true} />
 </>
 );
 })()}
 </div>
 {/* See more / See less */}
 <div className="px-5 py-2.5 border-t border-[#f0f0f0] flex items-center justify-center">
 <button
 onClick={() => setBranchSeeAll(!branchSeeAll)}
 className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8c8c8c] hover:text-[#262626] transition-colors"
 >
 {branchSeeAll ? 'See less' : 'See more'}
 <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${branchSeeAll ? 'rotate-180' : ''}`} />
 </button>
 </div>
 {/* Daily Breakdown — All Shops (full width) */}
 {(() => {
 const isRc2 = branchView ==='todayRc' || branchView ==='mtdRc';
 const allDates = new Set<string>();
 metrics.branchDayMap.forEach((dm) => dm.forEach((_, d) => allDates.add(d)));
 const allSortedDates = [...allDates].sort((a, b) => a.localeCompare(b));
 const rangeMap: Record<string, [number, number]> = {'1W': [1, 7],'2W': [8, 14],'3W': [15, 21],'4W': [22, 28],'1M': [1, 31] };
 const [dayFrom, dayTo] = rangeMap[dailyRange];
 const maxDays = dayTo - dayFrom + 1;
 const sortedDates = allSortedDates.filter((d) => {
 const dayNum = parseInt(d.slice(8), 10);
 return dayNum >= dayFrom && dayNum <= dayTo;
 });
 const allBranches2 = [...metrics.branchDayMap.keys()].sort((a, b) => {
 const sumBranch = (name: string) => {
 const dm = metrics.branchDayMap.get(name);
 if (!dm) return 0;
 let s = 0;
 sortedDates.forEach((d) => {
 const dd = dm.get(d);
 if (dd) s += branchCategoryFilter ? (dd[branchCategoryFilter] || 0) : (isRc2 ? dd.rc : dd.sale);
 });
 return s;
 };
 return sumBranch(b) - sumBranch(a);
 });
 const getDailyTgt = (branch: string) => {
 const raw = branchCategoryFilter
 ? (isRc2 ? metrics.branchCatRcTargetMap.get(branch)?.[branchCategoryFilter] : metrics.branchCatSaleTargetMap.get(branch)?.[branchCategoryFilter]) || 0
 : (isRc2 ? (metrics.branchRcTargetMap.get(branch) || 0) : (metrics.branchSaleTargetMap.get(branch) || 0));
 return raw / forecastInfo.totalDays;
 };
 return (
 <div className="border-t border-[#f0f0f0] px-5 py-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="flex items-center gap-2">
 <span className="text-[18px] leading-none">📅</span>
 <span className="text-[12px] font-bold uppercase tracking-wide text-[#8c8c8c]">Daily Breakdown — All Shops</span>
 <span className="text-[9px] text-gray-600">({sortedDates.length} days · {allBranches2.length} shops)</span>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 {([
 { key: null, label: 'All' },
 { key: 'dia', label: 'Dia' },
 { key: 'pt', label: 'PT' },
 { key: 'gold15', label: 'Gold(15)' },
 { key: 'gold16', label: 'Gold(16)' },
 ] as const).map(({ key, label }) => (
 <button
 key={label}
 onClick={() => setBranchCategoryFilter(key)}
 className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
 branchCategoryFilter === key
 ? 'bg-blue-600 text-[#262626] border border-blue-700'
 : 'bg-[#e6f4ff] text-[#1677ff] border border-[#91caff] hover:bg-[#bae0ff]'
 }`}
 >
 {label}
 </button>
 ))}
 <div className="w-px h-4 bg-[#f0f0f0]/60" />
 {(['1W','2W','3W','4W','1M'] as const).map((r) => (
 <button
 key={r}
 onClick={() => setDailyRange(r)}
 className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
 dailyRange === r
 ? 'bg-blue-600 text-[#262626] border border-blue-700'
 : 'bg-[#e6f4ff] text-[#1677ff] border border-[#91caff] hover:bg-[#bae0ff]'
 }`}
 >
 {r}
 </button>
 ))}
 </div>
 </div>
 <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-lg border border-[#e8e8e8]">
 <table className="w-full text-sm border-collapse" style={{ minWidth: `${Math.max(sortedDates.length * 60 + 300, 100)}px`, tableLayout: 'fixed' }}>
 <colgroup>
 <col style={{ width: '160px' }} />
 {sortedDates.map((d) => (
 <col key={d} />
 ))}
 <col style={{ width: '90px' }} />
 <col style={{ width: '80px' }} />
 <col style={{ width: '70px' }} />
 </colgroup>
 <thead className="sticky top-0 bg-white z-10">
 <tr>
 <th className="py-2 px-3 text-left text-[10px] font-bold text-[#8c8c8c] uppercase sticky left-0 bg-white border-b border-[#e8e8e8]">Shop</th>
 {sortedDates.map((d) => (
 <th key={d} className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase whitespace-nowrap border-b border-[#e8e8e8]">{d.slice(8)}</th>
 ))}
 <th className="py-2 px-3 text-right text-[10px] font-bold text-[#8c8c8c] uppercase border-b border-[#e8e8e8] bg-[#fafafa]">Total</th>
 <th className="py-2 px-3 text-right text-[10px] font-bold text-[#8c8c8c] uppercase border-b border-[#e8e8e8] bg-[#fafafa]">Tgt</th>
 <th className="py-2 px-3 text-right text-[10px] font-bold text-[#8c8c8c] uppercase border-b border-[#e8e8e8] bg-[#fafafa]">Ach</th>
 </tr>
 </thead>
 <tbody>
 {allBranches2.map((branch) => {
 const dm = metrics.branchDayMap.get(branch)!;
 const dailyTgt = getDailyTgt(branch);
 let totalSale = 0;
 return (
 <tr key={branch} className={`border-b border-[#f0f0f0] hover:bg-[#fafafa] ${selectedBranchDetail === branch ? 'bg-[#e6f4ff]' : ''}`}>
 <td className="py-2 px-3 text-[11px] font-semibold text-[#595959] whitespace-nowrap sticky left-0 bg-[#fafafa]/90">{branch}</td>
 {sortedDates.map((d) => {
 const dd = dm.get(d);
 const val = dd ? (branchCategoryFilter ? (dd[branchCategoryFilter] || 0) : (isRc2 ? dd.rc : dd.sale)) : 0;
 totalSale += val;
 return (
 <td key={d} className={`py-2 px-2 text-[10px] text-right tabular-nums whitespace-nowrap ${val === 0 ? 'text-[#8c8c8c]' : isRc2 ? 'text-rose-600/80' : 'text-emerald-600/80'}`}>{val === 0 ? '—' : formatCompact(val)}</td>
 );
 })}
 <td className={`py-2 px-3 text-[11px] font-bold text-right tabular-nums bg-[#fafafa]/30 ${isRc2 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCompact(totalSale)}</td>
 <td className="py-2 px-3 text-[10px] text-[#8c8c8c] text-right tabular-nums bg-[#fafafa]/30">{formatCompact(dailyTgt * maxDays)}</td>
 <td className={`py-2 px-3 text-[10px] font-bold text-right tabular-nums bg-[#fafafa]/30 ${dailyTgt * maxDays > 0 && totalSale / (dailyTgt * maxDays) * 100 >= 100 ? 'text-emerald-600' : dailyTgt * maxDays > 0 && totalSale / (dailyTgt * maxDays) * 100 >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{dailyTgt * maxDays > 0 ? (totalSale / (dailyTgt * maxDays) * 100).toFixed(0) +'%' : '—'}</td>
 </tr>
 );
 })}
 {(() => {
 const grandTotals = sortedDates.map((d) => {
 let t = 0;
 metrics.branchDayMap.forEach((dm) => {
 const dd = dm.get(d);
 if (dd) t += branchCategoryFilter ? (dd[branchCategoryFilter] || 0) : (isRc2 ? dd.rc : dd.sale);
 });
 return t;
 });
 const grandTotal = grandTotals.reduce((s, v) => s + v, 0);
 const totalTgtRaw = branchCategoryFilter
 ? allBranches2.reduce((s, b) => s + (isRc2 ? metrics.branchCatRcTargetMap.get(b)?.[branchCategoryFilter] : metrics.branchCatSaleTargetMap.get(b)?.[branchCategoryFilter]) || 0, 0)
 : allBranches2.reduce((s, b) => s + (isRc2 ? (metrics.branchRcTargetMap.get(b) || 0) : (metrics.branchSaleTargetMap.get(b) || 0)), 0);
 const totalTgt = totalTgtRaw / forecastInfo.totalDays * maxDays;
 return (
 <tr className="border-t-2 border-[#e8e8e8] bg-[#fafafa] sticky bottom-0">
 <td className="py-2 px-3 text-[11px] font-bold text-[#262626] sticky left-0 bg-[#fafafa]/90">Total</td>
 {grandTotals.map((t, i) => (
 <td key={i} className={`py-2 px-2 text-[10px] font-bold text-right tabular-nums ${t === 0 ? 'text-[#8c8c8c]' : isRc2 ? 'text-rose-600' : 'text-emerald-600'}`}>{t === 0 ? '—' : formatCompact(t)}</td>
 ))}
 <td className={`py-2 px-3 text-[11px] font-bold text-right tabular-nums bg-[#fafafa] ${isRc2 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCompact(grandTotal)}</td>
 <td className="py-2 px-3 text-[10px] font-bold text-[#8c8c8c] text-right tabular-nums bg-[#fafafa]">{formatCompact(totalTgt)}</td>
 <td className={`py-2 px-3 text-[10px] font-bold text-right tabular-nums bg-[#fafafa] ${totalTgt > 0 && grandTotal / totalTgt * 100 >= 100 ? 'text-emerald-600' : totalTgt > 0 && grandTotal / totalTgt * 100 >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{totalTgt > 0 ? (grandTotal / totalTgt * 100).toFixed(0) +'%' : '—'}</td>
 </tr>
 );
 })()}
 </tbody>
 </table>
 </div>
 </div>
 );
 })()}
 </div>
 </motion.div>
 )}

 {/* Sale & RC Breakdown By Category */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.35 }}
 className={`pt-2 ${fullscreenSection ==='breakdown' ? 'fixed inset-0 z-50 bg-[#f5f5f5] overflow-auto p-4' : ''}`}
 >
 <div className="w-full flex items-center justify-between px-4 py-3.5 bg-[#fafafa] rounded-xl border border-[#e8e8e8] hover:border-[#d9d9d9] transition-all hover:shadow-lg">
 <button
 onClick={() => setBreakdownExpanded(!breakdownExpanded)}
 className="flex items-center gap-3 flex-1"
 >
 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#e6f4ff] border border-[#91caff]">
 <TrendingUp className="w-4 h-4 text-[#1677ff]" />
 </span>
 <span className="flex items-center gap-2.5">
 <h2 className="text-[14px] font-bold text-[#262626] tracking-tight">Sale &amp; RC Breakdown</h2>
 <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#e6f4ff] text-[#1677ff] border border-[#91caff]">By Category</span>
 </span>
 <ChevronDown className={`w-4 h-4 text-[#8c8c8c] transition-transform duration-300 ${breakdownExpanded ? 'rotate-180' : ''}`} />
 </button>
 <button
 onClick={() => setFullscreenSection(fullscreenSection ==='breakdown' ? null : 'breakdown')}
 className="flex items-center justify-center p-2 bg-[#fafafa] text-[#262626] hover:bg-[#f0f0f0] rounded-lg transition-all border border-[#e8e8e8]"
 title="Full Screen"
 >
 {fullscreenSection ==='breakdown' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 {breakdownExpanded && (
 <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-lg p-0.5">
 {([
 { key: 'current', label: 'Current Month' },
 { key: 'all', label: 'All Month' },
 ] as const).map((m) => (
 <button
 key={m.key}
 onClick={() => setBreakdownMonthMode(m.key)}
 className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors ${
 breakdownMonthMode === m.key ? 'bg-[#f0f0f0] text-[#262626]' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 {m.label}
 </button>
 ))}
 </div>
 )}
 </div>
 <div
 className={`overflow-hidden transition-all duration-300 ease-in-out ${
 breakdownExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
 }`}
 >
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="overflow-x-auto max-h-[500px]">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10 bg-[#fafafa]">
 <tr>
 <th rowSpan={2} className="py-2 px-4 text-left text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider align-bottom">Category</th>
 <th colSpan={3} className="py-1 px-2 text-center text-[9px] font-bold text-[#1677ff] uppercase tracking-wider border-b border-blue-400/20">Sale</th>
 <th colSpan={3} className="py-1 px-2 text-center text-[9px] font-bold text-rose-600 uppercase tracking-wider border-b border-rose-400/20">RC</th>
 <th rowSpan={2} className="py-2 px-2 text-right text-[9px] font-semibold text-emerald-600/70 uppercase tracking-wider align-bottom">Net Amt</th>
 </tr>
 <tr>
 <th className="py-1 px-2 text-right text-[8px] font-semibold text-[#1677ff]/60 uppercase tracking-wider">Qty</th>
 <th className="py-1 px-2 text-right text-[8px] font-semibold text-[#1677ff]/60 uppercase tracking-wider">Gram</th>
 <th className="py-1 px-2 text-right text-[8px] font-semibold text-[#1677ff]/60 uppercase tracking-wider">Amount</th>
 <th className="py-1 px-2 text-right text-[8px] font-semibold text-rose-600/60 uppercase tracking-wider">Qty</th>
 <th className="py-1 px-2 text-right text-[8px] font-semibold text-rose-600/60 uppercase tracking-wider">Gram</th>
 <th className="py-1 px-2 text-right text-[8px] font-semibold text-rose-600/60 uppercase tracking-wider">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#f0f0f0]">
 {breakdownByCategory.cats.map((cat) => {
 const s = breakdownByCategory.sale[cat];
 const r = breakdownByCategory.rc[cat];
 const net = s.amount - r.amount;
 const catColor = cat ==='Dia' ? 'text-cyan-600' : cat ==='PT' ? 'text-[#1677ff]' : cat ==='Gold(16)' ? 'text-amber-600' : cat ==='Gold(15)' ? 'text-amber-600' : 'text-[#8c8c8c]';
 return (
 <tr key={cat} className="hover:bg-[#fafafa] transition-colors">
 <td className={`py-2 px-4 text-[11px] font-medium ${catColor}`}>{cat}</td>
 <td className="py-2 px-2 text-[11px] text-[#1677ff]/70 text-right tabular-nums">{s.qty.toLocaleString()}</td>
 <td className="py-2 px-2 text-[11px] text-[#1677ff]/50 text-right tabular-nums">{s.gram.toFixed(1)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-[#1677ff] text-right tabular-nums">{formatCompact(s.amount)}</td>
 <td className="py-2 px-2 text-[11px] text-rose-600/70 text-right tabular-nums">{r.qty.toLocaleString()}</td>
 <td className="py-2 px-2 text-[11px] text-rose-600/50 text-right tabular-nums">{r.gram.toFixed(1)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-rose-600 text-right tabular-nums">{formatCompact(r.amount)}</td>
 <td className={`py-2 px-2 text-[11px] font-medium text-right tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCompact(net)}</td>
 </tr>
 );
 })}
 <tr className="border-t-2 border-[#e8e8e8]">
 <td className="py-2 px-4 text-[11px] font-bold text-[#262626]">Total</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#1677ff]/70 text-right tabular-nums">{breakdownByCategory.saleTotal.qty.toLocaleString()}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#1677ff]/50 text-right tabular-nums">{breakdownByCategory.saleTotal.gram.toFixed(1)}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#1677ff] text-right tabular-nums">{formatCompact(breakdownByCategory.saleTotal.amount)}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-rose-600/70 text-right tabular-nums">{breakdownByCategory.rcTotal.qty.toLocaleString()}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-rose-600/50 text-right tabular-nums">{breakdownByCategory.rcTotal.gram.toFixed(1)}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-rose-600 text-right tabular-nums">{formatCompact(breakdownByCategory.rcTotal.amount)}</td>
 <td className={`py-2 px-2 text-[11px] font-bold text-right tabular-nums ${(breakdownByCategory.saleTotal.amount - breakdownByCategory.rcTotal.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCompact(breakdownByCategory.saleTotal.amount - breakdownByCategory.rcTotal.amount)}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </motion.div>

 {/* Shop Target - Gold (16) & Gold (15) per-shop breakdown */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className={`pt-2 ${fullscreenSection ==='shopTarget' ? 'fixed inset-0 z-50 bg-[#f5f5f5] overflow-auto p-4' : ''}`}
 >
 <div className="w-full flex items-center justify-between px-4 py-3.5 bg-[#fafafa] rounded-xl border border-[#e8e8e8] hover:border-[#d9d9d9] transition-all hover:shadow-lg">
 <button
 onClick={() => setShopTargetExpanded(!shopTargetExpanded)}
 className="flex items-center gap-3 flex-1"
 >
 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 border border-amber-200">
 <Target className="w-4 h-4 text-amber-600" />
 </span>
 <span className="flex items-center gap-2.5">
 <h2 className="text-[14px] font-bold text-[#262626] tracking-tight">Shop Target</h2>
 <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">View Detail</span>
 </span>
 <ChevronDown className={`w-4 h-4 text-[#8c8c8c] transition-transform duration-300 ${shopTargetExpanded ? 'rotate-180' : ''}`} />
 </button>
 <button
 onClick={() => setFullscreenSection(fullscreenSection ==='shopTarget' ? null : 'shopTarget')}
 className="flex items-center justify-center p-2 bg-[#fafafa] text-[#262626] hover:bg-[#f0f0f0] rounded-lg transition-all border border-[#e8e8e8]"
 title="Full Screen"
 >
 {fullscreenSection ==='shopTarget' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 {shopTargetExpanded && (
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-lg p-0.5">
 {([
 { key: 'month', label: 'Month' },
 { key: 'day', label: 'Day' },
 ] as const).map((m) => (
 <button
 key={m.key}
 onClick={(e) => { e.stopPropagation(); setTargetViewMode(m.key); }}
 className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors ${
 targetViewMode === m.key ? 'bg-[#f0f0f0] text-[#262626]' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 {m.label}
 </button>
 ))}
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 const wb = XLSX.utils.book_new();
 const cats = ['Diamond','PT','၁၆ပဲရည်','၁၅ ပဲရည်'] as const;
 const fmtComma ='#,##0';
 const applyFmt = (ws: XLSX.WorkSheet, aoa: (string | number)[][], cols: string[], startRow: number) => {
 cols.forEach((col) => {
 for (let r = startRow; r < aoa.length; r++) {
 const cellRef = XLSX.utils.encode_cell({ r, c: col.charCodeAt(0) - 65 });
 const cell = ws[cellRef];
 if (cell && typeof cell.v ==='number') {
 cell.t ='n';
 cell.z = fmtComma;
 }
 }
 });
 };
 const buildSection = (aoa: (string | number)[][], saleRows: ShopRow[], rcRows: ShopRow[], mode: 'month' |'day') => {
 const maxLen = Math.max(saleRows.length, rcRows.length);
 const tgtLabel = mode ==='day' ? 'Day Target' : 'MTD Target';
 const startRow = aoa.length;
 aoa.push([`=== ${mode ==='day' ? 'Day View' : 'Month View'} ===`]);
 aoa.push(['Shop','Sale MTD', `Sale ${tgtLabel}`,'Sale Gap','Sale Status','','Shop','RC MTD', `RC ${tgtLabel}`,'RC Over','RC Status']);
 for (let i = 0; i < maxLen; i++) {
 const sr = saleRows[i];
 const rr = rcRows[i];
 const sRow: (string | number)[] = [];
 if (sr) {
 const sTgt = mode ==='day' ? sr.target * forecastInfo.daysElapsed / forecastInfo.totalDays : sr.target;
 const sGap = sr.today - sTgt;
 const sRatio = sTgt > 0 ? sr.today / sTgt : 0;
 const sStatus = sRatio >= 1 ? 'Good' : sRatio >= 0.7 ? 'Warning' : 'Critical';
 sRow.push(sr.shop, sr.today, sTgt, sGap, sStatus);
 } else {
 sRow.push('','','','','');
 }
 sRow.push('');
 if (rr) {
 const rTgt = mode ==='day' ? rr.target * forecastInfo.daysElapsed / forecastInfo.totalDays : rr.target;
 const rOver = Math.max(0, rr.today - rTgt);
 const rRatio = rTgt > 0 ? rr.today / rTgt : 0;
 const rStatus = rRatio <= 1 ? 'Good' : rRatio <= 1.3 ? 'Warning' : 'Critical';
 sRow.push(rr.shop, rr.today, rTgt, rOver, rStatus);
 } else {
 sRow.push('','','','','');
 }
 aoa.push(sRow);
 }
 if (maxLen > 0) {
 const sTotal = saleRows.reduce((s, r) => s + r.today, 0);
 const sTgtTotal = mode ==='day' ? saleRows.reduce((s, r) => s + r.target, 0) * forecastInfo.daysElapsed / forecastInfo.totalDays : saleRows.reduce((s, r) => s + r.target, 0);
 const rTotal = rcRows.reduce((s, r) => s + r.today, 0);
 const rTgtTotal = mode ==='day' ? rcRows.reduce((s, r) => s + r.target, 0) * forecastInfo.daysElapsed / forecastInfo.totalDays : rcRows.reduce((s, r) => s + r.target, 0);
 aoa.push(['Total', sTotal, sTgtTotal, sTotal - sTgtTotal,'','','Total', rTotal, rTgtTotal, Math.max(0, rTotal - rTgtTotal),'']);
 }
 aoa.push([]);
 return startRow;
 };
 cats.forEach((cat) => {
 const catData = shopTargets[cat] || { sale: [], rc: [] };
 const saleRows = catData.sale;
 const rcRows = catData.rc;
 const aoa: (string | number)[][] = [];
 const monthStart = buildSection(aoa, saleRows, rcRows,'month');
 const ws = XLSX.utils.aoa_to_sheet(aoa);
 applyFmt(ws, aoa, ['B','C','D','H','I','J'], monthStart + 2);
 const dayStart = buildSection(aoa, saleRows, rcRows,'day');
 const ws2 = XLSX.utils.aoa_to_sheet(aoa);
 applyFmt(ws2, aoa, ['B','C','D','H','I','J'], dayStart + 2);
 const sheetName = cat.substring(0, 31);
 XLSX.utils.book_append_sheet(wb, ws2, sheetName);
 });
 const safeMonth = (selectedMonth ||'All').replace(/\s+/g,'_');
 XLSX.writeFile(wb, `Shop_Target_${safeMonth}.xlsx`);
 }}
 className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-200 transition-colors"
 >
 <Download className="w-3.5 h-3.5" />
 Export Excel
 </button>
 </div>
 )}
 </div>
 <div
 className={`overflow-hidden transition-all duration-300 ease-in-out ${
 shopTargetExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
 }`}
 >
 <div className="space-y-3">
 {(['Diamond','PT','၁၆ပဲရည်','၁၅ ပဲရည်'] as const).map((cat) => {
 const catData = shopTargets[cat] || { sale: [], rc: [] };
 const table = (rows: ShopRow[], label: 'Sale' |'RC') => (
 <div className="flex-1 bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 <div className="px-4 py-2.5 border-b border-[#e8e8e8] bg-[#fafafa]/60 flex items-center justify-between">
 <h3 className="text-[12px] font-bold text-[#595959]">{cat}</h3>
 <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${label ==='Sale' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>{label}</span>
 </div>
 <div className="overflow-x-auto max-h-[400px]">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10 bg-[#fafafa]">
 <tr>
 <th className="py-2 px-4 text-left text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Shop</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">MTD</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">{targetViewMode ==='day' ? 'Day Target' : 'MTD Target'}</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">{label ==='RC' ? (targetViewMode ==='day' ? 'Over Day' : 'Over Target') : (targetViewMode ==='day' ? 'Gap' : 'FC Gap')}</th>
 <th className="py-2 px-4 text-center text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#f0f0f0]">
 {rows.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-8 px-4 text-center text-[11px] text-gray-600">No data</td>
 </tr>
 ) : (
 <>
 {rows.map((row) => (
 <tr key={row.shop} className="hover:bg-[#fafafa] transition-colors">
 <td className="py-2 px-4 text-[11px] font-medium text-[#8c8c8c]">{row.shop}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-[#262626] text-right tabular-nums">{renderCompactAmount(row.today)}</td>
 <td className="py-2 px-2 text-[11px] text-[#8c8c8c] text-right tabular-nums">{renderCompactAmount(targetViewMode ==='day' ? row.target * forecastInfo.daysElapsed / forecastInfo.totalDays : row.target)}</td>
 <td className="py-2 px-2 text-[11px] text-right tabular-nums">{label ==='RC' ? renderOverTarget(row.today, row.target) : renderSaleGap(row.today, row.target)}</td>
 <td className="py-2 px-4 text-center">
 {(() => {
 const dayRatio = targetViewMode ==='day' && row.target > 0
 ? row.today / (row.target * forecastInfo.daysElapsed / forecastInfo.totalDays)
 : row.target > 0 ? row.today / row.target : 0;
 const isRc = label ==='RC';
 const dayStatus: 'critical' |'warning' |'good' = isRc
 ? (dayRatio <= 1 ? 'good' : dayRatio <= 1.3 ? 'warning' : 'critical')
 : (dayRatio >= 1 ? 'good' : dayRatio >= 0.7 ? 'warning' : 'critical');
 return (
 <span className={`status-pill status-pill--${dayStatus}`}>
 <span className={`status-pill__dot ${dayStatus ==='good' ? '' : 'status-pill__dot--pulse'}`}></span>
 {dayStatus ==='good' &&'Good'}
 {dayStatus ==='warning' &&'Warning'}
 {dayStatus ==='critical' &&'Critical'}
 </span>
 );
 })()}
 </td>
 </tr>
 ))}
 <tr className="border-t-2 border-[#e8e8e8]">
 <td className="py-2 px-4 text-[11px] font-bold text-[#262626]">Total</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#262626] text-right tabular-nums">{renderCompactAmount(rows.reduce((sum, row) => sum + row.today, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#262626] text-right tabular-nums">{renderCompactAmount(targetViewMode ==='day' ? rows.reduce((sum, row) => sum + row.target, 0) * forecastInfo.daysElapsed / forecastInfo.totalDays : rows.reduce((sum, row) => sum + row.target, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-right tabular-nums">{label ==='RC' ? renderOverTarget(rows.reduce((s, r) => s + r.today, 0), rows.reduce((s, r) => s + r.target, 0)) : renderSaleGap(rows.reduce((s, r) => s + r.today, 0), rows.reduce((s, r) => s + r.target, 0))}</td>
 <td className="py-2 px-4" />
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
 return (
 <div key={cat} className="flex flex-col lg:flex-row gap-3">
 {table(catData.sale,'Sale')}
 {table(catData.rc,'RC')}
 </div>
 );
 })}
 </div>
 </div>
 </motion.div>

 {/* Customer Rate - per-branch VIP/VVIP/CIP breakdown */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.45 }}
 className={`pt-2 ${fullscreenSection ==='customerRate' ? 'fixed inset-0 z-50 bg-[#f5f5f5] overflow-auto p-4' : ''}`}
 >
 <div className="w-full flex items-center justify-between px-4 py-3.5 bg-[#fafafa] rounded-xl border border-[#e8e8e8] hover:border-[#d9d9d9] transition-all hover:shadow-lg">
 <button
 onClick={() => setCustomerRateExpanded(!customerRateExpanded)}
 className="flex items-center gap-3 flex-1"
 >
 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 border border-purple-200">
 <Users className="w-4 h-4 text-purple-600" />
 </span>
 <span className="flex items-center gap-2.5">
 <h2 className="text-[14px] font-bold text-[#262626] tracking-tight">Customer Rate</h2>
 <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200">View Detail</span>
 </span>
 <ChevronDown className={`w-4 h-4 text-[#8c8c8c] transition-transform duration-300 ${customerRateExpanded ? 'rotate-180' : ''}`} />
 </button>
 <button
 onClick={() => setFullscreenSection(fullscreenSection ==='customerRate' ? null : 'customerRate')}
 className="flex items-center justify-center p-2 bg-[#fafafa] text-[#262626] hover:bg-[#f0f0f0] rounded-lg transition-all border border-[#e8e8e8]"
 title="Full Screen"
 >
 {fullscreenSection ==='customerRate' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
 </button>
 {customerRateExpanded && (
 <div className="flex items-center gap-2 flex-wrap">
 <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-lg p-0.5">
 {([
 { key: 'current', label: 'Current Month' },
 { key: 'all', label: 'All Month' },
 ] as const).map((m) => (
 <button
 key={m.key}
 onClick={() => setCustomerRateMonthMode(m.key)}
 className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors ${
 customerRateMonthMode === m.key ? 'bg-[#f0f0f0] text-[#262626]' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 {m.label}
 </button>
 ))}
 </div>
 <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-lg p-0.5">
 <button
 onClick={() => setCustomerViewMode('tier')}
 className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors ${
 customerViewMode ==='tier' ? 'bg-[#f0f0f0] text-[#262626]' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 Tier
 </button>
 <button
 onClick={() => setCustomerViewMode('dormant')}
 className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors ${
 customerViewMode ==='dormant' ? 'bg-[#f0f0f0] text-[#262626]' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 Dormant Cus
 </button>
 </div>
 <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-lg p-0.5">
 {([
 { key: 'all', label: 'All' },
 { key: 'dia', label: 'Dia' },
 { key: 'pt', label: 'PT' },
 { key: 'gold16', label: 'Gold(16)' },
 { key: 'gold15', label: 'Gold(15)' },
 ] as const).map((cat) => (
 <button
 key={cat.key}
 onClick={() => setCustomerCategory(cat.key)}
 className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
 customerCategory === cat.key ? 'bg-[#f0f0f0] text-[#262626]' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 {cat.label}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 <div
 className={`overflow-hidden transition-all duration-300 ease-in-out ${
 customerRateExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
 }`}
 >
 <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
 {customerViewMode ==='tier' ? (() => {
 const totalVip = customerRate.reduce((s, r) => s + r.vip, 0);
 const totalVvip = customerRate.reduce((s, r) => s + r.vvip, 0);
 const totalCip = customerRate.reduce((s, r) => s + r.cip, 0);
 const totalCare = customerRate.reduce((s, r) => s + r.care, 0);
 const totalAll = totalVip + totalVvip + totalCip + totalCare;
 const totalAmt = customerRate.reduce((s, r) => s + r.totalAmount, 0);
 return (
 <>
 {/* Summary cards */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 border-b border-[#e8e8e8] bg-[#fafafa]/30">
 <div className="rounded-lg bg-[#fafafa]/40 px-3 py-2 border border-[#f0f0f0]">
 <div className="text-[9px] text-[#8c8c8c] uppercase font-semibold tracking-wider">Total Cus</div>
 <div className="text-lg font-bold text-[#262626] tabular-nums">{totalAll}</div>
 </div>
 <div className="rounded-lg bg-yellow-500/10 px-3 py-2 border border-yellow-500/20">
 <div className="text-[9px] text-amber-600/70 uppercase font-semibold tracking-wider">VIP</div>
 <div className="text-lg font-bold text-amber-600 tabular-nums">{totalVip}</div>
 </div>
 <div className="rounded-lg bg-amber-50 px-3 py-2 border border-amber-200">
 <div className="text-[9px] text-amber-600/70 uppercase font-semibold tracking-wider">VVIP</div>
 <div className="text-lg font-bold text-amber-600 tabular-nums">{totalVvip}</div>
 </div>
 <div className="rounded-lg bg-purple-50 px-3 py-2 border border-purple-200">
 <div className="text-[9px] text-purple-600/70 uppercase font-semibold tracking-wider">CIP</div>
 <div className="text-lg font-bold text-purple-600 tabular-nums">{totalCip}</div>
 </div>
 <div className="rounded-lg bg-gray-500/10 px-3 py-2 border border-gray-500/20">
 <div className="text-[9px] text-[#8c8c8c]/70 uppercase font-semibold tracking-wider">Total Amt</div>
 <div className="text-lg font-bold text-[#8c8c8c] tabular-nums">{formatCompact(totalAmt)}</div>
 </div>
 </div>
 <div className="overflow-x-auto max-h-[450px]">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10 bg-[#fafafa]">
 <tr>
 <th className="py-2 px-4 text-left text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Shop</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Total Cus</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-yellow-500/70 uppercase tracking-wider">VIP</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-yellow-500/50 uppercase tracking-wider">VIP Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-amber-500/70 uppercase tracking-wider">VVIP</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-amber-500/50 uppercase tracking-wider">VVIP Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-purple-500/70 uppercase tracking-wider">CIP</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-purple-500/50 uppercase tracking-wider">CIP Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Care</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c]/70 uppercase tracking-wider">Care Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Total Amt</th>
 <th className="py-2 px-2 text-center text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Distribution</th>
 <th className="py-2 px-4 text-center text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#f0f0f0]">
 {customerRate.length === 0 ? (
 <tr>
 <td colSpan={13} className="py-8 px-4 text-center text-[11px] text-gray-600">No data</td>
 </tr>
 ) : (
 <>
 {customerRate.map((row) => {
 const rowTotal = row.vip + row.vvip + row.cip + row.care;
 const vipPct = rowTotal > 0 ? (row.vip / rowTotal) * 100 : 0;
 const vvipPct = rowTotal > 0 ? (row.vvip / rowTotal) * 100 : 0;
 const cipPct = rowTotal > 0 ? (row.cip / rowTotal) * 100 : 0;
 const carePct = rowTotal > 0 ? (row.care / rowTotal) * 100 : 0;
 return (
 <tr key={row.shop} className={`hover:bg-[#fafafa] transition-colors ${onCusDetail ? 'cursor-pointer' : ''}`} onClick={() => onCusDetail?.(row.shop)}>
 <td className="py-2 px-4 text-[11px] font-medium text-[#8c8c8c]">{row.shop}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-[#262626] text-right tabular-nums">{rowTotal}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-amber-600 text-right tabular-nums">{row.vip}</td>
 <td className="py-2 px-2 text-[11px] text-amber-600/50 text-right tabular-nums">{formatCompact(row.vipAmount)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-amber-600 text-right tabular-nums">{row.vvip}</td>
 <td className="py-2 px-2 text-[11px] text-amber-600/50 text-right tabular-nums">{formatCompact(row.vvipAmount)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-purple-600 text-right tabular-nums">{row.cip}</td>
 <td className="py-2 px-2 text-[11px] text-purple-600/50 text-right tabular-nums">{formatCompact(row.cipAmount)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-[#8c8c8c] text-right tabular-nums">{row.care}</td>
 <td className="py-2 px-2 text-[11px] text-[#8c8c8c]/50 text-right tabular-nums">{formatCompact(row.careAmount)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-[#8c8c8c] text-right tabular-nums">{formatCompact(row.totalAmount)}</td>
 <td className="py-2 px-2">
 <div className="flex h-1.5 rounded-full overflow-hidden bg-[#f5f5f5] min-w-[80px]">
 <div className="bg-yellow-400" style={{ width: `${vipPct}%` }} />
 <div className="bg-amber-400" style={{ width: `${vvipPct}%` }} />
 <div className="bg-purple-400" style={{ width: `${cipPct}%` }} />
 <div className="bg-gray-500" style={{ width: `${carePct}%` }} />
 </div>
 </td>
 <td className="py-2 px-4 text-center">
 <span className={`status-pill status-pill--${row.status}`}>
 <span className={`status-pill__dot ${row.status ==='good' ? '' : 'status-pill__dot--pulse'}`}></span>
 {row.status ==='good' &&'Good'}
 {row.status ==='warning' &&'Warning'}
 {row.status ==='critical' &&'Critical'}
 </span>
 </td>
 </tr>
 );
 })}
 <tr className="border-t-2 border-[#e8e8e8]">
 <td className="py-2 px-4 text-[11px] font-bold text-[#262626]">Total</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#262626] text-right tabular-nums">{totalAll}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600 text-right tabular-nums">{totalVip}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600/50 text-right tabular-nums">{formatCompact(customerRate.reduce((s, r) => s + r.vipAmount, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600 text-right tabular-nums">{totalVvip}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600/50 text-right tabular-nums">{formatCompact(customerRate.reduce((s, r) => s + r.vvipAmount, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-purple-600 text-right tabular-nums">{totalCip}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-purple-600/50 text-right tabular-nums">{formatCompact(customerRate.reduce((s, r) => s + r.cipAmount, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#8c8c8c] text-right tabular-nums">{totalCare}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#8c8c8c]/50 text-right tabular-nums">{formatCompact(customerRate.reduce((s, r) => s + r.careAmount, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#262626] text-right tabular-nums">{formatCompact(totalAmt)}</td>
 <td className="py-2 px-2" />
 <td className="py-2 px-4" />
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 </>);
 })() : (() => {
 const totalActive = dormantRate.reduce((s, r) => s + r.active, 0);
 const totalD30 = dormantRate.reduce((s, r) => s + r.d30, 0);
 const totalD60 = dormantRate.reduce((s, r) => s + r.d60, 0);
 const totalD90 = dormantRate.reduce((s, r) => s + r.d90, 0);
 const totalCus = dormantRate.reduce((s, r) => s + r.totalCus, 0);
 const totalAmt = dormantRate.reduce((s, r) => s + r.totalAmt, 0);
 return (
 <>
 {/* Summary cards */}
 <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-3 border-b border-[#e8e8e8] bg-[#fafafa]/30">
 <div className="rounded-lg bg-[#fafafa]/40 px-3 py-2 border border-[#f0f0f0]">
 <div className="text-[9px] text-[#8c8c8c] uppercase font-semibold tracking-wider">Total Cus</div>
 <div className="text-lg font-bold text-[#262626] tabular-nums">{totalCus}</div>
 </div>
 <div className="rounded-lg bg-emerald-500/10 px-3 py-2 border border-emerald-500/20">
 <div className="text-[9px] text-emerald-600/70 uppercase font-semibold tracking-wider">Active</div>
 <div className="text-lg font-bold text-emerald-600 tabular-nums">{totalActive}</div>
 </div>
 <div className="rounded-lg bg-yellow-500/10 px-3 py-2 border border-yellow-500/20">
 <div className="text-[9px] text-amber-600/70 uppercase font-semibold tracking-wider">30D</div>
 <div className="text-lg font-bold text-amber-600 tabular-nums">{totalD30}</div>
 </div>
 <div className="rounded-lg bg-amber-50 px-3 py-2 border border-amber-200">
 <div className="text-[9px] text-amber-600/70 uppercase font-semibold tracking-wider">60D</div>
 <div className="text-lg font-bold text-amber-600 tabular-nums">{totalD60}</div>
 </div>
 <div className="rounded-lg bg-rose-50 px-3 py-2 border border-rose-500/20">
 <div className="text-[9px] text-rose-600/70 uppercase font-semibold tracking-wider">90+D</div>
 <div className="text-lg font-bold text-rose-600 tabular-nums">{totalD90}</div>
 </div>
 <div className="rounded-lg bg-gray-500/10 px-3 py-2 border border-gray-500/20">
 <div className="text-[9px] text-[#8c8c8c]/70 uppercase font-semibold tracking-wider">Total Amt</div>
 <div className="text-lg font-bold text-[#8c8c8c] tabular-nums">{formatCompact(totalAmt)}</div>
 </div>
 </div>
 <div className="overflow-x-auto max-h-[450px]">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10 bg-[#fafafa]">
 <tr>
 <th className="py-2 px-4 text-left text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Shop</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-emerald-500/70 uppercase tracking-wider">Active (&lt;30D)</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-emerald-500/50 uppercase tracking-wider">Active Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-yellow-500/70 uppercase tracking-wider">30 Days</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-yellow-500/50 uppercase tracking-wider">30D Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-amber-500/70 uppercase tracking-wider">60 Days</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-amber-500/50 uppercase tracking-wider">60D Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-rose-500/70 uppercase tracking-wider">90+ Days</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-rose-500/50 uppercase tracking-wider">90+ Amt</th>
 <th className="py-2 px-2 text-right text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Total</th>
 <th className="py-2 px-2 text-center text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Distribution</th>
 <th className="py-2 px-4 text-center text-[9px] font-semibold text-[#8c8c8c] uppercase tracking-wider">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#f0f0f0]">
 {dormantRate.length === 0 ? (
 <tr>
 <td colSpan={12} className="py-8 px-4 text-center text-[11px] text-gray-600">No data</td>
 </tr>
 ) : (
 <>
 {dormantRate.map((row) => {
 const activePct = row.totalCus > 0 ? (row.active / row.totalCus) * 100 : 0;
 const d30Pct = row.totalCus > 0 ? (row.d30 / row.totalCus) * 100 : 0;
 const d60Pct = row.totalCus > 0 ? (row.d60 / row.totalCus) * 100 : 0;
 const d90Pct = row.totalCus > 0 ? (row.d90 / row.totalCus) * 100 : 0;
 return (
 <tr key={row.shop} className={`hover:bg-[#fafafa] transition-colors ${onCusDetail ? 'cursor-pointer' : ''}`} onClick={() => onCusDetail?.(row.shop)}>
 <td className="py-2 px-4 text-[11px] font-medium text-[#8c8c8c]">{row.shop}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-emerald-600 text-right tabular-nums">{row.active}</td>
 <td className="py-2 px-2 text-[11px] text-emerald-600/50 text-right tabular-nums">{formatCompact(row.activeAmt)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-amber-600 text-right tabular-nums">{row.d30}</td>
 <td className="py-2 px-2 text-[11px] text-amber-600/50 text-right tabular-nums">{formatCompact(row.d30Amt)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-amber-600 text-right tabular-nums">{row.d60}</td>
 <td className="py-2 px-2 text-[11px] text-amber-600/50 text-right tabular-nums">{formatCompact(row.d60Amt)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-rose-600 text-right tabular-nums">{row.d90}</td>
 <td className="py-2 px-2 text-[11px] text-rose-600/50 text-right tabular-nums">{formatCompact(row.d90Amt)}</td>
 <td className="py-2 px-2 text-[11px] font-medium text-[#262626] text-right tabular-nums">{row.totalCus}</td>
 <td className="py-2 px-2">
 <div className="flex h-1.5 rounded-full overflow-hidden bg-[#f5f5f5] min-w-[80px]">
 <div className="bg-emerald-400" style={{ width: `${activePct}%` }} />
 <div className="bg-yellow-400" style={{ width: `${d30Pct}%` }} />
 <div className="bg-amber-400" style={{ width: `${d60Pct}%` }} />
 <div className="bg-rose-400" style={{ width: `${d90Pct}%` }} />
 </div>
 </td>
 <td className="py-2 px-4 text-center">
 <span className={`status-pill status-pill--${row.status}`}>
 <span className={`status-pill__dot ${row.status ==='good' ? '' : 'status-pill__dot--pulse'}`}></span>
 {row.status ==='good' &&'Good'}
 {row.status ==='warning' &&'Warning'}
 {row.status ==='critical' &&'Critical'}
 </span>
 </td>
 </tr>
 );
 })}
 <tr className="border-t-2 border-[#e8e8e8]">
 <td className="py-2 px-4 text-[11px] font-bold text-[#262626]">Total</td>
 <td className="py-2 px-2 text-[11px] font-bold text-emerald-600 text-right tabular-nums">{totalActive}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-emerald-600/50 text-right tabular-nums">{formatCompact(dormantRate.reduce((s, r) => s + r.activeAmt, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600 text-right tabular-nums">{totalD30}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600/50 text-right tabular-nums">{formatCompact(dormantRate.reduce((s, r) => s + r.d30Amt, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600 text-right tabular-nums">{totalD60}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-amber-600/50 text-right tabular-nums">{formatCompact(dormantRate.reduce((s, r) => s + r.d60Amt, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-rose-600 text-right tabular-nums">{totalD90}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-rose-600/50 text-right tabular-nums">{formatCompact(dormantRate.reduce((s, r) => s + r.d90Amt, 0))}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#262626] text-right tabular-nums">{totalCus}</td>
 <td className="py-2 px-2" />
 <td className="py-2 px-4" />
 </tr>
 </>
 )}
 </tbody>
 </table>
 </div>
 </>);
 })()}
 </div>
 </div>
 </motion.div>

 {/* CM Report Section */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className="pt-2"
 >
 <div className="w-full flex items-center justify-between px-4 py-3.5 bg-[#fafafa] rounded-xl border border-[#e8e8e8] hover:border-[#d9d9d9] transition-all hover:shadow-lg">
 <button
 onClick={() => { setCmReportExpanded(v => !v); setCmEverExpanded(true); }}
 className="flex items-center gap-3 flex-1"
 >
 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
 <BarChart3 className="w-4 h-4 text-emerald-600" />
 </span>
 <span className="flex items-center gap-2.5">
 <h2 className="text-[14px] font-bold text-[#262626] tracking-tight">CM Report</h2>
 <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">Report အားလုံး</span>
 </span>
 <ChevronDown className={`w-4 h-4 text-[#8c8c8c] transition-transform duration-300 ${cmReportExpanded ? 'rotate-180' : ''}`} />
 </button>
 <div className="flex items-center gap-1 bg-[#fafafa]/40 p-1 rounded-lg border border-gray-600/40">
 {(['current','all'] as const).map((mode) => (
 <button
 key={mode}
 onClick={() => setCmReportMonthMode(mode)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap
 ${cmReportMonthMode === mode
 ? 'bg-emerald-500 text-white shadow-sm'
 : 'text-[#8c8c8c] hover:text-[#595959] hover:bg-[#f5f5f5]'
 }`}
 >
 {mode === 'current' ? 'Current Month' : 'All Month'}
 </button>
 ))}
 </div>
 </div>
 <div className={`mt-2 space-y-2 ${cmReportExpanded ? '' : 'hidden'}`}>
 {cmEverExpanded && cmReportExpanded && <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#1677ff] border-t-transparent rounded-full animate-spin" /></div>}>
 {([
 { mode: 'full' as const, label: 'Report အားလုံးကြည့်ရန်' },
 { mode: 'net' as const, label: 'Net Sale Report' },
 { mode: 'allBranch' as const, label: 'All Branch Sale (Dia, Gold, PT)' },
 { mode: 'itemSale' as const, label: 'Item အလိုက်ရောင်းအား' },
 { mode: 'itemRate' as const, label: 'Item rate' },
 { mode: 'cusList' as const, label: 'CUS List' },
 ]).map(({ mode, label }) => {
 const isOpen = cmOpenSection === mode;
 return (
 <div key={mode} className="rounded-xl border border-[#e8e8e8] overflow-hidden">
 <button
 onClick={() => setCmOpenSection(isOpen ? null : mode)}
 className="w-full flex items-center justify-between px-4 py-3 bg-[#fafafa] hover:bg-[#f0f0f0]/80 transition-colors"
 >
 <h3 className="text-[13px] font-bold text-[#262626] tracking-tight">{label}</h3>
 <ChevronDown className={`w-4 h-4 text-[#8c8c8c] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
 </button>
 {isOpen && (
 <div className="bg-white">
 <CmView
 data={rawData}
 allData={allData}
 selectedMonth={selectedMonth ||''}
 selectedBranches={selectedBranches}
 fixedViewMode={mode}
 monthMode={cmReportMonthMode}
 />
 </div>
 )}
 </div>
 );
 })}
 </Suspense>}
 </div>
 </motion.div>

 {/* Footer */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.5 }}
 className="mt-8 pt-4 border-t border-[#e8e8e8]"
 >
 <div className="flex items-start gap-3 text-[#8c8c8c]">
 <Clock className="w-4 h-4 mt-0.5 text-[#8c8c8c]" />
 <p className="text-[11px] md:text-[12px] leading-relaxed">
 Chairman အတွက် Company အခြေအနေကို တစ်လုံးလုံး 5 sec အတွင်း သိရမယ်။
 </p>
 </div>
 </motion.div>
 </div>
 </div>
 );
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
