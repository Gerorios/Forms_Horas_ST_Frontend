import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resolverLote = vi.fn().mockResolvedValue({});
const reabrirRegistro = vi.fn().mockResolvedValue({});
const corregirLote = vi.fn().mockResolvedValue({});

function fila(
  id: number,
  loteId: string,
  accionable: boolean,
  estado = 'pendiente',
  codigo = 'K5',
  operarioCuil = '20111',
  operarioNombre = 'PEREZ JUAN',
) {
  return {
    id, loteId, fecha: '2026-07-10', horas: '8', estado, alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: operarioCuil, apellido_nombre: operarioNombre },
    contrato: { id: codigo === 'K5' ? 1 : 2, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' }, moviles: [], accionable,
    cargadoPor: { cuil: '20222222222', nombre: 'JEFE CUADRILLA' },
    aprobadoPor: null,
    aprobadoEn: null,
    totalHorasDia: 8,
    duplicadoCruzado: false,
  };
}

const datosPorEstado: Record<string, ReturnType<typeof fila>[]> = {
  pendiente: [
    fila(1, 'lote-a', true),
    fila(2, 'lote-a', false, 'pendiente', 'K8'),
    fila(3, 'lote-b', true),
    fila(6, 'lote-b', true, 'pendiente', 'K5', '20444444444', 'GOMEZ MARIA'),
  ],
  aprobado: [fila(4, 'lote-c', true, 'aprobado')],
  desaprobado: [fila(5, 'lote-d', true, 'desaprobado')],
};

vi.mock('@/lib/api/aprobaciones', () => ({
  usePorAprobar: (estado: string) => ({ data: datosPorEstado[estado] ?? [], isLoading: false }),
  useResolverLote: () => ({ mutateAsync: resolverLote, isPending: false }),
  useReabrirRegistro: () => ({ mutateAsync: reabrirRegistro, isPending: false }),
  useCorregirLote: () => ({ mutateAsync: corregirLote, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

let searchParamsMock = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock,
}));

import AprobacionesPage from './page';

describe('AprobacionesPage', () => {
  beforeEach(() => {
    resolverLote.mockClear();
    reabrirRegistro.mockClear();
    corregirLote.mockClear();
    searchParamsMock = new URLSearchParams();
  });

  it('por default muestra la pestaña Pendientes, agrupada por lote, sin filtro de quincena', () => {
    render(<AprobacionesPage />);
    expect(screen.getAllByRole('button', { name: /^aprobar todo/i })).toHaveLength(2);
    expect(screen.queryByLabelText('Quincena')).not.toBeInTheDocument();
  });

  it('expandir un lote muestra su detalle sin afectar al otro', async () => {
    render(<AprobacionesPage />);
    const detalles = screen.getAllByRole('button', { name: /ver detalle/i });
    await userEvent.click(detalles[0]);
    expect(screen.getAllByRole('button', { name: /^aprobar seleccionados/i })).toHaveLength(1);
  });

  it('la pestaña Aprobados muestra el filtro de quincena y oculta las acciones de aprobar/desaprobar', async () => {
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Aprobados' }));
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^aprobar todo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^desaprobar todo/i })).not.toBeInTheDocument();
  });

  it('la pestaña Rechazados también muestra el filtro de quincena', async () => {
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Rechazados' }));
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
  });

  it('muestra los filtros de contrato/cargador/operario/fecha, con opciones de lo ya cargado', () => {
    render(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por contrato')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'K5' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'K8' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'JEFE CUADRILLA' })).toBeInTheDocument();
  });

  it('con operarioCuil en la URL (ej. link desde Control general), llega con ese filtro ya aplicado', () => {
    searchParamsMock = new URLSearchParams({ operarioCuil: '20111' });
    render(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por operario')).toHaveValue('20111');
  });

  it('un segundo cambio de operarioCuil en la URL (misma página, nuevo link) actualiza el filtro', () => {
    // El useState inicial de filtros solo lee el query param una vez; sin el
    // useEffect que sincroniza, un segundo link con otro operarioCuil quedaría
    // stale (bug original de este fix).
    searchParamsMock = new URLSearchParams({ operarioCuil: '20111' });
    const { rerender } = render(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por operario')).toHaveValue('20111');

    searchParamsMock = new URLSearchParams({ operarioCuil: '20444444444' });
    rerender(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por operario')).toHaveValue('20444444444');
  });
});
