'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { navForRole } from '@/components/layout/nav';

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, signOut } = useSession();
  const router = useRouter();
  if (!perfil) return null;

  const items = navForRole(perfil.rol.nombre);

  function handleLogout() {
    signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-neutral/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Logo" width={36} height={36} />
          <nav className="hidden gap-4 sm:flex">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-neutral hover:text-brand">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral">{perfil.empleado.apellido_nombre}</span>
          <button onClick={handleLogout} className="text-sm text-alert hover:underline">
            Salir
          </button>
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
