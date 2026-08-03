import type { ReactElement } from 'react';

const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const svg = (children: ReactElement | ReactElement[]) => (
  <svg width="18" height="18" viewBox="0 0 20 20" {...p} aria-hidden>
    {children}
  </svg>
);

// Un ícono por href de NAV_ITEMS (ver nav.ts). Estilo de trazo igual al resto de la app.
export const NAV_ICONS: Record<string, ReactElement> = {
  // Reporte diario: reloj
  '/reporte': svg(<><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></>),
  // Mis registros: lista
  '/mis-registros': svg(<><path d="M7 5h9M7 10h9M7 15h9" /><path d="M4 5h.01M4 10h.01M4 15h.01" strokeWidth="2.2" /></>),
  // Combustible: surtidor
  '/combustible': svg(<><rect x="4" y="3" width="8" height="14" rx="1" /><path d="M4 9h8M12 8l3-2v9a1.5 1.5 0 0 1-3 0" /></>),
  // Aprobaciones: tilde en círculo
  '/aprobaciones': svg(<><circle cx="10" cy="10" r="7" /><path d="m7 10 2 2 4-4" /></>),
  // Novedades: campana
  '/novedades': svg(<><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z" /><path d="M8.5 16a1.5 1.5 0 0 0 3 0" /></>),
  // Ausencias: calendario
  '/ausencias': svg(<><rect x="3" y="4.5" width="14" height="12" rx="1.5" /><path d="M3 8.5h14M7 3v3M13 3v3" /></>),
  // Admin: engranaje
  '/admin': svg(<><circle cx="10" cy="10" r="2.5" /><path d="M10 3v2.2M10 14.8V17M3 10h2.2M14.8 10H17M5.05 5.05l1.56 1.56M13.39 13.39l1.56 1.56M14.95 5.05l-1.56 1.56M6.61 13.39l-1.56 1.56" /></>),
  // Liquidación: calculadora
  '/liquidacion': svg(<><rect x="4.5" y="3" width="11" height="14" rx="1.5" /><path d="M7 6.5h6" /><path d="M7.5 10.5h.01M10 10.5h.01M12.5 10.5h.01M7.5 13.5h.01M10 13.5h.01M12.5 13.5h.01" strokeWidth="2" /></>),
};

export function NavIcon({ href }: { href: string }): ReactElement | null {
  return NAV_ICONS[href] ?? null;
}
