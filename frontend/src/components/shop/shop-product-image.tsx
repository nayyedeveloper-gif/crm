'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { shopImageUrl } from '@/components/shop/shop-chrome';

/** Consistent square product image for Collection cards and related grids. */
export function ShopProductImage({
  path,
  alt,
  cacheKey,
  className,
  imgClassName,
  size = 'thumb',
}: {
  path: string | null | undefined;
  alt: string;
  cacheKey?: string;
  className?: string;
  imgClassName?: string;
  /** Grid cards default to thumb; product detail can pass full. */
  size?: 'thumb' | 'full';
}) {
  const src = shopImageUrl(path, cacheKey, size);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn('relative aspect-square overflow-hidden bg-[#f2f2f7]', className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full object-contain transition duration-500',
            imgClassName
          )}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[#e5e5ea] text-xs text-[#8e8e93]">
          No photo
        </div>
      )}
    </div>
  );
}
