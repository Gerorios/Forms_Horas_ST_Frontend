import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resolverLote = vi.fn().mockResolvedValue({});
const reabrirRegistro = vi.fn().mockResolvedValue({});
const corregirLote = vi.fn().mockResolvedValue({});

// Fecha de hoy → cae siempre en la quincena en curso, que es el default del filtro.
const HOY = new Date().toISOString().slice(0, 10);

function fila(
  id: number,
  loteId: string,
  accionable: boolean,
  estado = 'pendiente',
  codigo = 'K5',
  operarioCuil = '20111',
  operarioNombre = 'PEREZ JUAN',
  fecha = HOY,
) {
  return {
    id, loteId, fecha, horas: '8', estado, alertaHoras: false, motivoDesaprobacion: null,
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
    // Pendiente VIEJO, de otra quincena: oculto por el filtro default, pero
    // debe dispararse el aviso de rescate.
    fila(7, 'lote-z', true, 'pendiente', 'K5', '20555555555', 'VIEJO PEDRO', '2026-01-05'),
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

  it('por default muestra Pendientes CON filtro de quincena (los de otras quincenas quedan ocultos)', () => {
    render(<AprobacionesPage />);
    expect(screen.getAllByRole('button', { name: /^aprobar todo/i })).toHaveLength(2);
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
    expect(screen.queryByText('VIEJO PEDRO')).not.toBeInTheDocument();
  });

  it('en Pendientes avisa cuántos pendientes hay fuera de la quincena y el aviso los muestra al clickearlo', async () => {
    render(<AprobacionesPage />);
    const aviso = screen.getByRole('button', { name: /1 pendiente.*otras quincenas/i });
    await userEvent.click(aviso);
    expect(screen.getByText('VIEJO PEDRO')).toBeInTheDocument();
    // Volver al filtro de quincena
    await userEvent.click(screen.getByRole('button', { name: /volver a la quincena/i }));
    expect(screen.queryByText('VIEJO PEDRO')).not.toBeInTheDocument();
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

  it('muestra los filtros de contrato/cargador/operario (sin fecha exacta), con opciones de lo ya cargado', async () => {
    render(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por contrato')).toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar por fecha')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    expect(screen.getByLabelText('K5')).toBeInTheDocument();
    expect(screen.getByLabelText('K8')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Filtrar por quién cargó'));
    expect(screen.getByLabelText('JEFE CUADRILLA')).toBeInTheDocument();
  });

  it('con operarioCuil en la URL (ej. link desde Control general), llega con ese filtro ya aplicado', () => {
    searchParamsMock = new URLSearchParams({ operarioCuil: '20111' });
    render(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por operario')).toHaveTextContent('Operario (1)');
  });

  it('un segundo cambio de operarioCuil en la URL (misma página, nuevo link) actualiza el filtro', () => {
    // El useState inicial de filtros solo lee el query param una vez; sin el
    // useEffect que sincroniza, un segundo link con otro operarioCuil quedaría
    // stale (bug original de este fix).
    searchParamsMock = new URLSearchParams({ operarioCuil: '20111' });
    const { rerender } = render(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por operario')).toHaveTextContent('Operario (1)');

    searchParamsMock = new URLSearchParams({ operarioCuil: '20444444444' });
    rerender(<AprobacionesPage />);
    expect(screen.getByLabelText('Filtrar por operario')).toHaveTextContent('Operario (1)');
  });

  it('con operarioCuil en la URL, ese operario queda tildado en el desplegable', async () => {
    searchParamsMock = new URLSearchParams({ operarioCuil: '20111' });
    render(<AprobacionesPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por operario'));
    expect(screen.getByLabelText('PEREZ JUAN')).toBeChecked();
  });

  it('tildar un contrato filtra los lotes visibles en cliente', async () => {
    render(<AprobacionesPage />);
    expect(screen.getAllByRole('button', { name: /^aprobar todo/i })).toHaveLength(2);
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    await userEvent.click(screen.getByLabelText('K8'));
    // Solo lote-a tiene una fila con contrato K8; lote-b (K5) desaparece.
    expect(screen.getAllByRole('button', { name: /^aprobar todo/i })).toHaveLength(1);
  });
});
