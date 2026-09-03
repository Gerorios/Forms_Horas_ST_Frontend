import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FilaPreview, RespuestaPreviewCarga, RespuestaConfirmarCarga } from '@/lib/api/certificaciones';

const usePreviewCarga = vi.fn();
const useConfirmarCarga = vi.fn();
const useProvinciasAnalytics = vi.fn();
const useContratosAnalytics = vi.fn();

vi.mock('@/lib/api/certificaciones', () => ({
  usePreviewCarga: (...args: unknown[]) => usePreviewCarga(...args),
  useConfirmarCarga: (...args: unknown[]) => useConfirmarCarga(...args),
  useProvinciasAnalytics: (...args: unknown[]) => useProvinciasAnalytics(...args),
  useContratosAnalytics: (...args: unknown[]) => useContratosAnalytics(...args),
}));

const useSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  useSession: (...args: unknown[]) => useSession(...args),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), promise: vi.fn((p) => p) } }));

import CargaCertificacionesPage from './page';

function filaBase(overrides: Partial<FilaPreview> = {}): FilaPreview {
  return {
    rowId: 'row-1',
    hoja_origen: 'CERTIF K12',
    archivo_origen: 'archivo.xlsx',
    item_codigo: 'ITEM-01',
    nombre_contrato: null,
    tarea: 'Tarea de prueba',
    contrato: 'K12',
    unidad_medida: 'UN',
    ptos_gasnor: null,
    tipo: null,
    contratista: null,
    provincia: 'Salta',
    region: 'Norte',
    cantidades: '3',
    precio_unitario: '100',
    total_mes: '300',
    observaciones: null,
    fecha: '2026-08-01',
    nro_np: null,
    tiene_error: false,
    fila_excel: 5,
    item_en_maestro: true,
    error_detalle: null,
    contrato_archivo: 'K12',
    contrato_fuente: 'archivo',
    contrato_del_maestro: null,
    excluida: false,
    ...overrides,
  };
}

function previewBase(overrides: Partial<RespuestaPreviewCarga> = {}): RespuestaPreviewCarga {
  return {
    previewId: 'preview-1',
    archivo: 'archivo.xlsx',
    hojas: ['CERTIF K12'],
    periodo: '2026-08',
    resumen: { total: 1, con_error: 0, total_mes: 300, total_declarado: 300 },
    filas: [filaBase()],
    errores: [],
    ...overrides,
  };
}

const preview = vi.fn();
const confirmar = vi.fn();

beforeEach(() => {
  useSession.mockReturnValue({ perfil: { cert: { nivel: 'admin', ks: [], inc: false } } });
  usePreviewCarga.mockReturnValue({ mutateAsync: preview, isPending: false });
  useConfirmarCarga.mockReturnValue({ mutateAsync: confirmar, isPending: false });
  useProvinciasAnalytics.mockReturnValue({ data: ['Salta', 'Jujuy'] });
  useContratosAnalytics.mockReturnValue({ data: ['K6', 'K12'] });
  preview.mockReset();
  confirmar.mockReset();
  push.mockClear();
});

/** Rediseño: "Revisar y cargar" abre el modal de resumen; la carga real se
 * dispara con "Cargar N fila(s)" adentro del modal. */
async function confirmarDesdeModal() {
  await userEvent.click(screen.getByRole('button', { name: /revisar y cargar/i }));
  await userEvent.click(await screen.findByRole('button', { name: /^cargar \d+ filas?$/i }));
}

async function subirArchivo(nombre = 'archivo.xlsx') {
  const file = new File(['contenido'], nombre, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const input = screen.getByLabelText('Archivo');
  await userEvent.upload(input, file);
  await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

describe('CargaCertificacionesPage', () => {
  it('nivel lectura no ve la pantalla (gate)', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'lectura', ks: [], inc: false } } });
    const { container } = render(<CargaCertificacionesPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('nivel admin y carga sí ven la pantalla', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K12'], inc: false } } });
    render(<CargaCertificacionesPage />);
    expect(screen.getByLabelText('Archivo')).toBeInTheDocument();
  });

  it('rechaza un .xls client-side con el mensaje de conversión, sin llamar al preview', async () => {
    render(<CargaCertificacionesPage />);
    const file = new File(['x'], 'archivo.xls', { type: 'application/vnd.ms-excel' });
    await userEvent.upload(screen.getByLabelText('Archivo'), file);
    expect(screen.getByText('Formato .xls no soportado: convertí el archivo a .xlsx.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();
  });

  it('flujo feliz: sube, preselecciona hojas por K (fix B9), edita cantidad y confirma con SOLO las ediciones', async () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K1'], inc: false } } });
    preview.mockResolvedValue(
      previewBase({
        hojas: ['CERTIF K1', 'CERTIF K12'],
        filas: [filaBase({ rowId: 'r1', hoja_origen: 'CERTIF K1', contrato: 'K1', contrato_archivo: 'K1' })],
      }),
    );

    render(<CargaCertificacionesPage />);
    await subirArchivo();

    await waitFor(() => expect(screen.getByText('CERTIF K1')).toBeInTheDocument());
    // B9: el usuario tiene K1 en su claim — "K1" no debe preseleccionar "CERTIF K12" (antes matcheaba por substring).
    const chipK1 = screen.getByRole('button', { name: 'CERTIF K1' });
    const chipK12 = screen.getByRole('button', { name: 'CERTIF K12' });
    expect(chipK1.className).toMatch(/bg-brand\/10/);
    expect(chipK12.className).not.toMatch(/bg-brand\/10/);

    await userEvent.click(screen.getByRole('button', { name: /ver filas/i }));

    await waitFor(() => expect(screen.getByLabelText('Cantidad r1')).toBeInTheDocument());
    const cantidadInput = screen.getByLabelText('Cantidad r1');
    await userEvent.clear(cantidadInput);
    await userEvent.type(cantidadInput, '5');

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 1, omitidas: 0, errores: [] } as RespuestaConfirmarCarga);
    await confirmarDesdeModal();

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith({
        previewId: 'preview-1',
        ediciones: [{ rowId: 'r1', cantidades: '5' }],
      }),
    );
    await waitFor(() => expect(screen.getByText(/1 fila insertada/i)).toBeInTheDocument());
  });

  it('excluir una fila la manda como excluida:true y no cuenta como "a cargar"', async () => {
    preview.mockResolvedValue(previewBase({ filas: [filaBase({ rowId: 'r1' })] }));
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    await waitFor(() => expect(screen.getByTestId('metrica-a-cargar')).toHaveTextContent(/^1$/));
    const checkbox = screen.getByLabelText('Cargar fila 5');
    await userEvent.click(checkbox);

    expect(screen.getByTestId('metrica-excluidas')).toHaveTextContent(/^1$/);
    expect(screen.getByTestId('metrica-a-cargar')).toHaveTextContent(/^0$/);

    // Sin filas a cargar no se puede seguir (paridad con el portal).
    expect(screen.getByRole('button', { name: /revisar y cargar/i })).toBeDisabled();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('badge de reasignación: indicador visible en la fila principal, detalle completo al expandir', async () => {
    preview.mockResolvedValue(
      previewBase({
        filas: [
          filaBase({
            rowId: 'r1',
            contrato: 'K12',
            contrato_archivo: 'K8',
            contrato_fuente: 'maestro',
            contrato_del_maestro: 'K12',
          }),
        ],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    // Indicador visible sin expandir (chip chico con tooltip), sin scroll horizontal.
    const indicador = await screen.findByTitle('Reasignado por el maestro: archivo K8 → K12');
    expect(indicador).toBeInTheDocument();
    expect(screen.queryByText(/archivo: K8 → K12/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /detalle/i }));
    expect(await screen.findByText(/archivo: K8 → K12/)).toBeInTheDocument();
  });

  it('tolera coma decimal es-AR: "5,5" en cantidad se registra normalizado como "5.5" y la fila queda válida', async () => {
    preview.mockResolvedValue(previewBase({ filas: [filaBase({ rowId: 'r1', cantidades: '3', total_mes: '10' })] }));
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    const cantidadInput = await screen.findByLabelText('Cantidad r1');
    await userEvent.clear(cantidadInput);
    await userEvent.type(cantidadInput, '5,5');

    expect(screen.getByTestId('metrica-a-cargar')).toHaveTextContent(/^1$/);

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 1, omitidas: 0, errores: [] });
    await confirmarDesdeModal();
    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith({
        previewId: 'preview-1',
        ediciones: [{ rowId: 'r1', cantidades: '5.5' }],
      }),
    );
  });

  it('deseleccionar una hoja en el paso 2 manda sus filas como excluida:true al confirmar (server-authoritative)', async () => {
    preview.mockResolvedValue(
      previewBase({
        hojas: ['CERTIF K1', 'CERTIF K2'],
        filas: [
          filaBase({ rowId: 'rA', hoja_origen: 'CERTIF K1', contrato: 'K1', contrato_archivo: 'K1' }),
          filaBase({ rowId: 'rB', hoja_origen: 'CERTIF K2', contrato: 'K2', contrato_archivo: 'K2' }),
        ],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();

    // Admin: ambas hojas vienen preseleccionadas — deselecciono la B.
    await waitFor(() => expect(screen.getByRole('button', { name: 'CERTIF K2' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'CERTIF K2' }));
    await userEvent.click(screen.getByRole('button', { name: /ver filas/i }));

    // La vista del paso 3 solo muestra la fila de la hoja seleccionada.
    await waitFor(() => expect(screen.getByLabelText('Cantidad rA')).toBeInTheDocument());
    expect(screen.queryByLabelText('Cantidad rB')).not.toBeInTheDocument();

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 1, omitidas: 0, errores: [] });
    await confirmarDesdeModal();

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith({
        previewId: 'preview-1',
        ediciones: [{ rowId: 'rB', excluida: true }],
      }),
    );
  });

  it('deseleccionar una hoja preserva otras ediciones acumuladas de sus filas, forzando excluida:true encima', async () => {
    preview.mockResolvedValue(
      previewBase({
        hojas: ['CERTIF K1', 'CERTIF K2'],
        filas: [
          filaBase({ rowId: 'rA', hoja_origen: 'CERTIF K1', contrato: 'K1', contrato_archivo: 'K1' }),
          filaBase({ rowId: 'rB', hoja_origen: 'CERTIF K2', contrato: 'K2', contrato_archivo: 'K2' }),
        ],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();

    await waitFor(() => expect(screen.getByRole('button', { name: 'CERTIF K2' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ver filas/i }));

    // Edito la cantidad de rB mientras su hoja todavía está seleccionada.
    const cantidadInput = await screen.findByLabelText('Cantidad rB');
    await userEvent.clear(cantidadInput);
    await userEvent.type(cantidadInput, '9');

    // Vuelvo al paso 2 y deselecciono la hoja de rB.
    await userEvent.click(screen.getByRole('button', { name: /atrás/i }));
    await userEvent.click(screen.getByRole('button', { name: 'CERTIF K2' }));
    await userEvent.click(screen.getByRole('button', { name: /ver filas/i }));

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 1, omitidas: 0, errores: [] });
    await confirmarDesdeModal();

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith({
        previewId: 'preview-1',
        ediciones: [{ rowId: 'rB', cantidades: '9', excluida: true }],
      }),
    );
  });

  it('muestra el monto total a cargar y el total declarado del archivo en el paso 3', async () => {
    preview.mockResolvedValue(
      previewBase({
        resumen: { total: 2, con_error: 0, total_mes: 1500.5, total_declarado: 1500.5 },
        filas: [filaBase({ rowId: 'r1', total_mes: '1000' }), filaBase({ rowId: 'r2', total_mes: '500.5' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByTestId('metrica-monto')).toHaveTextContent('$ 1.500,50');
    expect(screen.getByTestId('metrica-monto').parentElement).toHaveTextContent('el archivo declara $ 1.500,50');
  });

  it('preselecciona la provincia del archivo aunque el maestro la escriba con otras mayúsculas', async () => {
    useProvinciasAnalytics.mockReturnValue({ data: ['SALTA', 'SANTIAGO DEL ESTERO'] });
    preview.mockResolvedValue(
      previewBase({ filas: [filaBase({ rowId: 'r1', provincia: 'Santiago Del Estero' })] }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    const select = (await screen.findByLabelText('Provincia r1')) as HTMLSelectElement;
    expect(select.value).toBe('SANTIAGO DEL ESTERO');
    expect(screen.getByTestId('metrica-con-problema')).toHaveTextContent(/^0$/);
  });

  it('total declarado 0 en el archivo: sin aviso de descuadre ni métrica de declarado', async () => {
    preview.mockResolvedValue(
      previewBase({
        resumen: { total: 1, con_error: 0, total_mes: 300, total_declarado: 0 },
        filas: [filaBase({ rowId: 'r1', total_mes: '300' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByTestId('metrica-monto')).toHaveTextContent('$ 300,00');
    expect(screen.getByTestId('metrica-monto').parentElement).toHaveTextContent('el archivo no declara un total');
    expect(screen.queryByText(/no coincide con el total declarado/i)).not.toBeInTheDocument();
  });

  it('modal de confirmación: muestra archivo, contratos, filas y total; "Volver a revisar" cierra sin cargar', async () => {
    preview.mockResolvedValue(
      previewBase({
        archivo: 'CERTIFICADO K12.xlsx',
        filas: [filaBase({ rowId: 'r1', total_mes: '1000' }), filaBase({ rowId: 'r2', total_mes: '500.5', fila_excel: 6 })],
        resumen: { total: 2, con_error: 0, total_mes: 1500.5, total_declarado: 1500.5 },
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    await userEvent.click(screen.getByRole('button', { name: /revisar y cargar/i }));
    const dialog = await screen.findByRole('dialog', { name: /confirmar la carga/i });
    expect(dialog).toHaveTextContent('CERTIFICADO K12.xlsx');
    expect(dialog).toHaveTextContent('K12');
    expect(dialog).toHaveTextContent('$ 1.500,50');
    expect(screen.getByRole('button', { name: 'Cargar 2 filas' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /volver a revisar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('paso 1: muestra el stepper y la guía de pasos', () => {
    render(<CargaCertificacionesPage />);
    const stepper = screen.getByRole('list', { name: /pasos de la carga/i });
    expect(stepper).toHaveTextContent('Archivo y período');
    expect(stepper).toHaveTextContent('Cargado');
    expect(screen.getByText(/subís el certificado de naturgy/i)).toBeInTheDocument();
  });

  it('aviso de descuadre no bloqueante cuando el total a cargar difiere del total declarado', async () => {
    preview.mockResolvedValue(
      previewBase({
        resumen: { total: 1, con_error: 0, total_mes: 300, total_declarado: 999 },
        filas: [filaBase({ rowId: 'r1', total_mes: '300' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByText(/no coincide con el total declarado/i)).toBeInTheDocument();
    // No bloqueante: el botón de confirmar sigue habilitado.
    expect(screen.getByRole('button', { name: /revisar y cargar/i })).not.toBeDisabled();
  });
});
