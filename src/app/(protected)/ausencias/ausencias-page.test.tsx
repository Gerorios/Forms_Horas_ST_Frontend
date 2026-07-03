import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resolver = vi.fn().mockResolvedValue({});

function nov(id: number) {
  return {
    id, operarioCuil: '20111', tipoNovedadId: 5, fechaInicio: '2026-07-10', fechaFin: null,
    justificacionTexto: 'gripe', estadoHys: 'pendiente',
    operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
    tipoNovedad: { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
    cargadoPor: { cuil: '20999', email: 'sup@test.local' },
  };
}

vi.mock('@/lib/api/novedades', () => ({
  useNovedadesPorEstado: () => ({ data: [nov(1)], isLoading: false }),
  useResolverHys: () => ({ mutateAsync: resolver, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AusenciasPage from './page';

describe('AusenciasPage', () => {
  beforeEach(() => resolver.mockClear());

  it('aprobar llama resolver-hys con estado aprobada', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: /^aprobar$/i }));
    await waitFor(() => expect(resolver).toHaveBeenCalledWith({ id: 1, estadoHys: 'aprobada' }));
  });

  it('desaprobar llama resolver-hys con estado desaprobada', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: /desaprobar/i }));
    await waitFor(() => expect(resolver).toHaveBeenCalledWith({ id: 1, estadoHys: 'desaprobada' }));
  });
});
