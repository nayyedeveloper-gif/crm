'use client';

import { create } from 'zustand';
import type { ShopCustomerTier } from '@/types';

export type ShopCustomer = {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  birthday: string | null;
  address: string | null;
  avatarUrl: string | null;
  profileComplete: boolean;
  active?: boolean;
  customerTier?: ShopCustomerTier;
  trusted?: boolean;
  crmNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ShopAuthState = {
  token: string | null;
  customer: ShopCustomer | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, customer: ShopCustomer) => void;
  clear: () => void;
  updateCustomer: (customer: ShopCustomer) => void;
};

const TOKEN_KEY = 'sale-crm-shop-token';
const CUSTOMER_KEY = 'sale-crm-shop-customer';

export const useShopAuth = create<ShopAuthState>((set) => ({
  token: null,
  customer: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const raw = localStorage.getItem(CUSTOMER_KEY);
      const customer = raw ? (JSON.parse(raw) as ShopCustomer) : null;
      set({ token, customer, hydrated: true });
    } catch {
      set({ token: null, customer: null, hydrated: true });
    }
  },
  setSession: (token, customer) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    set({ token, customer, hydrated: true });
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    set({ token: null, customer: null, hydrated: true });
  },
  updateCustomer: (customer) => {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    set({ customer });
  },
}));

export async function shopAuthFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const body = await res.json();
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || 'Request failed');
  }
  return body.data as T;
}
