import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GrupoLote } from '@/lib/agrupar';

const resolverLote = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/aprobaciones', () => ({
  useResolverLote: () => ({ mutateAsync: resolverLote, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { LoteCard } from './lote-card';

function fila(id: number, apellido: string, accionable = true, codigo = 'K5') {
  return {
    id, loteId: 'lote-1', fecha: '2026-07-10', horas: '8', estado: 'pendiente',
    alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: `2011${id}`, apellido_nombre: apellido },
    contrato: { id: 1, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [],
    accionable,
  };
}

function grupo(filas = [fila(1, 'PEREZ'), fila(2, 'GOMEZ')]): GrupoLote {
  return {
    loteId: 'lote-1',
    fecha: '2026-07-10',
    filas,
    accionables: filas.filter((f) => f.accionable),
  };
}

describe('LoteCard', () => {
  beforeEach(() => resolverLote.mockClear());

  it('muestra el resumen de operarios accionables y la fecha, colapsado por default', () => {
    render(<LoteCard grupo={grupo()} />);
    expect(screen.getByText('2 operario(s)')).toBeInTheDocument();
    expect(screen.getByText('2026-07-10')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ')).not.toBeInTheDocument();
  });

  it('Aprobar todo (colapsado) resuelve sin ids (todo lo accionable)', async () => {
    render(<LoteCard grupo={grupo()} />);
    await userEvent.click(screen.getByRole('button', { name: /^aprobar todo/i }));
    await waitFor(() =>
      expect(resolverLote).toHaveBeenCalledWith({ loteId: 'lote-1', estado: 'aprobado', ids: undefined }),
    );
  });

  it('al expandir, muestra checkboxes tildados para accionables y filas de otro contrato en gris sin checkbox', async () => {
    render(<LoteCard grupo={grupo([fila(1, 'PEREZ'), fila(2, 'GOMEZ', false, 'K8')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByLabelText('Incluir a PEREZ')).toBeChecked();
    expect(screen.queryByLabelText('Incluir a GOMEZ')).not.toBeInTheDocument();
    expect(screen.getByText('GOMEZ')).toBeInTheDocument();
    expect(screen.getByText(/otro contrato/i)).toBeInTheDocument();
  });

  it('destildar una fila y aprobar seleccionados envía solo los ids tildados', async () => {
    render(<LoteCard grupo={grupo()} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    await userEvent.click(screen.getByLabelText('Incluir a GOMEZ'));
    await userEvent.click(screen.getByRole('button', { name: /^aprobar seleccionados/i }));
    await waitFor(() =>
      expect(resolverLote).toHaveBeenCalledWith({ loteId: 'lote-1', estado: 'aprobado', ids: [1] }),
    );
  });

  it('desaprobar exige motivo y llama con ids undefined en modo colapsado', async () => {
    render(<LoteCard grupo={grupo()} />);
    await userEvent.click(screen.getByRole('button', { name: /^desaprobar todo/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), 'no corresponde');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() =>
      expect(resolverLote).toHaveBeenCalledWith({
        loteId: 'lote-1', estado: 'desaprobado', ids: undefined, motivoDesaprobacion: 'no corresponde',
      }),
    );
  });

  it('botones deshabilitados si expandido y 0 seleccionados', async () => {
    render(<LoteCard grupo={grupo([fila(1, 'PEREZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    await userEvent.click(screen.getByLabelText('Incluir a PEREZ'));
    expect(screen.getByRole('button', { name: /^aprobar seleccionados/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^desaprobar seleccionados/i })).toBeDisabled();
  });
});
