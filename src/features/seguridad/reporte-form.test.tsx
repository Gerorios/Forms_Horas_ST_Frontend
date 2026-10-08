import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Borrador } from './borrador';

const h = vi.hoisted(() => ({
  puedeInspeccionar: false,
  ubicacion: null as null | { latitud: number; longitud: number; errorMetros: number },
  crear: vi.fn(),
  subirFoto: vi.fn(),
  borrador: null as Borrador | null,
  guardarBorrador: vi.fn(),
  borrarBorrador: vi.fn(),
  ultimoLugar: null as null | { provinciaId: number; contratoId: number; tareaId: number },
  guardarUltimoLugar: vi.fn(),
  quitarFoto: vi.fn(),
}));

vi.mock('./captura-foto', () => ({
  obtenerUbicacion: async () => h.ubicacion,
  capturar: async (_archivo: File, grupo: 'riesgo' | 'control') => ({
    grupo,
    origen: 'galeria',
    blob: new Blob(['jpg'], { type: 'image/jpeg' }),
    ubicacion: null,
  }),
}));
vi.mock('./borrador', () => ({
  leerBorrador: async () => h.borrador,
  guardarBorrador: h.guardarBorrador,
  borrarBorrador: h.borrarBorrador,
  tieneContenido: (c: { tipo: unknown }) => c.tipo != null,
  leerUltimoLugar: () => h.ultimoLugar,
  guardarUltimoLugar: h.guardarUltimoLugar,
}));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: { cuil: '20111', rol: { nombre: 'Operario' } } }) }));
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
  useQuitarFoto: () => ({ mutateAsync: h.quitarFoto, isPending: false }),
  useInvalidarSeguridad: () => vi.fn(),
  subirFoto: h.subirFoto,
  urlFoto: (r: number, f: number) => `/seguridad/reportes/${r}/fotos/${f}`,
}));
vi.mock('@/lib/api/empleados', () => ({ useBuscarEmpleados: () => ({ data: [] }) }));
vi.mock('@/lib/api/client', () => ({ api: { get: async () => ({ data: new Blob(['jpg'], { type: 'image/jpeg' }) }) } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn(), promise: vi.fn() } }));

import { ReporteForm } from './reporte-form';

beforeAll(() => {
  // jsdom no implementa object URLs (preview de las fotos).
  URL.createObjectURL = vi.fn(() => 'blob:foto');
  URL.revokeObjectURL = vi.fn();
});

async function completarComunes() {
  await userEvent.selectOptions(screen.getByLabelText('Provincia donde pasó'), '1');
  await userEvent.selectOptions(screen.getByLabelText('Contrato'), '2');
  await userEvent.selectOptions(screen.getByLabelText('Tarea'), '30');
  await userEvent.type(screen.getByLabelText('Contá qué viste'), 'Zanja sin vallar');
}

async function avisoCompleto() {
  await userEvent.click(screen.getByRole('radio', { name: 'Aviso de riesgo' }));
  await completarComunes();
  await userEvent.selectOptions(screen.getByLabelText('Naturaleza del riesgo'), '5');
  await userEvent.type(screen.getByLabelText(/controlar el riesgo/), 'Vallé con cinta y conos');
}

const BORRADOR: Borrador = {
  guardadoEn: '2026-10-08T14:32:00.000Z',
  reporteId: null,
  fotos: [],
  campos: {
    tipo: 'aviso_riesgo',
    fechaReporte: '2026-10-08',
    provinciaId: 1,
    contratoId: 2,
    tareaId: 30,
    ubicacion: '',
    naturalezaId: 5,
    motivoId: null,
    descripcion: 'Cable pelado en el tablero',
    controlRiesgo: '',
    involucrados: [],
    punto: null,
  },
};

describe('ReporteForm', () => {
  beforeEach(() => {
    h.puedeInspeccionar = false;
    h.ubicacion = null;
    h.borrador = null;
    h.crear.mockReset().mockResolvedValue({ id: 99 });
    h.subirFoto.mockReset().mockResolvedValue({});
    h.guardarBorrador.mockReset();
    h.borrarBorrador.mockReset();
    h.ultimoLugar = null;
    h.guardarUltimoLugar.mockReset();
    h.quitarFoto.mockReset().mockResolvedValue({});
  });

  it('solo quien puede inspeccionar (HyS o inspector habilitado) ve el tipo Inspección', () => {
    const { unmount } = render(<ReporteForm onListo={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'Inspección de seguridad' })).not.toBeInTheDocument();
    unmount();
    h.puedeInspeccionar = true;
    render(<ReporteForm onListo={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Inspección de seguridad' })).toBeInTheDocument();
  });

  it('?tipo=inspeccion llega preseleccionado solo si el usuario puede inspeccionar', () => {
    const { unmount } = render(<ReporteForm tipoInicial="inspeccion" onListo={vi.fn()} />);
    expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    unmount();
    h.puedeInspeccionar = true;
    render(<ReporteForm tipoInicial="inspeccion" onListo={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Inspección de seguridad' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Personas observadas')).toBeInTheDocument();
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

  it('no envía si falta algo: dice qué, marca el campo y lleva el foco al primero', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Aviso de riesgo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Falta lo que hiciste para controlar el riesgo');
    const provincia = screen.getByLabelText(/Provincia donde pasó/);
    expect(provincia).toHaveAttribute('aria-invalid', 'true');
    expect(provincia).toHaveAccessibleDescription('Falta la provincia');
    expect(provincia).toHaveFocus();
    expect(h.crear).not.toHaveBeenCalled();
  });

  it('un aviso completo se envía con lo que pide su tipo y borra el borrador', async () => {
    const onListo = vi.fn();
    render(<ReporteForm onListo={onListo} />);
    await avisoCompleto();
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
    expect(h.borrarBorrador).toHaveBeenCalledWith('20111');
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
    expect(screen.getByRole('button', { name: 'Tomar mi ubicación' })).toHaveFocus();
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

  describe('borrador local', () => {
    it('si hay un reporte sin enviar, ofrece seguir con ese y lo restaura', async () => {
      h.borrador = BORRADOR;
      render(<ReporteForm onListo={vi.fn()} />);
      expect(await screen.findByText('Tenés un reporte sin enviar')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Seguir con ese' }));
      expect(screen.queryByText('Tenés un reporte sin enviar')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Aviso de riesgo' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText('Contá qué viste')).toHaveValue('Cable pelado en el tablero');
    });

    it('descartar lo borra y deja el formulario vacío', async () => {
      h.borrador = BORRADOR;
      render(<ReporteForm onListo={vi.fn()} />);
      await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
      expect(h.borrarBorrador).toHaveBeenCalledWith('20111');
      expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    });

    it('guarda lo que se va cargando', async () => {
      render(<ReporteForm onListo={vi.fn()} />);
      await userEvent.click(screen.getByRole('radio', { name: 'Incidente' }));
      await waitFor(() => expect(h.guardarBorrador).toHaveBeenCalled(), { timeout: 2000 });
      expect(h.guardarBorrador.mock.calls.at(-1)![1]).toMatchObject({ campos: { tipo: 'incidente' }, reporteId: null });
    });
  });

  it('una foto que no se sube no se pierde: el reporte queda creado y se reintenta esa foto', async () => {
    const onListo = vi.fn();
    render(<ReporteForm onListo={onListo} />);
    await avisoCompleto();
    await userEvent.upload(
      screen.getByLabelText('Fotos de lo que viste: elegir de la galería'),
      new File(['x'], 'riesgo.jpg', { type: 'image/jpeg' }),
    );
    h.subirFoto.mockRejectedValueOnce(new Error('sin señal'));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText(/El reporte ya se envió/)).toBeInTheDocument();
    expect(onListo).not.toHaveBeenCalled();
    expect(h.crear).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'No se subió · Reintentar' }));
    await waitFor(() => expect(onListo).toHaveBeenCalled());
    expect(h.subirFoto).toHaveBeenCalledTimes(2);
    expect(h.subirFoto).toHaveBeenLastCalledWith(99, expect.objectContaining({ grupo: 'riesgo' }));
    // Nunca se crea un segundo reporte.
    expect(h.crear).toHaveBeenCalledTimes(1);
  });

  it('el tipo es un grupo de opciones: una sola parada de Tab y flechas que eligen', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
    radios[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Incidente' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Incidente' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    // Da la vuelta: del primero pasa al último.
    expect(screen.getByRole('radio', { name: 'Propuesta de mejora' })).toHaveAttribute('aria-checked', 'true');
  });

  it('nombrar involucrados aclara que no les resta puntos', async () => {
    render(<ReporteForm onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Aviso de riesgo' }));
    expect(screen.getByRole('combobox', { name: /Personas involucradas/ })).toHaveAccessibleDescription(
      /Nombrarlas no les resta puntos/,
    );
  });

  it('precarga provincia, contrato y tarea del último reporte; al enviar los recuerda y devuelve el id para el recibo', async () => {
    h.ultimoLugar = { provinciaId: 1, contratoId: 2, tareaId: 30 };
    const onListo = vi.fn();
    render(<ReporteForm onListo={onListo} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Aviso de riesgo' }));
    expect(await screen.findByText(/precargados de tu último reporte/)).toBeInTheDocument();
    expect(screen.getByLabelText('Provincia donde pasó')).toHaveValue('1');
    expect(screen.getByLabelText('Contrato')).toHaveValue('2');
    expect(screen.getByLabelText('Tarea')).toHaveValue('30');
    expect(screen.getByLabelText('Contrato')).toHaveAccessibleDescription(/elegí OTROS/);

    await userEvent.type(screen.getByLabelText('Contá qué viste'), 'Zanja');
    await userEvent.selectOptions(screen.getByLabelText('Naturaleza del riesgo'), '5');
    await userEvent.type(screen.getByLabelText(/controlar el riesgo/), 'Vallé');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    await waitFor(() => expect(onListo).toHaveBeenCalledWith(99));
    expect(h.guardarUltimoLugar).toHaveBeenCalledWith('20111', { provinciaId: 1, contratoId: 2, tareaId: 30 });
  });

  it('quitar una foto ya subida pide confirmación', async () => {
    const inicial = {
      id: 7,
      tipo: 'aviso_riesgo',
      estado: 'pendiente',
      fechaReporte: '2026-10-06',
      enviadoEn: '2026-10-07T11:42:00Z',
      autor: { cuil: '20111', nombre: 'PEREZ' },
      provincia: { id: 1, nombre: 'Salta' },
      contrato: { id: 2, codigo: 'K2', nombre: 'K2' },
      tarea: { id: 30, nombre: 'Conexión' },
      ubicacion: null,
      descripcion: 'Zanja',
      naturaleza: { id: 5, nombre: 'E.P.P' },
      motivoParalizacion: null,
      controlRiesgo: 'Vallé',
      involucrados: [],
      fotos: [{ id: 41, grupo: 'riesgo', origen: 'galeria', subidoEn: '2026-10-07T11:42:00Z', conUbicacion: false }],
      punto: null,
      puntaje: null,
      comentarioHys: null,
      calificadoPor: null,
      calificadoEn: null,
      motivoAnulacion: null,
      alarma: false,
    } as const;
    render(<ReporteForm inicial={inicial as never} onListo={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar fotos de lo que viste 1' }));
    expect(h.quitarFoto).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Quitar foto' }));
    await waitFor(() => expect(h.quitarFoto).toHaveBeenCalledWith({ reporteId: 7, fotoId: 41 }));
  });
});
