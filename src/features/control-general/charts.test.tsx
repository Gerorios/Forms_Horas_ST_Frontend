import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HorasPorQuincenaChart } from './horas-por-quincena-chart';
import { RankingOperarios } from './ranking-operarios';
import type { PuntoHistorico, ResumenOperario } from '@/lib/api/panel-general';

const punto = (mes: number, quincena: 1 | 2, horas: number): PuntoHistorico => ({
  anio: 2026,
  mes,
  quincena,
  horas,
});

const operario = (cuil: string, nombre: string, totalHoras: number): ResumenOperario => ({
  cuil,
  apellido_nombre: nombre,
  totalHoras,
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
  it('dibuja una barra por quincena con tooltip nativo y leyenda', () => {
    render(<HorasPorQuincenaChart datos={[punto(7, 1, 100), punto(7, 2, 50)]} />);
    expect(screen.getByText('1ra quincena')).toBeInTheDocument();
    expect(screen.getByText('2da quincena')).toBeInTheDocument();
    expect(screen.getByTitle('1ra quincena jul 2026: 100 hs')).toBeInTheDocument();
    expect(screen.getByTitle('2da quincena jul 2026: 50 hs')).toBeInTheDocument();
  });

  it('sin datos muestra vacío accesible', () => {
    render(<HorasPorQuincenaChart datos={[]} />);
    expect(screen.getByText('Sin horas en el período.')).toBeInTheDocument();
  });
});

describe('RankingOperarios', () => {
  it('ordena por total y corta en 10, con link a aprobaciones', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => operario(`20-${i}-1`, `Operario ${i}`, i));
    render(<RankingOperarios resumen={muchos} />);
    const filas = screen.getAllByRole('link');
    expect(filas).toHaveLength(10);
    expect(filas[0]).toHaveTextContent('Operario 11');
    expect(filas[0]).toHaveAttribute('href', '/aprobaciones?operarioCuil=20-11-1');
  });

  it('sin datos muestra vacío accesible', () => {
    render(<RankingOperarios resumen={[]} />);
    expect(screen.getByText('Sin horas en esta quincena.')).toBeInTheDocument();
  });
});
