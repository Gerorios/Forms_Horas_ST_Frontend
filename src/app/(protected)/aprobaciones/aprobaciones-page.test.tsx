import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resolver = vi.fn().mockResolvedValue({});
const reabrir = vi.fn().mockResolvedValue({});

function fila(id: number, accionable: boolean, codigo = 'K5') {
  return {
    id, fecha: '2026-07-10', horas: '8', estado: 'pendiente', alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ JUAN' },
    contrato: { id: 1, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' }, moviles: [], accionable,
  };
}

vi.mock('@/lib/api/aprobaciones', () => ({
  usePorAprobar: () => ({ data: [fila(1, true), fila(2, false, 'K8')], isLoading: false }),
  useResolverRegistro: () => ({ mutateAsync: resolver, isPending: false }),
  useReabrirRegistro: () => ({ mutateAsync: reabrir, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AprobacionesPage from './page';

describe('AprobacionesPage', () => {
  beforeEach(() => { resolver.mockClear(); });

  it('la fila accionable tiene Aprobar; la de otro contrato (K8) no', () => {
    render(<AprobacionesPage />);
    // exactamente un botón "Aprobar" (match exacto, no "Desaprobar")
    expect(screen.getAllByRole('button', { name: /^aprobar$/i })).toHaveLength(1);
    // la fila de contexto muestra el código K8
    expect(screen.getByText('K8')).toBeInTheDocument();
  });

  it('aprobar llama la mutación con el id y estado aprobado', async () => {
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByRole('button', { name: /^aprobar$/i }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith({ id: 1, estado: 'aprobado' }),
    );
  });

  it('desaprobar exige motivo y luego llama la mutación', async () => {
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByRole('button', { name: /desaprobar/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), 'faltan datos');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith({ id: 1, estado: 'desaprobado', motivoDesaprobacion: 'faltan datos' }),
    );
  });
});
