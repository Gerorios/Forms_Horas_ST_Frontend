import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UsuarioAdmin } from '@/lib/api/admin';

const editar = vi.fn().mockResolvedValue({});
const resetear = vi.fn().mockResolvedValue({});

const USUARIOS: UsuarioAdmin[] = [
  {
    cuil: '20111111111', email: 'jose@st.local', activo: true, rolId: 1,
    rol: { nombre: 'Operario' }, empleado: { apellido_nombre: 'JOSÉ TORRES' },
    contratosHabilitados: [], contratosComoJefe: [], tiposNovedadHabilitados: [],
  },
  {
    cuil: '20222222222', email: 'maria@st.local', activo: true, rolId: 2,
    rol: { nombre: 'Admin' }, empleado: { apellido_nombre: 'MARIA GOMEZ' },
    contratosHabilitados: [], contratosComoJefe: [], tiposNovedadHabilitados: [],
  },
];

vi.mock('@/lib/api/admin', () => ({
  useUsuariosAdmin: () => ({ data: USUARIOS, isLoading: false }),
  useEditarUsuario: () => ({ mutateAsync: editar, isPending: false }),
  useResetearPassword: () => ({ mutateAsync: resetear, isPending: false }),
  useRoles: () => ({ data: [{ id: 1, nombre: 'Operario' }, { id: 2, nombre: 'Admin' }] }),
  useContratosAdmin: () => ({ data: [] }),
  useTiposNovedadAdmin: () => ({ data: [] }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import UsuariosAdminPage from './page';

describe('UsuariosAdminPage — filtro', () => {
  beforeEach(() => { editar.mockClear(); resetear.mockClear(); });

  it('muestra todos los usuarios sin filtro', () => {
    render(<UsuariosAdminPage />);
    expect(screen.getByText('JOSÉ TORRES')).toBeInTheDocument();
    expect(screen.getByText('MARIA GOMEZ')).toBeInTheDocument();
  });

  it('filtra por nombre, sin distinguir tildes/mayúsculas', async () => {
    render(<UsuariosAdminPage />);
    await userEvent.type(screen.getByLabelText('Buscar por nombre'), 'jose');
    expect(screen.getByText('JOSÉ TORRES')).toBeInTheDocument();
    expect(screen.queryByText('MARIA GOMEZ')).not.toBeInTheDocument();
  });

  it('filtra por rol seleccionado', async () => {
    render(<UsuariosAdminPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por rol'));
    await userEvent.click(screen.getByLabelText('Admin'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('JOSÉ TORRES')).not.toBeInTheDocument();
    expect(screen.getByText('MARIA GOMEZ')).toBeInTheDocument();
  });

  it('combina nombre y rol con "Y"', async () => {
    render(<UsuariosAdminPage />);
    await userEvent.type(screen.getByLabelText('Buscar por nombre'), 'jose');
    await userEvent.click(screen.getByLabelText('Filtrar por rol'));
    await userEvent.click(screen.getByLabelText('Admin'));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('No hay usuarios que coincidan con el filtro.')).toBeInTheDocument();
  });
});

describe('UsuariosAdminPage — reset de contraseña', () => {
  beforeEach(() => { editar.mockClear(); resetear.mockClear(); });

  it('abre el diálogo con el nombre y cuil correctos y confirma llama al mutate con el cuil', async () => {
    render(<UsuariosAdminPage />);
    const filas = screen.getAllByRole('button', { name: /editar/i });
    await userEvent.click(filas[0]);
    await userEvent.click(screen.getByRole('button', { name: /resetear contraseña/i }));
    // "JOSÉ TORRES" y el cuil también aparecen en la fila (que sigue expandida),
    // así que puede haber más de una coincidencia — basta con que aparezcan.
    expect(screen.getAllByText(/JOSÉ TORRES/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20111111111/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(resetear).toHaveBeenCalledWith('20111111111'));
  });

  it('cancelar el diálogo no llama al mutate', async () => {
    render(<UsuariosAdminPage />);
    const filas = screen.getAllByRole('button', { name: /editar/i });
    await userEvent.click(filas[0]);
    await userEvent.click(screen.getByRole('button', { name: /resetear contraseña/i }));
    const botonesCancelar = screen.getAllByRole('button', { name: /cancelar/i });
    await userEvent.click(botonesCancelar[botonesCancelar.length - 1]);
    expect(resetear).not.toHaveBeenCalled();
  });
});
