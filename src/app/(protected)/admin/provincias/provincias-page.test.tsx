import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useProvinciasAdmin: () => ({ data: [{ id: 1, nombre: 'Córdoba' }], isLoading: false }),
  useCrearProvincia: () => ({ mutateAsync: crear, isPending: false }),
  useEditarProvincia: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import ProvinciasAdminPage from './page';

describe('ProvinciasAdminPage', () => {
  beforeEach(() => { crear.mockClear(); editar.mockClear(); });

  it('editar el nombre de una provincia llama al mutate', async () => {
    render(<ProvinciasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombreEdit = screen.getByDisplayValue('Córdoba');
    await userEvent.clear(nombreEdit);
    await userEvent.type(nombreEdit, 'Córdoba Capital');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, nombre: 'Córdoba Capital' }));
  });
});
