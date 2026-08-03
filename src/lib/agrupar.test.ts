import { describe, it, expect } from 'vitest';
import { agruparPorLote } from './agrupar';
import type { RegistroPorAprobar } from '@/types/domain';

function fila(
  id: number,
  loteId: string,
  fecha: string,
  overrides: Partial<RegistroPorAprobar> = {},
): RegistroPorAprobar {
  return {
    id, loteId, fecha, horas: '8', estado: 'pendiente', alertaHoras: false, motivoDesaprobacion: null, observacion: null, loteIdOrigen: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
    accionable: true,
    cargadoPor: { cuil: '20222222222', nombre: 'JEFE CUADRILLA' },
    aprobadoPor: null,
    aprobadoEn: null,
    totalHorasDia: 8,
    duplicadoCruzado: false,
    ...overrides,
  };
}

describe('agruparPorLote', () => {
  it('agrupa filas del mismo lote en un solo grupo', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10'),
      fila(2, 'lote-a', '2026-07-10', { accionable: false }),
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
      fila(1, 'lote-a', '2026-07-10', { accionable: true }),
      fila(2, 'lote-a', '2026-07-10', { accionable: false }),
      fila(3, 'lote-a', '2026-07-10', { accionable: false }),
    ]);
    expect(grupos[0].accionables).toHaveLength(1);
    expect(grupos[0].accionables[0].id).toBe(1);
  });

  it('calcula el total de horas de todo el lote, sin importar el contrato', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', { horas: '8', contrato: { id: 1, codigo: 'K5', nombre: 'K5' } }),
      fila(2, 'lote-a', '2026-07-10', {
        horas: '4',
        accionable: false,
        contrato: { id: 2, codigo: 'K8', nombre: 'K8' },
      }),
    ]);
    expect(grupos[0].totalHoras).toBe(12);
  });

  it('no multiplica las horas por operario: una línea se repite en una fila por cada operario de la cuadrilla', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '8',
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '8',
      }),
      fila(3, 'lote-a', '2026-07-10', {
        operario: { cuil: '20333', apellido_nombre: 'DIAZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '8',
      }),
    ]);
    const [g] = grupos;
    // 3 operarios trabajaron las mismas 8hs de cuadrilla en el mismo contrato,
    // no 24hs entre los tres.
    expect(g.contratos[0].subtotalHoras).toBe(8);
    expect(g.totalHoras).toBe(8);
  });

  it('deduplica operarios y vehículos a nivel de lote', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
      }),
      fila(3, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        moviles: [{ movil: { id: 2, identificador: 'M-02' } }],
      }),
    ]);
    expect(grupos[0].operarios).toHaveLength(2);
    expect(grupos[0].vehiculos).toHaveLength(2);
  });

  it('agrupa por contrato dentro del lote, con subtotal de horas (sin duplicar por operario) y tareas deduplicadas', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '4',
        tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '4',
        tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }, { tarea: { id: 2, nombre: 'Zanjeo' } }],
      }),
      fila(3, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        contrato: { id: 2, codigo: 'K8', nombre: 'K8' },
        accionable: false,
        horas: '3',
        tareas: [{ tarea: { id: 3, nombre: 'Nivelación' } }],
      }),
    ]);
    const [g] = grupos;
    expect(g.contratos).toHaveLength(2);

    const k5 = g.contratos.find((c) => c.contrato.codigo === 'K5')!;
    expect(k5.subtotalHoras).toBe(4);
    expect(k5.tareas).toEqual(['Excavación', 'Zanjeo']);
    expect(k5.accionable).toBe(true);
    expect(k5.filas).toHaveLength(2);

    const k8 = g.contratos.find((c) => c.contrato.codigo === 'K8')!;
    expect(k8.subtotalHoras).toBe(3);
    expect(k8.accionable).toBe(false);

    expect(g.totalHoras).toBe(7);
  });

  it('lo desaprobado no cuenta para el subtotal ni el total: un rechazo no es una hora real', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '8',
        estado: 'desaprobado',
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        contrato: { id: 2, codigo: 'K8', nombre: 'K8' },
        horas: '5',
        estado: 'aprobado',
      }),
    ]);
    const [g] = grupos;
    const k5 = g.contratos.find((c) => c.contrato.codigo === 'K5')!;
    expect(k5.subtotalHoras).toBe(0);
    expect(g.totalHoras).toBe(5);
  });

  it('si la primera fila de un contrato está desaprobada pero otra del mismo grupo no, cuenta la válida', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '8',
        estado: 'desaprobado',
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        horas: '8',
        estado: 'aprobado',
      }),
    ]);
    expect(grupos[0].contratos[0].subtotalHoras).toBe(8);
    expect(grupos[0].totalHoras).toBe(8);
  });

  it('toma la observación de la línea una sola vez, no la concatena por operario', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        observacion: 'Viajamos a otra localidad, se hicieron 3 tareas',
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        observacion: 'Viajamos a otra localidad, se hicieron 3 tareas',
      }),
    ]);
    expect(grupos[0].contratos[0].observacion).toBe('Viajamos a otra localidad, se hicieron 3 tareas');
  });

  it('si la primera fila no tiene observación pero otra del grupo sí, toma esa', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', {
        operario: { cuil: '20111', apellido_nombre: 'PEREZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        observacion: null,
      }),
      fila(2, 'lote-a', '2026-07-10', {
        operario: { cuil: '20222', apellido_nombre: 'GOMEZ' },
        contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
        observacion: 'justificación de horas',
      }),
    ]);
    expect(grupos[0].contratos[0].observacion).toBe('justificación de horas');
  });

  it('sin observación en ninguna fila, queda null', () => {
    const grupos = agruparPorLote([fila(1, 'lote-a', '2026-07-10')]);
    expect(grupos[0].contratos[0].observacion).toBeNull();
  });

  it('toma cargadoPor de la primera fila del lote (es el mismo para todo el envío)', () => {
    const grupos = agruparPorLote([
      fila(1, 'lote-a', '2026-07-10', { cargadoPor: { cuil: '20222222222', nombre: 'JEFE CUADRILLA' } }),
      fila(2, 'lote-a', '2026-07-10'),
    ]);
    expect(grupos[0].cargadoPor.nombre).toBe('JEFE CUADRILLA');
  });
});
