import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isShopHost(host: string): boolean {
  const h = host.toLowerCase().split(':')[0];
  return h === 'shop.29jewellery.com' || h.endsWith('.shop.29jewellery.com');
}

/**
 * shop.29jewellery.com → public shop
 * other hosts (localhost CRM) → admin dashboard
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next();
  }

  const host = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  url.pathname = isShopHost(host) ? '/shop' : '/dashboard';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/',
};
