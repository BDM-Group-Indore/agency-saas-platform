'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRoleStore, UserRole } from '@/store/roleStore';
import { useAuthStore } from '@/store/authStore';
import { BASE_URL } from '@/lib/api';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity, Users, Flame } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { setRole, setVerifiedRole } = useRoleStore();
  const setCsrfToken = useAuthStore((state) => state.setCsrfToken);
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick Demo Accounts config for शिवम (client demo convenience)
  const demoAccounts = [
    { email: 'owner@agency.com', role: 'Agency Owner' as UserRole, name: 'Shivam (Owner)' },
    { email: 'sales@agency.com', role: 'Sales' as UserRole, name: 'Amit (Sales)' },
    { email: 'client@brand.com', role: 'Client' as UserRole, name: 'Rahul (Client)' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        // Save tokens securely in cookies and store csrfToken in memory
        setCsrfToken(data.csrfToken);
        setIsAuthenticated(true);
        
        // Map backend user role to Shivam's client-centric mockup role
        const backendRole = data.user.role;
        let resolvedRole: UserRole = 'Agency Owner';
        
        if (backendRole === 'SUPER_ADMIN') resolvedRole = 'Super Admin';
        else if (backendRole === 'AGENCY_OWNER') resolvedRole = 'Agency Owner';
        else if (backendRole === 'MANAGER') resolvedRole = 'Manager';
        else if (backendRole === 'SALES') resolvedRole = 'Sales';
        else if (backendRole === 'SUPPORT') resolvedRole = 'Support';
        else if (backendRole === 'CLIENT') resolvedRole = 'Client';

        setVerifiedRole(resolvedRole);
        setIsLoading(false);
        router.push('/dashboard');
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Verification failure');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to sign in');
      setIsLoading(false);
    }
  };

  const selectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword('demopass123');
    setRole(acc.role);
  };

  return (
    <main className="app-shell flex min-h-screen flex-col overflow-hidden text-[color:var(--app-text)] md:flex-row">
      <section className="relative hidden md:flex md:w-1/2 flex-col justify-between border-r border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-12">
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-enterprise-sm">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-xl tracking-tight text-[color:var(--app-text)]">
            AdPulse<span className="text-primary">.ai</span>
          </span>
        </div>

        <div className="my-auto max-w-lg relative z-10 flex flex-col gap-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold self-start uppercase tracking-wide">
            Enterprise Advertising Operating System
          </span>
          <h1 className="text-4xl lg:text-5xl font-display font-black tracking-tight leading-tight text-[color:var(--app-text)]">
            Scale Your Ad Agency <br />
            <span className="text-primary">10x Faster with AI & CRM</span>
          </h1>
          <p className="text-[color:var(--app-text-muted)] text-sm leading-relaxed">
            Consolidate your Meta & Google ad management, automatic WhatsApp follow-up, high-velocity CRM pipelines, and transparent client reporting into a unified enterprise workspace.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[color:var(--app-border)]">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black font-display">4.2x</span>
              <span className="text-xs text-[color:var(--app-text-muted)] font-bold uppercase tracking-wide">Average ROAS</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black font-display">12M+</span>
              <span className="text-xs text-[color:var(--app-text-muted)] font-bold uppercase tracking-wide">Leads Routed</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black font-display">88%</span>
              <span className="text-xs text-[color:var(--app-text-muted)] font-bold uppercase tracking-wide">Follow-up Saved</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 text-xs text-[color:var(--app-text-muted)]">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>Enterprise workspace security profile</span>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center p-6 relative">
        <div className="enterprise-card w-full max-w-md p-8 relative z-10">
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="text-2xl font-display font-black tracking-tight text-[color:var(--app-text)]">
              Sign In
            </h2>
            <p className="text-xs text-[color:var(--app-text-muted)]">
              Access your digital command center.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 text-xs bg-danger/10 border border-danger/20 text-danger rounded-lg font-medium">
                {error}
              </div>
            )}

            <Input
              label="Work Email"
              type="email"
              placeholder="e.g. shivam@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary-hover hover:underline transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5 justify-center">
                  Launch Console <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {isDemoMode && (
          <div className="mt-8 pt-6 border-t border-[color:var(--app-border)]">
            <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--app-text-muted)] block mb-3">
              Quick Role Demo (Click to Prefill)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => selectDemoAccount(acc)}
                  className="px-2 py-2 rounded-lg bg-[color:var(--app-surface-secondary)] hover:bg-primary/10 border border-[color:var(--app-border)] hover:border-primary/30 text-[10px] font-semibold text-[color:var(--app-text-muted)] transition-premium cursor-pointer text-left flex flex-col justify-between h-14"
                >
                  <span className="text-[color:var(--app-text)] block truncate">{acc.name}</span>
                  <span className="text-primary truncate block uppercase text-[8px]">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
          )}

          <p className="text-xs text-center text-[color:var(--app-text-muted)] mt-6">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-primary hover:text-primary-hover hover:underline font-semibold"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
