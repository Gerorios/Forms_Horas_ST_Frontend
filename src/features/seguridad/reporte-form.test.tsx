import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({
  puedeInspeccionar: false,
  ubicacion: null as null | { latitud: number; longitud: number; errorMetros: number },
  crear: vi.fn(),
  subirFoto: vi.fn(),
}));

vi.mock('./captura-foto', () => ({ obtenerUbicacion: async () => h.ubicacion, capturar: vi.fn() }));
vi.mock('@/lib/api/catalogos', () => ({
  useProvincias: () => ({ data: [{ id: 1, nombre: 'Salta' }] }),
  useTareas: (contratoId: number | null) => ({ data: contratoId ? [{ id: 30, nombre: 'Conexión' }] : [] }),
}));
vi.mock('@/lib/api/seguridad', () => ({
  useCatalogosSeguridad: () => ({
    data: {
      naturalezas: [{ id: 5, nombre: 'E.P.P' }],
      motivosParalizacion: [{ id: 7, nombre: 'Viento / clima' }],
      contratos: [{ id: 2, codigo: 'K2', nombre: 'Operaciones Domiciliarias' }],
      puedeInspeccionar: h.puedeInspeccionar,
    },
  }),
  useCorregirReporte: () => ({ mutateAsync: vi.fn() }),
  useCrearReporte: () => ({ mutateAsync: h.crear }),
  useEditarReporte: () => ({ mutateAsync: vi.fn() }),
  useQuitarFoto: () => ({ mutateAsync: vi.fn() }),
  useInvalidarSeguridad: () => vi.fn(),
  subirFoto: h.subirFoto,
}));
vi.mock('@/lib/api/empleados', () => ({ useBuscarEmpleados: () => ({ data: [] }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn(), promise: vi.fn() } }));

import { ReporteForm } from './reporte-form';

async function completarComunes() {
  await userEvent.selectOptions(screen.getByLabelText('Provincia donde pasó'), '1');
  await userEvent.selectOptions(screen.getByLabelText('Contrato'), '2');
  await userEvent.selectOptions(screen.getByLabelText('Tarea'), '30');
  await userEvent.type(screen.getByLabelText('Contá qué viste'), 'Zanja sin vallar');
}

describe('ReporteForm', () => {
  beforeEach(() => {
    h.puedeInspeccionar = false;
    h.ubicacion = null;
    h.crear.mockReset().mockResolvedValue({ id: 99 });
    h.subirFoto.mockReset();
  });

  it('solo quien puede inspeccionar (HyS o inspector habilitado) ve el tipo Inspección', () => {
    const { unmount } = render(<ReporteForm onListo={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'Inspección de seguridad' })).not.toBeInTheDocument();
    unmount();
    h.puedeInspeccionar = true;
    render(<ReporteForm onListo={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Inspección de seguridad' })).toBeInTheDocument();
  });

  it('cada tipo muestra sus campos: la paralización pide motivo, no naturaleza', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Paralización de trabajos' }));
    expect(screen.getByLabelText('¿Por qué se detuvo la tarea?')).toBeInTheDocument();
    expect(screen.queryByLabelText('Naturaleza del riesgo')).not.toBeInTheDocument();
  });

  it('la propuesta de mejora no pide control del riesgo ni fotos del control', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Propuesta de mejora' }));
    expect(screen.queryByLabelText(/controlar el riesgo/)).not.toBeInTheDocument();
    expect(screen.queryByText('Fotos de lo que hiciste')).not.toBeInTheDocument();
  });

  it('no envía si falta algo, y dice qué', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Aviso de riesgo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Falta lo que hiciste para controlar el riesgo');
    expect(h.crear).not.toHaveBeenCalled();
  });

  it('un aviso completo se envía con lo que pide su tipo', async () => {
    const onListo = vi.fn();
    render(<ReporteForm onListo={onListo} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Aviso de riesgo' }));
    await completarComunes();
    await userEvent.selectOptions(screen.getByLabelText('Naturaleza del riesgo'), '5');
    await userEvent.type(screen.getByLabelText(/controlar el riesgo/), 'Vallé con cinta y conos');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    await waitFor(() => expect(onListo).toHaveBeenCalled());
    expect(h.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'aviso_riesgo',
        provinciaId: 1,
        contratoId: 2,
        tareaId: 30,
        naturalezaId: 5,
        descripcion: 'Zanja sin vallar',
        controlRiesgo: 'Vallé con cinta y conos',
        involucrados: [],
      }),
    );
    expect(h.crear.mock.calls[0][0]).not.toHaveProperty('motivoParalizacionId');
  });

  it('la paralización no se envía sin tomar la ubicación; con ubicación, la manda', async () => {
    const onListo = vi.fn();
    render(<ReporteForm onListo={onListo} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Paralización de trabajos' }));
    await completarComunes();
    await userEvent.selectOptions(screen.getByLabelText('¿Por qué se detuvo la tarea?'), '7');
    await userEvent.type(screen.getByLabelText(/controlar el riesgo/), 'Bajamos la cuadrilla');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Falta tomar la ubicación');
    expect(h.crear).not.toHaveBeenCalled();

    h.ubicacion = { latitud: -24.785912, longitud: -65.411646, errorMetros: 8.4 };
    await userEvent.click(screen.getByRole('button', { name: 'Tomar mi ubicación' }));
    expect(await screen.findByText(/Ubicación tomada · ±8 m/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    await waitFor(() => expect(onListo).toHaveBeenCalled());
    expect(h.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'paralizacion', latitud: -24.785912, longitud: -65.411646, errorMetros: 8 }),
    );
  });

  it('la ayuda del control deja claro que avisar a otro no es gestionar', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Incidente' }));
    expect(screen.getByText(/Avisarle a otro no es gestionar/)).toBeInTheDocument();
  });
});
