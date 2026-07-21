'use client';

import { Suspense, useEffect, useState } from 'react';
import type { FormEvent, HTMLAttributes } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ShopHeader, useShopSettings } from '@/components/shop/shop-chrome';
import { ShopProfilePhotoEditor } from '@/components/shop/shop-avatar';
import {
  shopAuthFetch,
  useShopAuth,
  type ShopCustomer,
} from '@/lib/shop-auth-store';
import {
  emptyGuest,
  isGuestComplete,
  useShopGuest,
} from '@/lib/shop-guest-store';

function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/shop')) return null;
  if (raw.startsWith('//')) return null;
  return raw;
}

function ProfileBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const shop = useShopSettings();

  const hydrateAuth = useShopAuth((s) => s.hydrate);
  const authHydrated = useShopAuth((s) => s.hydrated);
  const token = useShopAuth((s) => s.token);
  const customer = useShopAuth((s) => s.customer);
  const updateCustomer = useShopAuth((s) => s.updateCustomer);

  const hydrateGuest = useShopGuest((s) => s.hydrate);
  const guestHydrated = useShopGuest((s) => s.hydrated);
  const guest = useShopGuest((s) => s.guest);
  const setGuest = useShopGuest((s) => s.setGuest);
  const continueAsGuest = useShopGuest((s) => s.continueAsGuest);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('💎');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState(false);

  const isGoogle = !!(token && customer);
  const isGuestMode = !isGoogle;

  useEffect(() => {
    hydrateAuth();
    hydrateGuest();
  }, [hydrateAuth, hydrateGuest]);

  useEffect(() => {
    if (!authHydrated || !guestHydrated) return;
    if (!token && !guest) {
      continueAsGuest('💎');
    }
  }, [authHydrated, guestHydrated, token, guest, continueAsGuest]);

  if (authHydrated && guestHydrated && !seeded) {
    if (customer) {
      setSeeded(true);
      setFullName(customer.fullName || '');
      setPhone(customer.phone || '');
      setBirthday(customer.birthday || '');
      setAddress(customer.address || '');
      const a = customer.avatarUrl;
      setAvatar(a ? a : '💎');
    } else if (guest) {
      setSeeded(true);
      setFullName(guest.fullName || '');
      setPhone(guest.phone || '');
      setBirthday(guest.birthday || '');
      setAddress(guest.address || '');
      setAvatar(guest.avatar || '💎');
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isGoogle && token) {
        const data = await shopAuthFetch<ShopCustomer>('/shop-auth/me/profile', {
          method: 'PUT',
          token,
          body: JSON.stringify({
            fullName: fullName.trim(),
            phone: phone.trim(),
            birthday,
            address: address.trim(),
            avatarUrl: avatar,
          }),
        });
        updateCustomer(data);
      } else {
        const profile = {
          ...(guest || emptyGuest(avatar)),
          fullName: fullName.trim(),
          phone: phone.trim(),
          birthday,
          address: address.trim(),
          avatar,
          profileComplete: false,
        };
        profile.profileComplete = isGuestComplete(profile);
        if (!profile.profileComplete) {
          throw new Error('Please fill name, phone, birthday and address');
        }
        setGuest(profile);
      }
      router.push(nextPath || '/shop/account');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="account"
        title="Your details"
        backHref={
          nextPath ? `/shop/account?next=${encodeURIComponent(nextPath)}` : '/shop/account'
        }
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-6">
        {!authHydrated || !guestHydrated ? (
          <div className="flex justify-center py-16 text-[#8e8e93]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <p className="px-1 text-[15px] text-[#8e8e93]">
              {isGuestMode
                ? 'Guest profile is saved on this device only.'
                : 'Update your name, phone, birthday, address and avatar.'}
            </p>

            <ShopProfilePhotoEditor value={avatar} onChange={setAvatar} />

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
              <Field
                label="Name"
                value={fullName}
                onChange={setFullName}
                placeholder="Full name"
                autoComplete="name"
                required
              />
              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="09…"
                autoComplete="tel"
                inputMode="tel"
                required
              />
              <label className="flex items-center gap-3 border-t border-[#e5e5ea] px-4 py-2.5">
                <span className="w-20 shrink-0 text-[15px]">Birthday</span>
                <input
                  type="date"
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="h-10 min-w-0 flex-1 bg-transparent text-[17px] outline-none"
                />
              </label>
              <label className="flex items-start gap-3 border-t border-[#e5e5ea] px-4 py-2.5">
                <span className="w-20 shrink-0 pt-2 text-[15px]">Address</span>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, township, city"
                  className="min-w-0 flex-1 resize-none bg-transparent py-2 text-[17px] outline-none placeholder:text-[#c7c7cc]"
                />
              </label>
            </div>

            {error && <p className="px-1 text-sm text-[#ff3b30]">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#007aff] text-[17px] font-semibold text-white active:bg-[#0066d6] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function ShopProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f2f2f7] text-[#8e8e93]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <ProfileBody />
    </Suspense>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 border-t border-[#e5e5ea] px-4 py-1 first:border-t-0">
      <span className="w-20 shrink-0 text-[15px]">{label}</span>
      <input
        required={required}
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
