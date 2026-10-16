/**
 * Búsqueda de un lugar por texto para el mapa del reporte, con dos servicios
 * gratuitos sobre los datos de OpenStreetMap, uno de respaldo del otro:
 *
 * - Photon (komoot): pensado para sugerir mientras se escribe.
 * - Nominatim (OpenStreetMap): su política de uso NO permite autocompletar ni
 *   más de un pedido por segundo; se usa solo cuando la persona aprieta
 *   "Buscar" y Photon no responde.
 *
 * Si fallan los dos, el punto se marca a mano en el mapa.
 */

export interface LugarEncontrado {
  nombre: string;
  latitud: number;
  longitud: number;
}

const URL_PHOTON = 'https://photon.komoot.io/api/';
const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Argentina (oeste, sur, este, norte): las sugerencias no salen del país. */
const BBOX_AR = '-73.6,-55.1,-53.6,-21.7';

/** Desde cuántas letras se sugiere. */
export const MIN_LETRAS_SUGERENCIA = 3;

interface FeaturePhoton {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
  };
}

/** "Av. Belgrano 1200 · Salta, Salta": lo buscado y dónde queda. */
export function nombrePhoton(p: FeaturePhoton['properties']): string {
  const calle = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : undefined;
  const principal = p.name ?? calle ?? p.city ?? p.state ?? '';
  const zona = [...new Set([p.city ?? p.county, p.state].filter((z): z is string => !!z && z !== principal))];
  return zona.length ? `${principal} · ${zona.join(', ')}` : principal;
}

/** Sugerencias mientras se escribe (Photon), primero las cercanas a `cerca`. */
export async function sugerirLugares(
  texto: string,
  opciones: { cerca?: { latitud: number; longitud: number }; signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<LugarEncontrado[]> {
  const q = texto.trim();
  if (q.length < MIN_LETRAS_SUGERENCIA) return [];
  const { cerca, signal, fetcher = fetch } = opciones;
  const params = new URLSearchParams({ q, limit: '5', bbox: BBOX_AR });
  if (cerca) {
    params.set('lat', String(cerca.latitud));
    params.set('lon', String(cerca.longitud));
  }
  const res = await fetcher(`${URL_PHOTON}?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const datos = (await res.json()) as { features?: FeaturePhoton[] };
  return (datos.features ?? []).map((f) => ({
    nombre: nombrePhoton(f.properties),
    latitud: f.geometry.coordinates[1],
    longitud: f.geometry.coordinates[0],
  }));
}

/** Búsqueda al apretar "Buscar" (Nominatim): el respaldo si Photon no anda. */
export async function buscarLugar(texto: string, fetcher: typeof fetch = fetch): Promise<LugarEncontrado[]> {
  const q = texto.trim();
  if (!q) return [];
  const params = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'ar', limit: '5', 'accept-language': 'es' });
  const res = await fetcher(`${URL_NOMINATIM}?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const datos = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return datos.map((d) => ({ nombre: d.display_name, latitud: Number(d.lat), longitud: Number(d.lon) }));
}
