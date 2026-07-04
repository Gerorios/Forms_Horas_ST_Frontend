import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useCrearUsuario: () => ({ mutateAsync: crear, isPending: false }),
  useRoles: () => ({ data: [{ id: 1, nombre: 'Operario' }, { id: 2, nombre: 'JefeCuadrilla' }] }),
  useContratosAdmin: () => ({ data: [{ id: 5, codigo: 'K5', nombre: 'K5', activo: true, jefeContratoCuil: null, jefeContrato: null }] }),
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
});
