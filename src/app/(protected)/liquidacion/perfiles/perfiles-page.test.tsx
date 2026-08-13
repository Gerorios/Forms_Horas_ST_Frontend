import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const upsertMasivo = vi.fn().mockResolvedValue({ asignados: 1, omitidos: [] });
const upsertUno = vi.fn().mockResolvedValue({});
const eliminar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/liquidacion', () => ({
  usePerfilesLiquidacion: () => ({
    data: [
      {
        cuil: '20111111111',
        regimen: 'jornalizado',
        categoriaUocraId: 1,
        modalidadPago: 'en_b',
        contratosImputacionIds: [],
        empleado: { apellido_nombre: 'GOMEZ JUAN', legajo: 1, cargo: 'OF' },
        categoria: { id: 1, nombre: 'OFICIAL UOCRA' },
      },
      {
        cuil: '20444444444',
        regimen: 'mensualizado',
        categoriaUocraId: null,
        modalidadPago: null,
        contratosImputacionIds: [1],
        empleado: { apellido_nombre: 'SOSA MARIA', legajo: 4, cargo: 'OF' },
        categoria: null,
      },
    ],
    isLoading: false,
  }),
  useCategoriasUocra: () => ({ data: [{ id: 1, nombre: 'OFICIAL UOCRA', activo: true }] }),
  useContratosLiquidacion: () => ({
    data: [
      { id: 1, codigo: 'K5', nombre: 'Gasnor K5' },
      { id: 2, codigo: 'K9', nombre: 'Gasnor K9' },
    ],
  }),
  useUpsertPerfilesMasivo: () => ({ mutateAsync: upsertMasivo, isPending: false }),
  useUpsertPerfilLiquidacion: () => ({ mutateAsync: upsertUno, isPending: false }),
  useEliminarPerfilLiquidacion: () => ({ mutateAsync: eliminar, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useEmpleadosActivos: () => ({
    data: [
      { cuil: '20111111111', apellido_nombre: 'GOMEZ JUAN', legajo: 1, cargo: 'OF' },
      { cuil: '20222222222', apellido_nombre: 'PEREZ ANA', legajo: 2, cargo: 'AY' },
      { cuil: '20333333333', apellido_nombre: 'RUIZ LUIS', legajo: 3, cargo: 'AD' },
      { cuil: '20444444444', apellido_nombre: 'SOSA MARIA', legajo: 4, cargo: 'OF' },
    ],
    isLoading: false,
  }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import PerfilesLiquidacionPage from './page';

describe('PerfilesLiquidacionPage', () => {
  beforeEach(() => { upsertMasivo.mockClear(); upsertUno.mockClear(); eliminar.mockClear(); });

  it('lista todos los empleados activos, con el perfil ya asignado si lo tienen', () => {
    render(<PerfilesLiquidacionPage />);
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'OFICIAL UOCRA' })).toBeInTheDocument();
  });

  it('filtra la lista por empleado tildado en el MultiFiltro', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Buscar empleado'));
    await userEvent.click(screen.getByLabelText('PEREZ ANA'));
    await userEvent.keyboard('{Escape}');
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
    await userEvent.click(screen.getByLabelText('Filtrar por régimen'));
    await userEvent.click(screen.getByLabelText('Sin perfil asignado'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.getByText('RUIZ LUIS')).toBeInTheDocument();
  });

  it('filtra por régimen asignado', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por régimen'));
    await userEvent.click(screen.getByLabelText('Jornalizado (por horas)'));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ ANA')).not.toBeInTheDocument();
    expect(screen.queryByText('RUIZ LUIS')).not.toBeInTheDocument();
  });

  it('filtra por categoría "sin categoría"', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por categoría'));
    await userEvent.click(screen.getByLabelText('Sin categoría'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
  });

  it('quitar un perfil llama a eliminar con el cuil', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getAllByRole('button', { name: /quitar/i })[0]);
    await waitFor(() => expect(eliminar).toHaveBeenCalledWith('20111111111'));
  });

  it('muestra el selector de contratos de imputación solo para mensualizado/fijo/por_tantos', () => {
    render(<PerfilesLiquidacionPage />);
    expect(screen.getByLabelText('Contratos de imputación de SOSA MARIA')).toBeInTheDocument();
    // jornalizado y sin perfil no lo muestran
    expect(screen.queryByLabelText('Contratos de imputación de GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Contratos de imputación de PEREZ ANA')).not.toBeInTheDocument();
    // hint corto de imputación
    expect(
      screen.getByText(/se imputa a estos contratos en partes iguales en el Análisis/i),
    ).toBeInTheDocument();
  });

  it('guardar los contratos de imputación manda contratosImputacionIds por el upsert individual', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Contratos de imputación de SOSA MARIA'));
    await userEvent.click(screen.getByLabelText('K9 — Gasnor K9'));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contratos de SOSA MARIA' }));
    await waitFor(() =>
      expect(upsertUno).toHaveBeenCalledWith({
        cuil: '20444444444',
        regimen: 'mensualizado',
        categoriaUocraId: undefined,
        modalidadPago: undefined,
        contratosImputacionIds: [1, 2],
      }),
    );
  });

  it('al elegir régimen Mensualizado, la categoría UOCRA sigue habilitada y se manda (importa para el bono)', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Seleccionar PEREZ ANA'));
    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'mensualizado');
    expect(screen.getByLabelText('Categoría UOCRA')).not.toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Categoría UOCRA'), '1');
    await userEvent.click(screen.getByRole('button', { name: /asignar a 1 seleccionado/i }));
    await waitFor(() =>
      expect(upsertMasivo).toHaveBeenCalledWith(
        expect.objectContaining({ cuils: ['20222222222'], regimen: 'mensualizado', categoriaUocraId: 1 }),
      ),
    );
  });

  it('el checkbox "Permite horas extra" solo aparece con régimen Mensualizado (ADR-017)', async () => {
    render(<PerfilesLiquidacionPage />);
    expect(screen.queryByText(/Permite horas extra/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Seleccionar PEREZ ANA'));
    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'mensualizado');
    expect(screen.getByText(/Permite horas extra/i)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'jornalizado');
    expect(screen.queryByText(/Permite horas extra/i)).not.toBeInTheDocument();
  });

  it('tildar "Permite horas extra" con régimen Mensualizado lo manda en la asignación', async () => {
    render(<PerfilesLiquidacionPage />);
    await userEvent.click(screen.getByLabelText('Seleccionar PEREZ ANA'));
    await userEvent.selectOptions(screen.getByLabelText('Régimen'), 'mensualizado');
    await userEvent.click(screen.getByText(/Permite horas extra/i));
    await userEvent.click(screen.getByRole('button', { name: /asignar a 1 seleccionado/i }));
    await waitFor(() =>
      expect(upsertMasivo).toHaveBeenCalledWith(
        expect.objectContaining({ cuils: ['20222222222'], regimen: 'mensualizado', permiteHorasExtra: true }),
      ),
    );
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
