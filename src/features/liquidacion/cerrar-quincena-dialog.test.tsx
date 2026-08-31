import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const crearCierre = vi.fn();
let cierresData: { anio: number; mes: number; quincena: number; version: number }[] = [];
const useCierresMock = vi.fn(() => ({ data: cierresData, isLoading: false }));

vi.mock('@/lib/api/liquidacion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/liquidacion')>('@/lib/api/liquidacion');
  return {
    ...actual,
    useCierres: () => useCierresMock(),
    useCrearCierre: () => ({ mutate: crearCierre, isPending: false }),
  };
});
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), error: vi.fn() } }));

import { CerrarQuincenaDialog } from './cerrar-quincena-dialog';

const TOTALES = { total: 123456.78, empleados: 12 };

describe('CerrarQuincenaDialog', () => {
  beforeEach(() => {
    push.mockClear();
    crearCierre.mockClear();
    cierresData = [];
  });

  it('muestra "cierre v1" cuando no hay versiones previas de la quincena', () => {
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/cierre v1/i)).toBeInTheDocument();
    // Sin recierre: no pide nota.
    expect(screen.queryByLabelText(/nota/i)).not.toBeInTheDocument();
  });

  it('muestra "cierre v2" y exige nota cuando ya hay un cierre v1 de esa quincena', () => {
    cierresData = [{ anio: 2026, mes: 8, quincena: 1, version: 1 }];
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/cierre v2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nota/i)).toBeInTheDocument();
  });

  it('ignora versiones de otras quincenas/períodos al calcular la próxima versión', () => {
    cierresData = [
      { anio: 2026, mes: 8, quincena: 2, version: 3 },
      { anio: 2026, mes: 7, quincena: 1, version: 5 },
    ];
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/cierre v1/i)).toBeInTheDocument();
  });

  it('lista las salvedades recibidas', () => {
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={['2 sin perfil de liquidación asignado', '1 con dato faltante']}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('2 sin perfil de liquidación asignado')).toBeInTheDocument();
    expect(screen.getByText('1 con dato faltante')).toBeInTheDocument();
  });

  it('el botón Confirmar está deshabilitado en un recierre (v2) sin nota, y se habilita al escribirla', async () => {
    cierresData = [{ anio: 2026, mes: 8, quincena: 1, version: 1 }];
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    const confirmar = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/nota/i), 'corrección de horas extra');
    expect(confirmar).toBeEnabled();
  });

  it('confirmar en v1 (sin nota) llama al hook con {anio, mes, quincena}', async () => {
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(crearCierre).toHaveBeenCalledTimes(1);
    const [dto] = crearCierre.mock.calls[0];
    expect(dto).toEqual({ anio: 2026, mes: 8, quincena: 1 });
  });

  it('confirmar en un recierre (v2) llama al hook con la nota escrita', async () => {
    cierresData = [{ anio: 2026, mes: 8, quincena: 1, version: 1 }];
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    await userEvent.type(screen.getByLabelText(/nota/i), 'corrección de horas extra');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(crearCierre).toHaveBeenCalledWith(
      { anio: 2026, mes: 8, quincena: 1, nota: 'corrección de horas extra' },
      expect.anything(),
    );
  });

  it('al confirmar exitosamente navega a /liquidacion/cierres?nuevo=<id>', async () => {
    crearCierre.mockImplementation((_dto, opts) => {
      opts.onSuccess({ id: 42 });
    });
    render(
      <CerrarQuincenaDialog
        anio={2026}
        mes={8}
        quincena={1}
        totales={TOTALES}
        salvedades={[]}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/liquidacion/cierres?nuevo=42'));
  });
});
