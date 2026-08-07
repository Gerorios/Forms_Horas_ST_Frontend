import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UsuarioAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});
const onResetearPassword = vi.fn();

vi.mock('@/lib/api/admin', () => ({
  useEditarUsuario: () => ({ mutateAsync: editar, isPending: false }),
  useRoles: () => ({
    data: [
      { id: 1, nombre: 'Operario' },
      { id: 2, nombre: 'Admin' },
      { id: 3, nombre: 'JefeContrato' },
      { id: 4, nombre: 'JefeCuadrilla' },
    ],
  }),
  useContratosAdmin: () => ({ data: [ { id: 10, codigo: 'K5' }, { id: 11, codigo: 'K8' } ] }),
  useTiposNovedadAdmin: () => ({ data: [ { id: 20, nombre: 'Ausencia' }, { id: 21, nombre: 'Viáticos' } ] }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { UsuarioEditRow } from './usuario-edit-row';

const USUARIO: UsuarioAdmin = {
  cuil: '20111111111',
  email: 'op@st.local',
  activo: true,
  rolId: 1,
  rol: { nombre: 'Operario' },
  empleado: { apellido_nombre: 'TORRES RAMON' },
  contratosHabilitados: [{ contratoId: 10, contrato: { codigo: 'K5' } }],
  contratosComoJefe: [],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
};

const JEFE_CONTRATO: UsuarioAdmin = {
  cuil: '20222222222',
  email: 'jefe@serytec.com',
  activo: true,
  rolId: 3,
  rol: { nombre: 'JefeContrato' },
  empleado: { apellido_nombre: 'SALAS MARIA' },
  contratosHabilitados: [],
  contratosComoJefe: [{ id: 10, codigo: 'K5' }],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
};

const JEFE_CUADRILLA: UsuarioAdmin = {
  cuil: '20333333333',
  email: 'cuadrilla@serytec.com',
  activo: true,
  rolId: 4,
  rol: { nombre: 'JefeCuadrilla' },
  empleado: { apellido_nombre: 'DIAZ LUIS' },
  contratosHabilitados: [],
  contratosComoJefe: [],
  tiposNovedadHabilitados: [{ tipoNovedadId: 21, tipoNovedad: { nombre: 'Viáticos' } }],
  puedeCargarKmPorTantos: false,
};

// Helper: renderiza la fila dentro de una tabla válida.
function renderRow(u: UsuarioAdmin = USUARIO) {
  return render(
    <table><tbody><UsuarioEditRow usuario={u} estado={<span>estado</span>} onResetearPassword={onResetearPassword} /></tbody></table>,
  );
}

describe('UsuarioEditRow', () => {
  beforeEach(() => { editar.mockClear(); onResetearPassword.mockClear(); });

  it('precarga los valores actuales al expandir', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Email')).toHaveValue('op@st.local');
    expect(screen.getByLabelText('Rol')).toHaveValue('1');
    // El contrato K5 (id 10) aparece como seleccionado (aria-pressed=true).
    expect(screen.getByRole('button', { name: 'K5' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('editar el email y guardar llama al mutate con el email nuevo', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const email = screen.getByLabelText('Email');
    await userEvent.clear(email);
    await userEvent.type(email, 'nuevo@st.local');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith(
      expect.objectContaining({ cuil: '20111111111', email: 'nuevo@st.local' }),
    ));
  });

  it('password vacío no se envía en el payload', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const email = screen.getByLabelText('Email');
    await userEvent.clear(email);
    await userEvent.type(email, 'otro@st.local');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalled());
    expect(editar.mock.calls[0][0]).not.toHaveProperty('password');
  });

  it('password con menos de 8 caracteres deshabilita Guardar', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'corta');
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('Cancelar colapsa la fila sin llamar al mutate', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });

  it('click en "Resetear contraseña" llama a onResetearPassword', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: /resetear contraseña/i }));
    expect(onResetearPassword).toHaveBeenCalledTimes(1);
  });

  it('el rol Operario no muestra "Contratos de los que es Jefe"', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.queryByText(/contratos de los que es jefe/i)).not.toBeInTheDocument();
  });

  it('el rol Operario no muestra "¿Puede cargar Km por tantos?"', async () => {
    renderRow();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.queryByRole('checkbox', { name: /puede cargar km por tantos/i })).not.toBeInTheDocument();
  });

  it('un JefeContrato ve el toggle de Km por tantos, destildado por defecto', async () => {
    renderRow(JEFE_CONTRATO);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('checkbox', { name: /puede cargar km por tantos/i })).not.toBeChecked();
  });

  it('un JefeContrato con el flag ya habilitado lo precarga tildado', async () => {
    renderRow({ ...JEFE_CONTRATO, puedeCargarKmPorTantos: true });
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('checkbox', { name: /puede cargar km por tantos/i })).toBeChecked();
  });

  it('tildar el toggle de Km por tantos y guardar envía puedeCargarKmPorTantos', async () => {
    renderRow(JEFE_CONTRATO);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /puede cargar km por tantos/i }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        expect.objectContaining({ cuil: '20222222222', puedeCargarKmPorTantos: true }),
      ),
    );
  });

  it('un JefeContrato precarga sus contratos como jefe, y editarlos envía contratosJefeIds', async () => {
    renderRow(JEFE_CONTRATO);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByText(/contratos de los que es jefe/i)).toBeInTheDocument();

    const botonesK8 = screen.getAllByRole('button', { name: 'K8' });
    // El segundo grupo de botones "K8" es el de "contratos de los que es jefe".
    await userEvent.click(botonesK8[botonesK8.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        expect.objectContaining({ cuil: '20222222222', contratosJefeIds: [10, 11] }),
      ),
    );
  });

  it('un JefeCuadrilla sin tipos habilitados no muestra "¿Carga novedades?" tildado', async () => {
    renderRow({ ...JEFE_CUADRILLA, tiposNovedadHabilitados: [] });
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('checkbox', { name: /carga novedades/i })).not.toBeChecked();
    expect(screen.queryByText(/tipos de novedad habilitados/i)).not.toBeInTheDocument();
  });

  it('un JefeCuadrilla con tipos habilitados precarga el toggle tildado y los tipos', async () => {
    renderRow(JEFE_CUADRILLA);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('checkbox', { name: /carga novedades/i })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Viáticos' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('tildar un tipo de novedad y guardar envía tiposNovedadIds', async () => {
    renderRow(JEFE_CUADRILLA);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Ausencia' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        expect.objectContaining({ cuil: '20333333333', tiposNovedadIds: [21, 20] }),
      ),
    );
  });

  it('destildar "¿Carga novedades?" vacía los tipos elegidos', async () => {
    renderRow(JEFE_CUADRILLA);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /carga novedades/i }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        expect.objectContaining({ cuil: '20333333333', tiposNovedadIds: [] }),
      ),
    );
  });
});
