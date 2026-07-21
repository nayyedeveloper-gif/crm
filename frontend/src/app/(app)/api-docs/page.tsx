'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Code2, ExternalLink, KeyRound, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const ENDPOINT_GROUPS = [
  {
    title: 'Public (Login မလို)',
    items: [
      { method: 'GET', path: '/api/public/products', note: 'Shop ထုတ်ကုန်စာရင်း' },
      { method: 'GET', path: '/api/public/products/{code}', note: 'ထုတ်ကုန်အသေးစိတ်' },
      { method: 'GET', path: '/api/public/product-categories', note: 'Category စာရင်း' },
      { method: 'POST', path: '/api/public/orders', note: 'Checkout အော်ဒါတင်ခြင်း' },
      { method: 'GET', path: '/api/public/orders/track', note: 'အော်ဒါ ခြေရာခံခြင်း' },
      { method: 'POST', path: '/api/public/inquiries', note: 'Inquiry ပို့ခြင်း' },
      { method: 'GET', path: '/api/settings/general/public', note: 'Shop public settings' },
      { method: 'POST', path: '/api/shop-auth/google', note: 'Google Sign-In (ဖောက်သည်)' },
    ],
  },
  {
    title: 'CRM (JWT Bearer လို)',
    items: [
      { method: 'POST', path: '/api/auth/login', note: 'Staff login → access token' },
      { method: 'GET', path: '/api/products', note: 'ထုတ်ကုန်အားလုံး (admin)' },
      { method: 'POST', path: '/api/products', note: 'ထုတ်ကုန်အသစ် (multipart)' },
      { method: 'GET', path: '/api/orders', note: 'အော်ဒါစာရင်း' },
      { method: 'PUT', path: '/api/orders/{id}/status', note: 'အော်ဒါ status ပြောင်း' },
      { method: 'GET', path: '/api/inquiries', note: 'Inquiry စာရင်း' },
      { method: 'GET', path: '/api/shop-customers', note: 'Shop users စာရင်း' },
      { method: 'PUT', path: '/api/shop-customers/{id}', note: 'Trust / VIP / VVIP သတ်မှတ်' },
      { method: 'GET', path: '/api/crm-history', note: 'CRM history' },
      { method: 'PUT', path: '/api/settings/general', note: 'App / Shop settings' },
    ],
  },
] as const;

function MethodBadge({ method }: { method: string }) {
  const color =
    method === 'GET'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : method === 'POST'
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : method === 'PUT'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span
      className={cn(
        'inline-flex w-14 shrink-0 justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
        color
      )}
    >
      {method}
    </span>
  );
}

export default function ApiDocsPage() {
  const [tab, setTab] = useState<'guide' | 'swagger'>('guide');
  const swaggerSrc = useMemo(() => '/api/swagger-ui.html', []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:gap-4 sm:p-6">
      <div className="shrink-0 rounded-xl border border-[#e8e8e8] bg-white px-4 py-3 sm:px-5 sm:py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001529] text-white">
              <Code2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="hidden text-lg font-semibold text-[#262626] md:block dark:text-neutral-100">
                API Documentation
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-[#8c8c8c] md:mt-1">
                Backend REST API လမ်းညွှန်။ အကျဉ်းချုပ် (မြန်မာ) နှင့် Swagger UI တို့ကို
                ဤနေရာမှ ကြည့်နိုင်သည်။
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/help"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e8e8e8] px-3 text-xs font-medium text-[#595959] hover:border-primary hover:text-primary dark:border-neutral-700"
            >
              <BookOpen className="h-3.5 w-3.5" />
              How to use
            </Link>
            <a
              href={swaggerSrc}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:opacity-90"
            >
              Open Swagger
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-4 flex gap-1 rounded-lg bg-[#f5f5f5] p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setTab('guide')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition',
              tab === 'guide'
                ? 'bg-white text-[#262626] shadow-sm dark:bg-neutral-900 dark:text-neutral-100'
                : 'text-[#8c8c8c]'
            )}
          >
            အကျဉ်းချုပ်
          </button>
          <button
            type="button"
            onClick={() => setTab('swagger')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition',
              tab === 'swagger'
                ? 'bg-white text-[#262626] shadow-sm dark:bg-neutral-900 dark:text-neutral-100'
                : 'text-[#8c8c8c]'
            )}
          >
            Swagger UI
          </button>
        </div>
      </div>

      {tab === 'guide' ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-1 pb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#262626] dark:text-neutral-100">
                <KeyRound className="h-4 w-4 text-primary" />
                Authentication
              </div>
              <ol className="list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-[#595959] dark:text-neutral-400">
                <li>
                  <code className="rounded bg-[#f5f5f5] px-1 text-[12px] dark:bg-neutral-800">
                    POST /api/auth/login
                  </code>{' '}
                  ဖြင့် username/password ပို့ပါ။
                </li>
                <li>
                  Response ထဲက <strong>accessToken</strong> ကို ယူပါ။
                </li>
                <li>
                  Header ထည့်ပါ —{' '}
                  <code className="rounded bg-[#f5f5f5] px-1 text-[12px] dark:bg-neutral-800">
                    Authorization: Bearer &lt;token&gt;
                  </code>
                </li>
                <li>
                  Swagger UI တွင် <strong>Authorize</strong> ခလုတ်နှိပ်ပြီး token ထည့်နိုင်သည်။
                </li>
              </ol>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#262626] dark:text-neutral-100">
                <Shield className="h-4 w-4 text-primary" />
                Base URL
              </div>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#595959] dark:text-neutral-400">
                <li>
                  Production:{' '}
                  <code className="rounded bg-[#f5f5f5] px-1 text-[12px] dark:bg-neutral-800">
                    https://shop.29jewellery.com/api
                  </code>
                </li>
                <li>
                  Local:{' '}
                  <code className="rounded bg-[#f5f5f5] px-1 text-[12px] dark:bg-neutral-800">
                    http://localhost:8080/api
                  </code>
                </li>
                <li>
                  OpenAPI JSON:{' '}
                  <code className="rounded bg-[#f5f5f5] px-1 text-[12px] dark:bg-neutral-800">
                    /api/v3/api-docs
                  </code>
                </li>
              </ul>
            </div>
          </div>

          {ENDPOINT_GROUPS.map((group) => (
            <div
              key={group.title}
              className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="border-b border-[#f0f0f0] px-4 py-2.5 text-sm font-semibold text-[#262626] dark:border-neutral-800 dark:text-neutral-100">
                {group.title}
              </div>
              <ul className="divide-y divide-[#f5f5f5] dark:divide-neutral-800">
                {group.items.map((item) => (
                  <li
                    key={`${item.method}-${item.path}`}
                    className="flex flex-wrap items-center gap-2 px-4 py-2.5"
                  >
                    <MethodBadge method={item.method} />
                    <code className="text-[12px] text-[#262626] dark:text-neutral-200">
                      {item.path}
                    </code>
                    <span className="text-[12px] text-[#8c8c8c]">{item.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="text-center text-xs text-[#8c8c8c]">
            အသေးစိတ် request/response schema အားလုံးကို Swagger UI tab တွင် ကြည့်ပါ။
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white dark:border-neutral-800">
          <iframe
            title="Swagger UI"
            src={swaggerSrc}
            className="h-[calc(100vh-14rem)] w-full min-h-[560px] border-0"
          />
        </div>
      )}
    </div>
  );
}
