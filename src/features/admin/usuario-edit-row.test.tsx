import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UsuarioAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useEditarUsuario: () => ({ mutateAsync: editar, isPending: false }),
  useRoles: () => ({ data: [ { id: 1, nombre: 'Operario' }, { id: 2, nombre: 'Admin' } ] }),
  useContratosAdmin: () => ({ data: [ { id: 10, codigo: 'K5' }, { id: 11, codigo: 'K8' } ] }),
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
};

// Helper: renderiza la fila dentro de una tabla válida.
function renderRow(u: UsuarioAdmin = USUARIO) {
  return render(
    <table><tbody><UsuarioEditRow usuario={u} /></tbody></table>,
  );
}

describe('UsuarioEditRow', () => {
  beforeEach(() => { editar.mockClear(); });

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
});
