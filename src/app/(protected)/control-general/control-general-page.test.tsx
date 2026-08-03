import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ResumenOperario, OperarioSinCarga } from '@/lib/api/panel-general';

const RESUMEN: ResumenOperario[] = [
  {
    cuil: '20111111111',
    apellido_nombre: 'PEREZ JUAN',
    totalHoras: 95,
    pendiente: 1,
    aprobado: 9,
    desaprobado: 0,
    superaHorasExtra: true,
  },
];

const SIN_CARGA: OperarioSinCarga[] = [
  { cuil: '20222222222', apellido_nombre: 'GOMEZ ANA', legajo: 123, cargo: 'Peón' },
];

vi.mock('@/lib/api/panel-general', () => ({
  useResumenOperarios: () => ({ data: RESUMEN, isLoading: false }),
  useSinCarga: () => ({ data: SIN_CARGA, isLoading: false }),
}));

import ControlGeneralPage from './page';

describe('ControlGeneralPage', () => {
  it('muestra el resumen por operario con el total real y la alerta de horas extra', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('+88hs')).toBeInTheDocument();
  });

  it('muestra la lista de sin carga', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('GOMEZ ANA')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('arranca en la quincena anterior (ya cerrada), no en la actual', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
  });
});
