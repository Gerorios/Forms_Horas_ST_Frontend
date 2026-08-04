import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const actualizar = vi.fn().mockResolvedValue({});
const toggle = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useAdminEstacionesServicio: () => ({
    data: [{ id: 1, nombre: 'YPF Ruta 3', localidad: 'Trelew', activo: true }],
    isLoading: false,
  }),
  useCrearEstacionServicio: () => ({ mutateAsync: crear, isPending: false }),
  useActualizarEstacionServicio: () => ({ mutateAsync: actualizar, isPending: false }),
  useToggleEstacionServicio: () => ({ mutateAsync: toggle, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import EstacionesServicioAdminPage from './page';

describe('EstacionesServicioAdminPage', () => {
  beforeEach(() => { crear.mockClear(); actualizar.mockClear(); toggle.mockClear(); });

  it('lista las estaciones existentes', () => {
    render(<EstacionesServicioAdminPage />);
    expect(screen.getByText('YPF Ruta 3')).toBeInTheDocument();
    expect(screen.getByText('Trelew')).toBeInTheDocument();
  });

  it('el botón "Nueva estación" abre el formulario de alta', async () => {
    render(<EstacionesServicioAdminPage />);
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /nueva estación/i }));
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('crea una estación con nombre y localidad', async () => {
    render(<EstacionesServicioAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva estación/i }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Shell Km 15');
    await userEvent.type(screen.getByLabelText('Localidad'), 'Puerto Madryn');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({ nombre: 'Shell Km 15', localidad: 'Puerto Madryn' }),
    );
  });

  it('el toggle de activo llama la mutación', async () => {
    render(<EstacionesServicioAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith({ id: 1, activo: false }));
  });

  it('editar una estación llama al mutate', async () => {
    render(<EstacionesServicioAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByDisplayValue('YPF Ruta 3');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'YPF Ruta 3 Norte');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith({ id: 1, nombre: 'YPF Ruta 3 Norte' }));
  });
});
