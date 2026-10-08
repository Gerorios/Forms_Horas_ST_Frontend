import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReporteSeguridad } from '@/lib/api/seguridad';

const h = vi.hoisted(() => ({ calificar: vi.fn(), reabrir: vi.fn() }));

vi.mock('@/lib/api/seguridad', () => ({
  useCalificarReporte: () => ({ mutateAsync: h.calificar, isPending: false }),
  useReabrirReporte: () => ({ mutateAsync: h.reabrir, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import { CalificarReporte } from './calificar-reporte';

const HYS1 = '27222222222';
const HYS2 = '27333333333';

function reporte(extra: Partial<ReporteSeguridad> = {}): ReporteSeguridad {
  return {
    id: 7,
    tipo: 'aviso_riesgo',
    estado: 'pendiente',
    fechaReporte: '2026-10-06',
    enviadoEn: '2026-10-07T11:42:00Z',
    autor: { cuil: '20111111111', nombre: 'PEREZ' },
    provincia: { id: 1, nombre: 'Salta' },
    contrato: { id: 2, codigo: 'K2', nombre: 'Op. Domiciliarias' },
    tarea: { id: 3, nombre: 'Conexión' },
    ubicacion: null,
    descripcion: 'Zanja sin vallar',
    naturaleza: { id: 4, nombre: 'Condición peligrosa' },
    motivoParalizacion: null,
    controlRiesgo: 'Vallé',
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
  };
}

describe('CalificarReporte', () => {
  beforeEach(() => {
    h.calificar.mockReset().mockResolvedValue({});
    h.reabrir.mockReset().mockResolvedValue({});
  });

  it('aprobar manda el puntaje elegido', async () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    await userEvent.click(screen.getByRole('radio', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar con +7' }));
    expect(h.calificar).toHaveBeenCalledWith({ id: 7, input: { decision: 'aprobar', puntaje: 7 } });
  });

  it('sin puntaje no se puede aprobar', () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    expect(screen.getByRole('button', { name: 'Elegí un puntaje' })).toBeDisabled();
  });

  it('desaprobar exige un comentario para el autor', async () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    await userEvent.click(screen.getByRole('button', { name: 'Desaprobar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('explicarle al autor por qué');
    expect(h.calificar).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Comentario para el autor/), 'Solo avisaste, no gestionaste');
    await userEvent.click(screen.getByRole('button', { name: 'Desaprobar' }));
    expect(h.calificar).toHaveBeenCalledWith({
      id: 7,
      input: { decision: 'desaprobar', comentario: 'Solo avisaste, no gestionaste' },
    });
  });

  it('HyS no califica su propio reporte', () => {
    render(<CalificarReporte reporte={reporte({ autor: { cuil: HYS1, nombre: 'HYS' } })} miCuil={HYS1} />);
    expect(screen.getByRole('note')).toHaveTextContent('otra persona de HyS');
    expect(screen.queryByRole('button', { name: 'Desaprobar' })).not.toBeInTheDocument();
  });

  it('la otra persona de HyS sí', () => {
    render(<CalificarReporte reporte={reporte({ autor: { cuil: HYS1, nombre: 'HYS' } })} miCuil={HYS2} />);
    expect(screen.getByRole('button', { name: 'Desaprobar' })).toBeInTheDocument();
  });

  it('la inspección la aprueba su autora y el puntaje se resta', async () => {
    render(<CalificarReporte reporte={reporte({ tipo: 'inspeccion', autor: { cuil: HYS1, nombre: 'HYS' } })} miCuil={HYS1} />);
    // Se ve como una quita: título en rojo, escala con signo menos.
    expect(screen.getByText('Quitar puntos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '−6' }));
    expect(screen.getByRole('button', { name: 'Restar 6 a cada persona' })).toBeEnabled();
  });

  it('un calificado se puede reabrir', async () => {
    render(<CalificarReporte reporte={reporte({ estado: 'aprobado', puntaje: 8 })} miCuil={HYS1} />);
    await userEvent.click(screen.getByRole('button', { name: /Reabrir/ }));
    expect(h.reabrir).toHaveBeenCalledWith(7);
  });

  it('un pendiente no muestra Reabrir', () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    expect(screen.queryByRole('button', { name: /Reabrir/ })).not.toBeInTheDocument();
  });
});
