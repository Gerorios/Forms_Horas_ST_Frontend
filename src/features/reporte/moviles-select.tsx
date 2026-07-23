'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Movil } from '@/types/domain';

export function MovilesSelect({
  moviles,
  value,
  onChange,
}: {
  moviles: Movil[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const seleccionados = moviles.filter((m) => value.includes(m.id));

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  if (moviles.length === 0) {
    return <p className="mt-1 text-xs text-slate/70">No hay móviles cargados.</p>;
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-left text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30">
          <span className={seleccionados.length ? 'text-ink' : 'text-slate/70'}>
            {seleccionados.length
              ? `${seleccionados.length} móvil(es) seleccionado(s)`
              : 'Buscar móvil…'}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Buscar por identificador…" />
            <CommandList>
              <CommandEmpty>Sin coincidencias.</CommandEmpty>
              {moviles.map((m) => {
                const activo = value.includes(m.id);
                return (
                  <CommandItem
                    key={m.id}
                    value={`${m.identificador} ${m.descripcion ?? ''}`}
                    data-checked={activo}
                    onSelect={() => toggle(m.id)}
                  >
                    {m.identificador}
                    {m.descripcion && <span className="ml-1 text-slate/60">· {m.descripcion}</span>}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {seleccionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {seleccionados.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className="inline-flex items-center gap-1 rounded-full border border-brand bg-accent px-2.5 py-1 text-xs font-medium text-ink"
            >
              {m.identificador}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
