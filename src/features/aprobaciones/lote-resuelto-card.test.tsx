import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { agruparPorLote } from '@/lib/agrupar';
import type { RegistroPorAprobar } from '@/types/domain';

const reabrirRegistro = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/aprobaciones', () => ({
  useReabrirRegistro: () => ({ mutateAsync: reabrirRegistro, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { LoteResueltoCard } from './lote-resuelto-card';

function fila(id: number, apellido: string): RegistroPorAprobar {
  return {
    id, loteId: 'lote-1', fecha: '2026-07-10', horas: '8', estado: 'aprobado',
    alertaHoras: false, motivoDesaprobacion: null, observacion: null, loteIdOrigen: null,
    operario: { cuil: `2011${id}`, apellido_nombre: apellido },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
    accionable: true,
  };
}

describe('LoteResueltoCard', () => {
  beforeEach(() => reabrirRegistro.mockClear());

  it('conecta el botón Reabrir a useReabrirRegistro con el id de la fila', async () => {
    render(<LoteResueltoCard grupo={agruparPorLote([fila(1, 'PEREZ')])[0]} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    await userEvent.click(screen.getByRole('button', { name: /^reabrir$/i }));
    await waitFor(() => expect(reabrirRegistro).toHaveBeenCalledWith(1));
  });
});
