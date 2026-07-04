'use client';

export function PillActivo({
  activo,
  onToggle,
  disabled,
}: {
  activo: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50 ${
        activo
          ? 'bg-approved/10 text-approved ring-approved/25 hover:bg-approved/20'
          : 'bg-slate/10 text-slate ring-slate/25 hover:bg-slate/20'
      }`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </button>
  );
}
