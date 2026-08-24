import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const guardarCategorias = vi.fn().mockResolvedValue([]);
const guardarBonos = vi.fn().mockResolvedValue([]);
const guardarNovedadesPlus = vi.fn().mockResolvedValue([]);
const guardarRangosKm = vi.fn().mockResolvedValue({});

import type { CategoriaPeriodoItem } from '@/lib/api/liquidacion';

const CATEGORIA_RESUELTA: CategoriaPeriodoItem = {
  id: 1,
  nombre: 'Oficial UOCRA',
  resuelto: true,
  importeHora: '150.00',
  sugerencia: null,
};
const CATEGORIA_SIN_RESOLVER: CategoriaPeriodoItem = {
  id: 1,
  nombre: 'Oficial UOCRA',
  resuelto: false,
  importeHora: null,
  sugerencia: { valor: '100.00', periodo: { anio: 2026, mes: 7 } },
};
const CATEGORIA_SIN_RESOLVER_2: CategoriaPeriodoItem = {
  id: 2,
  nombre: 'Ayudante',
  resuelto: false,
  importeHora: null,
  sugerencia: { valor: '100.00', periodo: { anio: 2026, mes: 7 } },
};

let categoriasData: CategoriaPeriodoItem[] = [CATEGORIA_RESUELTA];

vi.mock('@/lib/api/liquidacion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/liquidacion')>('@/lib/api/liquidacion');
  return {
    ...actual,
    useCategoriasPeriodo: () => ({ data: categoriasData, isLoading: false }),
    useGuardarCategoriasPeriodo: () => ({ mutateAsync: guardarCategorias, isPending: false }),
    useBonosPeriodo: () => ({ data: [], isLoading: false }),
    useGuardarBonosPeriodo: () => ({ mutateAsync: guardarBonos, isPending: false }),
    useNovedadesPlusPeriodo: () => ({ data: [], isLoading: false }),
    useGuardarNovedadesPlusPeriodo: () => ({ mutateAsync: guardarNovedadesPlus, isPending: false }),
    useRangosKmPeriodo: () => ({ data: { resuelto: true, rangosKm: [], sugerencia: null }, isLoading: false }),
    useGuardarRangosKmPeriodo: () => ({ mutateAsync: guardarRangosKm, isPending: false }),
    useSueldosMensualizados: () => ({ data: [], isLoading: false }),
    useGuardarSueldosMensualizados: () => ({ mutateAsync: vi.fn(), isPending: false }),
    usePlusIndividual: () => ({ data: [], isLoading: false }),
    useCargarPlusIndividual: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useEliminarPlusIndividual: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/empleados', () => ({ useBuscarEmpleados: () => ({ data: [] }) }));

import TarifasPage from './page';

describe('TarifasPage — Precios (ADR-018, secciones independientes)', () => {
  beforeEach(() => {
    guardarCategorias.mockClear();
    guardarBonos.mockClear();
    guardarNovedadesPlus.mockClear();
    guardarRangosKm.mockClear();
    categoriasData = [CATEGORIA_RESUELTA];
  });

  it('categoría resuelta: muestra el valor propio del período, sin inputs de edición', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());
    expect(screen.queryByLabelText('Oficial UOCRA')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar categorías/i })).toBeInTheDocument();
  });

  it('categoría sin resolver: banner + leyenda corta del último precio, no el valor como si fuera real', async () => {
    categoriasData = [CATEGORIA_SIN_RESOLVER];
    render(<TarifasPage />);

    expect(await screen.findByText(/todavía no tiene valores propios/i)).toBeInTheDocument();
    expect(screen.getByText(/último precio: \$100,00/i)).toBeInTheDocument();
    expect(screen.queryByText(/^\$100,00$/)).not.toBeInTheDocument();
  });

  it('editar una categoría RESUELTA y guardar: pide confirmación antes de guardar (PUT)', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /editar categorías/i }));
    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(150);

    await userEvent.click(screen.getByRole('button', { name: /guardar categorías/i }));
    expect(screen.getByText(/Confirmar cambio de/)).toBeInTheDocument();
    expect(guardarCategorias).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /confirmar y guardar/i }));
    await waitFor(() =>
      expect(guardarCategorias).toHaveBeenCalledWith(
        expect.objectContaining({ categorias: [{ categoriaUocraId: 1, importeHora: 150 }] }),
      ),
    );
  });

  it('editar una categoría SIN RESOLVER: arranca vacía, no autocompletada', async () => {
    categoriasData = [CATEGORIA_SIN_RESOLVER];
    render(<TarifasPage />);
    await screen.findByText(/todavía no tiene valores propios/i);

    await userEvent.click(screen.getByRole('button', { name: /editar categorías/i }));
    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(null);
    expect(screen.getByRole('button', { name: /guardar categorías/i })).toBeDisabled();
  });

  it('"Usar últimos precios" completa los campos sin resolver con la sugerencia, y guardar no pide confirmación', async () => {
    categoriasData = [CATEGORIA_SIN_RESOLVER];
    render(<TarifasPage />);
    await screen.findByText(/todavía no tiene valores propios/i);

    await userEvent.click(screen.getByRole('button', { name: /editar categorías/i }));
    await userEvent.click(screen.getByRole('button', { name: /usar últimos precios/i }));
    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(100);

    await userEvent.click(screen.getByRole('button', { name: /guardar categorías/i }));
    expect(screen.queryByText(/Confirmar cambio de/)).not.toBeInTheDocument();
    await waitFor(() => expect(guardarCategorias).toHaveBeenCalled());
  });

  it('"Aplicar a todas" el % calcula sobre el último precio, no sobre el input (que puede estar vacío)', async () => {
    categoriasData = [CATEGORIA_RESUELTA, CATEGORIA_SIN_RESOLVER_2];
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /editar categorías/i }));
    expect(screen.getByLabelText('Ayudante')).toHaveValue(null);

    await userEvent.type(screen.getByLabelText(/porcentaje de incremento/i), '10');
    await userEvent.click(screen.getByRole('button', { name: /aplicar a todas/i }));
    await userEvent.click(screen.getByRole('button', { name: /^aplicar \+?10%$/i }));

    expect(screen.getByLabelText('Oficial UOCRA')).toHaveValue(165); // 150 (resuelto) * 1.10
    expect(screen.getByLabelText('Ayudante')).toHaveValue(110); // 100 (sugerencia) * 1.10, no partía de vacío
  });

  it('cancelar edición vuelve a lectura descartando los cambios, sin guardar', async () => {
    render(<TarifasPage />);
    await waitFor(() => expect(screen.getByText(/\$150,00/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /editar categorías/i }));
    const input = screen.getByLabelText('Oficial UOCRA');
    await userEvent.clear(input);
    await userEvent.type(input, '999');

    await userEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByLabelText('Oficial UOCRA')).not.toBeInTheDocument();
    expect(screen.getByText(/\$150,00/)).toBeInTheDocument();
    expect(guardarCategorias).not.toHaveBeenCalled();
  });
});
