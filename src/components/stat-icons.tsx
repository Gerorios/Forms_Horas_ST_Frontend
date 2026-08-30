import type { ReactElement } from 'react';

const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function svg(children: ReactElement | ReactElement[]) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" {...p} aria-hidden>
      {children}
    </svg>
  );
}

/** Íconos de indicadores/tiles (Home, Control general) — mismo trazo que
 * nav-icons.tsx, set separado porque estos representan datos, no rutas. */
export const ClockIcon = () => svg(<><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></>);
export const ClipboardIcon = () =>
  svg(
    <>
      <rect x="5" y="4" width="10" height="13" rx="1.5" />
      <path d="M8 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      <path d="M7.5 10l1.5 1.5L12.5 8" />
    </>,
  );
export const AlertUserIcon = () =>
  svg(
    <>
      <circle cx="8" cy="7" r="2.5" />
      <path d="M3 16c0-2.5 2-4 5-4" />
      <circle cx="15.5" cy="14.5" r="3.2" />
      <path d="M15.5 13v1.7M15.5 16.3h.01" />
    </>,
  );
export const TrendIcon = () => svg(<><path d="M3 14l4.5-5 3 3L17 5" /><path d="M13 5h4v4" /></>);
export const CalendarIcon = () => svg(<><rect x="3" y="4.5" width="14" height="12" rx="1.5" /><path d="M3 8.5h14M7 3v3M13 3v3" /></>);
export const BellIcon = () => svg(<><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z" /><path d="M8.5 16a1.5 1.5 0 0 0 3 0" /></>);
export const WarnTriIcon = () => svg(<><path d="M10 3.5 17.5 16h-15L10 3.5Z" /><path d="M10 8.5v3.2M10 14.2h.01" /></>);
export const UsersIcon = () =>
  svg(
    <>
      <circle cx="7.5" cy="7" r="2.5" />
      <path d="M2.5 16c0-2.5 2-4 5-4s5 1.5 5 4" />
      <path d="M13 8a2 2 0 1 0 0-4" />
      <path d="M17.5 15.5c0-2-1.5-3.3-3.5-3.7" />
    </>,
  );
export const BarsIcon = () => svg(<><path d="M4 16.5V10M10 16.5V4M16 16.5v-5" /><path d="M3 17.5h14" strokeWidth="1.4" /></>);
export const TrophyIcon = () =>
  svg(
    <>
      <path d="M6 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M6 5H4a2 2 0 0 0 2 3.5M14 5h2a2 2 0 0 1-2 3.5" />
      <path d="M10 12v2.5M7.5 17h5" />
    </>,
  );
export const ListIcon = () => svg(<><path d="M7 5h9M7 10h9M7 15h9" /><path d="M4 5h.01M4 10h.01M4 15h.01" strokeWidth="2.2" /></>);
export const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7.5 4.5 13 10l-5.5 5.5" />
  </svg>
);
