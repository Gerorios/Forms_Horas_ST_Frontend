import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const cargarKms = vi.fn().mockResolvedValue({ actualizados: 1 });

vi.mock('@/lib/api/liquidacion', () => ({
  useKmPorTantos: () => ({
    data: [
      { cuil: '20666666666', apellidoNombre: 'RELEVADOR PABLO', kmTotal: '150.00' },
      { cuil: '20777777777', apellidoNombre: 'RELEVADOR SOFIA', kmTotal: null },
    ],
    isLoading: false,
  }),
  useCargarKmPorTantos: () => ({ mutateAsync: cargarKms, isPending: false }),
  mensajeDeError: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import KmPorTantosPage from './page';

describe('KmPorTantosPage', () => {
  beforeEach(() => cargarKms.mockClear());

  it('lista los relevadores con su km ya cargado (o vacío)', () => {
    render(<KmPorTantosPage />);
    expect(screen.getByText('RELEVADOR PABLO')).toBeInTheDocument();
    expect(screen.getByLabelText('Km de RELEVADOR PABLO')).toHaveValue(150);
    expect(screen.getByLabelText('Km de RELEVADOR SOFIA')).toHaveValue(null);
  });

  it('cargar km y guardar todos envía solo las filas con valor', async () => {
    render(<KmPorTantosPage />);
    await userEvent.type(screen.getByLabelText('Km de RELEVADOR SOFIA'), '80');
    await userEvent.click(screen.getByRole('button', { name: /guardar todos/i }));

    expect(cargarKms).toHaveBeenCalledWith(
      expect.objectContaining({
        kms: [
          { cuil: '20666666666', kmTotal: 150 },
          { cuil: '20777777777', kmTotal: 80 },
        ],
      }),
    );
  });
});
