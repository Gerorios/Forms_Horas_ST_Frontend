'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { navForRole, type NavItem } from '@/components/layout/nav';
import { NavIcon } from '@/components/layout/nav-icons';

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
  plegado = false,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  plegado?: boolean;
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
            aria-label={plegado ? item.label : undefined}
            title={plegado ? item.label : undefined}
            className={`flex items-center rounded-md border-l-[3px] py-2 text-sm transition-colors ${
              plegado ? 'justify-center px-0' : 'px-3'
            } ${
              active
                ? 'border-brand bg-accent font-medium text-ink'
                : 'border-transparent text-slate hover:bg-accent/60 hover:text-ink'
            }`}
          >
            {plegado ? <NavIcon href={item.href} /> : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({
  nombre,
  onLogout,
}: {
  nombre: string;
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
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="mt-2 flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-slate transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
          <path d="M8 10h9m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Cerrar sesión
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [plegado, setPlegado] = useState(false);
  useEffect(() => {
    setPlegado(window.localStorage.getItem('sidebar-plegado') === '1');
  }, []);
  if (!perfil) return null;

  const items = navForRole(perfil);
  const nombre = perfil.empleado.apellido_nombre;

  function salir() {
    signOut();
    router.replace('/login');
  }

  function togglePlegado() {
    const next = !plegado;
    setPlegado(next);
    window.localStorage.setItem('sidebar-plegado', next ? '1' : '0');
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Sidebar fija (desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface py-4 transition-[width,padding] duration-200 md:flex ${plegado ? 'w-14 px-2' : 'w-60 px-3'}`}>
        <div className={plegado ? 'flex justify-center' : 'px-1'}>
          {plegado ? (
            <Image src="/logo.png" alt="" width={34} height={34} className="rounded-full" />
          ) : (
            <Brand />
          )}
        </div>
        <div className="mt-6 flex-1">
          <NavLinks items={items} pathname={pathname} plegado={plegado} />
        </div>
        {plegado ? (
          <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
            <span
              title={nombre}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-xs font-semibold text-brand-deep"
            >
              {nombre.slice(0, 2).toUpperCase()}
            </span>
            <button
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={salir}
              className="rounded-md p-1.5 text-slate hover:bg-danger/5 hover:text-danger"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
                <path d="M8 10h9m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
          <UserFooter nombre={nombre} onLogout={salir} />
        )}
        <button
          type="button"
          aria-label={plegado ? 'Desplegar menú' : 'Plegar menú'}
          title={plegado ? 'Desplegar menú' : 'Plegar menú'}
          onClick={togglePlegado}
          className={`mt-3 flex items-center justify-center rounded-md border border-line py-1.5 text-slate transition-colors hover:bg-accent/60 hover:text-ink ${plegado ? '' : 'w-full'}`}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ transform: plegado ? 'rotate(180deg)' : undefined }}>
            <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={salir}
          className="ml-auto rounded-md p-1.5 text-slate hover:bg-danger/5 hover:text-danger"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
            <path d="M8 10h9m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
            <UserFooter nombre={nombre} onLogout={salir} />
          </div>
        </div>
      )}

      {/* Contenido — las vistas de tablas anchas (liquidación) usan todo el ancho disponible */}
      <main className={`transition-[padding] duration-200 ${plegado ? 'md:pl-14' : 'md:pl-60'}`}>
        <div
          className={`mx-auto px-4 py-6 sm:px-6 lg:py-8 ${
            pathname.startsWith('/liquidacion') ? 'max-w-none 2xl:max-w-[1600px]' : 'max-w-5xl'
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
