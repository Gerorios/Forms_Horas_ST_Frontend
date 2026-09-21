import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './app-shell';
import { navPorArea } from './nav';
import type { Perfil } from '@/types/domain';

vi.mock('next/navigation', () => ({
  usePathname: () => '/combustible',
  useRouter: () => ({ replace: vi.fn() }),
}));

// El perfil del mock es mutable (vi.hoisted) para montar la consola con otro
// rol —HyS no ve el área Operación— sin tocar los tests del sidebar plegable.
type PerfilMock = Pick<Perfil, 'rol' | 'tiposNovedadHabilitados' | 'puedeCargarKmPorTantos' | 'cert'> & {
  empleado: { apellido_nombre: string };
};
const h = vi.hoisted(() => ({ perfil: null as PerfilMock | null }));

const PERFIL_ADMIN = {
  cuil: '20123456789',
  email: 'admin@empresa.com',
  activo: true,
  rol: { nombre: 'Admin' as const },
  empleado: { apellido_nombre: 'PEREZ JUAN', legajo: 10, cargo: 'Oficial' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
  cert: null,
};

const PERFIL_HYS = {
  cuil: '27123456780',
  email: 'hys@empresa.com',
  activo: true,
  rol: { nombre: 'HyS' as const },
  empleado: { apellido_nombre: 'GOMEZ ANA', legajo: 20, cargo: 'Higiene y Seguridad' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
  cert: null,
};

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({ perfil: h.perfil, signOut: vi.fn() }),
}));

beforeEach(() => {
  h.perfil = PERFIL_ADMIN;
  window.localStorage.clear();
});

describe('AppShell — sidebar plegable (escritorio)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('desplegado por defecto: muestra los labels en el sidebar', () => {
    render(<AppShell><p>contenido</p></AppShell>);
    // El label aparece en el sidebar desktop (el drawer móvil no está montado)
    expect(screen.getByRole('link', { name: 'Combustible' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plegar menú' })).toBeInTheDocument();
  });

  it('al plegar quedan íconos con aria-label y sin texto visible', async () => {
    render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Plegar menú' }));
    const link = screen.getByRole('link', { name: 'Combustible' });
    expect(link).toHaveAttribute('aria-label', 'Combustible');
    expect(link).not.toHaveTextContent('Combustible');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Desplegar menú' })).toBeInTheDocument();
  });

  it('con el sidebar plegado, el drawer móvil sigue mostrando labels completos', async () => {
    render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Plegar menú' }));
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const links = screen.getAllByRole('link', { name: 'Combustible' });
    expect(links).toHaveLength(2);
    const drawerLink = links.find((l) => l.textContent === 'Combustible');
    expect(drawerLink).toBeDefined();
    expect(drawerLink).toHaveTextContent('Combustible');
  });

  it('persiste la preferencia en localStorage y la restaura al montar', async () => {
    const r1 = render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Plegar menú' }));
    expect(window.localStorage.getItem('sidebar-plegado')).toBe('1');
    r1.unmount();

    render(<AppShell><p>contenido</p></AppShell>);
    expect(screen.getByRole('button', { name: 'Desplegar menú' })).toBeInTheDocument();
  });

  it('al desplegar vuelve a guardar "0"', async () => {
    window.localStorage.setItem('sidebar-plegado', '1');
    render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Desplegar menú' }));
    expect(window.localStorage.getItem('sidebar-plegado')).toBe('0');
  });
});

describe('AppShell — consola Central Sertec (ADR-025)', () => {
  it('muestra el nombre nuevo y ya no los textos viejos', () => {
    render(<AppShell><p>contenido</p></AppShell>);
    // Aparece dos veces: barra de escritorio y topbar móvil (jsdom monta las dos).
    expect(screen.getAllByText('Central Sertec')).toHaveLength(2);
    expect(screen.getAllByText('Sistema interno')).toHaveLength(2);
    expect(screen.queryByText('Registro de Horas')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestión de cuadrillas')).not.toBeInTheDocument();
  });

  it('desplegado: muestra el título de cada área visible del perfil', () => {
    const titulos = navPorArea(PERFIL_ADMIN).map((g) => g.area.label);
    expect(titulos).toEqual(['Operación', 'Personas', 'Resultados operativos', 'Administración']);
    render(<AppShell><p>contenido</p></AppShell>);
    for (const titulo of titulos) {
      expect(screen.getByText(titulo)).toBeInTheDocument();
    }
  });

  it('plegado: muestra el monograma "CS" y ningún título de área', async () => {
    render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Plegar menú' }));
    expect(screen.getByRole('link', { name: 'Central Sertec' })).toHaveTextContent('CS');
    for (const { area } of navPorArea(PERFIL_ADMIN)) {
      expect(screen.queryByText(area.label)).not.toBeInTheDocument();
    }
  });

  it('un perfil de HyS no ve el área Operación', () => {
    h.perfil = PERFIL_HYS;
    expect(navPorArea(PERFIL_HYS).map((g) => g.area.label)).toEqual(['Personas']);
    render(<AppShell><p>contenido</p></AppShell>);
    expect(screen.getByText('Personas')).toBeInTheDocument();
    expect(screen.queryByText('Operación')).not.toBeInTheDocument();
  });
});

describe('AppShell — la barra scrollea sola (R1)', () => {
  it('escritorio: la navegación scrollea y el pie con el toggle queda afuera', () => {
    render(<AppShell><p>contenido</p></AppShell>);
    const nav = screen.getByRole('navigation');
    // Sin esto, en una pantalla baja (577 px) las 4 áreas + 11 ítems empujan el
    // pie fuera de la vista: no se llega a "Administración" ni a plegar el menú.
    expect(nav).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto');
    expect(within(nav).queryByText('Cerrar sesión')).toBeNull();
    expect(nav).not.toContainElement(screen.getByRole('button', { name: 'Plegar menú' }));
  });

  it('drawer móvil: la misma navegación scrollea con el pie afuera', async () => {
    render(<AppShell><p>contenido</p></AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const navs = screen.getAllByRole('navigation');
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(nav).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto');
      expect(within(nav).queryByText('Cerrar sesión')).toBeNull();
    }
  });
});
