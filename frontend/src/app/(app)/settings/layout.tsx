'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { CRM_PERMISSION_KEYS, usePermissionStore } from '@/lib/permission-store';
import { cn } from '@/lib/utils';
import {
  Palette,
  Users,
  ShieldCheck,
  DatabaseBackup,
  Building2,
  ScrollText,
  Activity,
  UserCircle,
  Store,
  Webhook,
} from 'lucide-react';

const NAV = [
  { href: '/settings/profile', label: 'Profile & Account', short: 'Profile', icon: UserCircle, permission: null },
  { href: '/settings/appearance', label: 'Appearance', short: 'Theme', icon: Palette, permission: CRM_PERMISSION_KEYS.settingsAppearance },
  { href: '/settings/branches', label: 'Branches / Shops', short: 'Shops', icon: Store, permission: 'BRANCHES_MANAGE' },
  { href: '/settings/users', label: 'Users', short: 'Users', icon: Users, permission: 'USERS_MANAGE' },
  { href: '/settings/permissions', label: 'Permission & Access', short: 'Access', icon: ShieldCheck, permission: 'PERMISSIONS_MANAGE' },
  { href: '/settings/backup', label: 'Backup', short: 'Backup', icon: DatabaseBackup, permission: 'BACKUP_MANAGE' },
  { href: '/settings/webhooks', label: 'n8n Webhooks', short: 'n8n', icon: Webhook, permission: CRM_PERMISSION_KEYS.settingsGeneral },
  { href: '/settings/change-logs', label: 'Change Logs', short: 'Changes', icon: ScrollText, permission: 'CHANGE_LOGS_VIEW' },
  { href: '/settings/system-logs', label: 'System Logs', short: 'System', icon: Activity, permission: 'SYSTEM_LOGS_VIEW' },
  { href: '/settings/general', label: 'General', short: 'General', icon: Building2, permission: CRM_PERMISSION_KEYS.settingsGeneral },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const canPerm = usePermissionStore((s) => s.can);
  const permissionsLoaded = usePermissionStore((s) => s.loaded);

  const items = NAV.filter((item) => {
    if (!item.permission) return true;
    if (!permissionsLoaded) return user?.role === 'ADMIN';
    return canPerm(item.permission);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950 md:flex-row">
      {/* Mobile horizontal tabs */}
      <div className="shrink-0 border-b border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <nav className="flex gap-1 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-[#f5f5f5] text-[#595959] dark:bg-neutral-800 dark:text-neutral-300'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.short}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div className="border-b border-[#f0f0f0] px-4 py-3 dark:border-neutral-800">
          <h1 className="text-sm font-medium text-[#262626] dark:text-neutral-100">Settings</h1>
          <p className="mt-0.5 text-xs text-[#8c8c8c]">System configuration</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[#e6f4ff] text-primary dark:bg-primary/15'
                    : 'text-[#595959] hover:bg-[#fafafa] dark:text-neutral-300 dark:hover:bg-neutral-800'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
