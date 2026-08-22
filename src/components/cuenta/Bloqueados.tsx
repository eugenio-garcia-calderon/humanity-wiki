import { useEffect, useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';

/*
 * A QUIÉN HE BLOQUEADO (2026-08-22, Programador 3)
 * ============================================================================
 * LA PUERTA DE VUELTA. Bloquear sin una lista donde desbloquear es una acción
 * de un solo sentido: la persona que se arrepiente no tiene dónde ir, porque lo
 * de la otra ya no aparece en ninguna pantalla — que es exactamente lo que el
 * bloqueo hace. Sin esta lista, el único sitio donde vería su nombre es este,
 * y no existiría.
 *
 * Y ESTÁ EN CONFIGURACIÓN, no escondida en un perfil. Es donde la gente va a
 * buscar «lo que decidí una vez sobre esta cuenta», junto a borrar la cuenta.
 *
 * El servidor solo devuelve a quién he bloqueado YO. Quién me ha bloqueado a mí
 * no se puede consultar, aquí ni en ningún sitio: saberlo convierte el bloqueo
 * en un mensaje, y deja de proteger a quien lo puso.
 */

type Bloqueado = {
  id: number;
  bloqueado_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export function Bloqueados() {
  const [lista, setLista] = useState<Bloqueado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soltando, setSoltando] = useState<number | null>(null);

  const cargar = async () => {
    try {
      const r = await fetch('/api/bloqueos', { credentials: 'include' });
      if (!r.ok) throw new Error('No se ha podido cargar la lista.');
      setLista(await r.json());
    } catch (e: any) {
      setError(e.message);
      setLista([]);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const desbloquear = async (b: Bloqueado) => {
    setSoltando(b.id);
    try {
      const r = await fetch(`/api/bloqueos/${b.id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se ha podido desbloquear.');
      setLista(l => (l || []).filter(x => x.id !== b.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSoltando(null);
    }
  };

  // NADA CUANDO NO HAY NADA. La mayoría de la gente no bloquea a nadie nunca;
  // una sección vacía titulada «Personas bloqueadas» en sus ajustes le sugiere
  // un problema que no tiene.
  if (!lista) return null;
  if (!lista.length) return null;

  return (
    <section>
      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 inline-flex items-center gap-1.5">
        <Ban className="w-3 h-3" /> Personas bloqueadas
      </h2>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        No veis nada el uno del otro. Al desbloquear vuelve a aparecer lo suyo —
        pero <strong>no se recuperan los seguimientos</strong> que teníais antes.
      </p>

      {error && (
        <p className="mb-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <ul className="space-y-1.5">
        {lista.map(b => (
          <li key={b.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
            {b.avatar_url
              ? <img src={b.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-slate-400 text-xs font-black">
                  {(b.display_name || '?').slice(0, 1).toUpperCase()}
                </div>}
            <span className="flex-1 text-sm font-bold text-slate-800 truncate">
              {b.display_name || b.bloqueado_id}
            </span>
            <button
              onClick={() => desbloquear(b)}
              disabled={soltando === b.id}
              className="min-h-[36px] px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {soltando === b.id && <Loader2 className="w-3 h-3 animate-spin" />}
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
