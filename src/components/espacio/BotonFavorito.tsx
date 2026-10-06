import { useState } from 'react';
import { Star } from 'lucide-react';
import { alternarFavorito, useEspacio, type TipoEspacio } from '../../utils/espacio';
import { cn } from '../../utils/cn';

// La estrella de la barra de una página: marcarla como favorita (#14).
export default function BotonFavorito({ tipo, id, titulo }: { tipo: TipoEspacio; id: string; titulo: string }) {
  const { favoritos } = useEspacio();
  const [error, setError] = useState<string | null>(null);
  const es = favoritos.some(f => f.tipo === tipo && f.id === id);
  return (
    <span className="relative inline-flex">
      <button type="button" aria-pressed={es}
        title={es ? 'Quitar de favoritos' : 'Añadir a favoritos'} aria-label={es ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        onClick={async () => { setError(null); const e = await alternarFavorito(tipo, id, titulo, null, `/paginas/${id}`); if (e) { setError(e); setTimeout(() => setError(null), 4000); } }}
        className={cn('p-1.5 rounded-lg transition-colors hover:bg-slate-50', es ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500')}>
        <Star className={cn('w-4 h-4', es && 'fill-current')} />
      </button>
      {error && <span role="alert" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 shadow">{error}</span>}
    </span>
  );
}
