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
const rondaPeriodoMock = vi.fn<(anio: number, mes: number, enabled: boolean) => RondaPeriodoResultado>(
  () => ({ data: undefined, isLoading: false, error: null }),
);

vi.mock('@/lib/api/liquidacion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/liquidacion')>('@/lib/api/liquidacion');
  return {
    ...actual,
    useEstadoTarifas: () => ({
      data: {
        ultimoPeriodo: { anio: 2026, mes: 1 },
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

describe('TarifasPage', () => {
  beforeEach(() => {
    cargarRonda.mockClear();
    actualizarRonda.mockClear();
    rondaPeriodoMock.mockClear();
    rondaPeriodoMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it('prellena el período siguiente al último cargado y los valores actuales', () => {
    render(<TarifasPage />);
    expect(screen.getByText(/Enero 2026/)).toBeInTheDocument();
    expect(screen.getByLabelText('Período a cargar')).toHaveValue('2026-02');
    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(100);
    expect(screen.getByLabelText('Guardia Pasiva')).toHaveValue(50);
  });

  it('sin huecos (mes siguiente exacto), no muestra el aviso de meses faltantes', () => {
    render(<TarifasPage />);
    expect(screen.queryByText(/Faltan cargar/)).not.toBeInTheDocument();
  });

  it('con un hueco, avisa qué meses faltan y permite confirmar igual', async () => {
    render(<TarifasPage />);
    const input = screen.getByLabelText('Período a cargar');
    await userEvent.clear(input);
    await userEvent.type(input, '2026-04');
    expect(screen.getByText(/Faltan cargar/)).toBeInTheDocument();
    expect(screen.getByText(/Marzo 2026/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirmar tarifas de abril 2026/i }));
    await waitFor(() =>
      expect(cargarRonda).toHaveBeenCalledWith({
        mes: 4,
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
  });

  it('permite cargar un bono no remunerativo opcional por categoría', async () => {
    render(<TarifasPage />);
    await userEvent.selectOptions(screen.getByLabelText('Tipo de bono — Oficial UOCRA'), 'monto_fijo');
    await userEvent.type(screen.getByLabelText('Valor de bono — Oficial UOCRA'), '5000');
    await userEvent.click(screen.getByRole('button', { name: /confirmar tarifas de febrero 2026/i }));
    await waitFor(() =>
      expect(cargarRonda).toHaveBeenCalledWith(
        expect.objectContaining({
          bonosNoRemunerativos: [{ categoriaUocraId: 1, tipo: 'monto_fijo', valor: 5000 }],
        }),
      ),
    );
  });

  describe('modo edición', () => {
    beforeEach(() => {
      rondaPeriodoMock.mockReturnValue({
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
      });
    });

    it('al elegir un período cargado, precarga sus valores en el mismo formulario', async () => {
      render(<TarifasPage />);
      await userEvent.click(screen.getByRole('radio', { name: /editar período cargado/i }));
      await userEvent.selectOptions(screen.getByLabelText('Período a editar'), '2026-01');

      await waitFor(() => expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(150));
      expect(screen.getByLabelText('Guardia Pasiva')).toHaveValue(80);
    });

    it('al guardar en modo edición, muestra el dialog de confirmación antes de disparar el PUT', async () => {
      render(<TarifasPage />);
      await userEvent.click(screen.getByRole('radio', { name: /editar período cargado/i }));
      await userEvent.selectOptions(screen.getByLabelText('Período a editar'), '2026-01');
      await waitFor(() => expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(150));

      await userEvent.click(screen.getByRole('button', { name: /guardar cambios de enero 2026/i }));

      expect(screen.getByText(/Vas a modificar precios de un período ya cargado/)).toBeInTheDocument();
      expect(actualizarRonda).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: /confirmar y guardar/i }));
      await waitFor(() =>
        expect(actualizarRonda).toHaveBeenCalledWith(
          expect.objectContaining({ anio: 2026, mes: 1 }),
        ),
      );
    });

    it('cancelar el dialog no dispara el PUT', async () => {
      render(<TarifasPage />);
      await userEvent.click(screen.getByRole('radio', { name: /editar período cargado/i }));
      await userEvent.selectOptions(screen.getByLabelText('Período a editar'), '2026-01');
      await waitFor(() => expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(150));

      await userEvent.click(screen.getByRole('button', { name: /guardar cambios de enero 2026/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(screen.queryByText(/Vas a modificar precios de un período ya cargado/)).not.toBeInTheDocument();
      expect(actualizarRonda).not.toHaveBeenCalled();
    });
  });
});
