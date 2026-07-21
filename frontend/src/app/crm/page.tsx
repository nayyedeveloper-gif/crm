'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Client replace avoids App Router React #310 from server redirect(). */
export default function CrmShortcutPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-[#8c8c8c]">
      <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
    </div>
  );
}
