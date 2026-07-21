'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type {
  ApiResponse,
  BucketMeta,
  RegionPerformanceResponse,
  StaffPerformanceResponse,
  StaffPerformanceRow,
} from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  LayoutList,
  LayoutGrid,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'staff' | 'region' | 'township';

function fmt(n: number | undefined | null): string {
  if (n == null || n === 0) return '—';
  return n.toLocaleString('en-US');
}

function pct(actual: number, target: number): number | null {
  if (!target) return null;
  return Math.round((actual / target) * 100);
}

function StaffTable({
  data,
  canEdit,
  branchId,
  search,
  onSaved,
}: {
  data: StaffPerformanceResponse;
  canEdit: boolean;
  branchId: number | null;
  search: string;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, Record<string, string>> = {};
    for (const row of data.rows) {
      next[row.staffKey] = {};
      for (const meta of data.bucketMeta) {
        next[row.staffKey][meta.code] = String(row.buckets[meta.code]?.target ?? 0);
      }
    }
    setDrafts(next);
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...data.rows].sort((a, b) => b.totalActual - a.totalActual);
    if (!q) return list;
    return list.filter((r) => r.staffKey.toLowerCase().includes(q));
  }, [data.rows, search]);

  const saveRow = async (row: StaffPerformanceRow) => {
    if (!canEdit) return;
    const targets: Record<string, number> = {};
    for (const meta of data.bucketMeta) {
      targets[meta.code] = Math.max(0, parseInt(drafts[row.staffKey]?.[meta.code] ?? '0', 10) || 0);
    }
    setSavingKey(row.staffKey);
    try {
      await api.put('/performance/staff/targets', { staffKey: row.staffKey, branchId, targets });
      onSaved();
    } finally {
      setSavingKey(null);
    }
  };

  const empty = rows.length === 0;

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {rows.map((row) => {
          const p = pct(row.totalActual, row.totalTarget);
          return (
            <div
              key={row.staffKey}
              className="rounded-xl border border-[#f0f0f0] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-[15px] font-semibold text-[#262626]" title={row.staffKey}>
                  {row.staffKey}
                </p>
                <span className="shrink-0 text-sm tabular-nums text-[#8c8c8c]">
                  {p == null ? '—' : `${p}%`}
                </span>
              </div>
              <div className="mt-1.5 flex gap-3 text-sm text-[#595959]">
                <span>
                  Target <span className="font-medium tabular-nums text-[#262626]">{fmt(row.totalTarget)}</span>
                </span>
                <span>
                  Actual <span className="font-medium tabular-nums text-[#262626]">{fmt(row.totalActual)}</span>
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {data.bucketMeta.map((b) => (
                  <div
                    key={b.code}
                    className="rounded-lg bg-[#fafafa] px-2.5 py-2"
                  >
                    <p className="truncate text-[11px] text-[#8c8c8c]">{b.labelMm}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-full rounded border-[#d9d9d9] bg-white text-center text-xs shadow-none focus-visible:ring-1"
                          value={drafts[row.staffKey]?.[b.code] ?? '0'}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.staffKey]: { ...prev[row.staffKey], [b.code]: e.target.value },
                            }))
                          }
                          aria-label={`${b.labelMm} target`}
                        />
                      ) : (
                        <span className="text-xs tabular-nums text-[#8c8c8c]">
                          T {fmt(row.buckets[b.code]?.target)}
                        </span>
                      )}
                      <span className="shrink-0 text-xs tabular-nums text-[#262626]">
                        A {fmt(row.buckets[b.code]?.actual)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#d9d9d9] text-sm text-primary disabled:opacity-50"
                  disabled={savingKey === row.staffKey}
                  onClick={() => saveRow(row)}
                >
                  {savingKey === row.staffKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save targets
                </button>
              )}
            </div>
          );
        })}
        {!empty && (
          <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3.5">
            <p className="text-[13px] font-medium text-[#262626]">Total</p>
            <div className="mt-1 flex gap-3 text-sm text-[#595959]">
              <span>
                Target{' '}
                <span className="font-medium tabular-nums text-[#262626]">
                  {fmt(data.totals.totalTarget)}
                </span>
              </span>
              <span>
                Actual{' '}
                <span className="font-medium tabular-nums text-[#262626]">
                  {fmt(data.totals.totalActual)}
                </span>
              </span>
              <span className="tabular-nums text-[#8c8c8c]">
                {(() => {
                  const p = pct(data.totals.totalActual, data.totals.totalTarget);
                  return p == null ? '—' : `${p}%`;
                })()}
              </span>
            </div>
          </div>
        )}
        {empty && (
          <div className="py-16 text-center text-sm text-[#8c8c8c]">No matching staff</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full min-w-[1100px] table-fixed text-sm">
          <colgroup>
            <col style={{ width: 200 }} />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-[#fafafa]">
            <tr className="border-b border-[#f0f0f0] text-[#8c8c8c]">
              <th className="sticky left-0 z-30 bg-[#fafafa] px-4 py-3 text-left font-normal">
                Staff
              </th>
              <th className="px-2 py-3 text-right font-normal">Target</th>
              <th className="px-2 py-3 text-right font-normal">Actual</th>
              <th className="px-2 py-3 text-right font-normal">%</th>
              {data.bucketMeta.map((b) => (
                <th key={b.code} colSpan={2} className="px-1 py-3 text-center font-normal">
                  {b.labelMm}
                </th>
              ))}
              {canEdit && <th className="w-24 px-2 py-3 text-right font-normal">Target Save</th>}
            </tr>
            <tr className="border-b border-[#f0f0f0] text-[11px] text-[#bfbfbf]">
              <th className="sticky left-0 z-30 bg-[#fafafa] px-4 py-1" />
              <th />
              <th />
              <th />
              {data.bucketMeta.map((b) => (
                <Fragment key={b.code}>
                  <th className="px-1 py-1 text-center font-normal">T</th>
                  <th className="px-1 py-1 text-center font-normal">A</th>
                </Fragment>
              ))}
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const p = pct(row.totalActual, row.totalTarget);
              return (
                <tr
                  key={row.staffKey}
                  className="border-b border-[#f0f0f0] text-[#262626] transition-colors hover:bg-[#fafafa]"
                >
                  <td
                    className="sticky left-0 z-10 truncate bg-white px-4 py-3.5 font-medium"
                    title={row.staffKey}
                  >
                    {row.staffKey}
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums text-[#595959]">
                    {fmt(row.totalTarget)}
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums">{fmt(row.totalActual)}</td>
                  <td className="px-2 py-3.5 text-right tabular-nums text-[#8c8c8c]">
                    {p == null ? '—' : `${p}%`}
                  </td>
                  {data.bucketMeta.map((b) => (
                    <Fragment key={b.code}>
                      <td className="px-1 py-2 text-center">
                        {canEdit ? (
                          <Input
                            type="number"
                            min={0}
                            className="mx-auto h-8 w-[3.5rem] rounded border-[#d9d9d9] bg-white text-center text-xs shadow-none focus-visible:ring-1"
                            value={drafts[row.staffKey]?.[b.code] ?? '0'}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.staffKey]: { ...prev[row.staffKey], [b.code]: e.target.value },
                              }))
                            }
                          />
                        ) : (
                          <span className="tabular-nums text-[#8c8c8c]">
                            {fmt(row.buckets[b.code]?.target)}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums">
                        {fmt(row.buckets[b.code]?.actual)}
                      </td>
                    </Fragment>
                  ))}
                  {canEdit && (
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
                        disabled={savingKey === row.staffKey}
                        onClick={() => saveRow(row)}
                      >
                        {savingKey === row.staffKey ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-[#fafafa]">
            <tr className="border-t border-[#f0f0f0] font-medium text-[#262626]">
              <td className="sticky left-0 z-10 bg-[#fafafa] px-4 py-3">Total</td>
              <td className="px-2 py-3 text-right tabular-nums">{fmt(data.totals.totalTarget)}</td>
              <td className="px-2 py-3 text-right tabular-nums">{fmt(data.totals.totalActual)}</td>
              <td className="px-2 py-3 text-right tabular-nums text-[#8c8c8c]">
                {(() => {
                  const p = pct(data.totals.totalActual, data.totals.totalTarget);
                  return p == null ? '—' : `${p}%`;
                })()}
              </td>
              {data.bucketMeta.map((b) => (
                <Fragment key={b.code}>
                  <td className="px-1 py-3 text-center tabular-nums text-[#8c8c8c]">
                    {fmt(data.totals.buckets[b.code]?.target)}
                  </td>
                  <td className="px-1 py-3 text-center tabular-nums">
                    {fmt(data.totals.buckets[b.code]?.actual)}
                  </td>
                </Fragment>
              ))}
              {canEdit && <td />}
            </tr>
          </tfoot>
        </table>
        {empty && (
          <div className="py-16 text-center text-sm text-[#8c8c8c]">No matching staff</div>
        )}
      </div>
    </div>
  );
}

function RegionTable({
  data,
  search,
}: {
  data: RegionPerformanceResponse;
  search: string;
}) {
  const [focusedId, setFocusedId] = useState<number | null | undefined>(undefined);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = focusedId === undefined ? data.rows : data.rows.filter((r) => r.regionId === focusedId);
    if (!q) return list;
    return list.filter((r) => r.regionName.toLowerCase().includes(q));
  }, [data.rows, focusedId, search]);

  const empty = rows.length === 0;

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {rows.map((row) => {
          const open = focusedId === row.regionId;
          const hasTw = (row.townships?.length ?? 0) > 0;
          return (
            <div
              key={`${row.regionId}-${row.regionName}`}
              className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white"
            >
              <button
                type="button"
                className={cn(
                  'flex w-full items-start justify-between gap-2 p-3.5 text-left active:bg-[#fafafa]',
                  open && 'bg-blue-50'
                )}
                onClick={() =>
                  setFocusedId((prev) => (prev === row.regionId ? undefined : row.regionId))
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {hasTw ? (
                      open ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#bfbfbf]" />
                      )
                    ) : null}
                    <p className="truncate text-[15px] font-semibold text-[#262626]">
                      {row.regionName}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8c8c8c]">
                    {data.bucketMeta.map((b) => (
                      <span key={b.code}>
                        {b.labelMm}{' '}
                        <span className="tabular-nums text-[#595959]">{fmt(row.buckets[b.code])}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#262626]">
                  {fmt(row.totalActual)}
                </span>
              </button>
              {open &&
                row.townships.map((tw) => (
                  <div
                    key={`${row.regionId}-${tw.townshipId}-${tw.townshipName}`}
                    className="flex items-start justify-between gap-2 border-t border-[#f0f0f0] bg-[#fafafa] px-3.5 py-2.5 pl-9"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#595959]">{tw.townshipName}</p>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[#8c8c8c]">
                        {data.bucketMeta.map((b) => (
                          <span key={b.code}>
                            {b.labelMm}{' '}
                            <span className="tabular-nums">{fmt(tw.buckets[b.code])}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-[#595959]">
                      {fmt(tw.totalActual)}
                    </span>
                  </div>
                ))}
            </div>
          );
        })}
        {!empty && (
          <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-[#262626]">{data.totals.regionName}</p>
              <span className="text-sm font-semibold tabular-nums">{fmt(data.totals.totalActual)}</span>
            </div>
          </div>
        )}
        {empty && (
          <div className="py-16 text-center text-sm text-[#8c8c8c]">No matching regions</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="sticky top-0 z-20 bg-[#fafafa]">
            <tr className="border-b border-[#f0f0f0] text-[#8c8c8c]">
              <th className="sticky left-0 z-30 bg-[#fafafa] px-4 py-3 text-left font-normal">
                တိုင်း / ပြည်နယ်
              </th>
              <th className="px-3 py-3 text-right font-normal">Total</th>
              {data.bucketMeta.map((b: BucketMeta) => (
                <th key={b.code} className="px-2 py-3 text-center font-normal whitespace-nowrap">
                  {b.labelMm}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const open = focusedId === row.regionId;
              const hasTw = (row.townships?.length ?? 0) > 0;
              return (
                <Fragment key={`${row.regionId}-${row.regionName}`}>
                  <tr
                    className={cn(
                      'cursor-pointer border-b border-[#f0f0f0] text-[#262626] hover:bg-[#fafafa]',
                      open && 'bg-blue-50'
                    )}
                    onClick={() =>
                      setFocusedId((prev) => (prev === row.regionId ? undefined : row.regionId))
                    }
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3.5 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
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
                    <td className="px-3 py-3.5 text-right tabular-nums">{fmt(row.totalActual)}</td>
                    {data.bucketMeta.map((b) => (
                      <td key={b.code} className="px-2 py-3.5 text-center tabular-nums text-[#595959]">
                        {fmt(row.buckets[b.code])}
                      </td>
                    ))}
                  </tr>
                  {open &&
                    row.townships.map((tw) => (
                      <tr
                        key={`${row.regionId}-${tw.townshipId}-${tw.townshipName}`}
                        className="border-b border-[#f0f0f0] bg-[#fafafa] text-[#595959]"
                      >
                        <td className="sticky left-0 z-10 bg-[#fafafa] px-4 py-2.5 pl-11 whitespace-nowrap">
                          {tw.townshipName}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(tw.totalActual)}</td>
                        {data.bucketMeta.map((b) => (
                          <td key={b.code} className="px-2 py-2.5 text-center tabular-nums">
                            {fmt(tw.buckets[b.code])}
                          </td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-[#fafafa]">
            <tr className="border-t border-[#f0f0f0] font-medium text-[#262626]">
              <td className="sticky left-0 z-10 bg-[#fafafa] px-4 py-3">{data.totals.regionName}</td>
              <td className="px-3 py-3 text-right tabular-nums">{fmt(data.totals.totalActual)}</td>
              {data.bucketMeta.map((b) => (
                <td key={b.code} className="px-2 py-3 text-center tabular-nums">
                  {fmt(data.totals.buckets[b.code])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        {empty && (
          <div className="py-16 text-center text-sm text-[#8c8c8c]">No matching regions</div>
        )}
      </div>
    </div>
  );
}

function TownshipTable({
  data,
  search,
}: {
  data: RegionPerformanceResponse;
  search: string;
}) {
  const rows = useMemo(() => {
    const flat = data.rows.flatMap((region) =>
      (region.townships ?? []).map((tw) => ({
        ...tw,
        regionName: region.regionName,
        regionId: region.regionId,
      }))
    );
    const sorted = [...flat].sort((a, b) => b.totalActual - a.totalActual);
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.townshipName.toLowerCase().includes(q) ||
        r.regionName.toLowerCase().includes(q)
    );
  }, [data.rows, search]);

  const totals = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const b of data.bucketMeta) buckets[b.code] = 0;
    let totalActual = 0;
    for (const row of rows) {
      totalActual += row.totalActual;
      for (const b of data.bucketMeta) {
        buckets[b.code] += row.buckets[b.code] ?? 0;
      }
    }
    return { totalActual, buckets };
  }, [rows, data.bucketMeta]);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {rows.map((row) => (
          <div
            key={`${row.regionId}-${row.townshipId}-${row.townshipName}`}
            className="rounded-xl border border-[#f0f0f0] bg-white p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#262626]">
                  {row.townshipName}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#8c8c8c]">{row.regionName}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[#262626]">
                {fmt(row.totalActual)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8c8c8c]">
              {data.bucketMeta.map((b) => (
                <span key={b.code}>
                  {b.labelMm}{' '}
                  <span className="tabular-nums text-[#595959]">{fmt(row.buckets[b.code])}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
        {rows.length > 0 && (
          <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-[#262626]">စုစုပေါင်း</p>
                <p className="text-xs text-[#8c8c8c]">{rows.length} townships</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{fmt(totals.totalActual)}</span>
            </div>
          </div>
        )}
        {rows.length === 0 && (
          <div className="py-16 text-center text-sm text-[#8c8c8c]">No matching townships</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="sticky top-0 z-20 bg-[#fafafa]">
            <tr className="border-b border-[#f0f0f0] text-[#8c8c8c]">
              <th className="sticky left-0 z-30 bg-[#fafafa] px-4 py-3 text-left font-normal">
                မြို့နယ်
              </th>
              <th className="px-3 py-3 text-left font-normal">တိုင်း / ပြည်နယ်</th>
              <th className="px-3 py-3 text-right font-normal">Total</th>
              {data.bucketMeta.map((b: BucketMeta) => (
                <th key={b.code} className="px-2 py-3 text-center font-normal whitespace-nowrap">
                  {b.labelMm}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.regionId}-${row.townshipId}-${row.townshipName}`}
                className="border-b border-[#f0f0f0] text-[#262626] hover:bg-[#fafafa]"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3.5 font-medium whitespace-nowrap">
                  {row.townshipName}
                </td>
                <td className="px-3 py-3.5 text-[#595959] whitespace-nowrap">{row.regionName}</td>
                <td className="px-3 py-3.5 text-right tabular-nums">{fmt(row.totalActual)}</td>
                {data.bucketMeta.map((b) => (
                  <td key={b.code} className="px-2 py-3.5 text-center tabular-nums text-[#595959]">
                    {fmt(row.buckets[b.code])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-[#fafafa]">
            <tr className="border-t border-[#f0f0f0] font-medium text-[#262626]">
              <td className="sticky left-0 z-10 bg-[#fafafa] px-4 py-3">စုစုပေါင်း</td>
              <td className="px-3 py-3 text-[#8c8c8c]">{rows.length} townships</td>
              <td className="px-3 py-3 text-right tabular-nums">{fmt(totals.totalActual)}</td>
              {data.bucketMeta.map((b) => (
                <td key={b.code} className="px-2 py-3 text-center tabular-nums">
                  {fmt(totals.buckets[b.code])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && (
          <div className="py-16 text-center text-sm text-[#8c8c8c]">No matching townships</div>
        )}
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('staff');
  const [staff, setStaff] = useState<StaffPerformanceResponse | null>(null);
  const [regions, setRegions] = useState<RegionPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const branchIdParam = searchParams.get('branchId');
  const branchId = branchIdParam ? Number(branchIdParam) : null;
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', String(branchId));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params}` : '';

    try {
      const [staffRes, regionRes] = await Promise.all([
        api.get<ApiResponse<StaffPerformanceResponse>>(`/performance/staff${qs}`),
        api.get<ApiResponse<RegionPerformanceResponse>>(`/performance/regions${qs}`),
      ]);
      setStaff(staffRes.data.data);
      setRegions(regionRes.data.data);
    } catch (err: unknown) {
      setStaff(null);
      setRegions(null);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Performance data မတင်နိုင်ပါ'
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
      <div className="flex h-full w-full min-h-0 flex-col p-3 sm:px-5 sm:py-4">
        {/* Page title — desktop only (app shell shows title on mobile) */}
        <div className="mb-5 hidden shrink-0 md:block">
          <h1 className="text-[22px] font-semibold leading-tight text-[#262626]">Performance</h1>
          <p className="mt-1 text-sm text-[#8c8c8c]">
            Actual = CRM History အလိုအလျောက် စုစုပေါင်း · Staff မှာ Target သာ ဖြည့်/ပြင်နိုင် · Region သည်
            ကြည့်ရုံ (CRUD မလို)
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex shrink-0 flex-col gap-2 sm:mb-4 md:flex-row md:flex-wrap md:items-center">
          <div className="inline-flex w-full overflow-x-auto overflow-y-hidden rounded border border-[#d9d9d9] bg-white md:w-auto">
            <button
              type="button"
              onClick={() => setTab('staff')}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-sm transition-colors',
                tab === 'staff'
                  ? 'bg-primary text-white'
                  : 'text-[#595959] hover:bg-[#fafafa]'
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Staff
            </button>
            <button
              type="button"
              onClick={() => setTab('region')}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 border-l border-[#d9d9d9] px-3 text-sm transition-colors',
                tab === 'region'
                  ? 'bg-primary text-white'
                  : 'text-[#595959] hover:bg-[#fafafa]'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              တိုင်း / ပြည်နယ်
            </button>
            <button
              type="button"
              onClick={() => setTab('township')}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 border-l border-[#d9d9d9] px-3 text-sm transition-colors',
                tab === 'township'
                  ? 'bg-primary text-white'
                  : 'text-[#595959] hover:bg-[#fafafa]'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              မြို့နယ်
            </button>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
            <Input
              type="date"
              className="h-8 w-full min-w-0 flex-1 rounded border-[#d9d9d9] bg-white text-sm shadow-none sm:w-[140px] sm:flex-none"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              type="date"
              className="h-8 w-full min-w-0 flex-1 rounded border-[#d9d9d9] bg-white text-sm shadow-none sm:w-[140px] sm:flex-none"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bfbfbf]" />
              <Input
                placeholder={
                  tab === 'staff'
                    ? 'Search staff…'
                    : tab === 'region'
                      ? 'Search region…'
                      : 'Search township…'
                }
                className="h-8 w-full rounded border-[#d9d9d9] bg-white pl-8 text-sm shadow-none sm:w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 rounded border-[#d9d9d9] bg-white shadow-none"
              onClick={load}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-[#595959]', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* White content panel */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[#8c8c8c]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : tab === 'staff' ? (
            staff && staff.rows.length > 0 ? (
              <StaffTable
                data={staff}
                canEdit={!!canEdit}
                branchId={branchId}
                search={search}
                onSaved={load}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[#8c8c8c]">
                Staff data မရှိသေးပါ
              </div>
            )
          ) : tab === 'region' ? (
            regions && regions.rows.length > 0 ? (
              <RegionTable data={regions} search={search} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[#8c8c8c]">
                Region data မရှိသေးပါ
              </div>
            )
          ) : regions && regions.rows.some((r) => (r.townships?.length ?? 0) > 0) ? (
            <TownshipTable data={regions} search={search} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[#8c8c8c]">
              Township data မရှိသေးပါ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
