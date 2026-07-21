'use client';

import { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShopFavourites, type FavouriteItem } from '@/lib/shop-favourites';

export function FavouriteButton({
  item,
  className,
  size = 'md',
}: {
  item: FavouriteItem;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const hydrate = useShopFavourites((s) => s.hydrate);
  const hydrated = useShopFavourites((s) => s.hydrated);
  const items = useShopFavourites((s) => s.items);
  const toggle = useShopFavourites((s) => s.toggle);
  const active = hydrated && items.some((i) => i.publicCode === item.publicCode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <button
      type="button"
      aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full border shadow-sm transition',
        active
          ? 'border-[#ff3b30]/30 bg-white text-[#ff3b30]'
          : 'border-[#e5e5ea] bg-white text-[#8e8e93] hover:text-[#1c1c1e]',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className
      )}
    >
      <Heart
        className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', active && 'fill-current')}
      />
    </button>
  );
}
