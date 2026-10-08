import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({ actualizar: vi.fn() }));

vi.mock('@/lib/api/lanzamientos', () => ({
  useActualizarLanzamiento: () => ({ mutateAsync: h.actualizar, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({ useBuscarEmpleados: () => ({ data: [], isFetching: false, isError: false }) }));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { LanzamientoCard } from './lanzamiento-card';
import type { Lanzamiento } from '@/lib/api/lanzamientos';

const interno: Lanzamiento = {
  modulo: 'seguridad',
  nombre: 'Autogestión de la Seguridad',
  estado: 'interno',
  actualizadoEn: '2026-10-08T15:00:00Z',
  roles: ['HyS'],
  usuarios: [{ cuil: '20333333333', nombre: 'PEREZ JUAN', rol: 'Supervisor' }],
};

describe('LanzamientoCard', () => {
  beforeEach(() => {
    h.actualizar.mockReset().mockResolvedValue([]);
  });

  it('dice quiénes lo ven mientras está en prueba interna', () => {
    render(<LanzamientoCard l={interno} />);
    expect(screen.getByText(/lo ven Admin, HyS, 1 persona/)).toBeInTheDocument();
  });

  it('lanzar para todos pide confirmación antes de guardar', async () => {
    render(<LanzamientoCard l={interno} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lanzar para todos' }));
    expect(h.actualizar).not.toHaveBeenCalled();
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Lanzar para todos' }));
    expect(h.actualizar).toHaveBeenCalledWith({ modulo: 'seguridad', cambios: { estado: 'todos' } });
  });

  it('guardar el piloto manda los roles y las personas', async () => {
    render(<LanzamientoCard l={interno} />);
    expect(screen.getByRole('button', { name: 'Guardar piloto' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Supervisor' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar piloto' }));
    expect(h.actualizar).toHaveBeenCalledWith({
      modulo: 'seguridad',
      cambios: { roles: ['HyS', 'Supervisor'], usuarios: ['20333333333'] },
    });
  });

  it('Admin figura siempre y no se puede destildar', () => {
    render(<LanzamientoCard l={interno} />);
    expect(screen.getByRole('checkbox', { name: 'Admin (siempre)' })).toBeDisabled();
  });
});
