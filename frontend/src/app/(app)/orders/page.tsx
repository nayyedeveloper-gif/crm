'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse, ShopOrderResponse } from '@/types';
import { formatCurrency, formatDateTime, formatPriceMmk, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Trash2 } from 'lucide-react';

const STATUSES = [
  'PENDING_PAYMENT',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

function statusBadge(status: string) {
  if (status === 'PENDING_PAYMENT') return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  if (status === 'AWAITING_CONFIRMATION') return 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
  if (status === 'CONFIRMED' || status === 'PACKING') return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
  if (status === 'SHIPPED') return 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300';
  if (status === 'DELIVERED') return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return 'bg-[#f5f5f5] text-[#595959] dark:bg-neutral-800 dark:text-neutral-300';
}

type OrderItem = {
  name?: string;
  productCode?: string;
  category?: string;
  publicCode?: string;
  price?: number | null;
  compareAtPrice?: number | null;
  qty?: number;
};

function parseItems(json: string): OrderItem[] {
  try {
    const parsed = JSON.parse(json) as OrderItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function orderTotals(items: OrderItem[]) {
  let original = 0;
  let payable = 0;
  let hasPriced = false;
  for (const i of items) {
    if (i.price == null) continue;
    hasPriced = true;
    const qty = i.qty && i.qty > 0 ? i.qty : 1;
    const unitSale = i.price;
    const unitOriginal =
      i.compareAtPrice != null && i.compareAtPrice > unitSale ? i.compareAtPrice : unitSale;
    original += unitOriginal * qty;
    payable += unitSale * qty;
  }
  return { original, payable, discount: Math.max(0, original - payable), hasPriced };
}

export default function OrdersPage() {
  const [rows, setRows] = useState<ShopOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [trackingDraft, setTrackingDraft] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<ShopOrderResponse[]>>('/orders');
      setRows(data.data || []);
    } catch {
      setError('Orders မတင်နိုင်ပါ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function update(id: number, status: string, trackingNumber?: string) {
    setUpdatingId(id);
    try {
      await api.put(`/orders/${id}/status`, {
        status,
        trackingNumber: trackingNumber ?? trackingDraft[id] ?? null,
      });
      await load();
    } catch {
      setError('Update failed');
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(id: number, orderCode: string) {
    if (!window.confirm(`Delete order ${orderCode}? This cannot be undone.`)) return;
    setUpdatingId(id);
    try {
      await api.delete(`/orders/${id}`);
      if (expandedId === id) setExpandedId(null);
      await load();
    } catch {
      setError('Delete failed');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div>
          <h1 className="text-base font-medium text-[#262626] dark:text-neutral-100">Orders</h1>
          <p className="text-xs text-[#8c8c8c]">Details · status · tracking · delete</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <p className="text-xs text-[#8c8c8c]">{rows.length} orders</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && <p className="px-4 pt-2 text-sm text-red-600 sm:px-5">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-sm text-[#8c8c8c]">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {rows.map((row) => {
              const items = parseItems(row.itemsJson);
              const totals = orderTotals(items);
              const open = expandedId === row.id;
              return (
                <article
                  key={row.id}
                  className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-4"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setExpandedId(open ? null : row.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#262626] dark:text-neutral-100">
                          {row.orderCode}
                        </p>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                            statusBadge(row.status)
                          )}
                        >
                          {row.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-[#262626] dark:text-neutral-200">
                        {row.customerName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#8c8c8c]">
                        {row.phone}
                        {row.address ? ` · ${row.address}` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#bfbfbf]">
                        {formatDateTime(row.createdAt)} · {row.paymentMethod || '—'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold tabular-nums text-primary">
                        {formatPriceMmk(row.totalAmount)}
                      </p>
                      {open ? (
                        <ChevronUp className="ml-auto mt-1 h-4 w-4 text-[#8c8c8c]" />
                      ) : (
                        <ChevronDown className="ml-auto mt-1 h-4 w-4 text-[#8c8c8c]" />
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="mt-3 space-y-3 border-t border-[#f0f0f0] pt-3 dark:border-neutral-800">
                      <div className="space-y-2 rounded-lg bg-[#fafafa] p-3 text-xs dark:bg-neutral-950">
                        <dl className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-[#8c8c8c]">Payment</dt>
                            <dd className="text-[#262626] dark:text-neutral-200">
                              {row.paymentMethod || '—'}
                              {row.paymentRef ? ` · ${row.paymentRef}` : ''}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#8c8c8c]">Tracking</dt>
                            <dd className="text-[#262626] dark:text-neutral-200">
                              {row.trackingNumber || '—'}
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-[#8c8c8c]">Address</dt>
                            <dd className="text-[#262626] dark:text-neutral-200">
                              {row.address || '—'}
                            </dd>
                          </div>
                          {row.note && (
                            <div className="sm:col-span-2">
                              <dt className="text-[#8c8c8c]">Note</dt>
                              <dd className="whitespace-pre-wrap text-[#262626] dark:text-neutral-200">
                                {row.note}
                              </dd>
                            </div>
                          )}
                        </dl>

                        <ul className="space-y-2 border-t border-[#f0f0f0] pt-3 dark:border-neutral-800">
                          {items.map((it, i) => {
                            const qty = it.qty || 1;
                            const hasOff =
                              it.price != null &&
                              it.compareAtPrice != null &&
                              it.compareAtPrice > it.price;
                            return (
                              <li
                                key={i}
                                className="flex flex-wrap items-baseline justify-between gap-2 text-[#595959] dark:text-neutral-400"
                              >
                                <span>
                                  {qty}× {it.name}
                                  {it.productCode ? ` (${it.productCode})` : ''}
                                </span>
                                <span className="text-right">
                                  {it.price != null ? formatPriceMmk(it.price) : '—'}
                                  {hasOff && (
                                    <span className="ml-1 text-[#8c8c8c] line-through">
                                      {formatCurrency(it.compareAtPrice!)}
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        {totals.hasPriced && (
                          <div className="space-y-1 border-t border-[#f0f0f0] pt-3 dark:border-neutral-800">
                            {totals.discount > 0 && (
                              <div className="flex justify-between text-emerald-600">
                                <span>Discount</span>
                                <span>−{formatPriceMmk(totals.discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium text-[#262626] dark:text-neutral-100">
                              <span>Total</span>
                              <span>{formatPriceMmk(row.totalAmount ?? totals.payable)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-[#8c8c8c]">Status</label>
                        <select
                          className="h-10 w-full rounded-lg border border-[#d9d9d9] bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                          value={row.status}
                          disabled={updatingId === row.id}
                          onChange={(e) => update(row.id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                        <label className="text-[11px] font-medium text-[#8c8c8c]">Tracking</label>
                        <div className="flex gap-2">
                          <Input
                            className="h-10 flex-1 text-sm"
                            placeholder="Tracking number"
                            value={trackingDraft[row.id] ?? row.trackingNumber ?? ''}
                            onChange={(e) =>
                              setTrackingDraft((d) => ({ ...d, [row.id]: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            className="h-10 shrink-0"
                            disabled={updatingId === row.id}
                            onClick={() => update(row.id, row.status, trackingDraft[row.id])}
                          >
                            Save
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full text-red-600 hover:text-red-700"
                          disabled={updatingId === row.id}
                          onClick={() => remove(row.id, row.orderCode)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete order
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
