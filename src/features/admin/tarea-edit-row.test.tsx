import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TareaAdmin, ContratoAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useEditarTarea: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { TareaEditRow } from './tarea-edit-row';

const TAREA: TareaAdmin = { id: 1, nombre: 'Excavación', contratoId: 10, activo: true };
const CONTRATOS: ContratoAdmin[] = [
  { id: 10, codigo: 'K5', nombre: 'Contrato K5', activo: true, jefeContratoCuil: null, jefeContrato: null },
  { id: 11, codigo: 'K8', nombre: 'Contrato K8', activo: true, jefeContratoCuil: null, jefeContrato: null },
];

function renderRow(tarea: TareaAdmin = TAREA) {
  return render(<TareaEditRow tarea={tarea} contratos={CONTRATOS} pill={<span>pill</span>} />);
}

describe('TareaEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

  it('precarga nombre y contrato al expandir', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Excavación');
    expect(screen.getByLabelText('Contrato')).toHaveValue('10');
  });

  it('editar el nombre y guardar llama al mutate con id y nombre nuevo', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Montaje');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, nombre: 'Montaje' }));
  });

  it('cambiar el contrato llama al mutate solo con contratoId', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), '11');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, contratoId: 11 }));
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
