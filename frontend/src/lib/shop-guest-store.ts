'use client';

import { create } from 'zustand';

export const SHOP_AVATARS = [
  '💎',
  '💍',
  '✨',
  '👑',
  '🌸',
  '🦋',
  '🌙',
  '⭐',
  '🎀',
  '🕊️',
  '🌺',
  '🤍',
] as const;

export type ShopAvatar = (typeof SHOP_AVATARS)[number];

export type ShopGuestProfile = {
  fullName: string;
  phone: string;
  birthday: string;
  address: string;
  avatar: string;
  profileComplete: boolean;
};

type GuestState = {
  guest: ShopGuestProfile | null;
  hydrated: boolean;
  hydrate: () => void;
  setGuest: (profile: ShopGuestProfile) => void;
  clearGuest: () => void;
  continueAsGuest: (avatar?: string) => void;
};

const GUEST_KEY = 'sale-crm-shop-guest';

export const emptyGuest = (avatar = '💎'): ShopGuestProfile => ({
  fullName: '',
  phone: '',
  birthday: '',
  address: '',
  avatar,
  profileComplete: false,
});

export function isGuestComplete(g: ShopGuestProfile | null | undefined): boolean {
  if (!g) return false;
  return !!(g.fullName.trim() && g.phone.trim() && g.birthday && g.address.trim());
}

export const useShopGuest = create<GuestState>((set) => ({
  guest: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      const guest = raw ? (JSON.parse(raw) as ShopGuestProfile) : null;
      set({ guest, hydrated: true });
    } catch {
      set({ guest: null, hydrated: true });
    }
  },
  setGuest: (profile) => {
    const next = {
      ...profile,
      profileComplete: isGuestComplete(profile),
    };
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    set({ guest: next, hydrated: true });
  },
  clearGuest: () => {
    localStorage.removeItem(GUEST_KEY);
    set({ guest: null, hydrated: true });
  },
  continueAsGuest: (avatar = '💎') => {
    const existing = (() => {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        return raw ? (JSON.parse(raw) as ShopGuestProfile) : null;
      } catch {
        return null;
      }
    })();
    const next = existing
      ? { ...existing, avatar: avatar || existing.avatar }
      : emptyGuest(avatar);
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    set({ guest: next, hydrated: true });
  },
}));
