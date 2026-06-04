'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Building,
  ChevronDown,
  CreditCard,
  Flame,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  Network,
  Plus,
  Search,
  Settings,
  Store,
  Sun,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { roleDetails } from '@/data/mockData';
import { useRoleStore, UserRole } from '@/store/roleStore';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Leads', icon: UserPlus, path: '/dashboard/leads' },
  { name: 'CRM', icon: Network, path: '/dashboard/crm' },
  { name: 'WhatsApp', icon: MessageSquare, path: '/dashboard/whatsapp' },
  { name: 'Ads', icon: Megaphone, path: '/dashboard/ads' },
  { name: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { name: 'Billing', icon: CreditCard, path: '/dashboard/billing' },
  { name: 'Reseller Panel', icon: Building, path: '/dashboard/reseller' },
  { name: 'Franchise Panel', icon: Store, path: '/dashboard/franchise' },
  { name: 'Support', icon: LifeBuoy, path: '/dashboard/support' },
  { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
] as const;

function isItemAllowedForRole(itemName: string, role: UserRole) {
  if (['Reseller Panel', 'Franchise Panel'].includes(itemName)) {
    return role === 'Super Admin' || role === 'Agency Owner';
  }
  if (role === 'Super Admin' || role === 'Agency Owner') return true;
  if (role === 'Client') return ['Dashboard', 'Ads', 'Analytics', 'Billing', 'Support'].includes(itemName);
  if (role === 'Sales') return ['Dashboard', 'Leads', 'CRM', 'WhatsApp', 'Support'].includes(itemName);
  if (role === 'Support') return ['Dashboard', 'CRM', 'WhatsApp', 'Support', 'Settings'].includes(itemName);
  if (role === 'Manager') return !['Billing', 'Reseller Panel', 'Franchise Panel'].includes(itemName);
  return true;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();
  const { currentRole, setRole, setVerifiedRole } = useRoleStore();
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branding, setBranding] = useState<{
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  } | null>(null);
  const [childTenants, setChildTenants] = useState<any[]>([]);
  const [activeSwitchTenantId, setActiveSwitchTenantId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await apiRequest('/auth/me');
        if (user && user.role) {
          let resolvedRole: UserRole = 'Agency Owner';
          if (user.role === 'SUPER_ADMIN') resolvedRole = 'Super Admin';
          else if (user.role === 'AGENCY_OWNER') resolvedRole = 'Agency Owner';
          else if (user.role === 'MANAGER') resolvedRole = 'Manager';
          else if (user.role === 'SALES') resolvedRole = 'Sales';
          else if (user.role === 'SUPPORT') resolvedRole = 'Support';
          else if (user.role === 'CLIENT') resolvedRole = 'Client';
          
          setVerifiedRole(resolvedRole);
        }
      } catch (err) {
        router.replace('/login');
        return;
      }

      const swId = localStorage.getItem('activeSwitchTenantId');
      setActiveSwitchTenantId(swId);
      
      fetchBranding();
      fetchTenants();
    };

    const fetchBranding = async () => {
      try {
        const data = await apiRequest('/enterprise/branding');
        setBranding({
          name: data.companyName || data.name || 'AdPulse',
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor || '#6d28d9',
          secondaryColor: data.secondaryColor || '#0f172a',
        });

        if (typeof document !== 'undefined' && data.primaryColor) {
          document.documentElement.style.setProperty('--color-primary', data.primaryColor);
          document.documentElement.style.setProperty('--app-primary', data.primaryColor);
        }
      } catch (err) {
        console.warn('Failed to load branding:', err);
      }
    };

    const fetchTenants = async () => {
      if (currentRole === 'Super Admin' || currentRole === 'Agency Owner') {
        try {
          const data = await apiRequest('/enterprise/tenants');
          setChildTenants(data);
        } catch (err) {
          console.warn('Failed to fetch child tenants:', err);
        }
      }
    };

    checkAuth();
  }, [router, currentRole]);

  const activeRoleConfig = roleDetails[currentRole];
  const activeTenantName = childTenants.find((tenant) => tenant.id === activeSwitchTenantId)?.name;
  const pageTitle = useMemo(() => {
    if (pathname === '/dashboard') return 'Overview';
    return pathname?.split('/').pop()?.replace('-', ' ') || 'SaaS Console';
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (err) {
      console.warn('Logout API call failed; clearing session anyway.', err);
    }
    useAuthStore.getState().clearAuth();
    router.push('/login');
  };

  const handleTenantSwitch = (tenantId: string | null) => {
    if (tenantId) {
      localStorage.setItem('activeSwitchTenantId', tenantId);
    } else {
      localStorage.removeItem('activeSwitchTenantId');
    }
    setActiveSwitchTenantId(tenantId);
    setIsTenantDropdownOpen(false);
    window.location.reload();
  };

  const renderNavigation = (compact = false) => (
    <nav className={cn('flex flex-col gap-1.5', compact ? 'px-3' : 'px-4')}>
      {sidebarItems.map((item) => {
        const isAllowed = isItemAllowedForRole(item.name, currentRole);
        const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path));
        if (!isAllowed) return null;

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => {
              router.push(item.path);
              setIsMobileOpen(false);
            }}
            className={cn(
              'focus-enterprise group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold transition-premium',
              isActive
                ? 'bg-primary text-white shadow-enterprise-sm'
                : 'text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-secondary)] hover:text-[color:var(--app-text)]',
              !isSidebarOpen && !compact && 'justify-center px-2'
            )}
            title={!isSidebarOpen && !compact ? item.name : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {(isSidebarOpen || compact) && <span className="truncate">{item.name}</span>}
            {!isSidebarOpen && !compact && (
              <span className="pointer-events-none absolute left-full ml-3 rounded-md bg-[color:var(--app-text)] px-2 py-1 text-xs font-semibold text-[color:var(--app-surface)] opacity-0 shadow-enterprise-sm transition-premium group-hover:opacity-100">
                {item.name}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
      <div className="app-shell flex min-h-screen text-[color:var(--app-text)]">
        <aside
          className={cn(
            'sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[color:var(--app-border)] bg-[color:var(--app-surface)]/95 backdrop-blur-xl transition-premium md:flex',
            isSidebarOpen ? 'w-72' : 'w-20'
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b border-[color:var(--app-border)] px-4">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Workspace logo" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-enterprise-sm">
                <Flame className="h-5 w-5" />
              </div>
            )}
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight">{branding?.name || 'AdPulse.ai'}</p>
                <p className="truncate text-[11px] font-semibold text-[color:var(--app-text-muted)]">
                  Advertising command center
                </p>
              </div>
            )}
          </div>

          {isSidebarOpen && (
            <div className="px-4 py-4">
              <button
                type="button"
                onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                className="focus-enterprise flex w-full items-center justify-between rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-secondary)] px-3 py-2.5 text-left transition-premium hover:border-primary/35"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black">
                    {activeSwitchTenantId ? activeTenantName || 'Child Tenant' : 'Master Workspace'}
                  </span>
                  <span className="block truncate text-[10px] font-semibold text-[color:var(--app-text-muted)]">
                    Workspace selector
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-[color:var(--app-text-muted)]" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">{renderNavigation()}</div>

          <div className="border-t border-[color:var(--app-border)] p-4">
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg bg-[color:var(--app-surface-secondary)] p-2.5',
                !isSidebarOpen && 'justify-center'
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                {currentRole[0]}
              </div>
              {isSidebarOpen && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{currentRole}</p>
                  <p className="truncate text-[10px] font-semibold text-[color:var(--app-text-muted)]">Team switcher</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <aside className="relative flex h-full w-72 flex-col border-r border-[color:var(--app-border)] bg-[color:var(--app-surface)] shadow-enterprise-lg">
              <div className="flex h-16 items-center justify-between border-b border-[color:var(--app-border)] px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                    <Flame className="h-5 w-5" />
                  </div>
                  <span className="font-black">{branding?.name || 'AdPulse.ai'}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileOpen(false)} title="Close navigation">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">{renderNavigation(true)}</div>
            </aside>
          </div>
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[color:var(--app-border)] bg-[color:var(--app-surface)]/90 px-4 backdrop-blur-xl md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsMobileOpen(true)} className="md:hidden" title="Open navigation">
                <Menu className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:inline-flex" title="Collapse sidebar">
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-black capitalize tracking-tight md:text-lg">{pageTitle}</h1>
                <p className="hidden text-xs font-semibold text-[color:var(--app-text-muted)] sm:block">
                  {activeSwitchTenantId ? `Viewing ${activeTenantName || 'child tenant'} context` : 'Master workspace'}
                </p>
              </div>
            </div>

            <div className="hidden min-w-72 max-w-xl flex-1 md:block">
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search leads, clients, invoices, campaigns..."
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {(currentRole === 'Super Admin' || currentRole === 'Agency Owner') && (
                <div className="relative">
                  <Button
                    type="button"
                    variant={activeSwitchTenantId ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                  >
                    <Building className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{activeSwitchTenantId ? activeTenantName || 'Child Tenant' : 'Workspace'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>

                  {isTenantDropdownOpen && (
                    <>
                      <button className="fixed inset-0 z-40" type="button" aria-label="Close workspace selector" onClick={() => setIsTenantDropdownOpen(false)} />
                      <div className="enterprise-card absolute right-0 z-50 mt-2 w-72 p-3 shadow-enterprise-lg">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-black">Workspace Selector</span>
                          <Badge variant={activeSwitchTenantId ? 'warning' : 'primary'}>{activeSwitchTenantId ? 'Scoped' : 'Master'}</Badge>
                        </div>
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => handleTenantSwitch(null)}
                            className={cn(
                              'focus-enterprise rounded-lg px-3 py-2 text-left text-xs font-bold transition-premium hover:bg-[color:var(--app-surface-secondary)]',
                              !activeSwitchTenantId && 'bg-primary/10 text-primary'
                            )}
                          >
                            Master Account
                          </button>
                          {childTenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              type="button"
                              onClick={() => handleTenantSwitch(tenant.id)}
                              className={cn(
                                'focus-enterprise rounded-lg px-3 py-2 text-left text-xs font-bold transition-premium hover:bg-[color:var(--app-surface-secondary)]',
                                activeSwitchTenantId === tenant.id && 'bg-primary/10 text-primary'
                              )}
                            >
                              <span className="block truncate">{tenant.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button variant="outline" size="sm" title="Quick actions" onClick={() => alert('Quick actions coming soon')}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" title="Global search" className="md:hidden">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" title="Notifications">
                <Bell className="h-4 w-4" />
              </Button>

              <div className="relative">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden lg:inline">{currentRole}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>

                {isRoleDropdownOpen && (
                  <>
                    <button className="fixed inset-0 z-40" type="button" aria-label="Close profile menu" onClick={() => setIsRoleDropdownOpen(false)} />
                    <div className="enterprise-card absolute right-0 z-50 mt-2 w-80 p-3 shadow-enterprise-lg">
                      <div className="border-b border-[color:var(--app-border)] pb-3">
                        <p className="text-sm font-black">{currentRole}</p>
                        <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">{activeRoleConfig.description}</p>
                      </div>
                      {isDemoMode && (
                        <div className="grid grid-cols-2 gap-1 py-3">
                          {(['Super Admin', 'Agency Owner', 'Manager', 'Sales', 'Support', 'Client'] as UserRole[]).map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setRole(role);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={cn(
                                'focus-enterprise rounded-lg px-3 py-2 text-left text-xs font-bold transition-premium hover:bg-[color:var(--app-surface-secondary)]',
                                currentRole === role && 'bg-primary/10 text-primary'
                              )}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-3">
                        <Button variant="ghost" size="sm" className="flex-1">
                          <HelpCircle className="h-4 w-4" />
                          Help
                        </Button>
                        <Button variant="danger" size="sm" className="flex-1" onClick={handleLogout}>
                          Logout
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-[var(--app-space-page)]">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
  );
}
