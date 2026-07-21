'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Copy, Loader2, X, ZoomIn, Plus } from 'lucide-react';
import { cn, formatPriceMmk, discountPercent, formatCurrency } from '@/lib/utils';
import type { ApiResponse, PublicProductResponse, PublicProductSummary } from '@/types';
import { PRODUCT_IMAGE_SLOTS } from '@/types';
import {
  ShopHeader,
  ShopWhatsAppFab,
  shopImageUrl,
  shopProductFrontPath,
  useShopSettings,
  whatsappUrl,
  viberUrl,
} from '@/components/shop/shop-chrome';
import { useInquiryCart } from '@/lib/inquiry-cart';
import { FavouriteButton } from '@/components/shop/favourite-button';
import {
  jewelleryKind,
  jewelleryKindLabel,
  jewellerySpecRows,
} from '@/lib/jewellery-specs';

export default function PublicProductPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const shop = useShopSettings();
  const fallbackAppName = shop.appName;
  const addItem = useInquiryCart((s) => s.addItem);
  const [product, setProduct] = useState<PublicProductResponse | null>(null);
  const [related, setRelated] = useState<PublicProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [copied, setCopied] = useState(false);
  const [brokenImgs, setBrokenImgs] = useState<Record<string, boolean>>({});

  const API_BASE = '/api';

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/public/products/${encodeURIComponent(code)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Product not found' : 'Failed to load product');
      }
      const body = (await res.json()) as ApiResponse<PublicProductResponse>;
      setProduct(body.data);
      setActiveImg(0);
      setBrokenImgs({});
      const rel = await fetch(
        `${API_BASE}/public/products/${encodeURIComponent(code)}/related`,
        { cache: 'no-store' }
      );
      if (rel.ok) {
        const relBody = (await rel.json()) as ApiResponse<PublicProductSummary[]>;
        setRelated(relBody.data || []);
      } else {
        setRelated([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setProduct(null);
      setRelated([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const gallery = useMemo(() => {
    if (!product) return [];
    return PRODUCT_IMAGE_SLOTS.map((slot) => {
      const path = product.images?.[slot.key] ?? null;
      const src = shopImageUrl(path, `${product.publicCode}-${slot.key}-${product.updatedAt || ''}`);
      return {
        key: slot.key,
        label: slot.label,
        src,
      };
    }).filter((g) => g.src && !brokenImgs[g.key]);
  }, [product, brokenImgs]);

  useEffect(() => {
    if (activeImg >= gallery.length) setActiveImg(0);
  }, [gallery.length, activeImg]);

  const appName = product?.appName || fallbackAppName;
  const off = product ? discountPercent(product.price, product.compareAtPrice) : null;
  const kind = product ? jewelleryKind(product.category) : 'other';
  const specRows = product ? jewellerySpecRows(product) : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f2f7] text-sm text-[#8e8e93]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading product…
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f2f2f7]">
        <ShopHeader
          appName={appName}
          brandLine={shop.shopBrandLine}
          active="product"
          title="Product"
          backHref="/shop"
          showCheckout={shop.shopCheckoutEnabled}
          showOrders={shop.shopOrdersEnabled}
          showFavourites={shop.shopFavouritesEnabled}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-base font-medium text-[#1c1c1e]">Product unavailable</p>
          <p className="text-sm text-[#8e8e93]">{error || 'Not found'}</p>
          <Link href="/shop" className="text-sm text-[#007aff] hover:underline">
            Back to collection
          </Link>
        </div>
      </div>
    );
  }

  const mainSrc = gallery[activeImg]?.src;

  return (
    <div className="flex min-h-screen flex-col bg-[#f2f2f7] text-[#1c1c1e]">
      <ShopHeader
        appName={appName}
        brandLine={shop.shopBrandLine}
        active="product"
        title={product.name}
        backHref="/shop"
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main className="shop-content flex-1 py-5 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <button
              type="button"
              disabled={!mainSrc}
              onClick={() =>
                mainSrc &&
                setZoom({ src: mainSrc, label: gallery[activeImg]?.label || product.name })
              }
              className="group relative aspect-square w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-white"
            >
              {mainSrc ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainSrc}
                    alt={product.name}
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.01]"
                    onError={() => {
                      const key = gallery[activeImg]?.key;
                      if (key) {
                        setBrokenImgs((m) => ({ ...m, [key]: true }));
                        setActiveImg(0);
                      }
                    }}
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-[#8e8e93] shadow-sm">
                    <ZoomIn className="h-4 w-4" />
                  </span>
                  {gallery[activeImg]?.label && (
                    <span className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-0.5 text-[10px] tracking-wide text-[#8e8e93] uppercase shadow-sm">
                      {gallery[activeImg].label}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center bg-[#e5e5ea] text-sm text-[#8e8e93]">
                  No photos
                </div>
              )}
            </button>
            {gallery.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {gallery.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      'group/thumb relative aspect-square overflow-hidden rounded-lg border bg-white',
                      i === activeImg ? 'border-[#007aff]' : 'border-[#e5e5ea]'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src!}
                      alt={item.label}
                      className="h-full w-full object-contain"
                      onError={() => setBrokenImgs((m) => ({ ...m, [item.key]: true }))}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-white/90 py-0.5 text-center text-[9px] tracking-wide text-[#8e8e93] uppercase">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[#8e8e93]">
              {gallery.length} of 4 photo slots
              {gallery.length < 4
                ? ' — add Front / Back / Side / Other in Products admin'
                : ''}
            </p>
          </section>

          <section className="flex flex-col justify-center space-y-5 lg:py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs tracking-[0.2em] text-[#8e8e93] uppercase">
                  {product.category}
                </p>
                {kind !== 'other' && (
                  <span className="rounded border border-[#e5e5ea] bg-white px-1.5 py-0.5 text-[10px] tracking-wide text-[#8e8e93] uppercase">
                    {jewelleryKindLabel(kind)}
                  </span>
                )}
              </div>
              {product.specialOffer && (
                <p className="mt-2 inline-flex items-center gap-2 text-[11px] tracking-[0.22em] text-[#8e8e93] uppercase">
                  <span className="rounded-full bg-[#ff3b30] px-2 py-0.5 font-semibold text-white">
                    Special
                  </span>
                  {product.offerHeadline || 'Limited Time Offer'}
                </p>
              )}
              {product.productCode && (
                <p className="mt-2 text-sm text-[#8e8e93]">{product.productCode}</p>
              )}
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {product.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <p className="text-xl text-[#1c1c1e]">{formatPriceMmk(product.price)}</p>
                {off != null && product.compareAtPrice != null && (
                  <>
                    <p className="text-sm text-[#8e8e93] line-through">
                      {formatCurrency(product.compareAtPrice)} MMK
                    </p>
                    <span className="rounded bg-[#ff3b30] px-2 py-0.5 text-xs font-medium text-white">
                      −{off}%
                    </span>
                  </>
                )}
              </div>
            </div>
            {specRows.length > 0 && (
              <div className="shop-card p-3 shadow-sm">
                <p className="mb-2 text-[11px] tracking-[0.18em] text-[#8e8e93] uppercase">
                  {jewelleryKindLabel(kind)} details
                </p>
                <dl
                  className={cn(
                    'grid gap-3 text-sm',
                    specRows.length === 1
                      ? 'grid-cols-1'
                      : specRows.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                  )}
                >
                  {specRows.map((row) => (
                    <div key={row.key}>
                      <dt className="text-[11px] text-[#8e8e93]">{row.label}</dt>
                      <dd
                        className={cn(
                          'mt-0.5',
                          row.emphasize ? 'text-base font-medium text-[#1c1c1e]' : 'text-[#1c1c1e]'
                        )}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {product.description && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#8e8e93]">
                {product.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  addItem({
                    publicCode: product.publicCode,
                    productCode: product.productCode,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    compareAtPrice: product.compareAtPrice,
                    imageUrl: shopProductFrontPath(product.publicCode),
                  })
                }
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#007aff] px-4 text-sm font-semibold text-white transition hover:bg-[#0066d6]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to cart
              </button>
              {shop.shopFavouritesEnabled && (
                <FavouriteButton
                  item={{
                    publicCode: product.publicCode,
                    productCode: product.productCode,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    compareAtPrice: product.compareAtPrice,
                    imageUrl: shopProductFrontPath(product.publicCode),
                  }}
                />
              )}
              {whatsappUrl(
                product.shopWhatsapp,
                `Hello, I am interested in ${product.name} (${product.productCode})`
              ) && (
                <a
                  href={
                    whatsappUrl(
                      product.shopWhatsapp,
                      `Hello, I am interested in ${product.name} (${product.productCode})`
                    )!
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-full border border-emerald-500/40 px-4 text-sm text-emerald-600 transition hover:bg-emerald-50"
                >
                  WhatsApp
                </a>
              )}
              {viberUrl(product.shopViber || product.shopWhatsapp) && (
                <a
                  href={viberUrl(product.shopViber || product.shopWhatsapp)!}
                  className="inline-flex h-10 items-center rounded-full border border-[#7360f2]/50 px-4 text-sm text-[#7360f2] transition hover:bg-[#7360f2]/10"
                >
                  Viber
                </a>
              )}
              <button
                type="button"
                onClick={async () => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  } catch {
                    /* ignore */
                  }
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#e5e5ea] bg-white px-4 text-sm text-[#1c1c1e] transition hover:bg-[#f2f2f7]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <Link
                href={`/shop?category=${encodeURIComponent(product.category)}`}
                className="inline-flex h-10 items-center rounded-full border border-[#e5e5ea] bg-white px-4 text-sm text-[#007aff] transition hover:bg-[#f2f2f7]"
              >
                More {product.category}
              </Link>
            </div>
            <p className="text-[11px] text-[#8e8e93]">
              {shop.shopCheckoutEnabled
                ? 'Add to cart, then Checkout or send an Inquiry.'
                : 'Add to cart, then send an inquiry — checkout can be enabled in Settings.'}
            </p>
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-lg font-semibold">Related pieces</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {related.map((r) => {
                const img = shopImageUrl(r.imageUrl, r.updatedAt || r.publicCode);
                return (
                  <Link
                    key={r.publicCode}
                    href={`/p/${r.publicCode}`}
                    className="shop-card overflow-hidden shadow-sm transition hover:border-[#007aff]/40"
                  >
                    <div className="aspect-square bg-[#f2f2f7]">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={r.name} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#e5e5ea] text-xs text-[#8e8e93]">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-1 text-sm">{r.name}</p>
                      <p className="text-xs text-[#8e8e93]">{formatPriceMmk(r.price)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <ShopWhatsAppFab
        phone={product.shopWhatsapp}
        viberPhone={product.shopViber}
        message={`Hello, I am interested in ${product.name} (${product.productCode})`}
      />

      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity',
          zoom ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setZoom(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Zoomed image"
      >
        {zoom && (
          <div className="relative max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-1.5 text-[#1c1c1e] shadow"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="mb-2 text-center text-sm text-white/90">{zoom.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoom.src}
              alt={zoom.label}
              className="max-h-[85vh] max-w-full rounded object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
