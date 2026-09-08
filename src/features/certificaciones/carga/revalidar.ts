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
 * provincia, cantidad, unitario, total) sin esperar un roundtrip al
 * servidor — la revalidación real y autoritativa sigue viviendo en el
 * backend al confirmar.
 *
 * Cuadratura (|cantidad × unitario − total| ≤ $1, CONTEXT.md "Fila que
 * cuadra"): el precio unitario YA NO es opcional para que una fila sea
 * cargable — sin él no hay cuadratura posible y la fila queda bloqueada
 * con 'Falta $ unitario (no se puede cuadrar)', salvo que el usuario la
 * confirme a mano (`opts.confirmada`).
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
  precio_unitario: string | null;
  total_mes: string | null;
}

export interface ResultadoRevalidacion {
  tieneError: boolean;
  detalle: string | null;
  cuadratura: Cuadratura;
}

/** Tolerancia de cuadratura, en pesos (CONTEXT.md "Fila que cuadra") —
 * espejo exacto de `TOLERANCIA_CUADRATURA` en el backend
 * (`carga/validacion.ts`). */
export const TOLERANCIA_CUADRATURA = 1;

export interface Cuadratura {
  calculado: number | null;
  impreso: number | null;
  diferencia: number | null;
  cuadra: boolean;
  sugerencia_cantidad: string | null;
}

/**
 * Fila que cuadra (CONTEXT.md, decisión vinculante): |cantidad × unitario −
 * total| ≤ $1. Ninguna de las tres cifras manda sola; sin unitario no hay
 * cuadratura posible (cuadra=false).
 *
 * Convención de signo de `diferencia`: total_mes − calculado (puede ser
 * negativa si lo impreso es menor que lo calculado). El mensaje de error de
 * `revalidarFila` muestra su valor ABSOLUTO — lo que importa para la
 * persona que revisa es la magnitud del desajuste, no si sobra o falta.
 * Espejo exacto de `cuadraturaFila` en el backend (`carga/validacion.ts`).
 */
export function cuadraturaFila(f: {
  cantidades: string | null;
  precio_unitario: string | null;
  total_mes: string | null;
}): Cuadratura {
  const cant = num(f.cantidades);
  const unit = num(f.precio_unitario);
  const total = num(f.total_mes);
  if (cant === null || unit === null || total === null) {
    return { calculado: null, impreso: total, diferencia: null, cuadra: false, sugerencia_cantidad: null };
  }

  const calculado = Math.round(cant * unit * 100) / 100;
  const diferencia = Math.round((total - calculado) * 100) / 100;
  const cuadra = Math.abs(diferencia) <= TOLERANCIA_CUADRATURA;

  let sugerenciaCantidad: string | null = null;
  if (!cuadra && unit > 0) {
    const cantidadEquivalente = total / unit;
    const entero = Math.round(cantidadEquivalente);
    if (entero >= 1 && Math.abs(cantidadEquivalente - entero) <= 0.01 && entero !== cant) {
      sugerenciaCantidad = String(entero);
    }
  }

  return { calculado, impreso: total, diferencia, cuadra, sugerencia_cantidad: sugerenciaCantidad };
}

const fmt2 = (n: number) => n.toFixed(2);

/**
 * Clave de comparación de provincia: ignora tildes/diacríticos (NFD +
 * remoción de marcas combinantes `\p{M}`), mayúsculas/minúsculas, espacios
 * al borde y espacios internos duplicados. `null`/`undefined` → `''`.
 * Ej.: `claveProvincia('Tucumán') === 'TUCUMAN'`. Espejo exacto del módulo
 * `provincias.ts` del backend — mismo nombre, mismo comportamiento.
 */
export function claveProvincia(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Devuelve la grafía EXACTA del maestro (`validas`) cuya `claveProvincia`
 * matchea la de `valor` (ignorando tildes/mayúsculas/espacios), o `null` si
 * ninguna matchea. La fila adopta esta grafía canónica — no la que trajo el
 * archivo — para que el resto del sistema (INSERT, filtros) vea siempre la
 * misma forma.
 */
export function canonizarProvincia(valor: string | null | undefined, validas: string[]): string | null {
  const clave = claveProvincia(valor);
  if (!clave) return null;
  return validas.find((v) => claveProvincia(v) === clave) ?? null;
}

/**
 * Fila cargable: ítem en maestro + contrato K + provincia válida (match
 * UPPER contra las provincias activas) + cantidad != 0 + total_mes
 * presente (0 es válido; solo debe parsear) + fila que cuadra. `detalle`
 * une las faltas con "; " usando los textos exactos del portal. La
 * cuadratura solo se evalúa si no hay ninguna otra falta (una fila sin
 * cantidad ya está bloqueada por 'Falta cantidad'; no se duplican
 * mensajes). `opts.confirmada` levanta ÚNICAMENTE el bloqueo por
 * cuadratura — nunca las demás faltas. El unitario YA NO puede faltar para
 * que la fila sea cargable: sin él no hay cuadratura posible. Espejo
 * exacto de `revalidarFila` en el backend (`carga/validacion.ts`).
 */
export function revalidarFila(
  f: FilaRevalidable,
  opts: { itemExiste: boolean; provinciasValidas: string[]; confirmada?: boolean },
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
  } else if (canonizarProvincia(provincia, opts.provinciasValidas) === null) {
    faltas.push(`Provincia '${provincia}' inválida`);
  }

  const cant = num(f.cantidades);
  if (cant === null || cant === 0) {
    faltas.push('Falta cantidad');
  }

  if (num(f.total_mes) === null) {
    faltas.push('Falta total mes');
  }

  const cuadratura = cuadraturaFila(f);
  if (faltas.length === 0 && !cuadratura.cuadra && !opts.confirmada) {
    if (num(f.precio_unitario) === null) {
      faltas.push('Falta $ unitario (no se puede cuadrar)');
    } else {
      faltas.push(
        `No cuadra: ${f.cantidades} × ${f.precio_unitario} = ${fmt2(cuadratura.calculado!)}, impreso ${f.total_mes} (dif. $ ${fmt2(Math.abs(cuadratura.diferencia!))})`,
      );
    }
  }

  if (faltas.length > 0) {
    return { tieneError: true, detalle: faltas.join('; '), cuadratura };
  }
  return { tieneError: false, detalle: null, cuadratura };
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
