import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReporteSeguridad } from '@/lib/api/seguridad';

const h = vi.hoisted(() => ({
  reportes: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
  puntos: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock('@/lib/api/seguridad', () => ({
  useMisReportes: () => h.reportes,
  useMisPuntos: () => h.puntos,
  useAnularReporte: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import MisReportesPage from './page';

const reporte = (id: number, extra: Partial<ReporteSeguridad> = {}) =>
  ({
    id,
    tipo: 'aviso_riesgo',
    estado: 'pendiente',
    fechaReporte: '2026-10-06',
    enviadoEn: '2026-10-07T11:42:00Z',
    autor: { cuil: '20111', nombre: 'PEREZ' },
    provincia: { id: 1, nombre: 'Salta' },
    contrato: { id: 2, codigo: 'K2', nombre: 'K2' },
    tarea: { id: 3, nombre: 'Conexión' },
    ubicacion: null,
    descripcion: `Reporte ${id}`,
    naturaleza: null,
    motivoParalizacion: null,
    controlRiesgo: null,
    involucrados: [],
    fotos: [],
    punto: null,
    puntaje: null,
    comentarioHys: null,
    calificadoPor: null,
    calificadoEn: null,
    motivoAnulacion: null,
    alarma: false,
    ...extra,
  }) as ReporteSeguridad;

const PUNTOS = {
  desde: '2026-01-01',
  hasta: '2026-10-08',
  puntos: { total: -4, mas: 2, menos: 6 },
  posicion: { puesto: 5, de: 9 },
  delante: [],
  inspecciones: [],
  movimientos: [],
};

describe('Mis reportes y puntos', () => {
  beforeEach(() => {
    h.reportes = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    h.puntos = { data: PUNTOS, isLoading: false, isError: false, refetch: vi.fn() };
  });

  it('un error de carga no se ve como "todavía no enviaste": dice qué pasó y deja reintentar', async () => {
    h.reportes = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    h.puntos = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    render(<MisReportesPage />);
    expect(screen.queryByText(/Todavía no enviaste/)).not.toBeInTheDocument();
    expect(screen.getByText('No pudimos cargar tus reportes.')).toBeInTheDocument();
    expect(screen.getByText('No pudimos cargar tus puntos.')).toBeInTheDocument();
    const [reintentarPuntos, reintentarReportes] = screen.getAllByRole('button', { name: 'Reintentar' });
    await userEvent.click(reintentarReportes);
    await userEvent.click(reintentarPuntos);
    expect(h.reportes.refetch).toHaveBeenCalled();
    expect(h.puntos.refetch).toHaveBeenCalled();
  });

  it('un total negativo no se pinta con el dorado de logro', () => {
    render(<MisReportesPage />);
    expect(screen.getByText('−4')).not.toHaveClass('text-brand');
  });

  it('una inspección aprobada propia muestra sus puntos con signo menos, como en el detalle', () => {
    h.reportes = { ...h.reportes, data: [reporte(1, { tipo: 'inspeccion', estado: 'aprobado', puntaje: 5 })] };
    render(<MisReportesPage />);
    expect(screen.getByText('−5')).toBeInTheDocument();
  });

  it('con muchos reportes muestra de a 20 y "Ver más"', async () => {
    h.reportes = { ...h.reportes, data: Array.from({ length: 23 }, (_, i) => reporte(i + 1)) };
    render(<MisReportesPage />);
    expect(screen.getAllByText(/^Reporte \d+$/)).toHaveLength(20);
    await userEvent.click(screen.getByRole('button', { name: 'Ver más (3 reportes)' }));
    expect(screen.getAllByText(/^Reporte \d+$/)).toHaveLength(23);
  });

  it('explica cómo se ganan los puntos', () => {
    render(<MisReportesPage />);
    expect(screen.getByText('¿Cómo se ganan puntos?')).toBeInTheDocument();
    expect(screen.getByText(/Avisarle a otro no suma/)).toBeInTheDocument();
  });
});
