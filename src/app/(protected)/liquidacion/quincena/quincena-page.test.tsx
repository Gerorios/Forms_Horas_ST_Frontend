import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/api/liquidacion', () => ({
  useQuincenas: () => ({
    data: [
      { anio: 2026, mes: 8, quincena: 1, estado: 'con_pendientes', pendientes: 3, alertas: 0 },
      { anio: 2026, mes: 7, quincena: 2, estado: 'con_alertas', pendientes: 0, alertas: 2 },
      { anio: 2026, mes: 7, quincena: 1, estado: 'lista', pendientes: 0, alertas: 0 },
    ],
    isLoading: false,
  }),
}));

import QuincenasPage from './page';

describe('QuincenasPage', () => {
  it('muestra las quincenas con su estado derivado', () => {
    render(<QuincenasPage />);
    expect(screen.getByText(/con pendientes — 3 sin aprobar/i)).toBeInTheDocument();
    expect(screen.getByText(/con alertas — 2/i)).toBeInTheDocument();
    expect(screen.getByText(/lista para liquidar/i)).toBeInTheDocument();
  });

  it('cada fila linkea al detalle con anio/mes/q', () => {
    render(<QuincenasPage />);
    const links = screen.getAllByRole('link', { name: /ver detalle/i });
    expect(links[0]).toHaveAttribute('href', '/liquidacion/quincena/detalle?anio=2026&mes=8&q=1');
    expect(links[1]).toHaveAttribute('href', '/liquidacion/quincena/detalle?anio=2026&mes=7&q=2');
  });
});
