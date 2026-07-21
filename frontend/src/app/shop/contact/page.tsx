'use client';

import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import {
  ShopFooter,
  ShopHeader,
  ShopWhatsAppFab,
  useShopSettings,
  viberUrl,
  whatsappUrl,
} from '@/components/shop/shop-chrome';

export default function ShopContactPage() {
  const shop = useShopSettings();
  const phone = shop.shopContactPhone || shop.shopWhatsapp;
  const wa = whatsappUrl(shop.shopWhatsapp || phone, `Hello ${shop.appName}`);
  const vb = viberUrl(shop.shopViber || phone);

  const rows = [
    phone
      ? {
          icon: Phone,
          label: 'Phone',
          value: phone,
          href: `tel:${phone.replace(/\s/g, '')}`,
        }
      : null,
    shop.shopContactEmail
      ? {
          icon: Mail,
          label: 'Email',
          value: shop.shopContactEmail,
          href: `mailto:${shop.shopContactEmail}`,
        }
      : null,
    shop.shopContactAddress
      ? {
          icon: MapPin,
          label: 'Address',
          value: shop.shopContactAddress,
          href: null as string | null,
        }
      : null,
    shop.shopContactHours
      ? {
          icon: Clock,
          label: 'Hours',
          value: shop.shopContactHours,
          href: null as string | null,
        }
      : null,
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    value: string;
    href: string | null;
  }[];

  return (
    <div className="shop-shell flex min-h-dvh flex-col bg-[#f2f2f7]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="collection"
        title="Contact"
        backHref="/shop"
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-6">
        <div className="rounded-2xl bg-white px-4 py-5 text-center shadow-sm ring-1 ring-[#e5e5ea]">
          <p className="text-[13px] tracking-wide text-[#8e8e93] uppercase">Get in touch</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[#1c1c1e]">
            {shop.appName}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#8e8e93]">
            ဆိုင်နှင့် ဆက်သွယ်ရန် အောက်ပါအချက်အလက်များကို သုံးပါ။
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-10 text-center text-[15px] text-[#8e8e93] shadow-sm ring-1 ring-[#e5e5ea]">
            Contact အချက်အလက် မထည့်ရသေးပါ။ Settings → General မှ ထည့်ပါ။
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
            {rows.map((row) => {
              const Icon = row.icon;
              const inner = (
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-[#007aff]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[#8e8e93]">{row.label}</p>
                    <p className="whitespace-pre-wrap text-[15px] font-medium text-[#1c1c1e]">
                      {row.value}
                    </p>
                  </div>
                </div>
              );
              return row.href ? (
                <a
                  key={row.label}
                  href={row.href}
                  className="block border-t border-[#e5e5ea] first:border-t-0 active:bg-[#f9f9fb]"
                >
                  {inner}
                </a>
              ) : (
                <div key={row.label} className="border-t border-[#e5e5ea] first:border-t-0">
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#25d366] text-[15px] font-semibold text-white"
            >
              WhatsApp
            </a>
          ) : null}
          {vb ? (
            <a
              href={vb}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#7360f2] text-[15px] font-semibold text-white"
            >
              Viber
            </a>
          ) : null}
        </div>

        <p className="text-center text-[13px] text-[#8e8e93]">
          <Link href="/agreement" className="text-[#007aff]">
            User Agreement
          </Link>
          {' · '}
          <Link href="/policy" className="text-[#007aff]">
            Privacy Policy
          </Link>
        </p>
      </main>

      <ShopFooter appName={shop.appName} brandLine={shop.shopBrandLine} />
      <ShopWhatsAppFab phone={shop.shopWhatsapp} viberPhone={shop.shopViber} />
    </div>
  );
}
