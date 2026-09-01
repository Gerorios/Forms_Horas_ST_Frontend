import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ItemCert } from '@/lib/api/certificaciones';

const useItemsCert = vi.fn();
const useCrearItemCert = vi.fn();
const useEditarItemCert = vi.fn();
const useEliminarItemCert = vi.fn();
const useContratosAnalytics = vi.fn();

vi.mock('@/lib/api/certificaciones', () => ({
  useItemsCert: (...args: unknown[]) => useItemsCert(...args),
  useCrearItemCert: (...args: unknown[]) => useCrearItemCert(...args),
  useEditarItemCert: (...args: unknown[]) => useEditarItemCert(...args),
  useEliminarItemCert: (...args: unknown[]) => useEliminarItemCert(...args),
  useContratosAnalytics: (...args: unknown[]) => useContratosAnalytics(...args),
}));

const useSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  useSession: (...args: unknown[]) => useSession(...args),
}));

const crear = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});
const eliminar = vi.fn().mockResolvedValue({});
vi.mock('sonner', () => ({ toast: { promise: vi.fn((p) => p) } }));

import ItemsCertPage from './page';

const items: ItemCert[] = [
  {
    id_item: 1,
    item_codigo: 'ITEM-01',
    codigo_k: 'K6',
    grupo: null,
    subgrupo: null,
    tarea: 'Mantenimiento de válvula reguladora de presión en estación de medición',
    frecuencia: 'Mensual',
    contratista: 'ACME SA',
    ptos_gasnor: 0,
    unidad_medida: 'UN',
    tipo: 'OPEX',
    contrato_nombre: null,
  },
  {
    id_item: 2,
    item_codigo: 'ITEM-02',
    codigo_k: 'K11',
    grupo: null,
    subgrupo: null,
    tarea: 'Inspección de red',
    frecuencia: null,
    contratista: null,
    ptos_gasnor: null,
    unidad_medida: null,
    tipo: null,
    contrato_nombre: null,
  },
];

beforeEach(() => {
  useItemsCert.mockReturnValue({ data: items, isLoading: false });
  useContratosAnalytics.mockReturnValue({ data: ['K6', 'K11'] });
  useCrearItemCert.mockReturnValue({ mutateAsync: crear, isPending: false });
  useEditarItemCert.mockReturnValue({ mutateAsync: editar, isPending: false });
  useEliminarItemCert.mockReturnValue({ mutateAsync: eliminar, isPending: false });
  useSession.mockReturnValue({ perfil: { cert: { nivel: 'admin', ks: [], inc: false } } });
  crear.mockClear();
  editar.mockClear();
  eliminar.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ItemsCertPage', () => {
  it('renderiza filas con código, chip de contrato y tipo; ptos_gasnor 0 se muestra como "0"', () => {
    render(<ItemsCertPage />);
    const fila = screen.getByText('ITEM-01').closest('tr')!;
    expect(within(fila).getByText('K6')).toBeInTheDocument();
    expect(within(fila).getByText('OPEX')).toBeInTheDocument();
    expect(within(fila).getByText('0')).toBeInTheDocument();

    const fila2 = screen.getByText('ITEM-02').closest('tr')!;
    expect(within(fila2).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('el buscador espera el debounce de 300ms antes de disparar la búsqueda', () => {
    vi.useFakeTimers();
    render(<ItemsCertPage />);
    const input = screen.getByLabelText('Buscar');
    fireEvent.change(input, { target: { value: 'valvula' } });

    // Antes de que pase el debounce, no se llamó al hook con el texto tipeado.
    expect(useItemsCert).not.toHaveBeenCalledWith(
      expect.objectContaining({ buscar: 'valvula' }),
      expect.anything(),
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(useItemsCert).toHaveBeenCalledWith(
      expect.objectContaining({ buscar: 'valvula' }),
      expect.anything(),
    );
  });

  it('alta: completar código, contrato y tarea y guardar llama a crear con el payload correcto', async () => {
    render(<ItemsCertPage />);
    await userEvent.click(screen.getByRole('button', { name: /nuevo ítem/i }));

    await userEvent.type(screen.getByLabelText('Código'), 'ITEM-99');
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), 'K6');
    await userEvent.type(screen.getByLabelText('Tarea'), 'Tarea nueva');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({
          item_codigo: 'ITEM-99',
          codigo_k: 'K6',
          tarea: 'Tarea nueva',
          tipo: null,
        }),
      ),
    );
  });

  it('edición: vaciar un campo manda null (no lo omite)', async () => {
    render(<ItemsCertPage />);
    const fila = screen.getByText('ITEM-01').closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: /editar/i }));

    const contratistaInput = screen.getByLabelText('Contratista');
    await userEvent.clear(contratistaInput);
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        expect.objectContaining({ idItem: 1, contratista: null }),
      ),
    );
  });

  it('eliminar: confirma y llama al hook con el id', async () => {
    render(<ItemsCertPage />);
    const fila = screen.getByText('ITEM-02').closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: /^eliminar$/i }));
    await userEvent.click(screen.getByRole('button', { name: /eliminar ítem/i }));

    await waitFor(() => expect(eliminar).toHaveBeenCalledWith(2));
  });

  it('con perfil.cert.nivel distinto de admin la página no muestra contenido', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K6'], inc: false } } });
    const { container } = render(<ItemsCertPage />);
    expect(container).toBeEmptyDOMElement();
  });
});
