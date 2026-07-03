const MAP: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-warn/10 text-warn ring-warn/25' },
  aprobado: { label: 'Aprobado', cls: 'bg-approved/10 text-approved ring-approved/25' },
  desaprobado: { label: 'Desaprobado', cls: 'bg-danger/10 text-danger ring-danger/25' },
  aprobada: { label: 'Aprobada', cls: 'bg-approved/10 text-approved ring-approved/25' },
  desaprobada: { label: 'Desaprobada', cls: 'bg-danger/10 text-danger ring-danger/25' },
  no_aplica: { label: 'No aplica', cls: 'bg-slate/10 text-slate ring-slate/25' },
};

/** Pill de estado (registro o novedad HyS) con la paleta de estados de la marca. */
export function StatusBadge({ estado }: { estado: string }) {
  const s = MAP[estado] ?? { label: estado, cls: 'bg-slate/10 text-slate ring-slate/25' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
