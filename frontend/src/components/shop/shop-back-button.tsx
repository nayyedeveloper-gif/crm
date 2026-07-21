'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** iOS-style back control for shop subpages. */
export function ShopBackButton({
  href,
  label = 'Back',
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn('shop-ios-back', className)}
      onClick={() => {
        if (href) router.push(href);
        else if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push('/shop');
      }}
    >
      <ChevronLeft className="h-6 w-6 shrink-0" strokeWidth={2.5} />
      <span>{label}</span>
    </button>
  );
}
