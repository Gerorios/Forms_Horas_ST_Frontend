import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const crear = vi.fn().mockResolvedValue({});
const toggle = vi.fn();

vi.mock('@/lib/api/liquidacion', () => ({
  useCategoriasUocra: () => ({ data: [{ id: 1, nombre: 'Oficial', activo: true }], isLoading: false }),
  useCrearCategoriaUocra: () => ({ mutateAsync: crear, isPending: false }),
  useToggleCategoriaUocra: () => ({ mutate: toggle }),
  mensajeDeError: () => 'error',
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import CategoriasUocraAdminPage from './page';

describe('CategoriasUocraAdminPage', () => {
  it('lista las categorías del catálogo', () => {
    render(<CategoriasUocraAdminPage />);
    expect(screen.getByText('Oficial')).toBeInTheDocument();
  });

  it('muestra el área Administración en el encabezado', () => {
    render(<CategoriasUocraAdminPage />);
    expect(screen.getAllByText('Administración')[0]).toBeInTheDocument();
  });
});
