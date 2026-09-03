import { describe, it, expect, vi } from 'vitest';
import { cloneElement, type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { HorasPorQuincenaChart } from './horas-por-quincena-chart';
import { RankingOperarios } from './ranking-operarios';
import type { PuntoHistorico, ResumenOperario } from '@/lib/api/panel-general';

// jsdom no mide el layout: ResponsiveContainer quedaría en 0×0 y Recharts no
// dibujaría nada. Se lo reemplaza por un passthrough con tamaño fijo.
vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as object),
  };
});

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const punto = (mes: number, quincena: 1 | 2, horas: number): PuntoHistorico => ({
  anio: 2026,
  mes,
  quincena,
  horas,
});

const operario = (cuil: string, nombre: string, totalHoras: number, horasMisContratos = totalHoras): ResumenOperario => ({
  cuil,
  apellido_nombre: nombre,
  totalHoras,
  horasMisContratos,
  pendiente: 0,
  aprobado: 0,
  desaprobado: 0,
  horasAprobadas: 0,
  superaHorasExtra: false,
  tieneAlertaCruzada: false,
  horasAprobadasAnterior: 0,
  deltaHorasAprobadas: 0,
});

describe('HorasPorQuincenaChart', () => {
  it('dibuja las dos series con leyenda y el mes en el eje', () => {
    const { container } = render(
      <HorasPorQuincenaChart datos={[punto(7, 1, 100), punto(7, 2, 50)]} />,
    );
    expect(screen.getByText('1ra quincena')).toBeInTheDocument();
    expect(screen.getByText('2da quincena')).toBeInTheDocument();
    expect(screen.getByText('jul')).toBeInTheDocument();
    // dos barras dibujadas (una por serie)
    expect(container.querySelectorAll('.recharts-bar').length).toBe(2);
  });

  it('sin datos muestra vacío accesible', () => {
    render(<HorasPorQuincenaChart datos={[]} />);
    expect(screen.getByText('Sin horas en el período.')).toBeInTheDocument();
  });
});

describe('RankingOperarios', () => {
  it('ordena por total y corta en 10', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => operario(`20-${i}-1`, `Operario ${i}`, i));
    render(<RankingOperarios resumen={muchos} />);
    // el 11 (máximo) está, el 1 (fuera del top 10) no
    expect(screen.getAllByText('Operario 11').length).toBeGreaterThan(0);
    expect(screen.queryByText('Operario 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('Operario 2').length).toBeGreaterThan(0);
  });

  it('sin datos muestra vacío accesible', () => {
    render(<RankingOperarios resumen={[]} />);
    expect(screen.getByText('Sin horas en esta quincena.')).toBeInTheDocument();
  });
});
