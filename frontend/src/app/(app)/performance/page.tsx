'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type {
  ActionType,
  ApiResponse,
  BranchResponse,
  BucketActual,
  BucketMeta,
  InviteStatus,
  RegionPerformanceResponse,
  RegionResponse,
  StaffPerformanceResponse,
  StatusBreakdownResponse,
  StatusPerformanceResponse,
  TownshipResponse,
} from '@/types';
import {
  ACTION_TYPE_LABELS,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Gauge,
  Loader2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const ACTION_TYPES: ActionType[] = ['PURCHASE', 'INQUIRY', 'FOLLOW_UP', 'COMPLAINT', 'OTHER'];
const INVITE_STATUSES: InviteStatus[] = [
  'ATTEND',
  'NOT_ATTEND',
  'UNREACHABLE',
  'NOT_ANSWERED',
  'PHONE_OFF',
];

const PERF_STATUS_LABELS: Record<InviteStatus, string> = {
  ATTEND: 'ပွဲတက်မယ်',
  NOT_ATTEND: 'မတက်ဘူး',
  UNREACHABLE: 'အဆက်အသွယ် မရသေး',
  NOT_ANSWERED: 'ဖုန်းမကိုင်ပါ',
  PHONE_OFF: 'စက်ပိတ်ထားပါသည်',
};

const STATUS_PILL: Record<InviteStatus, string> = {
  ATTEND: 'bg-[#e6f4ea] text-[#1e8e3e]',
  NOT_ATTEND: 'bg-[#fce8e6] text-[#d93025]',
  UNREACHABLE: 'bg-[#fef7e0] text-[#f29900]',
  NOT_ANSWERED: 'bg-[#fff7e0] text-[#ea8600]',
  PHONE_OFF: 'bg-[#f1f3f4] text-[#5f6368]',
};

function fmt(n: number | undefined | null): string {
  if (n == null || n === 0) return '-';
  return n.toLocaleString('en-US');
}

function bucketValue(raw: BucketActual | number | undefined): BucketActual {
  if (raw == null) return { count: 0, uniquePhones: 0 };
  if (typeof raw === 'number') return { count: raw, uniquePhones: 0 };
  return raw;
}

function DualPill({
  count,
  unique,
}: {
  count: number;
  unique?: number;
}) {
  if (!count && !unique) {
    return <span className="text-[#bfbfbf]">-</span>;
  }
  return (
    <span className="inline-flex items-center justify-center gap-1">
      <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs tabular-nums text-[#2e7d32]">
        {fmt(count)}
      </span>
      <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs tabular-nums text-[#2e7d32]">
        {unique ? fmt(unique) : '-'}
      </span>
    </span>
  );
}

function StatusPill({
  status,
  value,
}: {
  status: InviteStatus;
  value: number;
}) {
  if (!value) return <span className="text-[#bfbfbf]">-</span>;
  return (
    <span
      className={cn(
        'inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums',
        STATUS_PILL[status]
      )}
    >
      {value.toLocaleString('en-US')}
    </span>
  );
}

export default function PerformancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [townships, setTownships] = useState<TownshipResponse[]>([]);

  const [branchId, setBranchId] = useState(searchParams.get('branchId') || 'all');
  const [actionType, setActionType] = useState(searchParams.get('actionType') || 'all');
  const [inviteStatus, setInviteStatus] = useState(searchParams.get('inviteStatus') || 'all');
  const [regionId, setRegionId] = useState(searchParams.get('regionId') || 'all');
  const [townshipId, setTownshipId] = useState(searchParams.get('townshipId') || 'all');
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');

  const [applied, setApplied] = useState({
    branchId: searchParams.get('branchId') || 'all',
    actionType: searchParams.get('actionType') || 'all',
    inviteStatus: searchParams.get('inviteStatus') || 'all',
    regionId: searchParams.get('regionId') || 'all',
    townshipId: searchParams.get('townshipId') || 'all',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  });

  const [staff, setStaff] = useState<StaffPerformanceResponse | null>(null);
  const [statusByStaff, setStatusByStaff] = useState<StatusPerformanceResponse | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdownResponse | null>(null);
  const [regionPerf, setRegionPerf] = useState<RegionPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFilter, setShowFilter] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [focusedRegionId, setFocusedRegionId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    api.get<ApiResponse<BranchResponse[]>>('/branches').then(({ data }) => setBranches(data.data));
    api.get<ApiResponse<RegionResponse[]>>('/locations/regions').then(({ data }) => setRegions(data.data));
  }, []);

  useEffect(() => {
    if (regionId !== 'all') {
      api
        .get<ApiResponse<TownshipResponse[]>>(`/locations/regions/${regionId}/townships`)
        .then(({ data }) => setTownships(data.data));
    } else {
      setTownships([]);
      setTownshipId('all');
    }
  }, [regionId]);

  const buildQs = useCallback((f: typeof applied) => {
    const params = new URLSearchParams();
    if (f.branchId !== 'all') params.set('branchId', f.branchId);
    if (f.actionType !== 'all') params.set('actionType', f.actionType);
    if (f.inviteStatus !== 'all') params.set('inviteStatus', f.inviteStatus);
    if (f.regionId !== 'all') params.set('regionId', f.regionId);
    if (f.townshipId !== 'all') params.set('townshipId', f.townshipId);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    return params;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = buildQs(applied).toString();
    const suffix = qs ? `?${qs}` : '';
    try {
      const [staffRes, statusRes, breakdownRes, regionRes] = await Promise.all([
        api.get<ApiResponse<StaffPerformanceResponse>>(`/performance/staff${suffix}`),
        api.get<ApiResponse<StatusPerformanceResponse>>(`/performance/status-by-staff${suffix}`),
        api.get<ApiResponse<StatusBreakdownResponse>>(`/performance/status-breakdown${suffix}`),
        api.get<ApiResponse<RegionPerformanceResponse>>(`/performance/regions${suffix}`),
      ]);
      setStaff(staffRes.data.data);
      setStatusByStaff(statusRes.data.data);
      setStatusBreakdown(breakdownRes.data.data);
      setRegionPerf(regionRes.data.data);
    } catch (err: unknown) {
      setStaff(null);
      setStatusByStaff(null);
      setStatusBreakdown(null);
      setRegionPerf(null);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Performance data မတင်နိုင်ပါ'
      );
    } finally {
      setLoading(false);
    }
  }, [applied, buildQs]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!staff) return;
    const next: Record<string, Record<string, string>> = {};
    for (const row of staff.rows) {
      next[row.staffKey] = {};
      for (const meta of staff.bucketMeta) {
        next[row.staffKey][meta.code] = String(row.buckets[meta.code]?.target ?? 0);
      }
    }
    setDrafts(next);
  }, [staff]);

  const handleFilter = () => {
    setApplied({
      branchId,
      actionType,
      inviteStatus,
      regionId,
      townshipId,
      from,
      to,
    });
    setFocusedRegionId(undefined);
  };

  const handleClear = () => {
    setBranchId('all');
    setActionType('all');
    setInviteStatus('all');
    setRegionId('all');
    setTownshipId('all');
    setFrom('');
    setTo('');
    setApplied({
      branchId: 'all',
      actionType: 'all',
      inviteStatus: 'all',
      regionId: 'all',
      townshipId: 'all',
      from: '',
      to: '',
    });
    setFocusedRegionId(undefined);
  };

  const openFullData = () => {
    const params = buildQs(applied);
    params.delete('from');
    params.delete('to');
    if (applied.from) params.set('fromDate', applied.from);
    if (applied.to) params.set('toDate', applied.to);
    const qs = params.toString();
    router.push(qs ? `/crm-history?${qs}` : '/crm-history');
  };

  const saveAllTargets = async () => {
    if (!canEdit || !staff) return;
    setSavingAll(true);
    try {
      const branchNum = applied.branchId !== 'all' ? Number(applied.branchId) : null;
      await Promise.all(
        staff.rows.map(async (row) => {
          const targets: Record<string, number> = {};
          for (const meta of staff.bucketMeta) {
            targets[meta.code] = Math.max(
              0,
              parseInt(drafts[row.staffKey]?.[meta.code] ?? '0', 10) || 0
            );
          }
          await api.put('/performance/staff/targets', {
            staffKey: row.staffKey,
            branchId: branchNum,
            targets,
          });
        })
      );
      await load();
    } finally {
      setSavingAll(false);
    }
  };

  const regionRows = useMemo(() => {
    if (!regionPerf) return [];
    if (focusedRegionId === undefined) return regionPerf.rows;
    return regionPerf.rows.filter((r) => r.regionId === focusedRegionId);
  }, [regionPerf, focusedRegionId]);

  return (
    <div className="space-y-4 pb-8 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold md:text-2xl">CRM Staff Performance</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">All staff CRM History records</p>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Actual ranges are based on amount in သိန်း (1 သိန်း = 100,000): 50-100, 100-300, 300-500,
            500-1000, &gt;1000, Other (&lt;50). Cell = record count + unique phone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTargets((v) => !v)}>
            {showTargets ? 'Hide Targets' : 'Show Targets'}
          </Button>
          <Button variant="outline" size="sm" onClick={openFullData}>
            Data အပြည့်စုံ
          </Button>
          {canEdit && (
            <Button size="sm" onClick={saveAllTargets} disabled={savingAll || loading}>
              {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Targets
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filter</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowFilter((v) => !v)}
            >
              {showFilter ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showFilter ? 'Hide Filter' : 'Show Filter'}
            </button>
          </div>
          {showFilter && (
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ဆိုင်</label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="ဆိုင်အားလုံး" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ဆိုင်အားလုံး</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Action</label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="အားလုံး" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">အားလုံး</SelectItem>
                    {ACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACTION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ပွဲ Status</label>
                <Select value={inviteStatus} onValueChange={setInviteStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="အားလုံး" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">အားလုံး</SelectItem>
                    {INVITE_STATUSES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PERF_STATUS_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">တိုင်း/ပြည်နယ်</label>
                <Select value={regionId} onValueChange={setRegionId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="အားလုံး" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">အားလုံး</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nameMm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">မြို့နယ်</label>
                <Select
                  value={townshipId}
                  onValueChange={setTownshipId}
                  disabled={regionId === 'all'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="အားလုံး" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">အားလုံး</SelectItem>
                    {townships.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nameMm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ရက်စွဲမှ</label>
                <Input className="h-9" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ရက်စွဲသို့</label>
                <Input className="h-9" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button className="h-9" size="sm" onClick={handleFilter}>
                  Filter
                </Button>
                <Button className="h-9" size="sm" variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
      ) : (
        <>
          {/* Staff Performance */}
          <SectionCard title="Staff Performance">
            {staff && staff.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-[#8c8c8c]">
                      <th className="px-3 py-2.5 text-left font-semibold">Created By</th>
                      {showTargets && (
                        <th className="px-2 py-2.5 text-center font-semibold">Total Target</th>
                      )}
                      <th className="px-2 py-2.5 text-center font-semibold">Total</th>
                      {staff.bucketMeta.map((b) => (
                        <th
                          key={b.code}
                          colSpan={showTargets ? 2 : 1}
                          className="px-2 py-2.5 text-center font-semibold normal-case"
                        >
                          {b.labelMm}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b text-[10px]">
                      <th />
                      {showTargets && <th />}
                      <th />
                      {staff.bucketMeta.map((b) => (
                        <Fragment key={b.code}>
                          {showTargets && (
                            <th className="px-1 py-1 text-center font-medium text-[#d93025]">
                              Target
                            </th>
                          )}
                          <th className="px-1 py-1 text-center font-medium text-[#1e8e3e]">
                            Actual
                          </th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.rows.map((row) => (
                      <tr key={row.staffKey} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.staffKey}</td>
                        {showTargets && (
                          <td className="px-2 py-2.5 text-center tabular-nums text-[#595959]">
                            {fmt(row.totalTarget)}
                          </td>
                        )}
                        <td className="px-2 py-2.5 text-center font-medium tabular-nums">
                          {fmt(row.totalActual)}
                        </td>
                        {staff.bucketMeta.map((b: BucketMeta) => {
                          const cell = row.buckets[b.code];
                          return (
                            <Fragment key={b.code}>
                              {showTargets && (
                                <td className="px-1 py-1.5 text-center">
                                  {canEdit ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      className="mx-auto h-8 w-14 rounded border-[#d9d9d9] bg-white text-center text-xs shadow-none"
                                      value={drafts[row.staffKey]?.[b.code] ?? '0'}
                                      onChange={(e) =>
                                        setDrafts((prev) => ({
                                          ...prev,
                                          [row.staffKey]: {
                                            ...prev[row.staffKey],
                                            [b.code]: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  ) : (
                                    <span className="tabular-nums text-[#d93025]">
                                      {fmt(cell?.target)}
                                    </span>
                                  )}
                                </td>
                              )}
                              <td className="px-1 py-1.5 text-center">
                                <span className="inline-flex items-center justify-center gap-1 text-[#1e8e3e] tabular-nums">
                                  <span>{fmt(cell?.actual)}</span>
                                  {(cell?.uniquePhones ?? 0) > 0 && (
                                    <span className="rounded-full bg-[#f1f3f4] px-1.5 py-0.5 text-[10px] text-[#5f6368]">
                                      {fmt(cell?.uniquePhones)}
                                    </span>
                                  )}
                                </span>
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-[#fafafa] font-medium">
                      <td className="px-3 py-2.5">{staff.totals.staffKey}</td>
                      {showTargets && (
                        <td className="px-2 py-2.5 text-center tabular-nums">
                          {fmt(staff.totals.totalTarget)}
                        </td>
                      )}
                      <td className="px-2 py-2.5 text-center tabular-nums">
                        {fmt(staff.totals.totalActual)}
                      </td>
                      {staff.bucketMeta.map((b) => (
                        <Fragment key={b.code}>
                          {showTargets && (
                            <td className="px-1 py-2.5 text-center tabular-nums text-[#d93025]">
                              {fmt(staff.totals.buckets[b.code]?.target)}
                            </td>
                          )}
                          <td className="px-1 py-2.5 text-center tabular-nums text-[#1e8e3e]">
                            {fmt(staff.totals.buckets[b.code]?.actual)}
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState text="Staff performance data မရှိသေးပါ" />
            )}
          </SectionCard>

          {/* Status Performance */}
          <SectionCard
            title="Status Performance"
            icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
          >
            {statusByStaff && statusByStaff.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-[#8c8c8c]">
                      <th className="px-3 py-2.5 text-left font-semibold">Created By</th>
                      <th className="px-2 py-2.5 text-center font-semibold">Total</th>
                      {INVITE_STATUSES.map((s) => (
                        <th key={s} className="px-2 py-2.5 text-center font-semibold normal-case">
                          {PERF_STATUS_LABELS[s]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statusByStaff.rows.map((row) => (
                      <tr key={row.staffKey} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.staffKey}</td>
                        <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                          {row.total.toLocaleString('en-US')}
                        </td>
                        {INVITE_STATUSES.map((s) => (
                          <td key={s} className="px-2 py-2.5 text-center">
                            <StatusPill status={s} value={row.statuses[s] ?? 0} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-[#fafafa] font-medium">
                      <td className="px-3 py-2.5">{statusByStaff.totals.staffKey}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">
                        <span className="inline-block rounded bg-[#e8e8e8] px-2 py-0.5">
                          {statusByStaff.totals.total.toLocaleString('en-US')}
                        </span>
                      </td>
                      {INVITE_STATUSES.map((s) => (
                        <td key={s} className="px-2 py-2.5 text-center">
                          <StatusPill status={s} value={statusByStaff.totals.statuses[s] ?? 0} />
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState text="Status performance data မရှိသေးပါ" />
            )}
          </SectionCard>

          {/* Status Breakdown */}
          <SectionCard
            title="Status Breakdown"
            icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
          >
            {statusBreakdown && statusBreakdown.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-[#8c8c8c]">
                      <th className="px-3 py-2.5 text-left font-semibold">ပွဲ Status</th>
                      <th className="px-2 py-2.5 text-center font-semibold">Total</th>
                      {statusBreakdown.bucketMeta.map((b) => (
                        <th key={b.code} className="px-2 py-2.5 text-center font-semibold normal-case">
                          {b.labelMm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statusBreakdown.rows.map((row) => (
                      <tr key={row.statusCode} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.statusLabel}</td>
                        <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                          {row.total.toLocaleString('en-US')}
                        </td>
                        {statusBreakdown.bucketMeta.map((b) => {
                          const cell = row.buckets[b.code];
                          return (
                            <td key={b.code} className="px-2 py-2.5 text-center">
                              <DualPill count={cell?.count ?? 0} unique={cell?.uniquePhones} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-[#fafafa] font-medium">
                      <td className="px-3 py-2.5">{statusBreakdown.totals.statusLabel}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">
                        {statusBreakdown.totals.total.toLocaleString('en-US')}
                      </td>
                      {statusBreakdown.bucketMeta.map((b) => {
                        const cell = statusBreakdown.totals.buckets[b.code];
                        return (
                          <td key={b.code} className="px-2 py-2.5 text-center">
                            <DualPill count={cell?.count ?? 0} unique={cell?.uniquePhones} />
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState text="Status breakdown data မရှိသေးပါ" />
            )}
          </SectionCard>

          {/* Region Performance */}
          <SectionCard
            title="တိုင်း / ပြည်နယ် Performance"
            hint="Target မပါ — row နှိပ်ရင် မြို့နယ် ပေါ်မယ် / တခြား region တွေ hide — ထပ်နှိပ်ရင် ပြန်ပေါ်မယ်"
          >
            {regionPerf && regionRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-[#8c8c8c]">
                      <th className="px-3 py-2.5 text-left font-semibold normal-case">
                        တိုင်း / ပြည်နယ်
                      </th>
                      <th className="px-2 py-2.5 text-center font-semibold">Total</th>
                      {regionPerf.bucketMeta.map((b) => (
                        <th key={b.code} className="px-2 py-2.5 text-center font-semibold normal-case">
                          {b.labelMm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regionRows.map((row) => {
                      const open = focusedRegionId === row.regionId;
                      const hasTw = (row.townships?.length ?? 0) > 0;
                      return (
                        <Fragment key={`${row.regionId}-${row.regionName}`}>
                          <tr
                            className={cn(
                              'border-b border-[#f0f0f0] hover:bg-[#fafafa]',
                              hasTw && 'cursor-pointer',
                              open && 'bg-blue-50/60'
                            )}
                            title={hasTw ? 'နှိပ်ပြီး မြို့နယ် ကြည့်ရန်' : undefined}
                            onClick={() => {
                              if (!hasTw) return;
                              setFocusedRegionId((prev) =>
                                prev === row.regionId ? undefined : row.regionId
                              );
                            }}
                          >
                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                {hasTw ? (
                                  open ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-[#bfbfbf]" />
                                  )
                                ) : (
                                  <span className="inline-block w-4" />
                                )}
                                {row.regionName}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                              {row.totalActual.toLocaleString('en-US')}
                            </td>
                            {regionPerf.bucketMeta.map((b) => {
                              const cell = bucketValue(row.buckets[b.code]);
                              return (
                                <td key={b.code} className="px-2 py-2.5 text-center">
                                  <DualPill count={cell.count} unique={cell.uniquePhones} />
                                </td>
                              );
                            })}
                          </tr>
                          {open &&
                            row.townships.map((tw) => (
                              <tr
                                key={`${row.regionId}-${tw.townshipId}-${tw.townshipName}`}
                                className="border-b border-[#f0f0f0] bg-[#fafafa] text-[#595959]"
                              >
                                <td className="px-3 py-2 pl-11 whitespace-nowrap">{tw.townshipName}</td>
                                <td className="px-2 py-2 text-center tabular-nums">
                                  {tw.totalActual.toLocaleString('en-US')}
                                </td>
                                {regionPerf.bucketMeta.map((b) => {
                                  const cell = bucketValue(tw.buckets[b.code]);
                                  return (
                                    <td key={b.code} className="px-2 py-2 text-center">
                                      <DualPill count={cell.count} unique={cell.uniquePhones} />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-[#fafafa] font-medium">
                      <td className="px-3 py-2.5">{regionPerf.totals.regionName}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">
                        {regionPerf.totals.totalActual.toLocaleString('en-US')}
                      </td>
                      {regionPerf.bucketMeta.map((b) => {
                        const cell = bucketValue(regionPerf.totals.buckets[b.code]);
                        return (
                          <td key={b.code} className="px-2 py-2.5 text-center">
                            <DualPill count={cell.count} unique={cell.uniquePhones} />
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState text="Region performance data မရှိသေးပါ" />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function SectionCard({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-semibold md:text-base">{title}</h2>
          </div>
          {hint && <p className="text-[11px] text-muted-foreground md:text-xs">{hint}</p>}
        </div>
        <div className="p-0">{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}
