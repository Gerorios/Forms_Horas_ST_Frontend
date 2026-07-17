import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resolverLote = vi.fn().mockResolvedValue({});

function fila(id: number, loteId: string, accionable: boolean, codigo = 'K5') {
  return {
    id, loteId, fecha: '2026-07-10', horas: '8', estado: 'pendiente', alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ JUAN' },
    contrato: { id: 1, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' }, moviles: [], accionable,
  };
}

vi.mock('@/lib/api/aprobaciones', () => ({
  usePorAprobar: () => ({
    data: [fila(1, 'lote-a', true), fila(2, 'lote-a', false, 'K8'), fila(3, 'lote-b', true)],
    isLoading: false,
  }),
  useResolverLote: () => ({ mutateAsync: resolverLote, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import AprobacionesPage from './page';

describe('AprobacionesPage', () => {
  beforeEach(() => resolverLote.mockClear());

  it('agrupa por lote: 2 lotes distintos → 2 tarjetas, cada una con su botón Aprobar todo', () => {
    render(<AprobacionesPage />);
    expect(screen.getAllByRole('button', { name: /^aprobar todo/i })).toHaveLength(2);
  });

  it('expandir un lote muestra su detalle sin afectar al otro', async () => {
    render(<AprobacionesPage />);
    const detalles = screen.getAllByRole('button', { name: /ver detalle/i });
    await userEvent.click(detalles[0]);
    expect(screen.getAllByRole('button', { name: /^aprobar seleccionados/i })).toHaveLength(1);
  });
});
