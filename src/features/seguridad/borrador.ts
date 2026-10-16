import type { FotoParaSubir, TipoReporte } from '@/lib/api/seguridad';
import type { EmpleadoBusqueda } from '@/types/domain';
import type { PuntoReporte } from './boton-ubicacion';

/**
 * Borrador local del alta de un Reporte de Seguridad. En celulares con poca
 * memoria, abrir la cámara suele matar o recargar la pestaña: sin borrador se
 * pierde el formulario entero justo en el momento de más ganas de reportar.
 *
 * Se guarda en IndexedDB del navegador (API nativa, sin librerías) porque
 * guarda los Blob de las fotos tal cual; localStorage solo guarda texto. Todo
 * va en try/catch: en modo privado, sin espacio o en navegadores viejos el
 * borrador simplemente no está, y el formulario funciona igual.
 */

export interface CamposBorrador {
  tipo: TipoReporte | null;
  fechaReporte: string;
  provinciaId: number | null;
  contratoId: number | null;
  tareaId: number | null;
  ubicacion: string;
  naturalezaId: number | null;
  motivoId: number | null;
  descripcion: string;
  controlRiesgo: string;
  involucrados: EmpleadoBusqueda[];
  punto: PuntoReporte | null;
}

export interface Borrador {
  /** Formato del borrador (ver VERSION_BORRADOR). */
  version: number;
  /** ISO de la última vez que se guardó. */
  guardadoEn: string;
  campos: CamposBorrador;
  fotos: FotoParaSubir[];
  /** Si el reporte ya se creó y quedaron fotos sin subir: se completa ese
   * reporte, nunca se crea otro. */
  reporteId: number | null;
}

const BASE = 'central-sertec-seguridad';
const ALMACEN = 'borradores';

/**
 * Formato del borrador. Subirlo cuando cambien los campos del formulario: un
 * borrador guardado por una versión anterior de la app se descarta en
 * silencio en vez de cargarse a medias (los celulares pueden tener uno viejo
 * guardado días antes de un deploy). Es un DATO del navegador, no código: no
 * tiene nada que ver con el caché de la app.
 */
export const VERSION_BORRADOR = 2; // 2: el punto guarda su origen (GPS o mapa)

/** Un borrador abandonado no se ofrece para siempre. */
export const VENCE_DIAS = 7;

const CAMPOS_VACIOS: CamposBorrador = {
  tipo: null,
  fechaReporte: '',
  provinciaId: null,
  contratoId: null,
  tareaId: null,
  ubicacion: '',
  naturalezaId: null,
  motivoId: null,
  descripcion: '',
  controlRiesgo: '',
  involucrados: [],
  punto: null,
};

/**
 * Lo leído de IndexedDB, validado: devuelve null si es de otra versión, si
 * venció o si no tiene forma de borrador. Los campos que falten se completan
 * con vacíos, así un borrador incompleto nunca puede romper la pantalla.
 */
export function normalizarBorrador(crudo: unknown, ahora: Date = new Date()): Borrador | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const b = crudo as Partial<Borrador>;
  if (b.version !== VERSION_BORRADOR) return null;
  const guardado = typeof b.guardadoEn === 'string' ? Date.parse(b.guardadoEn) : NaN;
  if (Number.isNaN(guardado) || ahora.getTime() - guardado > VENCE_DIAS * 24 * 3600_000) return null;
  const campos = { ...CAMPOS_VACIOS, ...(b.campos && typeof b.campos === 'object' ? b.campos : {}) };
  if (!Array.isArray(campos.involucrados)) campos.involucrados = [];
  return {
    version: VERSION_BORRADOR,
    guardadoEn: b.guardadoEn!,
    campos,
    fotos: Array.isArray(b.fotos) ? b.fotos.filter((f) => f && f.blob instanceof Blob) : [],
    reporteId: typeof b.reporteId === 'number' ? b.reporteId : null,
  };
}

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const pedido = indexedDB.open(BASE, 1);
      pedido.onupgradeneeded = () => {
        if (!pedido.result.objectStoreNames.contains(ALMACEN)) pedido.result.createObjectStore(ALMACEN);
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => resolve(null);
      pedido.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function operar<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await abrir();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(ALMACEN, modo);
      const pedido = accion(tx.objectStore(ALMACEN));
      tx.oncomplete = () => {
        db.close();
        resolve(pedido.result ?? null);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/** El borrador de esta persona (uno por CUIL: el celular puede ser compartido). */
export async function leerBorrador(cuil: string): Promise<Borrador | null> {
  const crudo = await operar<unknown>('readonly', (a) => a.get(cuil));
  const borrador = normalizarBorrador(crudo);
  // De otra versión o vencido: se borra para que no vuelva a aparecer.
  if (crudo != null && borrador == null) await borrarBorrador(cuil);
  return borrador;
}

export async function guardarBorrador(cuil: string, borrador: Omit<Borrador, 'guardadoEn' | 'version'>): Promise<void> {
  await operar('readwrite', (a) =>
    a.put({ ...borrador, version: VERSION_BORRADOR, guardadoEn: new Date().toISOString() }, cuil),
  );
}

export async function borrarBorrador(cuil: string): Promise<void> {
  await operar('readwrite', (a) => a.delete(cuil));
}

/** Hay algo que valga la pena guardar: al menos el tipo elegido. */
export function tieneContenido(c: CamposBorrador): boolean {
  return c.tipo != null;
}

// ------------------------------------------------------- último lugar usado

/** Dónde trabaja esta persona: casi siempre repite provincia, contrato y
 * tarea. Se precarga en el próximo reporte (crítica impeccable 2026-10-08).
 * Es texto chico: alcanza localStorage. */
export interface UltimoLugar {
  provinciaId: number;
  contratoId: number;
  tareaId: number;
}

const claveLugar = (cuil: string) => `seguridad:ultimo-lugar:${cuil}`;

export function leerUltimoLugar(cuil: string): UltimoLugar | null {
  try {
    const crudo = localStorage.getItem(claveLugar(cuil));
    if (!crudo) return null;
    const v = JSON.parse(crudo) as Partial<UltimoLugar>;
    return typeof v.provinciaId === 'number' && typeof v.contratoId === 'number' && typeof v.tareaId === 'number'
      ? { provinciaId: v.provinciaId, contratoId: v.contratoId, tareaId: v.tareaId }
      : null;
  } catch {
    return null;
  }
}

export function guardarUltimoLugar(cuil: string, lugar: UltimoLugar): void {
  try {
    localStorage.setItem(claveLugar(cuil), JSON.stringify(lugar));
  } catch {
    // Sin espacio o modo privado: la próxima vez simplemente no se precarga.
  }
}
