'use client';

import { toast } from 'sonner';
import { useReabrirRegistro } from '@/lib/api/aprobaciones';
import { LoteResumenCard } from '@/components/lote-resumen-card';
import type { GrupoLote } from '@/lib/agrupar';

export function LoteResueltoCard({ grupo }: { grupo: GrupoLote }) {
  const reabrir = useReabrirRegistro();

  function handleReabrir(id: number, nombre: string) {
    toast.promise(reabrir.mutateAsync(id), {
      loading: 'Reabriendo…',
      success: `Registro de ${nombre} reabierto`,
      error: 'No se pudo reabrir',
    });
  }

  return (
    <LoteResumenCard grupo={grupo} onReabrir={handleReabrir} reabrirPending={reabrir.isPending} />
  );
}
