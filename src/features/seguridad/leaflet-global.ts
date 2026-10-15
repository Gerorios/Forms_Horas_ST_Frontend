import L from 'leaflet';

/**
 * Los plugins de Leaflet (markercluster, heat) se cuelgan del `L` global, no
 * del módulo: este archivo lo expone en `window` y se importa ANTES que ellos
 * (los imports se evalúan en orden). Solo en el navegador.
 */
(window as unknown as { L: typeof L }).L = L;

export default L;
