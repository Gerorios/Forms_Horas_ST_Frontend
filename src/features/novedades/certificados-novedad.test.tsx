import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Novedad, NovedadAdjunto } from '@/types/domain';

const agregar = vi.fn().mockResolvedValue({});
const quitar = vi.fn().mockResolvedValue({});
const abrir = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/api/novedades', () => ({
  useAgregarCertificado: () => ({ mutateAsync: agregar, isPending: false }),
  useQuitarCertificado: () => ({ mutateAsync: quitar, isPending: false }),
  abrirAdjuntoNovedad: (id: number, adjuntoId: number) => abrir(id, adjuntoId),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), promise: vi.fn() } }));

import { CertificadosNovedad } from './certificados-novedad';

const SUPERVISOR = '20111111111';
const OTRO = '20999999999';

function adj(overrides: Partial<NovedadAdjunto> = {}): NovedadAdjunto {
  return {
    id: 7,
    mimetype: 'application/pdf',
    subidoPorCuil: SUPERVISOR,
    subidoPor: 'ALMADA RUBEN',
    subidoEn: '2026-09-08T13:42:00.000Z',
    ...overrides,
  };
}

function nov(overrides: Partial<Novedad> = {}): Novedad {
  return {
    id: 1,
    operarioCuil: '20222222222',
    tipoNovedadId: 5,
    fechaInicio: '2026-09-04',
    fechaFin: null,
    justificacionTexto: 'permiso para ir al médico',
    descargoHys: null,
    pierdePresentismoHys: null,
    adjuntos: [],
    certificadoPosteriorAResolucion: false,
    estadoHys: 'pendiente',
    operario: { cuil: '20222222222', apellido_nombre: 'QUIROGA JAVIER', legajo: 1842 },
    tipoNovedad: { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
    cargadoPor: { cuil: SUPERVISOR, nombre: 'ALMADA RUBEN' },
    estado: 'activa',
    motivoAnulacion: null,
    anuladaPorCuil: null,
    anuladaEn: null,
    createdAt: '2026-09-04T09:00:00.000Z',
    ...overrides,
  };
}

function montar(novedad: Novedad, cuil = SUPERVISOR, rol = 'Supervisor') {
  return render(<CertificadosNovedad novedad={novedad} cuilUsuario={cuil} rolUsuario={rol} />);
}

const archivo = (nombre: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], nombre, { type });

describe('CertificadosNovedad', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sube el certificado que llegó después de cargada la novedad', async () => {
    montar(nov());
    await userEvent.upload(
      screen.getByLabelText('Agregar certificado'),
      archivo('cert.pdf', 'application/pdf', 1024),
    );
    await waitFor(() => expect(agregar).toHaveBeenCalledTimes(1));
    expect(agregar.mock.calls[0][0].id).toBe(1);
    expect(agregar.mock.calls[0][0].archivo.name).toBe('cert.pdf');
  });

  it('muestra quién subió cada certificado y cuándo', () => {
    montar(nov({ adjuntos: [adj()] }));
    expect(screen.getByText(/ALMADA RUBEN/)).toBeInTheDocument();
    expect(screen.getByText(/08\/09\/2026/)).toBeInTheDocument();
  });

  it('abre el certificado que se clickea', async () => {
    montar(nov({ adjuntos: [adj({ id: 3 })] }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver certificado' }));
    await waitFor(() => expect(abrir).toHaveBeenCalledWith(1, 3));
  });

  // --- Validación previa (mismo criterio que AdjuntoInput) ----------------

  it('rechaza un tipo no permitido sin llamar al backend', () => {
    montar(nov());
    const input = screen.getByLabelText('Agregar certificado') as HTMLInputElement;
    // `accept` es solo un filtro del diálogo del sistema y se puede saltear.
    fireEvent.change(input, { target: { files: [archivo('a.docx', 'application/msword', 10)] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(agregar).not.toHaveBeenCalled();
  });

  it('rechaza un archivo de más de 10 MB sin llamar al backend', () => {
    montar(nov());
    const input = screen.getByLabelText('Agregar certificado') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [archivo('grande.pdf', 'application/pdf', 11 * 1024 * 1024)] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/máximo es 10 MB/);
    expect(agregar).not.toHaveBeenCalled();
  });

  // --- Tope ---------------------------------------------------------------

  it('con 3 certificados deshabilita agregar y explica por qué', () => {
    montar(nov({ adjuntos: [adj(), adj({ id: 8 }), adj({ id: 9 })] }));
    expect(screen.getByRole('button', { name: '+ Agregar certificado' })).toBeDisabled();
    expect(screen.getByText(/máximo de 3 certificados/)).toBeInTheDocument();
  });

  it('muestra el contador de certificados', () => {
    montar(nov({ adjuntos: [adj(), adj({ id: 8 })] }));
    expect(screen.getByText('2 de 3')).toBeInTheDocument();
  });

  // --- Quién puede quitar --------------------------------------------------

  it('el supervisor puede quitar el certificado que subió él', async () => {
    montar(nov({ adjuntos: [adj()] }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(quitar).toHaveBeenCalledWith({ id: 1, adjuntoId: 7 }));
  });

  it('el supervisor NO puede quitar el certificado que subió otro', () => {
    montar(nov({ adjuntos: [adj({ subidoPorCuil: OTRO })] }));
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('HyS puede quitar cualquiera mientras no esté resuelta', () => {
    montar(nov({ adjuntos: [adj({ subidoPorCuil: OTRO })] }), '20666666666', 'HyS');
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
  });

  /** Resuelta = la prueba que respalda la decisión de HyS queda congelada. */
  it('en una novedad ya resuelta nadie puede quitar', () => {
    montar(nov({ estadoHys: 'aprobada', adjuntos: [adj()] }));
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
    expect(screen.getByTitle(/respaldo de esa decisión/)).toBeInTheDocument();
  });

  /** Pero SÍ se puede seguir sumando: el alta médica suele llegar después. */
  it('en una novedad ya resuelta todavía se puede agregar', () => {
    montar(nov({ estadoHys: 'aprobada', adjuntos: [adj()] }));
    expect(screen.getByRole('button', { name: '+ Agregar certificado' })).toBeEnabled();
  });

  // --- Anulada ------------------------------------------------------------

  it('una novedad anulada no acepta certificados', () => {
    montar(nov({ estado: 'anulada', adjuntos: [adj()] }));
    expect(screen.queryByRole('button', { name: '+ Agregar certificado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  // --- Aviso de certificado posterior -------------------------------------

  it('marca el último certificado como posterior a la resolución', () => {
    montar(
      nov({
        estadoHys: 'aprobada',
        certificadoPosteriorAResolucion: true,
        adjuntos: [adj(), adj({ id: 8 })],
      }),
    );
    expect(screen.getByText(/posterior a la resolución/)).toBeInTheDocument();
  });

  it('sin aviso no marca ningún certificado', () => {
    montar(nov({ estadoHys: 'aprobada', adjuntos: [adj()] }));
    expect(screen.queryByText(/posterior a la resolución/)).not.toBeInTheDocument();
  });

  it('sin certificados muestra un guion', () => {
    montar(nov());
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
