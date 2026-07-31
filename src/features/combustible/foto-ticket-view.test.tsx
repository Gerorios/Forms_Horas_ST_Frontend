import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const get = vi.fn();

vi.mock('@/lib/api/client', () => ({ api: { get: (...args: unknown[]) => get(...args) } }));

import { FotoTicketView } from './foto-ticket-view';

describe('FotoTicketView', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: new Blob(['fake-image'], { type: 'image/jpeg' }) });
    // jsdom no implementa createObjectURL/revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('pide la foto del ticket como blob y la muestra en un <img>', async () => {
    render(<FotoTicketView cargaId={1} />);

    await waitFor(() => expect(screen.getByAltText('Foto del ticket')).toBeInTheDocument());

    const img = screen.getByAltText('Foto del ticket') as HTMLImageElement;
    expect(img.src).toMatch(/^blob:/);
    expect(get).toHaveBeenCalledWith('/cargas-combustible/1/ticket', { responseType: 'blob' });
  });
});
