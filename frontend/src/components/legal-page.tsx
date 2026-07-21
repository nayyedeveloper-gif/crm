'use client';

import Link from 'next/link';

export function LegalPage({
  appName,
  title,
  updated,
  children,
}: {
  appName: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="border-b border-[#f0f0f0] bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#001529]">{appName}</p>
            <h1 className="text-lg font-medium text-[#262626]">{title}</h1>
          </div>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Back to Login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <p className="text-xs text-[#8c8c8c]">Last updated: {updated}</p>
        <div className="space-y-5 rounded-xl border border-[#f0f0f0] bg-white p-6 shadow-sm">
          {children}
        </div>
        <p className="pb-8 text-center text-[11px] text-[#bfbfbf]">
          <Link href="/agreement" className="text-primary hover:underline">
            User Agreement
          </Link>
          {' · '}
          <Link href="/policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-[#262626]">{title}</h2>
      <div className="text-sm leading-relaxed text-[#595959]">{children}</div>
    </section>
  );
}
