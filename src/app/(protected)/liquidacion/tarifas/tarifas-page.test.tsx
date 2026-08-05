import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type RondaPeriodoResultado = {
  data:
    | {
        categorias: { id: number; nombre: string; importeHora: string; bonoNoRemunerativo: null }[];
        tiposNovedad: { id: number; nombre: string; montoPorDia: string }[];
        rangosKm: { kmDesde: string; kmHasta: string | null; precioPorKm: string }[];
      }
    | undefined;
  isLoading: boolean;
  error: unknown;
};

const cargarRonda = vi.fn().mockResolvedValue({ mesesCompletados: [] });
const actualizarRonda = vi.fn().mockResolvedValue({});

// Respuestas de useRondaPeriodo indexadas por "anio-mes", configurables por test.
let respuestasPorPeriodo: Record<string, RondaPeriodoResultado> = {};

const rondaPeriodoMock = vi.fn<(anio: number, mes: number, enabled: boolean) => RondaPeriodoResultado>(
  (anio, mes, enabled) => {
    if (!enabled) return { data: undefined, isLoading: false, error: null };
    return respuestasPorPeriodo[`${anio}-${mes}`] ?? { data: undefined, isLoading: false, error: null };
  },
);

vi.mock('@/lib/api/liquidacion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/liquidacion')>('@/lib/api/liquidacion');
  return {
    ...actual,
    // Último período cargado: Agosto 2026. Los "vigentes" (100/50) son
    // distintos de los valores propios de Agosto (150/80) y de Julio
    // (130/70), para poder distinguir en los asserts de dónde viene cada
    // número mostrado.
    useEstadoTarifas: () => ({
      data: {
        ultimoPeriodo: { anio: 2026, mes: 8 },
        categorias: [{ id: 1, nombre: 'Oficial UOCRA', importeHoraActual: '100.00', bonoNoRemunerativoActual: null }],
        tiposNovedad: [{ id: 1, nombre: 'Guardia Pasiva', montoPorDiaActual: '50.00' }],
        rangosKm: [
          { kmDesde: '0', kmHasta: '60', precioPorKmActual: '10' },
          { kmDesde: '60', kmHasta: '75', precioPorKmActual: '12' },
          { kmDesde: '75', kmHasta: null, precioPorKmActual: '15' },
        ],
      },
      isLoading: false,
    }),
    useCargarRondaTarifas: () => ({ mutateAsync: cargarRonda, isPending: false }),
    useActualizarRondaTarifas: () => ({ mutateAsync: actualizarRonda, isPending: false }),
    useRondaPeriodo: (anio: number, mes: number, enabled: boolean) => rondaPeriodoMock(anio, mes, enabled),
  };
});
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import TarifasPage from './page';

const RONDA_AGOSTO_2026: RondaPeriodoResultado = {
  data: {
    categorias: [{ id: 1, nombre: 'Oficial UOCRA', importeHora: '150.00', bonoNoRemunerativo: null }],
    tiposNovedad: [{ id: 1, nombre: 'Guardia Pasiva', montoPorDia: '80.00' }],
    rangosKm: [
      { kmDesde: '0', kmHasta: '60', precioPorKm: '20' },
      { kmDesde: '60', kmHasta: '75', precioPorKm: '22' },
      { kmDesde: '75', kmHasta: null, precioPorKm: '25' },
    ],
  },
  isLoading: false,
  error: null,
};

const RONDA_JULIO_2026: RondaPeriodoResultado = {
  data: {
    categorias: [{ id: 1, nombre: 'Oficial UOCRA', importeHora: '130.00', bonoNoRemunerativo: null }],
    tiposNovedad: [{ id: 1, nombre: 'Guardia Pasiva', montoPorDia: '70.00' }],
    rangosKm: [
      { kmDesde: '0', kmHasta: '60', precioPorKm: '18' },
      { kmDesde: '60', kmHasta: '75', precioPorKm: '19' },
      { kmDesde: '75', kmHasta: null, precioPorKm: '21' },
    ],
  },
  isLoading: false,
  error: null,
};

describe('TarifasPage', () => {
  beforeEach(() => {
    cargarRonda.mockClear();
    actualizarRonda.mockClear();
    rondaPeriodoMock.mockClear();
    respuestasPorPeriodo = { '2026-8': RONDA_AGOSTO_2026, '2026-7': RONDA_JULIO_2026 };
  });

  it('(a) por defecto muestra en modo lectura el último período cargado con sus valores propios', async () => {
    render(<TarifasPage />);

    expect(screen.getByRole('heading', { name: /Precios de Agosto 2026/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());
    expect(screen.getByText(/\$80,00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar precios de agosto 2026/i })).toBeInTheDocument();

    // Es lectura: no hay inputs de edición.
    expect(screen.queryByLabelText('Oficial UOCRA')).not.toBeInTheDocument();
  });

  it('(b) elegir un mes cargado anterior (Julio) muestra SUS propios valores en lectura', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText('Mes'), '7');

    await waitFor(() => expect(screen.getByRole('heading', { name: /Precios de Julio 2026/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/\$130,00/)).toBeInTheDocument());
    expect(screen.getByText(/\$70,00/)).toBeInTheDocument();
    // No debe seguir mostrando los valores de Agosto ni los "vigentes".
    expect(screen.queryByText(/\$150,00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$100,00/)).not.toBeInTheDocument();
  });

  it('(c) el botón Editar pasa a inputs y Guardar de un período cargado abre el dialog de confirmación → PUT', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /editar precios de agosto 2026/i }));

    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(150);
    expect(screen.getByLabelText('Guardia Pasiva')).toHaveValue(80);

    await userEvent.click(screen.getByRole('button', { name: /guardar precios de agosto 2026/i }));

    expect(screen.getByText(/Vas a modificar precios de un período ya cargado/)).toBeInTheDocument();
    expect(actualizarRonda).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /confirmar y guardar/i }));
    await waitFor(() =>
      expect(actualizarRonda).toHaveBeenCalledWith(expect.objectContaining({ anio: 2026, mes: 8 })),
    );
    expect(cargarRonda).not.toHaveBeenCalled();
  });

  it('(d) un mes futuro muestra la propuesta y la nota en lectura; al editar y guardar dispara POST', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText('Mes'), '10');

    await waitFor(() => expect(screen.getByRole('heading', { name: /Precios de Octubre 2026/i })).toBeInTheDocument());
    expect(screen.getByText(/aún no tiene precios propios/i)).toBeInTheDocument();
    expect(screen.getByText(/\$100,00/)).toBeInTheDocument();
    expect(screen.getByText(/\$50,00/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cargar precios de octubre 2026/i }));

    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(100);
    expect(screen.getByText(/Faltan cargar/)).toBeInTheDocument();
    expect(screen.getByText(/Septiembre 2026/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /guardar precios de octubre 2026/i }));
    await waitFor(() =>
      expect(cargarRonda).toHaveBeenCalledWith({
        mes: 10,
        anio: 2026,
        categorias: [{ categoriaUocraId: 1, importeHora: 100 }],
        tiposNovedad: [{ tipoNovedadId: 1, montoPorDia: 50 }],
        rangosKm: [
          { kmDesde: 0, kmHasta: 60, precioPorKm: 10 },
          { kmDesde: 60, kmHasta: 75, precioPorKm: 12 },
          { kmDesde: 75, kmHasta: undefined, precioPorKm: 15 },
        ],
        bonosNoRemunerativos: [],
      }),
    );
    expect(actualizarRonda).not.toHaveBeenCalled();
  });

  it('(e) Cancelar edición vuelve a lectura descartando los cambios, sin guardar', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /editar precios de agosto 2026/i }));
    const input = screen.getByLabelText('Oficial UOCRA');
    await userEvent.clear(input);
    await userEvent.type(input, '999');
    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(999);

    await userEvent.click(screen.getByRole('button', { name: /cancelar edición/i }));

    expect(screen.queryByLabelText('Oficial UOCRA')).not.toBeInTheDocument();
    expect(screen.getByText(/\$150,00/)).toBeInTheDocument();
    expect(cargarRonda).not.toHaveBeenCalled();
    expect(actualizarRonda).not.toHaveBeenCalled();
  });

  it('un mes anterior a la primera ronda cargada muestra el mensaje amable, sin form ni botón editar', async () => {
    respuestasPorPeriodo['2020-1'] = {
      data: undefined,
      isLoading: false,
      error: { response: { status: 404 } },
    };
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.clear(screen.getByLabelText('Año'));
    await userEvent.type(screen.getByLabelText('Año'), '2020');
    await userEvent.selectOptions(screen.getByLabelText('Mes'), '1');

    await waitFor(() => expect(screen.getByText(/No hay precios cargados para este mes/)).toBeInTheDocument());
    expect(screen.queryByLabelText('Oficial UOCRA')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar precios|cargar precios/i })).not.toBeInTheDocument();
  });
});
