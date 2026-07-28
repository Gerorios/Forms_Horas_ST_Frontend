import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const upsert = vi.fn().mockResolvedValue({});
const eliminar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/liquidacion', () => ({
  usePerfilesLiquidacion: () => ({
    data: [
      {
        cuil: '20111111111',
        regimen: 'jornalizado',
        categoriaUocraId: 1,
        modalidadHoraExtra: 'en_b',
        empleado: { apellido_nombre: 'GOMEZ JUAN', legajo: 1, cargo: 'OF' },
        categoria: { id: 1, nombre: 'OFICIAL UOCRA' },
      },
    ],
    isLoading: false,
  }),
  useCategoriasUocra: () => ({ data: [{ id: 1, nombre: 'OFICIAL UOCRA', activo: true }] }),
  useUpsertPerfilLiquidacion: () => ({ mutateAsync: upsert, isPending: false }),
  useEliminarPerfilLiquidacion: () => ({ mutateAsync: eliminar, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20222222222', apellido_nombre: 'PEREZ ANA', legajo: 2, cargo: 'AY' }] }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import PerfilesLiquidacionPage from './page';

describe('PerfilesLiquidacionPage', () => {
  beforeEach(() => { upsert.mockClear(); eliminar.mockClear(); });

  it('lista los perfiles ya asignados', () => {
    render(<PerfilesLiquidacionPage />);
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'OFICIAL UOCRA' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'En B (sin descuentos)' })).toBeInTheDocument();
  });

  it('asigna un perfil nuevo con empleado, régimen, categoría y modalidad de hora extra', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'perez');
    await userEvent.click(await screen.findByText(/PEREZ ANA/));
    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'jornalizado');
    await userEvent.selectOptions(screen.getByLabelText('Categoría UOCRA'), '1');
    await userEvent.selectOptions(screen.getByLabelText('Modalidad de hora extra'), 'con_descuentos');
    await userEvent.click(screen.getByRole('button', { name: /asignar/i }));
    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith({
        cuil: '20222222222',
        regimen: 'jornalizado',
        categoriaUocraId: 1,
        modalidadHoraExtra: 'con_descuentos',
      }),
    );
  });

  it('quitar un perfil llama a eliminar con el cuil', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByRole('button', { name: /quitar/i }));
    await waitFor(() => expect(eliminar).toHaveBeenCalledWith('20111111111'));
  });
});
