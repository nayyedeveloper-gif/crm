import type { Metadata, Viewport } from 'next';
import { ShopShell } from '@/components/shop/shop-shell';

export const metadata: Metadata = {
  title: 'Product | Gems & Jewellery',
  description: 'View jewellery product details',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#f2f2f7',
};

/** Full-screen responsive shell shared with /shop (bottom tabs on all devices). */
export default function ProductPublicLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
