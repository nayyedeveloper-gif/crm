import React, { useMemo, useState, memo, useEffect, useCallback } from'react';
import { Search, ChevronRight, Users, Crown, Star, Heart, Phone, MapPin, Calendar, TrendingUp, Download, MessageSquare, X, Clock, CheckCircle, AlertCircle, Cake, Gift, Pencil, Copy, PartyPopper, Camera, ImageIcon, Eye, Mic, Play } from'lucide-react';
import { DataRow } from'../types';
import { branchFilterShowsAll, getExtractedReason, parseSafeDate } from'../utils';
import * as XLSX from'xlsx';

interface CrmViewProps {
 data: DataRow[];
 allData?: DataRow[];
 selectedMonth: string;
 selectedBranches: string[];
}

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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const FOLLOWUP_STORAGE_KEY ='crmFollowUps';

type InteractionType ='Call' |'SMS' |'Viber' |'Visit' |'Other';
type FollowUpStatus ='Pending' |'Interested' |'Converted' |'Lost';
type InterestLevel ='Low' |'Medium' |'High';

interface FollowUpRecord {
 id: string;
 customerKey: string;
 customerName: string;
 contactDate: string;
 interactionType: InteractionType;
 notes: string;
 status: FollowUpStatus;
 interestLevel: InterestLevel;
 nextActionDate: string;
 photo: string;
 audio: string;
 createdAt: string;
}

const interestLevelConfig: Record<InterestLevel, { badge: string; color: string }> = {
 Low: { badge: 'bg-gray-100 text-gray-600 border-[#e8e8e8]', color: 'text-gray-500' },
 Medium: { badge: 'bg-amber-100 text-amber-700 border-amber-200', color: 'text-amber-600' },
 High: { badge: 'bg-rose-100 text-rose-700 border-rose-200', color: 'text-rose-600' },
};

const loadFollowUps = (): Record<string, FollowUpRecord[]> => {
 try {
 const raw = localStorage.getItem(FOLLOWUP_STORAGE_KEY);
 return raw ? JSON.parse(raw) : {};
 } catch {
 return {};
 }
};

const saveFollowUps = (data: Record<string, FollowUpRecord[]>) => {
 try {
 localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(data));
 } catch {}
};

const statusConfig: Record<FollowUpStatus, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
 Pending: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
 Interested: { badge: 'bg-sky-100 text-sky-700 border-sky-200', icon: AlertCircle },
 Converted: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
 Lost: { badge: 'bg-rose-100 text-rose-700 border-rose-200', icon: X },
};

const interactionIcons: Record<InteractionType, string> = {
 Call: '📞',
 SMS: '💬',
 Viber: '🟣',
 Visit: '🏠',
 Other: '📝',
};

const DOB_STORAGE_KEY ='crmDobs';
const REDEEMED_STORAGE_KEY ='crmBirthdayRedeemed';
const REDEMPTION_HISTORY_STORAGE_KEY ='crmRedemptionHistory';
const REDEMPTION_DETAILS_STORAGE_KEY ='crmRedemptionDetails';

interface RedemptionRecord {
 id: string;
 year: number;
 giftDescription: string;
 interactionDate: string;
 staffName: string;
 photo: string;
 notes: string;
 createdAt: string;
}

const loadDobs = (): Record<string, string> => {
 try {
 const raw = localStorage.getItem(DOB_STORAGE_KEY);
 return raw ? JSON.parse(raw) : {};
 } catch { return {}; }
};

const saveDobs = (data: Record<string, string>) => {
 try { localStorage.setItem(DOB_STORAGE_KEY, JSON.stringify(data)); } catch {}
};

const loadRedeemed = (): Record<string, boolean> => {
 try {
 const raw = localStorage.getItem(REDEEMED_STORAGE_KEY);
 return raw ? JSON.parse(raw) : {};
 } catch { return {}; }
};

const saveRedeemed = (data: Record<string, boolean>) => {
 try { localStorage.setItem(REDEEMED_STORAGE_KEY, JSON.stringify(data)); } catch {}
};

const loadRedemptionHistory = (): Record<string, RedemptionRecord[]> => {
 try {
 const raw = localStorage.getItem(REDEMPTION_HISTORY_STORAGE_KEY);
 if (raw) return JSON.parse(raw);
 const oldRaw = localStorage.getItem(REDEMPTION_DETAILS_STORAGE_KEY);
 if (oldRaw) {
 const oldData: Record<string, { giftDescription: string; interactionDate: string; staffName: string; photo: string; notes: string; createdAt: string }> = JSON.parse(oldRaw);
 const migrated: Record<string, RedemptionRecord[]> = {};
 for (const [key, val] of Object.entries(oldData)) {
 const year = val.interactionDate ? new Date(val.interactionDate).getFullYear() : new Date(val.createdAt).getFullYear();
 migrated[key] = [{ id: `migrated-${key}`, year, ...val }];
 }
 localStorage.setItem(REDEMPTION_HISTORY_STORAGE_KEY, JSON.stringify(migrated));
 return migrated;
 }
 return {};
 } catch { return {}; }
};

const saveRedemptionHistory = (data: Record<string, RedemptionRecord[]>) => {
 try { localStorage.setItem(REDEMPTION_HISTORY_STORAGE_KEY, JSON.stringify(data)); } catch {}
};

const getDobMonth = (dob: string): number | null => {
 if (!dob) return null;
 const parts = dob.split('-');
 if (parts.length < 2) return null;
 const m = parseInt(parts[1]);
 return isNaN(m) ? null : m - 1;
};

const getDobDay = (dob: string): number | null => {
 if (!dob) return null;
 const parts = dob.split('-');
 if (parts.length < 2) return null;
 const d = parseInt(parts[2]);
 return isNaN(d) ? null : d;
};

const formatDobShort = (dob: string): string => {
 if (!dob) return'-';
 const parts = dob.split('-');
 if (parts.length < 3) return dob;
 const m = parseInt(parts[1]);
 const d = parseInt(parts[2]);
 if (isNaN(m) || isNaN(d)) return dob;
 return `${d.toString().padStart(2,'0')} ${MONTHS[m - 1].slice(0, 3)}`;
};

const isBirthdayInCurrentMonth = (dob: string): boolean => {
 const m = getDobMonth(dob);
 if (m === null) return false;
 return m === new Date().getMonth();
};

const isBirthdayInCurrentWeek = (dob: string): boolean => {
 const m = getDobMonth(dob);
 const d = getDobDay(dob);
 if (m === null || d === null) return false;
 const now = new Date();
 if (m !== now.getMonth()) return false;
 const today = now.getDate();
 const dayOfWeek = now.getDay();
 const weekStart = today - dayOfWeek;
 const weekEnd = weekStart + 6;
 return d >= weekStart && d <= weekEnd;
};

const getDaysUntilBirthday = (dob: string): number | null => {
 const m = getDobMonth(dob);
 const d = getDobDay(dob);
 if (m === null || d === null) return null;
 const now = new Date();
 const birthdayThisYear = new Date(now.getFullYear(), m, d);
 if (birthdayThisYear < now) birthdayThisYear.setFullYear(now.getFullYear() + 1);
 return Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

const getRowBranch = (row: DataRow) =>
 String(row['Branch'] ?? row['Branch'] ?? row['Branch အမည်'] ?? 'Unknown').trim();

const getRowDate = (row: DataRow) => {
 const dateStr = row.Date || row.Timestamp?.split(' ')[0];
 return parseSafeDate(dateStr);
};

const formatDisplayDate = (date: Date) => {
 const d = date.getDate().toString().padStart(2,'0');
 const m = (date.getMonth() + 1).toString().padStart(2,'0');
 const y = date.getFullYear();
 return `${d}.${m}.${y}`;
};

const isSaleReasonRow = (row: DataRow) => {
 const reason = (getExtractedReason(row) ||'').trim();
 return SALE_REASONS.has(reason);
};

const isRcReasonRow = (row: DataRow) => {
 const reason = (getExtractedReason(row) ||'').trim();
 return RC_REASONS.has(reason);
};

const parseRowQtyGram = (row: DataRow) => {
 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 return { q: isNaN(qty) ? 1 : qty };
};

const getDaysSinceDate = (date: Date | null) => {
 if (!date) return null;
 const now = new Date();
 const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
 return diff;
};

type Tier ='CIP' |'VVIP' |'VIP' |'CARE';

interface CrmCustomer {
 key: string;
 buyerName: string;
 contactNumber: string;
 township: string;
 branch: string;
 totalAmount: number;
 rcAmount: number;
 netAmount: number;
 purchaseCount: number;
 lastPurchaseDate: Date | null;
 lastPurchaseDateLabel: string;
 daysSinceLastPurchase: number | null;
 tier: Tier;
 branchBreakdown: Record<string, { totalAmount: number; purchaseCount: number }>;
}

const tierConfig: Record<Tier, {
 label: string;
 gradient: string;
 badge: string;
 ring: string;
 icon: React.ComponentType<{ className?: string }>;
 threshold: number;
}> = {
 CIP: {
 label: 'CIP',
 gradient: 'from-purple-600 via-purple-500 to-indigo-500',
 badge: 'bg-purple-100 text-purple-700 border-purple-200',
 ring: 'ring-purple-200',
 icon: Crown,
 threshold: 100_000_000,
 },
 VVIP: {
 label: 'VVIP',
 gradient: 'from-amber-600 via-amber-500 to-orange-500',
 badge: 'bg-amber-100 text-amber-700 border-amber-200',
 ring: 'ring-amber-200',
 icon: Star,
 threshold: 50_000_000,
 },
 VIP: {
 label: 'VIP',
 gradient: 'from-sky-500 via-blue-400 to-sky-300',
 badge: 'bg-sky-100 text-sky-700 border-sky-200',
 ring: 'ring-sky-200',
 icon: Star,
 threshold: 30_000_000,
 },
 CARE: {
 label: 'Care',
 gradient: 'from-gray-600 via-gray-500 to-slate-500',
 badge: 'bg-gray-100 text-gray-600 border-[#e8e8e8]',
 ring: 'ring-gray-200',
 icon: Heart,
 threshold: 0,
 },
};

const getTier = (totalAmount: number): Tier => {
 if (totalAmount >= 100_000_000) return'CIP';
 if (totalAmount >= 50_000_000) return'VVIP';
 if (totalAmount >= 30_000_000) return'VIP';
 return'CARE';
};

const CrmView = memo(({ data, allData, selectedMonth, selectedBranches }: CrmViewProps) => {
 const [tierFilter, setTierFilter] = useState<Tier | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [monthMode, setMonthMode] = useState<'current' |'all'>('current');
 const [sortBy, setSortBy] = useState<'totalAmount' |'purchaseCount' |'lastPurchaseDate' |'name'>('totalAmount');
 const [sortOrder, setSortOrder] = useState<'asc' |'desc'>('desc');
 const [expandedRow, setExpandedRow] = useState<string | null>(null);
 const [visibleCount, setVisibleCount] = useState(20);
 const [followUps, setFollowUps] = useState<Record<string, FollowUpRecord[]>>(loadFollowUps);
 const [showFollowUpModal, setShowFollowUpModal] = useState(false);
 const [followUpCustomer, setFollowUpCustomer] = useState<CrmCustomer | null>(null);
 const [showHistoryModal, setShowHistoryModal] = useState(false);
 const [historyCustomer, setHistoryCustomer] = useState<CrmCustomer | null>(null);
 const [followUpForm, setFollowUpForm] = useState({
 contactDate: new Date().toISOString().split('T')[0],
 interactionType: 'Call' as InteractionType,
 notes: '',
 status: 'Pending' as FollowUpStatus,
 interestLevel: 'Medium' as InterestLevel,
 nextActionDate: '',
 photo: '',
 audio: '',
 });
 const [dobData, setDobData] = useState<Record<string, string>>(loadDobs);
 const [redeemedData, setRedeemedData] = useState<Record<string, boolean>>(loadRedeemed);
 const [showDobModal, setShowDobModal] = useState(false);
 const [dobCustomer, setDobCustomer] = useState<CrmCustomer | null>(null);
 const [dobValue, setDobValue] = useState('');
 const [viewMode, setViewMode] = useState<'list' |'birthday'>('list');
 const [birthdayReportMode, setBirthdayReportMode] = useState<'week' |'month'>('month');
 const [showGreetingModal, setShowGreetingModal] = useState(false);
 const [greetingCustomer, setGreetingCustomer] = useState<CrmCustomer | null>(null);
 const [greetingCopied, setGreetingCopied] = useState(false);
 const [redemptionHistory, setRedemptionHistory] = useState<Record<string, RedemptionRecord[]>>(loadRedemptionHistory);
 const [showRedemptionModal, setShowRedemptionModal] = useState(false);
 const [redemptionCustomer, setRedemptionCustomer] = useState<CrmCustomer | null>(null);
 const [redemptionEditId, setRedemptionEditId] = useState<string | null>(null);
 const [redemptionForm, setRedemptionForm] = useState({
 giftDescription: '',
 interactionDate: new Date().toISOString().split('T')[0],
 staffName: '',
 photo: '',
 notes: '',
 });
 const [showRedemptionViewModal, setShowRedemptionViewModal] = useState(false);
 const [redemptionViewCustomer, setRedemptionViewCustomer] = useState<CrmCustomer | null>(null);
 const [redemptionViewTab, setRedemptionViewTab] = useState<'current' |'history'>('current');

 useEffect(() => {
 setVisibleCount(20);
 }, [searchQuery, tierFilter, monthMode, sortBy, sortOrder]);

 useEffect(() => {
 const now = new Date();
 const currentMonth = now.getMonth();
 const currentDay = now.getDate();
 const toReset: string[] = [];
 for (const [key, isRedeemed] of Object.entries(redeemedData)) {
 if (!isRedeemed) continue;
 const dob = dobData[key];
 if (!dob) continue;
 const dobMonth = getDobMonth(dob);
 const dobDay = getDobDay(dob);
 if (dobMonth === null || dobDay === null) continue;
 if (dobMonth < currentMonth || (dobMonth === currentMonth && dobDay < currentDay)) {
 toReset.push(key);
 }
 }
 if (toReset.length > 0) {
 setRedeemedData((prev) => {
 const updated = { ...prev };
 for (const key of toReset) {
 updated[key] = false;
 }
 saveRedeemed(updated);
 return updated;
 });
 }
 }, [redeemedData, dobData]);

 const handleOpenFollowUp = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setFollowUpCustomer(customer);
 setFollowUpForm({
 contactDate: new Date().toISOString().split('T')[0],
 interactionType: 'Call',
 notes: '',
 status: 'Pending',
 interestLevel: 'Medium',
 nextActionDate: '',
 photo: '',
 audio: '',
 });
 setShowFollowUpModal(true);
 }, []);

 const handleSaveFollowUp = useCallback(() => {
 if (!followUpCustomer) return;
 const record: FollowUpRecord = {
 id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 customerKey: followUpCustomer.key,
 customerName: followUpCustomer.buyerName,
 contactDate: followUpForm.contactDate,
 interactionType: followUpForm.interactionType,
 notes: followUpForm.notes.trim(),
 status: followUpForm.status,
 interestLevel: followUpForm.interestLevel,
 nextActionDate: followUpForm.nextActionDate,
 photo: followUpForm.photo,
 audio: followUpForm.audio,
 createdAt: new Date().toISOString(),
 };
 setFollowUps((prev) => {
 const updated = { ...prev };
 const list = updated[followUpCustomer.key] || [];
 updated[followUpCustomer.key] = [...list, record];
 saveFollowUps(updated);
 return updated;
 });
 setShowFollowUpModal(false);
 setFollowUpCustomer(null);
 }, [followUpCustomer, followUpForm]);

 const handleOpenHistory = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setHistoryCustomer(customer);
 setShowHistoryModal(true);
 }, []);

 const handleDeleteFollowUp = useCallback((recordId: string, customerKey: string) => {
 setFollowUps((prev) => {
 const updated = { ...prev };
 updated[customerKey] = (updated[customerKey] || []).filter((r) => r.id !== recordId);
 saveFollowUps(updated);
 return updated;
 });
 }, []);

 const getFollowUpCount = useCallback((customerKey: string) => {
 return (followUps[customerKey] || []).length;
 }, [followUps]);

 const handleOpenDobEditor = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setDobCustomer(customer);
 setDobValue(dobData[customer.key] ||'');
 setShowDobModal(true);
 }, [dobData]);

 const handleSaveDob = useCallback(() => {
 if (!dobCustomer) return;
 setDobData((prev) => {
 const updated = { ...prev };
 if (dobValue) updated[dobCustomer.key] = dobValue;
 else delete updated[dobCustomer.key];
 saveDobs(updated);
 return updated;
 });
 setShowDobModal(false);
 setDobCustomer(null);
 }, [dobCustomer, dobValue]);

 const handleToggleRedeemed = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setRedeemedData((prev) => {
 const updated = { ...prev };
 updated[customer.key] = !updated[customer.key];
 saveRedeemed(updated);
 return updated;
 });
 }, []);

 const handleOpenRedemption = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setRedemptionCustomer(customer);
 setRedemptionEditId(null);
 setRedemptionForm({
 giftDescription: '',
 interactionDate: new Date().toISOString().split('T')[0],
 staffName: '',
 photo: '',
 notes: '',
 });
 setShowRedemptionModal(true);
 }, []);

 const handleSaveRedemption = useCallback(() => {
 if (!redemptionCustomer) return;
 const currentYear = new Date().getFullYear();
 const record: RedemptionRecord = {
 id: redemptionEditId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 year: currentYear,
 giftDescription: redemptionForm.giftDescription.trim(),
 interactionDate: redemptionForm.interactionDate,
 staffName: redemptionForm.staffName.trim(),
 photo: redemptionForm.photo,
 notes: redemptionForm.notes.trim(),
 createdAt: new Date().toISOString(),
 };
 setRedemptionHistory((prev) => {
 const existing = prev[redemptionCustomer.key] || [];
 let updatedList: RedemptionRecord[];
 if (redemptionEditId) {
 updatedList = existing.map((r) => r.id === redemptionEditId ? record : r);
 } else {
 const withoutCurrentYear = existing.filter((r) => r.year !== currentYear);
 updatedList = [...withoutCurrentYear, record];
 }
 const updated = { ...prev, [redemptionCustomer.key]: updatedList };
 saveRedemptionHistory(updated);
 return updated;
 });
 setRedeemedData((prev) => {
 const updated = { ...prev, [redemptionCustomer.key]: true };
 saveRedeemed(updated);
 return updated;
 });
 setShowRedemptionModal(false);
 setRedemptionCustomer(null);
 setRedemptionEditId(null);
 }, [redemptionCustomer, redemptionForm, redemptionEditId]);

 const handleOpenRedemptionView = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setRedemptionViewCustomer(customer);
 setRedemptionViewTab('current');
 setShowRedemptionViewModal(true);
 }, []);

 const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.type.match(/image\/(jpeg|jpg|png)/)) return;
 const reader = new FileReader();
 reader.onload = () => {
 setRedemptionForm((prev) => ({ ...prev, photo: reader.result as string }));
 };
 reader.readAsDataURL(file);
 }, []);

 const handleFollowUpPhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.type.match(/image\/(jpeg|jpg|png)/)) return;
 const reader = new FileReader();
 reader.onload = () => {
 setFollowUpForm((prev) => ({ ...prev, photo: reader.result as string }));
 };
 reader.readAsDataURL(file);
 }, []);

 const handleFollowUpAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.type.match(/audio\/(mpeg|mp3|wav|ogg|m4a|webm)/) && !file.type.startsWith('audio/')) return;
 const reader = new FileReader();
 reader.onload = () => {
 setFollowUpForm((prev) => ({ ...prev, audio: reader.result as string }));
 };
 reader.readAsDataURL(file);
 }, []);

 const getCurrentYearRedemption = useCallback((customerKey: string): RedemptionRecord | null => {
 const currentYear = new Date().getFullYear();
 const records = redemptionHistory[customerKey] || [];
 return records.find((r) => r.year === currentYear) || null;
 }, [redemptionHistory]);

 const getRedemptionHistorySorted = useCallback((customerKey: string): RedemptionRecord[] => {
 const records = redemptionHistory[customerKey] || [];
 return [...records].sort((a, b) => b.year - a.year);
 }, [redemptionHistory]);

 const getPreviousYearRedemption = useCallback((customerKey: string): RedemptionRecord | null => {
 const currentYear = new Date().getFullYear();
 const records = (redemptionHistory[customerKey] || []).filter((r) => r.year < currentYear);
 if (records.length === 0) return null;
 return records.sort((a, b) => b.year - a.year)[0];
 }, [redemptionHistory]);

 const hasRedemptionHistory = useCallback((customerKey: string): boolean => {
 return (redemptionHistory[customerKey] || []).length > 0;
 }, [redemptionHistory]);

 const handleOpenGreeting = useCallback((customer: CrmCustomer, e: React.MouseEvent) => {
 e.stopPropagation();
 setGreetingCustomer(customer);
 setGreetingCopied(false);
 setShowGreetingModal(true);
 }, []);

 const handleCopyGreeting = useCallback(() => {
 if (!greetingCustomer) return;
 const message = `Dear ${greetingCustomer.buyerName},\n\nHappy Birthday! 🎉🎂\n\nAs a valued ${tierConfig[greetingCustomer.tier].label} member of 29 Jewellery, enjoy 10% OFF your next purchase as our birthday gift to you!\n\nVisit any of our branches this month to redeem your special offer.\n\nWith love,\n29 Jewellery Team`;
 navigator.clipboard?.writeText(message).then(() => {
 setGreetingCopied(true);
 setTimeout(() => setGreetingCopied(false), 2000);
 }).catch(() => {});
 }, [greetingCustomer]);

 const getDob = useCallback((customerKey: string) => dobData[customerKey] ||'', [dobData]);
 const isRedeemed = useCallback((customerKey: string) => !!redeemedData[customerKey], [redeemedData]);

 const sourceData = useMemo(() => {
 if (monthMode ==='all' && allData && allData.length > 0) {
 return allData;
 }
 return data;
 }, [data, allData, monthMode]);

 const customers = useMemo<CrmCustomer[]>(() => {
 if (sourceData.length === 0) return [];
 const firstRow = sourceData[0];
 const contactKey = findColumnKey(firstRow,'Contact Number','Contact','Phone');
 const townshipKey = findColumnKey(firstRow,'Township');

 const map = new Map<string, CrmCustomer>();

 sourceData.forEach((row) => {
 const buyerName = getCellText(row['ဝယ်သူ အမည်']);
 if (buyerName ==='-') return;

 const branch = getRowBranch(row);
 const contactNumber = getCellText(row[contactKey] ?? row['Contact Number']);
 const township = getCellText(row[townshipKey] ?? row['Township']);
 const key = contactNumber !=='-' ? contactNumber : buyerName;

 const isSale = isSaleReasonRow(row);
 const isRc = isRcReasonRow(row);
 if (!isSale && !isRc) return;

 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 const { q } = parseRowQtyGram(row);
 const rowDate = getRowDate(row);

 const existing = map.get(key);
 if (existing) {
 if (isSale) {
 existing.totalAmount += a;
 existing.purchaseCount += 1;
 if (rowDate && (!existing.lastPurchaseDate || rowDate > existing.lastPurchaseDate)) {
 existing.lastPurchaseDate = rowDate;
 }
 }
 if (isRc) {
 existing.rcAmount += a;
 }
 existing.netAmount = existing.totalAmount - existing.rcAmount;
 if (existing.contactNumber ==='-' && contactNumber !=='-') existing.contactNumber = contactNumber;
 if (existing.township ==='-' && township !=='-') existing.township = township;

 if (!existing.branchBreakdown[branch]) {
 existing.branchBreakdown[branch] = { totalAmount: 0, purchaseCount: 0 };
 }
 if (isSale) {
 existing.branchBreakdown[branch].totalAmount += a;
 existing.branchBreakdown[branch].purchaseCount += 1;
 }
 } else {
 const branchBreakdown: Record<string, { totalAmount: number; purchaseCount: number }> = {};
 if (isSale) {
 branchBreakdown[branch] = { totalAmount: a, purchaseCount: 1 };
 }
 map.set(key, {
 key,
 buyerName,
 contactNumber,
 township,
 branch,
 totalAmount: isSale ? a : 0,
 rcAmount: isRc ? a : 0,
 netAmount: isSale ? a : 0 - (isRc ? a : 0),
 purchaseCount: isSale ? 1 : 0,
 lastPurchaseDate: isSale ? rowDate : null,
 lastPurchaseDateLabel: '',
 daysSinceLastPurchase: null,
 tier: getTier(isSale ? a : 0),
 branchBreakdown,
 });
 }
 });

 const rows = Array.from(map.values()).map((row) => {
 let bestBranch = row.branch;
 let bestAmount = -1;
 Object.entries(row.branchBreakdown).forEach(([b, bd]) => {
 if (bd.totalAmount > bestAmount) {
 bestAmount = bd.totalAmount;
 bestBranch = b;
 }
 });
 const tier = getTier(row.totalAmount);
 return {
 ...row,
 branch: bestBranch,
 netAmount: row.totalAmount - row.rcAmount,
 tier,
 lastPurchaseDateLabel: row.lastPurchaseDate ? formatDisplayDate(row.lastPurchaseDate) : '-',
 daysSinceLastPurchase: getDaysSinceDate(row.lastPurchaseDate),
 };
 });

 return rows;
 }, [sourceData]);

 const tierCounts = useMemo(() => {
 const counts: Record<Tier, number> = { CIP: 0, VVIP: 0, VIP: 0, CARE: 0 };
 customers.forEach((c) => { counts[c.tier]++; });
 return counts;
 }, [customers]);

 const birthdayCustomers = useMemo(() => {
 return customers.filter((c) => {
 const dob = getDob(c.key);
 if (!dob) return false;
 return birthdayReportMode ==='week' ? isBirthdayInCurrentWeek(dob) : isBirthdayInCurrentMonth(dob);
 }).sort((a, b) => {
 const aDob = getDob(a.key);
 const bDob = getDob(b.key);
 const aDay = getDobDay(aDob) ?? 99;
 const bDay = getDobDay(bDob) ?? 99;
 return aDay - bDay;
 });
 }, [customers, dobData, birthdayReportMode, getDob]);

 const filteredCustomers = useMemo(() => {
 let result = customers;
 if (tierFilter) {
 result = result.filter((c) => c.tier === tierFilter);
 }
 const q = searchQuery.trim().toLowerCase();
 if (q) {
 result = result.filter((c) =>
 c.buyerName.toLowerCase().includes(q) ||
 c.contactNumber.toLowerCase().includes(q) ||
 c.township.toLowerCase().includes(q) ||
 c.branch.toLowerCase().includes(q)
 );
 }
 result = [...result].sort((a, b) => {
 let cmp = 0;
 if (sortBy ==='name') cmp = a.buyerName.localeCompare(b.buyerName);
 else if (sortBy ==='totalAmount') cmp = a.totalAmount - b.totalAmount;
 else if (sortBy ==='purchaseCount') cmp = a.purchaseCount - b.purchaseCount;
 else if (sortBy ==='lastPurchaseDate') {
 const aTime = a.lastPurchaseDate?.getTime() ?? 0;
 const bTime = b.lastPurchaseDate?.getTime() ?? 0;
 cmp = aTime - bTime;
 }
 return sortOrder ==='desc' ? -cmp : cmp;
 });
 return result;
 }, [customers, tierFilter, searchQuery, sortBy, sortOrder]);

 const totalAmount = useMemo(() => {
 return filteredCustomers.reduce((sum, c) => sum + c.totalAmount, 0);
 }, [filteredCustomers]);

 const totalPurchases = useMemo(() => {
 return filteredCustomers.reduce((sum, c) => sum + c.purchaseCount, 0);
 }, [filteredCustomers]);

 const handleSort = (field: typeof sortBy) => {
 if (sortBy === field) {
 setSortOrder(sortOrder ==='asc' ? 'desc' : 'asc');
 } else {
 setSortBy(field);
 setSortOrder(field ==='name' ? 'asc' : 'desc');
 }
 };

 const handleExport = () => {
 const exportData = filteredCustomers.map((c) => ({
'Customer Name': c.buyerName,
'Tier': c.tier,
'Branch': c.branch,
'Contact': c.contactNumber,
'Township': c.township,
'Total Purchase Amount': c.totalAmount,
'RC Amount': c.rcAmount,
'Net Amount': c.netAmount,
'Purchase Frequency': c.purchaseCount,
'Last Purchase Date': c.lastPurchaseDateLabel,
'Days Since Last Purchase': c.daysSinceLastPurchase ?? '-',
'Follow-ups': getFollowUpCount(c.key),
'DOB': getDob(c.key) ||'-',
'Birthday Redeemed': isRedeemed(c.key) ? 'Yes' : 'No',
 }));
 const ws = XLSX.utils.json_to_sheet(exportData);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws,'CRM');
 XLSX.writeFile(wb, `CRM_${selectedMonth}_${monthMode}.xlsx`);
 };

 const SortHeader = ({ field, label, align ='left' }: { field: typeof sortBy; label: string; align?: 'left' |'right' |'center' }) => (
 <th
 onClick={() => handleSort(field)}
 className={`py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#8c8c8c] transition-colors whitespace-nowrap text-${align}`}
 >
 <span className="inline-flex items-center gap-1">
 {label}
 {sortBy === field && (
 <span className="text-[#1677ff]">{sortOrder ==='desc' ? '↓' : '↑'}</span>
 )}
 </span>
 </th>
 );

 return (
 <div className="px-3 py-4 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col gap-3 mb-4">
 <div className="flex items-center justify-between flex-wrap gap-2">
 <div className="flex items-center gap-2">
 <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">CRM</h2>
 <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg border border-[#e8e8e8]">
 {filteredCustomers.length} <span className="text-gray-400">customers</span>
 </span>
 </div>

 <div className="flex items-center gap-2">
 {/* View Mode Toggle */}
 <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-[#e8e8e8]">
 <button
 onClick={() => setViewMode('list')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 viewMode ==='list'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 Customer List
 </button>
 <button
 onClick={() => setViewMode('birthday')}
 className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 viewMode ==='birthday'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 <Cake className="w-3 h-3" />
 Birthday Report
 </button>
 </div>

 {/* Month Toggle */}
 <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-[#e8e8e8]">
 <button
 onClick={() => setMonthMode('current')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 monthMode ==='current'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 {selectedMonth}
 </button>
 <button
 onClick={() => setMonthMode('all')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 monthMode ==='all'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 All Month
 </button>
 </div>

 {/* Export */}
 <button
 onClick={handleExport}
 className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition-all border border-[#e8e8e8] shadow-sm"
 >
 <Download className="w-3.5 h-3.5" />
 Export
 </button>
 </div>
 </div>

 {/* Tier Filters + Search */}
 <div className="flex items-center justify-between flex-wrap gap-2">
 {/* Tier filter pills */}
 <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-50/80 border border-[#e8e8e8]">
 {(['CIP','VVIP','VIP','CARE'] as Tier[]).map((tier) => {
 const cfg = tierConfig[tier];
 const Icon = cfg.icon;
 return (
 <button
 key={tier}
 onClick={() => setTierFilter(tierFilter === tier ? null : tier)}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm ${
 tierFilter === tier
 ? tier === 'CIP' ? 'bg-purple-600 text-white ring-1 ring-purple-600'
 : tier === 'VVIP' ? 'bg-amber-500 text-white ring-1 ring-amber-500'
 : tier === 'VIP' ? 'bg-sky-500 text-white ring-1 ring-sky-500'
 : 'bg-gray-600 text-white ring-1 ring-gray-600'
 : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
 }`}
 >
 <Icon className="w-3 h-3" />
 {cfg.label}
 <span className="tabular-nums text-[10px] opacity-90">({tierCounts[tier]})</span>
 </button>
 );
 })}
 </div>

 {/* Search */}
 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search customer, phone, township..."
 className="pl-8 pr-4 py-1.5 text-[12px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-[#1677ff] outline-none w-[260px] transition-all"
 />
 </div>
 </div>

 {/* Summary stats */}
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
 Total Purchase: <span className="tabular-nums font-bold">{totalAmount.toLocaleString()}</span> MMK
 </span>
 <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
 Total Visits: <span className="tabular-nums font-bold">{totalPurchases.toLocaleString()}</span>
 </span>
 <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
 Avg / Customer: <span className="tabular-nums font-bold">{filteredCustomers.length > 0 ? Math.round(totalAmount / filteredCustomers.length).toLocaleString() : 0}</span> MMK
 </span>
 {tierFilter && (
 <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-[#e8e8e8]">
 Filtered: {tierConfig[tierFilter].label}
 </span>
 )}
 </div>
 </div>

 {/* Table - Customer List View */}
 {viewMode ==='list' && (
 <>
 {filteredCustomers.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
 <Users className="w-12 h-12 mb-3 opacity-30" />
 <p className="text-[13px] font-semibold">No customers found</p>
 <p className="text-[11px] mt-1">Try adjusting filters or search query</p>
 </div>
 ) : (
 <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50/80 border-b border-[#e8e8e8]">
 <tr>
 <th className="py-2 px-1 w-8" />
 <SortHeader field="name" label="Customer" />
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Tier</th>
 <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">Contact</th>
 <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">Branch</th>
 <SortHeader field="totalAmount" label="Total Amount" align="right" />
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">RC Amount</th>
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Net</th>
 <SortHeader field="purchaseCount" label="Visits" align="right" />
 <SortHeader field="lastPurchaseDate" label="Last Purchase" align="center" />
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">DOB</th>
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">Redeemed</th>
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">History</th>
 <th className="py-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredCustomers.slice(0, visibleCount).map((c) => {
 const isExpanded = expandedRow === c.key;
 const hasBranchBreakdown = Object.keys(c.branchBreakdown).length > 1;
 const cfg = tierConfig[c.tier];
 const TierIcon = cfg.icon;
 const dob = getDob(c.key);
 const isBirthdayMonth = dob ? isBirthdayInCurrentMonth(dob) : false;
 return (
 <React.Fragment key={c.key}>
 <tr
 className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''} ${isBirthdayMonth ? 'bg-pink-50/40 hover:bg-pink-50/60' : ''}`}
 onClick={() => setExpandedRow(isExpanded ? null : c.key)}
 >
 <td className="py-2 px-1 text-center">
 <ChevronRight className={`inline w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
 </td>
 <td className="py-2 px-3 text-[12px] font-bold text-gray-900 whitespace-nowrap">
 {isBirthdayMonth && <Cake className="inline w-3 h-3 text-pink-500 mr-1" />}
 {c.buyerName}
 </td>
 <td className="py-2 px-2 text-center">
 <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.badge}`}>
 <TierIcon className="w-2.5 h-2.5" />
 {cfg.label}
 </span>
 </td>
 <td className="py-2 px-3 text-[11px] text-gray-600 whitespace-nowrap">
 {c.contactNumber ==='-' ? <span className="text-gray-400">-</span> : c.contactNumber}
 </td>
 <td className="py-2 px-3 text-[11px] text-gray-600 whitespace-nowrap">{c.branch}</td>
 <td className="py-2 px-2 text-[12px] font-bold text-gray-900 text-right tabular-nums">
 {c.totalAmount === 0 ? <span className="text-gray-400">-</span> : c.totalAmount.toLocaleString()}
 </td>
 <td className="py-2 px-2 text-[11px] text-gray-500 text-right tabular-nums">
 {c.rcAmount === 0 ? <span className="text-gray-400">-</span> : c.rcAmount.toLocaleString()}
 </td>
 <td className="py-2 px-2 text-[11px] text-right tabular-nums">
 <span className={c.netAmount < 0 ? 'text-rose-600 font-semibold' : 'text-blue-700 font-semibold'}>
 {c.netAmount === 0 ? <span className="text-gray-400">-</span> : c.netAmount.toLocaleString()}
 </span>
 </td>
 <td className="py-2 px-2 text-[12px] font-bold text-[#8c8c8c] text-right tabular-nums">{c.purchaseCount}</td>
 <td className="py-2 px-2 text-[11px] text-gray-600 text-center whitespace-nowrap">{c.lastPurchaseDateLabel}</td>
 <td className="py-2 px-2 text-center">
 {c.daysSinceLastPurchase != null && (
 <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
 c.daysSinceLastPurchase <= 30 ? 'bg-emerald-50 text-emerald-600'
 : c.daysSinceLastPurchase <= 60 ? 'bg-amber-50 text-amber-600'
 : 'bg-rose-50 text-rose-600'
 }`}>
 {c.daysSinceLastPurchase}d
 </span>
 )}
 </td>
 <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
 {dob ? (
 <div className="flex items-center justify-center gap-1">
 <span className={`text-[10px] font-bold ${isBirthdayMonth ? 'text-pink-600' : 'text-gray-600'}`}>{formatDobShort(dob)}</span>
 <button
 onClick={(e) => handleOpenDobEditor(c, e)}
 className="p-0.5 rounded text-[#8c8c8c] hover:text-[#1677ff] transition-colors"
 title="Edit DOB"
 >
 <Pencil className="w-2.5 h-2.5" />
 </button>
 </div>
 ) : (
 <button
 onClick={(e) => handleOpenDobEditor(c, e)}
 className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 border border-[#e8e8e8] transition-colors"
 >
 <Pencil className="w-2.5 h-2.5" />
 Add
 </button>
 )}
 </td>
 <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
 {dob && isBirthdayMonth ? (
 <button
 onClick={(e) => handleToggleRedeemed(c, e)}
 className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
 isRedeemed(c.key)
 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
 : 'bg-gray-50 text-gray-500 border-[#e8e8e8] hover:bg-gray-100'
 }`}
 >
 <Gift className="w-2.5 h-2.5" />
 {isRedeemed(c.key) ? 'Redeemed' : 'Not Yet'}
 </button>
 ) : (
 <span className="text-gray-400 text-[11px]">-</span>
 )}
 </td>
 <td className="py-2 px-2 text-center">
 {(() => {
 const count = getFollowUpCount(c.key);
 if (count === 0) return <span className="text-gray-400 text-[11px]">-</span>;
 return (
 <button
 onClick={(e) => handleOpenHistory(c, e)}
 className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors"
 >
 <MessageSquare className="w-3 h-3" />
 {count}
 </button>
 );
 })()}
 </td>
 <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
 <button
 onClick={(e) => handleOpenFollowUp(c, e)}
 className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#1677ff] text-white hover:bg-[#4096ff] shadow-sm transition-colors"
 >
 <MessageSquare className="w-3 h-3" />
 Follow-up
 </button>
 </td>
 </tr>
 {isExpanded && (
 <tr>
 <td colSpan={15} className="px-6 py-3 bg-gray-50/50">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {/* Customer Info */}
 <div className="bg-white rounded-lg p-3 border border-[#e8e8e8]">
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Info</div>
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 text-[11px]">
 <Phone className="w-3 h-3 text-gray-400" />
 <span className="text-gray-600">{c.contactNumber ==='-' ? 'No contact' : c.contactNumber}</span>
 </div>
 <div className="flex items-center gap-2 text-[11px]">
 <MapPin className="w-3 h-3 text-gray-400" />
 <span className="text-gray-600">{c.township ==='-' ? 'No township' : c.township}</span>
 </div>
 <div className="flex items-center gap-2 text-[11px]">
 <Calendar className="w-3 h-3 text-gray-400" />
 <span className="text-gray-600">Last: {c.lastPurchaseDateLabel}</span>
 </div>
 <div className="flex items-center gap-2 text-[11px]">
 <TrendingUp className="w-3 h-3 text-gray-400" />
 <span className="text-gray-600">Avg: {c.purchaseCount > 0 ? Math.round(c.totalAmount / c.purchaseCount).toLocaleString() : 0} MMK/visit</span>
 </div>
 </div>
 </div>

 {/* Tier Progress */}
 <div className="bg-white rounded-lg p-3 border border-[#e8e8e8]">
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tier Progress</div>
 {(() => {
 const nextTier = c.tier === 'CIP' ? null
 : c.tier === 'VVIP' ? { label: 'CIP', threshold: 100_000_000 }
 : c.tier === 'VIP' ? { label: 'VVIP', threshold: 50_000_000 }
 : { label: 'VIP', threshold: 30_000_000 };
 if (!nextTier || c.totalAmount >= nextTier.threshold) {
 return <div className="text-[11px] font-semibold text-gray-500">Highest tier reached</div>;
 }
 const prevThreshold = c.tier === 'VVIP' ? 50_000_000 : c.tier === 'VIP' ? 30_000_000 : 0;
 const progress = Math.min(100, Math.max(0, ((c.totalAmount - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100));
 const remaining = nextTier.threshold - c.totalAmount;
 return (
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-[10px] font-semibold text-gray-600">Upgrade to {nextTier.label}</span>
 <span className="text-[11px] font-bold text-gray-900 tabular-nums">{remaining.toLocaleString()}</span>
 </div>
 <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
 </div>
 </div>
 );
 })()}
 </div>

 {/* Branch Breakdown */}
 <div className="bg-white rounded-lg p-3 border border-[#e8e8e8]">
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Branch Breakdown</div>
 <div className="space-y-1.5">
 {Object.entries(c.branchBreakdown)
 .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
 .map(([branchName, bd]) => (
 <div key={branchName} className="flex items-center justify-between text-[11px]">
 <span className="text-gray-600 font-medium">{branchName}</span>
 <div className="flex items-center gap-2">
 <span className="text-gray-400 text-[10px]">{bd.purchaseCount}x</span>
 <span className="font-bold text-gray-900 tabular-nums">{bd.totalAmount.toLocaleString()}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </td>
 </tr>
 )}
 </React.Fragment>
 );
 })}
 </tbody>
 {filteredCustomers.length > 0 && (
 <tfoot>
 <tr className="border-t-2 border-[#e8e8e8] bg-gray-50">
 <td className="py-2 px-1" />
 <td className="py-2 px-3 text-[11px] font-bold text-gray-900" colSpan={4}>
 Grand Total ({filteredCustomers.length} customers)
 </td>
 <td className="py-2 px-2 text-[11px] font-bold text-gray-900 text-right tabular-nums">{totalAmount.toLocaleString()}</td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#8c8c8c] text-right tabular-nums">
 {filteredCustomers.reduce((s, c) => s + c.rcAmount, 0).toLocaleString()}
 </td>
 <td className="py-2 px-2 text-[11px] font-bold text-right tabular-nums">
 <span className="text-blue-700">{(totalAmount - filteredCustomers.reduce((s, c) => s + c.rcAmount, 0)).toLocaleString()}</span>
 </td>
 <td className="py-2 px-2 text-[11px] font-bold text-[#8c8c8c] text-right tabular-nums">{totalPurchases}</td>
 <td className="py-2 px-2" colSpan={6} />
 </tr>
 </tfoot>
 )}
 </table>
 </div>
 </div>
 )}
 </>
 )}

 {/* Birthday Report View */}
 {viewMode ==='birthday' && (
 <div className="space-y-4">
 {/* Birthday Report Header */}
 <div className="flex items-center justify-between flex-wrap gap-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
 <Cake className="w-4 h-4 text-pink-500" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Birthday Report</h3>
 <p className="text-[11px] text-gray-500">
 {birthdayReportMode ==='week' ? 'This week' : MONTHS[new Date().getMonth()]} · {birthdayCustomers.length} customers
 </p>
 </div>
 </div>
 <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-[#e8e8e8]">
 <button
 onClick={() => setBirthdayReportMode('week')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 birthdayReportMode ==='week'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 This Week
 </button>
 <button
 onClick={() => setBirthdayReportMode('month')}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
 birthdayReportMode ==='month'
 ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
 : 'text-gray-500 hover:text-[#8c8c8c]'
 }`}
 >
 This Month
 </button>
 </div>
 </div>

 {/* Birthday Stats */}
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[11px] font-semibold text-pink-700 bg-pink-50 px-3 py-1.5 rounded-lg border border-pink-100">
 <Cake className="inline w-3 h-3 mr-1" />
 Birthdays: <span className="tabular-nums font-bold">{birthdayCustomers.length}</span>
 </span>
 <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
 <Gift className="inline w-3 h-3 mr-1" />
 Redeemed: <span className="tabular-nums font-bold">{birthdayCustomers.filter((c) => isRedeemed(c.key)).length}</span>
 </span>
 <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-[#e8e8e8]">
 Pending: <span className="tabular-nums font-bold">{birthdayCustomers.filter((c) => !isRedeemed(c.key)).length}</span>
 </span>
 </div>

 {/* Birthday Report Card Grid */}
 {birthdayCustomers.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
 <Cake className="w-12 h-12 mb-3 opacity-30" />
 <p className="text-[13px] font-semibold">No birthdays {birthdayReportMode ==='week' ? 'this week' : 'this month'}</p>
 <p className="text-[11px] mt-1">Add DOB for customers to see them here</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
 {birthdayCustomers.map((c) => {
 const dob = getDob(c.key);
 const daysUntil = getDaysUntilBirthday(dob);
 const cfg = tierConfig[c.tier];
 const TierIcon = cfg.icon;
 const redeemed = isRedeemed(c.key);
 const currentRedemption = getCurrentYearRedemption(c.key);
 const prevRedemption = getPreviousYearRedemption(c.key);
 const hasHistory = hasRedemptionHistory(c.key);
 const isToday = daysUntil === 0;
 const isSoon = daysUntil != null && daysUntil <= 7;
 return (
 <div
 key={c.key}
 className={`group relative bg-white rounded-xl border border-[#e8e8e8] shadow-sm hover:shadow-sm transition-all duration-200 overflow-hidden ${isToday ? 'ring-2 ring-pink-300' : ''}`}
 >
 {/* Tier gradient top bar */}
 <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />

 {/* Card Body */}
 <div className="p-4">
 {/* Header: Name + Tier Badge */}
 <div className="flex items-start justify-between gap-2 mb-3">
 <div className="flex items-center gap-2 min-w-0">
 <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}>
 <TierIcon className="w-4 h-4 text-white" />
 </div>
 <div className="min-w-0">
 <div className="text-[13px] font-bold text-gray-900 truncate flex items-center gap-1">
 {isToday && <Cake className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />}
 {c.buyerName}
 </div>
 <div className="text-[10px] text-gray-400 truncate">{c.branch}</div>
 </div>
 </div>
 <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.badge}`}>
 <TierIcon className="w-2.5 h-2.5" />
 {cfg.label}
 </span>
 </div>

 {/* Birthday Date + Days Until */}
 <div className="flex items-center justify-between gap-2 mb-3 bg-gray-50 rounded-xl px-3 py-2">
 <div className="flex items-center gap-2">
 <Calendar className="w-3.5 h-3.5 text-gray-400" />
 <div>
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Birthday</div>
 <div className="text-[12px] font-bold text-gray-900">{formatDobShort(dob)}</div>
 </div>
 </div>
 <div className="text-right">
 {daysUntil != null && (
 <div className={`inline-flex flex-col items-center px-2.5 py-1 rounded-lg ${
 isToday ? 'bg-pink-100'
 : isSoon ? 'bg-amber-50'
 : 'bg-white border border-gray-100'
 }`}>
 <span className={`text-[14px] font-bold tabular-nums leading-none ${
 isToday ? 'text-pink-600'
 : isSoon ? 'text-amber-600'
 : 'text-[#8c8c8c]'
 }`}>
 {isToday ? '🎉' : `${daysUntil}d`}
 </span>
 <span className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${
 isToday ? 'text-pink-500'
 : isSoon ? 'text-amber-500'
 : 'text-gray-400'
 }`}>
 {isToday ? 'Today!' : 'left'}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Contact */}
 {c.contactNumber !=='-' && (
 <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-3">
 <Phone className="w-3 h-3 text-gray-400" />
 <span>{c.contactNumber}</span>
 </div>
 )}

 {/* Previous Year Records Summary */}
 {prevRedemption && (
 <div className="mb-3 bg-violet-50/50 border border-violet-100 rounded-xl px-3 py-2">
 <div className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mb-0.5">Previous Year ({prevRedemption.year})</div>
 <div className="text-[11px] font-bold text-violet-700 truncate">
 Given: {prevRedemption.giftDescription ||'Gift'}
 </div>
 {prevRedemption.staffName && (
 <div className="text-[10px] text-violet-400 mt-0.5">by {prevRedemption.staffName}</div>
 )}
 </div>
 )}

 {/* Redeemed Status Indicator + Details */}
 <div className="mb-3">
 <div className="flex items-center justify-between gap-2 mb-2">
 <div className="flex items-center gap-2">
 <span className={`w-2.5 h-2.5 rounded-full ${redeemed ? 'bg-emerald-500' : 'bg-gray-300'} ${redeemed ? 'ring-2 ring-emerald-200' : ''}`} />
 <span className={`text-[11px] font-bold ${redeemed ? 'text-emerald-600' : 'text-gray-500'}`}>
 {redeemed ? 'Redeemed' : 'Not Yet'}
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 {hasHistory && (
 <button
 onClick={(e) => handleOpenRedemptionView(c, e)}
 className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 transition-colors"
 title="View Redemption History"
 >
 <Eye className="w-3 h-3" />
 {hasHistory ? 'History' : 'Details'}
 </button>
 )}
 <button
 onClick={(e) => {
 if (currentRedemption) {
 handleOpenRedemptionView(c, e);
 } else {
 handleOpenRedemption(c, e);
 }
 }}
 className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
 currentRedemption
 ? 'text-gray-500 border-[#e8e8e8] hover:bg-gray-50'
 : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
 }`}
 >
 {currentRedemption ? '✓ View' : '✓ Mark Redeemed'}
 </button>
 </div>
 </div>
 {/* Photo thumbnail preview if current year redemption has photo */}
 {currentRedemption && currentRedemption.photo && (
 <button
 onClick={(e) => handleOpenRedemptionView(c, e)}
 className="relative w-full h-16 rounded-lg overflow-hidden border border-[#e8e8e8] hover:border-sky-300 transition-colors group/thumb"
 >
 <img src={currentRedemption.photo} alt="Redemption" className="w-full h-full object-cover" />
 <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-[#f5f5f5] transition-colors flex items-center justify-center">
 <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
 </div>
 </button>
 )}
 </div>

 {/* Send Greeting Button */}
 <button
 onClick={(e) => handleOpenGreeting(c, e)}
 className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold text-[#262626] bg-gradient-to-r from-[#1677ff] to-[#4096ff] rounded-xl shadow-sm hover:shadow-md hover:from-pink-600 hover:to-rose-600 transition-all"
 >
 <PartyPopper className="w-4 h-4" />
 Send Birthday Greeting
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* Customer Interaction Modal */}
 {showFollowUpModal && followUpCustomer && (
 <div
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
 onClick={() => setShowFollowUpModal(false)}
 >
 <div
 className="bg-white rounded-xl shadow-sm w-full max-w-md max-h-[90vh] overflow-auto"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 sticky top-0 bg-white z-10">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
 <MessageSquare className="w-4 h-4 text-[#1677ff]" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Customer Interaction</h3>
 <p className="text-[11px] text-gray-500">{followUpCustomer.buyerName} · {tierConfig[followUpCustomer.tier].label}</p>
 </div>
 </div>
 <button
 onClick={() => setShowFollowUpModal(false)}
 className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="px-5 py-4 space-y-4">
 {/* Contact Date */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Contact Date</label>
 <input
 type="date"
 value={followUpForm.contactDate}
 onChange={(e) => setFollowUpForm({ ...followUpForm, contactDate: e.target.value })}
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-[#1677ff] outline-none transition-all"
 />
 </div>

 {/* Interaction Type - Dropdown */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Interaction Type</label>
 <select
 value={followUpForm.interactionType}
 onChange={(e) => setFollowUpForm({ ...followUpForm, interactionType: e.target.value as InteractionType })}
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-[#1677ff] outline-none transition-all"
 >
 {(['Call','SMS','Viber','Visit','Other'] as InteractionType[]).map((type) => (
 <option key={type} value={type}>{interactionIcons[type]} {type}</option>
 ))}
 </select>
 </div>

 {/* Interest Level - Radio */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Interest Level</label>
 <div className="flex items-center gap-2">
 {(['Low','Medium','High'] as InterestLevel[]).map((level) => {
 const cfg = interestLevelConfig[level];
 return (
 <label
 key={level}
 className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
 followUpForm.interestLevel === level
 ? `${cfg.badge} ring-1 ring-current/20`
 : 'bg-white border-[#e8e8e8] text-gray-500 hover:bg-gray-50'
 }`}
 >
 <input
 type="radio"
 name="interestLevel"
 value={level}
 checked={followUpForm.interestLevel === level}
 onChange={() => setFollowUpForm({ ...followUpForm, interestLevel: level })}
 className="sr-only"
 />
 {level}
 </label>
 );
 })}
 </div>
 </div>

 {/* Status - Dropdown */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Status</label>
 <select
 value={followUpForm.status}
 onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as FollowUpStatus })}
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-[#1677ff] outline-none transition-all"
 >
 {(['Pending','Interested','Converted','Lost'] as FollowUpStatus[]).map((status) => (
 <option key={status} value={status}>{status}</option>
 ))}
 </select>
 </div>

 {/* Next Action Date */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Next Action Date</label>
 <input
 type="date"
 value={followUpForm.nextActionDate}
 onChange={(e) => setFollowUpForm({ ...followUpForm, nextActionDate: e.target.value })}
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-[#1677ff] outline-none transition-all"
 />
 </div>

 {/* Photo Upload */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Photo (Optional)</label>
 {followUpForm.photo ? (
 <div className="relative w-full h-28 rounded-xl overflow-hidden border border-[#e8e8e8] group/fu-photo">
 <img src={followUpForm.photo} alt="Preview" className="w-full h-full object-cover" />
 <button
 onClick={() => setFollowUpForm({ ...followUpForm, photo: '' })}
 className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white text-[#262626] flex items-center justify-center hover:bg-white transition-colors"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
 ) : (
 <label className="flex items-center justify-center gap-2 w-full h-20 rounded-xl border-2 border-dashed border-[#e8e8e8] hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all">
 <input
 type="file"
 accept="image/jpeg,image/jpg,image/png"
 onChange={handleFollowUpPhotoUpload}
 className="sr-only"
 />
 <Camera className="w-5 h-5 text-[#8c8c8c]" />
 <span className="text-[11px] font-bold text-gray-400">Upload Photo (JPEG/PNG)</span>
 </label>
 )}
 </div>

 {/* Audio Upload */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Audio Recording (Optional)</label>
 {followUpForm.audio ? (
 <div className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-[#e8e8e8] bg-gray-50">
 <Mic className="w-4 h-4 text-[#1677ff] flex-shrink-0" />
 <audio controls src={followUpForm.audio} className="flex-1 h-8" style={{ maxWidth: '100%' }} />
 <button
 onClick={() => setFollowUpForm({ ...followUpForm, audio: '' })}
 className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors flex-shrink-0"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
 ) : (
 <label className="flex items-center justify-center gap-2 w-full h-20 rounded-xl border-2 border-dashed border-[#e8e8e8] hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all">
 <input
 type="file"
 accept="audio/*"
 onChange={handleFollowUpAudioUpload}
 className="sr-only"
 />
 <Mic className="w-5 h-5 text-[#8c8c8c]" />
 <span className="text-[11px] font-bold text-gray-400">Upload Audio (MP3/WAV/M4A)</span>
 </label>
 )}
 </div>

 {/* Feedback / Notes */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Feedback / Notes</label>
 <textarea
 value={followUpForm.notes}
 onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
 rows={4}
 placeholder="Enter interaction details, customer feedback, next steps..."
 className="w-full px-3 py-2 text-[12px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-[#1677ff] outline-none transition-all resize-none"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
 <button
 onClick={() => setShowFollowUpModal(false)}
 className="px-4 py-2 text-[12px] font-bold text-gray-600 bg-white border border-[#e8e8e8] rounded-lg hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveFollowUp}
 disabled={!followUpForm.contactDate}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-[#1677ff] rounded-lg hover:bg-[#4096ff] shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Submit
 </button>
 </div>
 </div>
 </div>
 )}

 {/* History Modal */}
 {showHistoryModal && historyCustomer && (
 <div
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
 onClick={() => setShowHistoryModal(false)}
 >
 <div
 className="bg-white rounded-xl shadow-sm w-full max-w-lg overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
 <Clock className="w-4 h-4 text-[#1677ff]" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Follow-up History</h3>
 <p className="text-[11px] text-gray-500">{historyCustomer.buyerName} · {getFollowUpCount(historyCustomer.key)} records</p>
 </div>
 </div>
 <button
 onClick={() => setShowHistoryModal(false)}
 className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="max-h-[400px] overflow-auto px-5 py-4">
 {(followUps[historyCustomer.key] || []).length === 0 ? (
 <div className="flex flex-col items-center justify-center py-10 text-gray-400">
 <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
 <p className="text-[12px] font-semibold">No follow-ups yet</p>
 </div>
 ) : (
 <div className="space-y-2.5">
 {(followUps[historyCustomer.key] || [])
 .slice()
 .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
 .map((record) => {
 const cfg = statusConfig[record.status];
 const StatusIcon = cfg.icon;
 return (
 <div key={record.id} className="bg-gray-50 rounded-xl p-3 border border-[#e8e8e8]">
 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex items-center gap-2">
 <span className="text-[14px]">{interactionIcons[record.interactionType]}</span>
 <div>
 <div className="text-[12px] font-bold text-gray-900">{record.interactionType}</div>
 <div className="text-[10px] text-gray-500">{record.contactDate}</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${interestLevelConfig[record.interestLevel].badge}`}>
 {record.interestLevel}
 </span>
 <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.badge}`}>
 <StatusIcon className="w-2.5 h-2.5" />
 {record.status}
 </span>
 <button
 onClick={() => handleDeleteFollowUp(record.id, historyCustomer.key)}
 className="p-1 rounded text-[#8c8c8c] hover:text-rose-500 transition-colors"
 title="Delete"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
 </div>
 {record.notes && (
 <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
 )}
 {record.photo && (
 <div className="mt-2 rounded-lg overflow-hidden border border-[#e8e8e8]">
 <img src={record.photo} alt="Follow-up" className="w-full max-h-32 object-cover" />
 </div>
 )}
 {record.audio && (
 <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#e8e8e8]">
 <Mic className="w-3 h-3 text-blue-400 flex-shrink-0" />
 <audio controls src={record.audio} className="flex-1 h-7" style={{ maxWidth: '100%' }} />
 </div>
 )}
 {record.nextActionDate && (
 <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#e8e8e8]">
 <Calendar className="w-3 h-3 text-blue-400" />
 <span className="text-[10px] font-bold text-blue-600">Next Action: {record.nextActionDate}</span>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>

 <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
 <button
 onClick={() => {
 setShowHistoryModal(false);
 setFollowUpCustomer(historyCustomer);
 setFollowUpForm({
 contactDate: new Date().toISOString().split('T')[0],
 interactionType: 'Call',
 notes: '',
 status: 'Pending',
 interestLevel: 'Medium',
 nextActionDate: '',
 photo: '',
 audio: '',
 });
 setShowFollowUpModal(true);
 }}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-[#1677ff] rounded-lg hover:bg-[#4096ff] shadow-sm transition-colors"
 >
 + Add Follow-up
 </button>
 </div>
 </div>
 </div>
 )}

 {/* DOB Edit Modal */}
 {showDobModal && dobCustomer && (
 <div
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
 onClick={() => setShowDobModal(false)}
 >
 <div
 className="bg-white rounded-xl shadow-sm w-full max-w-sm overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
 <Cake className="w-4 h-4 text-pink-500" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Date of Birth</h3>
 <p className="text-[11px] text-gray-500">{dobCustomer.buyerName}</p>
 </div>
 </div>
 <button
 onClick={() => setShowDobModal(false)}
 className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 <div className="px-5 py-4 space-y-3">
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Birthday Date</label>
 <input
 type="date"
 value={dobValue}
 onChange={(e) => setDobValue(e.target.value)}
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none transition-all"
 />
 <p className="text-[10px] text-gray-400 mt-1.5">Used for birthday notifications and greeting campaigns</p>
 </div>
 {dobValue && isBirthdayInCurrentMonth(dobValue) && (
 <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
 <PartyPopper className="w-4 h-4 text-pink-500" />
 <span className="text-[11px] font-bold text-pink-700">Birthday is this month!</span>
 </div>
 )}
 </div>
 <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
 <button
 onClick={() => { setDobValue(''); handleSaveDob(); }}
 className="px-3 py-2 text-[12px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
 >
 Clear
 </button>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowDobModal(false)}
 className="px-4 py-2 text-[12px] font-bold text-gray-600 bg-white border border-[#e8e8e8] rounded-lg hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveDob}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-pink-500 rounded-lg hover:bg-pink-600 shadow-sm transition-colors"
 >
 Save
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Send Greeting Modal */}
 {showGreetingModal && greetingCustomer && (
 <div
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
 onClick={() => setShowGreetingModal(false)}
 >
 <div
 className="bg-white rounded-xl shadow-sm w-full max-w-md overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
 <PartyPopper className="w-4 h-4 text-pink-500" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Send Birthday Greeting</h3>
 <p className="text-[11px] text-gray-500">{greetingCustomer.buyerName} · {tierConfig[greetingCustomer.tier].label}</p>
 </div>
 </div>
 <button
 onClick={() => setShowGreetingModal(false)}
 className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 <div className="px-5 py-4 space-y-3">
 <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 rounded-xl p-4">
 <div className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-2">Message Template</div>
 <p className="text-[12px] text-[#8c8c8c] leading-relaxed whitespace-pre-wrap">
 Dear {greetingCustomer.buyerName},{"\n\n"}Happy Birthday! 🎉🎂{"\n\n"}As a valued {tierConfig[greetingCustomer.tier].label} member of 29 Jewellery, enjoy 10% OFF your next purchase as our birthday gift to you!{"\n\n"}Visit any of our branches this month to redeem your special offer.{"\n\n"}With love,{"\n"}29 Jewellery Team
 </p>
 </div>
 {greetingCustomer.contactNumber !=='-' && (
 <div className="flex items-center gap-2 text-[11px] text-gray-500">
 <Phone className="w-3 h-3 text-gray-400" />
 <span>Send to: {greetingCustomer.contactNumber}</span>
 </div>
 )}
 </div>
 <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
 <button
 onClick={handleCopyGreeting}
 className={`inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-lg shadow-sm transition-colors ${
 greetingCopied
 ? 'bg-emerald-500 text-white'
 : 'bg-white text-gray-600 border border-[#e8e8e8] hover:bg-gray-50'
 }`}
 >
 <Copy className="w-3.5 h-3.5" />
 {greetingCopied ? 'Copied!' : 'Copy Message'}
 </button>
 <button
 onClick={() => setShowGreetingModal(false)}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-pink-500 rounded-lg hover:bg-pink-600 shadow-sm transition-colors"
 >
 Done
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Redemption Details Form Modal */}
 {showRedemptionModal && redemptionCustomer && (
 <div
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
 onClick={() => setShowRedemptionModal(false)}
 >
 <div
 className="bg-white rounded-xl shadow-sm w-full max-w-md max-h-[90vh] overflow-auto"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 sticky top-0 bg-white z-10">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
 <Gift className="w-4 h-4 text-emerald-500" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Redemption Details</h3>
 <p className="text-[11px] text-gray-500">{redemptionCustomer.buyerName} · {tierConfig[redemptionCustomer.tier].label}</p>
 </div>
 </div>
 <button
 onClick={() => setShowRedemptionModal(false)}
 className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="px-5 py-4 space-y-4">
 {/* Gift Description */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Gift Description</label>
 <textarea
 value={redemptionForm.giftDescription}
 onChange={(e) => setRedemptionForm({ ...redemptionForm, giftDescription: e.target.value })}
 rows={2}
 placeholder="e.g., Silver Pendant, 10% Discount Coupon..."
 className="w-full px-3 py-2 text-[12px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all resize-none"
 />
 </div>

 {/* Interaction Date */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Interaction Date</label>
 <input
 type="date"
 value={redemptionForm.interactionDate}
 onChange={(e) => setRedemptionForm({ ...redemptionForm, interactionDate: e.target.value })}
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
 />
 </div>

 {/* Staff Name */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Staff / Agent Name</label>
 <input
 type="text"
 value={redemptionForm.staffName}
 onChange={(e) => setRedemptionForm({ ...redemptionForm, staffName: e.target.value })}
 placeholder="Enter staff name..."
 className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
 />
 </div>

 {/* Photo Upload */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Photo Upload (JPEG/PNG)</label>
 {redemptionForm.photo ? (
 <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#e8e8e8] group/photo">
 <img src={redemptionForm.photo} alt="Preview" className="w-full h-full object-cover" />
 <button
 onClick={() => setRedemptionForm({ ...redemptionForm, photo: '' })}
 className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white text-[#262626] flex items-center justify-center hover:bg-white transition-colors"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ) : (
 <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-[#e8e8e8] hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all">
 <input
 type="file"
 accept="image/jpeg,image/jpg,image/png"
 onChange={handlePhotoUpload}
 className="sr-only"
 />
 <Camera className="w-7 h-7 text-[#8c8c8c] mb-1.5" />
 <span className="text-[11px] font-bold text-gray-400">Click to upload photo</span>
 <span className="text-[10px] text-[#8c8c8c] mt-0.5">JPEG or PNG, max ~2MB</span>
 </label>
 )}
 </div>

 {/* Notes */}
 <div>
 <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Notes</label>
 <textarea
 value={redemptionForm.notes}
 onChange={(e) => setRedemptionForm({ ...redemptionForm, notes: e.target.value })}
 rows={3}
 placeholder="Any additional comments..."
 className="w-full px-3 py-2 text-[12px] font-medium bg-white border border-[#e8e8e8] rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all resize-none"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
 <button
 onClick={() => setShowRedemptionModal(false)}
 className="px-4 py-2 text-[12px] font-bold text-gray-600 bg-white border border-[#e8e8e8] rounded-lg hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveRedemption}
 disabled={!redemptionForm.giftDescription.trim()}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Submit & Mark Redeemed
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Redemption View Details Modal with Tabs */}
 {showRedemptionViewModal && redemptionViewCustomer && (() => {
 const currentYear = new Date().getFullYear();
 const currentRecord = getCurrentYearRedemption(redemptionViewCustomer.key);
 const allRecords = getRedemptionHistorySorted(redemptionViewCustomer.key);
 const hasCurrentYear = !!currentRecord;
 const hasAnyHistory = allRecords.length > 0;
 if (!hasAnyHistory) return null;
 return (
 <div
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
 onClick={() => setShowRedemptionViewModal(false)}
 >
 <div
 className="bg-white rounded-xl shadow-sm w-full max-w-md max-h-[90vh] overflow-auto"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 sticky top-0 bg-white z-10">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
 <Eye className="w-4 h-4 text-sky-500" />
 </div>
 <div>
 <h3 className="text-[14px] font-bold text-gray-900">Redemption History</h3>
 <p className="text-[11px] text-gray-500">{redemptionViewCustomer.buyerName} · {tierConfig[redemptionViewCustomer.tier].label}</p>
 </div>
 </div>
 <button
 onClick={() => setShowRedemptionViewModal(false)}
 className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Tab Switcher */}
 <div className="flex items-center gap-1 px-5 pt-3">
 <button
 onClick={() => setRedemptionViewTab('current')}
 className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
 redemptionViewTab ==='current'
 ? 'bg-sky-50 text-sky-600 border border-sky-200'
 : 'text-gray-500 border border-transparent hover:bg-gray-50'
 }`}
 >
 Current Year ({currentYear})
 </button>
 <button
 onClick={() => setRedemptionViewTab('history')}
 className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
 redemptionViewTab ==='history'
 ? 'bg-violet-50 text-violet-600 border border-violet-200'
 : 'text-gray-500 border border-transparent hover:bg-gray-50'
 }`}
 >
 All History ({allRecords.length})
 </button>
 </div>

 {/* Tab Content */}
 <div className="px-5 py-4 space-y-4">
 {redemptionViewTab ==='current' ? (
 /* Current Year Tab */
 hasCurrentYear ? (
 <>
 {currentRecord.photo && (
 <div className="rounded-xl overflow-hidden border border-[#e8e8e8]">
 <img src={currentRecord.photo} alt="Redemption Proof" className="w-full max-h-64 object-cover" />
 </div>
 )}
 <div>
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gift Description</div>
 <div className="text-[13px] font-bold text-gray-900 bg-gray-50 rounded-xl px-3 py-2">
 {currentRecord.giftDescription ||'-'}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Interaction Date</div>
 <div className="text-[12px] font-bold text-gray-900 bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
 <Calendar className="w-3 h-3 text-gray-400" />
 {currentRecord.interactionDate}
 </div>
 </div>
 <div>
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Staff / Agent</div>
 <div className="text-[12px] font-bold text-gray-900 bg-gray-50 rounded-xl px-3 py-2">
 {currentRecord.staffName ||'-'}
 </div>
 </div>
 </div>
 {currentRecord.notes && (
 <div>
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
 <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl px-3 py-2">
 {currentRecord.notes}
 </p>
 </div>
 )}
 <div className="text-[10px] text-gray-400 text-center">
 Recorded on {new Date(currentRecord.createdAt).toLocaleString()}
 </div>
 </>
 ) : (
 <div className="flex flex-col items-center justify-center py-10 text-gray-400">
 <Gift className="w-10 h-10 mb-2 opacity-30" />
 <p className="text-[12px] font-semibold">No redemption recorded for {currentYear}</p>
 <p className="text-[11px] mt-1">Click "Add New Year" to record this year's gift</p>
 </div>
 )
 ) : (
 /* History Tab - Timeline */
 <div className="space-y-3">
 {allRecords.map((record, idx) => (
 <div key={record.id} className={`relative pl-6 ${idx < allRecords.length - 1 ? 'pb-3' : ''}`}>
 {/* Timeline line */}
 {idx < allRecords.length - 1 && (
 <div className="absolute left-[7px] top-3 bottom-0 w-px bg-gray-200" />
 )}
 {/* Timeline dot */}
 <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
 record.year === currentYear ? 'bg-emerald-500 border-emerald-300' : 'bg-violet-400 border-violet-200'
 }`} />
 {/* Record card */}
 <div className={`rounded-xl p-3 border ${
 record.year === currentYear ? 'bg-emerald-50/30 border-emerald-100' : 'bg-violet-50/30 border-violet-100'
 }`}>
 <div className="flex items-center justify-between gap-2 mb-2">
 <span className={`text-[12px] font-bold ${record.year === currentYear ? 'text-emerald-700' : 'text-violet-700'}`}>
 {record.year}
 {record.year === currentYear && <span className="text-[9px] ml-1.5 px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">Current</span>}
 </span>
 <span className="text-[10px] text-gray-400">{record.interactionDate}</span>
 </div>
 {record.photo && (
 <div className="rounded-lg overflow-hidden border border-[#e8e8e8] mb-2">
 <img src={record.photo} alt={`${record.year} Redemption`} className="w-full h-24 object-cover" />
 </div>
 )}
 <div className="text-[12px] font-bold text-gray-900">
 {record.giftDescription ||'Gift'}
 </div>
 {record.staffName && (
 <div className="text-[10px] text-gray-500 mt-0.5">by {record.staffName}</div>
 )}
 {record.notes && (
 <p className="text-[11px] text-gray-500 leading-relaxed mt-1 whitespace-pre-wrap">{record.notes}</p>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
 {redemptionViewTab ==='current' && hasCurrentYear && (
 <button
 onClick={() => {
 setShowRedemptionViewModal(false);
 setRedemptionCustomer(redemptionViewCustomer);
 setRedemptionEditId(currentRecord!.id);
 setRedemptionForm({
 giftDescription: currentRecord!.giftDescription,
 interactionDate: currentRecord!.interactionDate,
 staffName: currentRecord!.staffName,
 photo: currentRecord!.photo,
 notes: currentRecord!.notes,
 });
 setShowRedemptionModal(true);
 }}
 className="px-4 py-2 text-[12px] font-bold text-gray-600 bg-white border border-[#e8e8e8] rounded-lg hover:bg-gray-50 transition-colors"
 >
 Edit Current Year
 </button>
 )}
 <button
 onClick={() => {
 setShowRedemptionViewModal(false);
 setRedemptionCustomer(redemptionViewCustomer);
 setRedemptionEditId(null);
 setRedemptionForm({
 giftDescription: '',
 interactionDate: new Date().toISOString().split('T')[0],
 staffName: '',
 photo: '',
 notes: '',
 });
 setShowRedemptionModal(true);
 }}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-sm transition-colors"
 >
 {hasCurrentYear ? 'Update This Year' : 'Add New Year'}
 </button>
 <button
 onClick={() => setShowRedemptionViewModal(false)}
 className="px-4 py-2 text-[12px] font-semibold text-[#262626] bg-sky-500 rounded-lg hover:bg-sky-600 shadow-sm transition-colors"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 );
 })()}

 {/* Show More */}
 {filteredCustomers.length > visibleCount && (
 <div className="mt-4 flex flex-col items-center gap-1">
 <button
 onClick={() => setVisibleCount((c) => c + 20)}
 className="px-6 py-2 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl border border-[#e8e8e8] transition-colors"
 >
 Show More ({filteredCustomers.length - visibleCount} customers remaining)
 </button>
 </div>
 )}
 </div>
 );
});

export default CrmView;
