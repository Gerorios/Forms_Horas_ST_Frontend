import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const h = vi.hoisted(() => ({
  perfil: { rol: { nombre: 'Supervisor' }, tiposNovedadHabilitados: [] } as {
    rol: { nombre: string };
    tiposNovedadHabilitados: { tipoNovedad: { id: number; nombre: string } }[];
  },
}));

vi.mock('@/lib/api/novedades', () => ({
  useTiposNovedad: () => ({
    data: [
      { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
      { id: 4, nombre: 'Guardia Pasiva', requiereAprobacionHys: false },
    ],
  }),
  useCrearNovedad: () => ({ mutateAsync: crear, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({
    data: [
      { cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 1, cargo: 'OF' },
      { cuil: '20170', apellido_nombre: 'PEREZ', legajo: 2, cargo: 'OF' },
    ],
  }),
}));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: h.perfil }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));

import { NuevaNovedadForm } from './nueva-novedad-form';

async function completarCamposObligatorios() {
  await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
  await userEvent.click(await screen.findByText(/GOMEZ/));
  await userEvent.selectOptions(screen.getByLabelText('Tipo'), '5');
  await userEvent.type(screen.getByLabelText('Fecha inicio'), '2026-07-10');
}

describe('NuevaNovedadForm', () => {
  beforeEach(() => {
    crear.mockClear();
    h.perfil = { rol: { nombre: 'Supervisor' }, tiposNovedadHabilitados: [] };
  });

  it('envía un FormData (multipart) con los campos básicos', async () => {
    render(<NuevaNovedadForm onCreada={vi.fn()} />);
    await completarCamposObligatorios();
    await userEvent.click(screen.getByRole('button', { name: /cargar novedad/i }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    const form = crear.mock.calls[0][0] as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('operarioCuil')).toBe('20169');
    expect(form.get('tipoNovedadId')).toBe('5');
    expect(form.get('fechaInicio')).toBe('2026-07-10');
    expect(form.has('adjunto')).toBe(false);
  });

  it('muestra el input de certificado como opcional', () => {
    render(<NuevaNovedadForm onCreada={vi.fn()} />);
    expect(screen.getByText('Certificado (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument();
  });

  it('adjunta el archivo elegido al FormData enviado', async () => {
    render(<NuevaNovedadForm onCreada={vi.fn()} />);
    await completarCamposObligatorios();

    const archivo = new File(['contenido'], 'certificado.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText('Certificado (opcional)') as HTMLInputElement;
    await userEvent.upload(input, archivo);
    expect(screen.getByText('certificado.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar archivo' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cargar novedad/i }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    const form = crear.mock.calls[0][0] as FormData;
    const enviado = form.get('adjunto') as File;
    expect(enviado).toBeInstanceOf(File);
    expect(enviado.name).toBe('certificado.pdf');
  });

  it('no manda fechaFin/justificacionTexto al FormData si quedaron vacíos', async () => {
    render(<NuevaNovedadForm onCreada={vi.fn()} />);
    await completarCamposObligatorios();
    await userEvent.click(screen.getByRole('button', { name: /cargar novedad/i }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    const form = crear.mock.calls[0][0] as FormData;
    expect(form.has('fechaFin')).toBe(false);
    expect(form.has('justificacionTexto')).toBe(false);
  });

  describe('Guardia Pasiva — carga para varios operarios', () => {
    async function elegirGuardiaPasivaConDosOperarios() {
      await userEvent.selectOptions(screen.getByLabelText('Tipo'), '4');
      await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
      await userEvent.click(await screen.findByText(/GOMEZ/));
      await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'perez');
      await userEvent.click(await screen.findByText(/PEREZ/));
      await userEvent.type(screen.getByLabelText('Fecha inicio'), '2026-08-28');
    }

    it('crea una novedad independiente por cada operario elegido', async () => {
      render(<NuevaNovedadForm onCreada={vi.fn()} />);
      await elegirGuardiaPasivaConDosOperarios();
      await userEvent.click(screen.getByRole('button', { name: /cargar a 2 operarios/i }));

      await waitFor(() => expect(crear).toHaveBeenCalledTimes(2));
      const cuils = crear.mock.calls.map((c) => (c[0] as FormData).get('operarioCuil'));
      expect(cuils.sort()).toEqual(['20169', '20170']);
      for (const call of crear.mock.calls) {
        const form = call[0] as FormData;
        expect(form.get('tipoNovedadId')).toBe('4');
        expect(form.get('fechaInicio')).toBe('2026-08-28');
      }
    });

    it('no muestra el input de adjunto', async () => {
      render(<NuevaNovedadForm onCreada={vi.fn()} />);
      await userEvent.selectOptions(screen.getByLabelText('Tipo'), '4');
      expect(screen.queryByText('Certificado (opcional)')).not.toBeInTheDocument();
    });

    it('al cambiar a otro tipo, la selección de operarios vuelve a uno solo', async () => {
      render(<NuevaNovedadForm onCreada={vi.fn()} />);
      await elegirGuardiaPasivaConDosOperarios();
      expect(screen.getAllByRole('button', { name: /^Quitar /i })).toHaveLength(2);

      await userEvent.selectOptions(screen.getByLabelText('Tipo'), '5');
      expect(screen.getAllByRole('button', { name: /^Quitar /i })).toHaveLength(1);
      expect(screen.getByText(/PEREZ/)).toBeInTheDocument();
    });
  });
});
