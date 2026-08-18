import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const h = vi.hoisted(() => ({
  perfil: { rol: { nombre: 'Supervisor' }, tiposNovedadHabilitados: [] } as {
    rol: { nombre: string };
    tiposNovedadHabilitados: { tipoNovedad: { id: number; nombre: string } }[];
  },
}));

vi.mock('@/lib/api/novedades', () => ({
  useNovedades: () => ({ data: [], isLoading: false }),
  useTiposNovedad: () => ({
    data: [
      { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
      { id: 8, nombre: 'Viáticos', requiereAprobacionHys: false },
    ],
  }),
  useCrearNovedad: () => ({ mutateAsync: crear, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 1, cargo: 'OF' }] }),
}));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: h.perfil }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));

import NovedadesPage from './page';

describe('NovedadesPage', () => {
  beforeEach(() => {
    crear.mockClear();
    h.perfil = { rol: { nombre: 'Supervisor' }, tiposNovedadHabilitados: [] };
  });

  it('crea una novedad con operario, tipo y fecha inicio', async () => {
    render(<NovedadesPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva novedad/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), '5');
    await userEvent.type(screen.getByLabelText('Fecha inicio'), '2026-07-10');
    await userEvent.click(screen.getByRole('button', { name: /cargar novedad/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ operarioCuil: '20169', tipoNovedadId: 5, fechaInicio: '2026-07-10' }),
      ),
    );
  });

  it('Supervisor ve el catálogo completo de tipos, sin filtrar', async () => {
    render(<NovedadesPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva novedad/i }));
    expect(screen.getByRole('option', { name: 'Ausencia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Viáticos' })).toBeInTheDocument();
  });

  it('JefeCuadrilla solo ve los tipos que le habilitaron', async () => {
    h.perfil = {
      rol: { nombre: 'JefeCuadrilla' },
      tiposNovedadHabilitados: [{ tipoNovedad: { id: 8, nombre: 'Viáticos' } }],
    };
    render(<NovedadesPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva novedad/i }));
    expect(screen.getByRole('option', { name: 'Viáticos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ausencia' })).not.toBeInTheDocument();
  });

  it('JefeCuadrilla ve la aclaración de que solo se listan las que cargó', () => {
    h.perfil = { rol: { nombre: 'JefeCuadrilla' }, tiposNovedadHabilitados: [] };
    render(<NovedadesPage />);
    expect(screen.getByText('Las que cargaste vos')).toBeInTheDocument();
  });

  it('Supervisor NO ve la aclaración (ve el listado completo)', () => {
    render(<NovedadesPage />);
    expect(screen.queryByText('Las que cargaste vos')).not.toBeInTheDocument();
  });
});
