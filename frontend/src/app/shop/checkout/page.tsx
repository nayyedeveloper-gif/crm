'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { ApiResponse, ShopOrderResponse } from '@/types';
import { formatCurrency, formatPriceMmk, formatShopOrderStatus, cn } from '@/lib/utils';
import { useInquiryCart } from '@/lib/inquiry-cart';
import { useShopAuth } from '@/lib/shop-auth-store';
import { useShopGuest, isGuestComplete } from '@/lib/shop-guest-store';
import {
  ShopHeader,
  ShopWhatsAppFab,
  shopProductFrontUrl,
  useShopSettings,
} from '@/components/shop/shop-chrome';

const API_BASE = '/api';

export default function ShopCheckoutPage() {
  const shop = useShopSettings();
  const hydrate = useInquiryCart((s) => s.hydrate);
  const items = useInquiryCart((s) => s.items);
  const removeItem = useInquiryCart((s) => s.removeItem);
  const setQty = useInquiryCart((s) => s.setQty);
  const clear = useInquiryCart((s) => s.clear);
  const hydrated = useInquiryCart((s) => s.hydrated);
  const hydrateAuth = useShopAuth((s) => s.hydrate);
  const authHydrated = useShopAuth((s) => s.hydrated);
  const customer = useShopAuth((s) => s.customer);
  const token = useShopAuth((s) => s.token);
  const hydrateGuest = useShopGuest((s) => s.hydrate);
  const guestHydrated = useShopGuest((s) => s.hydrated);
  const guest = useShopGuest((s) => s.guest);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<ShopOrderResponse | null>(null);
  const [profileSeeded, setProfileSeeded] = useState(false);

  const termsText = shop.shopCheckoutTerms.trim();
  const termsRequired = termsText.length > 0;
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    hydrate();
    hydrateAuth();
    hydrateGuest();
  }, [hydrate, hydrateAuth, hydrateGuest]);

  // Prefill once from Google or Guest profile (must not setState during render)
  useEffect(() => {
    if (profileSeeded || !authHydrated || !guestHydrated) return;
    if (customer) {
      setProfileSeeded(true);
      if (customer.fullName) setCustomerName(customer.fullName);
      if (customer.phone) setPhone(customer.phone);
      if (customer.address) setAddress(customer.address);
      return;
    }
    if (guest && isGuestComplete(guest)) {
      setProfileSeeded(true);
      if (guest.fullName) setCustomerName(guest.fullName);
      if (guest.phone) setPhone(guest.phone);
      if (guest.address) setAddress(guest.address);
    }
  }, [profileSeeded, authHydrated, guestHydrated, customer, guest]);

  const totals = useMemo(() => {
    let original = 0;
    let payable = 0;
    let hasPriced = false;
    for (const i of items) {
      if (i.price == null) continue;
      hasPriced = true;
      const unitSale = i.price;
      const unitOriginal =
        i.compareAtPrice != null && i.compareAtPrice > unitSale ? i.compareAtPrice : unitSale;
      original += unitOriginal * i.qty;
      payable += unitSale * i.qty;
    }
    const discount = Math.max(0, original - payable);
    return { original, payable, discount, hasPriced };
  }, [items]);

  const mmqrSrc = shop.shopMmqrImageUrl
    ? `/api${shop.shopMmqrImageUrl.startsWith('/') ? shop.shopMmqrImageUrl : `/${shop.shopMmqrImageUrl}`}`
    : null;

  const canSubmit =
    items.length > 0 &&
    customerName.trim().length > 0 &&
    phone.trim().length > 0 &&
    !(termsRequired && !agreedTerms);

  async function submit() {
    setError('');
    if (!shop.shopCheckoutEnabled) {
      setError('Checkout is currently disabled');
      return;
    }
    if (!customerName.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    if (items.length === 0) {
      setError('Add items from the collection first');
      return;
    }
    if (termsRequired && !agreedTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          note: note.trim() || null,
          paymentRef: paymentRef.trim() || null,
          items: items.map((i) => ({
            publicCode: i.publicCode,
            productCode: i.productCode,
            name: i.name,
            category: i.category,
            price: i.price,
            compareAtPrice: i.compareAtPrice ?? null,
            qty: i.qty,
          })),
        }),
      });
      const body = (await res.json()) as ApiResponse<ShopOrderResponse>;
      if (!res.ok) throw new Error(body.message || 'Checkout failed');
      clear();
      setPlaced(body.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!shop.shopCheckoutEnabled) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f2f2f7] text-[#1c1c1e]">
        <ShopHeader
          appName={shop.appName}
          brandLine={shop.shopBrandLine}
          active="checkout"
          title="Cart"
          backHref="/shop"
          showCheckout={false}
          showOrders={shop.shopOrdersEnabled}
          showFavourites={shop.shopFavouritesEnabled}
        />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e5e5ea]">
            <ShoppingBag className="h-7 w-7 text-[#8e8e93]" strokeWidth={1.75} />
          </div>
          <p className="mt-5 text-[20px] font-semibold tracking-tight">Checkout is off</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#8e8e93]">
            Enable Checkout in Settings → General to accept orders.
          </p>
          <Link
            href="/shop/inquiry"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#007aff] px-6 text-[15px] font-semibold text-white active:bg-[#0066d6]"
          >
            Use Inquiry instead
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7] text-[#1c1c1e]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="checkout"
        title={placed ? 'Confirmation' : 'Cart'}
        backHref="/shop"
        showCheckout
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main
        className={cn(
          'mx-auto w-full max-w-lg flex-1 px-4 pt-3 sm:px-5',
          !placed && items.length > 0 && 'pb-48'
        )}
      >
        {placed ? (
          <SuccessCard
            placed={placed}
            showOrders={shop.shopOrdersEnabled}
          />
        ) : !hydrated ? (
          <div className="flex items-center justify-center gap-2 py-24 text-[15px] text-[#8e8e93]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="space-y-5">
            {!token && !(guest && isGuestComplete(guest)) && (
              <Link
                href="/shop/account?next=/shop/checkout"
                className="relative z-10 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f9f9fb]"
              >
                <div>
                  <p className="text-[15px] font-medium">Sign in or continue as Guest</p>
                  <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                    Google or Guest — fill name &amp; phone once
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-semibold text-[#007aff]">Account</span>
              </Link>
            )}

            {error ? (
              <p className="rounded-xl bg-[#ff3b30]/10 px-3.5 py-3 text-[14px] text-[#ff3b30]">
                {error}
              </p>
            ) : null}

            {/* Cart items — iOS grouped list */}
            <section>
              <SectionLabel>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </SectionLabel>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
                {items.map((item, idx) => {
                  const img = shopProductFrontUrl(item.publicCode);
                  const hasDiscount =
                    item.price != null &&
                    item.compareAtPrice != null &&
                    item.compareAtPrice > item.price;
                  return (
                    <div
                      key={item.publicCode}
                      className={cn(
                        'flex gap-3 px-3.5 py-3.5',
                        idx > 0 && 'border-t border-[#e5e5ea]'
                      )}
                    >
                      <Link
                        href={`/p/${item.publicCode}`}
                        className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#e5e5ea]"
                      >
                        {img ? (
                           
                          <img src={img} alt="" className="h-full w-full object-contain" />
                        ) : null}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium leading-snug">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#8e8e93]">{item.productCode}</p>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeItem(item.publicCode)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8e8e93] active:bg-[#f2f2f7] active:text-[#ff3b30]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-[15px] font-semibold tabular-nums">
                              {formatPriceMmk(item.price)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[12px] text-[#aeaeb2] line-through tabular-nums">
                                {formatCurrency(item.compareAtPrice!)}
                              </span>
                            )}
                          </div>
                          <QtyStepper
                            value={item.qty}
                            onChange={(n) => setQty(item.publicCode, n)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Totals */}
            <section>
              <SectionLabel>Summary</SectionLabel>
              <div className="overflow-hidden rounded-2xl bg-white px-4 py-1 shadow-sm ring-1 ring-[#e5e5ea]">
                <SummaryRow
                  label="Subtotal"
                  value={
                    totals.hasPriced ? formatPriceMmk(totals.original) : 'Price on inquiry'
                  }
                />
                {totals.discount > 0 && (
                  <SummaryRow
                    label="Discount"
                    value={`−${formatPriceMmk(totals.discount)}`}
                    valueClass="text-[#34c759]"
                  />
                )}
                <SummaryRow
                  label="Total"
                  value={
                    totals.hasPriced ? formatPriceMmk(totals.payable) : 'Price on inquiry'
                  }
                  strong
                  last
                />
              </div>
            </section>

            {/* MMQR payment */}
            {shop.shopMmqrEnabled && (
              <section>
                <SectionLabel>Payment</SectionLabel>
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
                  <div className="border-b border-[#e5e5ea] px-4 py-3.5">
                    <p className="text-[15px] font-semibold">{shop.appName}</p>
                    {shop.shopBrandLine ? (
                      <p className="mt-0.5 text-[12px] tracking-wide text-[#8e8e93] uppercase">
                        {shop.shopBrandLine}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[13px] text-[#8e8e93]">
                      Scan MMQR with your banking app, then enter the payment reference below.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {['KBZPay', 'Wave Pay', 'AYA Pay', 'CB Pay'].map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-[#f2f2f7] px-2.5 py-1 text-[11px] font-medium text-[#1c1c1e]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 bg-[#fafafa] px-4 py-5">
                    {mmqrSrc ? (
                      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#e5e5ea]">
                        { }
                        <img
                          src={mmqrSrc}
                          alt="MMQR"
                          className="h-48 w-48 object-contain sm:h-52 sm:w-52"
                        />
                      </div>
                    ) : (
                      <p className="rounded-xl bg-[#fff3cd] px-3 py-2 text-center text-[13px] text-[#9a6700]">
                        MMQR is on, but no QR image uploaded yet (Settings → General).
                      </p>
                    )}
                    {totals.hasPriced ? (
                      <div className="text-center">
                        <p className="text-[12px] text-[#8e8e93]">Amount to pay</p>
                        <p className="mt-0.5 text-[20px] font-semibold tabular-nums">
                          {formatPriceMmk(totals.payable)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-center text-[13px] text-[#8e8e93]">
                        Price on inquiry — confirm amount with the shop before paying.
                      </p>
                    )}
                    {shop.shopMmqrNote ? (
                      <p className="w-full whitespace-pre-wrap rounded-xl bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#8e8e93] ring-1 ring-[#e5e5ea]">
                        {shop.shopMmqrNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            )}

            {/* Contact form — iOS inset grouped fields */}
            <section>
              <SectionLabel>Delivery & contact</SectionLabel>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
                <FieldRow
                  label="Name"
                  value={customerName}
                  onChange={setCustomerName}
                  placeholder="Full name"
                  autoComplete="name"
                />
                <FieldRow
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="09…"
                  autoComplete="tel"
                  inputMode="tel"
                />
                <label className="flex items-start gap-3 border-t border-[#e5e5ea] px-4 py-2.5">
                  <span className="w-[4.5rem] shrink-0 pt-2 text-[15px]">Address</span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, township, city"
                    rows={2}
                    className="min-w-0 flex-1 resize-none bg-transparent py-2 text-[17px] outline-none placeholder:text-[#c7c7cc]"
                  />
                </label>
                {shop.shopMmqrEnabled && (
                  <FieldRow
                    label="Ref"
                    value={paymentRef}
                    onChange={setPaymentRef}
                    placeholder="Payment ref (optional)"
                  />
                )}
                <label className="flex items-start gap-3 border-t border-[#e5e5ea] px-4 py-2.5">
                  <span className="w-[4.5rem] shrink-0 pt-2 text-[15px]">Note</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional"
                    rows={2}
                    className="min-w-0 flex-1 resize-none bg-transparent py-2 text-[17px] outline-none placeholder:text-[#c7c7cc]"
                  />
                </label>
              </div>
            </section>

            {termsRequired && (
              <section>
                <SectionLabel>Terms</SectionLabel>
                <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e5e5ea]">
                  <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-[#8e8e93]">
                    {termsText}
                  </div>
                  <label className="flex items-start gap-3 text-[15px]">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-1 h-[18px] w-[18px] accent-[#007aff]"
                    />
                    <span>I agree to the Terms &amp; Conditions</span>
                  </label>
                </div>
              </section>
            )}

            <p className="pb-2 text-center text-[12px] text-[#aeaeb2]">
              {shop.shopMmqrEnabled
                ? 'Pay with MMQR, then place your order for confirmation.'
                : 'The shop will confirm your order manually.'}
            </p>
          </div>
        )}
      </main>

      {/* Sticky place-order bar — pinned above bottom tabs */}
      {!placed && hydrated && items.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(var(--shop-nav-h)+var(--shop-safe-bottom)+0.5rem)] pt-2">
          <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] ring-1 ring-[#e5e5ea] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between px-1 text-[13px]">
              <span className="text-[#8e8e93]">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="font-semibold tabular-nums">
                {totals.hasPriced ? formatPriceMmk(totals.payable) : 'On inquiry'}
              </span>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007aff] text-[17px] font-semibold text-white active:bg-[#0066d6] disabled:opacity-40"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Place order
            </button>
          </div>
        </div>
      )}

      {(placed || items.length === 0) && (
        <ShopWhatsAppFab phone={shop.shopWhatsapp} viberPhone={shop.shopViber} />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 px-1 text-[13px] font-normal uppercase tracking-wide text-[#8e8e93]">
      {children}
    </p>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  last,
  valueClass,
}: {
  label: string;
  value: string;
  strong?: boolean;
  last?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-4 text-[15px]',
        !last && 'border-b border-[#e5e5ea]',
        strong && 'font-semibold'
      )}
    >
      <span className={cn('shrink-0', strong ? 'text-[#1c1c1e]' : 'text-[#8e8e93]')}>
        {label}
      </span>
      <span className={cn('min-w-0 text-right tabular-nums text-[#1c1c1e]', valueClass)}>
        {value}
      </span>
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="flex items-center gap-3 border-t border-[#e5e5ea] px-4 py-1 first:border-t-0">
      <span className="w-[4.5rem] shrink-0 text-[15px]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#c7c7cc]"
      />
    </label>
  );
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-[#f2f2f7] p-0.5">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#1c1c1e] active:bg-white"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.75rem] text-center text-[15px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#1c1c1e] active:bg-white"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e5e5ea]">
        <ShoppingBag className="h-7 w-7 text-[#8e8e93]" strokeWidth={1.75} />
      </div>
      <p className="mt-5 text-[20px] font-semibold tracking-tight">Your cart is empty</p>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-[#8e8e93]">
        Browse the collection and add pieces you love.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#007aff] px-6 text-[15px] font-semibold text-white active:bg-[#0066d6]"
      >
        Browse collection
      </Link>
    </div>
  );
}

function SuccessCard({
  placed,
  showOrders,
}: {
  placed: ShopOrderResponse;
  showOrders: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-1 py-8 text-center sm:py-10">
      <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[#34c759]/15">
        <CheckCircle2 className="h-10 w-10 text-[#34c759]" strokeWidth={1.75} />
      </div>
      <p className="mt-6 text-[22px] font-semibold tracking-tight text-[#1c1c1e]">Order placed</p>
      <p className="mt-2 font-mono text-[15px] tracking-wide text-[#007aff]">{placed.orderCode}</p>

      <div className="mt-8 w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-[#e5e5ea]">
        <SummaryRow label="Status" value={formatShopOrderStatus(placed.status)} />
        {placed.totalAmount != null && (
          <SummaryRow label="Total" value={formatPriceMmk(placed.totalAmount)} strong />
        )}
        <SummaryRow label="Phone" value={placed.phone} last />
      </div>

      <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-[#8e8e93]">
        Save your order code and phone to track status later.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        {showOrders && (
          <Link
            href={`/shop/orders?code=${encodeURIComponent(placed.orderCode)}&phone=${encodeURIComponent(placed.phone)}`}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[#007aff] text-[17px] font-semibold text-white active:bg-[#0066d6]"
          >
            Track this order
          </Link>
        )}
        <Link
          href="/shop"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-[17px] font-semibold text-[#007aff] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
