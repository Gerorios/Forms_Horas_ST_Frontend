import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { agruparPorLote } from '@/lib/agrupar';
import type { RegistroPorAprobar } from '@/types/domain';

const resolverLote = vi.fn().mockResolvedValue({});
const corregirLote = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/aprobaciones', () => ({
  useResolverLote: () => ({ mutateAsync: resolverLote, isPending: false }),
  useCorregirLote: () => ({ mutateAsync: corregirLote, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { LoteCard } from './lote-card';

function fila(
  id: number,
  apellido: string,
  accionable = true,
  codigo = 'K5',
): RegistroPorAprobar {
  return {
    id, loteId: 'lote-1', fecha: '2026-07-10', horas: '8', estado: 'pendiente',
    alertaHoras: false, motivoDesaprobacion: null, observacion: null, loteIdOrigen: null,
    operario: { cuil: `2011${id}`, apellido_nombre: apellido },
    contrato: { id: codigo === 'K5' ? 1 : 2, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
    accionable,
    cargadoPor: { cuil: '20222222222', nombre: 'JEFE CUADRILLA' },
    aprobadoPor: null,
    aprobadoEn: null,
    totalHorasDia: 8,
    duplicadoCruzado: false,
  };
}

function grupo(filas = [fila(1, 'PEREZ'), fila(2, 'GOMEZ')]) {
  return agruparPorLote(filas)[0];
}

describe('LoteCard', () => {
  beforeEach(() => {
    resolverLote.mockClear();
    corregirLote.mockClear();
  });

  it('muestra el resumen de la carga (día, operarios, vehículos, total de horas) siempre visible', () => {
    render(<LoteCard grupo={grupo()} />);
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
    expect(screen.getByText(/PEREZ, GOMEZ/)).toBeInTheDocument();
    expect(screen.getByText(/M-01/)).toBeInTheDocument();
    expect(screen.getByText('8 hs totales')).toBeInTheDocument();
  });

  it('no muestra el detalle por contrato colapsado por default', () => {
    render(<LoteCard grupo={grupo()} />);
    expect(screen.queryByText('K5')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Incluir a PEREZ')).not.toBeInTheDocument();
  });

  it('Aprobar todo (colapsado) resuelve sin ids (todo lo accionable)', async () => {
    render(<LoteCard grupo={grupo()} />);
    await userEvent.click(screen.getByRole('button', { name: /^aprobar todo/i }));
    await waitFor(() =>
      expect(resolverLote).toHaveBeenCalledWith({ loteId: 'lote-1', estado: 'aprobado', ids: undefined }),
    );
  });

  it('al expandir, agrupa por contrato con subtotal de horas y tareas, y checkboxes por operario', async () => {
    render(<LoteCard grupo={grupo([fila(1, 'PEREZ'), fila(2, 'GOMEZ', false, 'K8')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));

    expect(screen.getByText('K5')).toBeInTheDocument();
    expect(screen.getByText('K8')).toBeInTheDocument();
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

  it('"Corregir horas" solo aparece en contratos accionables, precarga el subtotal actual', async () => {
    render(<LoteCard grupo={grupo([fila(1, 'PEREZ'), fila(2, 'GOMEZ', false, 'K8')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));

    expect(screen.getAllByRole('button', { name: /corregir horas/i })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /corregir horas/i }));
    expect(screen.getByLabelText('Horas corregidas')).toHaveValue(8);
  });

  it('confirmar la corrección llama a corregirLote con loteId, contratoId, horas y motivo', async () => {
    render(<LoteCard grupo={grupo([fila(1, 'PEREZ'), fila(2, 'GOMEZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    await userEvent.click(screen.getByRole('button', { name: /corregir horas/i }));

    const horas = screen.getByLabelText('Horas corregidas');
    await userEvent.clear(horas);
    await userEvent.type(horas, '6');
    await userEvent.type(screen.getByLabelText('Motivo'), 'según recorrido registrado son 6hs');
    await userEvent.click(screen.getByRole('button', { name: /confirmar corrección/i }));

    await waitFor(() =>
      expect(corregirLote).toHaveBeenCalledWith({
        loteId: 'lote-1',
        contratoId: 1,
        horasCorregidas: 6,
        motivo: 'según recorrido registrado son 6hs',
      }),
    );
  });

  it('muestra el total real de horas del operario ese día cuando supera 16, no un texto fijo', async () => {
    const conAlerta = { ...fila(1, 'PEREZ'), totalHorasDia: 22 };
    render(<LoteCard grupo={grupo([conAlerta, fila(2, 'GOMEZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText('22hs ese día')).toBeInTheDocument();
    expect(screen.queryByText('+16h')).not.toBeInTheDocument();
  });

  it('muestra la alerta de duplicado cruzado cuando el operario tiene carga en otro lote ese día', async () => {
    const duplicado = { ...fila(1, 'PEREZ'), duplicadoCruzado: true };
    render(<LoteCard grupo={grupo([duplicado, fila(2, 'GOMEZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText(/otro contrato el mismo día/i)).toBeInTheDocument();
  });

  it('sin duplicadoCruzado, no muestra esa alerta', async () => {
    render(<LoteCard grupo={grupo()} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.queryByText(/otro contrato el mismo día/i)).not.toBeInTheDocument();
  });

  it('el botón de confirmar corrección está deshabilitado sin motivo', async () => {
    render(<LoteCard grupo={grupo()} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    await userEvent.click(screen.getByRole('button', { name: /corregir horas/i }));
    expect(screen.getByRole('button', { name: /confirmar corrección/i })).toBeDisabled();
  });
});
