import React, { useState, useEffect, useMemo, lazy, Suspense } from'react';
import { motion } from'motion/react';
import { Loader2, Settings, X, LayoutDashboard, Users, BarChart3, Download, Layers, Zap, Crown, UserCircle } from'lucide-react';
import { DataRow } from'./types';
import { branchFilterShowsAll, filterRowsByBranches, getExtractedReason, parseSafeDate } from'./utils';
import { TargetSheetData } from'./targetSheet';
import { fetchSalesStatus, fetchSalesTargets, fetchSalesTransactionsByRange, hasCrmAccessToken } from'./api';
import OverviewView from'./components/OverviewView';
import MultiSelect from'./components/MultiSelect';

const StaffView = lazy(() => import('./components/StaffView'));
const DetailView = lazy(() => import('./components/DetailView'));
const CmView = lazy(() => import('./components/CmView'));
const ChairmanView = lazy(() => import('./components/ChairmanView'));
const CrmView = lazy(() => import('./components/CrmView'));

const CRM_LOGIN_PATH ='/login';

type SalesTab ='overview' |'detail' |'staff' |'cm' |'chairman' |'crm';
const SALES_TABS: SalesTab[] = ['overview','chairman','staff','cm','crm','detail'];

const MONTH_INDEX: Record<string, number> = {
 January: 0,
 February: 1,
 March: 2,
 April: 3,
 May: 4,
 June: 5,
 July: 6,
 August: 7,
 September: 8,
 October: 9,
 November: 10,
 December: 11,
};

function readEmbedMode(): boolean {
 if (typeof window ==='undefined') return false;
 return new URLSearchParams(window.location.search).get('embed') ==='1';
}

function readTabFromUrl(): SalesTab | null {
 if (typeof window ==='undefined') return null;
 const raw = new URLSearchParams(window.location.search).get('tab');
 if (raw && (SALES_TABS as string[]).includes(raw)) return raw as SalesTab;
 return null;
}

export default function App() {
 const [embedded] = useState(() => readEmbedMode());
 const [isAuthenticated, setIsAuthenticated] = useState(() => hasCrmAccessToken());
 const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
 const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
 const [highPerformanceMode, setHighPerformanceMode] = useState(() => localStorage.getItem('highPerformanceMode') !=='false');

 useEffect(() => {
 const handler = (e: any) => {
 e.preventDefault();
 setDeferredPrompt(e);
 };
 window.addEventListener('beforeinstallprompt', handler);
 return () => window.removeEventListener('beforeinstallprompt', handler);
 }, []);

 const handleInstallClick = async () => {
 if (!deferredPrompt) return;
 deferredPrompt.prompt();
 const { outcome } = await deferredPrompt.userChoice;
 if (outcome ==='accepted') {
 setDeferredPrompt(null);
 }
 };

 const [data, setData] = useState<DataRow[]>([]);
 const [targetSheetData, setTargetSheetData] = useState<TargetSheetData | null>(null);
 const [loading, setLoading] = useState(() => hasCrmAccessToken());
 const [error, setError] = useState<string | null>(null);
 const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

 const [selectedBranches, setSelectedBranches] = useState<string[]>(['All']);
 const [selectedItemTypes, setSelectedItemTypes] = useState<string[]>(['All']);
 const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
 const [monthTouched, setMonthTouched] = useState(false);
 const [selectedDay, setSelectedDay] = useState<string | null>(null);
 const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
 const [startDate, setStartDate] = useState<string>('');
 const [endDate, setEndDate] = useState<string>('');
 const [activeTab, setActiveTab] = useState<SalesTab>(() => readTabFromUrl() ||'chairman');
 const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

 // CRM shell drives the tab via ?tab= when embedded
 useEffect(() => {
 if (!embedded) return;
 const onMessage = (event: MessageEvent) => {
 if (event.origin !== window.location.origin) return;
 const data = event.data;
 if (!data || data.type !=='sales-set-tab') return;
 const tab = data.tab as string;
 if ((SALES_TABS as string[]).includes(tab)) {
 setActiveTab(tab as SalesTab);
 }
 };
 window.addEventListener('message', onMessage);
 return () => window.removeEventListener('message', onMessage);
 }, [embedded]);

 useEffect(() => {
 if (!embedded) return;
 const tab = readTabFromUrl();
 if (tab) setActiveTab(tab);
 }, [embedded]);
 const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
 const [refreshing, setRefreshing] = useState(false);
 const [cmInitialViewMode, setCmInitialViewMode] = useState<'full' |'net' |'allBranch' |'itemSale' |'itemRate' |'cusList' | undefined>(undefined);

 const latestUpdateDate = useMemo(() => {
 if (data.length === 0) return null;
 
 let maxDate: Date | null = null;
 data.forEach(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date) {
 if (!maxDate || date > maxDate) {
 maxDate = date;
 }
 }
 });
 
 if (!maxDate) return null;
 
 const day = maxDate.getDate();
 const month = maxDate.getMonth() + 1;
 const year = maxDate.getFullYear();
 return `${day}.${month}.${year}`;
 }, [data]);

 const latestDataMonth = useMemo(() => {
 if (data.length === 0) return null;
 let maxDate: Date | null = null;
 data.forEach((row) => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date && (!maxDate || date > maxDate)) maxDate = date;
 });
 if (!maxDate) return null;
 return maxDate.toLocaleDateString('en-US', { month: 'long' });
 }, [data]);

 const latestDataWeek = useMemo(() => {
 if (data.length === 0) return null;
 let maxDate: Date | null = null;
 data.forEach((row) => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 if (date && (!maxDate || date > maxDate)) maxDate = date;
 });
 if (!maxDate) return null;

 const day = maxDate.getDate();
 const weekIdx = day > 28 ? 4 : Math.floor((day - 1) / 7);
 const weekLabel = ['1 week','2 week','3 week','4 week','exter day'][weekIdx];
 return weekLabel;
 }, [data]);

 useEffect(() => {
 if (monthTouched) return;
 if (!latestDataMonth) return;
 setSelectedMonth(latestDataMonth);
 }, [latestDataMonth, monthTouched]);

 const branches = useMemo(() => {
 const uniqueBranches = new Set<string>();
 data.forEach(row => {
 const branch = row['Branch အမည်'];
 if (branch) uniqueBranches.add(branch);
 });
 return ['All', ...Array.from(uniqueBranches)];
 }, [data]);

 const itemTypes = useMemo(() => {
 const rawTypes = new Set<string>();
 data.forEach(row => {
 const reason = getExtractedReason(row);
 if (reason) rawTypes.add(reason);
 });
 const filteredRawTypes = Array.from(rawTypes).filter(type => !['Dia Sale','G Sale','PT Sale'].includes(type));
 return ['All','Dia Sale','G Sale','PT Sale', ...filteredRawTypes.sort()];
 }, [data]);
 const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

 const months = useMemo(() => {
 const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
 const currentMonthIndex = new Date().getMonth();
 return ['All', ...monthNames.slice(0, currentMonthIndex + 1)];
 }, []);

 // Memoize parsed dates to avoid re-parsing on every filter change
 const parsedData = useMemo(() => {
 return data.map(row => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 const date = parseSafeDate(dateStr);
 return {
 ...row,
 _parsedDate: date,
 _dateString: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : null,
 _monthString: date ? date.toLocaleDateString('en-US', { month: 'long' }) : null,
 };
 });
 }, [data]);

 // Base filter by item type, month, and date range (shared by all views)
 const baseFilteredData = useMemo(() => {
 let filtered = parsedData;

 if (selectedItemTypes.length > 0 && !selectedItemTypes.includes('All')) {
 const itemTypeSet = new Set(selectedItemTypes);
 filtered = filtered.filter(row => {
 const reason = getExtractedReason(row);
 return itemTypeSet.has(reason);
 });
 }

 if (startDate || endDate) {
 filtered = filtered.filter(row => {
 if (!row._parsedDate || !row._dateString) return false;
 if (startDate && row._dateString < startDate) return false;
 if (endDate && row._dateString > endDate) return false;
 return true;
 });
 } else if (selectedMonth !=='All') {
 filtered = filtered.filter(row => {
 return row._monthString === selectedMonth;
 });
 }
 return filtered;
 }, [parsedData, selectedItemTypes, selectedMonth, startDate, endDate]);

 const filteredData = useMemo(
 () => filterRowsByBranches(baseFilteredData, selectedBranches),
 [baseFilteredData, selectedBranches]
 );

 const staffViewData = filteredData;

 const weekFilteredData = useMemo(() => {
 // If date range is set, prioritize it over week filtering
 if (startDate || endDate) {
 return filteredData;
 }
 return selectedWeek
 ? filteredData.filter(row => {
 const date = row._parsedDate;
 if (date) {
 if (['1 week','2 week','3 week','4 week','exter day'].includes(selectedWeek)) {
 const day = date.getDate();
 const weekIdx = day > 28 ? 4 : Math.floor((day - 1) / 7);
 const weekLabel = ['1 week','2 week','3 week','4 week','exter day'][weekIdx];
 return weekLabel === selectedWeek;
 }
 const startOfWeek = new Date(date);
 startOfWeek.setDate(date.getDate() - date.getDay());
 return startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === selectedWeek;
 }
 return false;
 })
 : filteredData;
 }, [filteredData, selectedWeek, startDate, endDate]);

 const displayData = useMemo(() => {
 return selectedDay
 ? weekFilteredData.filter(row => {
 const date = row._parsedDate;
 return date && days[date.getDay()] === selectedDay;
 })
 : weekFilteredData;
 }, [weekFilteredData, selectedDay, days]);

 // Keep track of last data signature to avoid unnecessary re-renders
 const lastDataSignatureRef = React.useRef<string>('');
 const lastTargetSignatureRef = React.useRef<string>('');

 useEffect(() => {
 const syncAuth = () => setIsAuthenticated(hasCrmAccessToken());
 window.addEventListener('storage', syncAuth);
 return () => window.removeEventListener('storage', syncAuth);
 }, []);

 const loadTargetSheet = async () => {
 try {
 const parsed = await fetchSalesTargets(selectedMonth);
 const newSignature = `${parsed.total.diamond.amount}-${parsed.total.pt.amount}-${parsed.total.gold15.amount}-${parsed.total.gold16.amount}`;
 if (newSignature !== lastTargetSignatureRef.current) {
 lastTargetSignatureRef.current = newSignature;
 setTargetSheetData(parsed);
 }
 } catch {
 // Silently ignore target errors so the dashboard still works
 }
 };

 const loadData = async (isInitial = false) => {
 if (isInitial) setLoading(true);
 else setRefreshing(true);
 setError(null);

 try {
 const status = await fetchSalesStatus().catch(() => null);
 const latestBase = status?.latestSaleDate
 ? new Date(status.latestSaleDate)
 : new Date();

 let from: string | undefined;
 let to: string | undefined;

 if (startDate || endDate) {
 from = startDate || undefined;
 to = endDate || undefined;
 } else if (selectedMonth !== 'All') {
 const monthIdx = MONTH_INDEX[selectedMonth];
 if (monthIdx != null) {
 const year = latestBase.getFullYear();
 const start = new Date(year, monthIdx, 1);
 const end = new Date(year, monthIdx + 1, 0);
 from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
 to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
 }
 }

 const rows = await fetchSalesTransactionsByRange({ from, to });

 const validData = rows as DataRow[];
 if (validData.length === 0) {
 throw new Error('No sales data in database yet. Ask an admin to import the CSV.');
 }

 const newSignature = `${validData.length}-${JSON.stringify(validData[0])}-${JSON.stringify(validData[validData.length - 1])}`;
 if (newSignature !== lastDataSignatureRef.current) {
 lastDataSignatureRef.current = newSignature;
 setData(validData);
 }

 if (status?.lastUpdated) {
 setLastUpdated(new Date(status.lastUpdated));
 } else {
 setLastUpdated(new Date());
 }
 } catch (err: any) {
 setError(err.message || 'Failed to load sales data');
 } finally {
 setLoading(false);
 setRefreshing(false);
 }
 };

 useEffect(() => {
 if (!isAuthenticated) {
 setLoading(false);
 return;
 }

 loadData(true);
 loadTargetSheet();
 const interval = setInterval(() => {
 loadData(false);
 loadTargetSheet();
 }, highPerformanceMode ? 300000 : 180000); // 5 min in high perf, 3 min normal

 // Immediate reload when Sales Data form saves a new record
 const onStorage = (e: StorageEvent) => {
 if (e.key === 'sales-data-updated-at' && e.newValue) {
 loadData(false);
 loadTargetSheet();
 }
 };
 window.addEventListener('storage', onStorage);

 let channel: BroadcastChannel | null = null;
 if (typeof BroadcastChannel !== 'undefined') {
 channel = new BroadcastChannel('sales-data');
 channel.onmessage = (event) => {
 if (event?.data?.type === 'sales-data-updated') {
 loadData(false);
 loadTargetSheet();
 }
 };
 }

 const onVisible = () => {
 if (document.visibilityState === 'visible') {
 loadData(false);
 }
 };
 document.addEventListener('visibilitychange', onVisible);

 return () => {
 clearInterval(interval);
 window.removeEventListener('storage', onStorage);
 document.removeEventListener('visibilitychange', onVisible);
 channel?.close();
 };
 }, [isAuthenticated, highPerformanceMode, selectedMonth, startDate, endDate]);

 const handleLoginRedirect = () => {
 window.location.href = CRM_LOGIN_PATH;
 };

 const handleLogout = () => {
 window.location.href = CRM_LOGIN_PATH;
 };

 const handleItemTypeToggle = (type: string) => {
 setSelectedItemTypes(prev => {
 if (type ==='All') return ['All'];
 const newSelection = prev.filter(t => t !=='All');
 if (newSelection.includes(type)) {
 const filtered = newSelection.filter(t => t !== type);
 return filtered.length === 0 ? ['All'] : filtered;
 } else {
 return [...newSelection, type];
 }
 });
 };

 const handleBranchToggle = (branch: string) => {
 setSelectedBranches((prev) => {
 if (branch ==='All') return ['All'];
 const newSelection = prev.filter((b) => b !=='All');
 if (newSelection.includes(branch)) {
 const filtered = newSelection.filter((b) => b !== branch);
 return filtered.length === 0 ? ['All'] : filtered;
 }
 const next = [...newSelection, branch];
 if (activeTab ==='detail' && selectedDetail && branches.includes(selectedDetail) && next.length === 1) {
 setSelectedDetail(next[0]);
 }
 return next;
 });
 };

 if (!isAuthenticated) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] p-4">
 <div className="w-full max-w-md rounded-xl border border-[#e8e8e8] bg-white p-6 md:p-8 text-center">
 <h1 className="text-xl font-semibold tracking-tight text-[#262626]">Sale Dashboard</h1>
 <p className="mb-6 mt-2 text-sm text-[#8c8c8c]">
 Sales data ကို CRM account ဖြင့် ဝင်ရောက်ပြီးမှ ကြည့်ရှုနိုင်ပါသည်။
 </p>
 <button
 type="button"
 onClick={handleLoginRedirect}
 className="w-full rounded-md bg-[#1677ff] py-2.5 text-sm font-semibold text-white hover:bg-[#4096ff]"
 >
 CRM Login ဝင်ရန်
 </button>
 </div>
 </div>
 );
 }

 if (loading) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
 <div className="flex flex-col items-center space-y-3">
 <Loader2 className="h-8 w-8 animate-spin text-[#1677ff]" />
 <p className="text-sm font-medium text-[#8c8c8c]">Loading sales data...</p>
 </div>
 </div>
 );
 }

 if (error && data.length === 0) {
 return (
 <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f5f5] p-4">
 <div className="w-full max-w-md rounded-xl border border-[#e8e8e8] bg-white p-6 text-center">
 <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
 <X className="h-5 w-5" />
 </div>
 <h2 className="mb-2 text-lg font-semibold text-[#262626]">Failed to load data</h2>
 <p className="mb-5 text-sm text-[#8c8c8c]">{error}</p>
 <button
 onClick={() => loadData(true)}
 className="w-full rounded-md bg-[#1677ff] py-2 text-sm font-semibold text-white hover:bg-[#4096ff]"
 >
 ပြန်လည်ကြိုးစားမည်
 </button>
 </div>
 {isSettingsOpen && (
 <SettingsModal 
 onClose={() => setIsSettingsOpen(false)} 
 deferredPrompt={deferredPrompt}
 onInstall={handleInstallClick}
 highPerformanceMode={highPerformanceMode}
 setHighPerformanceMode={setHighPerformanceMode}
 />
 )}
 </div>
 );
 }

 return (
 <div
 className={`w-full max-w-[1600px] mx-auto min-h-screen pb-4 px-3 md:px-4 xl:px-5 2xl:px-6 ${
 embedded ? 'pt-2 pb-3' : 'pt-3 pb-20 md:pb-4'
 } bg-[#f5f5f5]`}
 >
 <header className="mb-3 space-y-2.5">
 {/* Standalone title row — hidden when embedded in CRM shell */}
 {!embedded && (
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-lg font-semibold tracking-tight text-[#262626]">29 Jewellery Sale</h1>
 <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
 <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${refreshing ? 'animate-pulse' : ''}`} />
 Live
 </span>
 {highPerformanceMode && (
 <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
 <Zap className="h-3 w-3" />
 Fast
 </span>
 )}
 </div>
 <p className="mt-0.5 text-[11px] text-[#8c8c8c]">
 Last updated: {lastUpdated.toLocaleTimeString()}
 </p>
 </div>

 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setIsUserGuideOpen(true)}
 className="h-8 rounded-md border border-[#e8e8e8] bg-white px-2.5 text-xs font-medium text-[#595959] hover:border-primary hover:text-primary"
 title="လမ်းညွန်စာ"
 >
 လမ်းညွန်စာ
 </button>
 <button
 onClick={handleLogout}
 className="h-8 rounded-md border border-[#e8e8e8] bg-white px-2.5 text-xs font-medium text-[#595959] hover:border-red-300 hover:text-red-600"
 title="Logout"
 >
 Logout
 </button>
 <button
 onClick={() => loadData(true)}
 disabled={refreshing || loading}
 className={`flex h-8 w-8 items-center justify-center rounded-md border border-[#e8e8e8] bg-white text-[#8c8c8c] hover:text-primary ${refreshing ? 'opacity-50' : ''}`}
 title="Refresh Data"
 >
 <Loader2 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
 </button>
 <button
 onClick={() => setIsSettingsOpen(true)}
 className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e8e8e8] bg-white text-[#8c8c8c] hover:text-primary"
 title="API Settings"
 >
 <Settings className="h-4 w-4" />
 </button>
 </div>
 </div>
 )}

 {latestUpdateDate && (
 <div className="flex items-center gap-2 rounded-lg border border-[#bae0ff] bg-[#e6f4ff] px-3 py-2 text-sm text-[#0958d9]">
 <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1677ff]" />
 <span className="font-medium">
 {latestUpdateDate} ရက်နေ့ ထိ Data Update ဖြည့်ထားပါသည်
 </span>
 {embedded && (
 <div className="ml-auto flex items-center gap-1.5">
 <span className="hidden text-[11px] text-[#8c8c8c] sm:inline">
 Updated {lastUpdated.toLocaleTimeString()}
 </span>
 <button
 onClick={() => loadData(true)}
 disabled={refreshing || loading}
 className="flex h-7 w-7 items-center justify-center rounded-md border border-[#91caff] bg-white text-[#1677ff] hover:bg-[#bae0ff]/40"
 title="Refresh"
 >
 <Loader2 className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
 </button>
 <button
 onClick={() => setIsSettingsOpen(true)}
 className="flex h-7 w-7 items-center justify-center rounded-md border border-[#91caff] bg-white text-[#595959] hover:text-primary"
 title="Settings"
 >
 <Settings className="h-3.5 w-3.5" />
 </button>
 </div>
 )}
 </div>
 )}

 {/* Tabs (standalone only) + Filters */}
 <div className="flex flex-col gap-2 rounded-xl border border-[#e8e8e8] bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
 {!embedded && (
 <div className="hidden items-center gap-0.5 overflow-x-auto rounded-lg bg-[#fafafa] p-0.5 md:flex">
 {(['overview','chairman','staff','cm','crm','detail'] as const).map((tab) => {
 const isActive = activeTab === tab;
 const isDisabled = tab ==='detail' && !selectedDetail;
 const label =
 tab ==='detail' && selectedDetail
 ? `Detail: ${selectedDetail}`
 : tab ==='cm'
 ? 'CM View'
 : tab ==='chairman'
 ? 'Chairman'
 : tab ==='crm'
 ? 'CRM'
 : tab;

 return (
 <button
 key={tab}
 onClick={() => !isDisabled && setActiveTab(tab)}
 disabled={isDisabled}
 className={`relative z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors
 ${isDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
 ${isActive ? 'bg-primary text-white shadow-sm' : 'text-[#8c8c8c] hover:bg-white hover:text-[#262626]'}
 `}
 >
 <span className="block max-w-[120px] truncate">{label}</span>
 </button>
 );
 })}
 </div>
 )}

 <div className={`flex flex-wrap items-center gap-1.5 ${embedded ? 'w-full' : 'w-full lg:w-auto'}`}>
 <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-2">
 <span className="text-[10px] font-medium uppercase tracking-wide text-[#8c8c8c]">Month</span>
 <select
 value={selectedMonth}
 onChange={(e) => {
 setMonthTouched(true);
 setSelectedMonth(e.target.value);
 setStartDate('');
 setEndDate('');
 }}
 disabled={!!(startDate || endDate)}
 className="cursor-pointer border-none bg-transparent text-xs font-semibold text-[#262626] outline-none disabled:cursor-not-allowed disabled:opacity-50"
 >
 {months.map((m) => (
 <option key={m} value={m}>
 {m}
 </option>
 ))}
 </select>
 </div>

 <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-2">
 <span className="text-[10px] font-medium uppercase tracking-wide text-[#8c8c8c]">Start</span>
 <input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-[118px] cursor-pointer border-none bg-transparent text-xs font-semibold text-[#262626] outline-none"
 />
 </div>

 <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-2">
 <span className="text-[10px] font-medium uppercase tracking-wide text-[#8c8c8c]">End</span>
 <input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-[118px] cursor-pointer border-none bg-transparent text-xs font-semibold text-[#262626] outline-none"
 />
 </div>

 {(startDate || endDate) && (
 <button
 onClick={() => {
 setStartDate('');
 setEndDate('');
 }}
 className="flex h-8 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-600 hover:bg-red-100"
 title="Clear date filter"
 >
 <X className="h-3.5 w-3.5" />
 Clear
 </button>
 )}

 <MultiSelect
 label="Branch"
 options={branches}
 selectedValues={selectedBranches}
 onToggle={handleBranchToggle}
 />

 <MultiSelect
 label="Item"
 options={itemTypes}
 selectedValues={selectedItemTypes}
 onToggle={handleItemTypeToggle}
 />
 </div>
 </div>
 </header>

 {/* Mobile bottom tabs — standalone only */}
 {!embedded && (
 <div className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-[#e8e8e8] bg-white/95 px-2 py-2 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] md:hidden">
 {(['overview','chairman','staff','cm','crm','detail'] as const).map((tab) => {
 const isActive = activeTab === tab;
 const isDisabled = tab ==='detail' && !selectedDetail;

 return (
 <button
 key={tab}
 onClick={() => !isDisabled && setActiveTab(tab)}
 disabled={isDisabled}
 className={`flex flex-col items-center gap-0.5 transition-all
 ${isDisabled ? 'opacity-20' : 'opacity-100'}
 ${isActive ? 'text-primary' : 'text-[#8c8c8c]'}
 `}
 >
 <div className={`rounded-md p-1 transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
 {tab ==='overview' && <LayoutDashboard className="h-4 w-4" />}
 {tab ==='chairman' && <Crown className="h-4 w-4" />}
 {tab ==='staff' && <Users className="h-4 w-4" />}
 {tab ==='cm' && <Layers className="h-4 w-4" />}
 {tab ==='crm' && <UserCircle className="h-4 w-4" />}
 {tab ==='detail' && <BarChart3 className="h-4 w-4" />}
 </div>
 <span className="text-[9px] font-semibold uppercase tracking-wide">
 {tab ==='detail' && selectedDetail
 ? 'Detail'
 : tab ==='cm'
 ? 'CM'
 : tab ==='chairman'
 ? 'Chair'
 : tab ==='crm'
 ? 'CRM'
 : tab}
 </span>
 </button>
 );
 })}
 </div>
 )}
 
 {error && (
 <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 md:flex-row">
 <span className="text-sm font-medium">Error updating data: {error}</span>
 <div className="flex gap-2">
 <button 
 onClick={() => loadData(true)}
 className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
 >
 Retry
 </button>
 <button 
 onClick={() => setIsSettingsOpen(true)}
 className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
 >
 Change URL
 </button>
 </div>
 </div>
 )}

 {activeTab ==='overview' ? (
 <OverviewView 
 data={data}
 filteredData={filteredData}
 displayData={displayData}
 weekFilteredData={weekFilteredData}
 selectedBranches={selectedBranches}
 selectedMonth={selectedMonth}
 selectedDay={selectedDay}
 selectedWeek={selectedWeek}
 setSelectedDay={setSelectedDay}
 setSelectedWeek={setSelectedWeek}
 setSelectedDetail={setSelectedDetail}
 setActiveTab={setActiveTab}
 setSelectedMonth={setSelectedMonth}
 setSelectedItemType={handleItemTypeToggle}
 highPerformanceMode={highPerformanceMode}
 />
 ) : activeTab ==='chairman' ? (
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1677ff] animate-spin" /></div>}>
 <ChairmanView data={filteredData} allData={parsedData} selectedMonth={selectedMonth} targetSheetData={targetSheetData} selectedBranches={selectedBranches} onCusDetail={(shop) => { setSelectedBranches([shop]); setCmInitialViewMode('cusList'); setActiveTab('cm'); }} />
 </Suspense>
 ) : activeTab ==='staff' ? (
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1677ff] animate-spin" /></div>}>
 <StaffView
 data={staffViewData}
 selectedMonth={selectedMonth}
 selectedBranches={selectedBranches}
 startDate={startDate}
 endDate={endDate}
 onSelectStaff={(name) => {
 setSelectedDetail(name);
 setActiveTab('detail');
 }}
 highPerformanceMode={highPerformanceMode}
 />
 </Suspense>
 ) : activeTab ==='cm' ? (
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1677ff] animate-spin" /></div>}>
 <CmView
 data={filteredData}
 allData={parsedData}
 selectedMonth={selectedMonth}
 selectedBranches={selectedBranches}
 highPerformanceMode={highPerformanceMode}
 initialViewMode={cmInitialViewMode}
 cusListAsTable
 />
 </Suspense>
 ) : activeTab ==='crm' ? (
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1677ff] animate-spin" /></div>}>
 <CrmView
 data={filteredData}
 allData={parsedData}
 selectedMonth={selectedMonth}
 selectedBranches={selectedBranches}
 />
 </Suspense>
 ) : (
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1677ff] animate-spin" /></div>}>
 <DetailView
 name={selectedDetail!}
 data={displayData.filter(row => {
 const size = row['တဖွဲ့တွင်ပါဝင်သောလူဦးရေ'] ||'1';
 const numSize = parseInt(size);
 const sizeLabel = !isNaN(numSize) ? (numSize >= 5 ? '5+' : `${numSize} Person`) : '';
 
 // If we are viewing a branch detail, we should probably respect the global branch filter
 // but the logic below checks if the row belongs to the'selectedDetail'
 // which could be a branch name, staff name, etc.
 return row['Branch အမည်'] === selectedDetail || 
 row['Customer Service အမည်'] === selectedDetail ||
 row['အရောင်းသမားအမည်'] === selectedDetail ||
 getExtractedReason(row) === selectedDetail ||
 row['Item Category'] === selectedDetail ||
 row['Customer Type(Old/New)'] === selectedDetail ||
 row['Region'] === selectedDetail ||
 row['Township'] === selectedDetail ||
 sizeLabel === selectedDetail;
 })}
 onBack={() => setActiveTab('overview')}
 highPerformanceMode={highPerformanceMode}
 />
 </Suspense>
 )}
 
 {isSettingsOpen && (
 <SettingsModal
 onClose={() => setIsSettingsOpen(false)}
 deferredPrompt={deferredPrompt}
 onInstall={handleInstallClick}
 highPerformanceMode={highPerformanceMode}
 setHighPerformanceMode={setHighPerformanceMode}
 />
 )}

 {isUserGuideOpen && (
 <UserGuideModal onClose={() => setIsUserGuideOpen(false)} />
 )}
 </div>
 );
}

interface SettingsModalProps {
 onClose: () => void;
 deferredPrompt: any;
 onInstall: () => void;
 highPerformanceMode: boolean;
 setHighPerformanceMode: (value: boolean) => void;
}

function SettingsModal({ onClose, deferredPrompt, onInstall, highPerformanceMode, setHighPerformanceMode }: SettingsModalProps) {
 return (
 <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl shadow-sm w-full max-w-lg overflow-hidden">
 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
 <h3 className="text-lg font-bold text-gray-900">Settings</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6 space-y-6">
 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
 {deferredPrompt ? (
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-bold text-blue-900">Install App</h4>
 <p className="text-xs text-blue-700">Install this dashboard on your home screen for quick access.</p>
 </div>
 <button 
 onClick={onInstall}
 className="flex items-center gap-2 px-4 py-2 bg-[#1677ff] text-white rounded-lg text-sm font-bold hover:bg-[#4096ff] transition-colors shadow-sm"
 >
 <Download className="w-4 h-4" />
 Install
 </button>
 </div>
 ) : (
 <div>
 <h4 className="text-sm font-bold text-blue-900">How to Install</h4>
 <p className="text-xs text-blue-700 mt-1">
 If you don't see the install button:
 </p>
 <ul className="text-xs text-blue-700 list-disc ml-4 mt-1 space-y-1">
 <li>Make sure you opened the app in a <strong>New Tab</strong> (not inside AI Studio).</li>
 <li>On iPhone: Tap <strong>Share</strong> and select <strong>"Add to Home Screen"</strong>.</li>
 <li>On Android/Chrome: Look for <strong>"Install App"</strong> in the browser menu.</li>
 </ul>
 </div>
 )}
 </div>

 {/* High Performance Mode Toggle */}
 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
 <div className="flex items-center justify-between">
 <div className="flex-1 pr-4">
 <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
 High Performance Mode (မြန်ဆန်မှု အမျိုးအစား)
 </h4>
 <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
 Windows စက်မျိုးတွင် ပိုမိုမြန်ဆန်စေရန်အတွက် animation များကို လျှော့ချပြီး data update frequency ကို ၂ မိနစ်အထိတိုးမြှင့်ပါသည်။ လေးလေ့မှု ကင်းလွတ်စေရန်ဤ mode ကို ဖွင့်ပါ။
 </p>
 </div>
 <button
 onClick={() => {
 const newValue = !highPerformanceMode;
 setHighPerformanceMode(newValue);
 localStorage.setItem('highPerformanceMode', String(newValue));
 }}
 className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
 highPerformanceMode ? 'bg-emerald-500' : 'bg-gray-300'
 }`}
 role="switch"
 aria-checked={highPerformanceMode}
 >
 <span
 className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
 highPerformanceMode ? 'translate-x-6' : 'translate-x-1'
 }`}
 />
 </button>
 </div>
 </div>
 </div>
 <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
 <button 
 onClick={onClose}
 className="px-6 py-2 text-sm font-semibold text-white bg-[#1677ff] hover:bg-[#4096ff] rounded-xl shadow-sm transition-colors"
 >
 ပိတ်မည်
 </button>
 </div>
 </div>
 </div>
 );
}

function UserGuideModal({ onClose }: { onClose: () => void }) {
 return (
 <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl shadow-sm w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
 <h3 className="text-lg font-bold text-gray-900">App အသုံးပြုပုံ လမ်းညွန်စာ</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6 overflow-y-auto space-y-6">
 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
 <h4 className="text-sm font-bold text-blue-900 mb-2">🔐 အကယ်၍ စတင်သုံးရင်</h4>
 <p className="text-xs text-blue-700 mb-1">CRM account ဖြင့် Login ဝင်ထားရပါမယ်။</p>
 <p className="text-xs text-blue-600 mt-2">Sales data ကို server database ထဲမှ တိုက်ရိုက် ဆွဲယူပါသည် — Google Sheet မသုံးတော့ပါ။</p>
 </div>

 <div>
 <h4 className="text-sm font-bold text-gray-900 mb-2">📊 Overview View - အဓိက ရောင်းအား ကြည့်ရန်</h4>
 <p className="text-xs text-gray-600 mb-2">ဒါဟာ အဓိက page ဖြစ်ပါတယ်။ ဒီမှာ တစ်ခုချင်းစီကို ရွေးချယ်နိုင်ပါတယ်:</p>
 <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
 <li><strong>Month:</strong> ဘယ်လ ရောင်းအား ကြည့်မလဲ ရွေးနိုင်ပါတယ် (ဥပမာ - January, February)</li>
 <li><strong>Branch:</strong> ဘယ် Branch ရောင်းအား ကြည့်မလဲ ရွေးနိုင်ပါတယ် (ဥပမာ - Yangon, Mandalay)</li>
 <li><strong>Item Type:</strong> ဘယ် type ရောင်းအား ကြည့်မလဲ ရွေးနိုင်ပါတယ် (Dia Sale, G Sale, PT Sale)</li>
 <li><strong>Date Range:</strong> ရက်စွဲ သတ်မှတ်နိုင်ပါတယ် (Start Date နဲ့ End Date)</li>
 </ul>
 </div>

 <div>
 <h4 className="text-sm font-bold text-gray-900 mb-2">👥 Staff View - Staff အလိုက် ကြည့်ရန်</h4>
 <p className="text-xs text-gray-600 mb-2">Staff တစ်ယောက်ချင်းစီရဲ့ ရောင်းအားကို ကြည့်နိုင်ပါတယ်။</p>
 <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
 <li>Staff တစ်ယောက်ချင်းစီရဲ့ ရောင်းအားကို နှိုင်းယှဉ်နိုင်ပါတယ်</li>
 <li>Staff တစ်ယောက်ချင်းစီရဲ့ Dia, Gold, PT ရောင်းအားကို ကြည့်နိုင်ပါတယ်</li>
 <li>Staff တစ်ယောက်ချင်းစီရဲ့ RC (Return/Cancel) အချက်အလက်ကို ကြည့်နိုင်ပါတယ်</li>
 </ul>
 </div>

 <div>
 <h4 className="text-sm font-bold text-gray-900 mb-2">🔍 Detail View - အသေးစိတ် ကြည့်ရန်</h4>
 <p className="text-xs text-gray-600 mb-2">Branch တစ်ခုချင်းစီရဲ့ အသေးစိတ် အချက်အလက်ကို ကြည့်နိုင်ပါတယ်။</p>
 <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
 <li>Branch တစ်ခုချင်းစီရဲ့ အသေးစိတ် အချက်အလက်ကို ကြည့်နိုင်ပါတယ်</li>
 <li>Staff တစ်ယောက်ချင်းစီရဲ့ အသေးစိတ် အချက်အလက်ကို ကြည့်နိုင်ပါတယ်</li>
 <li>Item Type တစ်ခုချင်းစီရဲ့ အသေးစိတ် အချက်အလက်ကို ကြည့်နိုင်ပါတယ်</li>
 </ul>
 </div>

 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
 <h4 className="text-sm font-bold text-emerald-900 mb-2">💎 CM View - Special Features</h4>
 <p className="text-xs text-emerald-700 mb-2">ဒါဟာ အထူး feature ဖြစ်ပါတယ်။ အောက်ပါ options တွေရှိပါတယ်:</p>
 <ul className="text-xs text-emerald-700 space-y-2 list-disc list-inside">
 <li><strong>Report အားလုံးကြည့်ရန်:</strong> Branch အလိုက် Dia, Gold, PT Sales နဲ့ RC အချက်အလက်များကို ကြည့်နိုင်ပါတယ်။ Branch ကို click လုပ်ရင် ဒီ့ရက်စွဲများကို ကြည့်နိုင်ပါတယ်။ ရက်တစ်ရက်ကို click လုပ်ရင် အဲ့ရက်ပဲပြပေးပါမယ်။</li>
 <li><strong>Net Sale Report:</strong> Sale - RC = Net Sale ကို တွက်ပေးပါတယ်။ Amount (ပမာဏ), Gram (အလေးချိန်), Qty (အရေအတွက်) ဖြင့် ပြောင်းနိုင်ပါတယ်။</li>
 <li><strong>All Branch Sale:</strong> Branch အလိုက် Dia, Gold, PT အလိုက် Sales အချက်အလက်များကို ကြည့်နိုင်ပါတယ်။</li>
 <li><strong>Item အလိုက်ရောင်းအား:</strong> Category (ဥပမာ - Ring, Necklace) အလိုက် Sales အချက်အလက်များကို ကြည့်နိုင်ပါတယ်။ Category ကို click လုပ်ရင် Branch အလိုက် breakdown ကို ကြည့်နိုင်ပါတယ်။ <strong>"Cus များ"</strong> button နိပ်ရင် အဲ့ category ဝယ်ဖူးသော customers များကို ကြည့်နိုင်ပါတယ်။</li>
 <li><strong>CUS List:</strong> Customer တစ်ယောက်ချင်းစီရဲ့ Sales အချက်အလက်များကို ကြည့်နိုင်ပါတယ်။ Customer ကို click လုပ်ရင် Branch နဲ့ Category breakdown များကို ကြည့်နိုင်ပါတယ်။ Customer name နဲ့ ရက်အရေအတွက်ဖြင့် search လုပ်နိုင်ပါတယ်။</li>
 </ul>
 </div>

 <div>
 <h4 className="text-sm font-bold text-gray-900 mb-2">⚙️ Filters အသုံးပြုပုံ</h4>
 <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
 <li><strong>Month:</strong> လအလိုက် filter လုပ်နိုင်ပါတယ်။ "All" ကို ရွေးရင် အချက်အလက်အားလုံးကို ပြပေးပါမယ်</li>
 <li><strong>Branch:</strong> Branch တစ်ခု သို့မဟုတ် အားလုံးကို ရွေးနိုင်ပါတယ်။ တစ်ခုထက်ပို ရွေးနိုင်ပါတယ်</li>
 <li><strong>Item Type:</strong> Dia Sale, G Sale, PT Sale ဖြင့် filter လုပ်နိုင်ပါတယ်။ "All" ကို ရွေးရင် အချက်အလက်အားလုံးကို ပြပေးပါမယ်</li>
 <li><strong>Date Range:</strong> ရက်စွဲအတိုင်းအတာ သတ်မှတ်နိုင်ပါတယ်။ Start Date နဲ့ End Date သတ်မှတ်နိုင်ပါတယ်</li>
 </ul>
 </div>

 <div>
 <h4 className="text-sm font-bold text-gray-900 mb-2">📥 Excel Export လုပ်နည်း</h4>
 <p className="text-xs text-gray-600 mb-2">Excel export button ဖြင့် အချက်အလက်များကို Excel file အဖြစ် download လုပ်နိုင်ပါတယ်။</p>
 <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
 <li>CM View မှာ "Export Excel" button နိပ်ရင် CUS List နဲ့ Branch Report များကို export လုပ်နိုင်ပါတယ်</li>
 <li>CUS List export မှာ Branch နဲ့ Category breakdown များပါ ပါဝင်ပါတယ်</li>
 </ul>
 </div>

 <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
 <h4 className="text-sm font-bold text-amber-900 mb-2">💡 အထူး Tips များ</h4>
 <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside">
 <li>Header မှာ Refresh button (↻) နိပ်ရင် Data အသစ်ကို ရယူနိုင်ပါတယ်</li>
 <li>Settings မှာ High Performance Mode ဖွင့်ထားရင် App ပိုမြန်ဆန်ပါတယ် (animations များ ပိတ်သွားပါတယ်)</li>
 <li>CM View မှာ Daily Breakdown ကို click လုပ်ရင် ကျန်ရက်များကို hide လုပ်ပေးပါတယ်။ ပြန် click လုပ်ရင် ရက်အားလုံးပြပေးပါတယ်</li>
 <li>Item အလိုက်ရောင်းအားမှာ "Cus များ" button နိပ်ရင် အဲ့ category ဝယ်ဖူးသော customers များကို CUS List မှာ filter လုပ်ပြပေးပါတယ်</li>
 <li>CUS List မှာ category filter badge ကို ✕ button နိပ်ရင် filter ကို clear လုပ်နိုင်ပါတယ်</li>
 </ul>
 </div>
 </div>
 <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
 <button
 onClick={onClose}
 className="px-6 py-2 text-sm font-semibold text-[#262626] bg-[#1677ff] hover:bg-[#4096ff] rounded-xl shadow-sm transition-colors"
 >
 ပိတ်မည်
 </button>
 </div>
 </div>
 </div>
 );
}
