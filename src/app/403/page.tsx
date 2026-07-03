import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-semibold text-alert">Sin acceso</h1>
      <p className="text-neutral">No tenés permiso para ver esta sección.</p>
      <Link href="/" className="text-brand hover:underline">Volver al inicio</Link>
    </main>
  );
}
