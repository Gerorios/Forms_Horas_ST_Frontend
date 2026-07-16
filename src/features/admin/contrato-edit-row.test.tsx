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
  jefeContratoCuil: null, jefeContrato: null,
};

const JEFES: UsuarioAdmin[] = [
  {
    cuil: '20111111111', email: 'jefe1@serytec.com', activo: true, rolId: 3,
    rol: { nombre: 'JefeContrato' }, empleado: { apellido_nombre: 'PEREZ JUAN' },
    contratosHabilitados: [],
  },
  {
    cuil: '20222222222', email: 'jefe2@serytec.com', activo: true, rolId: 3,
    rol: { nombre: 'JefeContrato' }, empleado: { apellido_nombre: 'GOMEZ ANA' },
    contratosHabilitados: [],
  },
];

function renderRow(contrato: ContratoAdmin = CONTRATO) {
  return render(<ContratoEditRow contrato={contrato} jefes={JEFES} pill={<span>pill</span>} />);
}

describe('ContratoEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

  it('precarga nombre y "Sin jefe asignado" cuando no tiene jefe', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Contrato K5');
    expect(screen.getByLabelText('Jefe de Contrato')).toHaveValue('');
  });

  it('precarga el jefe actual cuando ya tiene uno asignado', async () => {
    const conJefe: ContratoAdmin = {
      ...CONTRATO,
      jefeContratoCuil: '20111111111',
      jefeContrato: { cuil: '20111111111', email: 'jefe1@serytec.com' },
    };
    renderRow(conJefe);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Jefe de Contrato')).toHaveValue('20111111111');
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

  it('asignar un jefe y guardar llama al mutate con jefeContratoCuil', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.selectOptions(screen.getByLabelText('Jefe de Contrato'), '20222222222');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, jefeContratoCuil: '20222222222' }));
  });

  it('desasignar el jefe (volver a "Sin jefe asignado") envía jefeContratoCuil: null', async () => {
    const conJefe: ContratoAdmin = {
      ...CONTRATO,
      jefeContratoCuil: '20111111111',
      jefeContrato: { cuil: '20111111111', email: 'jefe1@serytec.com' },
    };
    renderRow(conJefe);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.selectOptions(screen.getByLabelText('Jefe de Contrato'), '');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, jefeContratoCuil: null }));
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
