import React, { useState, useMemo, memo } from'react';
import { motion } from'motion/react';
import { GitCompare, Calendar, X, ArrowUpDown, ArrowUp, ArrowDown } from'lucide-react';
import { 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 Tooltip, 
 ResponsiveContainer, 
 Cell, 
 Legend,
 CartesianGrid,
 LineChart,
 Line
} from'recharts';
import { DataRow } from'../types';
import SummaryCards from'./SummaryCards';
import { getExtractedReason, parseSafeDate } from'../utils';

interface CompareViewProps {
 data: DataRow[];
 allBranches: string[];
 selectedMonth: string;
 highPerformanceMode?: boolean;
}

function CompareView({ data, allBranches, selectedMonth, highPerformanceMode }: CompareViewProps) {
 const [selectedBranches, setSelectedBranches] = useState<string[]>(allBranches.slice(0, 2));
 const [showAllDaily, setShowAllDaily] = useState(false);
 const [viewMode, setViewMode] = useState<'daily' |'monthly'>('daily');
 const [filterWeek, setFilterWeek] = useState<string | null>(null);
 const [filterDay, setFilterDay] = useState<string | null>(null);
 const [filterBranch, setFilterBranch] = useState<string | null>(null);
 const [metricMode, setMetricMode] = useState<'amount' |'qty'>('amount');
 const [branchSortField, setBranchSortField] = useState<'sale' |'rc' |'total' |'net'>('sale');
 const [branchSortOrder, setBranchSortOrder] = useState<'asc' |'desc'>('desc');

 type Perf = { qty: number; gram: number; amount: number };

 const toggleBranch = (branch: string) => {
 if (selectedBranches.includes(branch)) {
 if (selectedBranches.length > 1) {
 setSelectedBranches(selectedBranches.filter(b => b !== branch));
 }
 } else {
 if (selectedBranches.length < 3) {
 setSelectedBranches([...selectedBranches, branch]);
 }
 }
 };

 const filteredData = useMemo(() => {
 return data.filter(row => selectedBranches.includes(row['Branch အမည်']));
 }, [data, selectedBranches]);

 const monthFilteredData = useMemo(() => {
 if (selectedMonth ==='All') return filteredData;
 return filteredData.filter(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 return date && date.toLocaleDateString('en-US', { month: 'long' }) === selectedMonth;
 });
 }, [filteredData, selectedMonth]);

 const chartFilteredData = useMemo(() => {
 return monthFilteredData.filter(row => {
 const branch = row['Branch အမည်'];
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (!date) return false;

 if (filterBranch && branch !== filterBranch) return false;

 if (filterDay) {
 const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 if (days[date.getDay()] !== filterDay) return false;
 }
 if (filterWeek) {
 const weeks = ['1 week','2 week','3 week','4 week','exter day'];
 const day = date.getDate();
 const weekIdx = day > 28 ? 4 : Math.floor((day - 1) / 7);
 if (weeks[weekIdx] !== filterWeek) return false;
 }
 return true;
 });
 }, [monthFilteredData, filterWeek, filterDay, filterBranch]);

 const branchComparisonData = useMemo(() => {
 const branches: Record<string, { 
 name: string, 
 amount: number, 
 qty: number, 
 gram: number 
 }> = {};

 selectedBranches.forEach(branch => {
 branches[branch] = { name: branch, amount: 0, qty: 0, gram: 0 };
 });

 monthFilteredData.forEach(row => {
 const branch = row['Branch အမည်'];
 if (branches[branch]) {
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const gram = parseFloat(row['Gram'] ||'0');
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;

 branches[branch].amount += isNaN(amount) ? 0 : amount;
 branches[branch].gram += isNaN(gram) ? 0 : gram;
 branches[branch].qty += isNaN(qty) ? 1 : qty;
 }
 });

 return Object.values(branches);
 }, [monthFilteredData, selectedBranches]);

 const monthlyComparisonData = useMemo(() => {
 const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const monthly: Record<string, any> = {};
 
 months.forEach(m => {
 monthly[m] = { month: m };
 selectedBranches.forEach(b => {
 monthly[m][b] = 0;
 });
 });

 filteredData.forEach(row => {
 const branch = row['Branch အမည်'];
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 
 if (date && selectedBranches.includes(branch)) {
 const monthName = months[date.getMonth()];
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 monthly[monthName][branch] += isNaN(amount) ? 0 : amount;
 }
 });

 return months.map(m => monthly[m]);
 }, [filteredData, selectedBranches]);

 const dailyPerformanceData = useMemo(() => {
 const daily: Record<string, { 
 date: string,
 branches: {
 branch: string,
 sale: { qty: number, gram: number, amount: number },
 rc: { qty: number, gram: number, amount: number },
 rp: { qty: number, gram: number, amount: number },
 total: { qty: number, gram: number, amount: number }
 }[]
 }> = {};

 chartFilteredData.forEach(row => {
 const branch = row['Branch အမည်'] ||'Unknown';
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
 if (!daily[key]) {
 daily[key] = { date: key, branches: [] };
 }
 
 let branchData = daily[key].branches.find(b => b.branch === branch);
 if (!branchData) {
 branchData = {
 branch: branch,
 sale: { qty: 0, gram: 0, amount: 0 },
 rc: { qty: 0, gram: 0, amount: 0 },
 rp: { qty: 0, gram: 0, amount: 0 },
 total: { qty: 0, gram: 0, amount: 0 }
 };
 daily[key].branches.push(branchData);
 }

 const reason = getExtractedReason(row);
 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;

 if (['Dia Sale','G Sale','PT Sale','Sale','အရောင်း'].includes(reason)) {
 branchData.sale.qty += q;
 branchData.sale.gram += g;
 branchData.sale.amount += a;
 } else if (['Dia RC','G RC','PT RC','RC','အဝယ်'].includes(reason)) {
 branchData.rc.qty += q;
 branchData.rc.gram += g;
 branchData.rc.amount += a;
 } else if (['Dia RP','G RP','PT RP','RP','ပြင်ဆင်'].includes(reason)) {
 branchData.rp.qty += q;
 branchData.rp.gram += g;
 branchData.rp.amount += a;
 }

 branchData.total.qty += q;
 branchData.total.gram += g;
 branchData.total.amount += a;
 }
 });

 return Object.values(daily)
 .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
 .map(day => ({
 ...day,
 branches: day.branches.sort((a, b) => a.branch.localeCompare(b.branch))
 }));
 }, [chartFilteredData]);

 const displayedDays = showAllDaily ? dailyPerformanceData : dailyPerformanceData.slice(0, 5);

 const monthlyPerformanceData = useMemo(() => {
 const monthly: Record<string, { 
 month: string,
 branches: {
 branch: string,
 sale: { qty: number, gram: number, amount: number },
 rc: { qty: number, gram: number, amount: number },
 rp: { qty: number, gram: number, amount: number },
 total: { qty: number, gram: number, amount: number }
 }[]
 }> = {};

 chartFilteredData.forEach(row => {
 const branch = row['Branch အမည်'] ||'Unknown';
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
 if (!monthly[monthKey]) {
 monthly[monthKey] = { month: monthKey, branches: [] };
 }
 
 let branchData = monthly[monthKey].branches.find(b => b.branch === branch);
 if (!branchData) {
 branchData = {
 branch: branch,
 sale: { qty: 0, gram: 0, amount: 0 },
 rc: { qty: 0, gram: 0, amount: 0 },
 rp: { qty: 0, gram: 0, amount: 0 },
 total: { qty: 0, gram: 0, amount: 0 }
 };
 monthly[monthKey].branches.push(branchData);
 }

 const reason = getExtractedReason(row);
 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;

 if (['Dia Sale','G Sale','PT Sale','Sale','အရောင်း'].includes(reason)) {
 branchData.sale.qty += q;
 branchData.sale.gram += g;
 branchData.sale.amount += a;
 } else if (['Dia RC','G RC','PT RC','RC','အဝယ်'].includes(reason)) {
 branchData.rc.qty += q;
 branchData.rc.gram += g;
 branchData.rc.amount += a;
 } else if (['Dia RP','G RP','PT RP','RP','ပြင်ဆင်'].includes(reason)) {
 branchData.rp.qty += q;
 branchData.rp.gram += g;
 branchData.rp.amount += a;
 }

 branchData.total.qty += q;
 branchData.total.gram += g;
 branchData.total.amount += a;
 }
 });

 return Object.values(monthly)
 .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
 .map(month => ({
 ...month,
 branches: month.branches.sort((a, b) => a.branch.localeCompare(b.branch))
 }));
 }, [chartFilteredData]);

 const displayedMonthly = showAllDaily ? monthlyPerformanceData : monthlyPerformanceData.slice(0, 5);

 const hasRpPerformance = useMemo(() => {
 const hasRp = (p: Perf) => (p.amount || 0) !== 0 || (p.qty || 0) !== 0 || (p.gram || 0) !== 0;
 return dailyPerformanceData.some((d) => d.branches.some((b) => hasRp(b.rp)))
 || monthlyPerformanceData.some((m) => m.branches.some((b) => hasRp(b.rp)));
 }, [dailyPerformanceData, monthlyPerformanceData]);

 const breakdownColSpan = 2 + (hasRpPerformance ? 1 : 0) + 3;

 const getPerfMetric = (p: Perf) => (metricMode ==='amount' ? p.amount : p.qty);
 const getNetMetric = (sale: Perf, rc: Perf) => getPerfMetric(sale) - getPerfMetric(rc);

 const getBranchSortValue = (
 row: { sale: Perf; rc: Perf; total: Perf },
 field: 'sale' |'rc' |'total' |'net'
 ) => {
 if (field ==='sale') return getPerfMetric(row.sale);
 if (field ==='rc') return getPerfMetric(row.rc);
 if (field ==='total') return getPerfMetric(row.total);
 return getNetMetric(row.sale, row.rc);
 };

 const sortBranchRows = <T extends { sale: Perf; rc: Perf; total: Perf }>(rows: T[]) =>
 [...rows].sort((a, b) => {
 const va = getBranchSortValue(a, branchSortField);
 const vb = getBranchSortValue(b, branchSortField);
 return branchSortOrder ==='asc' ? va - vb : vb - va;
 });

 const handleBranchSort = (field: 'sale' |'rc' |'total' |'net') => {
 if (branchSortField === field) {
 setBranchSortOrder(branchSortOrder ==='asc' ? 'desc' : 'asc');
 } else {
 setBranchSortField(field);
 setBranchSortOrder('desc');
 }
 };

 const renderBranchSortHeader = (field: 'sale' |'rc' |'total' |'net', label: string) => {
 const isSelected = branchSortField === field;
 return (
 <div
 onClick={() => handleBranchSort(field)}
 className="flex items-center justify-center gap-1 cursor-pointer hover:bg-white px-2 py-1 rounded-lg transition-all select-none"
 >
 <span>{label}</span>
 {isSelected ? (
 branchSortOrder ==='asc' ? (
 <ArrowUp className="w-3.5 h-3.5 shrink-0" />
 ) : (
 <ArrowDown className="w-3.5 h-3.5 shrink-0" />
 )
 ) : (
 <ArrowUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
 )}
 </div>
 );
 };

 const PerfCell = ({ perf, tone }: { perf: Perf; tone: 'sale' |'rc' |'rp' |'total' }) => {
 const toneStyles =
 tone ==='sale'
 ? 'bg-emerald-50 text-emerald-700'
 : tone ==='rc'
 ? 'bg-red-50 text-red-600'
 : tone ==='rp'
 ? 'bg-orange-50 text-orange-600'
 : 'bg-blue-50 text-blue-700';

 const value = metricMode ==='amount' ? perf.amount.toLocaleString() : perf.qty.toLocaleString();

 return (
 <div className="flex items-center justify-center">
 <span className={`px-2 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap ${toneStyles}`}>
 {value}
 </span>
 </div>
 );
 };

 const NetCell = ({ sale, rc }: { sale: Perf; rc: Perf }) => {
 const netAmount = sale.amount - rc.amount;
 const netQty = sale.qty - rc.qty;
 const isNeg = metricMode ==='amount' ? netAmount < 0 : netQty < 0;
 const value = metricMode ==='amount' ? netAmount.toLocaleString() : netQty.toLocaleString();

 return (
 <div className="flex items-center justify-center">
 <span
 className={`px-2 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap ${
 isNeg ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
 }`}
 >
 {value}
 </span>
 </div>
 );
 };

 const weeklyTrendData = useMemo(() => {
 const weekly: Record<string, any> = {};
 const weeks = ['1 week','2 week','3 week','4 week','exter day'];
 
 weeks.forEach(w => {
 weekly[w] = { name: w };
 selectedBranches.forEach(b => {
 weekly[w][b] = 0;
 weekly[w][`${b}_qty`] = 0;
 });
 });

 // We'll use the last 4 weeks of data from monthFilteredData
 monthFilteredData.forEach(row => {
 const branch = row['Branch အမည်'];
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 
 if (date && selectedBranches.includes(branch)) {
 // Simple week calculation for display purposes
 const day = date.getDate();
 const weekIdx = day > 28 ? 4 : Math.floor((day - 1) / 7);
 const weekName = weeks[weekIdx];
 
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;

 if (weekly[weekName]) {
 weekly[weekName][branch] += isNaN(amount) ? 0 : amount;
 weekly[weekName][`${branch}_qty`] += isNaN(qty) ? 1 : qty;
 }
 }
 });

 return weeks.map(w => weekly[w]);
 }, [monthFilteredData, selectedBranches]);

 const dailyTrafficData = useMemo(() => {
 const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const traffic: Record<string, any> = {};
 
 days.forEach(d => {
 traffic[d] = { name: d };
 selectedBranches.forEach(b => {
 traffic[d][b] = 0;
 traffic[d][`${b}_qty`] = 0;
 });
 });

 monthFilteredData.forEach(row => {
 const branch = row['Branch အမည်'];
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 
 if (date && selectedBranches.includes(branch)) {
 const dayName = days[date.getDay()];
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;

 traffic[dayName][branch] += isNaN(amount) ? 0 : amount;
 traffic[dayName][`${branch}_qty`] += isNaN(qty) ? 1 : qty;
 }
 });

 return days.map(d => traffic[d]);
 }, [monthFilteredData, selectedBranches]);

 const COLORS = ['#3B82F6','#10B981','#F59E0B'];

 const CustomTooltip = ({ active, payload, label }: any) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-[180px]">
 <p className="text-[14px] font-semibold text-gray-800 mb-3 border-b border-gray-50 pb-2">{label}</p>
 <div className="space-y-3">
 {payload.map((entry: any, index: number) => {
 const branchName = entry.name;
 const qty = entry.payload[`${branchName}_qty`];
 return (
 <div key={index} className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
 <span className="text-[13px] font-bold text-gray-600">{branchName}</span>
 </div>
 <div className="pl-4.5 flex flex-col">
 <span className="text-[15px] font-semibold text-gray-900">{entry.value.toLocaleString()} <span className="text-[10px] text-gray-400 font-medium">MMK</span></span>
 <span className="text-[11px] font-bold text-[#1677ff] bg-blue-50 self-start px-2 py-0.5 rounded-md mt-0.5">Qty: {qty}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 }
 return null;
 };

 return (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-8 pb-12"
 >
 {/* Selection Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
 <div>
 <h3 className="text-[24px] font-semibold text-black flex items-center gap-2">
 <GitCompare className="w-7 h-7 text-[#1677ff]" />
 Branch Comparison
 </h3>
 <p className="text-gray-400 text-[14px] mt-1 font-medium">Select up to 3 branches to compare performance metrics.</p>
 </div>
 <div className="flex flex-wrap gap-2">
 {allBranches.map((branch) => {
 const isSelected = selectedBranches.includes(branch);
 return (
 <button
 key={branch}
 onClick={() => toggleBranch(branch)}
 className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 border ${
 isSelected 
 ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
 : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 hover:border-[#e8e8e8]'
 }`}
 >
 {branch}
 </button>
 );
 })}
 </div>
 </div>

 <SummaryCards data={chartFilteredData} />

 {/* Charts Section */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Weekly Trend Comparison */}
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-white p-8 rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] border border-gray-100/80"
 >
 <h4 className="text-[20px] font-semibold text-black mb-8">Weekly Trend Comparison</h4>
 <div className="h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart 
 data={weeklyTrendData}
 onClick={(data) => {
 if (data && data.activeLabel) {
 const val = data.activeLabel;
 setFilterWeek(filterWeek === val ? null : val);
 setFilterDay(null);
 setViewMode('daily');
 setShowAllDaily(true);
 setTimeout(() => {
 document.getElementById('performance-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 100);
 }
 }}
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
 <XAxis 
 dataKey="name" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
 dy={10}
 />
 <YAxis 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 600 }}
 tickFormatter={(value) => value.toLocaleString()}
 width={80}
 />
 <Tooltip content={<CustomTooltip />} />
 <Legend 
 verticalAlign="bottom" 
 height={36} 
 iconType="circle"
 formatter={(value) => <span className="text-[13px] font-bold text-gray-600 ml-1">{value}</span>}
 />
 {selectedBranches.map((branch, index) => (
 <Line 
 key={branch}
 type="monotone" 
 dataKey={branch} 
 stroke={COLORS[index % COLORS.length]} 
 strokeWidth={3}
 dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
 activeDot={{ r: 6, strokeWidth: 0 }}
 onClick={(e) => {
 if (e) {
 setFilterBranch(filterBranch === branch ? null : branch);
 setViewMode('daily');
 setShowAllDaily(true);
 setTimeout(() => {
 document.getElementById('performance-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 100);
 }
 }}
 className="cursor-pointer"
 />
 ))}
 </LineChart>
 </ResponsiveContainer>
 </div>
 <p className="text-center text-gray-400 text-[12px] mt-6 font-medium">Click on a data point or branch line to filter the breakdown table below.</p>
 </motion.div>

 {/* Daily Traffic Comparison */}
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-white p-8 rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] border border-gray-100/80"
 >
 <h4 className="text-[20px] font-semibold text-black mb-8">Daily Traffic Comparison</h4>
 <div className="h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart 
 data={dailyTrafficData}
 onClick={(data) => {
 if (data && data.activeLabel) {
 const val = data.activeLabel;
 setFilterDay(filterDay === val ? null : val);
 setFilterWeek(null);
 setViewMode('daily');
 setShowAllDaily(true);
 setTimeout(() => {
 document.getElementById('performance-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 100);
 }
 }}
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
 <XAxis 
 dataKey="name" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
 dy={10}
 />
 <YAxis 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 600 }}
 tickFormatter={(value) => value.toLocaleString()}
 width={80}
 />
 <Tooltip content={<CustomTooltip />} />
 <Legend 
 verticalAlign="bottom" 
 height={36} 
 iconType="circle"
 formatter={(value) => <span className="text-[13px] font-bold text-gray-600 ml-1">{value}</span>}
 />
 {selectedBranches.map((branch, index) => (
 <Bar 
 key={branch}
 dataKey={branch} 
 fill={COLORS[index % COLORS.length]} 
 radius={[6, 6, 0, 0]}
 barSize={20}
 onClick={(e) => {
 if (e) {
 setFilterBranch(filterBranch === branch ? null : branch);
 setViewMode('daily');
 setShowAllDaily(true);
 setTimeout(() => {
 document.getElementById('performance-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 100);
 }
 }}
 className="cursor-pointer"
 />
 ))}
 </BarChart>
 </ResponsiveContainer>
 </div>
 <p className="text-center text-gray-400 text-[12px] mt-6 font-medium">Click on a bar or branch segment to filter the breakdown table below.</p>
 </motion.div>
 </div>

 {/* Performance Breakdown Section */}
 <motion.section
 id="performance-breakdown"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="mt-8"
 >
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-1 gap-4">
 <div className="flex items-center gap-4">
 <h3 className="text-[20px] font-semibold text-black flex items-center gap-2">
 <Calendar className="w-6 h-6 text-[#1677ff]" />
 {viewMode ==='daily' ? 'Daily' : 'Monthly'} Performance Breakdown
 </h3>
 <div className="flex bg-gray-100 p-1 rounded-xl">
 <button
 onClick={() => setViewMode('daily')}
 className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
 viewMode ==='daily' 
 ? 'bg-white text-blue-600 shadow-sm' 
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 Daily
 </button>
 <button
 onClick={() => setViewMode('monthly')}
 className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
 viewMode ==='monthly' 
 ? 'bg-white text-blue-600 shadow-sm' 
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 Monthly
 </button>
 </div>
 {(filterWeek || filterDay || filterBranch) && (
 <button
 onClick={() => {
 setFilterWeek(null);
 setFilterDay(null);
 setFilterBranch(null);
 }}
 className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[12px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
 >
 Clear Filter: {filterWeek || filterDay || filterBranch}
 <X className="w-3 h-3" />
 </button>
 )}
 <div className="flex bg-gray-100 p-1 rounded-xl">
 {(['amount','qty'] as const).map((m) => (
 <button
 key={m}
 type="button"
 onClick={() => setMetricMode(m)}
 className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all capitalize ${
 metricMode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 {m}
 </button>
 ))}
 </div>
 </div>
 <button 
 onClick={() => setShowAllDaily(!showAllDaily)}
 className="bg-white px-4 py-2 rounded-xl text-blue-600 text-[13px] font-bold border border-blue-100 hover:bg-blue-50 transition-colors shadow-sm"
 >
 {showAllDaily ? 'Show Less' : `View All ${viewMode ==='daily' ? 'Dates' : 'Months'}`}
 </button>
 </div>
 
 <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
 <div className="overflow-x-auto max-h-[700px]">
 <table className="w-full text-left border-collapse min-w-[720px]">
 <thead className="sticky top-0 z-20">
 <tr className="bg-gray-50/95 border-b border-gray-100">
 <th className="px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-32" title={viewMode ==='daily' ? 'ရက်စွဲ' : 'လ'}>
 {viewMode ==='daily' ? 'Date' : 'Month'}
 </th>
 <th className="px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-40" title="Branch အမည်">Branch</th>
 <th className="px-3 py-3 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide text-center bg-emerald-50/20" title="ရောင်းအား Performance">
 {renderBranchSortHeader('sale','Sale Performance')}
 </th>
 <th className="px-3 py-3 text-[10px] font-semibold text-red-500 uppercase tracking-wide text-center bg-red-50/20" title="Return/Cancel Performance">
 {renderBranchSortHeader('rc','RC Performance')}
 </th>
 {hasRpPerformance && (
 <th className="px-3 py-3 text-[10px] font-semibold text-orange-500 uppercase tracking-wide text-center bg-orange-50/20" title="Repair Performance">
 RP Performance
 </th>
 )}
 <th className="px-3 py-3 text-[10px] font-semibold text-blue-600 uppercase tracking-wide text-center bg-blue-100/30" title="စုစုပေါင်း">
 {renderBranchSortHeader('total','Total')}
 </th>
 <th className="px-3 py-3 text-[10px] font-semibold text-indigo-600 uppercase tracking-wide text-center bg-indigo-50/20" title="Net Sale = Sale - RC">
 {renderBranchSortHeader('net','Net Sale')}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {(viewMode ==='daily' ? displayedDays : displayedMonthly).map((item) => (
 <React.Fragment key={viewMode ==='daily' ? (item as any).date : (item as any).month}>
 <tr className="bg-gray-50/50">
 <td colSpan={breakdownColSpan} className="py-3 px-6">
 <div className="flex items-center gap-2">
 <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
 <Calendar className="w-4 h-4 text-[#1677ff]" />
 </div>
 <span className="text-[13px] font-semibold text-[#8c8c8c] uppercase tracking-wider">
 {viewMode ==='daily' ? (item as any).date : (item as any).month}
 </span>
 </div>
 </td>
 </tr>
 {sortBranchRows(item.branches).map((branchData, bIdx) => (
 <tr
 key={`${viewMode ==='daily' ? (item as any).date : (item as any).month}-${branchData.branch}`}
 className="hover:bg-blue-50/5 transition-colors group"
 >
 <td className="px-3 py-2.5"></td>
 <td className="px-3 py-2.5">
 <div className="flex items-center gap-2">
 <div
 className={`w-2 h-2 rounded-full shadow-sm ${
 COLORS[bIdx % COLORS.length] ==='#3B82F6'
 ? 'bg-[#1677ff]'
 : COLORS[bIdx % COLORS.length] ==='#10B981'
 ? 'bg-emerald-500'
 : 'bg-amber-500'
 }`}
 />
 <span className="text-[13px] font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
 {branchData.branch}
 </span>
 </div>
 </td>
 <td className="px-3 py-2.5 text-center border-l border-gray-50">
 <PerfCell perf={branchData.sale} tone="sale" />
 </td>
 <td className="px-3 py-2.5 text-center border-l border-gray-50">
 <PerfCell perf={branchData.rc} tone="rc" />
 </td>
 {hasRpPerformance && (
 <td className="px-3 py-2.5 text-center border-l border-gray-50">
 <PerfCell perf={branchData.rp} tone="rp" />
 </td>
 )}
 <td className="px-3 py-2.5 text-center border-l border-gray-50 bg-blue-50/10">
 <PerfCell perf={branchData.total} tone="total" />
 </td>
 <td className="px-3 py-2.5 text-center border-l border-gray-50 bg-indigo-50/10">
 <NetCell sale={branchData.sale} rc={branchData.rc} />
 </td>
 </tr>
 ))}
 </React.Fragment>
 ))}
 </tbody>
 </table>
 </div>
 {!showAllDaily && (viewMode ==='daily' ? dailyPerformanceData.length > 5 : monthlyPerformanceData.length > 5) && (
 <div className="p-4 text-center border-t border-gray-100 bg-gray-50/30">
 <button 
 onClick={() => setShowAllDaily(true)}
 className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center mx-auto gap-2 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-blue-50 transition-all "
 >
 View Full {viewMode ==='daily' ? 'Daily' : 'Monthly'} Breakdown
 <Calendar className="w-4 h-4" />
 </button>
 </div>
 )}
 </div>
 </motion.section>
 </motion.div>
 );
}

export default memo(CompareView);
