'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, User, Building2, ShieldCheck, ArrowRight, Flame } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !agencyName || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.push('/login');
    }, 1000);
  };

  return (
    <main className="min-height-100vh flex flex-col md:flex-row overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Column: Premium Copy */}
      <section className="hidden md:flex md:w-1/2 bg-gradient-to-br from-dark-bg via-slate-900 to-indigo-950/40 p-12 flex-col justify-between relative border-r border-slate-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            AdPulse<span className="text-primary font-extrabold">.ai</span>
          </span>
        </div>

        <div className="my-auto max-w-lg relative z-10 flex flex-col gap-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold self-start uppercase tracking-wider">
            Start Your 14-Day Free Trial
          </span>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-tight text-white">
            Unleash the Power <br />
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-accent bg-clip-text text-transparent">
              of Unified Marketing
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Create your customized agency operating panel in under 60 seconds. Connect your team, sync your clients, and automate high-value pipelines from day one.
          </p>

          <div className="flex flex-col gap-3.5 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">✓</div>
              <span className="text-xs text-slate-300 font-medium">Unlimited team seats & client integrations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">✓</div>
              <span className="text-xs text-slate-300 font-medium">Full CRM with custom pipelines and Drag-and-Drop board</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">✓</div>
              <span className="text-xs text-slate-300 font-medium">AI Agent auto follow-up and WhatsApp inbox templates</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>No credit card required. Cancel anytime.</span>
        </div>
      </section>

      {/* Right Column: Sign Up Form */}
      <section className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 backdrop-blur-md relative z-10">
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">
              Create Account
            </h2>
            <p className="text-xs text-slate-400">
              Start building your enterprise digital command console.
            </p>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-danger rounded-lg font-medium">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="Shivam Gupta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />

            <Input
              label="Agency / Company Name"
              type="text"
              placeholder="Delta Marketing Agency"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              icon={<Building2 className="w-4 h-4" />}
            />

            <Input
              label="Work Email"
              type="email"
              placeholder="shivam@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Choose Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5 justify-center">
                  Register Agency <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:text-primary-hover hover:underline font-semibold"
            >
              Sign In
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
