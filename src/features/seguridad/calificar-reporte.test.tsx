import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('restar en una inspección pide confirmar y nombra a las personas observadas', async () => {
    const insp = reporte({
      tipo: 'inspeccion',
      autor: { cuil: HYS1, nombre: 'HYS' },
      involucrados: [
        { cuil: '20444', nombre: 'GOMEZ LUIS' },
        { cuil: '20555', nombre: 'PAZ ANA' },
      ],
    });
    render(<CalificarReporte reporte={insp} miCuil={HYS1} />);
    await userEvent.click(screen.getByRole('radio', { name: '−5' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restar 5 a cada persona' }));

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Restar 5 puntos a cada persona observada');
    expect(within(dialogo).getByText('GOMEZ LUIS')).toBeInTheDocument();
    expect(within(dialogo).getByText('PAZ ANA')).toBeInTheDocument();
    expect(h.calificar).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restar 5' }));
    expect(h.calificar).toHaveBeenCalledWith({ id: 7, input: { decision: 'aprobar', puntaje: 5 } });
  });

  it('cancelar la confirmación no califica', async () => {
    const insp = reporte({ tipo: 'inspeccion', autor: { cuil: HYS1, nombre: 'HYS' }, involucrados: [{ cuil: '20444', nombre: 'GOMEZ LUIS' }] });
    render(<CalificarReporte reporte={insp} miCuil={HYS1} />);
    await userEvent.click(screen.getByRole('radio', { name: '−3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restar 3 a cada persona' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(h.calificar).not.toHaveBeenCalled();
  });

  it('cambiar el puntaje de un aprobado confirma y nombra al autor', async () => {
    render(<CalificarReporte reporte={reporte({ estado: 'aprobado', puntaje: 8 })} miCuil={HYS1} />);
    await userEvent.click(screen.getByRole('radio', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar con +5' }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Cambiar de +8 a +5');
    expect(within(dialogo).getByText('PEREZ')).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cambiar el puntaje' }));
    expect(h.calificar).toHaveBeenCalledWith({ id: 7, input: { decision: 'aprobar', puntaje: 5 } });
  });

  it('reabrir confirma diciendo qué puntos se quitan y a quién', async () => {
    const onHecho = vi.fn();
    render(<CalificarReporte reporte={reporte({ estado: 'aprobado', puntaje: 8 })} miCuil={HYS1} onHecho={onHecho} />);
    await userEvent.click(screen.getByRole('button', { name: /Reabrir/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Se quitan los +8 puntos');
    expect(within(dialogo).getByText('PEREZ')).toBeInTheDocument();
    expect(h.reabrir).not.toHaveBeenCalled();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }));
    expect(h.reabrir).toHaveBeenCalledWith(7);
    await vi.waitFor(() => expect(onHecho).toHaveBeenCalled());
  });

  it('aprobar por primera vez un reporte común es un clic y avisa para pasar al siguiente', async () => {
    const onHecho = vi.fn();
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} onHecho={onHecho} />);
    await userEvent.click(screen.getByRole('radio', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar con +7' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(onHecho).toHaveBeenCalled());
  });

  it('atajos: un número elige el puntaje, "1" "0" es el 10 y A aprueba', async () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    fireEvent.keyDown(window, { key: '7' });
    expect(screen.getByRole('radio', { name: '7' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '0' });
    expect(screen.getByRole('radio', { name: '10' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(window, { key: 'a' });
    expect(h.calificar).toHaveBeenCalledWith({ id: 7, input: { decision: 'aprobar', puntaje: 10 } });
  });

  it('los atajos no actúan mientras se escribe el comentario', async () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    await userEvent.type(screen.getByLabelText(/Comentario para el autor/), '7a');
    expect(screen.getByRole('radio', { name: '7' })).toHaveAttribute('aria-checked', 'false');
    expect(h.calificar).not.toHaveBeenCalled();
  });

  it('la escala trae la guía de referencia', () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    expect(screen.getByText('bien gestionado')).toBeInTheDocument();
    expect(screen.getByText('ejemplar')).toBeInTheDocument();
  });

  it('un pendiente no muestra Reabrir', () => {
    render(<CalificarReporte reporte={reporte()} miCuil={HYS1} />);
    expect(screen.queryByRole('button', { name: /Reabrir/ })).not.toBeInTheDocument();
  });
});
