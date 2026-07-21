'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopCustomerTier } from '@/types';

export function TrustBlueBadge({
  className,
  size = 'md',
  title = 'Trusted user',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}) {
  const box =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const icon =
    size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-white',
        box,
        className
      )}
      aria-label={title}
    >
      <Check className={icon} strokeWidth={3} />
    </span>
  );
}

export function CustomerTierBadge({
  tier,
  className,
}: {
  tier: ShopCustomerTier | string | null | undefined;
  className?: string;
}) {
  if (!tier || tier === 'CUSTOMER') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
          className
        )}
      >
        Customer
      </span>
    );
  }
  if (tier === 'VIP') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
          className
        )}
      >
        VIP
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
        className
      )}
    >
      VVIP
    </span>
  );
}

export function ShopUserIdentity({
  name,
  trusted,
  tier,
  showCustomerTier = false,
  className,
  nameClassName,
}: {
  name: string;
  trusted?: boolean;
  tier?: ShopCustomerTier | string | null;
  showCustomerTier?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  const showTier = tier && (showCustomerTier || tier !== 'CUSTOMER');
  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}>
      <span className={cn('truncate font-medium', nameClassName)}>{name}</span>
      {trusted ? <TrustBlueBadge size="sm" /> : null}
      {showTier ? <CustomerTierBadge tier={tier} /> : null}
    </span>
  );
}
