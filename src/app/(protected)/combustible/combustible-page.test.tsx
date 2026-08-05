import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CargaCombustible } from '@/types/domain';

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({ perfil: { rol: { nombre: 'Admin' } } }),
}));

vi.mock('@/lib/api/catalogos', () => ({
  useMoviles: () => ({
    data: [
      { id: 1, identificador: 'INT-101' },
      { id: 2, identificador: 'INT-202' },
    ],
  }),
}));

function carga(id: number, movilId: number, identificador: string, estado: 'activa' | 'anulada' = 'activa'): CargaCombustible {
  return {
    id,
    fechaCarga: '2026-08-01T00:00:00.000Z',
    cargadoPorCuil: '20111111111',
    movil: { id: movilId, identificador },
    litros: '50',
    monto: '10000',
    km: 1000,
    medioPago: 'efectivo' as CargaCombustible['medioPago'],
    nroComprobante: '001',
    estacion: { id: 1, nombre: 'YPF' },
    tipoCombustible: { id: 1, nombre: 'Diesel' },
    provincia: { id: 1, nombre: 'Córdoba' },
    observaciones: null,
    estado,
    motivoAnulacion: null,
    anuladaPorCuil: null,
    anuladaEn: null,
    tareas: [{ tarea: { id: 1, nombre: 'Excavación', contrato: { id: 1, codigo: 'K5' } } }],
  };
}

const CARGAS: CargaCombustible[] = [
  carga(1, 1, 'INT-101'),
  carga(2, 2, 'INT-202'),
  carga(3, 1, 'INT-101', 'anulada'),
];

vi.mock('@/lib/api/combustible', () => ({
  useCargasCombustible: () => ({ data: CARGAS, isLoading: false }),
}));

vi.mock('@/features/combustible/detalle-carga', () => ({
  DetalleCarga: () => null,
}));

import CombustiblePage from './page';

// Las filas de la tabla tienen role="button" (para hacerlas clicable como
// una unidad), lo que pisa el role="row" implícito — por eso se cuentan con
// un selector directo en vez de getAllByRole('row').
function filasTabla(container: HTMLElement) {
  return container.querySelectorAll('tbody tr');
}

describe('CombustiblePage', () => {
  it('por defecto solo muestra las cargas activas', () => {
    const { container } = render(<CombustiblePage />);
    expect(filasTabla(container)).toHaveLength(2);
  });

  it('el filtro de estado muestra "Estado (1)" seleccionado por default', () => {
    render(<CombustiblePage />);
    expect(screen.getByLabelText('Estado')).toHaveTextContent('Estado (1)');
  });

  it('tildar "Anuladas" además de "Activas" muestra las tres cargas', async () => {
    const { container } = render(<CombustiblePage />);
    await userEvent.click(screen.getByLabelText('Estado'));
    await userEvent.click(screen.getByLabelText('Anuladas'));
    expect(filasTabla(container)).toHaveLength(3);
  });

  it('el filtro de móvil acota las cargas a los móviles tildados', async () => {
    const { container } = render(<CombustiblePage />);
    await userEvent.click(screen.getByLabelText('Móvil'));
    await userEvent.click(screen.getByLabelText('INT-202'));
    await userEvent.keyboard('{Escape}');
    const filas = filasTabla(container);
    expect(filas).toHaveLength(1);
    expect(filas[0].textContent).toContain('INT-202');
  });

  it('"Limpiar filtros" no aparece con el estado inicial (solo activas)', () => {
    render(<CombustiblePage />);
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  it('tildar un móvil hace aparecer "Limpiar filtros", que vuelve al estado inicial', async () => {
    const { container } = render(<CombustiblePage />);
    await userEvent.click(screen.getByLabelText('Móvil'));
    await userEvent.click(screen.getByLabelText('INT-101'));
    await userEvent.keyboard('{Escape}');
    const limpiar = screen.getByRole('button', { name: /limpiar filtros/i });
    await userEvent.click(limpiar);
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
    expect(filasTabla(container)).toHaveLength(2);
  });
});
