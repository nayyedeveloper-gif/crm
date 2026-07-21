import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ShopShell } from '@/components/shop/shop-shell';

export const metadata: Metadata = {
  title: 'Gems & Jewellery Collection',
  description: 'Browse our Diamond, Gold and PT jewellery collection',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#f2f2f7',
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
