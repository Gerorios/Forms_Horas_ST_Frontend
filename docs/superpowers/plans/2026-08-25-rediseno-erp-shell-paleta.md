# Rediseño ERP — Paleta global y shell de navegación (PR1 + PR2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la paleta de color y el shell de navegación (sidebar angosta + drawer) por la paleta fiel al logo y un shell simplificado (topbar + home launcher ya existente), sentando la base global sobre la que después se pilotea el rediseño de página en Liquidación.

**Architecture:** Cambio 1 (paleta): edición directa de los tokens CSS centralizados en `globals.css`, sin tocar componentes. Cambio 2 (shell): `AppShell` se reescribe de una sidebar plegable + drawer móvil a una única topbar fina (logo, avatar, logout), manteniendo el mismo nombre exportado y la misma prop `{ children }` para no tocar `(protected)/layout.tsx` más que la lectura del import. La navegación entre módulos pasa a depender exclusivamente del home (`(protected)/page.tsx`, ya implementado como grilla de accesos — se restylea a tiles más grandes con ícono, reutilizando `NavIcon`).

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 (`@theme`), React 19, Vitest + Testing Library, `@testing-library/user-event`.

**Spec:** `docs/superpowers/specs/2026-08-25-rediseno-erp-design.md`

## Global Constraints

- Paleta y shell se aplican a **toda la app de una sola vez** (no hay flag ni convivencia de paletas) — spec §3.
- No se toca lógica de negocio, llamadas a la API, ni el esquema de Prisma — spec §4.
- No se activa `.dark` (el bloque `.dark` de `globals.css` queda intacto, fuera de alcance) — spec §8.
- Los colores de estado (`approved`, `danger`, `warn`, `alert`) y la paleta de gráficos (`chart-1..5`) quedan sin cambios — no están en el alcance del spec (paleta de marca únicamente).
- `AppShell` mantiene el nombre exportado y la firma `{ children: ReactNode }` — es el único punto de import (`(protected)/layout.tsx`).
- Cada tarea termina con `npm run test -- <archivo>` en verde antes del commit; al cerrar la Tarea 3 correr el suite completo una vez.

---

## Task 1: Paleta nueva en `globals.css`

**Files:**
- Modify: `src/app/globals.css:7-96`

**Interfaces:**
- Consumes: nada (tokens CSS puros, sin dependencias de otras tareas).
- Produces: los tokens `--color-brand`, `--color-brand-deep`, `--color-slate`, `--color-sand`, `--color-line` y el bloque `:root` (shadcn) quedan con los valores nuevos de abajo — las Tareas 2 y 4 los consumen indirectamente vía las clases utilitarias existentes (`bg-brand`, `text-slate`, `border-line`, `bg-accent`, etc.), no hace falta que las conozcan por nombre.

Valores nuevos (derivados de la paleta D del spec — gris `#788080` y dorado `#E8B030` extraídos del logo):

| Token | Antes | Después | Derivación |
|---|---|---|---|
| `--color-brand` | `#ecb332` | `#E8B030` | dorado exacto del logo |
| `--color-brand-deep` | `#a97a16` | `#A67C1E` | dorado mezclado 30% con negro (texto/hover sobre fondo claro) |
| `--color-ink` | `#1e2124` | `#1e2124` | sin cambio — ya es un gris casi neutro, compatible |
| `--color-slate` | `#6b6f73` | `#788080` | gris exacto del logo |
| `--color-line` | `#e6e4de` | `#E3E5E5` | gris del logo mezclado 85% con blanco (bordes) |
| `--color-sand` | `#faf9f6` | `#F8F8F8` | fondo casi blanco extraído del logo |
| `--color-surface` | `#ffffff` | `#ffffff` | sin cambio |
| `--color-approved/danger/warn/alert` | — | sin cambio | colores de estado, fuera de alcance |
| `--color-chart-1..5` | — | sin cambio | paleta de gráficos, fuera de alcance |

- [ ] **Step 1: Reemplazar el bloque `@theme` de marca (líneas 7-29)**

```css
/* --- Tokens de marca (uso directo: bg-brand, text-ink, border-line, etc.) --- */
@theme {
  --color-brand: #e8b030;
  --color-brand-deep: #a67c1e;
  --color-ink: #1e2124;
  --color-slate: #788080;
  --color-line: #e3e5e5;
  --color-sand: #f8f8f8;
  --color-surface: #ffffff;
  --color-approved: #2f7d5a;
  --color-danger: #c0492b;
  --color-warn: #b26a00;
  --color-alert: #c0492b;
  /* Series de gráficos (panel Control general) — validados con el validador
     de dataviz sobre superficie blanca; chart-1 es brand-deep. */
  --color-chart-1: #a97a16;
  --color-chart-2: #3b6fc4;
  /* chart-3/4/5 completan la paleta categórica de 5 series (composición del
     pago en Liquidación → Análisis), también validada sobre blanco. */
  --color-chart-3: #1f8a70;
  --color-chart-4: #7d5bc6;
  --color-chart-5: #b3543e;
}
```

- [ ] **Step 2: Reemplazar el bloque `:root` (líneas 68-96), dejando `@theme inline` (líneas 31-66) y `.dark` (líneas 100-127) intactos**

```css
:root {
  --radius: 0.5rem;
  --background: #f8f8f8; /* sand (paleta D) */
  --foreground: #1e2124; /* ink */
  --card: #ffffff;
  --card-foreground: #1e2124;
  --popover: #ffffff;
  --popover-foreground: #1e2124;
  --primary: #e8b030; /* gold (paleta D) */
  --primary-foreground: #1e2124; /* ink sobre dorado (dorado es claro) */
  --secondary: #eeeeee;
  --secondary-foreground: #1e2124;
  --muted: #eeeeee;
  --muted-foreground: #788080; /* slate (paleta D) */
  --accent: #fdf7ea; /* dorado muy tenue (hover/activo) */
  --accent-foreground: #1e2124;
  --destructive: #c0492b;
  --border: #e3e5e5; /* line (paleta D) */
  --input: #e3e5e5;
  --ring: #e8b030; /* foco dorado */
  --sidebar: #ffffff;
  --sidebar-foreground: #1e2124;
  --sidebar-primary: #e8b030;
  --sidebar-primary-foreground: #1e2124;
  --sidebar-accent: #fdf7ea;
  --sidebar-accent-foreground: #1e2124;
  --sidebar-border: #e3e5e5;
  --sidebar-ring: #e8b030;
}
```

- [ ] **Step 3: Verificar visualmente (no hay test automatizado para valores de CSS puro)**

Levantar el dev server y confirmar que no rompió el build:

Run: `npm run dev` (en `Frontend/`)
Expected: arranca sin errores de Tailwind/PostCSS; en `http://localhost:3000` el fondo se ve gris muy claro (`#F8F8F8`) y los botones/acentos dorados en `#E8B030` en vez del dorado anterior más pálido.

Detener el server (`Ctrl+C`) antes de seguir.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): aplicar paleta D (gris/dorado del logo) a los tokens globales"
```

---

## Task 2: `AppShell` — de sidebar plegable a topbar simple

**Files:**
- Modify: `src/components/layout/app-shell.tsx` (reescritura completa, 238 → ~70 líneas)
- Modify: `src/components/layout/app-shell.test.tsx` (reescritura completa — los tests actuales cubren plegado/despliegue/drawer, que dejan de existir)
- No se toca `src/app/(protected)/layout.tsx` (sigue importando `{ AppShell }` con la misma firma).
- No se toca `src/components/layout/nav.ts` (sigue usándose desde el home, ver Tarea 3).
- `src/components/layout/nav-icons.tsx` deja de usarse en `AppShell` (se usa en la Tarea 3, dentro del home).

**Interfaces:**
- Consumes: `useSession()` de `@/lib/auth/session` (ya existente, sin cambios de contrato — expone `perfil` y `signOut`).
- Produces: `export function AppShell({ children }: { children: ReactNode })` — mismo nombre y firma que hoy. `(protected)/layout.tsx` no requiere ningún cambio.

- [ ] **Step 1: Escribir los tests que fallan para el nuevo `AppShell`**

Reemplazar completamente `src/components/layout/app-shell.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './app-shell';

const replace = vi.fn();
let pathname = '/combustible';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

const PERFIL_ADMIN = {
  cuil: '20123456789',
  email: 'admin@empresa.com',
  activo: true,
  rol: { nombre: 'Admin' as const },
  empleado: { apellido_nombre: 'PEREZ JUAN', legajo: 10, cargo: 'Oficial' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
};

const signOut = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({ perfil: PERFIL_ADMIN, signOut }),
}));

describe('AppShell — topbar', () => {
  beforeEach(() => {
    pathname = '/combustible';
    replace.mockClear();
    signOut.mockClear();
  });

  it('el logo enlaza al home', () => {
    render(<AppShell><p>contenido</p></AppShell>);
    const logo = screen.getByRole('link', { name: /registro de horas/i });
    expect(logo).toHaveAttribute('href', '/');
  });

  it('muestra las iniciales del usuario', () => {
    render(<AppShell><p>contenido</p></AppShell>);
    expect(screen.getByText('PE')).toBeInTheDocument();
  });

  it('cerrar sesión llama a signOut y redirige a /login', async () => {
    render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('no renderiza sidebar ni drawer (ya no hay navegación por ítem en el shell)', () => {
    render(<AppShell><p>contenido</p></AppShell>);
    expect(screen.queryByRole('button', { name: 'Abrir menú' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Plegar menú' })).not.toBeInTheDocument();
  });

  it('rutas anchas usan max-w-none, el resto max-w-5xl', () => {
    pathname = '/liquidacion/quincena';
    const { rerender } = render(<AppShell><p>contenido</p></AppShell>);
    expect(screen.getByText('contenido').parentElement).toHaveClass('max-w-none');

    pathname = '/mis-registros';
    rerender(<AppShell><p>contenido</p></AppShell>);
    expect(screen.getByText('contenido').parentElement).toHaveClass('max-w-5xl');
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm run test -- src/components/layout/app-shell.test.tsx`
Expected: FAIL (el `AppShell` actual no tiene un `<Link>` con nombre accesible "Registro de Horas", ni deja de renderizar los botones "Abrir menú"/"Plegar menú").

- [ ] **Step 3: Reescribir `app-shell.tsx`**

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';

/** Rutas cuyas tablas necesitan todo el ancho de pantalla (el resto usa max-w-5xl). */
const RUTAS_ANCHAS = ['/liquidacion', '/control-general', '/combustible', '/admin/usuarios'];

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  if (!perfil) return null;

  const nombre = perfil.empleado.apellido_nombre;

  function salir() {
    signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={30} height={30} className="rounded-full" />
          <span className="font-display text-sm font-semibold text-ink">Registro de Horas</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
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
            className="rounded-md p-1.5 text-slate transition-colors hover:bg-danger/5 hover:text-danger"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
              <path d="M8 10h9m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        <div
          className={`mx-auto px-4 py-6 sm:px-6 lg:py-8 ${
            RUTAS_ANCHAS.some((r) => pathname.startsWith(r)) ? 'max-w-none 2xl:max-w-[1600px]' : 'max-w-5xl'
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm run test -- src/components/layout/app-shell.test.tsx`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/app-shell.tsx src/components/layout/app-shell.test.tsx
git commit -m "feat(ui): reemplazar sidebar plegable + drawer por topbar simple en AppShell"
```

---

## Task 3: Home launcher — tiles grandes con ícono (estilo B)

**Files:**
- Modify: `src/app/(protected)/page.tsx`
- Create: `src/app/(protected)/page.test.tsx`
- Consume (sin modificar): `src/components/layout/nav-icons.tsx` (`NavIcon`), `src/components/layout/nav.ts` (`navForRole`), `src/components/page-header.tsx` (`PageHeader`).

**Interfaces:**
- Consumes: `NavIcon({ href }: { href: string }): ReactElement | null` (ya existe, un ícono por cada entrada de `NAV_ITEMS`).
- Produces: nada que otras tareas consuman — es la última tarea de este plan.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/(protected)/page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({
    perfil: {
      rol: { nombre: 'Admin' },
      tiposNovedadHabilitados: [],
      puedeCargarKmPorTantos: true,
      empleado: { apellido_nombre: 'PEREZ JUAN' },
    },
  }),
}));

describe('HomePage — tiles de módulos', () => {
  it('cada tile muestra el ícono del módulo junto al nombre', () => {
    render(<HomePage />);
    const tile = screen.getByRole('link', { name: /liquidación/i });
    expect(tile.querySelector('svg')).toBeInTheDocument();
  });

  it('el tile de un módulo lleva a su href', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /liquidación/i })).toHaveAttribute('href', '/liquidacion');
  });

  it('el tile de Combustible incluye su descripción', () => {
    render(<HomePage />);
    expect(screen.getByText(/registrar y consultar cargas de combustible/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm run test -- "src/app/(protected)/page.test.tsx"`
Expected: FAIL — el tile actual no contiene un `<svg>` (el diseño hoy no muestra ícono, solo texto + flecha).

- [ ] **Step 3: Restylear `page.tsx` a tiles estilo B (card suave, ícono grande centrado)**

```tsx
'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { navForRole } from '@/components/layout/nav';
import { NavIcon } from '@/components/layout/nav-icons';
import { PageHeader } from '@/components/page-header';

const DESCRIPCION: Record<string, string> = {
  '/reporte': 'Cargar las horas trabajadas del día por operario, tarea y contrato.',
  '/mis-registros': 'Consultar tus horas registradas, por quincena.',
  '/combustible': 'Registrar y consultar cargas de combustible con foto del ticket. Módulo en construcción.',
  '/aprobaciones': 'Revisar y aprobar las horas pendientes de tus contratos.',
  '/control-general': 'Tablero de la quincena: horas totales, histórico, ranking, detalle diario y empleados sin carga.',
  '/novedades': 'Cargar y ver novedades: ausencias, accidentes, francos.',
  '/ausencias': 'Aprobar o rechazar las ausencias que requieren Higiene y Seguridad.',
  '/admin': 'Administrar catálogos, usuarios y contratos.',
  '/liquidacion': 'Total a cobrar por empleado y quincena: horas, categoría, extras y plus.',
  '/km-por-tantos': 'Cargar los km relevados de cada quincena para el personal "por tantos".',
};

export default function HomePage() {
  const { perfil } = useSession();
  if (!perfil) return null;

  const items = navForRole(perfil);
  const nombre = perfil.empleado.apellido_nombre;

  return (
    <section className="space-y-6">
      <PageHeader title={`Hola, ${nombre}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-5 py-8 text-center shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-brand-deep [&_svg]:h-6 [&_svg]:w-6">
              <NavIcon href={item.href} />
            </span>
            <span className="font-display text-base font-semibold text-ink">{item.label}</span>
            <p className="text-sm text-slate">{DESCRIPCION[item.href] ?? ''}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm run test -- "src/app/(protected)/page.test.tsx"`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(protected)/page.tsx" "src/app/(protected)/page.test.tsx"
git commit -m "feat(ui): tiles del home con ícono grande, estilo card suave (opción B)"
```

---

## Task 4: Suite completa y cierre

**Files:** ninguno nuevo — solo verificación.

**Interfaces:** N/A.

- [ ] **Step 1: Correr el suite completo de Vitest**

Run: `npm run test`
Expected: todo verde. Si algún test no relacionado con esta rama falla por timeout bajo carga (patrón ya documentado del proyecto), re-correr solo ese archivo en aislado antes de dar por bueno el resultado.

- [ ] **Step 2: Verificación manual en el navegador**

Levantar `npm run dev`, entrar como Admin, confirmar:
- Topbar fina arriba (sin sidebar), logo enlaza a `/`.
- Home muestra tiles grandes con ícono, paleta gris/dorado nueva.
- Entrar a Liquidación: sigue funcionando igual que antes (su propio `layout.tsx` con pestañas no se tocó en este plan), ahora con la paleta nueva heredada.

- [ ] **Step 3: Commit final (si hubo ajustes de la verificación manual)**

Si el Step 2 no requirió cambios, no hay commit — el plan queda cerrado en el commit de la Tarea 3.

---

## Fuera de este plan

El rediseño página-por-página de Liquidación (PR3+ del spec §7) queda para un plan separado: cada una de sus 6 páginas necesita sus propias decisiones de layout (no mockeadas todavía a ese nivel de detalle), a diferencia de este plan donde cada tarea ya tenía una decisión visual validada con el usuario. Cuando se aborde, arranca desde `docs/superpowers/specs/2026-08-25-rediseno-erp-design.md` §3 y este mismo plan como base de paleta/shell ya aplicada.
