'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { usePermissionStore } from '@/lib/permission-store';
import type { ApiResponse, BranchResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, RefreshCw, Pencil, Trash2, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormState = {
  code: string;
  name: string;
  phone: string;
  address: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  phone: '',
  address: '',
  active: true,
});

export default function BranchesSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = usePermissionStore((s) => s.can('BRANCHES_MANAGE'));
  const permissionsLoaded = usePermissionStore((s) => s.loaded);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (permissionsLoaded && !canManage) {
      router.replace('/settings/profile');
    }
  }, [permissionsLoaded, canManage, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<BranchResponse[]>>('/branches/all');
      setBranches(data.data || []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load branches';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage || user?.role === 'ADMIN') void load();
  }, [load, canManage, user?.role]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(b: BranchResponse) {
    setEditId(b.id);
    setForm({
      code: b.code,
      name: b.name,
      phone: b.phone || '',
      address: b.address || '',
      active: b.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        active: form.active,
      };
      if (editId == null) await api.post('/branches', body);
      else await api.put(`/branches/${editId}`, body);
      setOpen(false);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, code: string) {
    if (!confirm(`Delete branch / shop "${code}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/branches/${id}`);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Delete failed';
      setError(msg);
    }
  }

  if (permissionsLoaded && !canManage) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
            Branches / Shops
          </h2>
          <p className="text-sm text-[#8c8c8c] md:mt-1">
            Add, edit, or remove shop locations · {branches.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 sm:w-auto sm:gap-1.5 sm:px-3"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Branch</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>

      {error && !open && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#f0f0f0] bg-white py-16 text-sm text-[#8c8c8c] dark:border-neutral-800 dark:bg-neutral-900">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {branches.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#d9d9d9] bg-white py-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
                  <Store className="h-8 w-8 text-[#d9d9d9]" />
                  <p className="text-sm text-[#8c8c8c]">No branches yet</p>
                  <Button type="button" size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    Add first branch
                  </Button>
                </div>
              ) : (
                branches.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                          {b.name}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="rounded-lg p-1.5 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-primary dark:hover:bg-neutral-800"
                          aria-label="Edit branch"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(b.id, b.code)}
                          className="rounded-lg p-1.5 text-[#8c8c8c] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          aria-label="Delete branch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5',
                          b.active
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                            : 'bg-[#f5f5f5] text-[#8c8c8c] dark:bg-neutral-800'
                        )}
                      >
                        {b.active ? 'Active' : 'Inactive'}
                      </span>
                      {b.phone && <span className="text-[#595959]">{b.phone}</span>}
                    </div>
                    {b.address && (
                      <p className="mt-2 line-clamp-2 text-xs text-[#8c8c8c]">{b.address}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] bg-[#fafafa] text-xs text-[#8c8c8c] dark:border-neutral-800 dark:bg-neutral-950">
                    <th className="px-3 py-2.5 text-left font-normal">Code</th>
                    <th className="px-3 py-2.5 text-left font-normal">Name</th>
                    <th className="px-3 py-2.5 text-left font-normal">Phone</th>
                    <th className="px-3 py-2.5 text-left font-normal">Address</th>
                    <th className="px-3 py-2.5 text-left font-normal">Status</th>
                    <th className="px-3 py-2.5 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-[#8c8c8c]">
                        No branches — click Add Branch
                      </td>
                    </tr>
                  ) : (
                    branches.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs">{b.code}</td>
                        <td className="px-3 py-2.5 font-medium text-[#262626] dark:text-neutral-100">
                          {b.name}
                        </td>
                        <td className="px-3 py-2.5 text-[#595959]">{b.phone || '—'}</td>
                        <td className="max-w-[200px] truncate px-3 py-2.5 text-[#595959]">
                          {b.address || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-xs',
                              b.active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-[#f5f5f5] text-[#8c8c8c]'
                            )}
                          >
                            {b.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEdit(b)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => void remove(b.id, b.code)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editId == null ? 'Add Branch / Shop' : 'Edit Branch / Shop'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="b-code">Code</Label>
                <Input
                  id="b-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SHOP-01"
                  className="font-mono uppercase"
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-name">Name</Label>
                <Input
                  id="b-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="29 Jewellery — Yangon"
                  maxLength={160}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-phone">Phone</Label>
              <Input
                id="b-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="09…"
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-address">Address</Label>
              <Textarea
                id="b-address"
                rows={3}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Shop address…"
                maxLength={400}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active (visible in branch lists)
            </label>
            {error && open && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
