'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { navForRole, type NavItem } from '@/components/layout/nav';

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="" width={34} height={34} className="rounded-full" />
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold text-ink">Registro de Horas</p>
        <p className="text-[11px] text-slate">Gestión de cuadrillas</p>
      </div>
    </div>
  );
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center rounded-md border-l-[3px] px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-brand bg-accent font-medium text-ink'
                : 'border-transparent text-slate hover:bg-accent/60 hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({
  nombre,
  rol,
  onLogout,
}: {
  nombre: string;
  rol: string;
  onLogout: () => void;
}) {
  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-xs font-semibold text-brand-deep">
          {nombre.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-ink">{nombre}</p>
          <p className="text-[11px] text-slate">{rol}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="mt-2 w-full rounded-md px-3 py-1.5 text-left text-sm text-slate transition-colors hover:bg-accent/60 hover:text-ink"
      >
        Salir
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  if (!perfil) return null;

  const items = navForRole(perfil.rol.nombre);
  const nombre = perfil.empleado.apellido_nombre;
  const rol = perfil.rol.nombre;

  function salir() {
    signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Sidebar fija (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-4 md:flex">
        <div className="px-1">
          <Brand />
        </div>
        <div className="mt-6 flex-1">
          <NavLinks items={items} pathname={pathname} />
        </div>
        <UserFooter nombre={nombre} rol={rol} onLogout={salir} />
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setDrawerAbierto(true)}
          className="rounded-md p-1.5 text-slate hover:bg-accent/60"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
        <Brand />
      </header>

      {/* Drawer (mobile) */}
      {drawerAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerAbierto(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface px-3 py-4">
            <div className="flex items-center justify-between px-1">
              <Brand />
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setDrawerAbierto(false)}
                className="rounded-md p-1 text-slate hover:bg-accent/60"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavLinks items={items} pathname={pathname} onNavigate={() => setDrawerAbierto(false)} />
            </div>
            <UserFooter nombre={nombre} rol={rol} onLogout={salir} />
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
