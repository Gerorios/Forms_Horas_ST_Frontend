import { fechaCorta } from './baja';

/** Registro con fecha posterior a la baja confirmada del operario (ADR-026 del
 * backend): se cargó antes de que se informara la baja, no se liquida y
 * conviene desaprobarlo. */
export function ChipPosteriorABaja({ fecha }: { fecha: string }) {
  return (
    <span
      className="ml-1 rounded bg-danger/10 px-1 text-xs font-medium text-danger"
      title="El operario tiene baja confirmada: este día es posterior a su último día trabajado y no se liquida. Conviene desaprobarlo."
    >
      posterior a la baja del {fechaCorta(fecha)}
    </span>
  );
}
