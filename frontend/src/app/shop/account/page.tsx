'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogOut, UserRound } from 'lucide-react';
import { ShopHeader, useShopSettings } from '@/components/shop/shop-chrome';
import { GoogleSignInButton } from '@/components/shop/google-sign-in-button';
import { ShopAvatarBubble, ShopProfilePhotoEditor } from '@/components/shop/shop-avatar';
import { CustomerTierBadge, TrustBlueBadge } from '@/components/shop/shop-user-badges';
import {
  shopAuthFetch,
  useShopAuth,
  type ShopCustomer,
} from '@/lib/shop-auth-store';
import { useShopGuest, isGuestComplete } from '@/lib/shop-guest-store';
import type { ShopAuthResponse } from '@/types';

function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/shop')) return null;
  if (raw.startsWith('//')) return null;
  return raw;
}

function AccountBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const shop = useShopSettings();

  const hydrateAuth = useShopAuth((s) => s.hydrate);
  const authHydrated = useShopAuth((s) => s.hydrated);
  const token = useShopAuth((s) => s.token);
  const customer = useShopAuth((s) => s.customer);
  const setSession = useShopAuth((s) => s.setSession);
  const clearAuth = useShopAuth((s) => s.clear);
  const updateCustomer = useShopAuth((s) => s.updateCustomer);

  const hydrateGuest = useShopGuest((s) => s.hydrate);
  const guestHydrated = useShopGuest((s) => s.hydrated);
  const guest = useShopGuest((s) => s.guest);
  const continueAsGuest = useShopGuest((s) => s.continueAsGuest);
  const clearGuest = useShopGuest((s) => s.clearGuest);
  const setGuest = useShopGuest((s) => s.setGuest);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pickAvatar, setPickAvatar] = useState('💎');

  useEffect(() => {
    hydrateAuth();
    hydrateGuest();
  }, [hydrateAuth, hydrateGuest]);

  // Refresh badges / tier from server when signed in
  useEffect(() => {
    if (!authHydrated || !token) return;
    shopAuthFetch<ShopCustomer>('/shop-auth/me', { token })
      .then((me) => updateCustomer(me))
      .catch(() => undefined);
  }, [authHydrated, token, updateCustomer]);

  useEffect(() => {
    if (guest?.avatar) setPickAvatar(guest.avatar);
  }, [guest?.avatar]);

  useEffect(() => {
    if (!authHydrated || !guestHydrated) return;
    if (token && customer) {
      if (!customer.profileComplete) {
        const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
        router.replace(`/shop/account/profile${q}`);
        return;
      }
      if (nextPath) router.replace(nextPath);
      return;
    }
    if (guest && isGuestComplete(guest) && nextPath) {
      router.replace(nextPath);
    }
  }, [authHydrated, guestHydrated, token, customer, guest, router, nextPath]);

  const onCredential = useCallback(
    async (idToken: string) => {
      setBusy(true);
      setError('');
      try {
        clearGuest();
        const data = await shopAuthFetch<ShopAuthResponse>('/shop-auth/google', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        });
        setSession(data.accessToken, data.customer as ShopCustomer);
        if (data.needsProfile || !data.customer.profileComplete) {
          const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          router.push(`/shop/account/profile${q}`);
        } else if (nextPath) {
          router.push(nextPath);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [router, setSession, nextPath, clearGuest]
  );

  function startGuest() {
    continueAsGuest(pickAvatar);
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.push(`/shop/account/profile${q}`);
  }

  const hydrated = authHydrated && guestHydrated;
  const signedIn = !!(token && customer);
  const asGuest = !signedIn && !!guest;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f2f7]">
      <ShopHeader
        appName={shop.appName}
        brandLine={shop.shopBrandLine}
        active="account"
        title="Account"
        backHref={nextPath || '/shop'}
        showCheckout={shop.shopCheckoutEnabled}
        showOrders={shop.shopOrdersEnabled}
        showFavourites={shop.shopFavouritesEnabled}
      />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {!hydrated ? (
          <div className="flex justify-center py-16 text-[#8e8e93]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : signedIn ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
              <div className="flex flex-col items-center px-4 pb-4 pt-6 text-center">
                <ShopAvatarBubble avatar={customer.avatarUrl} size="xl" />
                <div className="mt-3 flex max-w-full items-center justify-center gap-1.5 px-2">
                  <p className="truncate text-[20px] font-semibold tracking-tight">
                    {customer.fullName || 'Customer'}
                  </p>
                  {customer.trusted ? <TrustBlueBadge size="md" /> : null}
                </div>
                {(customer.customerTier === 'VIP' || customer.customerTier === 'VVIP') && (
                  <div className="mt-1.5">
                    <CustomerTierBadge tier={customer.customerTier} />
                  </div>
                )}
                <p className="mt-1 max-w-full truncate text-sm text-[#8e8e93]">{customer.email}</p>
              </div>
              <div className="divide-y divide-[#e5e5ea] border-t border-[#e5e5ea] text-[15px]">
                <Row label="Phone" value={customer.phone} />
                <Row label="Birthday" value={customer.birthday} />
                <Row label="Address" value={customer.address} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/shop/account/profile')}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[17px] text-[#007aff] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => clearAuth()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[17px] text-[#ff3b30] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : asGuest && isGuestComplete(guest) ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5ea]">
              <div className="flex flex-col items-center px-4 pb-4 pt-6 text-center">
                <ShopAvatarBubble avatar={guest.avatar} size="xl" />
                <p className="mt-3 max-w-full truncate text-[20px] font-semibold tracking-tight">
                  {guest.fullName}
                </p>
                <p className="mt-0.5 text-sm text-[#8e8e93]">Guest</p>
              </div>
              <div className="divide-y divide-[#e5e5ea] border-t border-[#e5e5ea] text-[15px]">
                <Row label="Phone" value={guest.phone} />
                <Row label="Birthday" value={guest.birthday} />
                <Row label="Address" value={guest.address} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/shop/account/profile')}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[17px] text-[#007aff] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => clearGuest()}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[17px] text-[#ff3b30] shadow-sm ring-1 ring-[#e5e5ea] active:bg-[#f2f2f7]"
            >
              Clear guest profile
            </button>
            <div className="pt-2">
              <p className="mb-3 text-center text-[13px] text-[#8e8e93]">
                Or link a Google account
              </p>
              <GoogleSignInButton onCredential={onCredential} disabled={busy} />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl bg-white px-5 py-7 text-center shadow-sm ring-1 ring-[#e5e5ea]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5e5ea]">
                <UserRound className="h-7 w-7 text-[#8e8e93]" />
              </div>
              <h1 className="mt-4 text-[22px] font-semibold tracking-tight">Welcome</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-[#8e8e93]">
                {nextPath?.includes('checkout')
                  ? 'Sign in or continue as guest to complete checkout.'
                  : 'Sign in with Google, or continue as a guest.'}
              </p>
              <div className="mt-6">
                <GoogleSignInButton onCredential={onCredential} disabled={busy} />
              </div>
              {busy && (
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#8e8e93]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in…
                </p>
              )}
              {error && <p className="mt-3 text-sm text-[#ff3b30]">{error}</p>}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-white px-4 py-5 shadow-sm ring-1 ring-[#e5e5ea]">
                <ShopProfilePhotoEditor value={pickAvatar} onChange={setPickAvatar} />
              </div>
              <button
                type="button"
                onClick={startGuest}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1c1c1e] text-[17px] font-semibold text-white active:bg-black"
              >
                Continue as Guest
              </button>
              {asGuest && !isGuestComplete(guest) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (guest) setGuest({ ...guest, avatar: pickAvatar });
                    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
                    router.push(`/shop/account/profile${q}`);
                  }}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[17px] text-[#007aff] shadow-sm ring-1 ring-[#e5e5ea]"
                >
                  Finish guest details
                </button>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ShopAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f2f2f7] text-[#8e8e93]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <AccountBody />
    </Suspense>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-20 shrink-0 text-[#8e8e93]">{label}</span>
      <span className="min-w-0 flex-1 text-[#1c1c1e]">{value || '—'}</span>
    </div>
  );
}
