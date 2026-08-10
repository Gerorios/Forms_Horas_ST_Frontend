import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const guardar = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/api/liquidacion', () => ({
  useSueldosMensualizados: () => ({
    data: [
      { cuil: '20111111111', apellidoNombre: 'PEREZ JUAN', monto: '500000.00' },
      { cuil: '20222222222', apellidoNombre: 'GOMEZ ANA', monto: null },
    ],
    isLoading: false,
  }),
  useGuardarSueldosMensualizados: () => ({ mutateAsync: guardar, isPending: false }),
  mensajeDeError: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { SueldosMensualizadosTab } from './sueldos-mensualizados-tab';

describe('SueldosMensualizadosTab', () => {
  beforeEach(() => guardar.mockClear());

  it('precarga el sueldo vigente de cada empleado; el que no tiene queda vacío', () => {
    render(<SueldosMensualizadosTab />);
    expect(screen.getByLabelText('Sueldo de PEREZ JUAN')).toHaveValue(500000);
    expect(screen.getByLabelText('Sueldo de GOMEZ ANA')).toHaveValue(null);
  });

  it('"Aplicar a todos" recalcula solo a quienes tienen sueldo vigente, sin guardar todavía', async () => {
    render(<SueldosMensualizadosTab />);
    await userEvent.type(screen.getByLabelText('Porcentaje de incremento'), '10');
    await userEvent.click(screen.getByRole('button', { name: /aplicar a todos/i }));

    expect(screen.getByLabelText('Sueldo de PEREZ JUAN')).toHaveValue(550000);
    expect(screen.getByLabelText('Sueldo de GOMEZ ANA')).toHaveValue(null); // sin vigente previo, no tiene de dónde partir
    expect(guardar).not.toHaveBeenCalled();
  });

  it('permite pisar a mano un valor puntual después de aplicar el %, y guarda solo los que tienen valor', async () => {
    render(<SueldosMensualizadosTab />);
    await userEvent.type(screen.getByLabelText('Porcentaje de incremento'), '10');
    await userEvent.click(screen.getByRole('button', { name: /aplicar a todos/i }));

    const inputGomez = screen.getByLabelText('Sueldo de GOMEZ ANA');
    await userEvent.type(inputGomez, '400000');

    await userEvent.click(screen.getByRole('button', { name: /guardar sueldos/i }));

    expect(guardar).toHaveBeenCalledWith({
      anio: expect.any(Number),
      mes: expect.any(Number),
      sueldos: [
        { cuil: '20111111111', monto: 550000 },
        { cuil: '20222222222', monto: 400000 },
      ],
    });
  });
});
