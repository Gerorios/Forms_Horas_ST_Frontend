import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubNav } from './sub-nav';

// La ruta del mock es mutable (vi.hoisted) para mover el ítem activo sin
// remontar el módulo.
const h = vi.hoisted(() => ({ pathname: '/liquidacion/quincena' }));

vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
}));

const ITEMS = [
  { href: '/liquidacion/quincena', label: 'Quincena' },
  { href: '/liquidacion/analisis', label: 'Análisis' },
  { href: '/liquidacion/cierres', label: 'Cierres' },
];

describe('SubNav', () => {
  beforeEach(() => {
    h.pathname = '/liquidacion/quincena';
  });

  it('renderiza un link por ítem, con su href y su label', () => {
    render(<SubNav items={ITEMS} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/liquidacion/quincena',
      '/liquidacion/analisis',
      '/liquidacion/cierres',
    ]);
    expect(screen.getByRole('link', { name: 'Análisis' })).toBeInTheDocument();
  });

  it('marca como activo solo el ítem que coincide con la ruta', () => {
    h.pathname = '/liquidacion/analisis';
    render(<SubNav items={ITEMS} />);

    const activo = screen.getByRole('link', { name: 'Análisis' });
    expect(activo).toHaveAttribute('aria-current', 'page');
    expect(activo.className).toContain('border-brand');

    for (const nombre of ['Quincena', 'Cierres']) {
      const otro = screen.getByRole('link', { name: nombre });
      expect(otro).not.toHaveAttribute('aria-current');
      expect(otro.className).not.toContain('border-brand');
      expect(otro.className).toContain('border-transparent');
    }
  });

  it('en una subruta no marca ninguno (igualdad exacta, como hoy)', () => {
    h.pathname = '/liquidacion/quincena/detalle';
    render(<SubNav items={ITEMS} />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current');
      expect(link.className).not.toContain('border-brand');
    }
  });

  it('aplica el aria-label al nav cuando viene, y sin él el nav no lo tiene', () => {
    const { unmount } = render(<SubNav items={ITEMS} ariaLabel="Secciones de liquidación" />);
    expect(screen.getByRole('navigation', { name: 'Secciones de liquidación' })).toBeInTheDocument();
    unmount();

    render(<SubNav items={ITEMS} />);
    expect(screen.getByRole('navigation')).not.toHaveAttribute('aria-label');
  });
});
