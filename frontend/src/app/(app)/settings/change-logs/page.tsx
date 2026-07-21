'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, ChangeLogResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

export default function ChangeLogsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<ChangeLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/settings/appearance');
    }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<ChangeLogResponse[]>>('/settings/logs/changes');
      setRows(data.data);
    } catch {
      setError('Failed to load change logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user, load]);

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
            Change Logs
          </h2>
          <p className="text-sm text-[#8c8c8c] md:mt-1">
            Settings, users, permissions, and backup configuration changes
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 sm:w-auto sm:gap-1.5 sm:px-3"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </header>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#f0f0f0] bg-white py-16 text-sm text-[#8c8c8c] dark:border-neutral-800 dark:bg-neutral-900">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-10 text-center text-sm text-[#8c8c8c] dark:border-neutral-700 dark:bg-neutral-900">
                  No change logs yet
                </div>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
                    title={row.detail || undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                          {row.category}
                          <span className="mx-1.5 text-[#d9d9d9]">·</span>
                          <span className="font-normal text-[#595959]">{row.action}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-[#595959] dark:text-neutral-300">
                          {row.summary}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8c8c8c]">
                      <span>{formatDateTime(row.createdAt)}</span>
                      <span>{row.actor || '—'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
                  <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
                    <th className="px-3 py-2.5 text-left font-normal">When</th>
                    <th className="px-3 py-2.5 text-left font-normal">Category</th>
                    <th className="px-3 py-2.5 text-left font-normal">Action</th>
                    <th className="px-3 py-2.5 text-left font-normal">Summary</th>
                    <th className="px-3 py-2.5 text-left font-normal">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-[#8c8c8c]">
                        No change logs yet
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                        title={row.detail || undefined}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2">{row.action}</td>
                        <td className="max-w-md truncate px-3 py-2">{row.summary}</td>
                        <td className="px-3 py-2 text-xs text-[#8c8c8c]">{row.actor || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
