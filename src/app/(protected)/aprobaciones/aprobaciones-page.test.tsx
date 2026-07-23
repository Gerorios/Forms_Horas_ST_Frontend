import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resolverLote = vi.fn().mockResolvedValue({});
const reabrirRegistro = vi.fn().mockResolvedValue({});
const corregirLote = vi.fn().mockResolvedValue({});

function fila(id: number, loteId: string, accionable: boolean, estado = 'pendiente', codigo = 'K5') {
  return {
    id, loteId, fecha: '2026-07-10', horas: '8', estado, alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ JUAN' },
    contrato: { id: 1, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' }, moviles: [], accionable,
  };
}

const datosPorEstado: Record<string, ReturnType<typeof fila>[]> = {
  pendiente: [fila(1, 'lote-a', true), fila(2, 'lote-a', false, 'pendiente', 'K8'), fila(3, 'lote-b', true)],
  aprobado: [fila(4, 'lote-c', true, 'aprobado')],
  desaprobado: [fila(5, 'lote-d', true, 'desaprobado')],
};

vi.mock('@/lib/api/aprobaciones', () => ({
  usePorAprobar: (estado: string) => ({ data: datosPorEstado[estado] ?? [], isLoading: false }),
  useResolverLote: () => ({ mutateAsync: resolverLote, isPending: false }),
  useReabrirRegistro: () => ({ mutateAsync: reabrirRegistro, isPending: false }),
  useCorregirLote: () => ({ mutateAsync: corregirLote, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import AprobacionesPage from './page';

describe('AprobacionesPage', () => {
  beforeEach(() => {
    resolverLote.mockClear();
    reabrirRegistro.mockClear();
    corregirLote.mockClear();
  });

  it('por default muestra la pestaña Pendientes, agrupada por lote, sin filtro de quincena', () => {
    render(<AprobacionesPage />);
    expect(screen.getAllByRole('button', { name: /^aprobar todo/i })).toHaveLength(2);
    expect(screen.queryByLabelText('Quincena')).not.toBeInTheDocument();
  });

  it('expandir un lote muestra su detalle sin afectar al otro', async () => {
    render(<AprobacionesPage />);
    const detalles = screen.getAllByRole('button', { name: /ver detalle/i });
    await userEvent.click(detalles[0]);
    expect(screen.getAllByRole('button', { name: /^aprobar seleccionados/i })).toHaveLength(1);
  });

  it('la pestaña Aprobados muestra el filtro de quincena y oculta las acciones de aprobar/desaprobar', async () => {
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Aprobados' }));
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^aprobar todo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^desaprobar todo/i })).not.toBeInTheDocument();
  });

  it('la pestaña Rechazados también muestra el filtro de quincena', async () => {
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Rechazados' }));
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
  });
});
