import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/liquidacion/precios-vigentes-tab', () => ({
  PreciosVigentesTab: () => <div>contenido de precios</div>,
}));
vi.mock('@/features/liquidacion/sueldos-mensualizados-tab', () => ({
  SueldosMensualizadosTab: () => <div>contenido de sueldos mensualizados</div>,
}));

import TarifasPage from './page';

describe('TarifasPage — tabs (ADR-016)', () => {
  it('arranca en la pestaña Precios', () => {
    render(<TarifasPage />);
    expect(screen.getByText('contenido de precios')).toBeInTheDocument();
    expect(screen.queryByText('contenido de sueldos mensualizados')).not.toBeInTheDocument();
  });

  it('cambia a Sueldos mensualizados y de vuelta a Precios', async () => {
    render(<TarifasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Sueldos mensualizados' }));
    expect(screen.getByText('contenido de sueldos mensualizados')).toBeInTheDocument();
    expect(screen.queryByText('contenido de precios')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Precios' }));
    expect(screen.getByText('contenido de precios')).toBeInTheDocument();
  });
});
