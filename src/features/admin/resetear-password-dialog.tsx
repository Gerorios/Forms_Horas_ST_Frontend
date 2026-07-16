'use client';

export function ResetearPasswordDialog({
  apellidoNombre,
  cuil,
  onConfirm,
  onCancel,
}: {
  apellidoNombre: string;
  cuil: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-6">
        <h3 className="font-semibold text-neutral">Resetear contraseña</h3>
        <p className="text-sm text-neutral">
          ¿Resetear la contraseña de <strong>{apellidoNombre}</strong> a su CUIL (<strong>{cuil}</strong>)?
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-neutral">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-brand px-3 py-2 text-sm font-medium text-ink"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
