'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';
import { ACTION_TYPE_LABELS, type ActionType } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2, RefreshCw, Search } from 'lucide-react';

interface NamedCount {
  name: string;
  count: number;
  amount: number;
}

interface ReportSummary {
  totalRecords: number;
  totalAmount: number;
  byActionType: NamedCount[];
  byBranch: NamedCount[];
  byRegion: NamedCount[];
  byTownship: NamedCount[];
  byStaff: NamedCount[];
}

type DetailTab = 'staff' | 'branch' | 'region' | 'township';
type RankTab = 'branch' | 'region' | 'township' | 'action';

function share(count: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((count / total) * 100)}%`;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function exportNamedCounts(
  filename: string,
  rows: NamedCount[],
  totalCount: number,
  totalAmount: number,
  detailed: boolean
) {
  if (detailed) {
    downloadCsv(
      filename,
      ['Name', 'Count', 'Share %', 'Amount', 'Avg', 'Amount %'],
      rows.map((r) => {
        const avg = r.count ? Number(r.amount) / r.count : 0;
        return [
          r.name,
          r.count,
          totalCount ? Math.round((r.count / totalCount) * 100) : 0,
          Number(r.amount),
          Math.round(avg * 100) / 100,
          totalAmount ? Math.round((Number(r.amount) / Number(totalAmount)) * 100) : 0,
        ];
      })
    );
  } else {
    downloadCsv(
      filename,
      ['Name', 'Count', 'Share %', 'Amount'],
      rows.map((r) => [
        r.name,
        r.count,
        totalCount ? Math.round((r.count / totalCount) * 100) : 0,
        Number(r.amount),
      ])
    );
  }
}

function DetailPanel({
  title,
  rows,
  totalCount,
  totalAmount,
  search,
  onSearch,
  onExcel,
  exporting,
}: {
  title: string;
  rows: NamedCount[];
  totalCount: number;
  totalAmount: number;
  search: string;
  onSearch: (v: string) => void;
  onExcel: () => void;
  exporting?: boolean;
}) {
  const [sort, setSort] = useState<'count' | 'amount' | 'name'>('count');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return Number(b[sort]) - Number(a[sort]);
    });
  }, [rows, search, sort]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-3 py-2 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">{title}</h3>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bfbfbf]" />
          <Input
            className="h-7 w-[120px] pl-7 text-xs sm:w-[140px]"
            placeholder="Search…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#d9d9d9] dark:border-neutral-700">
          {(
            [
              ['count', 'Count'],
              ['amount', 'Amount'],
              ['name', 'Name'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                'h-7 px-2 text-xs',
                sort === key
                  ? 'bg-[#f0f5ff] text-primary'
                  : 'text-[#8c8c8c] hover:bg-[#fafafa] dark:hover:bg-neutral-800'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onExcel}
          disabled={exporting || filtered.length === 0}
        >
          {exporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Excel
        </Button>
        <span className="text-xs text-[#8c8c8c]">
          {filtered.length} / {rows.length}
        </span>
      </div>

      {/* Mobile list */}
      <div className="min-h-0 flex-1 overflow-auto divide-y divide-[#f0f0f0] dark:divide-neutral-800 md:hidden">
        {filtered.map((r, i) => {
          const avg = r.count ? Number(r.amount) / r.count : 0;
          return (
            <div key={r.name} className="flex items-start gap-2.5 px-3 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[10px] font-semibold text-[#8c8c8c]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                  {r.name}
                </p>
                <p className="text-[11px] text-[#8c8c8c]">
                  {r.count.toLocaleString()} · {share(r.count, totalCount)} · avg{' '}
                  {formatCurrency(avg)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-[#262626] dark:text-neutral-100">
                  {formatCurrency(r.amount)}
                </p>
                <p className="text-[10px] text-[#8c8c8c]">
                  {share(Number(r.amount), Number(totalAmount))}
                </p>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-[#8c8c8c]">No matching rows</p>
        )}
        {filtered.length > 0 && (
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
              <th className="px-3 py-2 text-right font-normal">Avg</th>
              <th className="px-3 py-2 text-right font-normal">Amount %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const avg = r.count ? Number(r.amount) / r.count : 0;
              return (
                <tr
                  key={r.name}
                  className="border-b border-[#f0f0f0] hover:bg-[#fafafa] dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-3 py-2.5 tabular-nums text-[#bfbfbf]">{i + 1}</td>
                  <td
                    className="max-w-[200px] truncate px-3 py-2.5 text-[#262626] dark:text-neutral-200"
                    title={r.name}
                  >
                    {r.name}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.count.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#8c8c8c]">
                    {share(r.count, totalCount)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(r.amount)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#595959]">
                    {formatCurrency(avg)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#8c8c8c]">
                    {share(Number(r.amount), Number(totalAmount))}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[#8c8c8c]">
                  No matching rows
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#fafafa] font-medium dark:bg-neutral-950">
              <tr className="border-t border-[#f0f0f0] dark:border-neutral-800">
                <td className="px-3 py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {totalCount.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-[#8c8c8c]">100%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatCurrency(totalAmount)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#595959]">
                  {formatCurrency(totalCount ? Number(totalAmount) / totalCount : 0)}
                </td>
                <td className="px-3 py-2.5 text-right text-[#8c8c8c]">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function RankPanel({
  title,
  rows,
  totalCount,
  totalAmount,
  empty,
  onExcel,
  exporting,
}: {
  title: string;
  rows: NamedCount[];
  totalCount: number;
  totalAmount: number;
  empty: string;
  onExcel: () => void;
  exporting?: boolean;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.count - a.count),
    [rows]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">{title}</h3>
        <Button
          variant="outline"
          className="ml-auto h-7 gap-1 px-2 text-xs"
          onClick={onExcel}
          disabled={exporting || sorted.length === 0}
        >
          {exporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Excel
        </Button>
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
                <td
                  className="max-w-[160px] truncate px-3 py-2.5 text-[#262626] dark:text-neutral-200"
                  title={r.name}
                >
                  {r.name}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.count.toLocaleString()}</td>
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

export default function ReportPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('staff');
  const [rankTab, setRankTab] = useState<RankTab>('branch');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingFull, setExportingFull] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params}` : '';
    try {
      const { data } = await api.get<ApiResponse<ReportSummary>>(`/dashboard/report${qs}`);
      setReport(data.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Report မတင်နိုင်ပါ'
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportFullExcel = async () => {
    setExportingFull(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await api.get(`/crm-history/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crm-history-export.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Excel export မအောင်မြင်ပါ');
    } finally {
      setExportingFull(false);
    }
  };

  const detailRows = useMemo(() => {
    if (!report) return [];
    if (detailTab === 'staff') return report.byStaff;
    if (detailTab === 'branch') return report.byBranch;
    if (detailTab === 'region') return report.byRegion;
    return report.byTownship ?? [];
  }, [report, detailTab]);

  const rankRows = useMemo(() => {
    if (!report) return [];
    if (rankTab === 'branch') return report.byBranch;
    if (rankTab === 'region') return report.byRegion;
    if (rankTab === 'township') return report.byTownship ?? [];
    return report.byActionType.map((r) => ({
      ...r,
      name: ACTION_TYPE_LABELS[r.name as ActionType] || r.name,
    }));
  }, [report, rankTab]);

  const detailTotalCount = useMemo(
    () => detailRows.reduce((s, r) => s + r.count, 0),
    [detailRows]
  );
  const detailTotalAmount = useMemo(
    () => detailRows.reduce((s, r) => s + Number(r.amount), 0),
    [detailRows]
  );
  const rankTotalCount = useMemo(
    () => rankRows.reduce((s, r) => s + r.count, 0),
    [rankRows]
  );
  const rankTotalAmount = useMemo(
    () => rankRows.reduce((s, r) => s + Number(r.amount), 0),
    [rankRows]
  );

  const detailTitle: Record<DetailTab, string> = {
    staff: 'Detail by Staff',
    branch: 'Detail by Branch',
    region: 'Detail by Region',
    township: 'Detail by Township',
  };

  const rankTitle: Record<RankTab, string> = {
    branch: 'Ranking by Branch',
    region: 'Ranking by Region',
    township: 'Ranking by Township',
    action: 'Ranking by Action',
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      {/* Desktop toolbar */}
      <div className="hidden shrink-0 flex-wrap items-center gap-2 border-b border-[#f0f0f0] bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div className="mr-auto min-w-0">
          <h1 className="text-[18px] font-semibold text-[#262626] dark:text-neutral-100">Report</h1>
          <p className="text-xs text-[#8c8c8c]">Detail · Ranking · Excel export</p>
        </div>
        <Input
          type="date"
          className="h-8 w-[140px]"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          className="h-8 w-[140px]"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button
          variant="outline"
          className="h-8"
          onClick={() => {
            setFrom('');
            setTo('');
          }}
        >
          Clear
        </Button>
        <Button variant="outline" className="h-8 gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button className="h-8 gap-1.5" onClick={exportFullExcel} disabled={exportingFull}>
          {exportingFull ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Excel (All)
        </Button>
      </div>

      {/* Mobile compact action bar */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-9 min-w-0 flex-1"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            className="h-9 min-w-0 flex-1"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={exportFullExcel}
            disabled={exportingFull}
            aria-label="Excel export"
          >
            {exportingFull ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
        {(from || to) && (
          <Button
            variant="outline"
            className="h-8 w-full text-xs"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            Clear dates
          </Button>
        )}
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 sm:px-5">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[#8c8c8c]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : report ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:gap-4 sm:p-5">
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#f0f0f0] bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-[10px] text-[#8c8c8c] sm:text-[11px]">Records</p>
              <p className="text-lg font-semibold tabular-nums text-[#262626] dark:text-neutral-100 sm:text-xl">
                {report.totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-[#f0f0f0] bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-[10px] text-[#8c8c8c] sm:text-[11px]">Total Amount</p>
              <p className="text-lg font-semibold tabular-nums text-[#262626] dark:text-neutral-100 sm:text-xl">
                {formatCurrency(report.totalAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-[#f0f0f0] bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-[10px] text-[#8c8c8c] sm:text-[11px]">Avg / Record</p>
              <p className="text-lg font-semibold tabular-nums text-[#262626] dark:text-neutral-100 sm:text-xl">
                {formatCurrency(
                  report.totalRecords ? Number(report.totalAmount) / report.totalRecords : 0
                )}
              </p>
            </div>
            <div className="rounded-xl border border-[#f0f0f0] bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-[10px] text-[#8c8c8c] sm:text-[11px]">Staff in report</p>
              <p className="text-lg font-semibold tabular-nums text-[#262626] dark:text-neutral-100 sm:text-xl">
                {report.byStaff.length.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Left: Detail */}
            <div className="flex min-h-0 flex-col gap-2">
              <div className="inline-flex shrink-0 flex-wrap self-start overflow-hidden rounded-lg border border-[#d9d9d9] bg-white dark:border-neutral-700 dark:bg-neutral-900">
                {(
                  [
                    ['staff', 'Staff'],
                    ['branch', 'Branch'],
                    ['region', 'Region'],
                    ['township', 'Township'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDetailTab(key)}
                    className={cn(
                      'h-8 px-3 text-sm transition-colors',
                      detailTab === key
                        ? 'bg-primary text-white'
                        : 'text-[#595959] hover:bg-[#fafafa] dark:text-neutral-300 dark:hover:bg-neutral-800'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <DetailPanel
                title={detailTitle[detailTab]}
                rows={detailRows}
                totalCount={detailTotalCount || report.totalRecords}
                totalAmount={detailTotalAmount || Number(report.totalAmount)}
                search={detailSearch}
                onSearch={setDetailSearch}
                onExcel={() =>
                  exportNamedCounts(
                    `report-detail-${detailTab}.csv`,
                    detailRows,
                    detailTotalCount || report.totalRecords,
                    detailTotalAmount || Number(report.totalAmount),
                    true
                  )
                }
              />
            </div>

            {/* Right: Ranking */}
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
              <RankPanel
                title={rankTitle[rankTab]}
                rows={rankRows}
                totalCount={rankTotalCount || report.totalRecords}
                totalAmount={rankTotalAmount || Number(report.totalAmount)}
                empty="No ranking data"
                onExcel={() =>
                  exportNamedCounts(
                    `report-ranking-${rankTab}.csv`,
                    rankRows,
                    rankTotalCount || report.totalRecords,
                    rankTotalAmount || Number(report.totalAmount),
                    false
                  )
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
