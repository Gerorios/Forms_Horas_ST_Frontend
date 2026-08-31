import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const guardarBonos = vi.fn().mockResolvedValue([]);

import type { BonoPeriodoItem } from '@/lib/api/liquidacion';

const BONO_Q1: BonoPeriodoItem = {
  categoriaUocraId: 1,
  nombre: 'Oficial UOCRA',
  resuelto: true,
  bono: { tipo: 'monto_fijo', valor: '1000.00' },
  sugerencia: null,
};
const BONO_Q2: BonoPeriodoItem = {
  categoriaUocraId: 1,
  nombre: 'Oficial UOCRA',
  resuelto: true,
  bono: { tipo: 'monto_fijo', valor: '2000.00' },
  sugerencia: null,
};

let bonosData: BonoPeriodoItem[] = [BONO_Q1];
const useBonosPeriodoMock = vi.fn((_anio: number, _mes: number, _quincena: number) => ({
  data: bonosData,
  isLoading: false,
}));

vi.mock('@/lib/api/liquidacion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/liquidacion')>('@/lib/api/liquidacion');
  return {
    ...actual,
    useBonosPeriodo: (anio: number, mes: number, quincena: number) => useBonosPeriodoMock(anio, mes, quincena),
    useGuardarBonosPeriodo: () => ({ mutateAsync: guardarBonos, isPending: false }),
  };
});
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { SeccionBono } from './precios-vigentes-tab';

describe('SeccionBono — selector de quincena propio de la tarjeta', () => {
  beforeEach(() => {
    guardarBonos.mockClear();
    useBonosPeriodoMock.mockClear();
    bonosData = [BONO_Q1];
    // Default = quincenaActual(hoy) (finding 7 de la review final: antes
    // arrancaba fija en 1, distinto del default de Plus individual). Fijamos
    // "hoy" en un día de la 1ra quincena para que el test no dependa de la
    // fecha real de ejecución.
    // shouldAdvanceTime: los tests de interacción (userEvent) siguen andando
    // con timers reales; solo se fija qué devuelve `new Date()`.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 5));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca en la quincena actual (1ra quincena hoy) y consulta useBonosPeriodo con quincena=1', () => {
    render(<SeccionBono anio={2026} mes={8} />);
    expect(useBonosPeriodoMock).toHaveBeenCalledWith(2026, 8, 1);
    expect(screen.getByText('$1.000,00')).toBeInTheDocument();
  });

  it('si hoy cae en la 2da quincena, arranca en quincena=2 (mismo default que Plus individual)', () => {
    vi.setSystemTime(new Date(2026, 7, 20));
    bonosData = [BONO_Q2];

    render(<SeccionBono anio={2026} mes={8} />);

    expect(useBonosPeriodoMock).toHaveBeenCalledWith(2026, 8, 2);
  });

  it('cambiar a la 2da quincena vuelve a consultar useBonosPeriodo con quincena=2', async () => {
    render(<SeccionBono anio={2026} mes={8} />);
    bonosData = [BONO_Q2];

    await userEvent.selectOptions(screen.getByLabelText('Quincena'), '2');

    await waitFor(() => expect(useBonosPeriodoMock).toHaveBeenLastCalledWith(2026, 8, 2));
  });

  it('guardar manda la quincena elegida (no siempre 1) en el PUT', async () => {
    bonosData = [BONO_Q2];
    render(<SeccionBono anio={2026} mes={8} />);

    await userEvent.selectOptions(screen.getByLabelText('Quincena'), '2');
    await userEvent.click(await screen.findByRole('button', { name: /editar bonos/i }));
    await userEvent.click(screen.getByRole('button', { name: /guardar bonos/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar y guardar/i }));

    await waitFor(() =>
      expect(guardarBonos).toHaveBeenCalledWith(
        expect.objectContaining({ anio: 2026, mes: 8, quincena: 2 }),
      ),
    );
  });

  it('cambiar de quincena estando en modo edición descarta la edición (vuelve a lectura)', async () => {
    render(<SeccionBono anio={2026} mes={8} />);

    await userEvent.click(screen.getByRole('button', { name: /editar bonos/i }));
    expect(screen.getByLabelText(/tipo de bono — oficial uocra/i)).toBeInTheDocument();

    bonosData = [BONO_Q2];
    await userEvent.selectOptions(screen.getByLabelText('Quincena'), '2');

    expect(screen.queryByLabelText(/tipo de bono — oficial uocra/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar bonos/i })).toBeInTheDocument();
  });
});
