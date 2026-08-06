'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Heart,
  LayoutGrid,
  MessageCircle,
  Package,
  Phone,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiResponse, AppSettingsResponse } from '@/types';
import { useInquiryCart } from '@/lib/inquiry-cart';
import { useShopFavourites } from '@/lib/shop-favourites';
import { useShopAuth } from '@/lib/shop-auth-store';
import { ShopBackButton } from '@/components/shop/shop-back-button';

export type ShopNavActive =
  | 'collection'
  | 'product'
  | 'inquiry'
  | 'checkout'
  | 'orders'
  | 'favourites'
  | 'account';

/** @deprecated Shell padding is handled by `.shop-shell` CSS. */
export const SHOP_BOTTOM_NAV_PAD =
  'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]';

export type ShopCopy = {
  appName: string;
  shopWhatsapp: string | null;
  shopViber: string | null;
  shopEyebrow: string;
  shopHeadline: string;
  shopSubtitle: string;
  shopCtaLabel: string;
  shopBrandLine: string;
  shopOfferBadge: string;
  shopOfferBlurb: string;
  shopOfferCta: string;
  shopCollectionCta: string;
  invitePopupEnabled: boolean;
  invitePopupTitle: string;
  invitePopupDate: string;
  invitePopupSpecial: string;
  invitePopupImageUrl: string | null;
  shopCheckoutEnabled: boolean;
  shopOrdersEnabled: boolean;
  shopMmqrEnabled: boolean;
  shopMmqrImageUrl: string | null;
  shopMmqrNote: string;
  shopFavouritesEnabled: boolean;
  shopCheckoutTerms: string;
  shopContactPhone: string | null;
  shopContactEmail: string | null;
  shopContactAddress: string;
  shopContactHours: string;
};

const DEFAULT_COPY: ShopCopy = {
  appName: 'Sale CRM',
  shopWhatsapp: null,
  shopViber: null,
  shopEyebrow: '',
  shopHeadline: '',
  shopSubtitle: '',
  shopCtaLabel: 'Browse collection',
  shopBrandLine: '',
  shopOfferBadge: '',
  shopOfferBlurb: '',
  shopOfferCta: 'View this piece',
  shopCollectionCta: 'Full collection',
  invitePopupEnabled: false,
  invitePopupTitle: '',
  invitePopupDate: '',
  invitePopupSpecial: '',
  invitePopupImageUrl: null,
  shopCheckoutEnabled: false,
  shopOrdersEnabled: false,
  shopMmqrEnabled: false,
  shopMmqrImageUrl: null,
  shopMmqrNote: '',
  shopFavouritesEnabled: true,
  shopCheckoutTerms: '',
  shopContactPhone: null,
  shopContactEmail: null,
  shopContactAddress: '',
  shopContactHours: '',
};

export function useShopSettings(): ShopCopy & { settingsReady: boolean } {
  const [copy, setCopy] = useState<ShopCopy>(DEFAULT_COPY);
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/general/public`)
      .then((r) => r.json())
      .then((body: ApiResponse<AppSettingsResponse>) => {
        const d = body?.data;
        if (!d) return;
        const appName = d.appName || 'Sale CRM';
        setCopy({
          appName,
          shopWhatsapp: d.shopWhatsapp || null,
          shopViber: d.shopViber || null,
          shopEyebrow: d.shopEyebrow || '',
          shopHeadline: d.shopHeadline?.trim() || appName,
          shopSubtitle: d.shopSubtitle || '',
          shopCtaLabel: d.shopCtaLabel || 'Browse collection',
          shopBrandLine: d.shopBrandLine || '',
          shopOfferBadge: d.shopOfferBadge || '',
          shopOfferBlurb: d.shopOfferBlurb || '',
          shopOfferCta: d.shopOfferCta || 'View this piece',
          shopCollectionCta: d.shopCollectionCta || 'Full collection',
          invitePopupEnabled: !!d.invitePopupEnabled,
          invitePopupTitle: d.invitePopupTitle || '',
          invitePopupDate: d.invitePopupDate || '',
          invitePopupSpecial: d.invitePopupSpecial || '',
          invitePopupImageUrl: d.invitePopupImageUrl || null,
          shopCheckoutEnabled: !!d.shopCheckoutEnabled,
          shopOrdersEnabled: !!d.shopOrdersEnabled,
          shopMmqrEnabled: !!d.shopMmqrEnabled,
          shopMmqrImageUrl: d.shopMmqrImageUrl || null,
          shopMmqrNote: d.shopMmqrNote || '',
          shopFavouritesEnabled: d.shopFavouritesEnabled !== false,
          shopCheckoutTerms: d.shopCheckoutTerms || '',
          shopContactPhone: d.shopContactPhone || null,
          shopContactEmail: d.shopContactEmail || null,
          shopContactAddress: d.shopContactAddress || '',
          shopContactHours: d.shopContactHours || '',
        });
      })
      .catch(() => undefined)
      .finally(() => setSettingsReady(true));
  }, []);

  return { ...copy, settingsReady };
}

export function useShopAppName() {
  return useShopSettings().appName;
}

export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function viberUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `viber://chat?number=%2B${digits}`;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'absolute -right-1.5 -top-1 inline-flex items-center justify-center rounded-full bg-red-500 font-semibold leading-none text-white',
        count > 9 ? 'h-4 min-w-4 px-1 text-[9px]' : 'h-4 w-4 text-[10px]'
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function ShopBottomNav({
  active = 'collection',
  showCheckout = false,
  showOrders = false,
  showFavourites = false,
}: {
  active?: ShopNavActive;
  showCheckout?: boolean;
  showOrders?: boolean;
  showFavourites?: boolean;
}) {
  const hydrate = useInquiryCart((s) => s.hydrate);
  const hydrated = useInquiryCart((s) => s.hydrated);
  const items = useInquiryCart((s) => s.items);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const hydrateFav = useShopFavourites((s) => s.hydrate);
  const favHydrated = useShopFavourites((s) => s.hydrated);
  const favCount = useShopFavourites((s) => s.items).length;

  useEffect(() => {
    hydrate();
    hydrateFav();
  }, [hydrate, hydrateFav]);

  const cartHref = showCheckout ? '/shop/checkout' : '/shop/inquiry';
  const cartActive = active === 'checkout' || (!showCheckout && active === 'inquiry');
  const shopActive = active === 'collection' || active === 'product';

  const tabs: {
    key: string;
    href: string;
    label: string;
    icon: typeof LayoutGrid;
    isActive: boolean;
    badge?: number;
  }[] = [
    {
      key: 'shop',
      href: '/shop',
      label: 'Shop',
      icon: LayoutGrid,
      isActive: shopActive,
    },
  ];

  if (showFavourites) {
    tabs.push({
      key: 'favourites',
      href: '/shop/favourites',
      label: 'Saved',
      icon: Heart,
      isActive: active === 'favourites',
      badge: favHydrated ? favCount : 0,
    });
  }

  tabs.push({
    key: 'cart',
    href: cartHref,
    label: 'Cart',
    icon: ShoppingBag,
    isActive: cartActive,
    badge: hydrated ? count : 0,
  });

  if (showCheckout) {
    // Cart already covers checkout — skip extra Inquiry tab to keep bottom nav ≤5
  } else {
    tabs.push({
      key: 'inquiry',
      href: '/shop/inquiry',
      label: 'Inquiry',
      icon: MessageCircle,
      isActive: active === 'inquiry',
    });
  }

  if (showOrders) {
    tabs.push({
      key: 'orders',
      href: '/shop/orders',
      label: 'Orders',
      icon: Package,
      isActive: active === 'orders',
    });
  }

  tabs.push({
    key: 'account',
    href: '/shop/account',
    label: 'Account',
    icon: UserRound,
    isActive: active === 'account',
  });

  return (
    <nav aria-label="Shop" className="shop-bottom-nav">
      <div
        className={cn(
          'shop-bottom-nav-grid',
          tabs.length <= 3 && 'grid-cols-3',
          tabs.length === 4 && 'grid-cols-4',
          tabs.length === 5 && 'grid-cols-5',
          tabs.length >= 6 && 'grid-cols-6'
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              data-active={tab.isActive ? 'true' : 'false'}
              className="shop-bottom-nav-item"
            >
              <span className="relative">
                <Icon
                  className={cn('h-5 w-5', tab.isActive && tab.key === 'favourites' && 'fill-current')}
                  strokeWidth={tab.isActive ? 2.25 : 1.75}
                />
                {tab.badge != null && tab.badge > 0 ? <NavBadge count={tab.badge} /> : null}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ViberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z" />
    </svg>
  );
}

export function ShopWhatsAppFab({
  phone,
  viberPhone,
  message = 'Hello, I would like to inquire about your jewellery collection.',
}: {
  phone?: string | null;
  viberPhone?: string | null;
  message?: string;
}) {
  const wa = whatsappUrl(phone, message);
  const vb = viberUrl(viberPhone ?? phone);
  if (!wa && !vb) return null;
  return (
    <div className="shop-fab-stack">
      {vb && (
        <a
          href={vb}
          aria-label="Chat on Viber"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#7360f2] text-white shadow-lg shadow-violet-900/30 transition hover:bg-[#8570f5]"
        >
          <ViberIcon className="h-[22px] w-[22px]" />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-emerald-900/40 transition hover:bg-[#20bd5a]"
        >
          <WhatsAppIcon className="h-[22px] w-[22px]" />
        </a>
      )}
    </div>
  );
}

/** Slim top brand bar + fixed bottom tabs — light mobile UI. */
export function ShopHeader({
  appName,
  brandLine,
  active = 'collection',
  showCheckout = false,
  showOrders = false,
  showFavourites = false,
  title,
  backHref,
  backLabel = 'Back',
}: {
  appName: string;
  brandLine?: string;
  active?: ShopNavActive;
  showCheckout?: boolean;
  showOrders?: boolean;
  showFavourites?: boolean;
  /** Native-style centered title (subpages). */
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const hydrateAuth = useShopAuth((s) => s.hydrate);
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <>
      <header className="shop-topbar">
        <div className="shop-topbar-inner">
          {title ? (
            <>
              <div className="w-[5.5rem] shrink-0">
                <ShopBackButton href={backHref} label={backLabel} />
              </div>
              <p className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-tight text-[#1c1c1e]">
                {title}
              </p>
              <div className="flex w-[5.5rem] shrink-0 justify-end">
                <Link
                  href="/shop/contact"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-[#007aff] active:opacity-60"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Contact
                </Link>
              </div>
            </>
          ) : (
            <>
              <Link href="/shop" className="flex min-w-0 flex-1 items-center gap-2.5">
                { }
                <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-[#1c1c1e]">
                    {appName}
                  </p>
                  {brandLine ? (
                    <p className="truncate text-[10px] tracking-[0.12em] text-[#8e8e93] uppercase">
                      {brandLine}
                    </p>
                  ) : null}
                </div>
              </Link>
              <Link
                href="/shop/contact"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-[#007aff] active:opacity-60"
              >
                <Phone className="h-3.5 w-3.5" />
                Contact
              </Link>
            </>
          )}
        </div>
      </header>
      <ShopBottomNav
        active={active}
        showCheckout={showCheckout}
        showOrders={showOrders}
        showFavourites={showFavourites}
      />
    </>
  );
}

export function ShopFooter({
  appName,
  brandLine,
}: {
  appName: string;
  brandLine?: string;
}) {
  return (
    <footer className="mt-8 border-t border-[#e5e5ea]/80 px-4 pb-2 pt-6">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[12px] font-medium text-[#8e8e93]">{appName}</p>
        {brandLine ? (
          <p className="text-[10px] tracking-[0.14em] text-[#aeaeb2] uppercase">{brandLine}</p>
        ) : null}
      </div>
    </footer>
  );
}

/**
 * Always resolve public product images via same-origin `/api`.
 * Absolute localhost:8080 URLs break when the shop is opened as 127.0.0.1
 * (Spring CORS returns 403 and the image fails to load).
 * Paths that already include `/api` must not be prefixed again.
 */
export function shopImageUrl(
  path: string | null | undefined,
  cacheKey?: string,
  size?: 'thumb' | 'full'
): string | null {
  if (!path) return null;
  let pathname = path.trim();
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
    try {
      const u = new URL(pathname);
      pathname = `${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }
  // Drop query for rewrite, re-apply cache key below
  const qIndex = pathname.indexOf('?');
  if (qIndex >= 0) pathname = pathname.slice(0, qIndex);

  if (pathname.startsWith('/api/')) {
    pathname = pathname.slice(4); // → /public/...
  }
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  const params = new URLSearchParams();
  if (size === 'thumb') params.set('size', 'thumb');
  if (cacheKey) params.set('v', cacheKey);
  const qs = params.toString();
  return qs ? `/api${pathname}?${qs}` : `/api${pathname}`;
}

/** Stable Front cover URL for cart / favourites (ignores stale absolute paths). */
export function shopProductFrontUrl(publicCode: string, cacheKey?: string): string {
  return shopImageUrl(
    `/public/products/${encodeURIComponent(publicCode)}/images/front`,
    cacheKey || publicCode
  )!;
}

/** Store this relative path in cart/favourites — never a resolved /api URL. */
export function shopProductFrontPath(publicCode: string): string {
  return `/public/products/${encodeURIComponent(publicCode)}/images/front`;
}
