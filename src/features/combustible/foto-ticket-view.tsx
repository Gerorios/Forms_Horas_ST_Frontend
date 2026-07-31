'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { urlTicket } from '@/lib/api/combustible';

export function FotoTicketView({ cargaId }: { cargaId: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    api.get(urlTicket(cargaId), { responseType: 'blob' }).then((r) => {
      url = URL.createObjectURL(r.data);
      setSrc(url);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [cargaId]);
  if (!src) return <div className="text-sm text-muted-foreground">Cargando ticket…</div>;
  return <img src={src} alt="Foto del ticket" className="max-h-[70vh] rounded-md" />;
}
