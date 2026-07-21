'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { ApiResponse, ShopOrderResponse } from '@/types';
import { formatCurrency, formatDateTime, formatPriceMmk, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  ShoppingBag,
  Banknote,
  CalendarDays,
  MessageSquareHeart,
  Package,
  Truck,
  Clock,
  Trophy,
  ArrowRight,
} from 'lucide-react';

interface NamedCount {
  name: string;
  count: number;
  amount: number;
}

interface ShopBestSeller {
  publicCode: string | null;
  productCode: string | null;
  name: string;
  category: string | null;
  quantity: number;
  orderCount: number;
  amount: number;
}

interface ShopDashboardSummary {
  totalOrders: number;
  activeOrders: number;
  revenueAmount: number;
  ordersToday: number;
  revenueToday: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  pendingPayment: number;
  awaitingConfirmation: number;
  shipped: number;
  delivered: number;
  totalInquiries: number;
  newInquiries: number;
  catalogProducts: number;
  byStatus: NamedCount[];
  bestSellers: ShopBestSeller[];
  topInquiryItems: ShopBestSeller[];
  recentOrders: ShopOrderResponse[];
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

export default function ShopDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<ShopDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<ShopDashboardSummary>>('/shop-dashboard/summary');
      setSummary(data.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Shop dashboard မတင်နိုင်ပါ'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      <div className="hidden shrink-0 flex-wrap items-center gap-3 border-b border-[#f0f0f0] bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-semibold text-[#262626] dark:text-neutral-100">
            Shop Dashboard
          </h1>
          <p className="text-xs text-[#8c8c8c]">
            Orders · revenue · best sellers · inquiries
          </p>
        </div>
        <Button variant="outline" className="h-8 gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button className="h-8 gap-1.5" onClick={() => router.push('/orders')}>
          Orders
          <ArrowRight className="h-3.5 w-3.5" />
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
        <Button className="h-9 gap-1.5 px-3" onClick={() => router.push('/orders')}>
          Orders
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error && <p className="px-4 pt-3 text-sm text-red-600 sm:px-5">{error}</p>}

      {loading && !summary ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[#8c8c8c]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : summary ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:space-y-4 sm:p-5">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#f0f0f0] bg-white lg:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-900">
            <StatTile
              label="Revenue"
              value={formatCurrency(summary.revenueAmount)}
              sub={`${summary.activeOrders} active`}
              icon={Banknote}
            />
            <StatTile
              label="Orders today"
              value={String(summary.ordersToday)}
              sub={`${formatCurrency(summary.revenueToday)} MMK`}
              icon={CalendarDays}
            />
            <StatTile
              label="This month"
              value={String(summary.ordersThisMonth)}
              sub={`${formatCurrency(summary.revenueThisMonth)} MMK`}
              icon={ShoppingBag}
            />
            <StatTile
              label="Catalog"
              value={String(summary.catalogProducts)}
              sub={`${summary.newInquiries} new inquiries`}
              icon={Package}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            <MiniStat
              label="Pending pay"
              value={summary.pendingPayment}
              icon={Clock}
              onClick={() => router.push('/orders')}
            />
            <MiniStat
              label="Awaiting"
              value={summary.awaitingConfirmation}
              icon={MessageSquareHeart}
              onClick={() => router.push('/orders')}
            />
            <MiniStat
              label="Shipped"
              value={summary.shipped}
              icon={Truck}
              onClick={() => router.push('/orders')}
            />
            <MiniStat
              label="Delivered"
              value={summary.delivered}
              icon={Trophy}
              onClick={() => router.push('/orders')}
            />
          </div>

          <div className="grid min-h-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                  Best sellers
                </h3>
                <span className="text-[10px] text-[#8c8c8c] sm:text-xs">by qty</span>
              </div>
              <BestSellerTable rows={summary.bestSellers} empty="No sold items yet" showAmount />
            </section>

            <section className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                  Most inquired
                </h3>
                <span className="text-[10px] text-[#8c8c8c] sm:text-xs">inquiries</span>
              </div>
              <BestSellerTable
                rows={summary.topInquiryItems}
                empty="No inquiry items yet"
                showAmount={false}
              />
            </section>
          </div>

          <div className="grid min-h-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                  Orders by status
                </h3>
                <span className="text-[10px] text-[#8c8c8c] sm:text-xs">{summary.totalOrders} total</span>
              </div>
              <div className="divide-y divide-[#f0f0f0] dark:divide-neutral-800 md:hidden">
                {(summary.byStatus || []).map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="text-sm text-[#262626] dark:text-neutral-200">{r.name}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{r.count}</p>
                      <p className="text-[10px] text-[#8c8c8c]">{formatCurrency(r.amount)}</p>
                    </div>
                  </div>
                ))}
                {(summary.byStatus || []).length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-[#8c8c8c]">No orders yet</p>
                )}
              </div>
              <div className="hidden overflow-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
                    <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
                      <th className="px-3 py-2 text-left font-normal">Status</th>
                      <th className="px-3 py-2 text-right font-normal">Count</th>
                      <th className="px-3 py-2 text-right font-normal">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.byStatus || []).map((r) => (
                      <tr
                        key={r.name}
                        className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                      >
                        <td className="px-3 py-2.5 text-[#262626] dark:text-neutral-200">
                          {r.name}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {r.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#595959]">
                          {formatCurrency(r.amount)}
                        </td>
                      </tr>
                    ))}
                    {(summary.byStatus || []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-10 text-center text-[#8c8c8c]">
                          No orders yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                  Recent orders
                </h3>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => router.push('/orders')}
                >
                  View all
                </button>
              </div>
              <div className="divide-y divide-[#f0f0f0] dark:divide-neutral-800 md:hidden">
                {(summary.recentOrders || []).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left active:bg-[#fafafa]"
                    onClick={() => router.push('/orders')}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                        {o.orderCode}
                      </p>
                      <p className="truncate text-xs text-[#8c8c8c]">
                        {o.customerName} · {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-primary">
                        {formatPriceMmk(o.totalAmount)}
                      </p>
                      <p className="text-[10px] uppercase text-[#8c8c8c]">{o.status}</p>
                    </div>
                  </button>
                ))}
                {(summary.recentOrders || []).length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-[#8c8c8c]">No orders yet</p>
                )}
              </div>
              <div className="hidden overflow-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
                    <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
                      <th className="px-3 py-2 text-left font-normal">Order</th>
                      <th className="px-3 py-2 text-left font-normal">Customer</th>
                      <th className="px-3 py-2 text-right font-normal">Total</th>
                      <th className="px-3 py-2 text-right font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.recentOrders || []).map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                      >
                        <td className="px-3 py-2.5">
                          <p className="text-[#262626] dark:text-neutral-200">{o.orderCode}</p>
                          <p className="text-[11px] text-[#8c8c8c]">
                            {formatDateTime(o.createdAt)}
                          </p>
                        </td>
                        <td className="max-w-[140px] truncate px-3 py-2.5 text-[#595959]">
                          {o.customerName}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#262626] dark:text-neutral-200">
                          {formatPriceMmk(o.totalAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11px] text-[#8c8c8c]">
                          {o.status}
                        </td>
                      </tr>
                    ))}
                    {(summary.recentOrders || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-[#8c8c8c]">
                          No orders yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-[#f0f0f0] bg-white px-2.5 py-2.5 text-left transition active:bg-[#fafafa] sm:gap-3 sm:px-3 sm:py-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#595959] dark:bg-neutral-800">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-[#8c8c8c] sm:text-[11px]">{label}</p>
        <p className="text-base font-semibold tabular-nums text-[#262626] dark:text-neutral-100">
          {value}
        </p>
      </div>
    </button>
  );
}

function BestSellerTable({
  rows,
  empty,
  showAmount,
}: {
  rows: ShopBestSeller[];
  empty: string;
  showAmount: boolean;
}) {
  return (
    <>
      <div className="divide-y divide-[#f0f0f0] dark:divide-neutral-800 md:hidden">
        {rows.map((r, i) => (
          <div
            key={`${r.publicCode || r.productCode || r.name}-${i}`}
            className="flex items-start gap-2.5 px-3 py-2.5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[10px] font-semibold text-[#8c8c8c]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                {r.name}
              </p>
              <p className="truncate text-[11px] text-[#8c8c8c]">
                {[r.productCode, r.category].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">{r.quantity}</p>
              {showAmount ? (
                <p className="text-[10px] text-[#8c8c8c]">{formatCurrency(r.amount)}</p>
              ) : (
                <p className="text-[10px] text-[#8c8c8c]">{r.orderCount}×</p>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-[#8c8c8c]">{empty}</p>
        )}
      </div>
      <div className="hidden overflow-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
            <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
              <th className="w-10 px-3 py-2 text-left font-normal">#</th>
              <th className="px-3 py-2 text-left font-normal">Product</th>
              <th className="px-3 py-2 text-right font-normal">Qty</th>
              <th className="px-3 py-2 text-right font-normal">Times</th>
              {showAmount && (
                <th className="px-3 py-2 text-right font-normal">Amount</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.publicCode || r.productCode || r.name}-${i}`}
                className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
              >
                <td className="px-3 py-2.5 tabular-nums text-[#bfbfbf]">{i + 1}</td>
                <td className="max-w-[200px] px-3 py-2.5">
                  <p className="truncate text-[#262626] dark:text-neutral-200">{r.name}</p>
                  <p className="truncate text-[11px] text-[#8c8c8c]">
                    {[r.productCode, r.category].filter(Boolean).join(' · ') || '—'}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.quantity}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#8c8c8c]">
                  {r.orderCount}
                </td>
                {showAmount && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#595959]">
                    {formatCurrency(r.amount)}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={showAmount ? 5 : 4}
                  className="px-3 py-10 text-center text-[#8c8c8c]"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
