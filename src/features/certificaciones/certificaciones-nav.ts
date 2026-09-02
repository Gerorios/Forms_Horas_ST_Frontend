// Sub-navegación del módulo Certificaciones — mismo patrón que
// `liquidacion-nav.ts`. Analytics (Task 7) se agrega como sub-ítem del
// Resumen existente (Task 6), no como entrada propia del nav principal.
// "Ítems" (Task 3 etapa 3) es `soloAdmin`: `certificaciones/layout.tsx` la
// filtra si `perfil.cert.nivel !== 'admin'` (la página además re-gatea sola
// por si alguien navega directo a la URL).
//
// "Cargar" (Task 6 etapa 4) necesita un gate más amplio que `soloAdmin`
// (admin Y carga, no solo admin) — se generaliza el mecanismo con
// `nivelesPermitidos` sin tocar `soloAdmin`, que sigue siendo el atajo para
// "solo admin" que ya usa "Ítems".
export type NivelNav = 'admin' | 'carga' | 'lectura';

export const CERTIFICACIONES_NAV = [
  { label: 'Resumen', href: '/certificaciones' },
  { label: 'Analytics', href: '/certificaciones/analytics' },
  { label: 'Cargar', href: '/certificaciones/carga', nivelesPermitidos: ['admin', 'carga'] as NivelNav[] },
  { label: 'Ítems', href: '/certificaciones/items', soloAdmin: true },
];
