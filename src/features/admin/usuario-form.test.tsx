import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useCrearUsuario: () => ({ mutateAsync: crear, isPending: false }),
  useRoles: () => ({
    data: [{ id: 1, nombre: 'Operario' }, { id: 2, nombre: 'JefeCuadrilla' }, { id: 3, nombre: 'JefeContrato' }],
  }),
  useContratosAdmin: () => ({ data: [{ id: 5, codigo: 'K5', nombre: 'K5', activo: true, jefeContratoCuil: null, jefeContrato: null }] }),
  useTiposNovedadAdmin: () => ({ data: [{ id: 8, nombre: 'Viáticos' }] }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 1, cargo: 'OF' }] }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { UsuarioForm } from './usuario-form';

describe('UsuarioForm', () => {
  beforeEach(() => crear.mockClear());

  it('crea un usuario con empleado, email, contraseña y rol', async () => {
    render(<UsuarioForm onCreado={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.type(screen.getByLabelText('Email'), 'gomez@st.local');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto12');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), '2');
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ cuil: '20169', email: 'gomez@st.local', password: 'secreto12', rolId: 2 }),
      ),
    );
  });

  it('con "Fuera de nómina" permite cargar nombre/apellido/cuil a mano en vez de buscar empleado', async () => {
    render(<UsuarioForm onCreado={() => {}} />);
    await userEvent.click(screen.getByLabelText('Fuera de nómina'));
    expect(screen.queryByPlaceholderText(/buscar operario/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nombre'), 'juan');
    await userEvent.type(screen.getByLabelText('Apellido'), 'perez');
    await userEvent.type(screen.getByLabelText('CUIL'), '20123456789');
    await userEvent.type(screen.getByLabelText('Email'), 'juan@st.local');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto12');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), '1');
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({
          cuil: '20123456789',
          nombreFueraNomina: 'PEREZ JUAN',
          email: 'juan@st.local',
          rolId: 1,
        }),
      ),
    );
  });

  it('sin rol JefeContrato, no muestra "Contratos de los que es Jefe"', () => {
    render(<UsuarioForm onCreado={() => {}} />);
    expect(screen.queryByText(/contratos de los que es jefe/i)).not.toBeInTheDocument();
  });

  it('al elegir rol JefeContrato, permite marcar de qué contratos es jefe y lo manda en el payload', async () => {
    render(<UsuarioForm onCreado={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.type(screen.getByLabelText('Email'), 'gomez@st.local');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto12');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), '3');

    expect(screen.getByText(/contratos de los que es jefe/i)).toBeInTheDocument();
    const botonesK5 = screen.getAllByRole('button', { name: 'K5' });
    await userEvent.click(botonesK5[botonesK5.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ rolId: 3, contratosJefeIds: [5] }),
      ),
    );
  });

  it('sin rol JefeCuadrilla, no muestra "¿Carga novedades?"', () => {
    render(<UsuarioForm onCreado={() => {}} />);
    expect(screen.queryByText(/carga novedades/i)).not.toBeInTheDocument();
  });

  it('al elegir rol JefeCuadrilla y tildar "¿Carga novedades?", se pueden elegir tipos y se mandan en el payload', async () => {
    render(<UsuarioForm onCreado={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.type(screen.getByLabelText('Email'), 'gomez@st.local');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto12');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), '2');

    expect(screen.getByText(/carga novedades/i)).toBeInTheDocument();
    expect(screen.queryByText('Viáticos')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /carga novedades/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Viáticos' }));
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ rolId: 2, tiposNovedadIds: [8] }),
      ),
    );
  });
});
