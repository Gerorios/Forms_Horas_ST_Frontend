/**
 * Búsqueda de un lugar por texto para el mapa del reporte, con Nominatim (el
 * buscador gratuito de OpenStreetMap). Su política de uso no permite
 * autocompletar mientras se escribe ni más de un pedido por segundo: se busca
 * solo cuando la persona aprieta "Buscar".
 */

export interface LugarEncontrado {
  nombre: string;
  latitud: number;
  longitud: number;
}

const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export async function buscarLugar(texto: string, fetcher: typeof fetch = fetch): Promise<LugarEncontrado[]> {
  const q = texto.trim();
  if (!q) return [];
  const params = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'ar', limit: '5', 'accept-language': 'es' });
  const res = await fetcher(`${URL_NOMINATIM}?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const datos = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return datos.map((d) => ({ nombre: d.display_name, latitud: Number(d.lat), longitud: Number(d.lon) }));
}
