/**
 * Dónde arranca el mapa cuando el reporte todavía no tiene punto: la capital
 * de la provincia elegida (quien carga más tarde no está en la obra, así que
 * su GPS no sirve de punto de partida). Sin provincia conocida, el centro del
 * país con poco zoom.
 */

export interface Centro {
  latitud: number;
  longitud: number;
  zoom: number;
}

export const CENTRO_PAIS: Centro = { latitud: -34.6, longitud: -64.2, zoom: 4 };

const ZOOM_PROVINCIA = 12;

/** Capital de cada provincia, por nombre normalizado (sin tildes, minúsculas). */
const CAPITALES: [string, number, number][] = [
  ['buenos aires', -34.9214, -57.9545],
  ['ciudad autonoma de buenos aires', -34.6037, -58.3816],
  ['caba', -34.6037, -58.3816],
  ['catamarca', -28.4696, -65.7795],
  ['chaco', -27.4606, -58.9839],
  ['chubut', -43.3002, -65.1023],
  ['cordoba', -31.4201, -64.1888],
  ['corrientes', -27.4692, -58.8306],
  ['entre rios', -31.7333, -60.5333],
  ['formosa', -26.1775, -58.1781],
  ['jujuy', -24.1858, -65.2995],
  ['la pampa', -36.6167, -64.2833],
  ['la rioja', -29.4131, -66.8558],
  ['mendoza', -32.8895, -68.8458],
  ['misiones', -27.3671, -55.8961],
  ['neuquen', -38.9516, -68.0591],
  ['rio negro', -40.8135, -62.9967],
  ['salta', -24.7821, -65.4232],
  ['san juan', -31.5375, -68.5364],
  ['san luis', -33.3017, -66.3378],
  ['santa cruz', -51.6230, -69.2168],
  ['santa fe', -31.6333, -60.7000],
  ['santiago del estero', -27.7951, -64.2615],
  ['tierra del fuego', -54.8019, -68.3030],
  ['tucuman', -26.8083, -65.2176],
];

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function centroDeProvincia(nombre: string | null | undefined): Centro {
  if (!nombre) return CENTRO_PAIS;
  const n = normalizar(nombre);
  // Exacto primero ("Buenos Aires" no es CABA); si no, el nombre más largo
  // contenido ("Santiago del Estero" antes que un posible "Santiago").
  const exacta = CAPITALES.find(([p]) => p === n);
  const parecida = CAPITALES.filter(([p]) => n.includes(p)).sort((a, b) => b[0].length - a[0].length)[0];
  const capital = exacta ?? parecida;
  return capital ? { latitud: capital[1], longitud: capital[2], zoom: ZOOM_PROVINCIA } : CENTRO_PAIS;
}
