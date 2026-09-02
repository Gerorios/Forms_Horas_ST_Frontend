import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HistorialCargaCert } from '@/lib/api/certificaciones';

const useHistorialCargas = vi.fn();
const useDeshacerCarga = vi.fn();

vi.mock('@/lib/api/certificaciones', () => ({
  useHistorialCargas: (...args: unknown[]) => useHistorialCargas(...args),
  useDeshacerCarga: (...args: unknown[]) => useDeshacerCarga(...args),
}));

const useSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  useSession: (...args: unknown[]) => useSession(...args),
}));

const deshacer = vi.fn().mockResolvedValue({ mensaje: 'Carga deshecha', filasBorradas: 42 });
vi.mock('sonner', () => ({ toast: { promise: vi.fn((p) => p) } }));

import HistorialCargasPage from './page';

const historial: HistorialCargaCert[] = [
  {
    id: 1,
    usuario_nombre: 'Juan Pérez',
    archivo_nombre: 'certificacion-agosto-2026.xlsx',
    contrato: 'K6,K11',
    periodo: '2026-08',
    filas_cargadas: 42,
    filas_error: 0,
    estado: 'ok',
    cargado_en: '2026-08-31 10:15',
  },
  {
    id: 2,
    usuario_nombre: 'Ana Gómez',
    archivo_nombre: 'certificacion-julio-2026.xlsx',
    contrato: 'K3',
    periodo: '2026-07',
    filas_cargadas: 10,
    filas_error: 3,
    estado: 'parcial',
    cargado_en: '2026-07-31 09:00',
  },
];

beforeEach(() => {
  useHistorialCargas.mockReturnValue({ data: historial, isLoading: false });
  useDeshacerCarga.mockReturnValue({ mutateAsync: deshacer, isPending: false });
  useSession.mockReturnValue({ perfil: { cert: { nivel: 'admin', ks: [], inc: false } } });
  deshacer.mockClear();
});

describe('HistorialCargasPage', () => {
  it('renderiza chips de contrato, filas con error y estado', () => {
    render(<HistorialCargasPage />);

    const fila1 = screen.getByText('Juan Pérez').closest('tr')!;
    expect(within(fila1).getByText('K6')).toBeInTheDocument();
    expect(within(fila1).getByText('K11')).toBeInTheDocument();
    expect(within(fila1).getByText('OK')).toBeInTheDocument();
    expect(within(fila1).queryByText(/err/)).not.toBeInTheDocument();

    const fila2 = screen.getByText('Ana Gómez').closest('tr')!;
    expect(within(fila2).getByText('K3')).toBeInTheDocument();
    expect(within(fila2).getByText('Parcial')).toBeInTheDocument();
    expect(within(fila2).getByText('3 err')).toBeInTheDocument();
  });

  it('el botón Deshacer solo se muestra para nivel admin', () => {
    const { rerender } = render(<HistorialCargasPage />);
    expect(screen.getAllByRole('button', { name: /deshacer/i }).length).toBe(2);

    useSession.mockReturnValue({ perfil: { cert: { nivel: 'lectura', ks: [], inc: false } } });
    rerender(<HistorialCargasPage />);
    expect(screen.queryByRole('button', { name: /deshacer/i })).not.toBeInTheDocument();
  });

  it('el botón Deshacer tampoco se muestra para nivel carga', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K6'], inc: false } } });
    render(<HistorialCargasPage />);
    expect(screen.queryByRole('button', { name: /deshacer/i })).not.toBeInTheDocument();
  });

  it('confirmar el modal de deshacer llama al hook con el id de la carga', async () => {
    render(<HistorialCargasPage />);
    const fila1 = screen.getByText('Juan Pérez').closest('tr')!;
    await userEvent.click(within(fila1).getByRole('button', { name: /deshacer/i }));

    expect(screen.getByText(/borra las 42 filas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /deshacer carga/i }));

    await waitFor(() => expect(deshacer).toHaveBeenCalledWith(1));
  });

  it('cancelar el modal no llama al hook', async () => {
    render(<HistorialCargasPage />);
    const fila2 = screen.getByText('Ana Gómez').closest('tr')!;
    await userEvent.click(within(fila2).getByRole('button', { name: /deshacer/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(deshacer).not.toHaveBeenCalled();
    expect(screen.queryByText(/borra las 10 filas/i)).not.toBeInTheDocument();
  });

  it('muestra el error del backend si la mutación falla', async () => {
    const deshacerError = vi.fn().mockRejectedValue({ response: { data: { message: 'No se puede deshacer esta carga' } } });
    useDeshacerCarga.mockReturnValue({ mutateAsync: deshacerError, isPending: false });

    render(<HistorialCargasPage />);
    const fila1 = screen.getByText('Juan Pérez').closest('tr')!;
    await userEvent.click(within(fila1).getByRole('button', { name: /deshacer/i }));
    await userEvent.click(screen.getByRole('button', { name: /deshacer carga/i }));

    await waitFor(() => expect(deshacerError).toHaveBeenCalledWith(1));
  });

  it('una fila con contrato y periodo null (carga legada del portal) renderiza sin explotar', () => {
    useHistorialCargas.mockReturnValue({
      data: [
        {
          id: 3,
          usuario_nombre: 'Legado Portal',
          archivo_nombre: 'legado.xlsx',
          contrato: null,
          periodo: null,
          filas_cargadas: 5,
          filas_error: 0,
          estado: 'ok',
          cargado_en: '2026-01-01 00:00',
        },
      ],
      isLoading: false,
    });
    render(<HistorialCargasPage />);
    const fila = screen.getByText('Legado Portal').closest('tr')!;
    expect(within(fila).getByText('—')).toBeInTheDocument();
  });

  it('sin cargas registradas muestra el mensaje vacío', () => {
    useHistorialCargas.mockReturnValue({ data: [], isLoading: false });
    render(<HistorialCargasPage />);
    expect(screen.getByText(/sin cargas registradas/i)).toBeInTheDocument();
  });
});
