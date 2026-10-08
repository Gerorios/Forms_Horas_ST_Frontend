import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const h = vi.hoisted(() => ({ porOrigen: { hys: 20, inspectores: 80 } }));

vi.mock('@/lib/api/seguridad', () => ({
  useRanking: () => ({ data: { desde: '2026-01-01', hasta: '2026-10-08', pendientes: 0, filas: [] }, isLoading: false }),
  useTableros: () => ({
    data: {
      desde: '2026-01-01',
      hasta: '2026-10-08',
      totales: { reportes: 12, inspecciones: 100, pendientes: 0, aprobados: 10, desaprobados: 2 },
      participacion: { personas: 5, nominaActiva: 120 },
      respuestaHysDias: 1.5,
      conPunto: 3,
      porTipo: [],
      porContrato: [],
      porTarea: [],
      porProvincia: [],
      porMotivoParalizacion: [],
      porNaturaleza: [],
      porMes: [],
      masInspeccionados: [],
      masReportan: [
        { cuil: 'A', nombre: 'PEREZ JUAN', enviados: 7, aprobados: 5, puntos: 38 },
        { cuil: 'B', nombre: 'GOMEZ ANA', enviados: 3, aprobados: 3, puntos: 24 },
      ],
      inspeccionesPorOrigen: h.porOrigen,
    },
  }),
}));

import RankingPage from './page';

describe('Ranking y tableros', () => {
  it('quiénes más reportan, por cantidad de envíos', () => {
    render(<RankingPage />);
    const tabla = screen.getByText('Quiénes más reportan').closest('section')!;
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas[0]).toHaveTextContent('PEREZ JUAN');
    expect(filas[0]).toHaveTextContent('7');
    expect(filas[1]).toHaveTextContent('GOMEZ ANA');
  });

  it('inspecciones de HyS contra las del resto', () => {
    render(<RankingPage />);
    expect(screen.getByText('Inspecciones: HyS / inspectores')).toBeInTheDocument();
    expect(screen.getByText(/20% de HyS · 80% del resto/)).toBeInTheDocument();
  });

  it('avisa cuando HyS no cargó ninguna inspección', () => {
    h.porOrigen = { hys: 0, inspectores: 100 };
    render(<RankingPage />);
    expect(screen.getByText(/HyS no cargó ninguna/)).toBeInTheDocument();
  });
});
