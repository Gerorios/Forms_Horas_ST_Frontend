import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const cargarRonda = vi.fn().mockResolvedValue({ mesesCompletados: [] });

vi.mock('@/lib/api/liquidacion', () => ({
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
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import TarifasPage from './page';

describe('TarifasPage', () => {
  beforeEach(() => cargarRonda.mockClear());

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
});
