import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPriceMmk(amount: number | null | undefined): string {
  if (amount == null) return 'Price on inquiry';
  return `${formatCurrency(amount)} MMK`;
}

/** Percent off when compare-at &gt; sale price; otherwise null. */
export function discountPercent(
  price: number | null | undefined,
  compareAtPrice: number | null | undefined
): number | null {
  if (price == null || compareAtPrice == null || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Humanize shop order statuses like PENDING_PAYMENT → Pending payment */
export function formatShopOrderStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'Pending payment',
    PAID: 'Paid',
    CONFIRMED: 'Confirmed',
    PACKING: 'Packing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
  };
  if (map[status]) return map[status];
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
