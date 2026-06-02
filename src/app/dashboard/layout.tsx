'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { useRoleStore, UserRole } from '@/store/roleStore';
import { roleDetails } from '@/data/mockData';
import {
  LayoutDashboard,
  UserPlus,
  Network,
  MessageSquare,
  Megaphone,
  BarChart3,
  CreditCard,
  LifeBuoy,
  Settings,
  Flame,
  Sun,
  Moon,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  User as UserIcon,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();
  const { currentRole, setRole } = useRoleStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fixed Sidebar structure (Never change after approval)
  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Leads', icon: UserPlus, path: '/dashboard/leads' },
    { name: 'CRM', icon: Network, path: '/dashboard/crm' },
    { name: 'WhatsApp', icon: MessageSquare, path: '/dashboard/whatsapp' },
    { name: 'Ads', icon: Megaphone, path: '/dashboard/ads' },
    { name: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    { name: 'Billing', icon: CreditCard, path: '/dashboard/billing' },
    { name: 'Support', icon: LifeBuoy, path: '/dashboard/support' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  // Dynamic Navigation adaptions based on current role (Mockup system)
  const isItemAllowedForRole = (itemName: string, role: UserRole) => {
    if (role === 'Super Admin' || role === 'Agency Owner') return true;
    if (role === 'Client') {
      // Clients only see Dashboard, Ads, Analytics, Billing, Support
      return ['Dashboard', 'Ads', 'Analytics', 'Billing', 'Support'].includes(itemName);
    }
    if (role === 'Sales') {
      // Sales focuses on Leads, CRM, WhatsApp, Support
      return ['Dashboard', 'Leads', 'CRM', 'WhatsApp', 'Support'].includes(itemName);
    }
    if (role === 'Support') {
      // Support focuses on Support, CRM, WhatsApp, Settings
      return ['Dashboard', 'CRM', 'WhatsApp', 'Support', 'Settings'].includes(itemName);
    }
    if (role === 'Manager') {
      // Managers see everything except advanced billing details
      return itemName !== 'Billing';
    }
    return true;
  };

  const handleRoleChange = (role: UserRole) => {
    setRole(role);
    setIsRoleDropdownOpen(false);
    // Push dummy notification
    const detail = roleDetails[role];
    console.log(`Switched to mock role: ${role}`);
  };

  const handleLogout = () => {
    router.push('/login');
  };

  const activeRoleConfig = roleDetails[currentRole];

  return (
    <ThemeProvider>
      <div className="min-h-screen flex bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-slate-200">
        
        {/* Sidebar Component (Desktop) */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card/90 backdrop-blur-md transition-premium relative z-30 shrink-0 h-screen sticky top-0',
            isSidebarOpen ? 'w-64' : 'w-20'
          )}
        >
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-dark-border gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/10 shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                AdPulse<span className="text-primary font-bold">.ai</span>
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isAllowed = isItemAllowedForRole(item.name, currentRole);
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path));
              
              if (!isAllowed) return null;

              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-medium rounded-xl transition-premium cursor-pointer group relative',
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/15'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-950 dark:hover:text-slate-100'
                  )}
                  title={!isSidebarOpen ? item.name : undefined}
                >
                  <item.icon className={cn('w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110')} />
                  {isSidebarOpen && <span className="truncate">{item.name}</span>}
                  
                  {/* Tooltip on collapse */}
                  {!isSidebarOpen && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {item.name}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Role Status Tag (Sidebar Footer) */}
          <div className="p-4.5 border-t border-slate-200 dark:border-dark-border">
            <div className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl transition-premium',
              isSidebarOpen ? 'bg-slate-50 dark:bg-slate-800/30' : 'justify-center bg-transparent'
            )}>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {currentRole[0]}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentRole}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">
                    Dynamic Mode
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Sidebar Component (Mobile Drawer Overlay) */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Drawer */}
            <aside className="relative w-64 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border flex flex-col h-full z-10 p-5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
                    <Flame className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="font-display font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    AdPulse.ai
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Sidebar Items */}
              <nav className="flex-1 space-y-1.5">
                {sidebarItems.map((item) => {
                  const isAllowed = isItemAllowedForRole(item.name, currentRole);
                  const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path));
                  
                  if (!isAllowed) return null;

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.path);
                        setIsMobileOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-premium cursor-pointer',
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/10'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100'
                      )}
                    >
                      <item.icon className="w-4.5 h-4.5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Role Details */}
              <div className="pt-4 border-t border-slate-200 dark:border-dark-border mt-auto">
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {currentRole[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{currentRole}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Active Profile</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Viewport Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          
          {/* Top Navbar Header Component */}
          <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-200 dark:border-dark-border bg-white/75 dark:bg-dark-card/75 backdrop-blur-md sticky top-0 z-20">
            
            {/* Left Side: Collapse/Mobile Trigger & Title */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-dark-border md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Toggle Sidebar */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex p-1.5 rounded-lg border border-slate-200 dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-premium"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>

              {/* Dynamic Page Title based on path */}
              <h2 className="text-base md:text-lg font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight capitalize select-none">
                {pathname === '/dashboard'
                  ? 'Overview'
                  : pathname?.split('/').pop()?.replace('-', ' ') || 'SaaS Console'}
              </h2>
            </div>

            {/* Right Side: Global controls, switcher & profile */}
            <div className="flex items-center gap-3">
              
              {/* Dynamic Interactive Role Switcher for शिवम client feedback */}
              <div className="relative">
                <button
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-dark-border hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-premium cursor-pointer"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Role: {currentRole}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {isRoleDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsRoleDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel text-slate-900 dark:text-slate-100 shadow-2xl p-4 flex flex-col gap-2 z-50 border border-slate-200 dark:border-slate-800">
                      <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-1">
                        <span className="text-xs font-bold block text-slate-900 dark:text-white">
                          Prototype Role Switcher
                        </span>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                          Change mock roles to test adaptive sidebar layouts and security dashboard permissions instantly.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pr-1">
                        {(['Super Admin', 'Agency Owner', 'Manager', 'Sales', 'Support', 'Client'] as UserRole[]).map((role) => (
                          <button
                            key={role}
                            onClick={() => handleRoleChange(role)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium transition-premium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70',
                              currentRole === role ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-600 dark:text-slate-300'
                            )}
                          >
                            <span>{role}</span>
                            {currentRole === role && (
                              <span className="text-[9px] uppercase font-bold text-primary tracking-wider bg-primary/15 px-1.5 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Role Description:</span>
                        <p className="text-[10px] text-slate-400 leading-normal bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                          {activeRoleConfig.description}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Theme Toggle (Light/Dark Mode) */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-premium relative overflow-hidden group shadow-sm"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4.5 h-4.5 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-indigo-500 transition-transform duration-300 group-hover:-rotate-12" />
                )}
              </button>

              {/* Notifications bell */}
              <button className="p-2 rounded-xl border border-slate-200 dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer shadow-sm relative">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              </button>

              {/* User Avatar & Settings Drawer Shortcut */}
              <div className="h-9 w-px bg-slate-200 dark:bg-dark-border" />
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 hover:scale-105 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-display font-bold text-xs tracking-tight shadow-md cursor-pointer transition-premium"
                  title="Logout"
                >
                  SG
                </button>
              </div>
            </div>
          </header>

          {/* Main Module Layout Page Container */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-dark-bg/40">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
