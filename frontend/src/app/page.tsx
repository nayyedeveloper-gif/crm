'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Fallback when middleware did not rewrite `/` (e.g. local CRM host). */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
