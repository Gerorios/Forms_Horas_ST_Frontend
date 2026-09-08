import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import type {
  FilaPreview,
  RespuestaPreviewCarga,
  RespuestaConfirmarCarga,
  ItemMaestroCarga,
} from '@/lib/api/certificaciones';

const usePreviewCarga = vi.fn();
const useConfirmarCarga = vi.fn();
const useProvinciasAnalytics = vi.fn();
const useContratosAnalytics = vi.fn();
const useItemsMaestroCarga = vi.fn();

vi.mock('@/lib/api/certificaciones', () => ({
  usePreviewCarga: (...args: unknown[]) => usePreviewCarga(...args),
  useConfirmarCarga: (...args: unknown[]) => useConfirmarCarga(...args),
  useProvinciasAnalytics: (...args: unknown[]) => useProvinciasAnalytics(...args),
  useContratosAnalytics: (...args: unknown[]) => useContratosAnalytics(...args),
  useItemsMaestroCarga: (...args: unknown[]) => useItemsMaestroCarga(...args),
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
    cuadratura: { calculado: 300, impreso: 300, diferencia: 0, cuadra: true, sugerencia_cantidad: null },
    confirmada: false,
    origen: 'archivo',
    ...overrides,
  };
}

function previewBase(overrides: Partial<RespuestaPreviewCarga> = {}): RespuestaPreviewCarga {
  return {
    previewId: 'preview-1',
    archivo: 'archivo.xlsx',
    hojas: ['CERTIF K12'],
    periodo: '2026-08',
    resumen: { total: 1, con_error: 0, bloqueadas: 0, total_mes: 300, total_declarado: 300 },
    filas: [filaBase()],
    errores: [],
    avisos: [],
    columnas_ignoradas: [],
    periodo_archivo: null,
    k_nombre_archivo: null,
    ...overrides,
  };
}

const ITEMS_MAESTRO: ItemMaestroCarga[] = [
  {
    id_item: 77,
    item_codigo: '5',
    codigo_k: 'K12',
    tarea: 'Adicional para servicios que superen los 3 metros',
    unidad_medida: 'UN',
  },
];

const preview = vi.fn();
const confirmar = vi.fn();

beforeEach(() => {
  useSession.mockReturnValue({ perfil: { cert: { nivel: 'admin', ks: [], inc: false } } });
  usePreviewCarga.mockReturnValue({ mutateAsync: preview, isPending: false });
  useConfirmarCarga.mockReturnValue({ mutateAsync: confirmar, isPending: false });
  useProvinciasAnalytics.mockReturnValue({ data: ['Salta', 'Jujuy'] });
  useContratosAnalytics.mockReturnValue({ data: ['K6', 'K12'] });
  useItemsMaestroCarga.mockReturnValue({ data: ITEMS_MAESTRO });
  preview.mockReset();
  confirmar.mockReset();
  push.mockClear();
  vi.mocked(toast.error).mockClear();
});

/** "Confirmar carga" abre el modal de resumen; la carga real se dispara con
 * "Cargar N fila(s)" adentro del modal. */
async function confirmarDesdeModal() {
  await userEvent.click(screen.getByRole('button', { name: /confirmar carga/i }));
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
        filas: [filaBase({ rowId: 'r1', hoja_origen: 'CERTIF K1', contrato: 'K1', contrato_archivo: 'K1', precio_unitario: '60' })],
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

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 1, omitidas: 0, manuales: 0, errores: [] } as RespuestaConfirmarCarga);
    await confirmarDesdeModal();

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith({
        previewId: 'preview-1',
        ediciones: [{ rowId: 'r1', cantidades: '5' }],
      }),
    );
    await waitFor(() => expect(screen.getByText(/1 fila insertada/i)).toBeInTheDocument());
  });

  it('nivel carga: las hojas de contratos ajenos quedan bloqueadas (deshabilitadas, con aviso), como en el portal', async () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K6', 'K2', 'K12'], inc: false } } });
    preview.mockResolvedValue(
      previewBase({
        hojas: ['CERTIFICO K6', 'CERTIFICO K5', 'CERTIFICO K12'],
        filas: [filaBase({ rowId: 'r1', hoja_origen: 'CERTIFICO K6', contrato: 'K6', contrato_archivo: 'K6' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();

    const chipK5 = await screen.findByRole('button', { name: 'CERTIFICO K5' });
    expect(chipK5).toBeDisabled();
    expect(chipK5).toHaveAttribute('title', 'No es un contrato a tu cargo');
    expect(screen.getByRole('button', { name: 'CERTIFICO K6' })).not.toBeDisabled();
    expect(screen.getByTestId('aviso-hojas-bloqueadas')).toHaveTextContent('1 hoja bloqueada');

    // Clic sobre la bloqueada no la selecciona.
    await userEvent.click(chipK5);
    expect(chipK5).toHaveAttribute('aria-pressed', 'false');
  });

  it('admin ve todas las hojas habilitadas, sin aviso de bloqueo', async () => {
    preview.mockResolvedValue(previewBase({ hojas: ['CERTIFICO K6', 'CERTIFICO K5'] }));
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    expect(await screen.findByRole('button', { name: 'CERTIFICO K5' })).not.toBeDisabled();
    expect(screen.queryByTestId('aviso-hojas-bloqueadas')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /confirmar carga/i })).toBeDisabled();
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
    preview.mockResolvedValue(
      previewBase({ filas: [filaBase({ rowId: 'r1', cantidades: '3', precio_unitario: '2', total_mes: '11' })] }),
    );
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
    await userEvent.click(screen.getByRole('button', { name: /volver a hojas/i }));
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
        resumen: { total: 2, con_error: 0, bloqueadas: 0, total_mes: 1500.5, total_declarado: 1500.5 },
        filas: [
          filaBase({ rowId: 'r1', cantidades: '1', precio_unitario: '1000', total_mes: '1000' }),
          filaBase({ rowId: 'r2', cantidades: '1', precio_unitario: '500.5', total_mes: '500.5' }),
        ],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByTestId('metrica-monto')).toHaveTextContent('$ 1.500,50');
    expect(screen.getByTestId('metrica-monto').parentElement).toHaveTextContent('declara $ 1.500,50');
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
    expect(screen.getByTestId('metrica-bloqueadas')).toHaveTextContent(/^0$/);
  });

  it('total declarado 0 en el archivo: sin aviso de descuadre ni métrica de declarado', async () => {
    preview.mockResolvedValue(
      previewBase({
        resumen: { total: 1, con_error: 0, bloqueadas: 0, total_mes: 300, total_declarado: 0 },
        filas: [filaBase({ rowId: 'r1', total_mes: '300' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByTestId('metrica-monto')).toHaveTextContent('$ 300,00');
    expect(screen.getByTestId('metrica-monto').parentElement).toHaveTextContent('el archivo no declara un total');
    expect(screen.queryByTestId('aviso-descuadre')).not.toBeInTheDocument();
  });

  it('modal de confirmación: muestra archivo, contratos, filas y total; "Volver a revisar" cierra sin cargar', async () => {
    preview.mockResolvedValue(
      previewBase({
        archivo: 'CERTIFICADO K12.xlsx',
        filas: [
          filaBase({ rowId: 'r1', cantidades: '1', precio_unitario: '1000', total_mes: '1000' }),
          filaBase({ rowId: 'r2', cantidades: '1', precio_unitario: '500.5', total_mes: '500.5', fila_excel: 6 }),
        ],
        resumen: { total: 2, con_error: 0, bloqueadas: 0, total_mes: 1500.5, total_declarado: 1500.5 },
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    await userEvent.click(screen.getByRole('button', { name: /confirmar carga/i }));
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
        resumen: { total: 1, con_error: 0, bloqueadas: 0, total_mes: 300, total_declarado: 999 },
        filas: [filaBase({ rowId: 'r1', total_mes: '300' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByText(/la suma no cierra con el total declarado/i)).toBeInTheDocument();
    // No bloqueante: el botón de confirmar sigue habilitado.
    expect(screen.getByRole('button', { name: /confirmar carga/i })).not.toBeDisabled();
  });
  // ── Paso 3 según el mockup 2026-09-07 ─────────────────────────────────

  /** La fila 132 del K11 real: la columna ignorada CUENTA metió 922 donde iba
   * la cantidad (221), así que la fila no cuadra y queda BLOQUEADA. */
  function previewNoCuadra() {
    return previewBase({
      resumen: { total: 1, con_error: 1, bloqueadas: 1, total_mes: 14804768, total_declarado: 0 },
      filas: [
        filaBase({
          rowId: 'row-1',
          item_codigo: '132',
          cantidades: '922',
          precio_unitario: '66989.90',
          total_mes: '14804768',
          tiene_error: true,
          error_detalle: 'No cuadra: 922 × 66989.90 = 61764687.80, impreso 14804768 (dif. $ 46959919.80)',
          cuadratura: {
            calculado: 61764687.8,
            impreso: 14804768,
            diferencia: -46959919.8,
            cuadra: false,
            sugerencia_cantidad: '221',
          },
        }),
      ],
    });
  }

  it('fila que no cuadra: badge "No cuadra", tile Bloqueadas = 1 y Confirmar deshabilitado con motivo', async () => {
    preview.mockResolvedValue(previewNoCuadra());
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    const tabla = screen.getByRole('table', { name: /filas de la carga/i });
    expect(within(tabla).getByText('No cuadra')).toBeInTheDocument();
    expect(screen.getByTestId('metrica-bloqueadas')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /confirmar carga/i })).toBeDisabled();
    expect(screen.getByText(/hay 1 fila bloqueada/i)).toBeInTheDocument();
  });

  it('"Usar cantidad 221" corrige la fila y la desbloquea', async () => {
    preview.mockResolvedValue(previewNoCuadra());
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    await userEvent.click(screen.getByRole('button', { name: /detalle/i }));
    // Las tres cifras de la cuadratura, visibles antes de decidir.
    expect(screen.getByText(/impreso 14\.804\.768,00 · diferencia/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /usar cantidad 221/i }));

    expect(screen.getByLabelText('Cantidad row-1')).toHaveValue('221');
    expect(screen.getByTestId('metrica-bloqueadas')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /confirmar carga/i })).toBeEnabled();
    expect(within(screen.getByRole('table', { name: /filas de la carga/i })).getByText('Cuadra')).toBeInTheDocument();
  });

  it('"Confirmar así" desbloquea y manda confirmada: true al confirmar', async () => {
    preview.mockResolvedValue(previewNoCuadra());
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    await userEvent.click(screen.getByRole('button', { name: /detalle/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar así/i }));

    expect(screen.getByTestId('metrica-bloqueadas')).toHaveTextContent('0');
    expect(screen.getByText('Confirmada así')).toBeInTheDocument();

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 1, omitidas: 0, manuales: 0, errores: [] });
    await confirmarDesdeModal();

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith(
        expect.objectContaining({
          ediciones: expect.arrayContaining([expect.objectContaining({ rowId: 'row-1', confirmada: true })]),
        }),
      ),
    );
  });

  it('cartel rojo de descuadre contra el total declarado deja confirmar', async () => {
    preview.mockResolvedValue(
      previewBase({
        resumen: { total: 1, con_error: 0, bloqueadas: 0, total_mes: 22474602.04, total_declarado: 22535209.93 },
        filas: [filaBase({ rowId: 'r1', cantidades: '1', precio_unitario: '22474602.04', total_mes: '22474602.04' })],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(await screen.findByTestId('aviso-descuadre')).toHaveTextContent('faltan $ 60.607,89');
    expect(screen.getByTestId('aviso-descuadre')).toHaveTextContent('las bloqueadas no cuentan');
    expect(screen.getByRole('button', { name: /confirmar carga/i })).toBeEnabled();
  });

  it('avisos de lectura: columna ignorada y período (fuerte) se muestran', async () => {
    preview.mockResolvedValue(
      previewBase({
        columnas_ignoradas: ['CUENTA'],
        avisos: [
          {
            tipo: 'columna_ignorada',
            hoja: 'CERTIF K12',
            fila: 0,
            mensaje: 'Columna ignorada: CUENTA. Sus valores no se asignaron a ninguna columna.',
            fuerte: false,
          },
          {
            tipo: 'periodo_archivo',
            hoja: 'CERTIF K12',
            fila: 0,
            mensaje: 'El período del archivo es julio 2026 y elegiste agosto 2026.',
            fuerte: true,
          },
        ],
      }),
    );
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    expect(screen.getByText(/columna ignorada: cuenta/i)).toBeInTheDocument();
    expect(screen.getByTestId('avisos-lectura')).toHaveTextContent(/avisos de lectura/i);
    expect(screen.getByTestId('avisos-fuertes')).toHaveTextContent(/elegiste agosto 2026/i);
  });

  it('fila manual: elegir ítem, completar, total propuesto, suma en cuadratura y viaja en manuales', async () => {
    const user = userEvent.setup();
    preview.mockResolvedValue(previewBase({ filas: [filaBase({ rowId: 'r1' })] }));
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await user.click(await screen.findByRole('button', { name: /ver filas/i }));

    await user.click(screen.getByRole('button', { name: /agregar fila manual/i }));
    const form = screen.getByTestId('form-manual');
    await user.selectOptions(within(form).getByLabelText(/ítem del maestro/i), '77');
    await user.type(within(form).getByLabelText(/^cantidad$/i), '4');
    await user.type(within(form).getByLabelText(/\$ unitario/i), '15151,96');
    expect(within(form).getByLabelText(/^\$ total$/i)).toHaveValue('60607.84');
    await user.click(within(form).getByRole('button', { name: /^agregar$/i }));

    expect(screen.getByTestId('metrica-manuales')).toHaveTextContent('1');
    const tabla = screen.getByRole('table', { name: /filas de la carga/i });
    expect(within(tabla).getAllByText('Manual')).toHaveLength(1);
    // La manual suma en el total a cargar (300 del archivo + 60.607,84).
    expect(screen.getByTestId('metrica-monto')).toHaveTextContent('$ 60.907,84');

    confirmar.mockResolvedValue({ mensaje: 'ok', insertadas: 2, omitidas: 0, manuales: 1, errores: [] });
    await confirmarDesdeModal();

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith({
        previewId: 'preview-1',
        ediciones: [],
        manuales: [{ id_item: 77, provincia: 'Salta', cantidades: '4', precio_unitario: '15151.96', total_mes: '60607.84' }],
      }),
    );
    // Paso 4: el resumen dice cuántas de las insertadas son manuales.
    await waitFor(() => expect(screen.getByText(/2 filas insertadas \(1 manual\)/i)).toBeInTheDocument());
  });

  it('422 con bloqueadas del backend: toast con el mensaje y las filas quedan marcadas', async () => {
    preview.mockResolvedValue(previewBase({ filas: [filaBase({ rowId: 'r1' })] }));
    render(<CargaCertificacionesPage />);
    await subirArchivo();
    await userEvent.click(await screen.findByRole('button', { name: /ver filas/i }));

    confirmar.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'Hay 1 fila bloqueada. Corregila, confirmala o excluila.',
          bloqueadas: [{ rowId: 'r1', item_codigo: 'ITEM-01', detalle: "Provincia 'Salta' inválida" }],
        },
      },
    });
    await confirmarDesdeModal();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Hay 1 fila bloqueada. Corregila, confirmala o excluila.'));
    // La fila queda marcada, expandida y con el motivo del servidor a la vista.
    expect(screen.getByTestId('metrica-bloqueadas')).toHaveTextContent('1');
    expect(screen.getByText('Bloqueada por el servidor')).toBeInTheDocument();
    expect(screen.getByText("Provincia 'Salta' inválida")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar carga/i })).toBeDisabled();

    // Tocar la fila descarta el bloqueo del intento anterior.
    await userEvent.clear(screen.getByLabelText('Cantidad r1'));
    await userEvent.type(screen.getByLabelText('Cantidad r1'), '3');
    expect(screen.getByTestId('metrica-bloqueadas')).toHaveTextContent('0');
  });
});
