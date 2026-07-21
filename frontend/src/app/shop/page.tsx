'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search, Plus } from 'lucide-react';
import { cn, formatPriceMmk, discountPercent, formatCurrency } from '@/lib/utils';
import type { ApiResponse, ProductCategoryResponse, PublicProductSummary } from '@/types';
import {
  ShopFooter,
  ShopHeader,
  ShopWhatsAppFab,
  useShopSettings,
  shopProductFrontPath,
} from '@/components/shop/shop-chrome';
import { ShopProductImage } from '@/components/shop/shop-product-image';
import { LimitedOfferSection } from '@/components/shop/limited-offer-section';
import { InvitationPopup } from '@/components/shop/invitation-popup';
import { FavouriteButton } from '@/components/shop/favourite-button';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { useInquiryCart } from '@/lib/inquiry-cart';

const API_BASE = '/api';

function ProductCard({
  p,
  favouritesEnabled,
  onAdd,
}: {
  p: PublicProductSummary;
  favouritesEnabled: boolean;
  onAdd: (item: {
    publicCode: string;
    productCode: string;
    name: string;
    category: string;
    price: number | null;
    compareAtPrice: number | null | undefined;
    imageUrl: string;
  }) => void;
}) {
  const off = discountPercent(p.price, p.compareAtPrice);
  const cacheKey = p.updatedAt || p.publicCode;
  return (
    <div className="group overflow-hidden rounded-xl border border-[#e5e5ea] bg-white shadow-sm">
      <Link href={`/p/${p.publicCode}`} className="block">
        <div className="relative">
          <ShopProductImage
            path={p.imageUrl}
            alt={p.name}
            cacheKey={cacheKey}
            imgClassName="group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {p.specialOffer && (
              <span className="rounded-md bg-[#007aff] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Special
              </span>
            )}
            {p.featured && !p.specialOffer && (
              <span className="rounded-md bg-[#1c1c1e] px-1.5 py-0.5 text-[10px] font-medium text-white">
                Featured
              </span>
            )}
            {off != null && (
              <span className="rounded-md bg-[#ff3b30] px-1.5 py-0.5 text-[10px] font-medium text-white">
                -{off}%
              </span>
            )}
          </div>
          {favouritesEnabled && (
            <div className="absolute right-2 top-2">
              <FavouriteButton
                size="sm"
                item={{
                  publicCode: p.publicCode,
                  productCode: p.productCode,
                  name: p.name,
                  category: p.category,
                  price: p.price,
                  compareAtPrice: p.compareAtPrice,
                  imageUrl: shopProductFrontPath(p.publicCode),
                }}
              />
            </div>
          )}
        </div>
        <div className="space-y-1 p-3 pb-2">
          <p className="text-[10px] tracking-[0.14em] text-[#8e8e93] uppercase">{p.category}</p>
          <p className="line-clamp-2 text-sm font-medium text-[#1c1c1e]">{p.name}</p>
          <p className="text-xs text-[#8e8e93]">
            {p.productCode}
            {p.metalPurity ? ` · ${p.metalPurity}` : ''}
          </p>
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <p className="text-sm font-semibold text-[#1c1c1e]">{formatPriceMmk(p.price)}</p>
            {off != null && p.compareAtPrice != null && (
              <p className="text-xs text-[#aeaeb2] line-through">
                {formatCurrency(p.compareAtPrice)} MMK
              </p>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() =>
            onAdd({
              publicCode: p.publicCode,
              productCode: p.productCode,
              name: p.name,
              category: p.category,
              price: p.price,
              compareAtPrice: p.compareAtPrice,
              imageUrl: shopProductFrontPath(p.publicCode),
            })
          }
          className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-[#007aff] text-xs font-semibold text-white active:bg-[#0066d6]"
        >
          <Plus className="h-3 w-3" />
          Add to cart
        </button>
      </div>
    </div>
  );
}

function ShopCatalog() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const shop = useShopSettings();
  const addItem = useInquiryCart((s) => s.addItem);

  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [products, setProducts] = useState<PublicProductSummary[]>([]);
  const [featured, setFeatured] = useState<PublicProductSummary[]>([]);
  const [specials, setSpecials] = useState<PublicProductSummary[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [priceBand, setPriceBand] = useState<'all' | 'under1m' | '1to5m' | 'over5m' | 'inquiry'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    fetch(`${API_BASE}/public/product-categories`)
      .then((r) => r.json())
      .then((body: ApiResponse<ProductCategoryResponse[]>) => setCategories(body.data || []))
      .catch(() => undefined);
    fetch(`${API_BASE}/public/products/featured`)
      .then((r) => r.json())
      .then((body: ApiResponse<PublicProductSummary[]>) => setFeatured(body.data || []))
      .catch(() => undefined);
    fetch(`${API_BASE}/public/products/special`)
      .then((r) => r.json())
      .then((body: ApiResponse<PublicProductSummary[]>) => setSpecials(body.data || []))
      .catch(() => undefined);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    const qs = params.toString() ? `?${params}` : '';
    try {
      const res = await fetch(`${API_BASE}/public/products${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load collection');
      const body = (await res.json()) as ApiResponse<PublicProductSummary[]>;
      setProducts(body.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, q]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const subtitle = useMemo(() => {
    if (category) return `${category} collection`;
    if (q) return `Search: ${q}`;
    return 'Diamond · Gold · PT';
  }, [category, q]);

  const sortedProducts = useMemo(() => {
    let list = [...products];
    if (priceBand === 'under1m') {
      list = list.filter((p) => p.price != null && p.price < 1_000_000);
    } else if (priceBand === '1to5m') {
      list = list.filter((p) => p.price != null && p.price >= 1_000_000 && p.price < 5_000_000);
    } else if (priceBand === 'over5m') {
      list = list.filter((p) => p.price != null && p.price >= 5_000_000);
    } else if (priceBand === 'inquiry') {
      list = list.filter((p) => p.price == null);
    }
    if (sort === 'price-asc') {
      list.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));
    } else if (sort === 'price-desc') {
      list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }
    return list;
  }, [products, sort, priceBand]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="collection"
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <section className="border-b border-[#e5e5ea] bg-white">
        <div className="flex flex-col items-start gap-3 px-4 py-8 sm:gap-4 sm:px-6 sm:py-10 lg:mx-auto lg:max-w-6xl">
          {shop.shopEyebrow ? (
            <p className="text-[11px] tracking-[0.2em] text-[#8e8e93] uppercase">
              {shop.shopEyebrow}
            </p>
          ) : null}
          <h1 className="max-w-2xl text-[1.75rem] font-semibold leading-tight tracking-tight text-[#1c1c1e] sm:text-3xl">
            {shop.shopHeadline}
          </h1>
          {shop.shopSubtitle ? (
            <p className="max-w-xl text-[13px] leading-relaxed text-[#8e8e93] sm:text-sm">
              {shop.shopSubtitle}
            </p>
          ) : null}
          <a
            href="#collection"
            className="inline-flex h-10 items-center rounded-xl bg-[#007aff] px-5 text-sm font-semibold text-white active:bg-[#0066d6] sm:h-11 sm:px-6"
          >
            {shop.shopCtaLabel}
          </a>
        </div>
      </section>

      {!category && !q && specials.length > 0 && (
        <LimitedOfferSection products={specials} copy={shop} />
      )}

      <main id="collection" className="shop-content flex-1 py-6 sm:py-8">
        {!category && !q && featured.filter((p) => !p.specialOffer).length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1c1c1e]">Featured</h2>
            <p className="mt-0.5 text-xs text-[#8e8e93]">Selected pieces from the collection</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {featured
                .filter((p) => !p.specialOffer)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard
                    key={`f-${p.publicCode}`}
                    p={p}
                    favouritesEnabled={shop.shopFavouritesEnabled}
                    onAdd={addItem}
                  />
                ))}
            </div>
          </section>
        )}

        <div className="mb-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1c1c1e]">Collection</h2>
            <p className="mt-0.5 text-xs text-[#8e8e93]">{subtitle}</p>
          </div>
          <div className="flex gap-3">
            <select
              value={priceBand}
              onChange={(e) => setPriceBand(e.target.value as typeof priceBand)}
              className="shop-select h-10 min-w-0 flex-1 rounded-xl border border-[#e5e5ea] bg-white pl-3 pr-10 text-xs text-[#1c1c1e] outline-none"
            >
              <option value="all">All prices</option>
              <option value="under1m">Under 10 သိန်း</option>
              <option value="1to5m">10 – 50 သိန်း</option>
              <option value="over5m">50 သိန်း+</option>
              <option value="inquiry">Price on inquiry</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="shop-select h-10 min-w-[7.5rem] shrink-0 rounded-xl border border-[#e5e5ea] bg-white pl-3 pr-10 text-xs text-[#1c1c1e] outline-none"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
          </div>
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(searchInput.trim());
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8e8e93]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or code…"
              className="h-11 w-full rounded-xl border border-[#e5e5ea] bg-white pr-3 pl-9 text-[15px] text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc] focus:border-[#007aff]"
            />
          </form>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setQ('');
              setSearchInput('');
            }}
            className={cn(
              'h-8 shrink-0 rounded-full px-3.5 text-xs font-medium transition',
              !category
                ? 'bg-[#1c1c1e] text-white'
                : 'bg-white text-[#1c1c1e] ring-1 ring-[#e5e5ea]'
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.name)}
              className={cn(
                'h-8 shrink-0 rounded-full px-3.5 text-xs font-medium transition',
                category === c.name
                  ? 'bg-[#1c1c1e] text-white'
                  : 'bg-white text-[#1c1c1e] ring-1 ring-[#e5e5ea]'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8e8e93]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading collection…
          </div>
        ) : error ? (
          <p className="py-16 text-center text-sm text-[#ff3b30]">{error}</p>
        ) : sortedProducts.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#8e8e93]">No products in this collection yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {sortedProducts.map((p) => (
              <ProductCard
                key={p.publicCode}
                p={p}
                favouritesEnabled={shop.shopFavouritesEnabled}
                onAdd={addItem}
              />
            ))}
          </div>
        )}
      </main>

      <ShopFooter appName={shop.appName} brandLine={shop.shopBrandLine} />
      <ShopWhatsAppFab phone={shop.shopWhatsapp} viberPhone={shop.shopViber} />
      <InvitationPopup copy={shop} />
      <PwaInstallPrompt />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f2f2f7] text-sm text-[#8e8e93]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      }
    >
      <ShopCatalog />
    </Suspense>
  );
}
