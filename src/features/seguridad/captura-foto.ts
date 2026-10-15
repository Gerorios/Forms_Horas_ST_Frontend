import { comprimirImagen } from '@/features/combustible/comprimir-imagen';
import type { FotoParaSubir, GrupoFoto } from '@/lib/api/seguridad';

/**
 * Captura de fotos de un reporte (ADR-027, "Punto del reporte"): solo una foto
 * sacada con la CÁMARA desde la app lleva ubicación, porque prueba que el
 * autor estaba en el lugar. Las de galería pueden ser de otro día y otro
 * lugar, y no se georreferencian.
 */

/** Lado mayor de la foto achicada: alcanza para ver el riesgo y deja la foto
 * en ~300 KB (los celulares sacan fotos de 4 a 8 MB). */
export const LADO_MAXIMO = 1600;

/** Una foto "de cámara" tiene que ser de recién: algunos Android, aun con el
 * botón de cámara, dejan elegir una foto vieja de la galería. */
export const FRESCURA_MS = 5 * 60 * 1000;

export function esFotoRecien(archivo: Pick<File, 'lastModified'>, ahora: number = Date.now()): boolean {
  return ahora - archivo.lastModified <= FRESCURA_MS && archivo.lastModified <= ahora + 60_000;
}

/** Ubicación del celular en este momento, o null si no hay permiso, no hay
 * señal o tarda demasiado. Nunca bloquea el reporte. El navegador pide el
 * permiso una sola vez. */
export function obtenerUbicacion(timeoutMs = 15_000): Promise<FotoParaSubir['ubicacion']> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitud: Number(pos.coords.latitude.toFixed(6)),
          longitud: Number(pos.coords.longitude.toFixed(6)),
          errorMetros: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}

/** Achica la foto; si el navegador no puede (HEIC y otros) y el original ya
 * es JPG/PNG, lo usa tal cual. Mismo criterio que FotoTicket. */
export async function prepararImagen(archivo: File): Promise<Blob | null> {
  try {
    return await comprimirImagen(archivo, LADO_MAXIMO, 0.8);
  } catch {
    return archivo.type === 'image/jpeg' || archivo.type === 'image/png' ? archivo : null;
  }
}

/**
 * Arma la foto para subir. `desdeCamara`: vino del botón "Sacar foto". Aun
 * así, si el archivo no es de recién, se toma como de galería y no se pide
 * ubicación.
 */
export async function capturar(
  archivo: File,
  grupo: GrupoFoto,
  desdeCamara: boolean,
): Promise<FotoParaSubir | null> {
  const camara = desdeCamara && esFotoRecien(archivo);
  // La ubicación se pide en el momento en que vuelve la foto, en paralelo con
  // el achicado: es el lugar donde se sacó, no donde se va a enviar.
  const [blob, ubicacion] = await Promise.all([prepararImagen(archivo), camara ? obtenerUbicacion() : null]);
  if (!blob) return null;
  return { grupo, origen: camara ? 'camara' : 'galeria', blob, ubicacion };
}
