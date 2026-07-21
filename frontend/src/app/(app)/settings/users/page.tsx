'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, BranchResponse, Role, UserAdminResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'STAFF'];

type FormState = {
  username: string;
  password: string;
  fullName: string;
  role: Role;
  branchId: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  username: '',
  password: '',
  fullName: '',
  role: 'STAFF',
  branchId: 'all',
  active: true,
});

export default function UsersSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<UserAdminResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/settings/appearance');
    }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [u, b] = await Promise.all([
        api.get<ApiResponse<UserAdminResponse[]>>('/users'),
        api.get<ApiResponse<BranchResponse[]>>('/branches'),
      ]);
      setUsers(u.data.data);
      setBranches(b.data.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user, load]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(u: UserAdminResponse) {
    setEditId(u.id);
    setForm({
      username: u.username,
      password: '',
      fullName: u.fullName,
      role: u.role,
      branchId: u.branchId != null ? u.branchId.toString() : 'all',
      active: u.active,
    });
    setOpen(true);
  }

  async function save() {
    if (form.role !== 'ADMIN' && !form.branchId) {
      setError('Branch is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const branchId =
        form.branchId === 'all' || form.branchId === '' ? null : Number(form.branchId);
      if (editId == null) {
        await api.post('/users', {
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          branchId,
          active: form.active,
        });
      } else {
        await api.put(`/users/${editId}`, {
          fullName: form.fullName.trim(),
          role: form.role,
          branchId,
          active: form.active,
          password: form.password.trim() || null,
        });
      }
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

  async function remove(u: UserAdminResponse) {
    if (u.id === user?.id) {
      setError('You cannot delete your own account');
      return;
    }
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/users/${u.id}`);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Delete failed';
      setError(msg);
    }
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
            Users
          </h2>
          <p className="text-sm text-[#8c8c8c] md:mt-1">Add, edit, or remove accounts across branches</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New User</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {error && !open && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#f0f0f0] bg-white py-16 text-sm text-[#8c8c8c] dark:border-neutral-800 dark:bg-neutral-900">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {users.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-10 text-center text-sm text-[#8c8c8c] dark:border-neutral-700 dark:bg-neutral-900">
                  No users
                </div>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#262626] dark:text-neutral-100">
                          {u.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#8c8c8c]">@{u.username}</p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="rounded-lg p-1.5 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-primary dark:hover:bg-neutral-800"
                          aria-label="Edit user"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => void remove(u)}
                            className="rounded-lg p-1.5 text-[#8c8c8c] hover:bg-red-50 hover:text-red-600 dark:hover:bg-neutral-800"
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5 dark:bg-neutral-800">
                        {u.role}
                      </span>
                      <span className="text-[#595959]">{u.branchName || '—'}</span>
                      <span
                        className={cn(
                          u.active ? 'text-emerald-600' : 'text-[#8c8c8c]'
                        )}
                      >
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#8c8c8c]">
                      Updated {formatDateTime(u.updatedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
                  <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
                    <th className="px-3 py-2.5 text-left font-normal">Username</th>
                    <th className="px-3 py-2.5 text-left font-normal">Full name</th>
                    <th className="px-3 py-2.5 text-left font-normal">Role</th>
                    <th className="px-3 py-2.5 text-left font-normal">Branch</th>
                    <th className="px-3 py-2.5 text-left font-normal">Status</th>
                    <th className="px-3 py-2.5 text-left font-normal">Updated</th>
                    <th className="w-16 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-3 py-2.5 font-medium text-[#262626] dark:text-neutral-100">
                        {u.username}
                      </td>
                      <td className="px-3 py-2.5">{u.fullName}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5 text-xs dark:bg-neutral-800">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#595959]">{u.branchName || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'text-xs',
                            u.active ? 'text-emerald-600' : 'text-[#8c8c8c]'
                          )}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#8c8c8c]">
                        {formatDateTime(u.updatedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="rounded p-1 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-primary dark:hover:bg-neutral-800"
                            aria-label="Edit user"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => void remove(u)}
                              className="rounded p-1 text-[#8c8c8c] hover:bg-red-50 hover:text-red-600 dark:hover:bg-neutral-800"
                              aria-label="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId == null ? 'New User' : 'Edit User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editId == null && (
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="off"
                />
              </div>
            )}
            {editId != null && (
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={form.username} disabled />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password {editId != null && <span className="text-[#8c8c8c]">(leave blank to keep)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Branch{' '}
                {form.role !== 'ADMIN' && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={form.branchId || 'all'}
                onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active
            </label>
            {error && open && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
