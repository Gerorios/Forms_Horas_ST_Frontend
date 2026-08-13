import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cloneElement, type ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnalisisQuincena } from '@/lib/api/liquidacion';

// Mismo passthrough de ResponsiveContainer que charts.test (jsdom no mide layout).
vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as object),
  };
});

const useAnalisisQuincena = vi.fn();
vi.mock('@/lib/api/liquidacion', () => ({
  useAnalisisQuincena: (...args: unknown[]) => useAnalisisQuincena(...args),
}));

import AnalisisPage from './page';

const fixture: AnalisisQuincena = {
  periodo: { anio: 2026, mes: 8, quincena: 1 },
  totales: {
    total: 1500000,
    empleados: 12,
    empleadosNuevos: 2,
    horasCct: 1056,
    horasExtra: 40,
    costoPromedio: 125000,
  },
  anterior: { total: 1200000, empleados: 11, costoPromedio: 109090.91 },
  composicion: { basico: 900000, extras: 300000, presentismo: 150000, plus: 100000, bono: 50000 },
  topCobradores: [
    { cuil: '20-1', nombre: 'PEREZ JUAN', total: 300000, totalAnterior: 250000, deltaPct: 20, diasTrabajados: 11 },
  ],
  contratos: [
    { contratoId: 1, codigo: 'K5', nombre: 'Gasnor K5', monto: 1200000, horas: 900, pctDelTotal: 80 },
    { contratoId: null, codigo: 'Sin contrato asignable', nombre: 'Sin contrato asignable', monto: 300000, horas: 0, pctDelTotal: 20 },
  ],
  historico: [
    { anio: 2026, mes: 5, quincena: 1, total: 900000 },
    { anio: 2026, mes: 5, quincena: 2, total: 950000 },
    { anio: 2026, mes: 6, quincena: 1, total: 1000000 },
    { anio: 2026, mes: 6, quincena: 2, total: 1050000 },
    { anio: 2026, mes: 7, quincena: 1, total: 1100000 },
    { anio: 2026, mes: 7, quincena: 2, total: 1150000 },
    { anio: 2026, mes: 8, quincena: 1, total: 1200000 },
    { anio: 2026, mes: 8, quincena: 2, total: 1500000 },
  ],
  variaciones: [
    {
      cuil: '20-1', nombre: 'PEREZ JUAN', regimen: 'jornalizado',
      total: 300000, totalAnterior: 250000, deltaMonto: 50000, deltaPct: 20, diasTrabajados: 11,
    },
    {
      cuil: '20-2', nombre: 'GOMEZ ANA', regimen: 'mensualizado',
      total: 200000, totalAnterior: null, deltaMonto: null, deltaPct: null, diasTrabajados: 0,
    },
  ],
};

const vacio: AnalisisQuincena = {
  ...fixture,
  totales: { total: 0, empleados: 0, empleadosNuevos: 0, horasCct: 0, horasExtra: 0, costoPromedio: 0 },
  anterior: null,
  topCobradores: [],
  contratos: [],
  variaciones: [],
};

beforeEach(() => {
  useAnalisisQuincena.mockReturnValue({ data: fixture, isLoading: false });
});

describe('AnalisisPage', () => {
  it('muestra los tiles con valores formateados y deltas', () => {
    render(<AnalisisPage />);
    expect(screen.getByText('Total de la quincena')).toBeInTheDocument();
    // 1.500.000 formateado es-AR sin centavos
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    // subió 25% vs anterior → rojo (subir es costo), con flecha
    expect(screen.getByText(/▲\s*\+25,0\s*%/)).toBeInTheDocument();
    expect(screen.getByText('Empleados liquidados')).toBeInTheDocument();
    expect(screen.getByText('2 nuevos')).toBeInTheDocument();
    expect(screen.getByText('Horas pagadas')).toBeInTheDocument();
    expect(screen.getByText(/\+\s*40\s*extra/)).toBeInTheDocument();
    expect(screen.getByText('Costo promedio por empleado')).toBeInTheDocument();
  });

  it('renderiza las secciones en orden', () => {
    render(<AnalisisPage />);
    expect(screen.getByText('Composición del pago')).toBeInTheDocument();
    expect(screen.getByText('Histórico (últimas 8 quincenas)')).toBeInTheDocument();
    expect(screen.getByText('Top 10 cobradores')).toBeInTheDocument();
    expect(screen.getByText('$ por contrato (prorrateo por horas)')).toBeInTheDocument();
    expect(screen.getByText('Variaciones por persona')).toBeInTheDocument();
  });

  it('el buscador filtra la tabla de variaciones', async () => {
    const user = userEvent.setup();
    render(<AnalisisPage />);
    const tabla = screen.getByRole('table', { name: /variaciones por persona/i });
    expect(within(tabla).getByText('GOMEZ ANA')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/buscar por nombre/i), 'perez');
    expect(within(tabla).getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(within(tabla).queryByText('GOMEZ ANA')).not.toBeInTheDocument();
  });

  it('los nuevos llevan la etiqueta (nuevo) en la tabla', () => {
    render(<AnalisisPage />);
    const tabla = screen.getByRole('table', { name: /variaciones por persona/i });
    expect(within(tabla).getByText('(nuevo)')).toBeInTheDocument();
  });

  it('estado de carga', () => {
    useAnalisisQuincena.mockReturnValue({ data: undefined, isLoading: true });
    render(<AnalisisPage />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('empty state sin liquidación', () => {
    useAnalisisQuincena.mockReturnValue({ data: vacio, isLoading: false });
    render(<AnalisisPage />);
    expect(screen.getByText('Sin liquidación calculada para esta quincena.')).toBeInTheDocument();
  });
});
