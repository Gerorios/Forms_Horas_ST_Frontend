import { describe, it, expect } from 'vitest';
import { agruparPorLote } from './agrupar';
import type { RegistroPorAprobar } from '@/types/domain';

function fila(id: number, loteId: string, fecha: string, accionable = true): RegistroPorAprobar {
  return {
    id, loteId, fecha, horas: '8', estado: 'pendiente', alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [],
    accionable,
  };
}

describe('agruparPorLote', () => {
  it('agrupa filas del mismo lote en un solo grupo', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10'),
      fila(2, 'lote-a', '2026-07-10', false),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].filas).toHaveLength(2);
    expect(grupos[0].accionables).toHaveLength(1);
  });

  it('separa por loteId', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10'),
      fila(2, 'lote-b', '2026-07-10'),
    ]);
    expect(grupos).toHaveLength(2);
  });

  it('accionables solo incluye las filas con accionable=true', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', true),
      fila(2, 'lote-a', '2026-07-10', false),
      fila(3, 'lote-a', '2026-07-10', false),
    ]);
    expect(grupos[0].accionables).toHaveLength(1);
    expect(grupos[0].accionables[0].id).toBe(1);
  });
});
