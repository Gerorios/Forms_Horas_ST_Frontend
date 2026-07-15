import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TipoNovedadAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useEditarTipoNovedad: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { TipoNovedadEditRow } from './tipo-novedad-edit-row';

const TIPO: TipoNovedadAdmin = { id: 1, nombre: 'Ausencia', requiereAprobacionHys: true, generaPlus: false, activo: true };

function renderRow(tipo: TipoNovedadAdmin = TIPO) {
  return render(<TipoNovedadEditRow tipo={tipo} pill={<span>pill</span>} />);
}

describe('TipoNovedadEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

  it('precarga nombre y checkboxes al expandir', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ausencia');
    expect(screen.getByLabelText(/requiere aprobación de hys/i)).toBeChecked();
    expect(screen.getByLabelText(/genera plus/i)).not.toBeChecked();
  });

  it('cambiar "genera plus" y guardar llama al mutate solo con ese campo', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByLabelText(/genera plus/i));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, generaPlus: true }));
  });

  it('Guardar deshabilitado sin cambios', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('Cancelar colapsa la fila sin llamar al mutate', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByLabelText(/genera plus/i));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });
});
