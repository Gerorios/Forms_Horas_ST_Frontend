import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const toggle = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});

/** El dataset se cambia por test (búsqueda y paginación necesitan varios
 * móviles), así que el hook es un mock con `mockReturnValue` en vez de una
 * factory fija. Por defecto devuelve el único móvil de siempre. */
const useMovilesAdminMock = vi.fn();
const UN_MOVIL = [{ id: 1, identificador: 'INT-101', descripcion: 'Camioneta', activo: true }];

vi.mock('@/lib/api/admin', () => ({
  useMovilesAdmin: () => useMovilesAdminMock(),
  useCrearMovil: () => ({ mutateAsync: crear, isPending: false }),
  useToggleMovil: () => ({ mutateAsync: toggle, isPending: false }),
  useEditarMovil: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import MovilesAdminPage from './page';

describe('MovilesAdminPage', () => {
  beforeEach(() => {
    crear.mockClear(); toggle.mockClear(); editar.mockClear();
    useMovilesAdminMock.mockReset();
    useMovilesAdminMock.mockReturnValue({ data: UN_MOVIL, isLoading: false });
  });

  it('el alta no ocupa lugar hasta que se pide: "Añadir móvil" abre el modal y crea', async () => {
    render(<MovilesAdminPage />);
    expect(screen.queryByLabelText('Patente')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /añadir móvil/i }));
    await userEvent.type(screen.getByLabelText('Patente'), 'AB123CD');
    await userEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() => expect(crear).toHaveBeenCalledWith({ identificador: 'AB123CD', descripcion: undefined }));
  });

  it('Cancelar cierra el modal sin crear', async () => {
    render(<MovilesAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /añadir móvil/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByLabelText('Patente')).not.toBeInTheDocument());
    expect(crear).not.toHaveBeenCalled();
  });

  it('el toggle de activo llama la mutación', async () => {
    render(<MovilesAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith({ id: 1, activo: false }));
  });

  it('editar la descripción de un móvil llama al mutate', async () => {
    render(<MovilesAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const descripcion = screen.getByDisplayValue('Camioneta');
    await userEvent.clear(descripcion);
    await userEvent.type(descripcion, 'Camioneta blanca');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, descripcion: 'Camioneta blanca' }));
  });

  describe('búsqueda por patente y descripción', () => {
    const flota = [
      { id: 1, identificador: 'AA615NF', descripcion: 'Camioneta Toyota Hilux', activo: true },
      { id: 2, identificador: 'A166LHV', descripcion: 'Moto Guardia', activo: true },
      { id: 3, identificador: '301IEG', descripcion: null, activo: true },
    ];

    it('la patente se encuentra aunque se tipee con guiones o espacios', async () => {
      useMovilesAdminMock.mockReturnValue({ data: flota, isLoading: false });
      render(<MovilesAdminPage />);
      await userEvent.type(screen.getByLabelText('Buscar móvil'), 'aa-615');
      expect(screen.getByText('AA615NF')).toBeInTheDocument();
      expect(screen.queryByText('A166LHV')).not.toBeInTheDocument();
      expect(screen.queryByText('301IEG')).not.toBeInTheDocument();
    });

    it('también se puede filtrar por el tipo de vehículo', async () => {
      useMovilesAdminMock.mockReturnValue({ data: flota, isLoading: false });
      render(<MovilesAdminPage />);
      await userEvent.type(screen.getByLabelText('Buscar móvil'), 'moto');
      expect(screen.getByText('A166LHV')).toBeInTheDocument();
      expect(screen.queryByText('AA615NF')).not.toBeInTheDocument();
    });

    it('sin coincidencias avisa qué se buscó, distinto del listado vacío', async () => {
      useMovilesAdminMock.mockReturnValue({ data: flota, isLoading: false });
      render(<MovilesAdminPage />);
      await userEvent.type(screen.getByLabelText('Buscar móvil'), 'zzz');
      expect(screen.getByText('Ningún móvil coincide con «zzz»')).toBeInTheDocument();
      expect(screen.queryByText('Sin móviles.')).not.toBeInTheDocument();
    });

    it('el listado realmente vacío sigue diciendo "Sin móviles."', () => {
      useMovilesAdminMock.mockReturnValue({ data: [], isLoading: false });
      render(<MovilesAdminPage />);
      expect(screen.getByText('Sin móviles.')).toBeInTheDocument();
    });
  });

  describe('paginación de a 20', () => {
    // 25 móviles: dos páginas, la segunda con 5.
    const muchos = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      identificador: `AA${String(i).padStart(3, '0')}ZZ`,
      descripcion: 'Camioneta',
      activo: true,
    }));

    it('muestra los primeros 20 y el pie con el total', { timeout: 15000 }, () => {
      useMovilesAdminMock.mockReturnValue({ data: muchos, isLoading: false });
      render(<MovilesAdminPage />);
      expect(screen.getByText('AA000ZZ')).toBeInTheDocument();
      expect(screen.getByText('AA019ZZ')).toBeInTheDocument();
      expect(screen.queryByText('AA020ZZ')).not.toBeInTheDocument();
      expect(screen.getByText('Página 1 de 2 · 25 móviles')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    });

    it('"Siguiente" trae el resto', { timeout: 15000 }, async () => {
      useMovilesAdminMock.mockReturnValue({ data: muchos, isLoading: false });
      render(<MovilesAdminPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(screen.getByText('AA020ZZ')).toBeInTheDocument();
      expect(screen.getByText('AA024ZZ')).toBeInTheDocument();
      expect(screen.queryByText('AA019ZZ')).not.toBeInTheDocument();
      expect(screen.getByText('Página 2 de 2 · 25 móviles')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    });

    it('con 20 o menos no se muestra el paginador', { timeout: 15000 }, () => {
      useMovilesAdminMock.mockReturnValue({ data: muchos.slice(0, 20), isLoading: false });
      render(<MovilesAdminPage />);
      expect(screen.queryByText(/^Página /)).not.toBeInTheDocument();
    });

    it('buscar vuelve a la primera página', { timeout: 15000 }, async () => {
      useMovilesAdminMock.mockReturnValue({ data: muchos, isLoading: false });
      render(<MovilesAdminPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(screen.getByText('Página 2 de 2 · 25 móviles')).toBeInTheDocument();
      // "cam" matchea la descripción de los 25: el filtro no achica la lista,
      // así que si no hubiera reset explícito la página 2 seguiría siendo válida.
      await userEvent.type(screen.getByLabelText('Buscar móvil'), 'cam');
      expect(screen.getByText('Página 1 de 2 · 25 móviles')).toBeInTheDocument();
      expect(screen.getByText('AA000ZZ')).toBeInTheDocument();
    });
  });
});
