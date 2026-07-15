import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const toggle = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useContratosAdmin: () => ({ data: [{ id: 10, codigo: 'K5', nombre: 'Contrato K5', activo: true, jefeContratoCuil: null, jefeContrato: null }] }),
  useTareasAdmin: () => ({ data: [{ id: 1, nombre: 'Excavación', contratoId: 10, activo: true }], isLoading: false }),
  useCrearTarea: () => ({ mutateAsync: crear, isPending: false }),
  useToggleTarea: () => ({ mutateAsync: toggle, isPending: false }),
  useEditarTarea: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import TareasAdminPage from './page';

describe('TareasAdminPage', () => {
  beforeEach(() => { crear.mockClear(); toggle.mockClear(); editar.mockClear(); });

  it('editar el nombre de una tarea llama al mutate', async () => {
    render(<TareasAdminPage />);
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), '10');
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Montaje');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, nombre: 'Montaje' }));
  });
});
