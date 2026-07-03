'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/session';
import { AppShell } from '@/components/layout/app-shell';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { perfil, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !perfil) router.replace('/login');
  }, [loading, perfil, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-slate">
        Cargando…
      </div>
    );
  }
  if (!perfil) return null; // redirigiendo

  return <AppShell>{children}</AppShell>;
}
