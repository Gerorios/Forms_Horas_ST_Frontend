import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContratoAdmin, UsuarioAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useEditarContrato: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { ContratoEditRow } from './contrato-edit-row';

const CONTRATO: ContratoAdmin = {
  id: 1, codigo: 'K5', nombre: 'Contrato K5', activo: true,
  jefesCuils: [],
};

const JEFES: UsuarioAdmin[] = [
  {
    cuil: '20111111111', email: 'jefe1@serytec.com', activo: true, rolId: 3,
    rol: { nombre: 'JefeContrato' }, empleado: { apellido_nombre: 'PEREZ JUAN' },
    contratosHabilitados: [], contratosComoJefe: [], tiposNovedadHabilitados: [],
  },
  {
    cuil: '20222222222', email: 'jefe2@serytec.com', activo: true, rolId: 3,
    rol: { nombre: 'JefeContrato' }, empleado: { apellido_nombre: 'GOMEZ ANA' },
    contratosHabilitados: [], contratosComoJefe: [], tiposNovedadHabilitados: [],
  },
];

function renderRow(contrato: ContratoAdmin = CONTRATO) {
  return render(<ContratoEditRow contrato={contrato} jefes={JEFES} pill={<span>pill</span>} />);
}

describe('ContratoEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

  it('precarga nombre y sin chips de jefe seleccionados cuando no tiene jefes', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Contrato K5');
    expect(screen.getByRole('button', { name: 'PEREZ JUAN' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'GOMEZ ANA' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('muestra "sin jefes" en la fila colapsada cuando el contrato no tiene jefes', () => {
    renderRow();
    expect(screen.getByText('sin jefes')).toBeInTheDocument();
  });

  it('precarga los chips de los jefes actuales como seleccionados', async () => {
    const conJefe: ContratoAdmin = { ...CONTRATO, jefesCuils: ['20111111111'] };
    renderRow(conJefe);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: 'PEREZ JUAN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'GOMEZ ANA' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('editar el nombre y guardar llama al mutate con id y nombre nuevo', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'K5 renombrado');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, nombre: 'K5 renombrado' }));
  });

  it('asignar un jefe y guardar llama al mutate con jefesCuils', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: 'GOMEZ ANA' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, jefesCuils: ['20222222222'] }));
  });

  it('seleccionar un segundo jefe agrega el chip sin quitar el primero', async () => {
    const conJefe: ContratoAdmin = { ...CONTRATO, jefesCuils: ['20111111111'] };
    renderRow(conJefe);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: 'PEREZ JUAN' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'GOMEZ ANA' }));
    expect(screen.getByRole('button', { name: 'PEREZ JUAN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'GOMEZ ANA' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith({ id: 1, jefesCuils: expect.arrayContaining(['20111111111', '20222222222']) }),
    );
    const call = editar.mock.calls[0][0];
    expect(call.jefesCuils).toHaveLength(2);
  });

  it('quitar un chip y guardar envía jefesCuils sin ese cuil', async () => {
    const conDosJefes: ContratoAdmin = { ...CONTRATO, jefesCuils: ['20111111111', '20222222222'] };
    renderRow(conDosJefes);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: 'PEREZ JUAN' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, jefesCuils: ['20222222222'] }));
  });

  it('quitar todos los jefes y guardar envía jefesCuils: []', async () => {
    const conJefe: ContratoAdmin = { ...CONTRATO, jefesCuils: ['20111111111'] };
    renderRow(conJefe);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: 'PEREZ JUAN' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, jefesCuils: [] }));
  });

  it('Guardar deshabilitado sin cambios', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('Cancelar colapsa la fila sin llamar al mutate', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.type(screen.getByLabelText('Nombre'), ' extra');
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });
});
