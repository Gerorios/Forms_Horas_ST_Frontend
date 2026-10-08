import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({
  porOrigen: { hys: 20, inspectores: 80 },
  params: new URLSearchParams(),
  replace: vi.fn(),
  errorTableros: false,
  refetch: vi.fn(),
  ultimoRango: null as unknown,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => h.params,
  useRouter: () => ({ replace: h.replace }),
  usePathname: () => '/seguridad/ranking',
}));

vi.mock('@/lib/api/seguridad', () => ({
  useRanking: (rango: unknown) => {
    h.ultimoRango = rango;
    return { data: { desde: '2026-01-01', hasta: '2026-10-08', pendientes: 0, filas: [] }, isLoading: false, isError: false };
  },
  useTableros: () =>
    h.errorTableros
      ? { data: undefined, isLoading: false, isError: true, isFetching: false, refetch: h.refetch }
      : {
          isLoading: false,
          isError: false,
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
            porMes: [{ mes: '2026-09', reportes: 4, inspecciones: 2 }],
            masInspeccionados: [],
            masReportan: [
              { cuil: 'A', nombre: 'PEREZ JUAN', enviados: 7, aprobados: 5, puntos: 38 },
              { cuil: 'B', nombre: 'GOMEZ ANA', enviados: 3, aprobados: 3, puntos: 24 },
            ],
            inspeccionesPorOrigen: h.porOrigen,
          },
        },
}));

import RankingPage from './page';

describe('Ranking y tableros', () => {
  beforeEach(() => {
    h.porOrigen = { hys: 20, inspectores: 80 };
    h.params = new URLSearchParams();
    h.errorTableros = false;
    h.replace.mockReset();
    h.refetch.mockReset();
  });

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

  it('un error de carga no se ve como vacío: dice qué falló y deja reintentar', async () => {
    h.errorTableros = true;
    render(<RankingPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los tableros');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(h.refetch).toHaveBeenCalled();
  });

  it('el rango sale de la URL y al cambiarlo se escribe en la URL', async () => {
    h.params = new URLSearchParams('rango=libre&desde=2026-02-01&hasta=2026-03-31');
    render(<RankingPage />);
    expect(h.ultimoRango).toEqual({ desde: '2026-02-01', hasta: '2026-03-31' });
    await userEvent.selectOptions(screen.getByLabelText('Rango'), 'mes');
    expect(h.replace).toHaveBeenCalledWith('/seguridad/ranking?rango=mes', { scroll: false });
  });

  it('los cortes por categoría quedan en "Más detalle", con el mes en columnas', () => {
    render(<RankingPage />);
    expect(screen.getByText('Más detalle')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /2 inspecciones/ })).toBeInTheDocument();
  });
});
