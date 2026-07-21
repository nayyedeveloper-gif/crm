'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { resolveHomePath, usePermissionStore } from '@/lib/permission-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse, AppSettingsResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, hydrate } = useAuthStore();
  const loadPermissions = usePermissionStore((s) => s.load);
  const permissionLevels = usePermissionStore((s) => s.levels);
  const permissionsLoaded = usePermissionStore((s) => s.loaded);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [appName, setAppName] = useState('Sale CRM');
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    hydrate();
    api
      .get<ApiResponse<AppSettingsResponse>>('/settings/general/public')
      .then(({ data }) => {
        setAppName(data.data.appName || 'Sale CRM');
        setAppVersion(data.data.appVersion || '');
      })
      .catch(() => undefined);
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPermissions();
    }
  }, [isAuthenticated, loadPermissions]);

  useEffect(() => {
    if (isAuthenticated && permissionsLoaded) {
      router.push(resolveHomePath(permissionLevels));
    }
  }, [isAuthenticated, permissionsLoaded, permissionLevels, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('Please agree to the Privacy Policy and User Agreement to continue.');
      return;
    }
    try {
      await login(username, password);
      await loadPermissions();
      router.push(resolveHomePath(usePermissionStore.getState().levels));
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <img src="/logo.png" alt={appName} className="mx-auto h-24 w-24 object-contain" />
          <CardTitle className="text-2xl">{appName}</CardTitle>
          <CardDescription>
            Sign in to your account to continue
            {appVersion ? ` · v${appVersion}` : ''}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-md border border-[#f0f0f0] bg-[#fafafa] px-3 py-2.5 text-sm leading-snug text-[#595959]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                required
              />
              <span>
                I have read and agree to the{' '}
                <Link
                  href="/policy"
                  target="_blank"
                  className="font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link
                  href="/agreement"
                  target="_blank"
                  className="font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  User Agreement
                </Link>
                .
              </span>
            </label>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading || !agreed}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <p className="text-center text-[11px] text-[#8c8c8c]">
              By signing in you acknowledge our policies for multi-branch CRM use.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
