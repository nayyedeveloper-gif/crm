'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Client replace avoids Next.js App Router + React #310 crash from server redirect(). */
export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/profile');
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
      <Loader2 className="h-4 w-4 animate-spin" /> Opening settings…
    </div>
  );
}
