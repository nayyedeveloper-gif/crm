'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type { ApiResponse, PageResponse, CrmHistoryResponse } from '@/types';
import { ACTION_TYPE_LABELS, type ActionType } from '@/types';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  FileText,
  Banknote,
  CalendarDays,
  MapPinned,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface NamedCount {
  name: string;
  count: number;
  amount: number;
}

interface DashboardSummary {
  totalRecords: number;
  totalAmount: number;
  recordsToday: number;
  recordsThisMonth: number;
  byActionType: NamedCount[];
  byBranch: NamedCount[];
  byRegion: NamedCount[];
  byTownship: NamedCount[];
}

type RankKey = 'count' | 'amount';

function share(value: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((value / total) * 100)}%`;
}

function RankTable({
  title,
  rows,
  totalCount,
  totalAmount,
  empty,
  sortKey = 'count',
}: {
  title: string;
  rows: NamedCount[];
  totalCount: number;
  totalAmount: number;
  empty: string;
  sortKey?: RankKey;
}) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [rows, sortKey]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">{title}</h3>
        <span className="text-[10px] text-[#8c8c8c] sm:text-xs">{sorted.length} items</span>
      </div>

      {/* Mobile list */}
      <div className="min-h-0 flex-1 overflow-auto divide-y divide-[#f0f0f0] dark:divide-neutral-800 md:hidden">
        {sorted.map((r, i) => (
          <div key={r.name} className="flex items-start gap-2.5 px-3 py-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[10px] font-semibold text-[#8c8c8c]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                {r.name}
              </p>
              <p className="text-[11px] text-[#8c8c8c]">
                {r.count.toLocaleString()} · {share(r.count, totalCount)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-[#262626] dark:text-neutral-100">
              {formatCurrency(r.amount)}
            </p>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-[#8c8c8c]">{empty}</p>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center justify-between bg-[#fafafa] px-3 py-2.5 text-sm font-medium dark:bg-neutral-950">
            <span>Total</span>
            <div className="text-right">
              <p className="tabular-nums">{totalCount.toLocaleString()}</p>
              <p className="text-[11px] font-normal text-[#8c8c8c]">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
            <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
              <th className="w-10 px-3 py-2 text-left font-normal">#</th>
              <th className="px-3 py-2 text-left font-normal">Name</th>
              <th className="px-3 py-2 text-right font-normal">Count</th>
              <th className="px-3 py-2 text-right font-normal">Share</th>
              <th className="px-3 py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.name}
                className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
              >
                <td className="px-3 py-2.5 tabular-nums text-[#bfbfbf]">{i + 1}</td>
                <td className="max-w-[180px] truncate px-3 py-2.5 text-[#262626] dark:text-neutral-200">
                  {r.name}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#262626] dark:text-neutral-200">
                  {r.count.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#8c8c8c]">
                  {share(r.count, totalCount)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#595959]">
                  {formatCurrency(r.amount)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-[#8c8c8c]">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#fafafa] dark:bg-neutral-950">
              <tr className="border-t border-[#f0f0f0] font-medium dark:border-neutral-800">
                <td className="px-3 py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {totalCount.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#8c8c8c]">100%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 border-b border-[#f0f0f0] px-3 py-3 sm:gap-3 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0 dark:border-neutral-800">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#595959] dark:bg-neutral-800 dark:text-neutral-300 sm:h-9 sm:w-9">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-[#8c8c8c] sm:text-[11px]">{label}</p>
        <p className="truncate text-base font-semibold tabular-nums text-[#262626] dark:text-neutral-100 sm:text-lg">
          {value}
        </p>
        {sub && <p className="truncate text-[10px] text-[#bfbfbf] sm:text-[11px]">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<CrmHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankTab, setRankTab] = useState<'action' | 'branch' | 'region' | 'township'>('branch');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = branchId ? `?branchId=${branchId}` : '';
    try {
      const [sumRes, recentRes] = await Promise.all([
        api.get<ApiResponse<DashboardSummary>>(`/dashboard/summary${qs}`),
        api.get<ApiResponse<PageResponse<CrmHistoryResponse>>>(
          `/crm-history?page=0&size=12${branchId ? `&branchId=${branchId}` : ''}`
        ),
      ]);
      setSummary(sumRes.data.data);
      setRecent(recentRes.data.data.content);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Dashboard မတင်နိုင်ပါ'
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const actionRows = useMemo(
    () =>
      (summary?.byActionType || []).map((r) => ({
        ...r,
        name: ACTION_TYPE_LABELS[r.name as ActionType] || r.name,
      })),
    [summary]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      {/* Desktop toolbar */}
      <div className="hidden shrink-0 flex-wrap items-center gap-3 border-b border-[#f0f0f0] bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-semibold text-[#262626] dark:text-neutral-100">
            Dashboard
          </h1>
          <p className="text-xs text-[#8c8c8c]">CRM overview · live database</p>
        </div>
        <Button variant="outline" className="h-8 gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button className="h-8 gap-1.5" onClick={() => router.push('/crm-history/new')}>
          <Plus className="h-3.5 w-3.5" />
          New Record
        </Button>
      </div>

      {/* Mobile quick actions */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
        <Button className="h-9 gap-1.5 px-3" onClick={() => router.push('/crm-history/new')}>
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 sm:px-5">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[#8c8c8c]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : summary ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:gap-4 sm:p-5">
          {/* KPI strip */}
          <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-[#f0f0f0] bg-white md:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-900">
            <StatTile
              icon={FileText}
              label="Total Records"
              value={summary.totalRecords.toLocaleString()}
            />
            <StatTile
              icon={Banknote}
              label="Total Amount"
              value={formatCurrency(summary.totalAmount)}
            />
            <StatTile
              icon={CalendarDays}
              label="Today / This month"
              value={summary.recordsToday.toLocaleString()}
              sub={`Month ${summary.recordsThisMonth.toLocaleString()}`}
            />
            <StatTile
              icon={MapPinned}
              label="Active Regions"
              value={String(summary.byRegion.length)}
              sub={`${summary.byTownship?.length ?? 0} townships · ${summary.byBranch.length} branches`}
            />
          </div>

          {/* Main: recent + ranking */}
          <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Recent records */}
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                  Recent Records
                </h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline sm:text-sm"
                  onClick={() => router.push('/crm-history')}
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Mobile list */}
              <div className="min-h-0 flex-1 overflow-auto divide-y divide-[#f0f0f0] dark:divide-neutral-800 md:hidden">
                {recent.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left active:bg-[#fafafa]"
                    onClick={() => router.push(`/crm-history/${r.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                        {r.customerName}
                      </p>
                      <p className="truncate text-xs text-[#8c8c8c]">
                        {r.phone} · {r.branchName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#bfbfbf]">
                        {ACTION_TYPE_LABELS[r.actionType]} · {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {formatCurrency(r.amount)}
                    </p>
                  </button>
                ))}
                {recent.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-[#8c8c8c]">No records yet</p>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden min-h-0 flex-1 overflow-auto md:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
                    <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
                      <th className="px-4 py-2 text-left font-normal">Customer</th>
                      <th className="px-4 py-2 text-left font-normal">Phone</th>
                      <th className="px-4 py-2 text-left font-normal">Branch</th>
                      <th className="px-4 py-2 text-left font-normal">Action</th>
                      <th className="px-4 py-2 text-right font-normal">Amount</th>
                      <th className="px-4 py-2 text-left font-normal">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-[#f0f0f0] hover:bg-[#fafafa] dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                        onClick={() => router.push(`/crm-history/${r.id}`)}
                      >
                        <td className="px-4 py-2.5 font-medium text-[#262626] dark:text-neutral-200">
                          {r.customerName}
                        </td>
                        <td className="px-4 py-2.5 text-[#595959]">{r.phone}</td>
                        <td className="px-4 py-2.5 text-[#595959]">{r.branchName}</td>
                        <td className="px-4 py-2.5 text-[#595959]">
                          {ACTION_TYPE_LABELS[r.actionType]}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[#8c8c8c]">
                          {formatDateTime(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-[#8c8c8c]">
                          No records yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking panel with tabs — tables, not bars */}
            <div className="flex min-h-0 flex-col gap-2">
              <div className="inline-flex shrink-0 flex-wrap self-start overflow-hidden rounded-lg border border-[#d9d9d9] bg-white dark:border-neutral-700 dark:bg-neutral-900">
                {(
                  [
                    ['branch', 'Branch'],
                    ['region', 'Region'],
                    ['township', 'Township'],
                    ['action', 'Action'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRankTab(key)}
                    className={cn(
                      'h-8 px-3 text-sm transition-colors',
                      rankTab === key
                        ? 'bg-primary text-white'
                        : 'text-[#595959] hover:bg-[#fafafa] dark:text-neutral-300 dark:hover:bg-neutral-800'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {rankTab === 'branch' && (
                <RankTable
                  title="Ranking by Branch"
                  rows={summary.byBranch}
                  totalCount={summary.totalRecords}
                  totalAmount={summary.totalAmount}
                  empty="No branch data"
                />
              )}
              {rankTab === 'region' && (
                <RankTable
                  title="Ranking by Region"
                  rows={summary.byRegion}
                  totalCount={summary.byRegion.reduce((s, r) => s + r.count, 0)}
                  totalAmount={summary.byRegion.reduce((s, r) => s + Number(r.amount), 0)}
                  empty="No region data"
                />
              )}
              {rankTab === 'township' && (
                <RankTable
                  title="Ranking by Township"
                  rows={summary.byTownship ?? []}
                  totalCount={(summary.byTownship ?? []).reduce((s, r) => s + r.count, 0)}
                  totalAmount={(summary.byTownship ?? []).reduce((s, r) => s + Number(r.amount), 0)}
                  empty="No township data"
                />
              )}
              {rankTab === 'action' && (
                <RankTable
                  title="Ranking by Action"
                  rows={actionRows}
                  totalCount={summary.totalRecords}
                  totalAmount={summary.totalAmount}
                  empty="No action data"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
