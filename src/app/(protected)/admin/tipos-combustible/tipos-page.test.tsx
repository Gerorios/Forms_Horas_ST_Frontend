import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const actualizar = vi.fn().mockResolvedValue({});
const toggle = vi.fn().mockResolvedValue({});
const guardarAlias = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useAdminTiposCombustible: () => ({
    data: [{ id: 1, nombre: 'Diésel', aliases: ['INFINIA DIESEL'], activo: true }],
    isLoading: false,
  }),
  useCrearTipoCombustible: () => ({ mutateAsync: crear, isPending: false }),
  useActualizarTipoCombustible: () => ({ mutateAsync: actualizar, isPending: false }),
  useToggleTipoCombustible: () => ({ mutateAsync: toggle, isPending: false }),
  useGuardarAliasTipoCombustible: () => ({ mutateAsync: guardarAlias, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import TiposCombustibleAdminPage from './page';

describe('TiposCombustibleAdminPage', () => {
  beforeEach(() => { crear.mockClear(); actualizar.mockClear(); toggle.mockClear(); guardarAlias.mockClear(); });

  it('lista los tipos existentes', () => {
    render(<TiposCombustibleAdminPage />);
    expect(screen.getByText('Diésel')).toBeInTheDocument();
  });

  it('el botón "Nuevo tipo" abre el formulario de alta', async () => {
    render(<TiposCombustibleAdminPage />);
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /nuevo tipo/i }));
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('crea un tipo de combustible con nombre', async () => {
    render(<TiposCombustibleAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /nuevo tipo/i }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'GNC');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(crear).toHaveBeenCalledWith({ nombre: 'GNC' }));
  });

  it('el toggle de activo llama la mutación', async () => {
    render(<TiposCombustibleAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith({ id: 1, activo: false }));
  });

  it('editar un tipo llama al mutate', async () => {
    render(<TiposCombustibleAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByDisplayValue('Diésel');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Diésel premium');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith({ id: 1, nombre: 'Diésel premium' }));
    expect(guardarAlias).not.toHaveBeenCalled();
  });

  it('muestra los alias actuales en la fila cerrada', () => {
    render(<TiposCombustibleAdminPage />);
    expect(screen.getByText(/INFINIA DIESEL/)).toBeInTheDocument();
  });

  it('guarda la lista de alias editada (coma-separados, trim, sin vacíos)', async () => {
    render(<TiposCombustibleAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const alias = screen.getByLabelText(/Alias/);
    expect((alias as HTMLInputElement).value).toBe('INFINIA DIESEL');
    await userEvent.clear(alias);
    await userEvent.type(alias, 'INFINIA DIESEL, EURO DIESEL, ,');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(guardarAlias).toHaveBeenCalledWith({ id: 1, alias: ['INFINIA DIESEL', 'EURO DIESEL'] }),
    );
    expect(actualizar).not.toHaveBeenCalled();
  });
});
