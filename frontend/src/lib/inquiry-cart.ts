'use client';

import { create } from 'zustand';
import type { ShopInquiryItem } from '@/types';

const STORAGE_KEY = 'sale-crm-inquiry-cart';

function readStorage(): ShopInquiryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShopInquiryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: ShopInquiryItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface InquiryCartState {
  items: ShopInquiryItem[];
  hydrated: boolean;
  hydrate: () => void;
  addItem: (item: Omit<ShopInquiryItem, 'qty'> & { qty?: number }) => void;
  removeItem: (publicCode: string) => void;
  setQty: (publicCode: string, qty: number) => void;
  clear: () => void;
  count: () => number;
}

export const useInquiryCart = create<InquiryCartState>((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => {
    set({ items: readStorage(), hydrated: true });
  },

  addItem: (item) => {
    const qty = Math.max(1, item.qty ?? 1);
    const existing = get().items;
    const idx = existing.findIndex((i) => i.publicCode === item.publicCode);
    let next: ShopInquiryItem[];
    if (idx >= 0) {
      next = existing.map((i, n) =>
        n === idx
          ? {
              ...i,
              qty: i.qty + qty,
              price: item.price ?? i.price,
              compareAtPrice: item.compareAtPrice ?? i.compareAtPrice,
              imageUrl: item.imageUrl ?? i.imageUrl,
            }
          : i
      );
    } else {
      next = [...existing, { ...item, qty }];
    }
    writeStorage(next);
    set({ items: next, hydrated: true });
  },

  removeItem: (publicCode) => {
    const next = get().items.filter((i) => i.publicCode !== publicCode);
    writeStorage(next);
    set({ items: next });
  },

  setQty: (publicCode, qty) => {
    const nextQty = Math.max(1, qty);
    const next = get().items.map((i) =>
      i.publicCode === publicCode ? { ...i, qty: nextQty } : i
    );
    writeStorage(next);
    set({ items: next });
  },

  clear: () => {
    writeStorage([]);
    set({ items: [] });
  },

  count: () => get().items.reduce((s, i) => s + i.qty, 0),
}));
