import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const toggle = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useTiposNovedadAdmin: () => ({ data: [{ id: 1, nombre: 'Ausencia', requiereAprobacionHys: true, generaPlus: false, activo: true }], isLoading: false }),
  useCrearTipoNovedad: () => ({ mutateAsync: crear, isPending: false }),
  useToggleTipoNovedad: () => ({ mutateAsync: toggle, isPending: false }),
  useEditarTipoNovedad: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import TiposNovedadAdminPage from './page';

describe('TiposNovedadAdminPage', () => {
  beforeEach(() => { crear.mockClear(); toggle.mockClear(); editar.mockClear(); });

  it('editar el nombre de un tipo de novedad llama al mutate', async () => {
    render(<TiposNovedadAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByDisplayValue('Ausencia'); // Get the input with current value "Ausencia"
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Ausencia justificada');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, nombre: 'Ausencia justificada' }));
  });
});
