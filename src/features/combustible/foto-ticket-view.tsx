'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { urlTicket } from '@/lib/api/combustible';

export function FotoTicketView({ cargaId }: { cargaId: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let cancelado = false;
    setError(false);
    api
      .get(urlTicket(cargaId), { responseType: 'blob' })
      .then((r) => {
        if (cancelado) return;
        url = URL.createObjectURL(r.data);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cargaId]);
  if (error) return <div className="text-sm text-slate">No se pudo cargar el ticket.</div>;
  if (!src) return <div className="text-sm text-slate">Cargando ticket…</div>;
  return <img src={src} alt="Foto del ticket" className="max-h-[70vh] rounded-md" />;
}
