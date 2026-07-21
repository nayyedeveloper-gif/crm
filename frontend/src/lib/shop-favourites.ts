'use client';

import { create } from 'zustand';

export type FavouriteItem = {
  publicCode: string;
  productCode: string;
  name: string;
  category: string;
  price: number | null;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
};

const STORAGE_KEY = 'sale-crm-shop-favourites';

function readStorage(): FavouriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavouriteItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: FavouriteItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface FavouritesState {
  items: FavouriteItem[];
  hydrated: boolean;
  hydrate: () => void;
  isFavourite: (publicCode: string) => boolean;
  toggle: (item: FavouriteItem) => void;
  remove: (publicCode: string) => void;
  clear: () => void;
  count: () => number;
}

export const useShopFavourites = create<FavouritesState>((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => {
    set({ items: readStorage(), hydrated: true });
  },

  isFavourite: (publicCode) => get().items.some((i) => i.publicCode === publicCode),

  toggle: (item) => {
    const existing = get().items;
    const has = existing.some((i) => i.publicCode === item.publicCode);
    const next = has
      ? existing.filter((i) => i.publicCode !== item.publicCode)
      : [...existing, item];
    writeStorage(next);
    set({ items: next, hydrated: true });
  },

  remove: (publicCode) => {
    const next = get().items.filter((i) => i.publicCode !== publicCode);
    writeStorage(next);
    set({ items: next });
  },

  clear: () => {
    writeStorage([]);
    set({ items: [] });
  },

  count: () => get().items.length,
}));
