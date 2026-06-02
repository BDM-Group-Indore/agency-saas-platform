'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }, 1000);
  };

  return (
    <main className="min-height-100vh flex items-center justify-center p-6 bg-slate-950 text-slate-100 relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 backdrop-blur-md relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        {!isSuccess ? (
          <>
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose a strong, unique password for your digital command dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-danger rounded-lg font-medium">
                  {error}
                </div>
              )}

              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<KeyRound className="w-4 h-4" />}
              />

              <Button type="submit" disabled={isLoading} className="w-full mt-1">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    Update Password <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 animate-pulse">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-bold text-white tracking-tight mb-2">
              Password Reset Success!
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-2">
              Your security configuration has been updated.
            </p>
            <p className="text-[10px] text-primary font-semibold">
              Redirecting you to the console Login screen...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
