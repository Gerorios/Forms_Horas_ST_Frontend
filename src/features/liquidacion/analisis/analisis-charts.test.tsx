import { describe, it, expect, vi } from 'vitest';
import { cloneElement, type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { fmtMoneda } from './colores';
import { ComposicionPago } from './composicion-pago';
import { TopCobradores } from './top-cobradores';
import { ContratosChart } from './contratos-chart';
import { HistoricoChart } from './historico-chart';
import type { AnalisisQuincena } from '@/lib/api/liquidacion';

// jsdom no mide el layout: ResponsiveContainer quedaría en 0×0 y Recharts no
// dibujaría nada. Se lo reemplaza por un passthrough con tamaño fijo (mismo
// patrón que control-general/charts.test.tsx).
vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as object),
  };
});

describe('fmtMoneda', () => {
  it('formatea es-AR sin centavos por defecto y con 2 decimales a pedido', () => {
    expect(fmtMoneda(1234567)).toBe('$ 1.234.567');
    expect(fmtMoneda(1500.5, 2)).toBe('$ 1.500,50');
  });
});

describe('ComposicionPago', () => {
  it('renderiza las 5 leyendas con monto y porcentaje', () => {
    render(
      <ComposicionPago
        composicion={{ basico: 500, extras: 200, presentismo: 100, plus: 100, bono: 100 }}
      />,
    );
    for (const nombre of ['Básico', 'Horas extra', 'Presentismo', 'Plus', 'Bono']) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
    }
    expect(screen.getByText(/\$\s*500/)).toBeInTheDocument();
    expect(screen.getByText(/50,0\s*%/)).toBeInTheDocument();
  });

  it('sin montos muestra vacío accesible', () => {
    render(
      <ComposicionPago composicion={{ basico: 0, extras: 0, presentismo: 0, plus: 0, bono: 0 }} />,
    );
    expect(screen.getByText('Sin montos en la quincena.')).toBeInTheDocument();
  });
});

const cobrador = (
  cuil: string,
  nombre: string,
  total: number,
  deltaPct: number | null,
): AnalisisQuincena['topCobradores'][number] => ({
  cuil,
  nombre,
  total,
  totalAnterior: deltaPct === null ? null : total / (1 + deltaPct / 100),
  deltaPct,
  diasTrabajados: 10,
});

describe('TopCobradores', () => {
  it('muestra nombres, deltas y "(nuevo)"', () => {
    render(
      <TopCobradores
        cobradores={[
          cobrador('20-1', 'PEREZ JUAN', 1000, 30.5),
          cobrador('20-2', 'GOMEZ ANA', 800, -5.2),
          cobrador('20-3', 'NUEVO PEDRO', 500, null),
        ]}
      />,
    );
    expect(screen.getAllByText('PEREZ JUAN').length).toBeGreaterThan(0);
    expect(screen.getByText(/\+30,5\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/-5,2\s*%/)).toBeInTheDocument();
    expect(screen.getByText('(nuevo)')).toBeInTheDocument();
  });

  it('sin datos muestra vacío accesible', () => {
    render(<TopCobradores cobradores={[]} />);
    expect(screen.getByText('Sin cobradores en esta quincena.')).toBeInTheDocument();
  });
});

describe('ContratosChart', () => {
  it('muestra los contratos y el bucket sin contrato en la tabla', () => {
    render(
      <ContratosChart
        contratos={[
          { contratoId: 1, codigo: 'K5', nombre: 'Gasnor K5', monto: 600, horas: 60, pctDelTotal: 50 },
          { contratoId: 2, codigo: 'K9', nombre: 'Gasnor K9', monto: 300, horas: 30, pctDelTotal: 25 },
          {
            contratoId: null,
            codigo: 'Sin contrato asignable',
            nombre: 'Sin contrato asignable',
            monto: 300,
            horas: 0,
            pctDelTotal: 25,
          },
        ]}
      />,
    );
    expect(screen.getAllByText('K5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('K9').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sin contrato asignable').length).toBeGreaterThan(0);
    expect(screen.getByText('Gasnor K5')).toBeInTheDocument();
  });

  it('sin datos muestra vacío accesible', () => {
    render(<ContratosChart contratos={[]} />);
    expect(screen.getByText('Sin montos por contrato.')).toBeInTheDocument();
  });
});

describe('HistoricoChart', () => {
  it('renderiza las 8 etiquetas de quincena', () => {
    const historico = [
      { anio: 2026, mes: 4, quincena: 2, total: 100 },
      { anio: 2026, mes: 5, quincena: 1, total: 110 },
      { anio: 2026, mes: 5, quincena: 2, total: 120 },
      { anio: 2026, mes: 6, quincena: 1, total: 130 },
      { anio: 2026, mes: 6, quincena: 2, total: 140 },
      { anio: 2026, mes: 7, quincena: 1, total: 150 },
      { anio: 2026, mes: 7, quincena: 2, total: 160 },
      { anio: 2026, mes: 8, quincena: 1, total: 170 },
    ];
    render(
      <HistoricoChart historico={historico} seleccionada={{ anio: 2026, mes: 8, quincena: 1 }} />,
    );
    expect(screen.getByText('1ª ago')).toBeInTheDocument();
    expect(screen.getByText('2ª jul')).toBeInTheDocument();
    expect(screen.getByText('2ª abr')).toBeInTheDocument();
    expect(screen.getByText('1ª may')).toBeInTheDocument();
  });

  it('sin datos muestra vacío accesible', () => {
    render(<HistoricoChart historico={[]} seleccionada={{ anio: 2026, mes: 8, quincena: 1 }} />);
    expect(screen.getByText('Sin histórico disponible.')).toBeInTheDocument();
  });
});
