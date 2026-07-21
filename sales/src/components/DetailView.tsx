import React, { useState, useMemo } from'react';
import { motion } from'motion/react';
import { Users, Store, FileText, Calendar, X, ChevronDown, PieChart as PieChartIcon, MapPin } from'lucide-react';
import { DataRow, StaffProfile } from'../types';
import { getExtractedReason, parseSafeDate } from'../utils';
import DonutChart from'./DonutChart';

interface DetailViewProps {
 name: string;
 data: DataRow[];
 onBack: () => void;
 highPerformanceMode?: boolean;
}

type SortBy ='count' |'qty' |'amount';

const DetailView = React.memo(({ name, data, onBack, highPerformanceMode }: DetailViewProps) => {
 const [showAllCS, setShowAllCS] = useState(false);
 const [showAllCounter, setShowAllCounter] = useState(false);
 const [expandedCS, setExpandedCS] = useState<string | null>(null);
 const [expandedCounter, setExpandedCounter] = useState<string | null>(null);
 const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
 const [csSortBy, setCsSortBy] = useState<SortBy>('count');
 const [counterSortBy, setCounterSortBy] = useState<SortBy>('count');

 const profile: StaffProfile = useMemo(() => {
 const profiles = JSON.parse(localStorage.getItem('staffProfiles') ||'{}');
 return profiles[name];
 }, [name]);

 const totalTransactions = data.length;
 
 const totalGram = useMemo(() => data.reduce((acc, row) => {
 const val = parseFloat(row['Gram'] ||'0');
 return acc + (isNaN(val) ? 0 : val);
 }, 0), [data]);

 const totalQty = useMemo(() => data.reduce((acc, row) => {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const val = rawQty ? parseFloat(rawQty) : 1;
 return acc + (isNaN(val) ? 0 : val);
 }, 0), [data]);

 const totalAmount = useMemo(() => data.reduce((acc, row) => {
 const val = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 return acc + (isNaN(val) ? 0 : val);
 }, 0), [data]);
 
 const qtyCategories = useMemo(() => {
 const reasonQtys: Record<string, number> = {};
 data.forEach(row => {
 const reason = getExtractedReason(row);
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 reasonQtys[reason] = (reasonQtys[reason] || 0) + q;
 });

 const reasonColors: Record<string, string> = {
'အဝယ်': '#52c41a',
'ပြင်ဆင်': '#fa8c16',
'အရောင်း': '#ff4d4f',
'အလဲအထပ်': '#5856D6',
'ပစ္စည်းကြည့်သီးသန့်': '#AF52DE',
'Sale': '#52c41a',
'RC': '#ff4d4f',
'RP': '#fa8c16',
'Dia Sale': '#1677ff', // Blue
'G Sale': '#FFCC00', // Yellow/Gold
'PT Sale': '#AF52DE', // Purple
'Dia RC': '#5AC8FA', // Light Blue
'G RC': '#fa8c16', // Orange
'PT RC': '#E5CCFF', // Light Purple
'Dia RP': '#52c41a', // Green
'G RP': '#ff4d4f', // Red
'PT RP': '#5856D6', // Indigo
'Other': '#8E8E93'
 };

 const totalCatQty = Object.values(reasonQtys).reduce((a, b) => a + b, 0);

 return Object.entries(reasonQtys)
 .map(([name, qty]) => ({
 name,
 qty,
 percent: totalCatQty > 0 ? (qty / totalCatQty) * 100 : 0,
 color: reasonColors[name] ||'#8E8E93'
 }))
 .sort((a, b) => b.qty - a.qty);
 }, [data]);

 const csKPI = useMemo(() => {
 const csStats: Record<string, { count: number; qty: number; gram: number; amount: number; daily: Record<string, { qty: number; gram: number; amount: number }> }> = {};
 data.forEach(row => {
 const csName = row['အရောင်းသမားအမည်'] || row['Customer Service အမည်'] ||'Unknown';
 const dateStr = row.Date || row.Timestamp?.split(' ')[0] ||'Unknown';
 
 if (!csStats[csName]) {
 csStats[csName] = { count: 0, qty: 0, gram: 0, amount: 0, daily: {} };
 }
 if (!csStats[csName].daily[dateStr]) {
 csStats[csName].daily[dateStr] = { qty: 0, gram: 0, amount: 0 };
 }
 csStats[csName].count += 1;
 
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 if (!isNaN(qty)) {
 csStats[csName].qty += qty;
 csStats[csName].daily[dateStr].qty += qty;
 }
 
 const gram = parseFloat(row['Gram'] ||'0');
 if (!isNaN(gram)) {
 csStats[csName].gram += gram;
 csStats[csName].daily[dateStr].gram += gram;
 }
 
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 if (!isNaN(amount)) {
 csStats[csName].amount += amount;
 csStats[csName].daily[dateStr].amount += amount;
 }
 });
 return Object.entries(csStats)
 .map(([name, stats]) => ({ name, ...stats }))
 .sort((a, b) => {
 if (csSortBy ==='qty') return b.qty - a.qty;
 if (csSortBy ==='amount') return b.amount - a.amount;
 return b.count - a.count;
 });
 }, [data, csSortBy]);

 const counterKPI = useMemo(() => {
 const counterStats: Record<string, { count: number; qty: number; gram: number; amount: number; phone: string; daily: Record<string, { qty: number; gram: number; amount: number }> }> = {};
 data.forEach(row => {
 const counterName = row['ဝယ်သူ အမည်'] ||'Unknown';
 const counterphone = row['Contact Number'] ||'Unknown';
 const dateStr = row.Date || row.Timestamp?.split(' ')[0] ||'Unknown';
 
 if (!counterStats[counterName]) {
 counterStats[counterName] = { count: 0, qty: 0, gram: 0, amount: 0, phone: counterphone, daily: {} };
 }
 if (!counterStats[counterName].daily[dateStr]) {
 counterStats[counterName].daily[dateStr] = { qty: 0, gram: 0, amount: 0 };
 }
 counterStats[counterName].count += 1;
 
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 if (!isNaN(qty)) {
 counterStats[counterName].qty += qty;
 counterStats[counterName].daily[dateStr].qty += qty;
 }
 
 const gram = parseFloat(row['Gram'] ||'0');
 if (!isNaN(gram)) {
 counterStats[counterName].gram += gram;
 counterStats[counterName].daily[dateStr].gram += gram;
 }
 
 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 if (!isNaN(amount)) {
 counterStats[counterName].amount += amount;
 counterStats[counterName].daily[dateStr].amount += amount;
 }
 });
 return Object.entries(counterStats)
 .map(([name, stats]) => ({ name, ...stats }))
 .sort((a, b) => {
 if (counterSortBy ==='qty') return b.qty - a.qty;
 if (counterSortBy ==='amount') return b.amount - a.amount;
 return b.count - a.count;
 });
 }, [data, counterSortBy]);

 const topDetails = useMemo(() => {
 const detailCounts: Record<string, number> = {};
 data.forEach(row => {
 const detail = row['ထူးခြားဖြစ်စဉ်'];
 if (detail && detail.trim() !=='') {
 detailCounts[detail.trim()] = (detailCounts[detail.trim()] || 0) + 1;
 }
 });
 return Object.entries(detailCounts)
 .map(([name, count]) => ({ name, count }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 5);
 }, [data]);

 const mainItems = useMemo(() => {
 const itemCounts: Record<string, number> = {};
 
 // Find the correct key for Item Main Group once
 let itemMainGroupKey ='';
 if (data.length > 0) {
 itemMainGroupKey = Object.keys(data[0]).find(k => 
 k.trim().replace(/\s+/g,'').toLowerCase() ==='item main group'
 ) ||'Item Main Group';
 }

 data.forEach(row => {
 const category = row[itemMainGroupKey] || row['Item Main Group'];
 if (category && category.trim() !=='') {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 itemCounts[category.trim()] = (itemCounts[category.trim()] || 0) + q;
 }
 });
 
 const totalItems = Object.values(itemCounts).reduce((a, b) => a + b, 0);

 return Object.entries(itemCounts)
 .map(([name, count]) => ({
 name,
 count,
 percent: totalItems > 0 ? (count / totalItems) * 100 : 0
 }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 5);
 }, [data]);

 const itemCategoryStats = useMemo(() => {
 const counts: Record<string, number> = {};
 
 // Find the correct key for Item Category once
 let itemCategoryKey ='';
 if (data.length > 0) {
 itemCategoryKey = Object.keys(data[0]).find(k => 
 k.trim().toLowerCase() ==='item category'
 ) ||'Item Category';
 }

 data.forEach(row => {
 const cat = row[itemCategoryKey] || row['Item Category'] || row['item category'] || row['Item category'] || row['ITEM CATEGORY'];
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
 }, [data]);

 const regionData = useMemo(() => {
 const counts: Record<string, number> = {};
 data.forEach(row => {
 const region = row['Region'] ||'Unknown';
 counts[region] = (counts[region] || 0) + 1;
 });

 return Object.entries(counts)
 .map(([name, value]) => ({ name, value }))
 .sort((a, b) => b.value - a.value)
 .slice(0, 7);
 }, [data]);

 const townshipData = useMemo(() => {
 const counts: Record<string, number> = {};
 data.forEach(row => {
 const township = row['Township'] ||'Unknown';
 counts[township] = (counts[township] || 0) + 1;
 });

 return Object.entries(counts)
 .map(([name, value]) => ({ name, value }))
 .sort((a, b) => b.value - a.value)
 .slice(0, 7);
 }, [data]);

 const performanceStats = useMemo(() => {
 const stats = {
 SALE: { qty: 0, gram: 0, amount: 0 },
 RC: { qty: 0, gram: 0, amount: 0 },
 RP: { qty: 0, gram: 0, amount: 0 },
 TOTAL: { qty: 0, gram: 0, amount: 0 },
 DIFFERENCE: { qty: 0, gram: 0, amount: 0 }
 };

 data.forEach(row => {
 const reason = getExtractedReason(row);
 const lowerReason = reason.toLowerCase();
 
 let cat ='OTHER';
 if (lowerReason.includes('sale') || reason.includes('အရောင်း')) cat ='SALE';
 else if (lowerReason.includes('rc')) cat ='RC';
 else if (lowerReason.includes('rp')) cat ='RP';

 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 0 : qty;

 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;

 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;

 if (cat ==='SALE') {
 stats.SALE.qty += q;
 stats.SALE.gram += g;
 stats.SALE.amount += a;
 } else if (cat ==='RC') {
 stats.RC.qty += q;
 stats.RC.gram += g;
 stats.RC.amount += a;
 } else if (cat ==='RP') {
 stats.RP.qty += q;
 stats.RP.gram += g;
 stats.RP.amount += a;
 }
 
 stats.TOTAL.qty += q;
 stats.TOTAL.gram += g;
 stats.TOTAL.amount += a;
 });

 stats.DIFFERENCE.qty = stats.SALE.qty - stats.RC.qty;
 stats.DIFFERENCE.gram = stats.SALE.gram - stats.RC.gram;
 stats.DIFFERENCE.amount = stats.SALE.amount - stats.RC.amount;

 return stats;
 }, [data]);

 const displayedCS = showAllCS ? csKPI : csKPI.slice(0, 10);
 const displayedCounter = showAllCounter ? counterKPI : counterKPI.slice(0, 10);

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 {profile?.photo ? (
 <img 
 src={profile.photo} 
 alt={name} 
 className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md cursor-pointer hover:opacity-90 transition-opacity" 
 onClick={() => setViewingPhoto(profile.photo!)}
 />
 ) : (
 <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shadow-md">
 {name.charAt(0)}
 </div>
 )}
 <div>
 <h2 className="text-2xl font-bold text-black">{name}</h2>
 {profile?.position && (
 <p className="text-[14px] font-medium text-gray-500">{profile.position}</p>
 )}
 </div>
 </div>
 <button 
 onClick={onBack}
 className="text-[#1677ff] font-semibold hover:underline"
 >
 Back to Overview
 </button>
 </div>

 {profile && (profile.joinDate || profile.phone || profile.email) && (
 <div className="p-6 flex flex-wrap gap-6 items-center bg-blue-50/50 rounded-xl">
 {profile.joinDate && (
 <div className="flex items-center gap-2 text-gray-600">
 <Calendar className="w-4 h-4 text-[#1677ff]" />
 <span className="text-sm font-medium">Joined: {profile.joinDate}</span>
 </div>
 )}
 {profile.phone && (
 <div className="flex items-center gap-2 text-gray-600">
 <div className="w-4 h-4 rounded-full bg-[#1677ff] text-white flex items-center justify-center text-[10px]">P</div>
 <span className="text-sm font-medium">{profile.phone}</span>
 </div>
 )}
 {profile.email && (
 <div className="flex items-center gap-2 text-gray-600">
 <div className="w-4 h-4 rounded-full bg-[#1677ff] text-white flex items-center justify-center text-[10px]">@</div>
 <span className="text-sm font-medium">{profile.email}</span>
 </div>
 )}
 </div>
 )}

 <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
 <div className="min-w-[600px]">
 <div className="grid grid-cols-5 divide-x divide-gray-100">
 <div className="p-4 text-center bg-gray-50/50">
 <p className="text-[11px] font-bold text-[#00A67E] uppercase tracking-wider">SALE<br/>PERFORMANCE</p>
 </div>
 <div className="p-4 text-center bg-gray-50/50">
 <p className="text-[11px] font-bold text-[#ff4d4f] uppercase tracking-wider">RC<br/>PERFORMANCE</p>
 </div>
 <div className="p-4 text-center bg-gray-50/50">
 <p className="text-[11px] font-bold text-[#fa8c16] uppercase tracking-wider">RP<br/>PERFORMANCE</p>
 </div>
 <div className="p-4 text-center bg-[#F4F9FF]">
 <p className="text-[11px] font-bold text-[#0066FF] uppercase tracking-wider">TOTAL</p>
 </div>
 <div className="p-4 text-center bg-white">
 <p className="text-[11px] font-bold text-[#5856D6] uppercase tracking-wider">DIFFERENCE</p>
 </div>
 </div>
 <div className="grid grid-cols-5 divide-x divide-gray-100 border-t border-gray-100">
 <div className="p-4 flex flex-col items-center justify-center gap-2">
 <div className="flex items-center gap-2 text-[15px] font-bold text-black">
 <span>{performanceStats.SALE.qty} <span className="text-[10px] text-gray-400 font-semibold">Q</span></span>
 <span className="text-[#8c8c8c]">|</span>
 <span>{performanceStats.SALE.gram.toFixed(1)} <span className="text-[10px] text-gray-400 font-semibold">G</span></span>
 </div>
 <div className="px-3 py-1 rounded-full bg-[#E8F8F5] text-[#00A67E] text-[13px] font-bold">
 {performanceStats.SALE.amount.toLocaleString()}
 </div>
 </div>
 <div className="p-4 flex flex-col items-center justify-center gap-2">
 <div className="flex items-center gap-2 text-[15px] font-bold text-black">
 <span>{performanceStats.RC.qty} <span className="text-[10px] text-gray-400 font-semibold">Q</span></span>
 <span className="text-[#8c8c8c]">|</span>
 <span>{performanceStats.RC.gram.toFixed(1)} <span className="text-[10px] text-gray-400 font-semibold">G</span></span>
 </div>
 <div className="px-3 py-1 rounded-full bg-[#FFF0F0] text-[#ff4d4f] text-[13px] font-bold">
 {performanceStats.RC.amount.toLocaleString()}
 </div>
 </div>
 <div className="p-4 flex flex-col items-center justify-center gap-2">
 <div className="flex items-center gap-2 text-[15px] font-bold text-black">
 <span>{performanceStats.RP.qty} <span className="text-[10px] text-gray-400 font-semibold">Q</span></span>
 <span className="text-[#8c8c8c]">|</span>
 <span>{performanceStats.RP.gram.toFixed(1)} <span className="text-[10px] text-gray-400 font-semibold">G</span></span>
 </div>
 <div className="px-3 py-1 rounded-full bg-[#FFF7E6] text-[#fa8c16] text-[13px] font-bold">
 {performanceStats.RP.amount.toLocaleString()}
 </div>
 </div>
 <div className="p-4 flex flex-col items-center justify-center gap-2 bg-[#F4F9FF]">
 <div className="flex items-center gap-2 text-[15px] font-bold text-[#0066FF]">
 <span>{performanceStats.TOTAL.qty} <span className="text-[10px] text-[#80B3FF] font-semibold">Q</span></span>
 <span className="text-[#B3D4FF]">|</span>
 <span>{performanceStats.TOTAL.gram.toFixed(1)} <span className="text-[10px] text-[#80B3FF] font-semibold">G</span></span>
 </div>
 <div className="text-[#0066FF] text-[14px] font-bold">
 {performanceStats.TOTAL.amount.toLocaleString()}
 </div>
 </div>
 <div className="p-4 flex flex-col items-center justify-center gap-2">
 <div className="flex items-center gap-2 text-[15px] font-bold text-[#5856D6]">
 {performanceStats.DIFFERENCE.amount >= 0 ? (
 <span className="text-[12px]">↗</span>
 ) : (
 <span className="text-[12px]">↘</span>
 )}
 <span>{Math.abs(performanceStats.DIFFERENCE.qty)} <span className="text-[10px] text-[#A5A4E8] font-semibold">Q</span></span>
 <span className="text-[#C7C6F0]">|</span>
 <span>{Math.abs(performanceStats.DIFFERENCE.gram).toFixed(1)} <span className="text-[10px] text-[#A5A4E8] font-semibold">G</span></span>
 </div>
 <div className="text-[#5856D6] text-[14px] font-bold">
 {performanceStats.DIFFERENCE.amount.toLocaleString()}
 </div>
 </div>
 </div>
 </div>
 </div>

 

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <section>
 <div className="flex items-center justify-between mb-4 px-1">
 <h3 className="text-[19px] font-bold text-black flex items-center">
 <Users className="w-5 h-5 mr-2 text-[#1677ff]" />
 Sale Name
 </h3>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
 {(['count','qty','amount'] as const).map(s => (
 <button
 key={s}
 onClick={() => setCsSortBy(s)}
 className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${csSortBy === s ? 'bg-white text-[#1677ff] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
 >
 {s}
 </button>
 ))}
 </div>
 {csKPI.length > 10 && (
 <button 
 onClick={() => setShowAllCS(!showAllCS)}
 className="text-[#1677ff] text-[14px] font-semibold"
 >
 {showAllCS ? 'See Less' : 'See More'}
 </button>
 )}
 </div>
 </div>
 <div className="overflow-hidden rounded-xl shadow-sm bg-white">
 {displayedCS.map((item, index) => (
 <div 
 key={item.name} 
 className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${index !== displayedCS.length - 1 ? 'border-b border-[#e8e8e8]' : ''}`}
 onClick={() => setExpandedCS(expandedCS === item.name ? null : item.name)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
 {index + 1}
 </div>
 <span className="text-[15px] font-bold text-black">{item.name}</span>

 </div>
 <div className="flex items-center space-x-2">
 <div className="flex flex-col items-end mr-2">
 <span className="text-[14px] font-bold text-gray-900">{item.count} <span className="text-[10px] text-gray-400">V</span></span>
 <span className="text-[11px] font-bold text-orange-500">{item.amount.toLocaleString()}</span>
 </div>
 <motion.div
 animate={{ rotate: expandedCS === item.name ? 180 : 0 }}
 transition={{ duration: 0.3 }}
 >
 <ChevronDown className="w-4 h-4 text-gray-400" />
 </motion.div>
 </div>
 </div>

 {expandedCS === item.name && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 className="mt-4 pt-4 border-t border-gray-100"
 >
 <div className="grid grid-cols-3 gap-2 mb-4">
 <div className="bg-blue-50 p-2 rounded-xl text-center">
 <p className="text-[10px] font-bold text-blue-400 uppercase">Qty</p>
 <p className="text-[14px] font-bold text-blue-600">{item.qty}</p>
 </div>
 <div className="bg-emerald-50 p-2 rounded-xl text-center">
 <p className="text-[10px] font-bold text-emerald-600 uppercase">Gram</p>
 <p className="text-[14px] font-bold text-emerald-600">{item.gram.toFixed(2)}</p>
 </div>
 <div className="bg-orange-50 p-2 rounded-xl text-center">
 <p className="text-[10px] font-bold text-orange-500 uppercase">Amount</p>
 <p className="text-[14px] font-bold text-orange-600">{item.amount.toLocaleString()}</p>
 </div>
 </div>
 
 <div className="space-y-2">
 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Daily Breakdown</p>
 {Object.entries(item.daily).sort((a, b) => {
 const dateA = parseSafeDate(a[0])?.getTime() || 0;
 const dateB = parseSafeDate(b[0])?.getTime() || 0;
 return dateB - dateA;
 }).map(([date, stats]: [string, any]) => (
 <div key={date} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
 <span className="font-medium text-gray-600">{date}</span>
 <div className="flex gap-4 text-right">
 <span className="text-blue-600 font-medium">{stats.qty} Qty</span>
 <span className="text-emerald-600 font-medium w-16">{stats.gram.toFixed(2)}g</span>
 <span className="text-orange-600 font-medium w-20">{stats.amount.toLocaleString()}</span>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </div>
 ))}
 </div>
 </section>

 <section>
 <div className="flex items-center justify-between mb-4 px-1">
 <h3 className="text-[19px] font-bold text-black flex items-center">
 <Store className="w-5 h-5 mr-2 text-emerald-500" />
 Customer Name
 </h3>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
 {(['count','qty','amount'] as const).map(s => (
 <button
 key={s}
 onClick={() => setCounterSortBy(s)}
 className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${counterSortBy === s ? 'bg-white text-[#1677ff] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
 >
 {s}
 </button>
 ))}
 </div>
 {counterKPI.length > 10 && (
 <button 
 onClick={() => setShowAllCounter(!showAllCounter)}
 className="text-[#1677ff] text-[14px] font-semibold"
 >
 {showAllCounter ? 'See Less' : 'See More'}
 </button>
 )}
 </div>
 </div>
 <div className="overflow-hidden rounded-xl shadow-sm bg-white">
 {displayedCounter.map((item, index) => (
 <div 
 key={item.name} 
 className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${index !== displayedCounter.length - 1 ? 'border-b border-[#e8e8e8]' : ''}`}
 onClick={() => setExpandedCounter(expandedCounter === item.name ? null : item.name)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
 {index + 1}
 </div>
 <div className="flex flex-col">
 <span className="text-[15px] font-bold text-black">{item.name}</span>
 {item.phone && item.phone !=='Unknown' && (
 <span className="text-[12px] font-medium text-green-600">{item.phone}</span>
 )}
 </div>

 </div>
 <div className="flex items-center space-x-2">
 <div className="flex flex-col items-end mr-2">
 <span className="text-[14px] font-bold text-gray-900">{item.count} <span className="text-[10px] text-gray-400">V</span></span>
 <span className="text-[11px] font-bold text-orange-500">{item.amount.toLocaleString()}</span>
 </div>
 <motion.div
 animate={{ rotate: expandedCounter === item.name ? 180 : 0 }}
 transition={{ duration: 0.3 }}
 >
 <ChevronDown className="w-4 h-4 text-gray-400" />
 </motion.div>
 </div>
 </div>
 
 {expandedCounter === item.name && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 className="mt-4 pt-4 border-t border-gray-100"
 >
 <div className="grid grid-cols-3 gap-2 mb-4">
 <div className="bg-blue-50 p-2 rounded-xl text-center">
 <p className="text-[10px] font-bold text-blue-400 uppercase">Qty</p>
 <p className="text-[14px] font-bold text-blue-600">{item.qty}</p>
 </div>
 <div className="bg-emerald-50 p-2 rounded-xl text-center">
 <p className="text-[10px] font-bold text-emerald-600 uppercase">Gram</p>
 <p className="text-[14px] font-bold text-emerald-600">{item.gram.toFixed(2)}</p>
 </div>
 <div className="bg-orange-50 p-2 rounded-xl text-center">
 <p className="text-[10px] font-bold text-orange-500 uppercase">Amount</p>
 <p className="text-[14px] font-bold text-orange-600">{item.amount.toLocaleString()}</p>
 </div>
 </div>
 
 <div className="space-y-2">
 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Daily Breakdown</p>
 {Object.entries(item.daily).sort((a, b) => {
 const dateA = parseSafeDate(a[0])?.getTime() || 0;
 const dateB = parseSafeDate(b[0])?.getTime() || 0;
 return dateB - dateA;
 }).map(([date, stats]: [string, any]) => (
 <div key={date} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
 <span className="font-medium text-gray-600">{date}</span>
 <div className="flex gap-4 text-right">
 <span className="text-blue-600 font-medium">{stats.qty} Qty</span>
 <span className="text-emerald-600 font-medium w-16">{stats.gram.toFixed(2)}g</span>
 <span className="text-orange-600 font-medium w-20">{stats.amount.toLocaleString()}</span>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </div>
 ))}
 </div>
 </section>
 </div>

 <div>
 <h3 className="text-[19px] font-bold text-black mb-4 px-1">
 Item Main Group
 </h3>
 <div className="p-6 rounded-xl shadow-sm bg-white">
 <div className="space-y-6">
 {mainItems.map((item, index) => {
 const colors = ['#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f'];
 const color = colors[index % colors.length];
 return (
 <div key={item.name}>
 <div className="flex justify-between items-center mb-2">
 <span className="text-[15px] font-bold text-black">{item.name}</span>
 <div className="flex items-center gap-3">
 <span className="text-[14px] font-medium text-slate-500">{item.count} Qty</span>
 <span className="text-[12px] font-bold text-slate-600 bg-[#e8e8e8]/60 px-2 py-0.5 rounded-md min-w-[40px] text-center">
 {Math.round(item.percent)}%
 </span>
 </div>
 </div>
 <div className="w-full h-2.5 bg-[#e8e8e8]/60 rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${item.percent}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 className="h-full rounded-full"
 style={{ backgroundColor: color }}
 />
 </div>
 </div>
 );
 })}
 {mainItems.length === 0 && (
 <p className="text-gray-500 text-center py-4">No item category data available.</p>
 )}
 </div>
 </div>
 </div>

 <div>
 <h3 className="text-[19px] font-bold text-black mb-4 px-1">
 Qty Distribution
 </h3>
 <div className="p-6 rounded-xl shadow-sm bg-white">
 <div className="space-y-6">
 {qtyCategories.map((cat) => (
 <div key={cat.name}>
 <div className="flex justify-between items-center mb-2">
 <span className="text-[15px] font-bold text-black">{cat.name}</span>
 <div className="flex items-center gap-3">
 <span className="text-[14px] font-medium text-slate-500">{cat.qty} Qty</span>
 <span className="text-[12px] font-bold text-slate-600 bg-[#e8e8e8]/60 px-2 py-0.5 rounded-md min-w-[40px] text-center">
 {Math.round(cat.percent)}%
 </span>
 </div>
 </div>
 <div className="w-full h-2.5 bg-[#e8e8e8]/60 rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${cat.percent}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 className="h-full rounded-full"
 style={{ backgroundColor: cat.color }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <section>
 <h3 className="text-[19px] font-bold text-black mb-4 px-1 flex items-center">
 <PieChartIcon className="w-5 h-5 mr-2 text-[#1677ff]" />
 Top 7 Item Categories
 </h3>
 <div className="p-6 h-[400px] rounded-xl shadow-sm bg-white">
 <DonutChart 
 data={itemCategoryStats.top7} 
 colors={['#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f','#5856D6','#30B0C7']}
 />
 </div>
 </section>

 <section>
 <h3 className="text-[19px] font-bold text-black mb-4 px-1 flex items-center">
 <PieChartIcon className="w-5 h-5 mr-2 text-red-500" />
 Bottom 7 Item Categories
 </h3>
 <div className="p-6 h-[400px] rounded-xl shadow-sm bg-white">
 <DonutChart 
 data={itemCategoryStats.bottom7} 
 colors={['#ff4d4f','#fa8c16','#FFCC00','#AF52DE','#5856D6','#1677ff','#52c41a']}
 />
 </div>
 </section>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <motion.section
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.7 }}
 >
 <h3 className="text-[19px] font-bold text-black mb-4 px-1 flex items-center">
 <MapPin className="w-5 h-5 mr-2 text-emerald-500" />
 Region Distribution
 </h3>
 <div className="p-6 h-[400px] rounded-xl shadow-sm bg-white">
 <DonutChart 
 data={regionData} 
 colors={['#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f','#5856D6','#30B0C7','#FF2D55']}
 />
 </div>
 </motion.section>

 <motion.section
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.8 }}
 >
 <h3 className="text-[19px] font-bold text-black mb-4 px-1 flex items-center">
 <MapPin className="w-5 h-5 mr-2 text-[#1677ff]" />
 Top 7 Township
 </h3>
 <div className="p-6 h-[400px] rounded-xl shadow-sm bg-white">
 <DonutChart 
 data={townshipData} 
 colors={['#5856D6','#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f','#30B0C7','#FF2D55']}
 />
 </div>
 </motion.section>
 </div>

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
 </div>
 );
});

export default DetailView;
