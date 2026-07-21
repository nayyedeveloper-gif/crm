'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, SystemLogResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

export default function SystemLogsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<SystemLogResponse[]>([]);
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
      const { data } = await api.get<ApiResponse<SystemLogResponse[]>>('/settings/logs/system');
      setRows(data.data);
    } catch {
      setError('Failed to load system logs');
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
            System Logs
          </h2>
          <p className="text-sm text-[#8c8c8c] md:mt-1">
            Runtime events: backup, settings, and system messages
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
                  No system logs yet
                </div>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
                    title={row.detail || undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm text-[#262626] dark:text-neutral-100">
                        {row.message}
                      </p>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-medium',
                          row.level === 'ERROR' && 'text-red-600',
                          row.level === 'WARN' && 'text-amber-600',
                          row.level === 'INFO' && 'text-emerald-600',
                          row.level === 'DEBUG' && 'text-[#8c8c8c]'
                        )}
                      >
                        {row.level}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8c8c8c]">
                      <span>{formatDateTime(row.createdAt)}</span>
                      <span>{row.source}</span>
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
                    <th className="px-3 py-2.5 text-left font-normal">Level</th>
                    <th className="px-3 py-2.5 text-left font-normal">Source</th>
                    <th className="px-3 py-2.5 text-left font-normal">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-[#8c8c8c]">
                        No system logs yet
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
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              row.level === 'ERROR' && 'text-red-600',
                              row.level === 'WARN' && 'text-amber-600',
                              row.level === 'INFO' && 'text-emerald-600',
                              row.level === 'DEBUG' && 'text-[#8c8c8c]'
                            )}
                          >
                            {row.level}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#8c8c8c]">{row.source}</td>
                        <td className="max-w-xl truncate px-3 py-2">{row.message}</td>
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
