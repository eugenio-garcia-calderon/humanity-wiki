// The mailbox of a project page (`/api/buzon/:proyecto`, src/server/buzonProyectos.ts).
// Anyone writes, without an account; an administrator marks each proposal done
// or discarded once it has been applied (or not). Light theme; the dark one of
// the consciousness map is `components/conciencia/BuzonMejoras.tsx`.
import { useEffect, useState } from 'react';
import { X, Loader2, Send, Check, Ban, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Boton } from './piezas';

interface Propuesta {
  id: number; texto: string; autor: string | null; estado: 'pendiente' | 'hecha' | 'descartada';
  respuesta: string | null; created_at: string;
}

const ETIQUETA: Record<Propuesta['estado'], { t: string; c: string }> = {
  pendiente: { t: 'Pendiente', c: 'bg-amber-100 text-amber-900' },
  hecha: { t: 'Aplicada', c: 'bg-emerald-100 text-emerald-900' },
  descartada: { t: 'Descartada', c: 'bg-slate-100 text-slate-500' },
};

function cuando(t: string) {
  const d = new Date(String(t).replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BuzonProyecto({ proyecto, titulo, invitacion, ejemplo, onCerrar }: {
  proyecto: string; titulo: string; invitacion: string; ejemplo: string; onCerrar(): void;
}) {
  const clave = `buzon.${proyecto}.autor`;
  const [lista, setLista] = useState<Propuesta[] | null>(null);
  const [puedeDecidir, setPuedeDecidir] = useState(false);
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState(() => { try { return localStorage.getItem(clave) || ''; } catch { return ''; } });
  const [trampa, setTrampa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  // Raw fetch on purpose: an endpoint only this mailbox uses (src/pages/CLAUDE.md, the legitimate exception).
  const cargar = () => fetch(`/api/buzon/${proyecto}/comentarios`, { credentials: 'include' })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(j => { setLista(j.comentarios || []); setPuedeDecidir(!!j.puedeDecidir); })
    .catch(() => setError('No se han podido cargar las propuestas. Comprueba la conexión y vuelve a abrir el buzón.'));
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const enviar = async () => {
    if (texto.trim().length < 3) { setError('Escribe tu propuesta.'); return; }
    setEnviando(true); setError(''); setAviso('');
    try {
      try { localStorage.setItem(clave, autor.trim()); } catch { /* private mode */ }
      const r = await fetch(`/api/buzon/${proyecto}/comentarios`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto.trim(), autor: autor.trim() || undefined, web: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar.');
      setTexto('');
      setAviso('Enviada. Tu propuesta está en la lista y se revisará para mejorar el modelo.');
      cargar();
    } catch (e: any) { setError(e.message); } finally { setEnviando(false); }
  };

  const decidir = async (id: number, estado: Propuesta['estado']) => {
    try {
      const r = await fetch(`/api/buzon/${proyecto}/comentarios/${id}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se ha podido cambiar.');
      cargar();
    } catch (e: any) { setError(e.message); }
  };

  const pendientes = lista?.filter(c => c.estado === 'pendiente').length ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 text-slate-900 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{titulo}</h3>
            <p className="text-sm text-slate-600">{invitacion}</p>
          </div>
          <Boton onClick={onCerrar} aria-label="Cerrar" className="h-9 w-9 shrink-0 p-0"><X className="h-4 w-4" /></Boton>
        </div>
        <textarea
          value={texto} onChange={e => setTexto(e.target.value)} maxLength={4000} autoFocus
          placeholder={ejemplo} aria-label="Tu propuesta"
          className="min-h-[130px] w-full rounded-xl border border-slate-300 p-3 text-[15px] leading-relaxed placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={autor} onChange={e => setAutor(e.target.value)} maxLength={80} placeholder="Tu nombre (opcional)" aria-label="Tu nombre (opcional)"
            className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none" />
          {/* Invisible to people: only a robot fills it in. */}
          <input value={trampa} onChange={e => setTrampa(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="web" />
          <Boton tono="tinta" onClick={enviar} disabled={enviando}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar propuesta
          </Boton>
        </div>
        {aviso && <p className="mt-2 text-sm text-emerald-700" role="status">{aviso}</p>}
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}

        <div className="mt-6 border-t border-slate-200 pt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-700">Propuestas recibidas{lista ? `: ${pendientes} pendiente${pendientes === 1 ? '' : 's'}` : ''}</h4>
          {!lista && !error && <p className="text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando…</p>}
          {lista && !lista.length && <p className="text-sm text-slate-500">Todavía no hay ninguna. La primera puede ser la tuya.</p>}
          <ul className="space-y-2">
            {lista?.map(c => (
              <li key={c.id} className={cn('rounded-xl border border-slate-200 p-3 text-sm', c.estado === 'descartada' && 'opacity-60')}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{c.autor || 'Anónimo'}, {cuando(c.created_at)}</span>
                  <span className={cn('rounded-full px-2 py-0.5', ETIQUETA[c.estado].c)}>{ETIQUETA[c.estado].t}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{c.texto}</p>
                {c.respuesta && <p className="mt-1 text-xs italic text-slate-600">Respuesta: {c.respuesta}</p>}
                {puedeDecidir && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.estado !== 'hecha' && <Boton className="px-3 py-1 text-xs" onClick={() => decidir(c.id, 'hecha')}><Check className="h-3.5 w-3.5" /> Aplicada</Boton>}
                    {c.estado !== 'descartada' && <Boton className="px-3 py-1 text-xs" onClick={() => decidir(c.id, 'descartada')}><Ban className="h-3.5 w-3.5" /> Descartar</Boton>}
                    {c.estado !== 'pendiente' && <Boton className="px-3 py-1 text-xs" onClick={() => decidir(c.id, 'pendiente')}><RotateCcw className="h-3.5 w-3.5" /> Reabrir</Boton>}
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
