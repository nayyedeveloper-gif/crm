'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Prefetching nav link styled like ghost buttons in CRM chrome. */
export function CrmNavLink({
  href,
  active,
  side = false,
  className,
  children,
  onClick,
}: {
  href: string;
  active?: boolean;
  side?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2',
        side
          ? 'h-9 w-full justify-start rounded px-3 text-sm font-normal'
          : 'h-8 rounded px-3 text-sm font-normal',
        active
          ? side
            ? 'bg-primary/15 text-primary'
            : 'bg-transparent text-primary shadow-none hover:bg-transparent hover:text-primary'
          : side
            ? 'text-neutral-300 hover:bg-white/5 hover:text-white'
            : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}
