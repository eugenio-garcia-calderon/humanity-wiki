import { useEffect, useRef, useState } from 'react';
import { X, MessageSquare, Check, RotateCcw, Loader2, Trash2, Pencil, CornerDownRight, Quote } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LOS COMENTARIOS DE UNA PÁGINA (2026-10-06, carril «acceso», #11)
// ============================================================================
// Un panel a la derecha con los hilos: abiertos o resueltos. Cada hilo
// enseña el trozo de texto al que está anclado (pulsarlo lleva a él), sus
// respuestas, y deja responder, resolver, reabrir, editar y borrar lo propio.
// Escribir «@» busca a quien ve la página; elegirla la menciona y le avisa.

export type Ancla = { bloque: string; texto: string; antes?: string; despues?: string };
export type Hilo = {
  id: string; autor: string; foto: string | null; cuerpo: string; ancla: Ancla | null; resuelto_en: string | null; resuelto_por: string | null;
  editado_en: string | null; borrado_en: string | null; created_at: string; mio: boolean;
  respuestas: Omit<Hilo, 'respuestas' | 'ancla'>[];
};

const hace = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};
const enviar = (url: string, metodo: string, cuerpo?: any) => fetch(url, {
  method: metodo, credentials: 'include', headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});

/** Las @menciones del texto, en negrita. */
function Cuerpo({ texto }: { texto: string }) {
  const partes = texto.split(/(@[\p{L}\p{N}_.-]+(?: [\p{Lu}][\p{L}]+)?)/u);
  return <>{partes.map((p, i) => (p.startsWith('@') ? <b key={i} className="text-emerald-700">{p}</b> : <span key={i}>{p}</span>))}</>;
}

/** Una caja de texto que sabe de @menciones. */
function Escribir({ paginaId, placeholder, alEnviar, inicial = '', autoFoco }: {
  paginaId: string; placeholder: string; alEnviar: (texto: string, menciones: string[]) => Promise<boolean>; inicial?: string; autoFoco?: boolean;
}) {
  const [texto, setTexto] = useState(inicial);
  const [menciones, setMenciones] = useState<Map<string, string>>(new Map());
  const [opciones, setOpciones] = useState<any[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const caja = useRef<HTMLTextAreaElement>(null);
  const reloj = useRef<any>(null);
  useEffect(() => { if (autoFoco) caja.current?.focus(); }, [autoFoco]);

  const alEscribir = (v: string) => {
    setTexto(v);
    const cursor = caja.current?.selectionStart ?? v.length;
    const m = v.slice(0, cursor).match(/@([\p{L}\p{N}_.-]{1,30})$/u);
    clearTimeout(reloj.current);
    if (!m) { setOpciones([]); return; }
    reloj.current = setTimeout(() => {
      fetch(`/api/comentarios/pagina/${encodeURIComponent(paginaId)}/mencionables?q=${encodeURIComponent(m[1])}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : { personas: [] })).then(j => setOpciones(j.personas || [])).catch(() => {});
    }, 200);
  };
  const elegir = (p: any) => {
    const cursor = caja.current?.selectionStart ?? texto.length;
    const antes = texto.slice(0, cursor).replace(/@([\p{L}\p{N}_.-]{1,30})$/u, `@${p.nombre} `);
    setTexto(antes + texto.slice(cursor));
    setMenciones(m => new Map(m).set(p.id, p.nombre));
    setOpciones([]);
    caja.current?.focus();
  };
  const mandar = async () => {
    if (!texto.trim() || ocupado) return;
    setOcupado(true);
    // Sólo cuentan las menciones cuyo nombre sigue escrito.
    const ids = [...menciones].filter(([, n]) => texto.includes(`@${n}`)).map(([id]) => id);
    const ok = await alEnviar(texto.trim(), ids);
    setOcupado(false);
    if (ok) { setTexto(''); setMenciones(new Map()); }
  };
  return (
    <div className="relative">
      <textarea ref={caja} value={texto} onChange={e => alEscribir(e.target.value)} rows={2} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); mandar(); } if (e.key === 'Escape') setOpciones([]); }}
        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-emerald-300 sm:text-sm" />
      {opciones.length > 0 && (
        <div className="absolute inset-x-0 bottom-full z-10 mb-1 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {opciones.map(p => (
            <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); elegir(p); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-slate-50">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-500">{(p.nombre || '?').charAt(0)}</span>}
              {p.nombre}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">@ para mencionar · ⌘↵ para enviar</span>
        <button type="button" onClick={mandar} disabled={!texto.trim() || ocupado}
          className="flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-40">
          {ocupado && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enviar
        </button>
      </div>
    </div>
  );
}

export default function PanelComentarios({ paginaId, borrador, foco, onCerrar, onCambio, onIrA }: {
  paginaId: string;
  /** Un hilo nuevo anclado al trozo seleccionado, si lo hay. */
  borrador: Ancla | null;
  /** El hilo a enseñar arriba (al pulsar un trozo resaltado). */
  foco: string | null;
  onCerrar: () => void;
  /** Para repintar los resaltados y el contador. */
  onCambio: (hilos: Hilo[]) => void;
  onIrA: (a: Ancla) => void;
}) {
  const [hilos, setHilos] = useState<Hilo[] | null>(null);
  const [puedo, setPuedo] = useState<{ comentar: boolean; resolver: boolean; gestionar: boolean }>({ comentar: false, resolver: false, gestionar: false });
  const [vista, setVista] = useState<'abiertos' | 'resueltos'>('abiertos');
  const [editando, setEditando] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<Ancla | null>(borrador);
  useEffect(() => setNuevo(borrador), [borrador]);
  const base = `/api/comentarios/pagina/${encodeURIComponent(paginaId)}`;

  const cargar = () => fetch(base, { credentials: 'include' }).then(async r => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFallo(j.error || 'No se han podido cargar.'); setHilos([]); return; }
    setHilos(j.hilos); setPuedo(j.puedo); onCambio(j.hilos);
  });
  useEffect(() => { cargar(); }, [paginaId]);
  useEffect(() => {
    if (!foco) return;
    const h = hilos?.find(x => x.id === foco);
    if (h) setVista(h.resuelto_en ? 'resueltos' : 'abiertos');
    setTimeout(() => document.getElementById(`hilo-${foco}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  }, [foco, hilos]);

  const tras = async (r: Response) => {
    if (!r.ok) { setFallo((await r.json().catch(() => ({}))).error || 'No se ha podido.'); return false; }
    setFallo(null); await cargar(); return true;
  };
  const publicar = (cuerpo: string, menciones: string[], extra: any) => enviar(base, 'POST', { cuerpo, menciones, ...extra }).then(tras);

  const abiertos = (hilos || []).filter(h => !h.resuelto_en);
  const resueltos = (hilos || []).filter(h => h.resuelto_en);
  const lista = vista === 'abiertos' ? abiertos : resueltos;

  const comentarioUno = (c: any, hiloId: string, esRaiz: boolean) => (
    <div key={c.id} className={cn('group', !esRaiz && 'mt-2 border-l-2 border-slate-100 pl-2.5')}>
      <div className="flex items-center gap-1.5">
        {c.foto ? <img src={c.foto} alt="" className="h-5 w-5 rounded-full object-cover" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[9px] font-black text-slate-500">{(c.autor || '?').charAt(0)}</span>}
        <span className="text-[12px] font-bold text-slate-700">{c.autor}</span>
        <span className="text-[10px] text-slate-400">{hace(c.created_at)}{c.editado_en ? ' · editado' : ''}</span>
        {!c.borrado_en && (c.mio || puedo.gestionar) && (
          <span className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {c.mio && <button onClick={() => setEditando(c.id)} aria-label="Editar" className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>}
            <button onClick={async () => { if (confirm('¿Borrar este comentario?')) await tras(await enviar(`/api/comentarios/${c.id}`, 'DELETE')); }} aria-label="Borrar"
              className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </span>
        )}
      </div>
      {editando === c.id
        ? <div className="mt-1"><Escribir paginaId={paginaId} placeholder="Edita tu comentario" inicial={c.cuerpo} autoFoco
            alEnviar={async t => { const ok = await tras(await enviar(`/api/comentarios/${c.id}`, 'PUT', { cuerpo: t })); if (ok) setEditando(null); return ok; }} /></div>
        : <p className={cn('mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed', c.borrado_en ? 'italic text-slate-300' : 'text-slate-700')}>
            {c.borrado_en ? 'Comentario borrado' : <Cuerpo texto={c.cuerpo} />}
          </p>}
    </div>
  );

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-[9993] flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl" aria-label="Comentarios">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="flex items-center gap-1.5 text-sm font-black text-slate-800"><MessageSquare className="h-4 w-4" /> Comentarios</p>
        <button onClick={onCerrar} aria-label="Cerrar los comentarios" className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2">
        {([['abiertos', `Abiertos · ${abiertos.length}`], ['resueltos', `Resueltos · ${resueltos.length}`]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setVista(k)} className={cn('h-8 rounded-full px-3 text-xs font-bold', vista === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{t}</button>
        ))}
      </div>
      {fallo && <p className="mx-3 mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">{fallo}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {puedo.comentar && vista === 'abiertos' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-2.5">
            {nuevo ? (
              <div className="mb-2 flex items-start gap-1.5 text-[12px] text-slate-600">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="line-clamp-3 italic">{nuevo.texto}</span>
                <button onClick={() => setNuevo(null)} aria-label="Quitar el trozo" className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : <p className="mb-1.5 text-[11px] text-slate-500">Comenta la página, o selecciona un trozo de texto para comentar justo ahí.</p>}
            <Escribir paginaId={paginaId} placeholder={nuevo ? 'Comenta este trozo…' : 'Comenta la página…'} autoFoco={!!nuevo}
              alEnviar={async (t, m) => { const ok = await publicar(t, m, nuevo ? { ancla: nuevo } : {}); if (ok) setNuevo(null); return ok; }} />
          </div>
        )}
        {!hilos && <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</p>}
        {hilos && !lista.length && <p className="py-6 text-center text-xs text-slate-400">{vista === 'abiertos' ? 'No hay conversaciones abiertas.' : 'No hay nada resuelto todavía.'}</p>}
        {lista.map(h => (
          <div key={h.id} id={`hilo-${h.id}`} className={cn('rounded-2xl border p-3 transition-colors', foco === h.id ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white')}>
            {h.ancla && (
              <button onClick={() => onIrA(h.ancla!)} title="Ir al trozo"
                className="mb-2 flex w-full items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-left text-[12px] italic text-slate-600 hover:bg-amber-100">
                <Quote className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /><span className="line-clamp-2">{h.ancla.texto}</span>
              </button>
            )}
            {comentarioUno(h, h.id, true)}
            {h.respuestas.map(r => comentarioUno(r, h.id, false))}
            {h.resuelto_en && <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700"><Check className="h-3 w-3" /> Resuelto{h.resuelto_por ? ` por ${h.resuelto_por}` : ''} · {hace(h.resuelto_en)}</p>}
            <div className="mt-2 flex items-center gap-1">
              {(h.mio || puedo.resolver) && (
                <button onClick={async () => tras(await enviar(`/api/comentarios/${h.id}/resolver`, 'POST', { resuelto: !h.resuelto_en }))}
                  className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100">
                  {h.resuelto_en ? <><RotateCcw className="h-3.5 w-3.5" /> Reabrir</> : <><Check className="h-3.5 w-3.5" /> Resolver</>}
                </button>
              )}
            </div>
            {puedo.comentar && !h.resuelto_en && (
              <div className="mt-1 flex gap-1.5">
                <CornerDownRight className="mt-2.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                <div className="min-w-0 flex-1"><Escribir paginaId={paginaId} placeholder="Responder…" alEnviar={(t, m) => publicar(t, m, { hilo_id: h.id })} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
