/**
 * Reglas puras del wizard de carga de certificaciones (Etapa 4), espejo
 * client-side EXACTO del backend gemelo
 * (Backend `src/certificaciones/carga/validacion.ts` + `extension.ts`,
 * porteados de `app/services/validacion.py` y el ruteo de extensión del
 * portal). Los textos son literales — ver
 * docs/superpowers/specs/2026-09-02-inventario-carga-portal.md §4 y §6.
 *
 * Todo acá es puro (sin red/BD/DOM): se usa para recalcular en el cliente
 * el estado de una fila del paso 3 tras una edición local (contrato,
 * provincia, cantidad, total) sin esperar un roundtrip al servidor — la
 * revalidación real y autoritativa sigue viviendo en el backend al
 * confirmar.
 */

/** Tolera coma decimal es-AR ("5,5") además del punto — un usuario puede
 * tipear la edición de cantidad/total con coma; se normaliza acá antes de
 * `Number()` (fix ronda 1 del code review) además de en el handler de la
 * página, que ya guarda la edición normalizada a punto. */
function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export interface FilaRevalidable {
  item_codigo: string;
  contrato: string;
  provincia: string;
  cantidades: string | null;
  total_mes: string | null;
}

export interface ResultadoRevalidacion {
  tieneError: boolean;
  detalle: string | null;
}

/**
 * Fila cargable: ítem en maestro + contrato K + provincia válida (match
 * UPPER contra las provincias activas) + cantidad != 0 + total_mes
 * presente (0 es válido; solo debe parsear). El unitario puede faltar.
 * `detalle` une las faltas con "; " usando los textos exactos del portal.
 */
export function revalidarFila(
  f: FilaRevalidable,
  opts: { itemExiste: boolean; provinciasValidas: string[] },
): ResultadoRevalidacion {
  const faltas: string[] = [];

  if (!opts.itemExiste) {
    faltas.push(`Ítem ${f.item_codigo ?? '?'} no encontrado en el maestro`);
  }

  if (!(f.contrato ?? '').trim()) {
    faltas.push('Falta contrato K');
  }

  const provincia = (f.provincia ?? '').trim();
  if (!provincia) {
    faltas.push('Falta provincia');
  } else {
    const validasUpper = new Set(opts.provinciasValidas.map((p) => p.trim().toUpperCase()));
    if (!validasUpper.has(provincia.toUpperCase())) {
      faltas.push(`Provincia '${provincia}' inválida`);
    }
  }

  const cant = num(f.cantidades);
  if (cant === null || cant === 0) {
    faltas.push('Falta cantidad');
  }

  if (num(f.total_mes) === null) {
    faltas.push('Falta total mes');
  }

  if (faltas.length > 0) {
    return { tieneError: true, detalle: faltas.join('; ') };
  }
  return { tieneError: false, detalle: null };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matching de nombre de hoja contra los K del claim, por LÍMITES DE
 * PALABRA (fix B9 del portal: antes era substring, así que "K1" matcheaba
 * "K12"). Se usa para preseleccionar los chips del paso 2; nivel admin ve
 * todas las hojas preseleccionadas — eso se resuelve en el caller, no acá.
 */
export function hojaCoincideConKs(nombreHoja: string, ks: string[]): boolean {
  return ks.some((k) => new RegExp(`\\b${escapeRegExp(k)}\\b`, 'i').test(nombreHoja));
}

const MAX_ARCHIVO_BYTES = 20 * 1024 * 1024;

/**
 * Validación client-side del archivo del paso 1, ANTES de subir — espejo
 * de `elegirTipoArchivo` (Backend `carga/extension.ts`, mismos textos
 * exactos) + el límite de 20 MB (ahí server-side se aplica leyendo a RAM;
 * acá se corta antes de mandar nada). Devuelve el mensaje de error o
 * `null` si el archivo es aceptable.
 */
export function validarArchivoCarga(nombreArchivo: string, tamanioBytes: number): string | null {
  const match = /\.[^.]+$/.exec(nombreArchivo.toLowerCase());
  const ext = match ? match[0] : '';

  if (ext === '.xls') {
    return 'Formato .xls no soportado: convertí el archivo a .xlsx.';
  }
  if (ext !== '.xlsx' && ext !== '.xlsm' && ext !== '.pdf') {
    return `Formato de archivo no soportado (${ext || 'sin extensión'}). Usá .xlsx, .xlsm o .pdf.`;
  }
  if (tamanioBytes > MAX_ARCHIVO_BYTES) {
    return 'El archivo supera el máximo de 20 MB.';
  }
  return null;
}
