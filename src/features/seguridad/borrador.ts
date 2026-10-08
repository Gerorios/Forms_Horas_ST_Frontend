import type { FotoParaSubir, TipoReporte } from '@/lib/api/seguridad';
import type { EmpleadoBusqueda } from '@/types/domain';
import type { PuntoGps } from './boton-ubicacion';

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
  punto: PuntoGps | null;
}

export interface Borrador {
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
export function leerBorrador(cuil: string): Promise<Borrador | null> {
  return operar<Borrador>('readonly', (a) => a.get(cuil) as IDBRequest<Borrador>);
}

export async function guardarBorrador(cuil: string, borrador: Omit<Borrador, 'guardadoEn'>): Promise<void> {
  await operar('readwrite', (a) => a.put({ ...borrador, guardadoEn: new Date().toISOString() }, cuil));
}

export async function borrarBorrador(cuil: string): Promise<void> {
  await operar('readwrite', (a) => a.delete(cuil));
}

/** Hay algo que valga la pena guardar: al menos el tipo elegido. */
export function tieneContenido(c: CamposBorrador): boolean {
  return c.tipo != null;
}
