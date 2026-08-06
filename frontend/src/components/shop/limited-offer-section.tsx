'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { PublicProductSummary } from '@/types';
import { discountPercent, formatCurrency, formatPriceMmk } from '@/lib/utils';
import { shopImageUrl, type ShopCopy } from '@/components/shop/shop-chrome';

function useCountdown(endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return useMemo(() => {
    if (!endsAt) return null;
    const end = new Date(endsAt).getTime();
    const diff = Math.max(0, end - now);
    const totalSec = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      minutes: Math.floor((totalSec % 3600) / 60),
      seconds: totalSec % 60,
      expired: diff <= 0,
    };
  }, [endsAt, now]);
}

function Countdown({ endsAt }: { endsAt: string | null | undefined }) {
  const c = useCountdown(endsAt);
  if (!c || c.expired) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const cells = [
    c.days > 0 ? { label: 'D', value: pad(c.days) } : null,
    { label: 'H', value: pad(c.hours) },
    { label: 'M', value: pad(c.minutes) },
    { label: 'S', value: pad(c.seconds) },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex items-baseline gap-3 font-mono text-[#1c1c1e]">
      {cells.map((cell, i) => (
        <span key={cell.label} className="inline-flex items-baseline gap-1">
          {i > 0 && <span className="text-[#8e8e93]">:</span>}
          <span key={cell.value} className="text-2xl tracking-wider tabular-nums sm:text-3xl">
            {cell.value}
          </span>
          <span className="text-[10px] tracking-widest text-[#8e8e93]">{cell.label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Clean jewellery launch layout:
 * full-bleed product image + editorial copy panel.
 * Copy comes from settings / product — nothing hardcoded for marketing text.
 */
export function LimitedOfferSection({
  products,
  copy,
}: {
  products: PublicProductSummary[];
  copy: ShopCopy;
}) {
  if (!products.length) return null;
  const hero = products[0];
  const rest = products.slice(1, 4);
  const img = shopImageUrl(
    hero.offerImageUrl || hero.imageUrl,
    hero.updatedAt || hero.publicCode
  );
  const off = discountPercent(hero.price, hero.compareAtPrice);
  const offerTitle = hero.offerHeadline?.trim() || copy.shopOfferBadge || hero.name;

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="grid lg:grid-cols-2">
        <Link
          href={`/p/${hero.publicCode}`}
          className="group relative aspect-[4/5] w-full overflow-hidden bg-[#e5e5ea] sm:aspect-[16/11] lg:aspect-auto lg:min-h-[420px]"
        >
          {img ? (
             
            <img
              src={img}
              alt={hero.name}
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-[#e5e5ea]" />
          )}
          {off != null && (
            <span className="absolute left-3 top-3 rounded-full bg-[#ff3b30] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm sm:left-5 sm:top-5 sm:px-3 sm:py-1 sm:text-xs">
              −{off}%
            </span>
          )}
        </Link>

        <div className="relative flex flex-col justify-center border-t border-[#e5e5ea] bg-[#f2f2f7] px-4 py-8 sm:px-8 sm:py-12 lg:border-t-0 lg:border-l lg:px-12">
          <div className="relative space-y-4 sm:space-y-5">
            {(copy.shopOfferBadge || offerTitle) && (
              <div className="space-y-1.5">
                {copy.shopOfferBadge ? (
                  <p className="text-[10px] tracking-[0.28em] text-[#007aff] uppercase sm:text-[11px]">
                    {copy.shopOfferBadge}
                  </p>
                ) : null}
                <h2 className="text-2xl font-semibold tracking-tight text-[#1c1c1e] sm:text-3xl lg:text-4xl">
                  {hero.name}
                </h2>
                {hero.offerHeadline && hero.offerHeadline !== hero.name ? (
                  <p className="text-xs tracking-[0.12em] text-[#8e8e93] uppercase sm:text-sm">
                    {hero.offerHeadline}
                  </p>
                ) : (
                  <p className="text-xs tracking-[0.12em] text-[#8e8e93] uppercase sm:text-sm">
                    {hero.category}
                    {hero.metalPurity ? ` · ${hero.metalPurity}` : ''}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
              <p className="text-xl text-[#1c1c1e] sm:text-2xl">{formatPriceMmk(hero.price)}</p>
              {off != null && hero.compareAtPrice != null && (
                <p className="text-xs text-[#8e8e93] line-through sm:text-sm">
                  {formatCurrency(hero.compareAtPrice)} MMK
                </p>
              )}
            </div>

            {hero.offerEndsAt && (
              <div>
                <Countdown endsAt={hero.offerEndsAt} />
              </div>
            )}

            {copy.shopOfferBlurb ? (
              <p className="max-w-md text-[13px] leading-relaxed text-[#8e8e93] sm:text-sm">
                {copy.shopOfferBlurb}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1 sm:gap-3">
              <Link
                href={`/p/${hero.publicCode}`}
                className="inline-flex h-10 items-center rounded-full bg-[#007aff] px-5 text-sm font-semibold text-white transition hover:bg-[#0066d6] sm:h-11 sm:px-6"
              >
                {copy.shopOfferCta}
              </Link>
              <Link
                href="#collection"
                className="inline-flex h-10 items-center rounded-full border border-[#e5e5ea] bg-white px-4 text-sm text-[#007aff] transition hover:bg-[#f2f2f7] sm:h-11 sm:px-5"
              >
                {copy.shopCollectionCta}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="border-t border-[#e5e5ea] bg-[#f2f2f7] px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto grid max-w-6xl gap-2 sm:grid-cols-3 sm:gap-3">
            {rest.map((p) => {
              const thumb = shopImageUrl(p.imageUrl, p.updatedAt || p.publicCode);
              const pct = discountPercent(p.price, p.compareAtPrice);
              return (
                <Link
                  key={p.publicCode}
                  href={`/p/${p.publicCode}`}
                  className="group flex gap-3 rounded-xl border border-[#e5e5ea] bg-white p-2 transition hover:border-[#007aff]/40"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#e5e5ea]">
                    {thumb ? (
                       
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="truncate text-sm text-[#1c1c1e]">{p.name}</p>
                    <p className="mt-1 text-sm text-[#1c1c1e]">{formatPriceMmk(p.price)}</p>
                    {pct != null && (
                      <p className="mt-0.5 text-[11px] text-[#ff3b30]">−{pct}%</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
