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
    cargadoPor: { cuil: '20222222222', nombre: 'JEFE CUADRILLA' },
    aprobadoPor: null,
    aprobadoEn: null,
    totalHorasDia: 8,
    duplicadoCruzado: false,
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

  it('muestra quién cargó el lote', () => {
    render(<ResumenCarga grupo={agruparPorLote([fila()])[0]} />);
    expect(screen.getByText(/cargado por:/i)).toBeInTheDocument();
    expect(screen.getByText('JEFE CUADRILLA')).toBeInTheDocument();
  });

  it('sin nombre de cargador (ej. "cargas que hice"), no muestra la línea', () => {
    render(
      <ResumenCarga
        grupo={agruparPorLote([fila({ cargadoPor: { cuil: '', nombre: '' } })])[0]}
      />,
    );
    expect(screen.queryByText(/cargado por:/i)).not.toBeInTheDocument();
  });

  it('sin ninguna fila con alerta, no muestra el badge "Revisar"', () => {
    render(<ResumenCarga grupo={agruparPorLote([fila()])[0]} />);
    expect(screen.queryByText(/revisar/i)).not.toBeInTheDocument();
  });

  it('con una fila de horas totales ≥16, muestra el badge "Revisar" a nivel de tarjeta', () => {
    render(<ResumenCarga grupo={agruparPorLote([fila({ totalHorasDia: 18 })])[0]} />);
    expect(screen.getByText(/revisar/i)).toBeInTheDocument();
  });

  it('con una fila de duplicado cruzado, muestra el badge "Revisar" a nivel de tarjeta', () => {
    render(<ResumenCarga grupo={agruparPorLote([fila({ duplicadoCruzado: true })])[0]} />);
    expect(screen.getByText(/revisar/i)).toBeInTheDocument();
  });
});
