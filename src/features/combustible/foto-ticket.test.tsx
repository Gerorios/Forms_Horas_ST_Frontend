import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./comprimir-imagen', () => ({
  comprimirImagen: vi.fn(async (archivo: File) => archivo),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { FotoTicket } from './foto-ticket';

describe('FotoTicket', () => {
  it('el input acepta imágenes SIN forzar la cámara (sin atributo capture, para poder elegir de la galería)', () => {
    render(<FotoTicket onFoto={vi.fn()} />);
    const input = screen.getByLabelText('Foto del ticket');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).not.toHaveAttribute('capture');
  });

  it('elegir un archivo dispara onFoto con el blob procesado', async () => {
    const onFoto = vi.fn();
    render(<FotoTicket onFoto={onFoto} />);
    const archivo = new File(['x'], 'ticket.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Foto del ticket'), archivo);
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
  });
});
