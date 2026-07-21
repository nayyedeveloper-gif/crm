'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, PermissionMatrixResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVELS = ['NONE', 'ALLOW', 'OWN'] as const;

const SHOP_KEYS = new Set([
  'SHOP_DASHBOARD_VIEW',
  'PRODUCTS_MANAGE',
  'ORDERS_MANAGE',
  'INQUIRIES_MANAGE',
  'SHOP_USERS_MANAGE',
]);

const SALES_KEYS = new Set(['SALES_VIEW', 'SALES_IMPORT']);

const SETTINGS_KEYS = new Set([
  'BRANCHES_MANAGE',
]);

function sectionFor(key: string): 'crm' | 'shop' | 'sales' | 'settings' {
  if (SHOP_KEYS.has(key)) return 'shop';
  if (SALES_KEYS.has(key)) return 'sales';
  if (SETTINGS_KEYS.has(key)) return 'settings';
  if (key.startsWith('SETTINGS_') || key.endsWith('_LOGS_VIEW') || key === 'USERS_MANAGE'
    || key === 'PERMISSIONS_MANAGE' || key === 'BACKUP_MANAGE' || key === 'BRANCH_ALL') {
    return 'settings';
  }
  return 'crm';
}

const SECTION_LABEL: Record<'crm' | 'shop' | 'sales' | 'settings', string> = {
  crm: 'CRM',
  shop: 'Shop',
  sales: 'Sales',
  settings: 'Settings & Admin',
};

export default function PermissionsSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [matrix, setMatrix] = useState<PermissionMatrixResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
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
      const { data } = await api.get<ApiResponse<PermissionMatrixResponse>>(
        '/settings/permissions'
      );
      setMatrix(data.data);
      setDraft(structuredClone(data.data.matrix));
    } catch {
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user, load]);

  const dirty = useMemo(() => {
    if (!matrix) return false;
    return JSON.stringify(matrix.matrix) !== JSON.stringify(draft);
  }, [matrix, draft]);

  const groupedKeys = useMemo(() => {
    if (!matrix) return [] as { section: 'crm' | 'shop' | 'sales' | 'settings'; keys: string[] }[];
    const order: Array<'crm' | 'shop' | 'sales' | 'settings'> = ['crm', 'sales', 'shop', 'settings'];
    const buckets: Record<'crm' | 'shop' | 'sales' | 'settings', string[]> = {
      crm: [],
      sales: [],
      shop: [],
      settings: [],
    };
    for (const key of matrix.permissionKeys) {
      buckets[sectionFor(key)].push(key);
    }
    return order
      .map((section) => ({ section, keys: buckets[section] }))
      .filter((g) => g.keys.length > 0);
  }, [matrix]);

  function setCell(key: string, role: string, level: string) {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], [role]: level },
    }));
  }

  function cycle(key: string, role: string) {
    const current = draft[key]?.[role] || 'NONE';
    const options: string[] =
      key === 'CRM_EDIT' ? ['NONE', 'ALLOW', 'OWN'] : ['NONE', 'ALLOW'];
    const idx = Math.max(0, options.indexOf(current));
    const next = options[(idx + 1) % options.length];
    setCell(key, role, next);
  }

  async function save() {
    if (!matrix) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const cells = matrix.permissionKeys.flatMap((key) =>
        matrix.roles.map((role) => ({
          permissionKey: key,
          role,
          accessLevel: draft[key]?.[role] || 'NONE',
        }))
      );
      const { data } = await api.put<ApiResponse<PermissionMatrixResponse>>(
        '/settings/permissions',
        { cells }
      );
      setMatrix(data.data);
      setDraft(structuredClone(data.data.matrix));
      setMessage('Permissions saved');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== 'ADMIN') return null;

  if (loading || !matrix) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-3 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
            Permission & Access
          </h2>
          <p className="text-sm text-[#8c8c8c] md:mt-1">
            Click a cell to cycle Allow / None. Shop modules are listed below. ADMIN critical
            permissions stay locked to Allow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 sm:w-auto sm:gap-1.5 sm:px-3"
            onClick={load}
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </header>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Mobile stacked cards */}
      <div className="space-y-4 md:hidden">
        {groupedKeys.map((group) => (
          <div key={`m-sec-${group.section}`} className="space-y-2">
            <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
              {SECTION_LABEL[group.section]}
              {group.section === 'shop' ? ' · Allow / None' : ''}
            </p>
            {group.keys.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <p className="mb-2.5 text-sm font-medium text-[#262626] dark:text-neutral-100">
                  {matrix.labels[key] || key}
                </p>
                <div className="space-y-2">
                  {matrix.roles.map((role) => {
                    const level = draft[key]?.[role] || 'NONE';
                    return (
                      <div key={role} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#8c8c8c]">{role}</span>
                        <button
                          type="button"
                          onClick={() => cycle(key, role)}
                          className={cn(
                            'min-w-[4.5rem] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                            level === 'ALLOW' && 'bg-emerald-50 text-emerald-700',
                            level === 'OWN' && 'bg-amber-50 text-amber-700',
                            level === 'NONE' &&
                              'bg-[#f5f5f5] text-[#8c8c8c] dark:bg-neutral-800'
                          )}
                          title="Click to change"
                        >
                          {level === 'ALLOW' ? 'Allow' : level === 'OWN' ? 'Own' : 'None'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
        <table className="w-full text-sm">
          <thead className="bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
            <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
              <th className="px-4 py-2.5 text-left font-normal">Module</th>
              {matrix.roles.map((role) => (
                <th key={role} className="w-28 px-3 py-2.5 text-center font-normal">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedKeys.map((group) => (
              <Fragment key={`sec-${group.section}`}>
                <tr className="bg-[#fafafa] dark:bg-neutral-950">
                  <td
                    colSpan={1 + matrix.roles.length}
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8c8c8c]"
                  >
                    {SECTION_LABEL[group.section]}
                    {group.section === 'shop' ? ' · Allow / None' : ''}
                  </td>
                </tr>
                {group.keys.map((key) => (
                  <tr
                    key={key}
                    className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                  >
                    <td className="px-4 py-2 text-[#262626] dark:text-neutral-200">
                      {matrix.labels[key] || key}
                    </td>
                    {matrix.roles.map((role) => {
                      const level = draft[key]?.[role] || 'NONE';
                      return (
                        <td key={role} className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => cycle(key, role)}
                            className={cn(
                              'min-w-[4.5rem] rounded px-2 py-1 text-xs font-medium transition-colors',
                              level === 'ALLOW' && 'bg-emerald-50 text-emerald-700',
                              level === 'OWN' && 'bg-amber-50 text-amber-700',
                              level === 'NONE' &&
                                'bg-[#f5f5f5] text-[#8c8c8c] dark:bg-neutral-800'
                            )}
                            title="Click to change"
                          >
                            {level === 'ALLOW' ? 'Allow' : level === 'OWN' ? 'Own' : 'None'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#8c8c8c]">
        Levels: {LEVELS.join(' · ')}. Shop rows use Allow / None only. CRM Edit supports Own
        (branch-scoped). Changes are recorded in Change logs.
      </p>
    </div>
  );
}
