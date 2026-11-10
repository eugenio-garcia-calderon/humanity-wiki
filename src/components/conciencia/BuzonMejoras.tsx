// «Añadir mejora o comentario» (2026-11-10, Eugenio): the mailbox of the
// consciousness map. Anyone writes, without an account; an administrator marks
// each item done or discarded once it has been applied (or not). The pending
// ones are also at /api/conciencia/comentarios.txt, to paste to the AI.
import { useEffect, useState } from 'react';
import { X, Loader2, Send, Check, Ban, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { BotonOscuro } from './botones';

interface Comentario {
  id: number; texto: string; autor: string | null; estado: 'pendiente' | 'hecha' | 'descartada';
  respuesta: string | null; created_at: string;
}

const ETIQUETA: Record<Comentario['estado'], { t: string; c: string }> = {
  pendiente: { t: 'Pendiente', c: 'bg-amber-200/15 text-amber-100' },
  hecha: { t: 'Hecha', c: 'bg-emerald-300/15 text-emerald-100' },
  descartada: { t: 'Descartada', c: 'bg-white/10 text-slate-400' },
};

function cuando(t: string) {
  const d = new Date(String(t).replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BuzonMejoras({ onCerrar }: { onCerrar(): void }) {
  const [lista, setLista] = useState<Comentario[] | null>(null);
  const [puedeDecidir, setPuedeDecidir] = useState(false);
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState(() => { try { return localStorage.getItem('conciencia.autor') || ''; } catch { return ''; } });
  const [trampa, setTrampa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  // Raw fetch: an endpoint only this mailbox uses (src/pages/CLAUDE.md, the legitimate exception).
  const cargar = () => fetch('/api/conciencia/comentarios', { credentials: 'include' })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(j => { setLista(j.comentarios || []); setPuedeDecidir(!!j.puedeDecidir); })
    .catch(() => setError('No se han podido cargar las propuestas.'));
  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const enviar = async () => {
    if (texto.trim().length < 3) { setError('Escribe tu mejora o comentario.'); return; }
    setEnviando(true); setError(''); setAviso('');
    try {
      try { localStorage.setItem('conciencia.autor', autor.trim()); } catch { /* private mode */ }
      const r = await fetch('/api/conciencia/comentarios', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto.trim(), autor: autor.trim() || undefined, web: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar.');
      setTexto('');
      setAviso('¡Gracias! Tu propuesta está en la lista y se revisará para mejorar el esquema.');
      cargar();
    } catch (e: any) { setError(e.message); } finally { setEnviando(false); }
  };

  const decidir = async (id: number, estado: Comentario['estado']) => {
    try {
      const r = await fetch(`/api/conciencia/comentarios/${id}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se ha podido cambiar.');
      cargar();
    } catch (e: any) { setError(e.message); }
  };

  const pendientes = lista?.filter(c => c.estado === 'pendiente').length ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-950 p-5 text-slate-100 sm:rounded-2xl"
        onClick={e => e.stopPropagation()} role="dialog" aria-label="Añadir mejora o comentario sobre el esquema"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Añadir mejora o comentario</h3>
            <p className="text-xs text-slate-400">¿Falta algo en el esquema, sobra algo o se puede explicar mejor? Escríbelo: cada propuesta se revisa y se aplica al mapa.</p>
          </div>
          <BotonOscuro onClick={onCerrar} aria-label="Cerrar"><X className="h-4 w-4" /></BotonOscuro>
        </div>

        <textarea
          value={texto} onChange={e => setTexto(e.target.value)} maxLength={4000} autoFocus
          placeholder="Por ejemplo: «En el estado onírico añadiría los sueños compartidos…»"
          className="min-h-[120px] w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-amber-200/60 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={autor} onChange={e => setAutor(e.target.value)} maxLength={80} placeholder="Tu nombre (opcional)"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {/* Invisible to people: only a robot fills it in. */}
          <input value={trampa} onChange={e => setTrampa(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="web" />
          <BotonOscuro onClick={enviar} disabled={enviando} className="bg-amber-200/20 px-4 py-2 text-sm text-amber-50 hover:bg-amber-200/30">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
          </BotonOscuro>
        </div>
        {aviso && <p className="mt-2 text-sm text-emerald-200">{aviso}</p>}
        {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}

        <div className="mt-5 border-t border-white/10 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Propuestas recibidas {lista ? `· ${pendientes} pendiente${pendientes === 1 ? '' : 's'}` : ''}
          </h4>
          {!lista && !error && <p className="text-sm text-slate-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando…</p>}
          {lista && !lista.length && <p className="text-sm text-slate-400">Todavía no hay ninguna. La primera puede ser la tuya.</p>}
          <ul className="space-y-2">
            {lista?.map(c => (
              <li key={c.id} className={cn('rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm', c.estado === 'descartada' && 'opacity-60')}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>{c.autor || 'Anónimo'} · {cuando(c.created_at)}</span>
                  <span className={cn('rounded-full px-2 py-0.5', ETIQUETA[c.estado].c)}>{ETIQUETA[c.estado].t}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{c.texto}</p>
                {c.respuesta && <p className="mt-1 text-xs italic text-teal-200">Respuesta: {c.respuesta}</p>}
                {puedeDecidir && (
                  <div className="mt-2 flex gap-1">
                    {c.estado !== 'hecha' && <BotonOscuro onClick={() => decidir(c.id, 'hecha')}><Check className="h-3.5 w-3.5" /> Hecha</BotonOscuro>}
                    {c.estado !== 'descartada' && <BotonOscuro onClick={() => decidir(c.id, 'descartada')}><Ban className="h-3.5 w-3.5" /> Descartar</BotonOscuro>}
                    {c.estado !== 'pendiente' && <BotonOscuro onClick={() => decidir(c.id, 'pendiente')}><RotateCcw className="h-3.5 w-3.5" /> Reabrir</BotonOscuro>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
