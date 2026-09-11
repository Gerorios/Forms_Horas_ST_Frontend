import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useCrearMovil: () => ({ mutateAsync: crear, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { CrearMovilDialog } from './crear-movil-dialog';

describe('CrearMovilDialog', () => {
  const onClose = vi.fn();
  beforeEach(() => { crear.mockClear().mockResolvedValue({}); onClose.mockClear(); });

  it('muestra los campos del alta con el rótulo Patente', () => {
    render(<CrearMovilDialog onClose={onClose} />);
    expect(screen.getByText('Añadir móvil')).toBeInTheDocument();
    expect(screen.getByLabelText('Patente')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
  });

  it('no se puede crear sin patente, ni con puros espacios', async () => {
    render(<CrearMovilDialog onClose={onClose} />);
    const boton = screen.getByRole('button', { name: /^crear$/i });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Patente'), '   ');
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Patente'), 'AB123CD');
    expect(boton).toBeEnabled();
  });

  it('guarda lo escrito tal cual, recortando solo los extremos', async () => {
    render(<CrearMovilDialog onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Patente'), '  AB123CD  ');
    await userEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({ identificador: 'AB123CD', descripcion: undefined }),
    );
  });

  it('no rompe los móviles que se identifican por nombre en vez de por patente', async () => {
    // En la flota hay identificadores como "TACHO PAÑOL", "S/N" o "HQJ 539".
    // Normalizar a [A-Z0-9] los juntaría y se comería la Ñ: se guarda tal cual.
    render(<CrearMovilDialog onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Patente'), 'TACHO PAÑOL');
    await userEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({ identificador: 'TACHO PAÑOL', descripcion: undefined }),
    );
  });

  it('la descripción va recortada', async () => {
    render(<CrearMovilDialog onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Patente'), 'AB123CD');
    await userEvent.type(screen.getByLabelText('Descripción'), '  Camioneta Hilux  ');
    await userEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({ identificador: 'AB123CD', descripcion: 'Camioneta Hilux' }),
    );
  });

  it('cierra al guardar bien', async () => {
    render(<CrearMovilDialog onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Patente'), 'AB123CD');
    await userEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('si la creación falla queda abierto, para poder corregir', async () => {
    crear.mockRejectedValueOnce(new Error('duplicado'));
    render(<CrearMovilDialog onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Patente'), 'AB123CD');
    await userEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() => expect(crear).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Cancelar cierra sin crear nada', async () => {
    render(<CrearMovilDialog onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
    expect(crear).not.toHaveBeenCalled();
  });
});
