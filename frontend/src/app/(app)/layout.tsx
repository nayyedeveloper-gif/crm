'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useUiSettingsStore, applyUiSettings } from '@/lib/ui-settings-store';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  History,
  Plus,
  ChevronDown,
  User,
  UserCircle,
  Shield,
  BarChart3,
  Settings,
  LayoutDashboard,
  FileBarChart,
  Package,
  MessageSquareHeart,
  ShoppingBag,
  Store,
  BookOpen,
  Code2,
  Users,
  MoreHorizontal,
  X,
  LayoutGrid,
  LineChart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/api';
import type { ApiResponse, AppSettingsResponse, BranchResponse } from '@/types';
import { cn } from '@/lib/utils';
import { SHOP_PERMISSION_KEYS, CRM_PERMISSION_KEYS, usePermissionStore, resolveHomePath, isPathAllowed } from '@/lib/permission-store';

function AlertDot({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-red-500 font-semibold text-white',
        label.length > 1 ? 'h-4 min-w-4 px-1 text-[9px] leading-none' : 'h-4 w-4 text-[10px] leading-none'
      )}
      aria-label={`${count} alerts`}
    >
      {label}
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const loadPermissions = usePermissionStore((s) => s.load);
  const clearPermissions = usePermissionStore((s) => s.clear);
  const canPerm = usePermissionStore((s) => s.can);
  const canEditCrm = usePermissionStore((s) => s.canEditCrm);
  const permissionsLoaded = usePermissionStore((s) => s.loaded);
  const permissionLevels = usePermissionStore((s) => s.levels);
  const {
    hydrate: hydrateUi,
    hydrated: uiHydrated,
    navLayout,
    showFooter,
    compactHeader,
    themeMode,
  } = useUiSettingsStore();

  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [appName, setAppName] = useState('Sale CRM');
  const [newInquiryCount, setNewInquiryCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    hydrate();
    hydrateUi();
    setAuthReady(true);
  }, [hydrate, hydrateUi]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPermissions();
    } else {
      clearPermissions();
    }
  }, [isAuthenticated, loadPermissions, clearPermissions]);

  useEffect(() => {
    api
      .get<ApiResponse<AppSettingsResponse>>('/settings/general/public')
      .then(({ data }) => setAppName(data.data.appName || 'Sale CRM'))
      .catch(() => undefined);

    const onSettings = (e: Event) => {
      const detail = (e as CustomEvent<AppSettingsResponse>).detail;
      if (detail?.appName) setAppName(detail.appName);
    };
    window.addEventListener('sale-crm-app-settings', onSettings);
    return () => window.removeEventListener('sale-crm-app-settings', onSettings);
  }, []);

  // Keep system theme in sync
  useEffect(() => {
    if (!uiHydrated || themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const state = useUiSettingsStore.getState();
      applyUiSettings({
        themeMode: state.themeMode,
        themeColor: state.themeColor,
        navLayout: state.navLayout,
        showFooter: state.showFooter,
        compactHeader: state.compactHeader,
      });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [uiHydrated, themeMode]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && canPerm(SHOP_PERMISSION_KEYS.inquiries)) {
      api
        .get<ApiResponse<number>>('/inquiries/count?status=NEW')
        .then(({ data }) => setNewInquiryCount(Number(data.data) || 0))
        .catch(() => setNewInquiryCount(0));
    } else {
      setNewInquiryCount(0);
    }
    if (isAuthenticated && canPerm(SHOP_PERMISSION_KEYS.orders)) {
      api
        .get<ApiResponse<number>>('/orders/count?status=AWAITING_CONFIRMATION')
        .then(({ data }) => setPendingOrderCount(Number(data.data) || 0))
        .catch(() => setPendingOrderCount(0));
    } else {
      setPendingOrderCount(0);
    }
  }, [isAuthenticated, user, pathname, canPerm, permissionsLoaded]);

  useEffect(() => {
    if (!permissionsLoaded || !isAuthenticated) return;
    if (!isPathAllowed(pathname, permissionLevels)) {
      router.replace(resolveHomePath(permissionLevels));
    }
  }, [permissionsLoaded, isAuthenticated, pathname, permissionLevels, router]);

  useEffect(() => {
    if (isAuthenticated && canPerm(CRM_PERMISSION_KEYS.branchAll)) {
      api.get<ApiResponse<BranchResponse[]>>('/branches').then(({ data }) => {
        setBranches(data.data);
      });
    }
  }, [isAuthenticated, canPerm, permissionsLoaded]);

  useEffect(() => {
    if (user) {
      setSelectedBranchId(user.branchId?.toString() || 'all');
    }
  }, [user]);

  const shopActive =
    pathname.startsWith('/shop-dashboard') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/inquiries') ||
    pathname.startsWith('/shop-users');

  const salesActive = pathname.startsWith('/sales');

  useEffect(() => {
    if (shopActive) setShopMenuOpen(true);
  }, [shopActive]);

  useEffect(() => {
    if (salesActive) setSalesMenuOpen(true);
  }, [salesActive]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] text-sm text-[#8c8c8c]">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const homePath = permissionsLoaded ? resolveHomePath(permissionLevels) : '/crm-history';
  const showCrmDashboard = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.dashboard);
  const showCrmHistory = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.crmView);
  const showShowcase = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.showcase);
  const showSales = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.sales);
  const showPerformance = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.performance);
  const showReport = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.report);
  const showHelp = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.help);
  const showApiDocs = permissionsLoaded && canPerm(CRM_PERMISSION_KEYS.apiDocs);
  const showNewRecord = permissionsLoaded && canEditCrm();
  const showBranchFilter = canPerm(CRM_PERMISSION_KEYS.branchAll) && branches.length > 0;
  const useSide = navLayout === 'side' || navLayout === 'mix';
  const useTopNav = navLayout === 'top' || navLayout === 'mix';
  const headerH = compactHeader ? 'h-12' : 'h-14';

  const handleBranchChange = (value: string) => {
    setSelectedBranchId(value);
    const params = new URLSearchParams(window.location.search);
    if (value === 'all') {
      params.delete('branchId');
    } else {
      params.set('branchId', value);
    }
    if (pathname.startsWith('/crm-history')) {
      params.set('page', '0');
      router.push(`/crm-history?${params.toString()}`);
    } else if (pathname.startsWith('/performance')) {
      router.push(`/performance?${params.toString()}`);
    } else if (pathname.startsWith('/dashboard')) {
      router.push(`/dashboard?${params.toString()}`);
    } else if (pathname.startsWith('/report')) {
      router.push(`/report?${params.toString()}`);
    } else if (pathname.startsWith('/products')) {
      router.push(`/products?${params.toString()}`);
    }
  };

  const handleLogout = () => {
    clearPermissions();
    logout();
    router.push('/login');
  };

  const navItem = (active: boolean, side = false) =>
    cn(
      side
        ? 'h-9 w-full justify-start rounded px-3 text-sm font-normal'
        : 'h-8 rounded px-3 text-sm font-normal',
      active
        ? side
          ? 'bg-primary/15 text-primary'
          : 'bg-transparent text-primary shadow-none hover:bg-transparent hover:text-primary'
        : side
          ? 'text-neutral-300 hover:bg-white/5 hover:text-white'
          : 'text-muted-foreground hover:bg-transparent hover:text-foreground'
    );

  const shopBadgeCount = newInquiryCount + pendingOrderCount;

  const shopSubLinks = [
    {
      href: '/shop-dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      match: (p: string) => p.startsWith('/shop-dashboard'),
      permission: SHOP_PERMISSION_KEYS.dashboard,
    },
    {
      href: '/products',
      label: 'Products',
      icon: Package,
      match: (p: string) => p.startsWith('/products'),
      permission: SHOP_PERMISSION_KEYS.products,
    },
    {
      href: '/orders',
      label: 'Orders',
      icon: ShoppingBag,
      match: (p: string) => p.startsWith('/orders'),
      badge: pendingOrderCount,
      permission: SHOP_PERMISSION_KEYS.orders,
    },
    {
      href: '/inquiries',
      label: 'Inquiries',
      icon: MessageSquareHeart,
      match: (p: string) => p.startsWith('/inquiries'),
      badge: newInquiryCount,
      permission: SHOP_PERMISSION_KEYS.inquiries,
    },
    {
      href: '/shop-users',
      label: 'Users',
      icon: Users,
      match: (p: string) => p.startsWith('/shop-users'),
      permission: SHOP_PERMISSION_KEYS.users,
    },
  ].filter((link) => permissionsLoaded && canPerm(link.permission));

  const showShopMenu = shopSubLinks.length > 0;

  const salesSubLinks = [
    {
      href: '/sales/overview',
      label: 'Overview',
      match: (p: string) => p.startsWith('/sales/overview'),
    },
    {
      href: '/sales/chairman',
      label: 'Chairman',
      match: (p: string) => p.startsWith('/sales/chairman'),
    },
    {
      href: '/sales/staff',
      label: 'Staff',
      match: (p: string) => p.startsWith('/sales/staff'),
    },
    {
      href: '/sales/cm',
      label: 'CM View',
      match: (p: string) => p.startsWith('/sales/cm'),
    },
    {
      href: '/sales/crm',
      label: 'CRM',
      match: (p: string) => p.startsWith('/sales/crm'),
    },
    {
      href: '/sales/detail',
      label: 'Detail',
      match: (p: string) => p.startsWith('/sales/detail'),
    },
    {
      href: '/sales/data',
      label: 'Sales Data',
      match: (p: string) => p.startsWith('/sales/data'),
    },
  ];

  type MobileTab = {
    id: string;
    href: string;
    label: string;
    icon: LucideIcon;
    match: (p: string) => boolean;
    badge?: number;
  };

  const mobilePrimaryTabs: MobileTab[] = (() => {
    const tabs: MobileTab[] = [];
    const shopOnly = showShopMenu && !showCrmHistory && !showCrmDashboard;

    if (shopOnly) {
      for (const link of shopSubLinks.slice(0, 4)) {
        tabs.push({
          id: link.href,
          href: link.href,
          label: link.label,
          icon: link.icon,
          match: link.match,
          badge: 'badge' in link ? link.badge : undefined,
        });
      }
      return tabs;
    }

    if (showCrmDashboard) {
      tabs.push({
        id: 'dashboard',
        href: '/dashboard',
        label: 'Home',
        icon: LayoutDashboard,
        match: (p) => p.startsWith('/dashboard') && !p.startsWith('/shop-dashboard'),
      });
    }
    if (showCrmHistory) {
      tabs.push({
        id: 'crm',
        href: '/crm-history',
        label: 'CRM',
        icon: History,
        match: (p) =>
          p === '/crm-history' ||
          (p.startsWith('/crm-history/') && !p.endsWith('/new') && !p.includes('/edit')),
      });
    }
    if (showShowcase && tabs.length < 4) {
      tabs.push({
        id: 'showcase',
        href: '/showcase',
        label: 'Case',
        icon: LayoutGrid,
        match: (p) => p.startsWith('/showcase'),
      });
    }
    if (showShopMenu) {
      const first = shopSubLinks[0];
      tabs.push({
        id: 'shop',
        href: first?.href || '/shop-dashboard',
        label: 'Shop',
        icon: Store,
        match: () => shopActive,
        badge: shopBadgeCount,
      });
    }
    if (showNewRecord && tabs.length < 4) {
      tabs.push({
        id: 'new',
        href: '/crm-history/new',
        label: 'New',
        icon: Plus,
        match: (p) => p === '/crm-history/new',
      });
    }
    return tabs.slice(0, 4);
  })();

  const mobileTitle = (() => {
    if (pathname.startsWith('/shop-dashboard')) return 'Shop Dashboard';
    if (pathname.startsWith('/products')) return 'Products';
    if (pathname.startsWith('/orders')) return 'Orders';
    if (pathname.startsWith('/inquiries')) return 'Inquiries';
    if (pathname.startsWith('/shop-users')) return 'Shop Users';
    if (pathname.startsWith('/crm-history/new')) return 'New Record';
    if (pathname.includes('/crm-history/') && pathname.includes('/edit')) return 'Edit Record';
    if (pathname.match(/\/crm-history\/\d+$/)) return 'Record';
    if (pathname.startsWith('/crm-history')) return 'CRM History';
    if (pathname.startsWith('/showcase')) return 'Show Case';
    if (pathname.startsWith('/sales/overview')) return 'Sales — Overview';
    if (pathname.startsWith('/sales/chairman')) return 'Sales — Chairman';
    if (pathname.startsWith('/sales/staff')) return 'Sales — Staff';
    if (pathname.startsWith('/sales/cm')) return 'Sales — CM View';
    if (pathname.startsWith('/sales/crm')) return 'Sales — CRM';
    if (pathname.startsWith('/sales/detail')) return 'Sales — Detail';
    if (pathname.startsWith('/sales/data')) return 'Sales — Data';
    if (pathname.startsWith('/sales')) return 'Sales';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/performance')) return 'Performance';
    if (pathname.startsWith('/report')) return 'Report';
    if (pathname.startsWith('/help')) return 'How to use';
    if (pathname.startsWith('/api-docs')) return 'API Docs';
    if (pathname.startsWith('/settings/profile')) return 'Profile';
    if (pathname.startsWith('/settings/appearance')) return 'Appearance';
    if (pathname.startsWith('/settings/users')) return 'Users';
    if (pathname.startsWith('/settings/branches')) return 'Branches';
    if (pathname.startsWith('/settings/permissions')) return 'Permissions';
    if (pathname.startsWith('/settings/backup')) return 'Backup';
    if (pathname.startsWith('/settings/change-logs')) return 'Change Logs';
    if (pathname.startsWith('/settings/system-logs')) return 'System Logs';
    if (pathname.startsWith('/settings/general')) return 'General';
    if (pathname.startsWith('/settings')) return 'Settings';
    return appName;
  })();

  const goMobile = (href: string) => {
    setMoreOpen(false);
    router.push(href);
  };

  const navButtons = (side = false) => (
    <>
      {showCrmDashboard && (
        <Button
          variant="ghost"
          className={navItem(pathname.startsWith('/dashboard') && !pathname.startsWith('/shop-dashboard'), side)}
          onClick={() => router.push('/dashboard')}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Button>
      )}
      {showCrmHistory && (
        <Button
          variant="ghost"
          className={navItem(
            pathname === '/crm-history' ||
              (pathname.startsWith('/crm-history/') &&
                !pathname.endsWith('/new') &&
                !pathname.includes('/edit')),
            side
          )}
          onClick={() => router.push('/crm-history')}
        >
          <History className="h-3.5 w-3.5" />
          CRM History
        </Button>
      )}
      {showShowcase && (
        <Button
          variant="ghost"
          className={navItem(pathname.startsWith('/showcase'), side)}
          onClick={() => router.push('/showcase')}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Show Case
        </Button>
      )}
      {showSales &&
        (side ? (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setSalesMenuOpen((o) => !o)}
              className={cn(navItem(salesActive, true), 'flex w-full items-center gap-2')}
            >
              <LineChart className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">Sales</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform',
                  salesMenuOpen && 'rotate-180'
                )}
              />
            </button>
            {salesMenuOpen && (
              <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                {salesSubLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className={cn(navItem(link.match(pathname), true), 'h-8 pl-2')}
                    onClick={() => router.push(link.href)}
                  >
                    <span className="flex-1 text-left">{link.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={navItem(salesActive, false)}>
                <LineChart className="h-3.5 w-3.5" />
                Sales
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Sales</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {salesSubLinks.map((link) => (
                <DropdownMenuItem
                  key={link.href}
                  className={cn(link.match(pathname) && 'bg-accent text-accent-foreground')}
                  onSelect={() => router.push(link.href)}
                >
                  <span className="flex-1">{link.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      {showPerformance && (
        <Button
          variant="ghost"
          className={navItem(pathname.startsWith('/performance'), side)}
          onClick={() => router.push('/performance')}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Performance
        </Button>
      )}
      {showReport && (
        <Button
          variant="ghost"
          className={navItem(pathname.startsWith('/report'), side)}
          onClick={() => router.push('/report')}
        >
          <FileBarChart className="h-3.5 w-3.5" />
          Report
        </Button>
      )}
      {showHelp && (
        <Button
          variant="ghost"
          className={navItem(pathname.startsWith('/help'), side)}
          onClick={() => router.push('/help')}
        >
          <BookOpen className="h-3.5 w-3.5" />
          How to use
        </Button>
      )}
      {showApiDocs && (
        <Button
          variant="ghost"
          className={navItem(pathname.startsWith('/api-docs'), side)}
          onClick={() => router.push('/api-docs')}
        >
          <Code2 className="h-3.5 w-3.5" />
          API Docs
        </Button>
      )}

      {showShopMenu &&
        (side ? (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setShopMenuOpen((o) => !o)}
              className={cn(navItem(shopActive, true), 'flex w-full items-center gap-2')}
            >
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">Shop</span>
              <AlertDot count={shopBadgeCount} />
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform',
                  shopMenuOpen && 'rotate-180'
                )}
              />
            </button>
            {shopMenuOpen && (
              <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                {shopSubLinks.map((link) => {
                  const Icon = link.icon;
                  const active = link.match(pathname);
                  const badge = 'badge' in link ? (link.badge ?? 0) : 0;
                  return (
                    <Button
                      key={link.href}
                      variant="ghost"
                      className={cn(navItem(active, true), 'h-8 pl-2')}
                      onClick={() => router.push(link.href)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="flex-1 text-left">{link.label}</span>
                      <AlertDot count={badge} />
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={navItem(shopActive, false)}>
                <Store className="h-3.5 w-3.5" />
                Shop
                <AlertDot count={shopBadgeCount} />
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Shop</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {shopSubLinks.map((link) => {
                const Icon = link.icon;
                const active = link.match(pathname);
                const badge = 'badge' in link ? (link.badge ?? 0) : 0;
                return (
                  <DropdownMenuItem
                    key={link.href}
                    className={cn(active && 'bg-accent text-accent-foreground')}
                    onSelect={() => router.push(link.href)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1">{link.label}</span>
                    <AlertDot count={badge} />
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

      {showNewRecord && (
        <Button
          variant="ghost"
          className={navItem(pathname === '/crm-history/new', side)}
          onClick={() => router.push('/crm-history/new')}
        >
          <Plus className="h-3.5 w-3.5" />
          New Record
        </Button>
      )}
    </>
  );

  return (
    <div className="crm-app flex h-screen overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      {useSide && (
        <aside className="hidden w-[220px] shrink-0 flex-col bg-[#001529] text-white md:flex">
          <button
            type="button"
            onClick={() => router.push(homePath)}
            className={cn(
              'flex items-center gap-2 border-b border-white/10 px-4 text-[15px] font-semibold text-white',
              headerH
            )}
          >
            <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
            {appName}
          </button>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">{navButtons(true)}</nav>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop header */}
        <header className="z-40 hidden shrink-0 border-b border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
          <div className={cn('flex items-center gap-4 px-5', headerH)}>
            {!useSide && (
              <button
                type="button"
                onClick={() => router.push(homePath)}
                className="flex items-center gap-2 text-[15px] font-semibold text-primary"
              >
                <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
                {appName}
              </button>
            )}

            {useTopNav && <nav className="flex items-center gap-1">{navButtons(false)}</nav>}

            <div className="ml-auto flex items-center gap-3">
              {showBranchFilter && (
                <Select value={selectedBranchId} onValueChange={handleBranchChange}>
                  <SelectTrigger className="h-8 w-[180px] rounded border-[#d9d9d9] bg-white text-sm shadow-none dark:border-neutral-700 dark:bg-neutral-900">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded px-1.5 py-1 text-sm text-[#595959] hover:bg-[#f5f5f5] dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.username}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#8c8c8c]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.fullName}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="space-y-1 px-2 py-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span>{user.role}</span>
                    </div>
                    {user.branchName && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{user.branchName}</span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
                    <UserCircle className="h-4 w-4" />
                    Profile & Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="rounded p-1.5 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-[#595959] dark:hover:bg-neutral-800"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile sticky header */}
        <header className="crm-topbar md:hidden">
          <div className="crm-topbar-inner">
            <button
              type="button"
              onClick={() => router.push(homePath)}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
              aria-label="Home"
            >
              <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[#262626] dark:text-neutral-100">
                {mobileTitle}
              </p>
              {user.branchName && (
                <p className="truncate text-[11px] text-[#8c8c8c]">{user.branchName}</p>
              )}
            </div>
            {showBranchFilter && (
              <Select value={selectedBranchId} onValueChange={handleBranchChange}>
                <SelectTrigger className="h-8 w-[7.5rem] rounded border-[#d9d9d9] bg-white text-xs shadow-none dark:border-neutral-700 dark:bg-neutral-900">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              onClick={() => router.push('/settings/profile')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-white"
              aria-label="Profile"
            >
              {user.username.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <main
          className={cn(
            'crm-app-main min-h-0 flex-1',
            pathname.startsWith('/performance') ||
              pathname.startsWith('/dashboard') ||
              pathname.startsWith('/shop-dashboard') ||
              pathname.startsWith('/report') ||
              pathname.startsWith('/settings') ||
              pathname.startsWith('/products') ||
              pathname.startsWith('/inquiries') ||
              pathname.startsWith('/orders') ||
              pathname.startsWith('/shop-users') ||
              pathname.startsWith('/api-docs') ||
              pathname.startsWith('/help') ||
              pathname === '/crm-history/new' ||
              (pathname.includes('/crm-history/') && pathname.endsWith('/edit'))
              ? 'flex flex-col overflow-hidden p-0'
              : 'crm-main-padded overflow-auto md:p-6'
          )}
        >
          {children}
        </main>

        {showFooter && (
          <footer className="hidden shrink-0 border-t border-[#f0f0f0] bg-white px-5 py-2.5 text-center text-xs text-[#8c8c8c] dark:border-neutral-800 dark:bg-neutral-900 md:block">
            Copyright © {new Date().getFullYear()} {appName}. All Rights Reserved.
          </footer>
        )}

        {/* Mobile bottom nav */}
        <nav className="crm-bottom-nav md:hidden" aria-label="Primary">
          <div className="crm-bottom-nav-grid">
            {mobilePrimaryTabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.match(pathname);
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="crm-bottom-nav-item"
                  data-active={active ? 'true' : 'false'}
                  onClick={() => goMobile(tab.href)}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    <span className="absolute -right-2 -top-1">
                      <AlertDot count={tab.badge ?? 0} />
                    </span>
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="crm-bottom-nav-item"
              data-active={moreOpen || pathname.startsWith('/settings') ? 'true' : 'false'}
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>

        {moreOpen && (
          <div className="crm-more-overlay md:hidden" onClick={() => setMoreOpen(false)}>
            <div
              className="crm-more-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="More menu"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-[#262626] dark:text-neutral-100">Menu</p>
                  <p className="text-xs text-[#8c8c8c]">
                    {user.fullName} · {user.role}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] dark:bg-neutral-800"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                {showCrmDashboard && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/dashboard')}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </button>
                )}
                {showCrmHistory && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/crm-history')}>
                    <History className="h-4 w-4" /> CRM History
                  </button>
                )}
                {showShowcase && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/showcase')}>
                    <LayoutGrid className="h-4 w-4" /> Show Case
                  </button>
                )}
                {showSales && (
                  <>
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
                      Sales
                    </p>
                    {salesSubLinks.map((link) => (
                      <button
                        key={link.href}
                        type="button"
                        className="crm-more-row"
                        onClick={() => goMobile(link.href)}
                      >
                        <LineChart className="h-4 w-4" /> {link.label}
                      </button>
                    ))}
                  </>
                )}
                {showNewRecord && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/crm-history/new')}>
                    <Plus className="h-4 w-4" /> New Record
                  </button>
                )}
                {showPerformance && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/performance')}>
                    <BarChart3 className="h-4 w-4" /> Performance
                  </button>
                )}
                {showReport && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/report')}>
                    <FileBarChart className="h-4 w-4" /> Report
                  </button>
                )}
                {showHelp && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/help')}>
                    <BookOpen className="h-4 w-4" /> How to use
                  </button>
                )}
                {showApiDocs && (
                  <button type="button" className="crm-more-row" onClick={() => goMobile('/api-docs')}>
                    <Code2 className="h-4 w-4" /> API Docs
                  </button>
                )}

                {showShopMenu && (
                  <>
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
                      Shop
                    </p>
                    {shopSubLinks.map((link) => {
                      const Icon = link.icon;
                      const badge = 'badge' in link ? (link.badge ?? 0) : 0;
                      return (
                        <button
                          key={link.href}
                          type="button"
                          className="crm-more-row"
                          onClick={() => goMobile(link.href)}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{link.label}</span>
                          <AlertDot count={badge} />
                        </button>
                      );
                    })}
                  </>
                )}

                <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
                  Account
                </p>
                <button type="button" className="crm-more-row" onClick={() => goMobile('/settings/profile')}>
                  <UserCircle className="h-4 w-4" /> Profile & Account
                </button>
                <button type="button" className="crm-more-row" onClick={() => goMobile('/settings')}>
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  type="button"
                  className="crm-more-row text-red-600"
                  onClick={() => {
                    setMoreOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
