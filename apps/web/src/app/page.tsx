'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="app-shell min-h-screen flex flex-col items-center justify-center text-[color:var(--app-text-muted)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest font-semibold font-display">
          Redirecting to command center...
        </span>
      </div>
    </div>
  );
}
