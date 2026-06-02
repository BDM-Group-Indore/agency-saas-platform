'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
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

        {!isSent ? (
          <>
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                Forgot Password
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your work email address and we'll send you an encrypted link to reset your security credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-danger rounded-lg font-medium">
                  {error}
                </div>
              )}

              <Input
                label="Registered Email"
                type="email"
                placeholder="shivam@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
              />

              <Button type="submit" disabled={isLoading} className="w-full mt-1">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    Send Reset Link <Send className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-bold text-white tracking-tight mb-2">
              Recovery Link Sent!
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-6">
              We have dispatched a secure password retrieval transmission to <strong className="text-slate-200">{email}</strong>. Check your inbox (or spam folder) to reset your password.
            </p>
            <Link href="/reset-password?email=shivam@agency.com" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Reset Screen (Demo Shortcut)
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
