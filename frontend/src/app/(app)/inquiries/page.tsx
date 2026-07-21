'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { ApiResponse, ShopInquiryResponse } from '@/types';
import { formatCurrency, formatDateTime, formatPriceMmk, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Trash2,
} from 'lucide-react';

const STATUSES = ['NEW', 'CONTACTED', 'CLOSED'] as const;
type StatusFilter = 'ALL' | (typeof STATUSES)[number];

type InquiryItem = {
  publicCode?: string;
  productCode?: string;
  name?: string;
  category?: string;
  price?: number | null;
  compareAtPrice?: number | null;
  qty?: number;
  imageUrl?: string | null;
};

function parseItems(json: string): InquiryItem[] {
  try {
    const parsed = JSON.parse(json) as InquiryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusClass(status: string) {
  if (status === 'NEW') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  if (status === 'CONTACTED') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('0') ? `95${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export default function InquiriesPage() {
  const [rows, setRows] = useState<ShopInquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<ShopInquiryResponse[]>>('/inquiries');
      setRows(data.data || []);
    } catch {
      setError('Inquiries မတင်နိုင်ပါ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { ALL: rows.length, NEW: 0, CONTACTED: 0, CLOSED: 0 };
    for (const r of rows) {
      if (r.status === 'NEW') c.NEW += 1;
      else if (r.status === 'CONTACTED') c.CONTACTED += 1;
      else if (r.status === 'CLOSED') c.CLOSED += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  async function setStatus(id: number, status: string) {
    setUpdatingId(id);
    try {
      await api.put(`/inquiries/${id}/status`, { status });
      await load();
    } catch {
      setError('Status update failed');
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`Delete inquiry #${id} from ${name}? This cannot be undone.`)) return;
    setUpdatingId(id);
    try {
      await api.delete(`/inquiries/${id}`);
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
      <div className="hidden shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div>
          <h1 className="text-base font-medium text-[#262626] dark:text-neutral-100">
            Shop Inquiries
          </h1>
          <p className="text-xs text-[#8c8c8c]">
            Customer requests · contact · status · item details
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <p className="text-xs text-[#8c8c8c]">
          {counts.NEW > 0 ? `${counts.NEW} new · ` : ''}
          {rows.length} total
        </p>
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

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[#f0f0f0] bg-white px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-neutral-800 dark:bg-neutral-900 sm:px-4 [&::-webkit-scrollbar]:hidden">
        {(['ALL', ...STATUSES] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition',
              filter === s
                ? 'bg-primary text-white'
                : 'bg-[#f5f5f5] text-[#595959] dark:bg-neutral-800 dark:text-neutral-400'
            )}
          >
            {s === 'ALL' ? 'All' : s}
            <span
              className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]',
                filter === s
                  ? 'bg-white/20 text-white'
                  : s === 'NEW' && counts.NEW > 0
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-[#8c8c8c] dark:bg-neutral-900'
              )}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="px-4 pt-2 text-sm text-red-600 sm:px-5">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <MessageCircle className="mx-auto h-8 w-8 text-[#d9d9d9]" />
            <p className="mt-3 text-sm text-[#8c8c8c]">
              {filter === 'ALL' ? 'No inquiries yet' : `No ${filter} inquiries`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {filtered.map((row) => {
              const items = parseItems(row.itemsJson);
              const open = expandedId === row.id;
              const itemCount = items.reduce((s, i) => s + (i.qty || 1), 0);
              const wa = whatsappHref(row.phone);
              return (
                <article
                  key={row.id}
                  className={cn(
                    'rounded-xl border bg-white p-3.5 dark:bg-neutral-900 sm:p-4',
                    row.status === 'NEW'
                      ? 'border-red-200 dark:border-red-900/50'
                      : 'border-[#f0f0f0] dark:border-neutral-800'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#262626] dark:text-neutral-100">
                          {row.customerName}
                        </p>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                            statusClass(row.status)
                          )}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-[#595959] dark:text-neutral-400">
                        {row.phone}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8c8c8c]">
                        #{row.id} · {formatDateTime(row.createdAt)} · {itemCount} item
                        {itemCount === 1 ? '' : 's'}
                      </p>
                      {row.note && !open && (
                        <p className="mt-2 line-clamp-2 text-xs text-[#595959] dark:text-neutral-400">
                          {row.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <a
                      href={`tel:${row.phone}`}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d9d9d9] text-xs font-medium text-[#595959] active:bg-[#fafafa] dark:border-neutral-700"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </a>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 text-xs font-medium text-emerald-700 active:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                  </div>

                  <ul className="mt-3 space-y-1.5 border-t border-[#f0f0f0] pt-3 dark:border-neutral-800">
                    {items.slice(0, open ? items.length : 2).map((item, i) => {
                      const hasOff =
                        item.price != null &&
                        item.compareAtPrice != null &&
                        item.compareAtPrice > item.price;
                      return (
                        <li
                          key={`${item.publicCode}-${i}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                        >
                          <span className="text-[#262626] dark:text-neutral-200">
                            {item.name || item.productCode || 'Item'}
                            <span className="text-[#8c8c8c]">
                              {' '}
                              × {item.qty ?? 1}
                            </span>
                          </span>
                          <span className="text-right text-xs text-[#8c8c8c]">
                            {formatPriceMmk(item.price ?? null)}
                            {hasOff && (
                              <span className="ml-1 line-through">
                                {formatCurrency(item.compareAtPrice!)}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                    {!open && items.length > 2 && (
                      <li className="text-xs text-[#8c8c8c]">
                        +{items.length - 2} more
                      </li>
                    )}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 min-w-0 flex-1 rounded-lg border border-[#d9d9d9] bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-950"
                      value={row.status}
                      disabled={updatingId === row.id}
                      onChange={(e) => setStatus(row.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() => setExpandedId(open ? null : row.id)}
                    >
                      {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {open ? 'Less' : 'More'}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 text-red-600 hover:text-red-700"
                      disabled={updatingId === row.id}
                      onClick={() => remove(row.id, row.customerName)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {open && (
                    <div className="mt-3 space-y-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950">
                      <div>
                        <p className="text-[#8c8c8c]">Customer note</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-[#262626] dark:text-neutral-200">
                          {row.note || '—'}
                        </p>
                      </div>
                      <div className="space-y-2 border-t border-[#f0f0f0] pt-3 dark:border-neutral-800">
                        <p className="font-medium text-[#262626] dark:text-neutral-100">
                          Pieces ({items.length})
                        </p>
                        {items.map((item, i) => (
                          <div
                            key={`detail-${item.publicCode}-${i}`}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#f0f0f0] bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900"
                          >
                            <div>
                              <p className="text-sm text-[#262626] dark:text-neutral-100">
                                {item.name || 'Item'}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#8c8c8c]">
                                {[item.productCode, item.category, `qty ${item.qty ?? 1}`]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                              {item.publicCode && (
                                <Link
                                  href={`/p/${item.publicCode}`}
                                  target="_blank"
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary"
                                >
                                  Open on shop
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <p className="text-sm text-[#262626] dark:text-neutral-100">
                              {formatPriceMmk(item.price ?? null)}
                            </p>
                          </div>
                        ))}
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
