'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type {
  ApiResponse,
  BirthdayReportResponse,
  BranchResponse,
  CrmCustomerListResponse,
  CrmCustomerRow,
  CrmHistoryResponse,
  CustomerTier,
  PageResponse,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Cake,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  Gift,
  Heart,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  Star,
  User,
} from 'lucide-react';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

type ViewTab = 'customers' | 'birthday';
type MonthMode = 'all' | 'current';

const AMOUNT_BUCKETS = [
  { value: 'all', label: 'Amount: All' },
  { value: 'amount_50_to_100', label: '50 - 100 သိန်း' },
  { value: 'amount_100_to_300', label: '100 - 300 သိန်း' },
  { value: 'amount_300_to_500', label: '300 - 500 သိန်း' },
  { value: 'amount_500_to_1000', label: '500 - 1000 သိန်း' },
  { value: 'amount_above_1000', label: '1000+ သိန်း' },
  { value: 'amount_other', label: 'Other (<50)' },
];

const WEEK_COLORS = [
  { border: 'border-t-blue-500', icon: 'text-blue-500 bg-blue-50' },
  { border: 'border-t-purple-500', icon: 'text-purple-500 bg-purple-50' },
  { border: 'border-t-orange-500', icon: 'text-orange-500 bg-orange-50' },
  { border: 'border-t-emerald-500', icon: 'text-emerald-500 bg-emerald-50' },
];

const REGION_BORDERS = [
  'from-rose-400 to-pink-300',
  'from-sky-400 to-cyan-300',
  'from-emerald-400 to-teal-300',
  'from-amber-400 to-yellow-300',
  'from-violet-400 to-purple-300',
  'from-blue-400 to-indigo-300',
  'from-lime-400 to-green-300',
  'from-fuchsia-400 to-pink-300',
];

function tierBadge(tier: CustomerTier) {
  switch (tier) {
    case 'CIP':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'VVIP':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'VIP':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

function formatBirthday(date: string | null, age: number | null) {
  if (!date) return '-';
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return age != null ? `${label} (${age})` : label;
}

function formatShortDate(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function CrmDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchIdParam = searchParams.get('branchId');

  const [view, setView] = useState<ViewTab>('customers');
  const [monthMode, setMonthMode] = useState<MonthMode>('all');
  const [tier, setTier] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [amountBucket, setAmountBucket] = useState('all');
  const [week, setWeek] = useState<string>('all');

  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [customerData, setCustomerData] = useState<CrmCustomerListResponse | null>(null);
  const [birthdayData, setBirthdayData] = useState<BirthdayReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [historyByPhone, setHistoryByPhone] = useState<Record<string, CrmHistoryResponse[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const [greetingTarget, setGreetingTarget] = useState<CrmCustomerRow | null>(null);
  const [greetingMessage, setGreetingMessage] = useState('');

  useEffect(() => {
    api.get<ApiResponse<BranchResponse[]>>('/branches').then(({ data }) => setBranches(data.data));
  }, []);

  const branchLabel = useMemo(() => {
    if (!branchIdParam) return 'အမှတ်(၂၉) သက်သာခြင်းစတိုး - (အရောင်း/ဝယ်ပြန်)';
    const b = branches.find((x) => String(x.id) === branchIdParam);
    return b?.name || 'CRM Dashboard';
  }, [branchIdParam, branches]);

  const loadCustomers = useCallback(async () => {
    const params = new URLSearchParams();
    if (branchIdParam) params.set('branchId', branchIdParam);
    params.set('monthMode', monthMode);
    if (tier !== 'ALL') params.set('tier', tier);
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    if (amountBucket !== 'all') params.set('amountBucket', amountBucket);
    params.set('limit', '400');
    const { data } = await api.get<ApiResponse<CrmCustomerListResponse>>(
      `/dashboard/customers?${params.toString()}`
    );
    setCustomerData(data.data);
  }, [branchIdParam, monthMode, tier, appliedSearch, amountBucket]);

  const loadBirthday = useCallback(async () => {
    const params = new URLSearchParams();
    if (branchIdParam) params.set('branchId', branchIdParam);
    params.set('monthMode', monthMode === 'all' ? 'all' : 'current');
    if (tier !== 'ALL') params.set('tier', tier);
    if (week !== 'all') params.set('week', week);
    const { data } = await api.get<ApiResponse<BirthdayReportResponse>>(
      `/dashboard/birthday-report?${params.toString()}`
    );
    setBirthdayData(data.data);
  }, [branchIdParam, monthMode, tier, week]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === 'customers') {
        await loadCustomers();
      } else {
        await loadBirthday();
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Dashboard data မတင်နိုင်ပါ'
      );
    } finally {
      setLoading(false);
    }
  }, [view, loadCustomers, loadBirthday]);

  useEffect(() => {
    load();
  }, [load]);

  const openGreeting = (c: CrmCustomerRow) => {
    setGreetingTarget(c);
    setGreetingMessage(`မင်္ဂလာပါ ${c.customerName}၊ မွေးနေ့မင်္ဂလာပါ! 😊`);
  };

  const sendGreeting = () => {
    if (!greetingTarget) return;
    const body = encodeURIComponent(greetingMessage);
    const phone = greetingTarget.phone.replace(/[^\d+]/g, '');
    window.open(`sms:${phone}?&body=${body}`, '_self');
    setGreetingTarget(null);
  };

  const toggleHistory = async (phone: string) => {
    if (expandedPhone === phone) {
      setExpandedPhone(null);
      return;
    }
    setExpandedPhone(phone);
    if (historyByPhone[phone]) return;
    setHistoryLoading(phone);
    try {
      const params = new URLSearchParams({ phone, size: '8', page: '0' });
      if (branchIdParam) params.set('branchId', branchIdParam);
      const { data } = await api.get<ApiResponse<PageResponse<CrmHistoryResponse>>>(
        `/crm-history?${params.toString()}`
      );
      setHistoryByPhone((prev) => ({ ...prev, [phone]: data.data.content }));
    } catch {
      setHistoryByPhone((prev) => ({ ...prev, [phone]: [] }));
    } finally {
      setHistoryLoading(null);
    }
  };

  const tierCounts = view === 'customers' ? customerData?.tierCounts : birthdayData?.tierCounts;
  const customerCountBadge =
    view === 'customers'
      ? customerData?.totalCustomers ?? 0
      : birthdayData?.totalBirthdays ?? 0;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">CRM</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{branchLabel}</p>
        </div>
        <div className="inline-flex rounded-full border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setView('customers');
              setMonthMode('all');
              setTier('ALL');
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm transition-colors',
              view === 'customers' ? 'bg-white font-medium shadow-sm' : 'text-muted-foreground'
            )}
          >
            Customer List
          </button>
          <button
            type="button"
            onClick={() => {
              setView('birthday');
              setMonthMode('current');
              setTier('ALL');
              setWeek('all');
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
              view === 'birthday' ? 'bg-slate-900 text-white' : 'text-muted-foreground'
            )}
          >
            <Cake className="h-3.5 w-3.5" />
            Birthday Report
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">CRM</h2>
          <Badge variant="secondary" className="rounded-full">
            {customerCountBadge.toLocaleString()} customers
          </Badge>
        </div>
      </div>

      {/* Month + tiers */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <MonthToggle mode={monthMode} onChange={setMonthMode} />
          <div className="flex flex-wrap gap-2">
            {view === 'birthday' && (
              <TierChip
                active={tier === 'ALL'}
                label={`ALL (${birthdayData?.tierCounts?.ALL?.toLocaleString() ?? 0})`}
                onClick={() => setTier('ALL')}
                activeClass="bg-slate-900 text-white"
              />
            )}
            <TierChip
              active={tier === 'CIP'}
              label={`CIP (${tierCounts?.CIP?.toLocaleString() ?? 0})`}
              icon={<Crown className="h-3.5 w-3.5" />}
              onClick={() => setTier((t) => (t === 'CIP' ? 'ALL' : 'CIP'))}
              activeClass="bg-purple-600 text-white"
            />
            <TierChip
              active={tier === 'VVIP'}
              label={`VVIP (${tierCounts?.VVIP?.toLocaleString() ?? 0})`}
              icon={<Star className="h-3.5 w-3.5" />}
              onClick={() => setTier((t) => (t === 'VVIP' ? 'ALL' : 'VVIP'))}
              activeClass="bg-sky-600 text-white"
            />
            <TierChip
              active={tier === 'VIP'}
              label={`VIP (${tierCounts?.VIP?.toLocaleString() ?? 0})`}
              icon={<Star className="h-3.5 w-3.5" />}
              onClick={() => setTier((t) => (t === 'VIP' ? 'ALL' : 'VIP'))}
              activeClass="bg-slate-600 text-white"
            />
            <TierChip
              active={tier === 'CARE'}
              label={`CARE (${tierCounts?.CARE?.toLocaleString() ?? 0})`}
              icon={<Heart className="h-3.5 w-3.5" />}
              onClick={() => setTier((t) => (t === 'CARE' ? 'ALL' : 'CARE'))}
              activeClass="bg-emerald-600 text-white"
            />
          </div>
          {view === 'birthday' && (
            <span className="ml-auto text-xs text-muted-foreground">Sorted by soonest birthday</span>
          )}
        </div>

        {view === 'customers' ? (
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Search customer, phone, township..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setAppliedSearch(search.trim());
                }}
                onBlur={() => setAppliedSearch(search.trim())}
              />
            </div>
            <Select value={amountBucket} onValueChange={setAmountBucket}>
              <SelectTrigger className="h-10 w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMOUNT_BUCKETS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={week} onValueChange={setWeek}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                <SelectItem value="1">Week 1</SelectItem>
                <SelectItem value="2">Week 2</SelectItem>
                <SelectItem value="3">Week 3</SelectItem>
                <SelectItem value="4">Week 4</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {(birthdayData?.totalBirthdays ?? 0).toLocaleString()} birthdays
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : view === 'customers' ? (
        <CustomerListView
          data={customerData}
          expandedPhone={expandedPhone}
          historyByPhone={historyByPhone}
          historyLoading={historyLoading}
          onToggleHistory={toggleHistory}
          onFollowUp={(c) =>
            router.push(
              `/crm-history/new?phone=${encodeURIComponent(c.phone)}&customerName=${encodeURIComponent(c.customerName)}`
            )
          }
        />
      ) : (
        <BirthdayReportView
          data={birthdayData}
          tier={tier}
          onGreet={openGreeting}
          onHistory={(c) => router.push(`/crm-history?phone=${encodeURIComponent(c.phone)}`)}
        />
      )}

      <Dialog open={!!greetingTarget} onOpenChange={(open) => !open && setGreetingTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                <Cake className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Birthday Greeting</DialogTitle>
                <p className="text-sm text-muted-foreground">{greetingTarget?.customerName}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Message
            </label>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-sky-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
            />
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {greetingTarget?.phone}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGreetingTarget(null)}>
              Cancel
            </Button>
            <Button className="bg-pink-500 hover:bg-pink-600" onClick={sendGreeting}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthToggle({ mode, onChange }: { mode: MonthMode; onChange: (m: MonthMode) => void }) {
  return (
    <div className="inline-flex rounded-full border bg-white p-0.5">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
          mode === 'all' ? 'bg-slate-900 text-white' : 'text-muted-foreground'
        )}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        All Months
      </button>
      <button
        type="button"
        onClick={() => onChange('current')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
          mode === 'current' ? 'bg-slate-900 text-white' : 'text-muted-foreground'
        )}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Current Month
      </button>
    </div>
  );
}

function TierChip({
  active,
  label,
  icon,
  onClick,
  activeClass,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active ? activeClass : 'bg-white text-[#595959] hover:bg-[#fafafa]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CustomerListView({
  data,
  expandedPhone,
  historyByPhone,
  historyLoading,
  onToggleHistory,
  onFollowUp,
}: {
  data: CrmCustomerListResponse | null;
  expandedPhone: string | null;
  historyByPhone: Record<string, CrmHistoryResponse[]>;
  historyLoading: string | null;
  onToggleHistory: (phone: string) => void;
  onFollowUp: (c: CrmCustomerRow) => void;
}) {
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          Total Purchase: {Number(data.totalPurchase).toLocaleString()} MMK
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          Total Visits: {data.totalVisits.toLocaleString()}
        </span>
        <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">
          Avg / Customer: {Number(data.avgPerCustomer).toLocaleString()} MMK
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-8 px-2 py-2.5" />
                  <th className="px-3 py-2.5 text-left font-semibold">ဝယ်သူအမည်</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Tier</th>
                  <th className="px-2 py-2.5 text-left font-semibold">ဖုန်း</th>
                  <th className="px-2 py-2.5 text-left font-semibold">မွေးနေ့</th>
                  <th className="px-2 py-2.5 text-left font-semibold">ဆိုင်</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Created By</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Visits</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Last Update</th>
                  <th className="px-2 py-2.5 text-center font-semibold">History</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => {
                  const open = expandedPhone === c.phone;
                  return (
                    <Fragment key={c.phone}>
                      <tr className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-2 py-2.5">
                          <button type="button" onClick={() => onToggleHistory(c.phone)}>
                            {open ? (
                              <ChevronDown className="h-4 w-4 text-primary" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.customerName}</td>
                        <td className="px-2 py-2.5">
                          <Badge variant="outline" className={cn('rounded-md', tierBadge(c.tier))}>
                            {c.tier}
                          </Badge>
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{c.phone}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {c.birthday && <Cake className="h-3.5 w-3.5 text-pink-500" />}
                            {formatBirthday(c.birthday, c.age)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{c.branchName || '-'}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-muted-foreground">
                          {c.createdBy || '-'}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                          {Number(c.totalAmount).toLocaleString()}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{c.visits}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          {formatShortDate(c.lastUpdate)}
                        </td>
                        <td className="px-2 py-2.5 text-center text-muted-foreground">-</td>
                        <td className="px-2 py-2.5 text-right">
                          <Button size="sm" variant="outline" className="h-8" onClick={() => onFollowUp(c)}>
                            <MessageCircle className="h-3.5 w-3.5" />
                            Follow-up
                          </Button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-[#fafafa]">
                          <td colSpan={12} className="px-6 py-3">
                            {historyLoading === c.phone ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading history…
                              </div>
                            ) : (historyByPhone[c.phone]?.length ?? 0) === 0 ? (
                              <p className="text-sm text-muted-foreground">No history records.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {historyByPhone[c.phone].map((h) => (
                                  <div
                                    key={h.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-xs"
                                  >
                                    <span className="font-medium">{formatDateTime(h.createdAt)}</span>
                                    <span>{formatCurrency(h.amount)}</span>
                                    <span className="text-muted-foreground">
                                      {h.inviteStatus || h.actionType}
                                    </span>
                                    <span className="text-muted-foreground">{h.createdBy || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {data.customers.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No customers found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BirthdayReportView({
  data,
  tier,
  onGreet,
  onHistory,
}: {
  data: BirthdayReportResponse | null;
  tier: string;
  onGreet: (c: CrmCustomerRow) => void;
  onHistory: (c: CrmCustomerRow) => void;
}) {
  if (!data) return null;
  const total = data.totalBirthdays;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold md:text-base">
          {tier === 'ALL' ? 'All' : tier} ({total.toLocaleString()}) - မွေးနေ့ရှင်များကို ရက်သတ္တပတ်အလိုက်
          ခွဲခြားပြသမှု
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.weeks.map((w, idx) => {
            const color = WEEK_COLORS[idx] || WEEK_COLORS[0];
            return (
              <Card key={w.week} className={cn('overflow-hidden border-t-4', color.border)}>
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-col items-center text-center">
                    <div
                      className={cn(
                        'mb-2 flex h-9 w-9 items-center justify-center rounded-full',
                        color.icon
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {w.label}{' '}
                      <span className="font-normal">({w.dayRange})</span>
                    </p>
                    <p className="mt-2 text-3xl font-bold tabular-nums">{w.totalCustomers}</p>
                    <p className="text-xs text-muted-foreground">Customers</p>
                  </div>
                  <StatList
                    rows={[
                      ['CIP', w.tierCounts.CIP],
                      ['VIP', w.tierCounts.VIP],
                      ['VVIP', w.tierCounts.VVIP],
                      ['Care', w.tierCounts.CARE],
                    ]}
                  />
                  <div className="my-3 border-t" />
                  <StatList
                    rows={[
                      ['18–24', w.ageCounts['18-24']],
                      ['25–34', w.ageCounts['25-34']],
                      ['35–44', w.ageCounts['35-44']],
                      ['45–54', w.ageCounts['45-54']],
                      ['55–64', w.ageCounts['55-64']],
                    ]}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold md:text-base">
          တိုင်း/ပြည်နယ်အလိုက် ခွဲခြားပြသမှု
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.regions.map((r, idx) => (
            <Card key={`${r.regionId}-${r.regionName}`} className="overflow-hidden">
              <div
                className={cn(
                  'h-1.5 bg-gradient-to-r',
                  REGION_BORDERS[idx % REGION_BORDERS.length]
                )}
              />
              <CardContent className="p-4">
                <div className="mb-3 text-center">
                  <p className="text-sm font-semibold">
                    {r.regionName}{' '}
                    <span className="text-lg font-bold tabular-nums">{r.totalCustomers}</span>{' '}
                    <span className="text-xs text-muted-foreground">Cus</span>
                  </p>
                </div>
                <StatList
                  rows={[
                    ['CIP', r.tierCounts.CIP],
                    ['VIP', r.tierCounts.VIP],
                    ['VVIP', r.tierCounts.VVIP],
                    ['Care', r.tierCounts.CARE],
                  ]}
                />
                <div className="my-3 border-t" />
                <StatList
                  rows={[
                    ['18–24', r.ageCounts['18-24']],
                    ['25–34', r.ageCounts['25-34']],
                    ['35–44', r.ageCounts['35-44']],
                    ['45–54', r.ageCounts['45-54']],
                    ['55–64', r.ageCounts['55-64']],
                  ]}
                />
              </CardContent>
            </Card>
          ))}
          {data.regions.length === 0 && (
            <p className="text-sm text-muted-foreground">Region data မရှိပါ</p>
          )}
        </div>
      </div>

      {data.birthdayToday.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold md:text-base">Birthday Today</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.birthdayToday.map((c) => (
              <Card key={c.phone} className="overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-white px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                        {(c.customerName || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-pink-500 p-0.5 text-white">
                        <Cake className="h-2.5 w-2.5" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Customer Profile
                      </p>
                      <p className="font-medium">Birthday Today</p>
                    </div>
                    <Badge variant="outline" className={cn('rounded-md', tierBadge(c.tier))}>
                      {c.tier}
                    </Badge>
                  </div>
                </div>
                <CardContent className="space-y-2 p-4 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Customer Name
                    </p>
                    <p className="font-semibold">{c.customerName}</p>
                  </div>
                  <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {c.phone}
                  </p>
                  <p className="inline-flex flex-wrap items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-pink-500" />
                    {formatBirthday(c.birthday, null)}
                    {c.age != null && (
                      <span className="rounded-full bg-[#f1f3f4] px-2 py-0.5 text-xs text-[#5f6368]">
                        {c.age} yrs
                      </span>
                    )}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {c.townshipName || '-'}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Home className="h-3.5 w-3.5" />
                    {c.regionName || '-'}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Created By: {c.createdBy || '-'}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Not Yet Redeemed
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 text-primary" onClick={() => onHistory(c)}>
                      History
                    </Button>
                  </div>
                  <Button
                    className="mt-1 w-full bg-pink-500 hover:bg-pink-600"
                    onClick={() => onGreet(c)}
                  >
                    <Gift className="h-4 w-4" />
                    Send Greeting
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatList({ rows }: { rows: [string, number | undefined][] }) {
  return (
    <div className="space-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums font-medium">{(value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
