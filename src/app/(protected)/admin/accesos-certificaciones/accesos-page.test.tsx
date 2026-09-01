import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const guardar = vi.fn().mockResolvedValue({});
const eliminar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/certificaciones', () => ({
  useAccesosCert: () => ({
    data: [
      {
        cuil: '20111111111', nivel: 'carga', verIncidencia: true, nombre: 'PEREZ JUAN',
        contratos: [{ id: 6, codigo: 'K6' }, { id: 11, codigo: 'K11' }],
      },
      { cuil: '20222222222', nivel: 'lectura', verIncidencia: false, nombre: 'GOMEZ ANA', contratos: [] },
    ],
    isLoading: false,
  }),
  useGuardarAccesoCert: () => ({ mutateAsync: guardar, isPending: false }),
  useEliminarAccesoCert: () => ({ mutateAsync: eliminar, isPending: false }),
}));
vi.mock('@/lib/api/admin', () => ({
  useUsuariosAdmin: () => ({
    data: [
      {
        cuil: '20111111111', email: 'jefe@st.local', activo: true,
        rol: { nombre: 'JefeContrato' }, empleado: { apellido_nombre: 'PEREZ JUAN' },
      },
      {
        cuil: '20333333333', email: 'nuevo@st.local', activo: true,
        rol: { nombre: 'Gerente' }, empleado: { apellido_nombre: 'LOPEZ MARIA' },
      },
      {
        cuil: '20444444444', email: 'inactivo@st.local', activo: false,
        rol: { nombre: 'Operario' }, empleado: { apellido_nombre: 'INACTIVO JOSE' },
      },
    ],
  }),
  useContratosAdmin: () => ({
    data: [
      { id: 6, codigo: 'K6', nombre: 'Contrato K6', activo: true, jefesCuils: [] },
      { id: 11, codigo: 'K11', nombre: 'Contrato K11', activo: true, jefesCuils: [] },
      { id: 99, codigo: 'K99', nombre: 'Viejo', activo: false, jefesCuils: [] },
    ],
  }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn((p) => p) } }));

import AccesosCertificacionesPage from './page';

describe('AccesosCertificacionesPage', () => {
  beforeEach(() => {
    guardar.mockClear();
    eliminar.mockClear();
  });

  it('lista cada acceso con nombre, nivel y sus contratos K', () => {
    render(<AccesosCertificacionesPage />);
    const fila = screen.getByText('PEREZ JUAN').closest('li')!;
    expect(within(fila).getByText('Carga')).toBeInTheDocument();
    expect(within(fila).getByText('K6')).toBeInTheDocument();
    expect(within(fila).getByText('K11')).toBeInTheDocument();
    const fila2 = screen.getByText('GOMEZ ANA').closest('li')!;
    expect(within(fila2).getByText('Lectura')).toBeInTheDocument();
  });

  it('el select de alta solo ofrece usuarios activos sin acceso', () => {
    render(<AccesosCertificacionesPage />);
    const select = screen.getByLabelText('Usuario');
    const opciones = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toContain('LOPEZ MARIA');
    expect(opciones).not.toContain('PEREZ JUAN'); // ya tiene acceso
    expect(opciones).not.toContain('INACTIVO JOSE'); // inactivo
  });

  it('dar acceso nivel carga con un K llama al guardar con el dto del backend', async () => {
    render(<AccesosCertificacionesPage />);
    await userEvent.selectOptions(screen.getByLabelText('Usuario'), '20333333333');
    await userEvent.selectOptions(screen.getByLabelText('Nivel'), 'carga');
    await userEvent.click(screen.getByRole('button', { name: 'K6' }));
    await userEvent.click(screen.getByLabelText('Ve incidencia de MO'));
    await userEvent.click(screen.getByRole('button', { name: /dar acceso/i }));
    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith({
        cuil: '20333333333',
        nivel: 'carga',
        verIncidencia: true,
        contratoIds: [6],
      }),
    );
  });

  it('quitar un acceso llama al eliminar con el cuil', async () => {
    render(<AccesosCertificacionesPage />);
    const fila = screen.getByText('GOMEZ ANA').closest('li')!;
    await userEvent.click(within(fila).getByRole('button', { name: /quitar/i }));
    await waitFor(() => expect(eliminar).toHaveBeenCalledWith('20222222222'));
  });

  it('editar un acceso precarga sus valores y guarda los cambios', async () => {
    render(<AccesosCertificacionesPage />);
    const fila = screen.getByText('PEREZ JUAN').closest('li')!;
    await userEvent.click(within(fila).getByRole('button', { name: /editar/i }));
    // K11 estaba habilitado: se saca; queda solo K6
    await userEvent.click(within(fila).getByRole('button', { name: 'K11' }));
    await userEvent.click(within(fila).getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith({
        cuil: '20111111111',
        nivel: 'carga',
        verIncidencia: true,
        contratoIds: [6],
      }),
    );
  });
});
