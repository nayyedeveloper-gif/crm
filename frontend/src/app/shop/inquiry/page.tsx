'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Minus, Plus, Trash2 } from 'lucide-react';
import type { ApiResponse } from '@/types';
import { cn, formatPriceMmk } from '@/lib/utils';
import { useInquiryCart } from '@/lib/inquiry-cart';
import { useShopAuth } from '@/lib/shop-auth-store';
import {
  ShopHeader,
  shopProductFrontUrl,
  useShopSettings,
  whatsappUrl,
  viberUrl,
} from '@/components/shop/shop-chrome';

const API_BASE = '/api';

export default function ShopInquiryPage() {
  const shop = useShopSettings();
  const { appName, shopWhatsapp: whatsapp, shopViber: viber, shopBrandLine } = shop;
  const hydrate = useInquiryCart((s) => s.hydrate);
  const items = useInquiryCart((s) => s.items);
  const removeItem = useInquiryCart((s) => s.removeItem);
  const setQty = useInquiryCart((s) => s.setQty);
  const clear = useInquiryCart((s) => s.clear);
  const hydrated = useInquiryCart((s) => s.hydrated);
  const hydrateAuth = useShopAuth((s) => s.hydrate);
  const authHydrated = useShopAuth((s) => s.hydrated);
  const customer = useShopAuth((s) => s.customer);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileSeeded, setProfileSeeded] = useState(false);

  useEffect(() => {
    hydrate();
    hydrateAuth();
  }, [hydrate, hydrateAuth]);

  if (authHydrated && customer && !profileSeeded) {
    setProfileSeeded(true);
    if (customer.fullName) setCustomerName(customer.fullName);
    if (customer.phone) setPhone(customer.phone);
  }

  const waHref = whatsappUrl(
    whatsapp,
    `Hello, I would like to inquire about ${items.length} item(s) from ${appName}.`
  );
  const vbHref = viberUrl(viber || whatsapp);

  async function submit() {
    setMessage('');
    setError('');
    if (!customerName.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one product to your inquiry');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/public/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          note: note.trim() || null,
          items: items.map((i) => ({
            publicCode: i.publicCode,
            productCode: i.productCode,
            name: i.name,
            category: i.category,
            price: i.price,
            qty: i.qty,
          })),
        }),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) throw new Error(body.message || 'Submit failed');
      clear();
      setNote('');
      setMessage('Inquiry sent — the shop will contact you soon.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7] text-[#1c1c1e]">
      <ShopHeader
        appName={appName}
        brandLine={shopBrandLine}
        active="inquiry"
        title="Inquiry"
        backHref="/shop"
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-4 sm:px-5">
        {shop.shopCheckoutEnabled ? (
          <Link
            href="/shop/checkout"
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f9f9fb]"
          >
            <div>
              <p className="text-[15px] font-medium">Ready to buy?</p>
              <p className="mt-0.5 text-[13px] text-[#8e8e93]">Place an order in Checkout</p>
            </div>
            <span className="text-[15px] font-medium text-[#007aff]">Checkout</span>
          </Link>
        ) : (
          <p className="px-1 text-[15px] leading-relaxed text-[#8e8e93]">
            Send selected pieces for store follow-up.
          </p>
        )}

        {message ? (
          <p className="rounded-xl bg-[#34c759]/12 px-3.5 py-3 text-center text-[14px] text-[#34c759]">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-[#ff3b30]/10 px-3.5 py-3 text-center text-[14px] text-[#ff3b30]">
            {error}
          </p>
        ) : null}

        {!hydrated ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[15px] text-[#8e8e93]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e5e5ea]">
              <MessageCircle className="h-7 w-7 text-[#8e8e93]" strokeWidth={1.75} />
            </div>
            <p className="mt-5 text-[20px] font-semibold tracking-tight">Nothing to inquire</p>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-[#8e8e93]">
              Add pieces from the collection, then send an inquiry.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#007aff] px-6 text-[15px] font-semibold text-white active:bg-[#0066d6]"
            >
              Browse collection
            </Link>
          </div>
        ) : (
          <section>
            <p className="mb-1.5 px-1 text-[13px] uppercase tracking-wide text-[#8e8e93]">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
              {items.map((item, idx) => {
                const img = shopProductFrontUrl(item.publicCode);
                return (
                  <div
                    key={item.publicCode}
                    className={cn('flex gap-3 px-3.5 py-3.5', idx > 0 && 'border-t border-[#e5e5ea]')}
                  >
                    <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#f2f2f7]">
                      {img ? (
                         
                        <img src={img} alt="" className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium">{item.name}</p>
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
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[15px] font-semibold tabular-nums">
                          {formatPriceMmk(item.price)}
                        </span>
                        <div className="inline-flex items-center rounded-full bg-[#f2f2f7] p-0.5">
                          <button
                            type="button"
                            aria-label="Decrease"
                            onClick={() => setQty(item.publicCode, Math.max(1, item.qty - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-full active:bg-white"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[1.75rem] text-center text-[15px] font-semibold tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase"
                            onClick={() => setQty(item.publicCode, item.qty + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full active:bg-white"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <p className="mb-1.5 px-1 text-[13px] uppercase tracking-wide text-[#8e8e93]">Contact</p>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
            <label className="flex items-center gap-3 px-4 py-1">
              <span className="w-[4.5rem] shrink-0 text-[15px]">Name</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#c7c7cc]"
              />
            </label>
            <label className="flex items-center gap-3 border-t border-[#e5e5ea] px-4 py-1">
              <span className="w-[4.5rem] shrink-0 text-[15px]">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09…"
                inputMode="tel"
                className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#c7c7cc]"
              />
            </label>
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

        <div className="space-y-2 pb-4">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || items.length === 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007aff] text-[17px] font-semibold text-white active:bg-[#0066d6] disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Submit inquiry
          </button>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[17px] font-semibold text-[#25d366] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
            >
              WhatsApp
            </a>
          ) : null}
          {vbHref ? (
            <a
              href={vbHref}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[17px] font-semibold text-[#7360f2] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
            >
              Viber
            </a>
          ) : null}
        </div>
      </main>
    </div>
  );
}
