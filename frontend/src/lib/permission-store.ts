'use client';

import { create } from 'zustand';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';

type Levels = Record<string, string>;

type PermissionState = {
  levels: Levels;
  loaded: boolean;
  load: () => Promise<void>;
  can: (key: string) => boolean;
  canEditCrm: () => boolean;
  clear: () => void;
};

function isAllow(level: string | undefined): boolean {
  return level === 'ALLOW' || level === 'OWN';
}

export const CRM_PERMISSION_KEYS = {
  dashboard: 'DASHBOARD_VIEW',
  crmView: 'CRM_VIEW',
  crmEdit: 'CRM_EDIT',
  crmExport: 'CRM_EXPORT',
  showcase: 'SHOWCASE_MANAGE',
  sales: 'SALES_VIEW',
  performance: 'PERFORMANCE_VIEW',
  performanceEdit: 'PERFORMANCE_EDIT_TARGET',
  report: 'REPORT_VIEW',
  help: 'HELP_VIEW',
  apiDocs: 'API_DOCS_VIEW',
  branchAll: 'BRANCH_ALL',
  settingsAppearance: 'SETTINGS_APPEARANCE',
  settingsGeneral: 'SETTINGS_GENERAL',
} as const;

export const SHOP_PERMISSION_KEYS = {
  dashboard: 'SHOP_DASHBOARD_VIEW',
  products: 'PRODUCTS_MANAGE',
  orders: 'ORDERS_MANAGE',
  inquiries: 'INQUIRIES_MANAGE',
  users: 'SHOP_USERS_MANAGE',
} as const;

export function resolveHomePath(levels: Levels): string {
  if (isAllow(levels[CRM_PERMISSION_KEYS.crmView])) return '/crm-history';
  if (isAllow(levels[CRM_PERMISSION_KEYS.showcase])) return '/showcase';
  if (isAllow(levels[CRM_PERMISSION_KEYS.sales])) return '/sales/overview';
  if (isAllow(levels[CRM_PERMISSION_KEYS.dashboard])) return '/dashboard';
  if (isAllow(levels[SHOP_PERMISSION_KEYS.dashboard])) return '/shop-dashboard';
  if (isAllow(levels[SHOP_PERMISSION_KEYS.products])) return '/products';
  if (isAllow(levels[SHOP_PERMISSION_KEYS.orders])) return '/orders';
  if (isAllow(levels[SHOP_PERMISSION_KEYS.inquiries])) return '/inquiries';
  if (isAllow(levels[SHOP_PERMISSION_KEYS.users])) return '/shop-users';
  if (isAllow(levels[CRM_PERMISSION_KEYS.performance])) return '/performance';
  if (isAllow(levels[CRM_PERMISSION_KEYS.report])) return '/report';
  return '/settings/profile';
}

export function isPathAllowed(pathname: string, levels: Levels): boolean {
  const can = (key: string) => isAllow(levels[key]);

  if (pathname.startsWith('/settings/profile')) return true;
  if (pathname.startsWith('/help')) return can(CRM_PERMISSION_KEYS.help);
  if (pathname.startsWith('/api-docs')) return can(CRM_PERMISSION_KEYS.apiDocs);

  if (pathname.startsWith('/settings/appearance')) return can(CRM_PERMISSION_KEYS.settingsAppearance);
  if (pathname.startsWith('/settings/general')) {
    return can(CRM_PERMISSION_KEYS.settingsGeneral) || can(CRM_PERMISSION_KEYS.settingsAppearance);
  }
  if (pathname.startsWith('/settings/users')) return can('USERS_MANAGE');
  if (pathname.startsWith('/settings/branches')) return can('BRANCHES_MANAGE');
  if (pathname.startsWith('/settings/permissions')) return can('PERMISSIONS_MANAGE');
  if (pathname.startsWith('/settings/backup')) return can('BACKUP_MANAGE');
  if (pathname.startsWith('/settings/sales-data')) return can('SALES_IMPORT');
  if (pathname.startsWith('/settings/change-logs')) return can('CHANGE_LOGS_VIEW');
  if (pathname.startsWith('/settings/system-logs')) return can('SYSTEM_LOGS_VIEW');
  if (pathname.startsWith('/settings')) return true;

  if (pathname.startsWith('/shop-dashboard')) return can(SHOP_PERMISSION_KEYS.dashboard);
  if (pathname.startsWith('/products')) return can(SHOP_PERMISSION_KEYS.products);
  if (pathname.startsWith('/orders')) return can(SHOP_PERMISSION_KEYS.orders);
  if (pathname.startsWith('/inquiries')) return can(SHOP_PERMISSION_KEYS.inquiries);
  if (pathname.startsWith('/shop-users')) return can(SHOP_PERMISSION_KEYS.users);

  if (pathname === '/crm-history/new' || pathname.includes('/crm-history/') && pathname.includes('/edit')) {
    return isAllow(levels[CRM_PERMISSION_KEYS.crmEdit]);
  }
  if (pathname.startsWith('/crm-history')) return can(CRM_PERMISSION_KEYS.crmView);
  if (pathname.startsWith('/showcase')) return can(CRM_PERMISSION_KEYS.showcase);
  if (pathname.startsWith('/sales')) return can(CRM_PERMISSION_KEYS.sales);
  if (pathname.startsWith('/dashboard')) return can(CRM_PERMISSION_KEYS.dashboard);
  if (pathname.startsWith('/performance')) return can(CRM_PERMISSION_KEYS.performance);
  if (pathname.startsWith('/report')) return can(CRM_PERMISSION_KEYS.report);

  return true;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  levels: {},
  loaded: false,
  load: async () => {
    try {
      const { data } = await api.get<ApiResponse<Levels>>('/settings/permissions/me');
      set({ levels: data.data || {}, loaded: true });
    } catch {
      set({ levels: {}, loaded: true });
    }
  },
  can: (key: string) => isAllow(get().levels[key]),
  canEditCrm: () => isAllow(get().levels[CRM_PERMISSION_KEYS.crmEdit]),
  clear: () => set({ levels: {}, loaded: false }),
}));
