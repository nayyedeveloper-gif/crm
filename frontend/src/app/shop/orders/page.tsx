'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Package } from 'lucide-react';
import type { ApiResponse, ShopOrderResponse } from '@/types';
import { formatPriceMmk, formatDateTime, formatShopOrderStatus } from '@/lib/utils';
import { ShopHeader, useShopSettings } from '@/components/shop/shop-chrome';

const API_BASE = '/api';

function TrackForm() {
  const shop = useShopSettings();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<ShopOrderResponse | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    if (!shop.settingsReady || autoTried) return;
    const c = searchParams.get('code');
    const p = searchParams.get('phone');
    if (c && p) {
      setAutoTried(true);
      void lookup(c, p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.settingsReady]);

  async function lookup(orderCode = code, orderPhone = phone) {
    setError('');
    setOrder(null);
    if (!shop.settingsReady) return;
    if (!shop.shopOrdersEnabled) {
      setError('Order tracking is disabled');
      return;
    }
    if (!orderCode.trim() || !orderPhone.trim()) {
      setError('Order code and phone are required');
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        code: orderCode.trim(),
        phone: orderPhone.trim(),
      });
      const res = await fetch(`${API_BASE}/public/orders/track?${qs}`, { cache: 'no-store' });
      const body = (await res.json()) as ApiResponse<ShopOrderResponse>;
      if (!res.ok) throw new Error(body.message || 'Not found');
      setOrder(body.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Not found');
    } finally {
      setLoading(false);
    }
  }

  if (!shop.settingsReady) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[15px] text-[#8e8e93]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!shop.shopOrdersEnabled) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e5e5ea]">
          <Package className="h-7 w-7 text-[#8e8e93]" strokeWidth={1.75} />
        </div>
        <p className="mt-5 text-[20px] font-semibold tracking-tight">Tracking is off</p>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-[#8e8e93]">
          Enable Orders in Settings → General to let customers track delivery.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#007aff] px-6 text-[15px] font-semibold text-white active:bg-[#0066d6]"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <p className="px-1 text-[15px] leading-relaxed text-[#8e8e93]">
        Enter your order code and phone to check status.
      </p>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
        <label className="flex items-center gap-3 px-4 py-1">
          <span className="w-14 shrink-0 text-[15px]">Code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ORD-XXXXXXXX"
            autoCapitalize="characters"
            className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#c7c7cc]"
          />
        </label>
        <label className="flex items-center gap-3 border-t border-[#e5e5ea] px-4 py-1">
          <span className="w-14 shrink-0 text-[15px]">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09…"
            inputMode="tel"
            autoComplete="tel"
            className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#c7c7cc]"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => lookup()}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007aff] text-[17px] font-semibold text-white active:bg-[#0066d6] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Track order
      </button>

      {error ? (
        <p className="rounded-xl bg-[#ff3b30]/10 px-3.5 py-3 text-center text-[14px] text-[#ff3b30]">
          {error}
        </p>
      ) : null}

      {order ? (
        <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
          <div className="flex items-start justify-between gap-3 border-b border-[#e5e5ea] px-4 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[15px] font-semibold text-[#007aff]">{order.orderCode}</p>
              <p className="mt-0.5 text-[12px] text-[#8e8e93]">{formatDateTime(order.createdAt)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#007aff]/10 px-2.5 py-1 text-[12px] font-medium text-[#007aff]">
              {formatShopOrderStatus(order.status)}
            </span>
          </div>
          <Row label="Name" value={order.customerName} />
          <Row label="Phone" value={order.phone} />
          <Row label="Total" value={formatPriceMmk(order.totalAmount)} strong />
          {order.trackingNumber ? <Row label="Tracking" value={order.trackingNumber} /> : null}
          {order.paymentMethod ? (
            <Row
              label="Payment"
              value={`${order.paymentMethod}${order.paymentRef ? ` · ${order.paymentRef}` : ''}`}
              last
            />
          ) : (
            <div className="h-1" />
          )}
        </article>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  last,
}: {
  label: string;
  value: string;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 text-[15px] ${
        !last ? 'border-b border-[#e5e5ea]' : ''
      }`}
    >
      <span className="text-[#8e8e93]">{label}</span>
      <span className={`min-w-0 text-right tabular-nums ${strong ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function ShopOrdersPage() {
  const shop = useShopSettings();

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7] text-[#1c1c1e]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="orders"
        title="Orders"
        backHref="/shop"
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />
      <main className="flex-1 px-4 py-4 sm:px-5">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-16 text-[15px] text-[#8e8e93]">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          }
        >
          <TrackForm />
        </Suspense>
      </main>
    </div>
  );
}
