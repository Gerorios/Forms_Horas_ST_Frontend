'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { PillActivo } from '@/features/admin/pill-activo';
import { CardsSkeleton } from '@/components/skeleton';
import { ErrorCarga } from './error-carga';
import { mensajeDeError } from '@/lib/api/liquidacion';
import {
  useCatalogoAdmin,
  useCrearEnCatalogo,
  useEditarEnCatalogo,
  type CatalogoSeguridad,
  type ItemCatalogoAdmin,
} from '@/lib/api/seguridad';

const inputCls =
  'min-h-11 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

function Fila({ catalogo, item }: { catalogo: CatalogoSeguridad; item: ItemCatalogoAdmin }) {
  const editar = useEditarEnCatalogo(catalogo);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(item.nombre);
  const puedeGuardar = nombre.trim() !== '' && nombre.trim() !== item.nombre && !editar.isPending;

  function guardar(cambios: { nombre?: string; activo?: boolean }, exito: string) {
    const promesa = editar.mutateAsync({ id: item.id, cambios });
    toast.promise(promesa, { loading: 'Guardando…', success: exito, error: (e) => mensajeDeError(e, 'No se pudo guardar') });
    return promesa;
  }

  return (
    <li className="text-sm text-ink">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className={item.activo ? '' : 'text-slate line-through'}>{item.nombre}</span>
        <div className="ml-auto flex items-center gap-2">
          <PillActivo
            activo={item.activo}
            nombre={item.nombre}
            efecto="Deja de aparecer en el formulario de reportes. Los reportes que ya la usan la conservan."
            disabled={editar.isPending}
            onToggle={() => guardar({ activo: !item.activo }, item.activo ? 'Desactivado' : 'Activado')}
          />
          <Button variant="secondary" size="sm" onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Cerrar' : 'Renombrar ▾'}
          </Button>
        </div>
      </div>
      {abierto && (
        <div className="flex flex-wrap items-end gap-2 bg-accent/20 px-4 py-3">
          <label className="flex min-w-56 flex-col gap-1 text-sm font-medium">
            Nombre
            <input aria-label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </label>
          <Button
            variant="primary"
            disabled={!puedeGuardar}
            onClick={() =>
              guardar({ nombre: nombre.trim() }, 'Nombre actualizado')
                .then(() => setAbierto(false))
                .catch(() => undefined)
            }
          >
            Guardar
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * Un catálogo del módulo de seguridad (naturalezas o motivos de
 * paralización). Lo mantiene solo Admin; una entrada en desuso se desactiva,
 * nunca se borra: los reportes viejos la siguen apuntando.
 */
export function CatalogoSeguridadAdmin({ catalogo, titulo, ayuda }: { catalogo: CatalogoSeguridad; titulo: string; ayuda: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useCatalogoAdmin(catalogo);
  const crear = useCrearEnCatalogo(catalogo);
  const [nombre, setNombre] = useState('');

  function agregar() {
    if (!nombre.trim()) return;
    const promesa = crear.mutateAsync(nombre.trim());
    toast.promise(promesa, { loading: 'Guardando…', success: 'Agregado', error: (e) => mensajeDeError(e, 'No se pudo agregar') });
    promesa.then(() => setNombre('')).catch(() => undefined);
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">{titulo}</h2>
        <p className="text-sm text-slate">{ayuda}</p>
      </div>
      <div className="flex gap-2">
        <input
          aria-label={`Nuevo: ${titulo}`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className={`flex-1 ${inputCls}`}
        />
        <Button variant="primary" disabled={crear.isPending || !nombre.trim()} onClick={agregar}>
          Agregar
        </Button>
      </div>
      {isError ? (
        <ErrorCarga que={titulo.toLowerCase()} onReintentar={() => refetch()} reintentando={isFetching} />
      ) : isLoading ? (
        <CardsSkeleton count={3} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {(data ?? []).map((i) => (
            <Fila key={i.id} catalogo={catalogo} item={i} />
          ))}
          {(data ?? []).length === 0 && <li className="px-4 py-2.5 text-sm text-slate">Todavía no hay ninguna: agregá la primera arriba.</li>}
        </ul>
      )}
    </section>
  );
}
