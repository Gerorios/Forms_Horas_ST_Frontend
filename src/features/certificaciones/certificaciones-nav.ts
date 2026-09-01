// Sub-navegación del módulo Certificaciones — mismo patrón que
// `liquidacion-nav.ts`. Analytics (Task 7) se agrega como sub-ítem del
// Resumen existente (Task 6), no como entrada propia del nav principal.
// "Ítems" (Task 3 etapa 3) es `soloAdmin`: `certificaciones/layout.tsx` la
// filtra si `perfil.cert.nivel !== 'admin'` (la página además re-gatea sola
// por si alguien navega directo a la URL).
export const CERTIFICACIONES_NAV = [
  { label: 'Resumen', href: '/certificaciones' },
  { label: 'Analytics', href: '/certificaciones/analytics' },
  { label: 'Ítems', href: '/certificaciones/items', soloAdmin: true },
];
