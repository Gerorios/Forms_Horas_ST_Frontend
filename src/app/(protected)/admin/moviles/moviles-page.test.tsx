import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const crearMasivo = vi.fn().mockResolvedValue({ creados: [], omitidos: [] });
const toggle = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useMovilesAdmin: () => ({ data: [{ id: 1, identificador: 'INT-101', descripcion: 'Camioneta', activo: true }], isLoading: false }),
  useCrearMovil: () => ({ mutateAsync: crear, isPending: false }),
  useCrearMovilesMasivo: () => ({ mutateAsync: crearMasivo, isPending: false }),
  useToggleMovil: () => ({ mutateAsync: toggle, isPending: false }),
  useEditarMovil: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import MovilesAdminPage from './page';

describe('MovilesAdminPage', () => {
  beforeEach(() => { crear.mockClear(); crearMasivo.mockClear(); toggle.mockClear(); editar.mockClear(); });

  it('crea un móvil con identificador', async () => {
    render(<MovilesAdminPage />);
    await userEvent.type(screen.getByLabelText('Identificador'), 'AB123CD');
    await userEvent.click(screen.getByRole('button', { name: /agregar/i }));
    await waitFor(() => expect(crear).toHaveBeenCalledWith({ identificador: 'AB123CD', descripcion: undefined }));
  });

  it('el toggle de activo llama la mutación', async () => {
    render(<MovilesAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith({ id: 1, activo: false }));
  });

  it('editar la descripción de un móvil llama al mutate', async () => {
    render(<MovilesAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const descripcion = screen.getByDisplayValue('Camioneta');
    await userEvent.clear(descripcion);
    await userEvent.type(descripcion, 'Camioneta blanca');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, descripcion: 'Camioneta blanca' }));
  });

  it('cargar listado separa por salto de línea y coma, recorta espacios y saca duplicados', async () => {
    render(<MovilesAdminPage />);
    const textarea = screen.getByLabelText('Listado de identificadores');
    await userEvent.type(textarea, ' M-01 \nM-02, M-02,M-03 ');
    await userEvent.click(screen.getByRole('button', { name: /cargar listado/i }));
    await waitFor(() =>
      expect(crearMasivo).toHaveBeenCalledWith(['M-01', 'M-02', 'M-03']),
    );
  });

  it('botón "Cargar listado" deshabilitado si no hay texto', () => {
    render(<MovilesAdminPage />);
    expect(screen.getByRole('button', { name: /cargar listado/i })).toBeDisabled();
  });
});
