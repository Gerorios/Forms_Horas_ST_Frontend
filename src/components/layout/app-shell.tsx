'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { navPorArea, type Area, type NavItem } from '@/components/layout/nav';
import { NavIcon } from '@/components/layout/nav-icons';

/** Rutas cuyas tablas necesitan todo el ancho de pantalla (el resto usa max-w-5xl). */
const RUTAS_ANCHAS = ['/liquidacion', '/control-general', '/combustible', '/admin/usuarios'];

/**
 * Rutas que se dibujan a sangre: el shell no les pone margen, ancho máximo ni
 * padding, porque la página arranca con una franja fotográfica de borde a
 * borde y acomoda su propio ancho debajo (ADR-025). Coincidencia EXACTA de
 * `pathname`: con `startsWith` entraría todo el sitio.
 */
const RUTAS_SIN_CONTENEDOR = ['/'];

/**
 * Foco visible sobre la consola grafito: el anillo dorado necesita el offset
 * del mismo grafito para leerse (ADR-025).
 */
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite';

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      aria-label="Ir al inicio"
      className={`flex items-center gap-2.5 rounded-md transition hover:opacity-80 ${FOCO}`}
    >
      <Image src="/logo.png" alt="" width={34} height={34} className="rounded-full" />
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold text-white">Central Sertec</p>
        <p className="text-[11px] text-white/60">Sistema interno</p>
      </div>
    </Link>
  );
}

/**
 * Barra plegada: monograma "CS" en vez del logo (ADR-025, default 3). A 56 px
 * de ancho el logo redondo se lee como un adorno; las dos letras dicen dónde
 * estás. El nombre completo va en el `aria-label`.
 */
function Monograma() {
  return (
    <Link
      href="/"
      aria-label="Central Sertec"
      title="Central Sertec"
      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/6 font-display text-sm font-semibold text-brand transition hover:bg-white/10 ${FOCO}`}
    >
      CS
    </Link>
  );
}

function NavLinks({
  grupos,
  pathname,
  onNavigate,
  plegado = false,
}: {
  grupos: { area: Area; items: NavItem[] }[];
  pathname: string;
  onNavigate?: () => void;
  plegado?: boolean;
}) {
  return (
    // La lista de módulos es lo único que scrollea: `min-h-0` deja que el
    // flex se encoja por debajo de su contenido (sin eso el bloque empuja al
    // pie fuera de la pantalla en una ventana baja) y `overscroll-contain`
    // evita que la rueda, al llegar al final, arrastre el contenido de atrás.
    <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
      {grupos.map((grupo, i) => (
        <Fragment key={grupo.area.id}>
          {/* Desplegado: título del área en dorado (ADR-025). Plegado: no entra
              texto, así que las áreas se separan con una línea. */}
          {plegado
            ? i > 0 && <div className="my-2 border-t border-white/10" aria-hidden />
            : (
              <p
                className={`px-3 mb-1 text-[10.5px] uppercase tracking-[0.14em] text-brand/90 ${i > 0 ? 'mt-3' : ''}`}
              >
                {grupo.area.label}
              </p>
            )}
          {grupo.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                aria-label={plegado ? item.label : undefined}
                title={plegado ? item.label : undefined}
                className={`flex items-center rounded-md border-l-[3px] py-2 text-sm transition-colors ${FOCO} ${
                  plegado ? 'justify-center px-0' : 'px-3'
                } ${
                  active
                    ? 'border-brand bg-white/8 font-medium text-white'
                    : 'border-transparent text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                {plegado ? <NavIcon href={item.href} /> : item.label}
              </Link>
            );
          })}
        </Fragment>
      ))}
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
    <div className="shrink-0 border-t border-white/10 pt-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-display text-xs font-semibold text-ink">
          {nombre.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-white">{nombre}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className={`mt-2 flex w-full items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:border-danger/40 hover:text-danger ${FOCO}`}
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

  // Los módulos visibles, agrupados por área (ADR-025): los roles siguen
  // decidiendo qué se ve; el área es solo cómo se ordena y se titula.
  const grupos = navPorArea(perfil);
  const nombre = perfil.empleado.apellido_nombre;
  const libre = RUTAS_SIN_CONTENEDOR.includes(pathname);

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
    // Consola grafito + contenido sobre arena profunda (ADR-025). Sobre el
    // grafito no se usan `text-slate` ni `bg-accent`: no dan contraste.
    <div className="min-h-screen bg-sand-deep">
      {/* Sidebar fija (desktop) — `inset-y-0` la deja del alto de la pantalla y
          las tres franjas (marca, navegación, pie) se reparten ese alto: solo
          la del medio scrollea, así el pie y el botón de plegar siempre están
          a la vista aunque la ventana sea baja (R1). */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 bg-graphite py-4 text-white transition-[width,padding] duration-200 md:flex ${plegado ? 'w-14 px-2' : 'w-60 px-3'}`}>
        <div className={`shrink-0 ${plegado ? 'flex justify-center' : 'px-1'}`}>
          {plegado ? <Monograma /> : <Brand />}
        </div>
        <NavLinks grupos={grupos} pathname={pathname} plegado={plegado} />
        {plegado ? (
          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-white/10 pt-3">
            <span
              title={nombre}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-display text-xs font-semibold text-ink"
            >
              {nombre.slice(0, 2).toUpperCase()}
            </span>
            <button
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={salir}
              className={`rounded-md p-1.5 text-white/70 hover:bg-white/8 hover:text-danger ${FOCO}`}
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
          className={`mt-3 flex shrink-0 items-center justify-center rounded-md border border-white/15 py-1.5 text-white/70 transition-colors hover:bg-white/8 hover:text-white ${FOCO} ${plegado ? '' : 'w-full'}`}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ transform: plegado ? 'rotate(180deg)' : undefined }}>
            <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/10 bg-graphite px-4 text-white md:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setDrawerAbierto(true)}
          className={`rounded-md p-1.5 text-white/70 hover:bg-white/8 hover:text-white ${FOCO}`}
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
          className={`ml-auto rounded-md p-1.5 text-white/70 hover:bg-white/8 hover:text-danger ${FOCO}`}
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
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-graphite px-3 py-4 text-white">
            {/* Mismo reparto que en la barra de escritorio: marca y pie fijos,
                la navegación scrollea (R1). */}
            <div className="flex shrink-0 items-center justify-between px-1">
              <Brand onNavigate={() => setDrawerAbierto(false)} />
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setDrawerAbierto(false)}
                className={`rounded-md p-1 text-white/70 hover:bg-white/8 hover:text-white ${FOCO}`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavLinks grupos={grupos} pathname={pathname} onNavigate={() => setDrawerAbierto(false)} />
            <UserFooter nombre={nombre} onLogout={salir} />
          </div>
        </div>
      )}

      {/* Contenido — las vistas con tablas anchas usan todo el ancho disponible */}
      <main className={`bg-sand-deep transition-[padding] duration-200 ${plegado ? 'md:pl-14' : 'md:pl-60'}`}>
        <div
          data-contenedor={libre ? 'libre' : 'normal'}
          className={
            libre
              ? ''
              : `mx-auto px-4 py-6 sm:px-6 lg:py-8 ${
                  RUTAS_ANCHAS.some((r) => pathname.startsWith(r)) ? 'max-w-none 2xl:max-w-[1600px]' : 'max-w-5xl'
                }`
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
