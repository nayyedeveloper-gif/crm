import React, { useState, useMemo } from'react';
import { motion } from'motion/react';
import { User, Search, Calendar, Edit2, ExternalLink, X, Camera, ArrowUpRight, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download } from'lucide-react';
import { DataRow, StaffProfile } from'../types';
import SummaryCards from'./SummaryCards';
import { branchFilterShowsAll, getExtractedReason, parseSafeDate } from'../utils';
import * as XLSX from'xlsx';

interface StaffViewProps {
 data: DataRow[];
 selectedMonth: string;
 onSelectStaff: (name: string) => void;
 selectedBranches: string[];
 startDate: string;
 endDate: string;
 highPerformanceMode: boolean;
}

const StaffView = React.memo(({ data, selectedMonth, onSelectStaff, selectedBranches, startDate, endDate, highPerformanceMode }: StaffViewProps) => {
 const showBranchColumn = branchFilterShowsAll(selectedBranches) || selectedBranches.length > 1;
 const [searchTerm, setSearchTerm] = useState('');
 const [metricMode, setMetricMode] = useState<'amount' |'qty'>('amount');
 const [staffSortField, setStaffSortField] = useState<'sale' |'rc' |'total' |'net'>('sale');
 const [staffSortOrder, setStaffSortOrder] = useState<'asc' |'desc'>('desc');
 const [showAllSummary, setShowAllSummary] = useState(false);
 const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
 const [dailyBreakdownDateOrder, setDailyBreakdownDateOrder] = useState<'asc' |'desc'>('desc');
 const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
 const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
 const [profiles, setProfiles] = useState<Record<string, StaffProfile>>(() => {
 const saved = localStorage.getItem('staffProfiles');
 return saved ? JSON.parse(saved) : {};
 });
 const [editingStaff, setEditingStaff] = useState<string | null>(null);
 const [editForm, setEditForm] = useState<StaffProfile>({});

 const handleSaveProfile = () => {
 if (editingStaff) {
 const newProfiles = { ...profiles, [editingStaff]: editForm };
 setProfiles(newProfiles);
 localStorage.setItem('staffProfiles', JSON.stringify(newProfiles));
 setEditingStaff(null);
 }
 };

 const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setEditForm({ ...editForm, photo: reader.result as string });
 };
 reader.readAsDataURL(file);
 }
 };
 
 const monthFilteredData = useMemo(() => {
 // If date range is set, use the already filtered data from parent
 if (startDate || endDate) {
 return data;
 }

 // Otherwise, apply month filtering
 if (selectedMonth ==='All') return data;
 return data.filter(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 return date && date.toLocaleDateString('en-US', { month: 'long' }) === selectedMonth;
 });
 }, [data, selectedMonth, startDate, endDate]);

 const staffList = useMemo(() => {
 const staffStats: Record<string, {
 name: string,
 branch: string,
 sale: { qty: number, gram: number, amount: number },
 rc: { qty: number, gram: number, amount: number },
 rp: { qty: number, gram: number, amount: number },
 total: { qty: number, gram: number, amount: number }
 }> = {};

 // First, get all unique staff names from the full data (not filtered)
 const allStaffNames = new Set<string>();
 data.forEach(row => {
 const name = row['အရောင်းသမားအမည်'] || row['Customer Service အမည်'] ||'Unknown';
 const branch = row['Branch အမည်'] ||'Unknown';
 allStaffNames.add(name);
 // Initialize with 0 values
 if (!staffStats[name]) {
 staffStats[name] = {
 name,
 branch,
 sale: { qty: 0, gram: 0, amount: 0 },
 rc: { qty: 0, gram: 0, amount: 0 },
 rp: { qty: 0, gram: 0, amount: 0 },
 total: { qty: 0, gram: 0, amount: 0 }
 };
 }
 });

 // Then, add up the filtered data for the selected date range
 monthFilteredData.forEach(row => {
 const name = row['အရောင်းသမားအမည်'] || row['Customer Service အမည်'] ||'Unknown';
 const branch = row['Branch အမည်'] ||'Unknown';
 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;

 if (!staffStats[name]) {
 staffStats[name] = {
 name,
 branch,
 sale: { qty: 0, gram: 0, amount: 0 },
 rc: { qty: 0, gram: 0, amount: 0 },
 rp: { qty: 0, gram: 0, amount: 0 },
 total: { qty: 0, gram: 0, amount: 0 }
 };
 }
 const reason = getExtractedReason(row);
 if (['Dia Sale','G Sale','PT Sale','Sale','အရောင်း'].includes(reason)) {
 staffStats[name].sale.qty += q;
 staffStats[name].sale.gram += g;
 staffStats[name].sale.amount += a;
 } else if (['Dia RC','G RC','PT RC','RC','အဝယ်'].includes(reason)) {
 staffStats[name].rc.qty += q;
 staffStats[name].rc.gram += g;
 staffStats[name].rc.amount += a;
 } else if (['Dia RP','G RP','PT RP','RP','ပြင်ဆင်'].includes(reason)) {
 staffStats[name].rp.qty += q;
 staffStats[name].rp.gram += g;
 staffStats[name].rp.amount += a;
 }

 staffStats[name].total.qty += q;
 staffStats[name].total.gram += g;
 staffStats[name].total.amount += a;
 });

 return Object.values(staffStats)
 .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.branch.toLowerCase().includes(searchTerm.toLowerCase()))
 .sort((a, b) => b.sale.amount - a.sale.amount);
 }, [data, monthFilteredData, searchTerm]);

 type StaffDayRow = {
 date: string;
 dateSort: number;
 qty: number;
 totalAmount: number;
 sale: { qty: number; amount: number };
 rc: { qty: number; amount: number };
 categories: Record<string, { sale: { qty: number; amount: number }; rc: { qty: number; amount: number }; total: { qty: number; amount: number }; customers: Set<string> }>;
 };

 const staffDailyBreakdown = useMemo(() => {
 const map: Record<string, Record<string, StaffDayRow>> = {};

 // Get all unique staff names from full data
 const allStaffNames = new Set<string>();
 data.forEach(row => {
 const name = row['အရောင်းသမားအမည်'] || row['Customer Service အမည်'] ||'Unknown';
 allStaffNames.add(name);
 });

 // If date range is set, initialize all dates in range for all staff
 if (startDate && endDate) {
 const start = new Date(startDate);
 const end = new Date(endDate);

 allStaffNames.forEach(name => {
 if (!map[name]) map[name] = {};

 const currentDate = new Date(start);
 while (currentDate <= end) {
 const dateKey = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;
 const dateSort = currentDate.getTime();

 map[name][dateKey] = {
 date: dateKey,
 dateSort,
 qty: 0,
 totalAmount: 0,
 sale: { qty: 0, amount: 0 },
 rc: { qty: 0, amount: 0 },
 categories: {}
 };

 currentDate.setDate(currentDate.getDate() + 1);
 }
 });
 }

 // Add up the actual data from filtered data
 monthFilteredData.forEach((row) => {
 const name = row['အရောင်းသမားအမည်'] || row['Customer Service အမည်'] ||'Unknown';
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (!date) return;

 const dateKey = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
 const dateSort = date.getTime();

 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;

 if (!map[name]) map[name] = {};
 if (!map[name][dateKey]) {
 map[name][dateKey] = {
 date: dateKey,
 dateSort,
 qty: 0,
 totalAmount: 0,
 sale: { qty: 0, amount: 0 },
 rc: { qty: 0, amount: 0 },
 categories: {}
 };
 }

 const day = map[name][dateKey];
 day.qty += q;
 day.totalAmount += a;

 const reason = getExtractedReason(row);
 const category = row['Item Category'] || row['Category'] ||'Other';

 if (!day.categories[category]) {
 day.categories[category] = {
 sale: { qty: 0, amount: 0 },
 rc: { qty: 0, amount: 0 },
 total: { qty: 0, amount: 0 },
 customers: new Set<string>()
 };
 }

 const catData = day.categories[category];
 catData.total.qty += q;
 catData.total.amount += a;

 const customerName = row['ဝယ်သူ အမည်'] || row['Customer Name'] || row['ဖောက်သည်အမည်'] || row['Customer'] ||'Unknown';
 catData.customers.add(customerName);

 if (['Dia Sale','G Sale','PT Sale','Sale','အရောင်း'].includes(reason)) {
 day.sale.qty += q;
 day.sale.amount += a;
 catData.sale.qty += q;
 catData.sale.amount += a;
 } else if (['Dia RC','G RC','PT RC','RC','အဝယ်'].includes(reason)) {
 day.rc.qty += q;
 day.rc.amount += a;
 catData.rc.qty += q;
 catData.rc.amount += a;
 }
 });

 const result: Record<string, StaffDayRow[]> = {};
 Object.entries(map).forEach(([name, days]) => {
 result[name] = Object.values(days);
 });
 return result;
 }, [data, monthFilteredData, startDate, endDate]);

 const getSortedDailyBreakdown = (staffName: string) => {
 const rows = staffDailyBreakdown[staffName] || [];
 return [...rows].sort((a, b) =>
 dailyBreakdownDateOrder ==='asc' ? a.dateSort - b.dateSort : b.dateSort - a.dateSort
 );
 };

 const handleDailyDateSort = (e: React.MouseEvent) => {
 e.stopPropagation();
 setDailyBreakdownDateOrder((order) => (order ==='asc' ? 'desc' : 'asc'));
 };

 const toggleDayExpansion = (date: string) => {
 setExpandedDays(prev => {
 const newSet = new Set(prev);
 if (newSet.has(date)) {
 newSet.delete(date);
 } else {
 newSet.add(date);
 }
 return newSet;
 });
 };

 const handleExportExcel = () => {
 const exportData = staffList.map(staff => ({
'Employee Name': staff.name,
'Branch': staff.branch,
'Sale Qty': staff.sale.qty,
'Sale Amount': staff.sale.amount,
'Sale Gram': staff.sale.gram,
'RC Qty': staff.rc.qty,
'RC Amount': staff.rc.amount,
'RC Gram': staff.rc.gram,
'RP Qty': staff.rp.qty,
'RP Amount': staff.rp.amount,
'RP Gram': staff.rp.gram,
'Total Qty': staff.total.qty,
'Total Amount': staff.total.amount,
'Total Gram': staff.total.gram,
'Net Amount': staff.sale.amount - staff.rc.amount
 }));

 const ws = XLSX.utils.json_to_sheet(exportData);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws,'Staff Performance');
 XLSX.writeFile(wb,'staff-performance.xlsx');
 };

 const COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899'];

 type Perf = { qty: number; gram: number; amount: number };
 const getMetricLabel = () => (metricMode ==='amount' ? 'Amount' : 'Qty');
 const formatMetricValue = (perf: Perf) => {
 if (metricMode ==='amount') return perf.amount.toLocaleString();
 return perf.qty.toLocaleString();
 };

 const PerfCell = ({ perf, tone }: { perf: Perf; tone: 'sale' |'rc' |'rp' |'total' }) => {
 const toneStyles =
 tone ==='sale'
 ? { pill: 'bg-emerald-50 text-emerald-700', hint: 'text-emerald-500' }
 : tone ==='rc'
 ? { pill: 'bg-red-50 text-red-600', hint: 'text-red-500' }
 : tone ==='rp'
 ? { pill: 'bg-orange-50 text-orange-600', hint: 'text-orange-500' }
 : { pill: 'bg-blue-50 text-blue-700', hint: 'text-blue-600' };

 return (
 <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">
 {metricMode ==='amount' ? (
 <span className={`px-2 py-1 rounded-xl ${toneStyles.pill}`}>{perf.amount.toLocaleString()}</span>
 ) : (
 <span className="px-2 py-1 rounded-xl bg-gray-50 text-[#8c8c8c]">{perf.qty}</span>
 )}
 </div>
 );
 };

 const DiffCell = ({ sale, rc }: { sale: Perf; rc: Perf }) => {
 const diffQty = sale.qty - rc.qty;
 const diffGram = sale.gram - rc.gram;
 const diffAmount = sale.amount - rc.amount;
 const isNeg = diffAmount < 0;
 const diffValue = metricMode ==='amount' ? diffAmount.toLocaleString() : diffQty.toLocaleString();
 return (
 <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">
 {metricMode ==='amount' ? (
 <span className={`px-2 py-1 rounded-xl ${isNeg ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>
 {diffAmount.toLocaleString()}
 </span>
 ) : (
 <span className="px-2 py-1 rounded-xl bg-gray-50 text-[#8c8c8c]">{diffQty}</span>
 )}
 </div>
 );
 };

 const hasRpPerformance = useMemo(() => {
 const hasRp = (p: Perf) => (p.amount || 0) !== 0 || (p.qty || 0) !== 0 || (p.gram || 0) !== 0;
 return staffList.some((s: any) => hasRp(s.rp));
 }, [staffList]);

 const getPerfMetric = (p: Perf) => (metricMode ==='amount' ? p.amount : p.qty);
 const getNetMetric = (s: Perf, r: Perf) => getPerfMetric(s) - getPerfMetric(r);

 const sortedStaffList = useMemo(() => {
 const list = [...staffList];
 list.sort((a: any, b: any) => {
 const va =
 staffSortField ==='sale'
 ? getPerfMetric(a.sale)
 : staffSortField ==='rc'
 ? getPerfMetric(a.rc)
 : staffSortField ==='total'
 ? getPerfMetric(a.total)
 : getNetMetric(a.sale, a.rc);
 const vb =
 staffSortField ==='sale'
 ? getPerfMetric(b.sale)
 : staffSortField ==='rc'
 ? getPerfMetric(b.rc)
 : staffSortField ==='total'
 ? getPerfMetric(b.total)
 : getNetMetric(b.sale, b.rc);
 return staffSortOrder ==='asc' ? va - vb : vb - va;
 });
 return list;
 }, [staffList, staffSortField, staffSortOrder, metricMode]);


 const handleStaffSort = (field: 'sale' |'rc' |'total' |'net') => {
 if (staffSortField === field) {
 setStaffSortOrder(staffSortOrder ==='asc' ? 'desc' : 'asc');
 } else {
 setStaffSortField(field);
 setStaffSortOrder('desc');
 }
 };

 const renderStaffSortHeader = (field: 'sale' |'rc' |'total' |'net', label: string) => {
 const isSelected = staffSortField === field;
 return (
 <div
 onClick={() => handleStaffSort(field)}
 className="flex items-center justify-center gap-1 cursor-pointer hover:bg-white px-2 py-1 rounded-lg transition-all select-none"
 >
 <span>{label}</span>
 {isSelected ? (
 staffSortOrder ==='asc' ? (
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


 const summaryColSpan = (showBranchColumn ? 7 : 6) + (hasRpPerformance ? 1 : 0) + 1;

 const renderStaffActions = (staffName: string, withEdit = true) => (
 <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-1">
 {withEdit && (
 <button
 type="button"
 onClick={() => {
 setEditingStaff(staffName);
 setEditForm(profiles[staffName] || {});
 }}
 className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
 >
 <Edit2 className="w-3 h-3" />
 </button>
 )}
 <button
 type="button"
 onClick={() => onSelectStaff(staffName)}
 className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors"
 >
 <ExternalLink className="w-3 h-3 mr-1" />
 View
 </button>
 </div>
 </td>
 );

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-3"
 >
 <SummaryCards data={monthFilteredData} />

 <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#e8e8e8] bg-white p-2.5 md:flex-row md:items-center">
 <div className="flex flex-wrap items-center gap-3">
 <h3 className="flex items-center text-sm font-semibold text-[#262626]">
 <User className="mr-1.5 h-4 w-4 text-[#1677ff]" />
 Employee Performance & Actions
 </h3>
 <div className="flex rounded-md bg-[#f5f5f5] p-0.5">
 {(['amount','qty'] as const).map((m) => (
 <button
 key={m}
 onClick={() => setMetricMode(m)}
 className={`rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
 metricMode === m ? 'bg-white text-[#1677ff] shadow-sm' : 'text-[#8c8c8c] hover:text-[#595959]'
 }`}
 >
 {m}
 </button>
 ))}
 </div>
 </div>
 <div className="flex w-full items-center gap-2 md:w-auto">
 <button
 onClick={handleExportExcel}
 className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600"
 >
 <Download className="h-3.5 w-3.5" />
 Export Excel
 </button>
 <div className="relative w-full md:w-64">
 <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8c8c8c]" />
 <input
 type="text"
 placeholder="Search staff or branch..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="h-8 w-full rounded-md border border-[#d9d9d9] bg-white py-1.5 pl-8 pr-3 text-xs text-[#262626] outline-none focus:border-[#1677ff]"
 />
 </div>
 </div>
 </div>

 <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white">
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
 <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]" title="နံပါတ်">No</th>
 <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]" title="Staff အမည်">Employee Name</th>
 {showBranchColumn && (
 <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]" title="Branch အမည်">Branch</th>
 )}
 <th className="bg-emerald-50/40 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600" title="ရောင်းအား Performance">
 {renderStaffSortHeader('sale','Sale Performance')}
 </th>
 <th className="bg-red-50/40 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-red-500" title="Return/Cancel Performance">
 {renderStaffSortHeader('rc','RC Performance')}
 </th>
 {hasRpPerformance && (
 <th className="bg-orange-50/40 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-orange-500" title="Repair Performance">RP Performance</th>
 )}
 <th className="bg-blue-50/50 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#1677ff]" title="စုစုပေါင်း">
 {renderStaffSortHeader('total','Total')}
 </th>
 <th className="bg-indigo-50/40 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-indigo-600" title="Net Sale = Sale - RC">
 {renderStaffSortHeader('net','Net Sale')}
 </th>
 <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]" title="Actions">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {(showAllSummary ? sortedStaffList : sortedStaffList.slice(0, 10)).map((staff, index) => {
 // Hide other staff when one is expanded
 if (expandedStaff && expandedStaff !== staff.name) {
 return null;
 }

 return (
 <React.Fragment key={staff.name}>
 <motion.tr
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.03 }}
 onClick={() => setExpandedStaff(expandedStaff === staff.name ? null : staff.name)}
 className="hover:bg-blue-50/5 transition-colors group cursor-pointer"
 >
 <td className="px-3 py-2.5 text-center">
 <span className="text-[13px] font-bold text-gray-400">{index + 1}</span>
 </td>
 <td className="px-3 py-2.5">
 <div className="flex items-center space-x-3">
 {profiles[staff.name]?.photo ? (
 <img
 src={profiles[staff.name].photo}
 alt={staff.name}
 className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
 onClick={(e) => {
 e.stopPropagation();
 setViewingPhoto(profiles[staff.name].photo!);
 }}
 />
 ) : (
 <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">
 {staff.name.charAt(0)}
 </div>
 )}
 <div>
 <span className="text-[13px] font-bold text-black block leading-tight">{staff.name}</span>
 {profiles[staff.name]?.joinDate && (
 <span className="text-[10px] text-gray-400 font-medium flex items-center mt-0.5">
 <Calendar className="w-2.5 h-2.5 mr-1" />
 {profiles[staff.name].joinDate}
 </span>
 )}
 </div>
 </div>
 </td>
 {showBranchColumn && (
 <td className="px-3 py-2.5">
 <span className="text-[13px] text-gray-500 font-medium">{staff.branch}</span>
 </td>
 )}
 <td className="px-3 py-2.5 text-center border-l border-gray-50">
 <PerfCell perf={staff.sale} tone="sale" />
 </td>
 <td className="px-3 py-2.5 text-center border-l border-gray-50">
 <PerfCell perf={staff.rc} tone="rc" />
 </td>
 {hasRpPerformance && (
 <td className="px-3 py-2.5 text-center border-l border-gray-50">
 <PerfCell perf={staff.rp} tone="rp" />
 </td>
 )}
 <td className="px-3 py-2.5 text-center border-l border-gray-50 bg-blue-50/10">
 <PerfCell perf={staff.total} tone="total" />
 </td>
 <td className="px-3 py-2.5 text-center border-l border-gray-50 bg-indigo-50/10">
 <DiffCell sale={staff.sale} rc={staff.rc} />
 </td>
 {renderStaffActions(staff.name)}
 </motion.tr>

 {expandedStaff === staff.name && (
 <tr className="bg-gray-50/60">
 <td colSpan={summaryColSpan} className="p-0">
 <div className="mx-4 my-2 ml-8 rounded-xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
 <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100/40 flex items-center gap-2">
 <Calendar className="w-3.5 h-3.5 text-[#1677ff] shrink-0" />
 <span className="text-[10px] font-bold text-blue-600/80 uppercase tracking-wider">
 Daily Breakdown
 </span>
 </div>
 {(getSortedDailyBreakdown(staff.name)).length === 0 ? (
 <div className="px-4 py-3 text-[12px] text-gray-400 font-medium">Data မရှိပါ</div>
 ) : (
 <>
 <div className="hidden sm:grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-2 px-4 py-2 bg-gray-50/80 border-b border-gray-100/80">
 <button
 type="button"
 onClick={handleDailyDateSort}
 className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide hover:text-blue-600 transition-colors select-none"
 >
 <span>Date</span>
 {dailyBreakdownDateOrder ==='asc' ? (
 <ArrowUp className="w-3 h-3 shrink-0" />
 ) : (
 <ArrowDown className="w-3 h-3 shrink-0" />
 )}
 </button>
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Qty</span>
 <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide text-center">Sale</span>
 <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide text-center">RC</span>
 <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide text-center">Total</span>
 </div>
 <div className="divide-y divide-gray-100/80">
 {getSortedDailyBreakdown(staff.name).map((day) => {
 const netAmount = day.sale.amount - day.rc.amount;
 const saleValue = metricMode ==='amount' ? day.sale.amount : day.sale.qty;
 const rcValue = metricMode ==='amount' ? day.rc.amount : day.rc.qty;
 const totalValue = metricMode ==='amount' ? day.totalAmount : day.qty;
 const isExpanded = expandedDays.has(day.date);
 const hasCategories = Object.keys(day.categories).length > 0;
 return (
 <div key={day.date}>
 <div
 onClick={() => hasCategories && toggleDayExpansion(day.date)}
 className={`grid grid-cols-1 sm:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-2 sm:gap-2 items-center px-4 py-2.5 hover:bg-blue-50/30 transition-colors cursor-pointer ${hasCategories ? 'cursor-pointer' : 'cursor-default'}`}
 >
 <div className="flex items-center gap-2">
 {hasCategories && (
 <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 )}
 <span className="text-[12px] font-semibold text-[#8c8c8c]">{day.date}</span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-gray-400 uppercase sm:hidden">Qty</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg">
 {day.qty.toLocaleString()}
 </span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-emerald-600 uppercase sm:hidden">Sale</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
 {saleValue.toLocaleString()}
 </span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-red-500 uppercase sm:hidden">RC</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
 {rcValue.toLocaleString()}
 </span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-indigo-600 uppercase sm:hidden">Total</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
 {totalValue.toLocaleString()}
 </span>
 </div>
 </div>
 {isExpanded && hasCategories && (
 <div className="ml-8 mt-2 border-l-2 border-blue-200 pl-3 space-y-2">
 {Object.entries(day.categories).map(([category, data]) => {
 const catSaleValue = metricMode ==='amount' ? data.sale.amount : data.sale.qty;
 const catRcValue = metricMode ==='amount' ? data.rc.amount : data.rc.qty;
 const catTotalValue = metricMode ==='amount' ? data.total.amount : data.total.qty;
 const customerList = Array.from(data.customers).slice(0, 5);
 const hasMoreCustomers = data.customers.size > 5;
 return (
 <div key={category} className="bg-gray-50/50 rounded-lg">
 <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-2 sm:gap-2 items-center px-4 py-2.5">
 <span className="text-[11px] font-semibold text-gray-600">{category}</span>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-gray-400 uppercase sm:hidden">Qty</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg">
 {data.total.qty.toLocaleString()}
 </span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-emerald-600 uppercase sm:hidden">Sale</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
 {catSaleValue.toLocaleString()}
 </span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-red-500 uppercase sm:hidden">RC</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
 {catRcValue.toLocaleString()}
 </span>
 </div>
 <div className="flex sm:justify-center items-center gap-2 sm:gap-0">
 <span className="text-[10px] font-bold text-indigo-600 uppercase sm:hidden">Total</span>
 <span className="inline-flex min-w-[2rem] justify-center text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
 {catTotalValue.toLocaleString()}
 </span>
 </div>
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
 </td>
 </tr>
 )}
 </React.Fragment>
 );
 })}
 </tbody>
 </table>
 </div>
 {staffList.length > 10 && (
 <div className="p-6 text-center border-t border-gray-100 bg-gray-50/30">
 <button
 onClick={() => setShowAllSummary(!showAllSummary)}
 className="text-[14px] font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center mx-auto gap-2 bg-white px-6 py-3 rounded-xl shadow-sm border border-blue-50 transition-all "
 >
 {showAllSummary ? 'Show Less' : `View All ${staffList.length} Staff Members`}
 <ChevronDown className={`w-4 h-4 transition-transform ${showAllSummary ? 'rotate-180' : ''}`} />
 </button>
 </div>
 )}
 </div>

 {editingStaff && (
 <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-white rounded-xl shadow-sm w-full max-w-md overflow-hidden"
 >
 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
 <h3 className="text-lg font-bold text-gray-900">Edit Profile: {editingStaff}</h3>
 <button onClick={() => setEditingStaff(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-6 space-y-6">
 <div className="flex flex-col items-center">
 <div className="relative group">
 <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
 {editForm.photo ? (
 <img src={editForm.photo} alt="Profile" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-gray-400">
 <User className="w-10 h-10" />
 </div>
 )}
 </div>
 <label className="absolute bottom-0 right-0 bg-[#1677ff] text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-[#4096ff] transition-colors">
 <Camera className="w-4 h-4" />
 <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
 </label>
 </div>
 <p className="text-xs text-gray-500 mt-2 font-medium">Click camera icon to upload photo</p>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-bold text-[#8c8c8c] mb-1">Join Date</label>
 <input 
 type="date" 
 value={editForm.joinDate ||''}
 onChange={(e) => setEditForm({...editForm, joinDate: e.target.value})}
 className="w-full bg-gray-50 border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1677ff]/20 focus:border-transparent outline-none transition-all"
 />
 </div>
 <div>
 <label className="block text-sm font-bold text-[#8c8c8c] mb-1">Position / Role</label>
 <input 
 type="text" 
 placeholder="e.g. Senior Customer Service"
 value={editForm.position ||''}
 onChange={(e) => setEditForm({...editForm, position: e.target.value})}
 className="w-full bg-gray-50 border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1677ff]/20 focus:border-transparent outline-none transition-all"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-bold text-[#8c8c8c] mb-1">Phone</label>
 <input 
 type="tel" 
 placeholder="Phone number"
 value={editForm.phone ||''}
 onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
 className="w-full bg-gray-50 border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1677ff]/20 focus:border-transparent outline-none transition-all"
 />
 </div>
 <div>
 <label className="block text-sm font-bold text-[#8c8c8c] mb-1">Email</label>
 <input 
 type="email" 
 placeholder="Email address"
 value={editForm.email ||''}
 onChange={(e) => setEditForm({...editForm, email: e.target.value})}
 className="w-full bg-gray-50 border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1677ff]/20 focus:border-transparent outline-none transition-all"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
 <button 
 onClick={() => setEditingStaff(null)}
 className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
 >
 Cancel
 </button>
 <button 
 onClick={handleSaveProfile}
 className="px-6 py-2 text-sm font-semibold text-[#262626] bg-[#1677ff] hover:bg-[#4096ff] rounded-xl shadow-sm transition-colors"
 >
 Save Profile
 </button>
 </div>
 </motion.div>
 </div>
 )}

 {viewingPhoto && (
 <div 
 className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4 cursor-pointer"
 onClick={() => setViewingPhoto(null)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center"
 onClick={(e) => e.stopPropagation()}
 >
 <button 
 onClick={() => setViewingPhoto(null)}
 className="absolute -top-12 right-0 text-white hover:text-[#8c8c8c] p-2 transition-colors"
 >
 <X className="w-8 h-8" />
 </button>
 <img 
 src={viewingPhoto} 
 alt="Profile Enlarged" 
 className="w-full h-full object-contain rounded-xl shadow-sm"
 />
 </motion.div>
 </div>
 )}
 </motion.div>
 );
});

export default StaffView;
