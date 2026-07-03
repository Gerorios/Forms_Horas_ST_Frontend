import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate">Error 403</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Sin acceso</h1>
      <p className="text-slate">No tenés permiso para ver esta sección.</p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
