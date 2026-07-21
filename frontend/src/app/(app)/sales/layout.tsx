'use client';

import { usePathname } from 'next/navigation';
import { SalesEmbed, type SalesView } from '@/components/sales-embed';

function viewFromPath(pathname: string): SalesView {
  if (pathname.includes('/sales/chairman')) return 'chairman';
  if (pathname.includes('/sales/staff')) return 'staff';
  if (pathname.includes('/sales/cm')) return 'cm';
  if (pathname.includes('/sales/crm')) return 'crm';
  if (pathname.includes('/sales/detail')) return 'detail';
  return 'overview';
}

/**
 * Single iframe instance for all Sales sub-routes (avoids full reload on tab change).
 */
export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Index redirect and Sales Data admin page have no embed — skip
  if (pathname === '/sales' || pathname.startsWith('/sales/data')) {
    return <>{children}</>;
  }
  return <SalesEmbed view={viewFromPath(pathname)} />;
}
