import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProvinciaAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useEditarProvincia: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { ProvinciaEditRow } from './provincia-edit-row';

const PROVINCIA: ProvinciaAdmin = { id: 1, nombre: 'Córdoba' };

function renderRow(provincia: ProvinciaAdmin = PROVINCIA) {
  return render(<ul><ProvinciaEditRow provincia={provincia} /></ul>);
}

describe('ProvinciaEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

  it('precarga el nombre al expandir', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Córdoba');
  });

  it('editar el nombre y guardar llama al mutate con id y nombre nuevo', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Córdoba Capital');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, nombre: 'Córdoba Capital' }));
  });

  it('Guardar deshabilitado sin cambios', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('Cancelar colapsa la fila sin llamar al mutate', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.type(screen.getByLabelText('Nombre'), ' extra');
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });
});
