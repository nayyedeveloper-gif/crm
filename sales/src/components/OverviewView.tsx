import React, { useState, useEffect, useMemo, useRef } from'react';
import Papa from'papaparse';
import domToImage from'dom-to-image-more';
import jsPDF from'jspdf';
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 Tooltip,
 ResponsiveContainer,
 Cell,
 AreaChart,
 Area,
 CartesianGrid,
 Legend,
 LabelList
} from'recharts';
import {
 ArrowUpRight,
 Store,
 ShoppingBag,
 Clock,
 Users,
 ChevronRight,
 User,
 PieChart as PieChartIcon,
 MapPin,
 Download
} from'lucide-react';
import { motion } from'motion/react';
import { DataRow } from'../types';
import { branchFilterShowsAll, filterRowsByBranches, getBranchLocation, getExtractedReason, parseSafeDate } from'../utils';
import DonutChart from'./DonutChart';

import SummaryCards from'./SummaryCards';

const SALE_REASONS = new Set(['Dia Sale','G Sale','PT Sale','Sale','အရောင်း']);
const RC_REASONS = new Set(['Dia RC','G RC','PT RC','RC','အဝယ်']);
const SALE_TREND_SERIES = ['Sale','RC','Net Sale'] as const;
const SALE_TREND_COLORS: Record<(typeof SALE_TREND_SERIES)[number], string> = {
 Sale: '#52c41a',
 RC: '#ff4d4f',
'Net Sale': '#1677ff',
};
const SALE_TREND_AMOUNT_KEYS: Record<(typeof SALE_TREND_SERIES)[number], string> = {
 Sale: 'saleAmount',
 RC: 'rcAmount',
'Net Sale': 'netSaleAmount',
};

const formatLabelAmount = (value: number) => {
 const abs = Math.abs(value);
 if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1)}B`;
 if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(0)}M`;
 if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}K`;
 return abs.toLocaleString();
};

const renderSaleTrendBarLabel = (color: string) => (props: any) => {
 const { x, y, width, height, value } = props;
 if (value == null || value === 0 || x == null || y == null || width == null) return null;
 if (height != null && height < 16) return null;

 const cx = x + width / 2;
 const formatted = formatLabelAmount(Number(value));

 return (
 <g>
 <text
 x={cx}
 y={y - 20}
 fill={color}
 textAnchor="middle"
 fontSize={12}
 fontWeight={800}
 stroke="white"
 strokeWidth={4}
 paintOrder="stroke"
 >
 {formatted}
 </text>
 <text
 x={cx}
 y={y - 7}
 fill={color}
 textAnchor="middle"
 fontSize={10}
 fontWeight={700}
 stroke="white"
 strokeWidth={3}
 paintOrder="stroke"
 >
 Ks
 </text>
 </g>
 );
};

const formatAmountAxisTick = (value: number) => {
 if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
 if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
 return value.toLocaleString();
};

type SaleTrendBucket = {
 transactions: number;
 saleGram: number;
 rcGram: number;
 saleQty: number;
 rcQty: number;
 saleAmount: number;
 rcAmount: number;
};

const emptySaleTrendBucket = (): SaleTrendBucket => ({
 transactions: 0,
 saleGram: 0,
 rcGram: 0,
 saleQty: 0,
 rcQty: 0,
 saleAmount: 0,
 rcAmount: 0,
});

const addRowToSaleTrendBucket = (bucket: SaleTrendBucket, row: DataRow) => {
 bucket.transactions += 1;
 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const reason = getExtractedReason(row);

 if (SALE_REASONS.has(reason)) {
 bucket.saleGram += g;
 bucket.saleQty += q;
 bucket.saleAmount += a;
 } else if (RC_REASONS.has(reason)) {
 bucket.rcGram += g;
 bucket.rcQty += q;
 bucket.rcAmount += a;
 }
};

const finalizeSaleTrendPeriods = <T extends { saleGram: number; rcGram: number; saleQty: number; rcQty: number; saleAmount: number; rcAmount: number; transactions: number }>(
 items: T[],
 getLabel: (item: T) => string
) => {
 return items.map((item, index, arr) => {
 const netSaleGram = item.saleGram - item.rcGram;
 const netSaleQty = item.saleQty - item.rcQty;
 const netSaleAmount = item.saleAmount - item.rcAmount;
 const gramCount = item.saleGram + item.rcGram;

 const prev = index > 0 ? arr[index - 1] : null;
 const prevNetGram = prev ? prev.saleGram - prev.rcGram : 0;
 const gramPercentChange = prev && prev.saleGram + prev.rcGram > 0
 ? ((gramCount - (prev.saleGram + prev.rcGram)) / (prev.saleGram + prev.rcGram)) * 100
 : (index > 0 && gramCount > 0 ? 100 : 0);

 const pct = (current: number, previous: number) =>
 previous > 0 ? ((current - previous) / previous) * 100 : (index > 0 && current > 0 ? 100 : 0);

 const categoryChanges: Record<string, { gram: number; qty: number; amount: number; gramPercentChange: number }> = {
 Sale: {
 gram: item.saleGram,
 qty: item.saleQty,
 amount: item.saleAmount,
 gramPercentChange: pct(item.saleGram, prev?.saleGram ?? 0),
 },
 RC: {
 gram: item.rcGram,
 qty: item.rcQty,
 amount: item.rcAmount,
 gramPercentChange: pct(item.rcGram, prev?.rcGram ?? 0),
 },
'Net Sale': {
 gram: netSaleGram,
 qty: netSaleQty,
 amount: netSaleAmount,
 gramPercentChange: pct(netSaleGram, prevNetGram),
 },
 };

 return {
 ...item,
 gramCount,
 netSaleGram,
 netSaleQty,
 netSaleAmount,
 totalQty: item.saleQty + item.rcQty,
 totalAmount: item.saleAmount + item.rcAmount,
 gramPercentChange,
 transactionPercentChange: pct(item.transactions, prev?.transactions ?? 0),
 categoryChanges,
 periodLabel: getLabel(item),
 hasPrev: index > 0,
 };
 });
};

interface OverviewViewProps {
 data: DataRow[];
 filteredData: DataRow[];
 displayData: DataRow[];
 weekFilteredData: DataRow[];
 selectedBranches: string[];
 selectedMonth: string;
 selectedDay: string | null;
 selectedWeek: string | null;
 setSelectedDay: (day: string | null) => void;
 setSelectedWeek: (week: string | null) => void;
 setSelectedDetail: (detail: string | null) => void;
 setActiveTab: (tab: 'overview' |'detail' |'staff' |'cm' |'chairman' |'crm') => void;
 setSelectedItemType: (type: string) => void;
 setSelectedMonth: (month: string) => void;
 highPerformanceMode?: boolean;
}

const OverviewView = React.memo(({
 data,
 filteredData,
 displayData,
 weekFilteredData,
 selectedBranches,
 selectedMonth,
 selectedDay,
 selectedWeek,
 setSelectedDay,
 setSelectedWeek,
 setSelectedDetail,
 setActiveTab,
 setSelectedItemType,
 setSelectedMonth
}: OverviewViewProps) => {
 const overviewRef = useRef<HTMLDivElement>(null);
 const [isExporting, setIsExporting] = useState(false);

 const handleExportPDF = async () => {
 console.log('Export PDF clicked');
 if (!overviewRef.current) {
 console.error('overviewRef is null');
 return;
 }
 setIsExporting(true);

 try {
 const element = overviewRef.current;
 console.log('Starting dom-to-image capture...');
 const dataUrl = await domToImage.toPng(element, {
 quality: 1,
 scale: 2
 });
 console.log('Image captured successfully');

 // Use landscape A3 for more space
 const pdf = new jsPDF('l','mm','a3');
 const pdfWidth = pdf.internal.pageSize.getWidth();
 const pdfHeight = pdf.internal.pageSize.getHeight();

 const img = new Image();
 img.src = dataUrl;

 await new Promise((resolve) => {
 img.onload = resolve;
 });

 const imgWidth = img.width;
 const imgHeight = img.height;
 // Fit to full page (both width and height)
 const margin = 5;
 const ratio = Math.min(
 (pdfWidth - margin * 2) / imgWidth,
 (pdfHeight - margin * 2) / imgHeight
 );
 const imgX = (pdfWidth - imgWidth * ratio) / 2;
 const imgY = (pdfHeight - imgHeight * ratio) / 2;

 pdf.addImage(dataUrl,'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
 console.log('PDF created, saving...');

 // Use blob to trigger download
 const pdfBlob = pdf.output('blob');
 const url = URL.createObjectURL(pdfBlob);
 const link = document.createElement('a');
 link.href = url;
 link.download ='overview-report.pdf';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);

 console.log('PDF saved successfully');
 } catch (error) {
 console.error('PDF export failed: ', error);
 alert('PDF export failed: ' + (error as Error).message);
 } finally {
 setIsExporting(false);
 }
 };

 const showsAllBranches = branchFilterShowsAll(selectedBranches);
 const rankByBranch = showsAllBranches || selectedBranches.length > 1;
 const [showAllMostUsed, setShowAllMostUsed] = useState(false);
 const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

 const handleLegendClick = (e: any) => {
 const key = e.value;
 if (!key) return;
 setHiddenSeries(prev => ({
 ...prev,
 [key]: !prev[key]
 }));
 };

 const renderSaleTrendBars = (
 keyPrefix: string,
 onBarClick: (data: any) => void,
 animationDuration = 400,
 showLabels = true
 ) =>
 SALE_TREND_SERIES.map((name) => {
 if (hiddenSeries[name]) return null;
 const amountKey = SALE_TREND_AMOUNT_KEYS[name];
 const color = SALE_TREND_COLORS[name];
 return (
 <Bar
 key={`${keyPrefix}-${name}`}
 dataKey={amountKey}
 name={name}
 fill={color}
 radius={[4, 4, 0, 0]}
 barSize={20}
 animationDuration={animationDuration}
 onClick={onBarClick}
 className="cursor-pointer transition-all duration-300 hover:opacity-80"
 >
 {showLabels && (
 <LabelList dataKey={amountKey} content={renderSaleTrendBarLabel(color)} />
 )}
 </Bar>
 );
 });

 const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

 const weeklyCounts = useMemo(() => {
 const counts: Record<string, number> = {'Sun': 0,'Mon': 0,'Tue': 0,'Wed': 0,'Thu': 0,'Fri': 0,'Sat': 0 };
 weekFilteredData.forEach(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 const dayName = days[date.getDay()];
 counts[dayName]++;
 }
 });
 return counts;
 }, [weekFilteredData, days]);

 const chartData = useMemo(() => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({
 day,
 value: weeklyCounts[day]
 })), [weeklyCounts]);

 const totalTransactions = displayData.length;

 const hourlyChartData = useMemo(() => {
 const counts: Record<number, number> = {};
 for (let i = 0; i < 24; i++) counts[i] = 0;

 displayData.forEach(row => {
 if (row.Timestamp) {
 const timePart = row.Timestamp.split(' ')[1];
 if (timePart) {
 const hour = parseInt(timePart.split(':')[0]);
 if (!isNaN(hour)) counts[hour]++;
 }
 }
 });

 return Object.entries(counts).map(([hour, count]) => ({
 hour: `${hour}:00`,
 count
 })).filter(d => parseInt(d.hour) >= 8 && parseInt(d.hour) <= 21);
 }, [displayData]);

 const townshipStats = useMemo(() => {
 const counts: Record<string, number> = {};
 displayData.forEach(row => {
 const township = row['Township'] ||'Unknown';
 if (township && township.trim() !=='' && township !=='Unknown') {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 counts[township.trim()] = (counts[township.trim()] || 0) + q;
 }
 });
 
 return Object.entries(counts)
 .map(([name, value]) => ({ name, value }))
 .sort((a, b) => b.value - a.value)
 .slice(0, 7);
 }, [displayData]);

 const itemMainGroupStats = useMemo(() => {
 const counts: Record<string, number> = {};
 
 // Find the correct key for Item Main Group once
 let itemMainGroupKey ='';
 if (displayData.length > 0) {
 itemMainGroupKey = Object.keys(displayData[0]).find(k => 
 k.trim().replace(/\s+/g,'').toLowerCase() ==='item main group'
 ) ||'Item Main Group';
 }

 displayData.forEach(row => {
 const itemGroup = row[itemMainGroupKey] || row['Item Main Group'];
 if (itemGroup && itemGroup.trim() !=='') {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 counts[itemGroup.trim()] = (counts[itemGroup.trim()] || 0) + q;
 }
 });

 return Object.entries(counts)
 .map(([name, count]) => ({
 name,
 count
 }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 5);
 }, [displayData]);

 const dailyAvg = useMemo(() => {
 let totalQtySum = 0;
 filteredData.forEach(row => {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 totalQtySum += (isNaN(qty) ? 1 : qty);
 });
 return (totalQtySum / 7).toFixed(1);
 }, [filteredData]);

 const { groupSizeData, totalGram, totalAmount, totalQty, saleStats, rcStats, rpStats } = useMemo(() => {
 const counts: Record<string, number> = {};
 let gramSum = 0;
 let amountSum = 0;
 let qtySum = 0;
 
 const sale = { gram: 0, amount: 0, qty: 0 };
 const rc = { gram: 0, amount: 0, qty: 0 };
 const rp = { gram: 0, amount: 0, qty: 0 };

 displayData.forEach(row => {
 const reason = getExtractedReason(row);
 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;
 gramSum += g;
 
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 amountSum += a;

 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 qtySum += q;

 if (['Dia Sale','G Sale','PT Sale','Sale','အရောင်း'].includes(reason)) {
 sale.gram += g;
 sale.amount += a;
 sale.qty += q;
 } else if (['Dia RC','G RC','PT RC','RC','အဝယ်'].includes(reason)) {
 rc.gram += g;
 rc.amount += a;
 rc.qty += q;
 } else if (['Dia RP','G RP','PT RP','RP','ပြင်ဆင်'].includes(reason)) {
 rp.gram += g;
 rp.amount += a;
 rp.qty += q;
 }

 const size = row['တဖွဲ့တွင်ပါဝင်သောလူဦးရေ'] ||'1';
 const numSize = parseInt(size);
 if (!isNaN(numSize)) {
 const label = numSize >= 5 ? '5+' : numSize.toString();
 counts[label] = (counts[label] || 0) + 1;
 }
 });

 const data = ['1','2','3','4','5+'].map(size => ({
 name: size + (size ==='5+' ? '' : ' Person'),
 value: counts[size] || 0
 }));

 return { groupSizeData: data, totalGram: gramSum, totalAmount: amountSum, totalQty: qtySum, saleStats: sale, rcStats: rc, rpStats: rp };
 }, [displayData]);

 const mostUsedData = useMemo(() => {
 const counts: Record<string, number> = {};
 displayData.forEach(row => {
 const key = rankByBranch
 ? (row['Branch အမည်'] ||'Unknown')
 : (row['အရောင်းသမားအမည်'] || row['Customer Service အမည်'] ||'Unknown');
 
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 counts[key] = (counts[key] || 0) + (isNaN(qty) ? 1 : qty);
 });

 return Object.entries(counts)
 .map(([name, count]) => ({
 name,
 count,
 percent: ((count / (totalQty || 1)) * 100).toFixed(0) +'%',
 color: name.includes('Branch 1') ? '#1677ff' : name.includes('Branch 2') ? '#5856D6' : '#AF52DE'
 }))
 .sort((a, b) => b.count - a.count);
 }, [displayData, rankByBranch, totalQty]);

 const mostUsed = showAllMostUsed ? mostUsedData : mostUsedData.slice(0, 5);

 const categories = useMemo(() => {
 const counts: Record<string, number> = {};
 displayData.forEach(row => {
 const reason = getExtractedReason(row);
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 counts[reason] = (counts[reason] || 0) + q;
 });

 const colors: Record<string, string> = {
'အဝယ်': '#52c41a',
'ပြင်ဆင်': '#fa8c16',
'အရောင်း': '#ff4d4f',
'အလဲအထပ်': '#5856D6',
'ပစ္စည်းကြည့်သီးသန့်': '#AF52DE',
'Sale': '#52c41a',
'RC': '#ff4d4f',
'RP': '#fa8c16',
'Dia Sale': '#1677ff',
'G Sale': '#FFCC00',
'PT Sale': '#AF52DE',
'Dia RC': '#5AC8FA',
'G RC': '#fa8c16',
'PT RC': '#E5CCFF',
'Dia RP': '#52c41a',
'G RP': '#ff4d4f',
'PT RP': '#5856D6',
'Other': '#8E8E93'
 };

 const totalCatQty = Object.values(counts).reduce((a, b) => a + b, 0);

 return Object.entries(counts)
 .map(([name, count]) => ({
 name,
 count,
 percent: (count / (totalCatQty || 1)) * 100,
 color: colors[name] ||'#8E8E93'
 }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 8);
 }, [displayData]);

 const itemCategoryStats = useMemo(() => {
 const counts: Record<string, number> = {};
 displayData.forEach(row => {
 const cat = row['Item Category'];
 if (cat && cat.trim() !=='') {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 counts[cat.trim()] = (counts[cat.trim()] || 0) + q;
 }
 });
 
 const sorted = Object.entries(counts)
 .map(([name, value]) => ({ name, value }))
 .sort((a, b) => b.value - a.value);

 return {
 top7: sorted.slice(0, 7),
 bottom7: [...sorted].reverse().slice(0, 7)
 };
 }, [displayData]);

 const customerTypeData = useMemo(() => {
 const counts: Record<string, number> = {};
 displayData.forEach(row => {
 const type = row['Customer Type(Old/New)'] ||'Unknown';
 counts[type] = (counts[type] || 0) + 1;
 });
 return Object.entries(counts).map(([name, value]) => ({ name, value }));
 }, [displayData]);

 const monthTrendSourceData = useMemo(() => {
 // For Monthly Sale Trend, show all months regardless of month filter, start date, end date
 // But still respect branch and item type filters
 // Use raw data and apply only branch filtering
 return filterRowsByBranches(data, selectedBranches);
 }, [data, selectedBranches]);

 const monthlyTrendData = useMemo(() => {
 const monthlyData: Record<string, SaleTrendBucket> = {};
 monthTrendSourceData.forEach(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
 if (!monthlyData[monthKey]) monthlyData[monthKey] = emptySaleTrendBucket();
 addRowToSaleTrendBucket(monthlyData[monthKey], row);
 }
 });

 const sorted = Object.entries(monthlyData)
 .map(([month, bucket]) => ({ month, ...bucket }))
 .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

 return finalizeSaleTrendPeriods(sorted, (item) => item.month).map((item) => ({
 ...item,
 monthLabel: item.month,
 }));
 }, [monthTrendSourceData]);

 const handleMonthBarClick = (monthKey: string) => {
 const monthName = new Date(monthKey).toLocaleDateString('en-US', { month: 'long' });
 setSelectedMonth(selectedMonth === monthName ? 'All' : monthName);
 setSelectedWeek(null);
 setSelectedDay(null);
 };

 const trendData = useMemo(() => {
 const weeks = ['1 week','2 week','3 week','4 week','exter day'];
 const weeklyData: Record<string, SaleTrendBucket> = {};
 weeks.forEach((week) => {
 weeklyData[week] = emptySaleTrendBucket();
 });

 filteredData.forEach(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 const day = date.getDate();
 const weekIdx = day > 28 ? 4 : Math.floor((day - 1) / 7);
 const weekKey = weeks[weekIdx];
 addRowToSaleTrendBucket(weeklyData[weekKey], row);
 }
 });

 const sorted = weeks.map((week) => ({ week, ...weeklyData[week] }));
 return finalizeSaleTrendPeriods(sorted, (item) => item.week).map((item) => ({
 ...item,
 weekLabel: item.week,
 }));
 }, [filteredData]);

 const shopDistribution = useMemo(() => {
 const dist: Record<string, SaleTrendBucket & { name: string }> = {};
 displayData.forEach(row => {
 const shop = row['Branch အမည်'] ||'Unknown';
 if (!dist[shop]) {
 dist[shop] = { name: shop, ...emptySaleTrendBucket() };
 }
 addRowToSaleTrendBucket(dist[shop], row);
 });

 // Calculate previous week data for comparison
 const prevWeekDist: Record<string, SaleTrendBucket> = {};
 const weeks = ['1 week','2 week','3 week','4 week','exter day'];
 if (selectedWeek) {
 const currentWeekIndex = weeks.indexOf(selectedWeek);
 if (currentWeekIndex > 0) {
 const prevWeek = weeks[currentWeekIndex - 1];
 filteredData.forEach(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 const day = date.getDate();
 const weekIdx = day > 28 ? 4 : Math.floor((day - 1) / 7);
 const weekLabel = weeks[weekIdx];
 if (weekLabel === prevWeek) {
 const shop = row['Branch အမည်'] ||'Unknown';
 if (!prevWeekDist[shop]) {
 prevWeekDist[shop] = emptySaleTrendBucket();
 }
 addRowToSaleTrendBucket(prevWeekDist[shop], row);
 }
 }
 });
 }
 }

 return Object.values(dist)
 .map((shop) => {
 const netSaleGram = shop.saleGram - shop.rcGram;
 const netSaleQty = shop.saleQty - shop.rcQty;
 const netSaleAmount = shop.saleAmount - shop.rcAmount;
 const gramCount = shop.saleGram + shop.rcGram;

 const prevShop = prevWeekDist[shop.name];
 const prevGramCount = prevShop ? prevShop.saleGram + prevShop.rcGram : 0;
 const gramPercentChange = prevShop && prevGramCount > 0
 ? ((gramCount - prevGramCount) / prevGramCount) * 100
 : 0;

 const pct = (current: number, previous: number) =>
 previous > 0 ? ((current - previous) / previous) * 100 : 0;

 return {
 name: shop.name,
 saleGram: shop.saleGram,
 rcGram: shop.rcGram,
 netSaleGram,
 saleQty: shop.saleQty,
 rcQty: shop.rcQty,
 netSaleQty,
 saleAmount: shop.saleAmount,
 rcAmount: shop.rcAmount,
 netSaleAmount,
 totalAmount: shop.saleAmount + shop.rcAmount,
 gramCount,
 totalQty: shop.saleQty + shop.rcQty,
 gramPercentChange,
 hasPrev: !!prevShop,
 categoryChanges: {
 Sale: {
 gram: shop.saleGram,
 qty: shop.saleQty,
 amount: shop.saleAmount,
 gramPercentChange: pct(shop.saleGram, prevShop?.saleGram ?? 0),
 },
 RC: {
 gram: shop.rcGram,
 qty: shop.rcQty,
 amount: shop.rcAmount,
 gramPercentChange: pct(shop.rcGram, prevShop?.rcGram ?? 0),
 },
'Net Sale': {
 gram: netSaleGram,
 qty: netSaleQty,
 amount: netSaleAmount,
 gramPercentChange: pct(netSaleGram, prevShop ? prevShop.saleGram - prevShop.rcGram : 0),
 },
 },
 };
 })
 .sort((a, b) => b.totalAmount - a.totalAmount);
 }, [displayData, filteredData, selectedWeek]);

 const renderSaleTrendTooltip = ({ active, payload }: { active?: boolean; payload?: readonly any[] }) => {
 if (!active || !payload?.length) return null;
 const d = payload[0].payload;
 return (
 <div className="bg-white text-[#262626] p-3 rounded-xl text-xs shadow-sm border border-[#e8e8e8] min-w-[220px]">
 <div className="flex justify-between items-center border-b border-[#f0f0f0] pb-2 mb-2">
 <span className="font-bold text-[#8c8c8c]">Total Amount:</span>
 <div className="flex items-center gap-2">
 {d.hasPrev && (
 <span className={`text-[10px] font-medium ${d.gramPercentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {d.gramPercentChange > 0 ? '+' : ''}{d.gramPercentChange.toFixed(1)}%
 </span>
 )}
 <span className="font-bold text-orange-500 text-sm">{d.totalAmount.toLocaleString()} MMK</span>
 </div>
 </div>
 <div className="flex justify-between items-center border-b border-[#f0f0f0] pb-2 mb-2">
 <span className="font-bold text-[#8c8c8c]">Total Gram:</span>
 <div className="flex items-center gap-2">
 {d.hasPrev && (
 <span className={`text-[10px] font-medium ${d.gramPercentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {d.gramPercentChange > 0 ? '+' : ''}{d.gramPercentChange.toFixed(1)}%
 </span>
 )}
 <span className="font-bold text-emerald-600 text-sm">{d.gramCount.toFixed(2)}</span>
 </div>
 </div>
 <div className="space-y-1.5">
 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Sale, RC, Net Sale</p>
 {SALE_TREND_SERIES.map((name) => {
 const cat = d.categoryChanges[name];
 return (
 <div key={name} className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SALE_TREND_COLORS[name] }} />
 <span className="text-gray-200 font-medium">{name}</span>
 </div>
 <div className="flex items-center gap-2">
 {d.hasPrev && (
 <span className={`text-[9px] font-bold ${cat.gramPercentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {cat.gramPercentChange > 0 ? '+' : ''}{cat.gramPercentChange.toFixed(1)}%
 </span>
 )}
 <div className="flex flex-col items-end">
 <span className="font-semibold text-[#262626]">{cat.qty} Qty | {cat.gram.toFixed(2)}g</span>
 <span className="text-[9px] text-gray-400 font-medium">{cat.amount.toLocaleString()} MMK</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 };

 const renderShopDistributionTooltip = ({ active, payload, label }: { active?: boolean; payload?: readonly any[]; label?: string | number }) => {
 if (!active || !payload?.length) return null;
 const d = payload[0].payload;
 return (
 <div className="bg-white text-[#262626] px-3.5 py-3 rounded-xl text-[12px] font-semibold shadow-sm min-w-[260px]">
 <p className="text-[13px] font-semibold border-b border-[#f0f0f0] pb-2 mb-2">{label}</p>
 <div className="space-y-1 mb-3">
 <div className="flex justify-between gap-3">
 <span className="text-gray-400">Total Amount:</span>
 <div className="flex items-center gap-2">
 {d.hasPrev && (
 <span className={`text-[10px] font-medium ${d.gramPercentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {d.gramPercentChange > 0 ? '+' : ''}{d.gramPercentChange.toFixed(1)}%
 </span>
 )}
 <span className="text-orange-500">{d.totalAmount.toLocaleString()} MMK</span>
 </div>
 </div>
 <div className="flex justify-between gap-3">
 <span className="text-gray-400">Total Gram:</span>
 <div className="flex items-center gap-2">
 {d.hasPrev && (
 <span className={`text-[10px] font-medium ${d.gramPercentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {d.gramPercentChange > 0 ? '+' : ''}{d.gramPercentChange.toFixed(1)}%
 </span>
 )}
 <span className="text-emerald-600">{d.gramCount.toFixed(2)}</span>
 </div>
 </div>
 </div>
 <p className="text-[10px] uppercase tracking-wider text-[#8c8c8c] mb-2">Sale, RC, Net Sale</p>
 {SALE_TREND_SERIES.map((name) => {
 const cat = d.categoryChanges[name];
 return (
 <div key={name} className="flex justify-between items-center gap-3 mb-1">
 <span className="flex items-center text-[11px]">
 <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: SALE_TREND_COLORS[name] }} />
 {name}
 </span>
 <div className="flex items-center gap-2">
 {d.hasPrev && (
 <span className={`text-[9px] font-bold ${cat.gramPercentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {cat.gramPercentChange > 0 ? '+' : ''}{cat.gramPercentChange.toFixed(1)}%
 </span>
 )}
 <div className="flex flex-col items-end">
 <span className="text-[11px]">{cat.qty} Qty | {cat.gram.toFixed(2)}g</span>
 <span className="text-[10px] text-emerald-300 font-medium">{cat.amount.toLocaleString()} MMK</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 );
 };

 return (
 <div className="space-y-3">
 <div className="flex justify-end">
 <button
 onClick={handleExportPDF}
 disabled={isExporting}
 className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1677ff] px-3 text-xs font-semibold text-white hover:bg-[#4096ff] disabled:bg-[#d9d9d9]"
 >
 <Download className="h-3.5 w-3.5" />
 {isExporting ? 'Exporting...' : 'Export PDF'}
 </button>
 </div>
 <div ref={overviewRef} className="space-y-3">
 <SummaryCards data={displayData} />

 <motion.section
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.05 }}
 className="mt-1"
 >
 <h3 className="mb-2 px-0.5 text-sm font-semibold text-[#262626]">Monthly Sale Trend</h3>
 <div className="h-72 rounded-xl border border-[#e8e8e8] bg-white p-3 outline-none">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart
 data={monthlyTrendData}
 margin={{ top: 52, right: 8, left: 0, bottom: 0 }}
 barGap={10}
 barCategoryGap="22%"
 className="outline-none"
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
 <XAxis 
 dataKey="monthLabel" 
 axisLine={false} 
 tickLine={false} 
 tick={(props: any) => {
 const { x, y, payload } = props;
 const monthName = new Date(payload.value).toLocaleDateString('en-US', { month: 'long' });
 const isActive = selectedMonth !=='All' && selectedMonth === monthName;

 return (
 <g transform={`translate(${x},${y})`}>
 {isActive && (
 <rect
 x={-36}
 y={-18}
 width={72}
 height={20}
 rx={8}
 fill="#1677ff"
 fillOpacity={0.12}
 />
 )}
 <text
 x={0}
 y={0}
 dy={12}
 textAnchor="middle"
 fontSize={11}
 fontWeight={isActive ? 700 : 500}
 fill={isActive ? '#1677ff' : '#8E8E93'}
 >
 {payload.value}
 </text>
 </g>
 );
 }}
 />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E8E93' }} tickFormatter={formatAmountAxisTick} />
 <Tooltip 
 cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
 content={renderSaleTrendTooltip}
 />
 {renderSaleTrendBars('month', (data) => handleMonthBarClick(data.month))}
 <Legend 
 verticalAlign="top" 
 align="right" 
 iconType="circle"
 wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
 onClick={handleLegendClick}
 />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </motion.section>

 <motion.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.15 }}
 className="mt-8"
 >
 <h3 className="mb-2 px-0.5 text-sm font-semibold text-[#262626]">Weekly Sale Trend</h3>
 <div className="h-96 rounded-xl border border-[#e8e8e8] bg-white p-4 outline-none">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart
 data={trendData}
 margin={{ top: 52, right: 8, left: 0, bottom: 0 }}
 barGap={10}
 barCategoryGap="22%"
 className="outline-none"
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
 <XAxis 
 dataKey="weekLabel" 
 axisLine={false} 
 tickLine={false} 
 tick={(props: any) => {
 const { x, y, payload } = props;
 const isActive = selectedWeek === payload.value;

 return (
 <g transform={`translate(${x},${y})`}>
 {isActive && (
 <rect
 x={-30}
 y={-18}
 width={60}
 height={20}
 rx={8}
 fill="#1677ff"
 fillOpacity={0.12}
 />
 )}
 <text
 x={0}
 y={0}
 dy={12}
 textAnchor="middle"
 fontSize={12}
 fontWeight={isActive ? 700 : 500}
 fill={isActive ? '#1677ff' : '#8E8E93'}
 >
 {payload.value}
 </text>
 </g>
 );
 }}
 />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E8E93' }} tickFormatter={formatAmountAxisTick} />
 <Tooltip 
 cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
 content={renderSaleTrendTooltip}
 />
 {renderSaleTrendBars('week', (data) => {
 setSelectedWeek(selectedWeek === data.week ? null : data.week);
 })}
 <Legend 
 verticalAlign="top" 
 align="right" 
 iconType="circle"
 wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
 onClick={handleLegendClick}
 />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </motion.section>

 <motion.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 className="mt-16"
 >
 <h3 className="text-sm font-semibold text-[#262626] mb-2 px-0.5 flex items-center">
 <Store className="w-5 h-5 mr-2 text-[#1677ff]" />
 Shop Distribution Breakdown
 </h3>
 <div className="h-96 rounded-xl border border-[#e8e8e8] bg-white p-4 outline-none">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart
 data={shopDistribution}
 margin={{ top: 52, right: 10, left: 0, bottom: 20 }}
 barGap={10}
 barCategoryGap="22%"
 className="outline-none"
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
 <XAxis 
 dataKey="name" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 11, fill: '#8E8E93', fontWeight: 500 }}
 interval={0}
 angle={-15}
 textAnchor="end"
 />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={formatAmountAxisTick} />
 <Tooltip 
 cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
 content={renderShopDistributionTooltip}
 />
 <Legend 
 verticalAlign="top" 
 align="right" 
 iconType="circle" 
 wrapperStyle={{ fontSize: '11px', paddingBottom: '20px', cursor: 'pointer' }}
 onClick={handleLegendClick}
 formatter={(value, entry: any) => {
 const isHidden = hiddenSeries[value];
 return <span style={{ color: isHidden ? '#ccc' : '#8E8E93', textDecoration: isHidden ? 'line-through' : 'none' }}>{value}</span>;
 }}
 />
 {renderSaleTrendBars('shop', (data) => {
 if (data?.name) {
 setSelectedDetail(data.name);
 setActiveTab('detail');
 }
 }, 1500)}
 </BarChart>
 </ResponsiveContainer>
 </div>
 </motion.section>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
 <div className="lg:col-span-7 space-y-4">
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="rounded-xl border border-[#e8e8e8] bg-white p-4"
 >
 <div className="flex justify-between items-start mb-6">
 <div className="flex gap-12">
 <div>
 <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
 {selectedWeek ? `Week of ${selectedWeek}` : (selectedDay ? `${selectedDay} Total` : 'Daily Average')}
 </p>
 <h2 className="text-4xl font-bold text-black tracking-tight">
 {selectedDay || selectedWeek ? totalQty : dailyAvg}
 </h2>
 <div className="flex items-center mt-2 text-[14px] text-gray-500">
 <ArrowUpRight className="w-4 h-4 mr-1 text-[#1677ff]" />
 <span>Qty</span>
 </div>
 </div>
 <div>
 <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
 Total Gram
 </p>
 <h2 className="text-4xl font-bold text-black tracking-tight">
 {totalGram.toFixed(2)}
 </h2>
 <div className="flex items-center mt-2 text-[14px] text-gray-500">
 <Users className="w-4 h-4 mr-1 text-emerald-500" />
 <span>Grams</span>
 </div>
 </div>
 <div>
 <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
 Total Amount
 </p>
 <h2 className="text-4xl font-bold text-black tracking-tight">
 {totalAmount.toLocaleString()}
 </h2>
 <div className="flex items-center mt-2 text-[14px] text-gray-500">
 <ArrowUpRight className="w-4 h-4 mr-1 text-orange-500" />
 <span>MMK</span>
 </div>
 </div>
 </div>
 <div className="bg-blue-50 p-3 rounded-xl">
 <ShoppingBag className="w-8 h-8 text-[#1677ff]" />
 </div>
 </div>

 <div className="h-64 w-full mt-8">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} className="outline-none">
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
 <XAxis 
 dataKey="day" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 13, fill: '#8E8E93', fontWeight: 500 }}
 dy={10}
 />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E8E93' }} />
 <Tooltip 
 cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
 content={({ active, payload }) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-white text-[#262626] px-2 py-1 rounded-md text-[9px] font-semibold shadow-lg">
 {`${payload[0].value} transactions`}
 </div>
 );
 }
 return null;
 }}
 />
 <Bar 
 dataKey="value" 
 radius={[6, 6, 0, 0]} 
 barSize={32}
 onClick={(data: any) => {
 if (selectedDay === data.day) {
 setSelectedDay(null);
 } else {
 setSelectedDay(data.day);
 }
 }}
 className="cursor-pointer"
 animationDuration={1000}
 >
 {chartData.map((entry, index) => (
 <Cell 
 key={`cell-${index}`} 
 fill={selectedDay === entry.day ? '#1677ff' : (entry.value > 0 ? '#D1D1D6' : '#E5E5EA')} 
 className="transition-all duration-500"
 />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>

 <button 
 onClick={() => {
 setSelectedDay(null);
 setSelectedWeek(null);
 }}
 className={`w-full mt-8 flex items-center justify-between text-[16px] font-semibold border-t border-[#e8e8e8] pt-5 transition-colors ${selectedDay || selectedWeek ? 'text-[#1677ff]' : 'text-[#8c8c8c]'}`}
 >
 <span>
 {selectedWeek && selectedDay ? `Showing ${selectedDay} in Week of ${selectedWeek}` : 
 selectedWeek ? `Showing Week of ${selectedWeek}` :
 selectedDay ? `Showing ${selectedDay} only` : 
'Tap a day to filter results'}
 </span>
 <div className="flex items-center gap-2">
 {(selectedDay || selectedWeek) && <span className="text-[13px] font-bold uppercase tracking-wider">Clear</span>}
 <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${selectedDay || selectedWeek ? 'rotate-90' : ''}`} />
 </div>
 </button>
 </motion.div>

 <motion.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 >
 <h3 className="text-sm font-semibold text-[#262626] mb-2 px-0.5 flex items-center">
 <ShoppingBag className="w-5 h-5 mr-2 text-emerald-500" />
 Item Main Group
 </h3>
 <div className="h-[300px] rounded-xl border border-[#e8e8e8] bg-white p-4">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={itemMainGroupStats} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F2F2F7" />
 <XAxis 
 type="number" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 12, fill: '#8E8E93' }} 
 />
 <YAxis 
 type="category" 
 dataKey="name" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 13, fill: '#1C1C1E', fontWeight: 600 }} 
 width={80}
 />
 <Tooltip 
 cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
 content={({ active, payload }) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-white text-[#262626] px-3 py-2 rounded-xl text-sm font-semibold shadow-lg">
 {`${payload[0].value} Qty`}
 </div>
 );
 }
 return null;
 }}
 />
 <Bar 
 dataKey="count" 
 radius={[0, 6, 6, 0]} 
 barSize={24}
 animationDuration={1500}
 >
 {itemMainGroupStats.map((entry, index) => {
 const colors = ['#52c41a','#30B0C7','#1677ff','#5856D6','#AF52DE'];
 return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
 })}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </motion.section>
 </div>

 <div className="lg:col-span-5 space-y-4">
 <motion.section
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.5 }}
 >
 <div className="flex items-center justify-between mb-2 px-0.5">
 <h3 className="text-sm font-semibold text-[#262626]">
 {showsAllBranches || selectedBranches.length > 1 ? 'Top Branches' : 'Top Staff Performance'}
 </h3>
 <button 
 onClick={() => setShowAllMostUsed(!showAllMostUsed)}
 className="text-[#1677ff] text-[15px] font-semibold hover:text-blue-600 transition-colors"
 >
 {showAllMostUsed ? 'Show Less' : 'View All'}
 </button>
 </div>
 <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white">
 {mostUsed.map((item, index) => (
 <motion.div 
 key={item.name}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: index * 0.05 }}
 className={`flex items-center justify-between p-5 ${index !== mostUsed.length - 1 ? 'border-b border-[#e8e8e8]' : ''} hover:bg-[#fafafa] transition-colors cursor-pointer group`}
 onClick={() => {
 setSelectedDetail(item.name);
 setActiveTab('detail');
 }}
 >
 <div className="flex items-center space-x-4">
 <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform" style={{ backgroundColor: item.color }}>
 {showsAllBranches || selectedBranches.length > 1 ? <Store className="w-6 h-6" /> : <User className="w-6 h-6" />}
 </div>
 <div>
 <p className="text-[16px] font-bold text-black">{item.name}</p>
 <p className="text-[13px] text-gray-400 font-medium">
 {showsAllBranches || selectedBranches.length > 1
 ? getBranchLocation(item.name)
 : 'Total Qty'}
 </p>
 </div>
 </div>
 <div className="flex items-center space-x-3">
 <div className="text-right">
 <span className="text-[17px] font-bold text-black block leading-none">{item.count}</span>
 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
 Qty
 </span>
 </div>
 <ChevronRight className="w-5 h-5 text-[#8c8c8c] group-hover:text-[#1677ff] transition-colors" />
 </div>
 </motion.div>
 ))}
 </div>
 </motion.section>

 <motion.section
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.6 }}
 >
 <h3 className="text-sm font-semibold text-[#262626] mb-2 px-0.5">Qty Distribution</h3>
 <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white">
 <div className="space-y-6 p-6">
 {categories.map((cat) => (
 <div 
 key={cat.name} 
 className="space-y-2 cursor-pointer group"
 onClick={() => setSelectedItemType(cat.name)}
 >
 <div className="flex justify-between text-[14px] font-bold">
 <span className="text-black group-hover:text-[#1677ff] transition-colors">{cat.name}</span>
 <div className="flex items-center gap-2">
 <span className="text-gray-400">{cat.count} Qty</span>
 <span className="text-[11px] bg-[#f0f0f0] px-1.5 py-0.5 rounded text-gray-500">{cat.percent.toFixed(0)}%</span>
 </div>
 </div>
 <div className="h-2.5 w-full bg-[#f0f0f0] rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${cat.percent}%` }}
 transition={{ duration: 1.5, ease: "circOut" }}
 className="h-full rounded-full shadow-sm group-hover:opacity-80 transition-opacity"
 style={{ backgroundColor: cat.color }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </motion.section>
 </div>

 <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 <motion.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.7 }}
 >
 <h3 className="text-sm font-semibold text-[#262626] mb-2 px-0.5 flex items-center">
 <PieChartIcon className="w-5 h-5 mr-2 text-[#1677ff]" />
 Top 7 Item Categories
 </h3>
 <div className="h-[350px] rounded-xl border border-[#e8e8e8] bg-white p-4">
 <DonutChart 
 data={itemCategoryStats.top7} 
 colors={['#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f','#5856D6','#30B0C7']}
 />
 </div>
 </motion.section>

 <motion.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.8 }}
 >
 <h3 className="text-sm font-semibold text-[#262626] mb-2 px-0.5 flex items-center">
 <PieChartIcon className="w-5 h-5 mr-2 text-red-500" />
 Bottom 7 Item Categories
 </h3>
 <div className="h-[350px] rounded-xl border border-[#e8e8e8] bg-white p-4">
 <DonutChart 
 data={itemCategoryStats.bottom7} 
 colors={['#ff4d4f','#fa8c16','#FFCC00','#AF52DE','#5856D6','#1677ff','#52c41a']}
 />
 </div>
 </motion.section>

 <motion.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.9 }}
 >
 <h3 className="text-sm font-semibold text-[#262626] mb-2 px-0.5 flex items-center">
 <MapPin className="w-5 h-5 mr-2 text-emerald-500" />
 Top 7 Township
 </h3>
 <div className="h-[350px] rounded-xl border border-[#e8e8e8] bg-white p-4">
 <DonutChart 
 data={townshipStats} 
 colors={['#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f','#5856D6','#30B0C7']}
 />
 </div>
 </motion.section>
 </div>
 </div>
 </div>

 </div>
 );
});

export default OverviewView;
