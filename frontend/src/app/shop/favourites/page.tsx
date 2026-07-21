'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { Heart, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn, formatPriceMmk } from '@/lib/utils';
import { useInquiryCart } from '@/lib/inquiry-cart';
import { useShopFavourites } from '@/lib/shop-favourites';
import { ShopHeader, shopProductFrontUrl, useShopSettings } from '@/components/shop/shop-chrome';

export default function ShopFavouritesPage() {
  const shop = useShopSettings();
  const hydrateFav = useShopFavourites((s) => s.hydrate);
  const items = useShopFavourites((s) => s.items);
  const hydrated = useShopFavourites((s) => s.hydrated);
  const remove = useShopFavourites((s) => s.remove);
  const clear = useShopFavourites((s) => s.clear);
  const addItem = useInquiryCart((s) => s.addItem);

  useEffect(() => {
    hydrateFav();
  }, [hydrateFav]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7] text-[#1c1c1e]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="favourites"
        title="Saved"
        backHref="/shop"
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 sm:px-5">
        {!shop.shopFavouritesEnabled ? (
          <EmptyBlock
            icon={<Heart className="h-7 w-7 text-[#8e8e93]" strokeWidth={1.75} />}
            title="Favourites is off"
            body="Enable Favourites in Settings → General to save pieces you love."
            ctaHref="/shop"
            ctaLabel="Back to shop"
          />
        ) : !hydrated ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[15px] text-[#8e8e93]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <EmptyBlock
            icon={<Heart className="h-7 w-7 text-[#8e8e93]" strokeWidth={1.75} />}
            title="No favourites yet"
            body="Tap the heart on any piece to save it here."
            ctaHref="/shop"
            ctaLabel="Browse collection"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[13px] uppercase tracking-wide text-[#8e8e93]">
                {items.length} saved
              </p>
              <button
                type="button"
                onClick={clear}
                className="text-[13px] text-[#ff3b30] active:opacity-60"
              >
                Clear all
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
              {items.map((item, idx) => {
                const img = shopProductFrontUrl(item.publicCode);
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
                      className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#f2f2f7]"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-contain" />
                      ) : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/p/${item.publicCode}`} className="min-w-0">
                          <p className="truncate text-[15px] font-medium">{item.name}</p>
                          <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                            {item.productCode} · {formatPriceMmk(item.price)}
                          </p>
                        </Link>
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => remove(item.publicCode)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8e8e93] active:bg-[#f2f2f7] active:text-[#ff3b30]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          addItem({
                            publicCode: item.publicCode,
                            productCode: item.productCode,
                            name: item.name,
                            category: item.category,
                            price: item.price,
                            compareAtPrice: item.compareAtPrice,
                            imageUrl: item.imageUrl,
                          })
                        }
                        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#007aff] px-3 text-[13px] font-semibold text-white active:bg-[#0066d6]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add to cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e5e5ea]">
        {icon}
      </div>
      <p className="mt-5 text-[20px] font-semibold tracking-tight">{title}</p>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-[#8e8e93]">{body}</p>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#007aff] px-6 text-[15px] font-semibold text-white active:bg-[#0066d6]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
