import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/combustible',
  useRouter: () => ({ replace: vi.fn() }),
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

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({ perfil: PERFIL_ADMIN, signOut: vi.fn() }),
}));

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
