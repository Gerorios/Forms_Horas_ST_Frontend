import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { agruparPorLote } from '@/lib/agrupar';
import type { RegistroPorAprobar } from '@/types/domain';
import { ResumenCarga } from './resumen-carga';

function fila(overrides: Partial<RegistroPorAprobar> = {}): RegistroPorAprobar {
  return {
    id: 1, loteId: 'lote-1', fecha: '2026-07-10', horas: '8', estado: 'aprobado',
    alertaHoras: false, motivoDesaprobacion: null, observacion: null, loteIdOrigen: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [],
    accionable: true,
    ...overrides,
  };
}

describe('ResumenCarga', () => {
  it('sin loteIdOrigen, no muestra el badge de corrección', () => {
    render(<ResumenCarga grupo={agruparPorLote([fila()])[0]} />);
    expect(screen.queryByText(/corrección de horas/i)).not.toBeInTheDocument();
  });

  it('con loteIdOrigen, muestra el badge de corrección', () => {
    render(<ResumenCarga grupo={agruparPorLote([fila({ loteIdOrigen: 'lote-viejo' })])[0]} />);
    expect(screen.getByText(/corrección de horas/i)).toBeInTheDocument();
  });
});
