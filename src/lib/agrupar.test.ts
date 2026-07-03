import { describe, it, expect } from 'vitest';
import { agruparPorOperarioFecha } from './agrupar';
import type { RegistroPorAprobar } from '@/types/domain';

function fila(id: number, cuil: string, nombre: string, fecha: string, accionable = true): RegistroPorAprobar {
  return {
    id, fecha, horas: '8', estado: 'pendiente', alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil, apellido_nombre: nombre },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [],
    accionable,
  };
}

describe('agruparPorOperarioFecha', () => {
  it('agrupa filas del mismo operario y fecha en un solo grupo', () => {
    const grupos = agruparPorOperarioFecha([
      fila(1, '20111', 'PEREZ', '2026-07-10'),
      fila(2, '20111', 'PEREZ', '2026-07-10', false),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].filas).toHaveLength(2);
    expect(grupos[0].operarioNombre).toBe('PEREZ');
  });

  it('separa por operario y por fecha', () => {
    const grupos = agruparPorOperarioFecha([
      fila(1, '20111', 'PEREZ', '2026-07-10'),
      fila(2, '20222', 'GOMEZ', '2026-07-10'),
      fila(3, '20111', 'PEREZ', '2026-07-11'),
    ]);
    expect(grupos).toHaveLength(3);
  });
});
