'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type {
  ApiResponse,
  PageResponse,
  ShopCustomerAccount,
  ShopCustomerAdminStats,
  ShopCustomerTier,
} from '@/types';
import { formatDateTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import {
  CustomerTierBadge,
  ShopUserIdentity,
  TrustBlueBadge,
} from '@/components/shop/shop-user-badges';

const TIERS: ShopCustomerTier[] = ['CUSTOMER', 'VIP', 'VVIP'];

type TierFilter = 'ALL' | ShopCustomerTier;
type BoolFilter = 'ALL' | 'true' | 'false';

export default function ShopUsersPage() {
  const [rows, setRows] = useState<ShopCustomerAccount[]>([]);
  const [stats, setStats] = useState<ShopCustomerAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [tier, setTier] = useState<TierFilter>('ALL');
  const [trusted, setTrusted] = useState<BoolFilter>('ALL');
  const [active, setActive] = useState<BoolFilter>('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selected, setSelected] = useState<ShopCustomerAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTier, setEditTier] = useState<ShopCustomerTier>('CUSTOMER');
  const [editTrusted, setEditTrusted] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [qDebounced, tier, trusted, active]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: '20',
      });
      if (qDebounced) params.set('q', qDebounced);
      if (tier !== 'ALL') params.set('tier', tier);
      if (trusted !== 'ALL') params.set('trusted', trusted);
      if (active !== 'ALL') params.set('active', active);

      const [listRes, statsRes] = await Promise.all([
        api.get<ApiResponse<PageResponse<ShopCustomerAccount>>>(`/shop-customers?${params}`),
        api.get<ApiResponse<ShopCustomerAdminStats>>('/shop-customers/stats'),
      ]);
      const pageData = listRes.data.data;
      setRows(pageData.content || []);
      setTotalPages(pageData.totalPages || 0);
      setTotalElements(pageData.totalElements || 0);
      setStats(statsRes.data.data);
    } catch {
      setError('Shop users မတင်နိုင်ပါ');
    } finally {
      setLoading(false);
    }
  }, [page, qDebounced, tier, trusted, active]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(user: ShopCustomerAccount) {
    setSelected(user);
    setEditTier(user.customerTier || 'CUSTOMER');
    setEditTrusted(!!user.trusted);
    setEditActive(user.active !== false);
    setEditNote(user.crmNote || '');
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put<ApiResponse<ShopCustomerAccount>>(
        `/shop-customers/${selected.id}`,
        {
          customerTier: editTier,
          trusted: editTrusted,
          active: editActive,
          crmNote: editNote,
        }
      );
      setSelected(data.data);
      await load();
    } catch {
      setError('Update မအောင်မြင်ပါ');
    } finally {
      setSaving(false);
    }
  }

  const summaryCards = [
    { label: 'Total', value: stats?.total ?? 0 },
    { label: 'Active', value: stats?.active ?? 0 },
    { label: 'Trusted', value: stats?.trusted ?? 0 },
    { label: 'VIP', value: stats?.vip ?? 0 },
    { label: 'VVIP', value: stats?.vvip ?? 0 },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      {/* Desktop header */}
      <div className="hidden shrink-0 items-center gap-3 border-b border-[#f0f0f0] bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#007aff]/10 text-[#007aff]">
          <Users className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-semibold text-[#262626] dark:text-neutral-100">
            Shop Users
          </h1>
          <p className="text-xs text-[#8c8c8c]">
            Google shop accounts · Trust badge · VIP / VVIP
          </p>
        </div>
        <Button type="button" variant="outline" className="h-8 gap-1.5" onClick={() => load()}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Mobile compact toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <p className="text-xs text-[#8c8c8c]">{totalElements} users</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => load()}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1200px] space-y-3 p-3 sm:space-y-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {summaryCards.map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-[#f0f0f0] bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:px-4 sm:py-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8c8c8c]">
                  {c.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#262626] dark:text-neutral-100">
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-[#f0f0f0] bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-end sm:p-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label className="text-[#595959]">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8c8c]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, email, phone"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full space-y-1.5 sm:w-40">
              <Label className="text-[#595959]">Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as TierFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All tiers</SelectItem>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'CUSTOMER' ? 'Customer' : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label className="text-[#595959]">Trust</Label>
              <Select value={trusted} onValueChange={(v) => setTrusted(v as BoolFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="true">Trusted</SelectItem>
                  <SelectItem value="false">Not trusted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label className="text-[#595959]">Status</Label>
              <Select value={active} onValueChange={(v) => setActive(v as BoolFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]">
            <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 text-xs text-[#8c8c8c] dark:border-neutral-800 sm:px-4">
                <span>{totalElements} users</span>
                <span>
                  Page {totalPages === 0 ? 0 : page + 1} / {totalPages}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-16 text-[#8c8c8c]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-16 text-center text-sm text-[#8c8c8c]">
                  Shop users မရှိသေးပါ
                </div>
              ) : (
                <ul className="divide-y divide-[#f0f0f0] dark:divide-neutral-800">
                  {rows.map((user) => {
                    const isSel = selected?.id === user.id;
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#fafafa] dark:hover:bg-neutral-800/60 sm:px-4',
                            isSel && 'bg-[#007aff]/06'
                          )}
                        >
                          { }
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[#e5e5ea]"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5e5ea] text-sm font-semibold text-[#595959]">
                              {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <ShopUserIdentity
                              name={user.fullName || 'No name'}
                              trusted={user.trusted}
                              tier={user.customerTier}
                              showCustomerTier
                              nameClassName="text-[14px] text-[#262626] dark:text-neutral-100"
                            />
                            <p className="mt-0.5 truncate text-[12px] text-[#8c8c8c]">
                              {user.email}
                              {user.phone ? ` · ${user.phone}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                'text-[11px] font-medium',
                                user.active === false ? 'text-red-500' : 'text-emerald-600'
                              )}
                            >
                              {user.active === false ? 'Disabled' : 'Active'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#8c8c8c]">
                              {user.createdAt ? formatDateTime(user.createdAt) : '—'}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center justify-between border-t border-[#f0f0f0] px-3 py-2.5 dark:border-neutral-800 sm:px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-[#f0f0f0] bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900 sm:p-4">
              {!selected ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-4 text-center text-sm text-[#8c8c8c]">
                  <BadgeCheck className="mb-2 h-8 w-8 text-[#d0d0d0]" />
                  User တစ်ဦးရွေးပြီး Trust badge / VIP သတ်မှတ်ပါ
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    { }
                    {selected.avatarUrl ? (
                      <img
                        src={selected.avatarUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-[#e5e5ea]"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e5e5ea] font-semibold text-[#595959]">
                        {(selected.fullName || selected.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[15px] font-semibold text-[#262626] dark:text-neutral-100">
                          {selected.fullName || 'No name'}
                        </p>
                        {editTrusted ? <TrustBlueBadge size="sm" /> : null}
                        <CustomerTierBadge tier={editTier} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#8c8c8c]">{selected.email}</p>
                      {selected.phone ? (
                        <p className="mt-0.5 text-xs text-[#8c8c8c]">{selected.phone}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Customer type</Label>
                    <Select
                      value={editTier}
                      onValueChange={(v) => setEditTier(v as ShopCustomerTier)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="VVIP">VVIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#f0f0f0] px-3 py-2.5 dark:border-neutral-800">
                    <input
                      type="checkbox"
                      checked={editTrusted}
                      onChange={(e) => setEditTrusted(e.target.checked)}
                      className="h-4 w-4 accent-[#1877f2]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        Trust badge <TrustBlueBadge size="sm" />
                      </p>
                      <p className="text-[11px] text-[#8c8c8c]">
                        Facebook blue mark ကဲ့သို့ အတည်ပြု badge
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#f0f0f0] px-3 py-2.5 dark:border-neutral-800">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="h-4 w-4 accent-[#007aff]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Active account</p>
                      <p className="text-[11px] text-[#8c8c8c]">
                        ပိတ်ထားရင် Google login မရပါ
                      </p>
                    </div>
                  </label>

                  <div className="space-y-1.5">
                    <Label>CRM note</Label>
                    <Textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={3}
                      placeholder="Staff notes (internal)"
                      maxLength={2000}
                    />
                  </div>

                  <div className="rounded-lg bg-[#fafafa] px-3 py-2 text-[12px] text-[#8c8c8c] dark:bg-neutral-800/50">
                    <p>Address: {selected.address || '—'}</p>
                    <p className="mt-0.5">
                      Joined: {selected.createdAt ? formatDateTime(selected.createdAt) : '—'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    className="h-10 w-full"
                    disabled={saving}
                    onClick={saveEdit}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
