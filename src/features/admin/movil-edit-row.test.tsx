import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MovilAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useEditarMovil: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { MovilEditRow } from './movil-edit-row';

const MOVIL: MovilAdmin = { id: 1, identificador: 'INT-101', descripcion: 'Camioneta', activo: true };

function renderRow(movil: MovilAdmin = MOVIL) {
  return render(<MovilEditRow movil={movil} pill={<span>pill</span>} />);
}

describe('MovilEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

  it('precarga identificador y descripción al expandir', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Identificador')).toHaveValue('INT-101');
    expect(screen.getByLabelText('Descripción')).toHaveValue('Camioneta');
  });

  it('editar el identificador y guardar llama al mutate con id e identificador nuevo', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const identificador = screen.getByLabelText('Identificador');
    await userEvent.clear(identificador);
    await userEvent.type(identificador, 'INT-102');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, identificador: 'INT-102' }));
  });

  it('Guardar deshabilitado sin cambios', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('Cancelar colapsa la fila sin llamar al mutate', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.type(screen.getByLabelText('Identificador'), 'X');
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByLabelText('Identificador')).not.toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });
});
