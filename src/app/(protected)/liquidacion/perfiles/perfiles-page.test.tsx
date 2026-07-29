import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const upsertMasivo = vi.fn().mockResolvedValue({ asignados: 1, omitidos: [] });
const eliminar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/liquidacion', () => ({
  usePerfilesLiquidacion: () => ({
    data: [
      {
        cuil: '20111111111',
        regimen: 'jornalizado',
        categoriaUocraId: 1,
        modalidadPago: 'en_b',
        empleado: { apellido_nombre: 'GOMEZ JUAN', legajo: 1, cargo: 'OF' },
        categoria: { id: 1, nombre: 'OFICIAL UOCRA' },
      },
    ],
    isLoading: false,
  }),
  useCategoriasUocra: () => ({ data: [{ id: 1, nombre: 'OFICIAL UOCRA', activo: true }] }),
  useUpsertPerfilesMasivo: () => ({ mutateAsync: upsertMasivo, isPending: false }),
  useEliminarPerfilLiquidacion: () => ({ mutateAsync: eliminar, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useEmpleadosActivos: () => ({
    data: [
      { cuil: '20111111111', apellido_nombre: 'GOMEZ JUAN', legajo: 1, cargo: 'OF' },
      { cuil: '20222222222', apellido_nombre: 'PEREZ ANA', legajo: 2, cargo: 'AY' },
      { cuil: '20333333333', apellido_nombre: 'RUIZ LUIS', legajo: 3, cargo: 'AD' },
    ],
    isLoading: false,
  }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import PerfilesLiquidacionPage from './page';

describe('PerfilesLiquidacionPage', () => {
  beforeEach(() => { upsertMasivo.mockClear(); eliminar.mockClear(); });

  it('lista todos los empleados activos, con el perfil ya asignado si lo tienen', () => {
    render(<PerfilesLiquidacionPage />);
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'OFICIAL UOCRA' })).toBeInTheDocument();
  });

  it('filtra la lista por nombre', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.type(screen.getByLabelText('Buscar empleado'), 'perez');
    expect(screen.queryByText('GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
  });

  it('asigna régimen/categoría/modalidad a varios empleados tildados a la vez', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Seleccionar GOMEZ JUAN'));
    await userEvent.click(screen.getByLabelText('Seleccionar PEREZ ANA'));
    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'jornalizado');
    await userEvent.selectOptions(screen.getByLabelText('Categoría UOCRA'), '1');
    await userEvent.selectOptions(screen.getByLabelText('Modalidad de pago'), 'con_descuentos');
    await userEvent.click(screen.getByRole('button', { name: /asignar a 2 seleccionados/i }));
    await waitFor(() =>
      expect(upsertMasivo).toHaveBeenCalledWith({
        cuils: ['20111111111', '20222222222'],
        regimen: 'jornalizado',
        categoriaUocraId: 1,
        modalidadPago: 'con_descuentos',
      }),
    );
  });

  it('"seleccionar todos" tilda todos los filtrados', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Seleccionar todos'));
    expect(screen.getByLabelText('Seleccionar GOMEZ JUAN')).toBeChecked();
    expect(screen.getByLabelText('Seleccionar PEREZ ANA')).toBeChecked();
    expect(screen.getByLabelText('Seleccionar RUIZ LUIS')).toBeChecked();
  });

  it('filtra por "sin perfil asignado"', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por régimen'), 'sin_perfil');
    expect(screen.queryByText('GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.getByText('RUIZ LUIS')).toBeInTheDocument();
  });

  it('filtra por régimen asignado', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por régimen'), 'jornalizado');
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ ANA')).not.toBeInTheDocument();
    expect(screen.queryByText('RUIZ LUIS')).not.toBeInTheDocument();
  });

  it('filtra por categoría "sin categoría"', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por categoría'), 'sin_categoria');
    expect(screen.queryByText('GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
  });

  it('quitar un perfil llama a eliminar con el cuil', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByRole('button', { name: /quitar/i }));
    await waitFor(() => expect(eliminar).toHaveBeenCalledWith('20111111111'));
  });

  it('al elegir régimen Administrativo, deshabilita categoría y modalidad y no las manda', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Seleccionar PEREZ ANA'));
    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'administrativo');
    expect(screen.getByLabelText('Categoría UOCRA')).toBeDisabled();
    expect(screen.getByLabelText('Modalidad de pago')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /asignar a 1 seleccionado/i }));
    await waitFor(() =>
      expect(upsertMasivo).toHaveBeenCalledWith({
        cuils: ['20222222222'],
        regimen: 'administrativo',
        categoriaUocraId: undefined,
        modalidadPago: undefined,
      }),
    );
  });
});
