'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, UserAdminResponse, UserInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, KeyRound } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<UserAdminResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setProfileErr('');
    try {
      const { data } = await api.get<ApiResponse<UserAdminResponse>>('/users/me');
      setProfile(data.data);
      setFullName(data.data.fullName);
    } catch {
      setProfileErr('Profile မတင်နိုင်ပါ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      const { data } = await api.put<ApiResponse<UserAdminResponse>>('/users/me', {
        fullName: fullName.trim(),
      });
      setProfile(data.data);
      setFullName(data.data.fullName);
      if (user) {
        const next: UserInfo = {
          ...user,
          fullName: data.data.fullName,
        };
        setUser(next);
      }
      setProfileMsg('Profile သိမ်းပြီးပါပြီ');
    } catch (e: unknown) {
      setProfileErr(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Profile သိမ်းမရပါ'
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPasswordMsg('');
    setPasswordErr('');
    if (newPassword.length < 8) {
      setPasswordErr('စကားဝှက်အသစ်မှာ အနည်းဆုံး ၈ လုံး ရှိရပါမယ်');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('စကားဝှက်အသစ် နှစ်ခု မကိုက်ညီပါ');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      setPasswordMsg('စကားဝှက် ပြောင်းပြီးပါပြီ');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      setPasswordErr(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'စကားဝှက် ပြောင်းမရပါ'
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-3 sm:p-6">
      <header>
        <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
          Profile & Account
        </h2>
        <p className="text-sm text-[#8c8c8c] md:mt-1">
          ကိုယ်ရေးအချက်အလက် ပြင်ဆင်ခြင်းနှင့် စကားဝှက် ပြောင်းခြင်း
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">Profile</h3>
        {profileMsg && <p className="text-sm text-emerald-600">{profileMsg}</p>}
        {profileErr && <p className="text-sm text-red-600">{profileErr}</p>}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs text-[#8c8c8c]">Username</dt>
            <dd className="text-sm font-medium text-[#262626] dark:text-neutral-200">
              {profile?.username}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-[#8c8c8c]">Role</dt>
            <dd className="text-sm font-medium text-[#262626] dark:text-neutral-200">
              {profile?.role}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-[#8c8c8c]">Branch</dt>
            <dd className="text-sm font-medium text-[#262626] dark:text-neutral-200">
              {profile?.branchName || 'All branches'}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-[#8c8c8c]">Status</dt>
            <dd className="text-sm font-medium text-[#262626] dark:text-neutral-200">
              {profile?.active ? 'Active' : 'Inactive'}
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={160}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={saveProfile}
          disabled={savingProfile || !fullName.trim() || fullName.trim() === profile?.fullName}
        >
          {savingProfile ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Profile
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[#262626] dark:text-neutral-100">
          <KeyRound className="h-4 w-4" />
          Change Password
        </h3>
        {passwordMsg && <p className="text-sm text-emerald-600">{passwordMsg}</p>}
        {passwordErr && <p className="text-sm text-red-600">{passwordErr}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={changePassword}
          disabled={
            savingPassword || !currentPassword || !newPassword || !confirmPassword
          }
        >
          {savingPassword ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <KeyRound className="h-3.5 w-3.5" />
          )}
          Update Password
        </Button>
      </section>
    </div>
  );
}
