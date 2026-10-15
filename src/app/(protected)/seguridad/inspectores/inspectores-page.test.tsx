import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({ deshabilitar: vi.fn(), error: false, refetch: vi.fn() }));

vi.mock('@/lib/api/seguridad', () => ({
  useInspectores: () =>
    h.error
      ? { data: undefined, isLoading: false, isError: true, isFetching: false, refetch: h.refetch }
      : {
          data: [{ cuil: '20666', nombre: 'SUAREZ PEDRO', rol: 'Supervisor', activo: true, habilitadoPor: 'HYS', habilitadoEn: '2026-10-08T10:00:00Z' }],
          isLoading: false,
          isError: false,
        },
  useHabilitarInspector: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeshabilitarInspector: () => ({ mutateAsync: h.deshabilitar, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({ useBuscarEmpleados: () => ({ data: [] }) }));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import InspectoresPage from './page';

describe('Inspectores', () => {
  beforeEach(() => {
    h.error = false;
    h.deshabilitar.mockReset().mockResolvedValue([]);
    h.refetch.mockReset();
  });

  it('quitar a un inspector pide confirmar nombrando a la persona', async () => {
    render(<InspectoresPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Quitar a SUAREZ PEDRO como inspector');
    expect(h.deshabilitar).not.toHaveBeenCalled();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Quitar habilitación' }));
    expect(h.deshabilitar).toHaveBeenCalledWith('20666');
  });

  it('un error de carga deja reintentar', async () => {
    h.error = true;
    render(<InspectoresPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los inspectores');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(h.refetch).toHaveBeenCalled();
  });
});
