import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Loader2, ExternalLink, ChevronLeft, ChevronRight, Lock, Check, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { estadoDe, type Consola, type Eslabon, type EstadoEslabon, type EstadoManual } from '../../utils/consola';

// ============================================================================
// LA CONSOLA: LA CADENA DE VALOR EN CÍRCULO (2026-10-08)
// ============================================================================
// Eugenio: «cada sección en un círculo, todos conectados formando un gran
// círculo; al hacer clic se abre un pop-up con los objetivos, las tareas
// pendientes, el estado, las personas, los protocolos… y un código de colores
// rojo, amarillo y verde para saber dónde poner el foco».
//
// El color de cada eslabón es el que fija una persona o, en «automático», el que
// sale del avance de sus objetivos y tareas. SIN NADA QUE MEDIR sale gris
// («sin datos»): un verde inventado diría que todo va bien sin saberlo. Más
// adelante la tienda y el almacén escribirán aquí sus métricas en tiempo real.
//
// Es sólo para quien gestiona la página y sólo se abre desde humanity.wiki: el
// servidor lo exige (`consola.ts`); esta pantalla no es la que decide.

const COLOR: Record<EstadoEslabon, { aro: string; relleno: string; texto: string; nombre: string; ayuda: string }> = {
  rojo: { aro: '#e11d48', relleno: '#fff1f2', texto: '#9f1239', nombre: 'Crítico', ayuda: 'Un punto débil que te atasca: hace falta una solución ya.' },
  amarillo: { aro: '#f59e0b', relleno: '#fffbeb', texto: '#92400e', nombre: 'A mejorar', ayuda: 'Funciona, pero hay que mejorarlo.' },
  verde: { aro: '#10b981', relleno: '#ecfdf5', texto: '#065f46', nombre: 'Va bien', ayuda: 'De momento, bien.' },
  sin_datos: { aro: '#94a3b8', relleno: '#f8fafc', texto: '#475569', nombre: 'Sin datos', ayuda: 'Añade objetivos o tareas, o fija el estado tú.' },
};
const ORDEN_FOCO: EstadoEslabon[] = ['rojo', 'amarillo', 'sin_datos', 'verde'];
const nuevoId = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export default function ConsolaCadena({ paginaId, titulo, onCerrar }: { paginaId: string; titulo: string; onCerrar: () => void }) {
  const [consola, setConsola] = useState<Consola | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<'guardado' | 'guardando' | 'error'>('guardado');
  const [abierto, setAbierto] = useState<string | null>(null);
  const cambios = useRef(0);
  const temporizador = useRef<number | undefined>(undefined);
  const ultima = useRef<Consola | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/consola/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) { setError(r.status === 403 ? 'La consola es solo para quien gestiona esta web.' : r.status === 404 ? 'La consola solo se abre desde humanity.wiki.' : j.error || 'No se ha podido abrir la consola.'); return; }
        setConsola(j.consola);
      }).catch(() => vivo && setError('No hay conexión con el servidor.'));
    return () => { vivo = false; };
  }, [paginaId]);

  // Se guarda sola, un momento después del último cambio. Al cerrar se guarda lo pendiente.
  const guardarYa = async () => {
    if (!ultima.current) return;
    const mio = ++cambios.current;
    setGuardado('guardando');
    try {
      const r = await fetch(`/api/consola/${encodeURIComponent(paginaId)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consola: ultima.current }) });
      if (mio === cambios.current) setGuardado(r.ok ? 'guardado' : 'error');
    } catch { if (mio === cambios.current) setGuardado('error'); }
  };
  const poner = (n: Consola) => {
    setConsola(n); ultima.current = n; setGuardado('guardando');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(guardarYa, 700);
  };
  const cerrar = () => { window.clearTimeout(temporizador.current); if (ultima.current && guardado === 'guardando') guardarYa(); onCerrar(); };
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { if (abierto) setAbierto(null); else cerrar(); } };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const eslabones = consola?.eslabones || [];
  const estados = useMemo(() => eslabones.map(x => estadoDe(x)), [consola]);
  const cambiarEslabon = (id: string, p: Partial<Eslabon>) => consola && poner({ eslabones: consola.eslabones.map(x => (x.id === id ? { ...x, ...p } : x)) });
  const actual = eslabones.find(x => x.id === abierto) || null;
  const foco = eslabones.map((x, i) => ({ x, e: estados[i] })).filter(f => f.e === 'rojo' || f.e === 'amarillo').sort((a, b) => ORDEN_FOCO.indexOf(a.e) - ORDEN_FOCO.indexOf(b.e));

  const anadir = () => {
    if (!consola || consola.eslabones.length >= 12) return;
    const x: Eslabon = { id: nuevoId('e'), nombre: 'Nuevo eslabón', icono: '⭕', descripcion: '', estado: 'auto', objetivos: [], tareas: [], personas: [], protocolos: [], notas: '' };
    poner({ eslabones: [...consola.eslabones, x] });
    setAbierto(x.id);
  };

  // Los eslabones, repartidos por el círculo. El primero arriba y en el sentido del reloj.
  const N = Math.max(eslabones.length, 1);
  const punto = (i: number) => { const a = (-90 + (360 / N) * i) * (Math.PI / 180); return { x: 50 + 36 * Math.cos(a), y: 50 + 36 * Math.sin(a), a }; };
  // Una flecha curva entre cada eslabón y el siguiente (el último vuelve al primero).
  const flechas = eslabones.map((_, i) => {
    const a0 = (-90 + (360 / N) * i) * (Math.PI / 180), a1 = (-90 + (360 / N) * (i + 1)) * (Math.PI / 180);
    const hueco = 0.2;                        // radianes que se dejan libres junto a cada círculo
    const s = a0 + hueco, f = a1 - hueco, R = 36;
    const P = (a: number) => [50 + R * Math.cos(a), 50 + R * Math.sin(a)];
    const [x0, y0] = P(s), [x1, y1] = P(f);
    return { d: `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`, x1, y1, ang: f + Math.PI / 2, id: i };
  });

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex bg-slate-900/50" onClick={cerrar} role="dialog" aria-label="Consola de la cadena de valor">
      <div onClick={e => e.stopPropagation()} className="m-auto flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[94vh] sm:w-[96vw] sm:max-w-[1200px] sm:rounded-2xl">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <h2 className="text-sm font-black text-slate-800">Consola · {titulo || 'Mi negocio'}</h2>
          <span className="hidden items-center gap-1 text-[11px] text-slate-400 md:inline-flex"><Lock className="h-3 w-3" /> Privada: solo la ves tú y quien gestiona esta web, desde humanity.wiki.</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400" aria-live="polite">
            {guardado === 'guardando' ? <><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</> : guardado === 'error' ? <span className="text-rose-600">No se ha guardado</span> : <><Check className="h-3 w-3" /> Guardado</>}
          </span>
          <button onClick={cerrar} aria-label="Cerrar" className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="m-auto max-w-sm px-6 text-center text-sm font-bold text-rose-600">{error}</p>}
        {!error && !consola && <div className="m-auto"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}

        {consola && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
            {/* El círculo */}
            <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
              <div className="relative aspect-square w-full max-w-[640px]">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
                  <defs>
                    <marker id="punta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 1 L 8 5 L 0 9 z" fill="#cbd5e1" />
                    </marker>
                  </defs>
                  {N > 1 && flechas.map(f => <path key={f.id} d={f.d} fill="none" stroke="#cbd5e1" strokeWidth="0.7" strokeDasharray="1.6 1.2" markerEnd="url(#punta)" />)}
                </svg>
                <div className="absolute left-1/2 top-1/2 w-[34%] -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cadena de valor</p>
                  <p className="mt-1 text-sm font-black leading-tight text-slate-700 sm:text-base">{titulo || 'Mi negocio'}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{foco.length ? `${foco.filter(f => f.e === 'rojo').length} crítico(s), ${foco.filter(f => f.e === 'amarillo').length} a mejorar` : 'Pincha un eslabón'}</p>
                </div>
                {eslabones.map((x, i) => {
                  const p = punto(i); const c = COLOR[estados[i]];
                  return (
                    <button key={x.id} type="button" onClick={() => setAbierto(x.id)}
                      style={{ left: `${p.x}%`, top: `${p.y}%`, borderColor: c.aro, background: c.relleno, color: c.texto }}
                      aria-label={`${i + 1}. ${x.nombre}: ${c.nombre}`}
                      className="absolute flex h-[22%] w-[22%] min-h-[64px] min-w-[64px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border-[3px] p-1.5 text-center shadow-md transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      <span className="text-xl leading-none sm:text-2xl" aria-hidden>{x.icono || '⭕'}</span>
                      <span className="line-clamp-2 text-[9px] font-black leading-tight sm:text-[11px]">{x.nombre}</span>
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: c.aro }}>{i + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* La leyenda y dónde poner el foco */}
            <aside className="shrink-0 space-y-5 border-t border-slate-100 p-5 lg:w-80 lg:border-l lg:border-t-0 lg:overflow-y-auto">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Dónde poner el foco</p>
                {foco.length === 0 && <p className="text-xs text-slate-400">{estados.every(e => e === 'sin_datos') ? 'Aún no hay nada que medir: abre un eslabón y añade sus objetivos y tareas.' : 'Nada en rojo ni en amarillo. Bien.'}</p>}
                <ul className="space-y-1.5">
                  {foco.map(({ x, e }) => (
                    <li key={x.id}>
                      <button onClick={() => setAbierto(x.id)} className="flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left hover:bg-slate-50" style={{ borderColor: COLOR[e].aro + '66' }}>
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR[e].aro }} />
                        <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-slate-800">{x.nombre}</span>
                          <span className="block text-[11px] text-slate-500">{x.notas ? x.notas.slice(0, 80) : COLOR[e].nombre}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Qué significa cada color</p>
                <ul className="space-y-1.5">
                  {(['rojo', 'amarillo', 'verde', 'sin_datos'] as EstadoEslabon[]).map(e => (
                    <li key={e} className="flex items-start gap-2 text-xs text-slate-600"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR[e].aro }} /><span><b className="text-slate-800">{COLOR[e].nombre}.</b> {COLOR[e].ayuda}</span></li>
                  ))}
                </ul>
              </div>
              <button onClick={anadir} disabled={eslabones.length >= 12}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> Añadir un eslabón a la cadena
              </button>
              <p className="text-[11px] leading-snug text-slate-400">Próximamente: la tienda y el almacén escribirán aquí sus números en tiempo real.</p>
            </aside>
          </div>
        )}

        {actual && consola && (
          <Eslabon_
            x={actual} indice={eslabones.findIndex(e => e.id === actual.id)} total={eslabones.length} estado={estados[eslabones.findIndex(e => e.id === actual.id)]}
            onCambio={p => cambiarEslabon(actual.id, p)} onCerrar={() => setAbierto(null)}
            onIr={d => { const i = eslabones.findIndex(e => e.id === actual.id); setAbierto(eslabones[(i + d + eslabones.length) % eslabones.length].id); }}
            onBorrar={() => { if (eslabones.length > 1 && window.confirm(`¿Quitar «${actual.nombre}» de la cadena?`)) { poner({ eslabones: eslabones.filter(e => e.id !== actual.id) }); setAbierto(null); } }}
            onMover={d => {
              const i = eslabones.findIndex(e => e.id === actual.id); const j = i + d;
              if (j < 0 || j >= eslabones.length) return;
              const n = [...eslabones]; [n[i], n[j]] = [n[j], n[i]]; poner({ eslabones: n });
            }} />
        )}
      </div>
    </div>,
    document.body,
  );
}

// Piezas del pop-up, fuera de `Eslabon_`: dentro se volverían a crear en cada pulsación y quien escribe
// una línea nueva perdería lo escrito en cuanto se guardara otra cosa.
const campo = 'h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-emerald-400';
function Titulo({ t, n }: { t: string; n?: string }) {
  return <p className="mb-1.5 flex items-baseline gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">{t}{n && <span className="font-bold normal-case tracking-normal text-slate-300">{n}</span>}</p>;
}
/** Una línea nueva: se escribe y se añade con Intro. */
function Nueva({ placeholder, alAnadir }: { placeholder: string; alAnadir: (v: string) => void }) {
  const [v, setV] = useState('');
  const dar = () => { if (v.trim()) { alAnadir(v.trim()); setV(''); } };
  return (
    <div className="mt-1.5 flex gap-1.5">
      <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={campo}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dar(); } }} />
      <button type="button" onClick={dar} disabled={!v.trim()} aria-label="Añadir" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
function Quitar({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="Quitar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>;
}

/** El pop-up de un eslabón: su estado y todo lo que cuelga de él. */
function Eslabon_({ x, indice, total, estado, onCambio, onCerrar, onIr, onBorrar, onMover }: {
  x: Eslabon; indice: number; total: number; estado: EstadoEslabon;
  onCambio: (p: Partial<Eslabon>) => void; onCerrar: () => void; onIr: (d: number) => void; onBorrar: () => void; onMover: (d: number) => void;
}) {
  const c = COLOR[estado];
  const hechos = [...x.objetivos, ...x.tareas].filter(i => i.hecho).length;
  const totalItems = x.objetivos.length + x.tareas.length;
  return (
    <div className="fixed inset-0 z-[10001] flex items-end bg-slate-900/40 sm:items-center sm:justify-center" onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl" role="dialog" aria-label={x.nombre}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ background: c.relleno, borderColor: c.aro + '55' }}>
          <button onClick={() => onIr(-1)} aria-label="Eslabón anterior" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/60"><ChevronLeft className="h-4 w-4" style={{ color: c.texto }} /></button>
          <input value={x.icono} onChange={e => onCambio({ icono: e.target.value.slice(0, 8) })} aria-label="Icono (un emoji)" className="h-11 w-11 shrink-0 rounded-xl border border-white/80 bg-white/70 text-center text-2xl outline-none" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.texto }}>Eslabón {indice + 1} de {total}</p>
            <input value={x.nombre} onChange={e => onCambio({ nombre: e.target.value })} aria-label="Nombre del eslabón" className="w-full bg-transparent text-base font-black text-slate-900 outline-none" />
          </div>
          <button onClick={() => onIr(1)} aria-label="Eslabón siguiente" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/60"><ChevronRight className="h-4 w-4" style={{ color: c.texto }} /></button>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/60"><X className="h-4 w-4" style={{ color: c.texto }} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <Titulo t="Estado" n={x.estado === 'auto' ? (totalItems ? `automático · ${hechos} de ${totalItems} hechos` : 'automático · sin objetivos ni tareas') : 'fijado por ti'} />
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Estado del eslabón">
              {([['auto', 'Auto', '#64748b'], ['rojo', 'Crítico', COLOR.rojo.aro], ['amarillo', 'Mejorar', COLOR.amarillo.aro], ['verde', 'Bien', COLOR.verde.aro]] as [EstadoManual, string, string][]).map(([k, l, col]) => (
                <button key={k} role="radio" aria-checked={x.estado === k} onClick={() => onCambio({ estado: k })}
                  className={cn('h-10 rounded-lg border text-[11px] font-black', k === 'auto' && 'col-span-2', x.estado === k ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                  style={x.estado === k ? { background: col, borderColor: col } : { borderColor: '#e2e8f0' }}>{l}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">Ahora: <b style={{ color: c.texto }}>{c.nombre}</b>. {c.ayuda}</p>
          </div>

          <div>
            <Titulo t="Qué es" />
            <textarea value={x.descripcion} onChange={e => onCambio({ descripcion: e.target.value })} rows={2} placeholder="De qué trata este eslabón…" aria-label="Descripción"
              className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-400" />
          </div>

          <div>
            <Titulo t="Por qué este color" n={estado === 'rojo' ? 'qué te atasca' : estado === 'amarillo' ? 'qué hay que mejorar' : ''} />
            <textarea value={x.notas} onChange={e => onCambio({ notas: e.target.value })} rows={2} placeholder="Qué te atasca, qué hay que resolver, qué decisión falta…" aria-label="Por qué este color"
              className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-400" />
            {estado === 'rojo' && !x.notas.trim() && <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600"><AlertTriangle className="h-3 w-3" /> Dilo en una frase: es lo primero que se lee desde fuera.</p>}
          </div>

          {([['Objetivos', 'objetivos', 'Nuevo objetivo…'], ['Tareas pendientes', 'tareas', 'Nueva tarea…']] as const).map(([t, k, ph]) => {
            const lista = x[k] as any[];
            return (
              <div key={k}>
                <Titulo t={t} n={lista.length ? `${lista.filter(i => i.hecho).length} de ${lista.length}` : undefined} />
                <ul className="space-y-0.5">
                  {lista.map(i => (
                    <li key={i.id} className="flex items-center gap-1">
                      <label className="flex min-h-[40px] min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 hover:bg-slate-50">
                        <input type="checkbox" checked={i.hecho} onChange={e => onCambio({ [k]: lista.map(o => (o.id === i.id ? { ...o, hecho: e.target.checked } : o)) } as any)} className="h-4 w-4 shrink-0 accent-emerald-600" />
                        <span className={cn('min-w-0 flex-1 text-sm', i.hecho ? 'text-slate-400 line-through' : 'text-slate-800')}>{i.texto}</span>
                      </label>
                      {k === 'tareas' && (
                        <input value={i.responsable} onChange={e => onCambio({ tareas: lista.map(o => (o.id === i.id ? { ...o, responsable: e.target.value } : o)) })} placeholder="Quién" aria-label="Responsable"
                          className="h-8 w-20 shrink-0 rounded-md border border-transparent px-1.5 text-xs text-slate-500 outline-none hover:border-slate-200 focus:border-emerald-400" />
                      )}
                      <Quitar onClick={() => onCambio({ [k]: lista.filter(o => o.id !== i.id) } as any)} />
                    </li>
                  ))}
                </ul>
                <Nueva placeholder={ph} alAnadir={v => onCambio({ [k]: [...lista, { id: nuevoId(k[0]), texto: v, hecho: false, ...(k === 'tareas' ? { responsable: '' } : {}) }] } as any)} />
              </div>
            );
          })}

          <div>
            <Titulo t="Personas que trabajan en ello" />
            <ul className="space-y-0.5">
              {x.personas.map(p => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">{p.nombre.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{p.nombre}</span>{p.rol && <span className="block truncate text-[11px] text-slate-400">{p.rol}</span>}</span>
                  <Quitar onClick={() => onCambio({ personas: x.personas.filter(o => o.id !== p.id) })} />
                </li>
              ))}
            </ul>
            <Nueva placeholder="Nombre (y rol, con una coma: Ana, logística)…" alAnadir={v => { const [nombre, ...r] = v.split(','); onCambio({ personas: [...x.personas, { id: nuevoId('p'), nombre: nombre.trim(), rol: r.join(',').trim() }] }); }} />
          </div>

          <div>
            <Titulo t="Protocolos en marcha" />
            <ul className="space-y-0.5">
              {x.protocolos.map(p => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{p.titulo}</span>
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${p.titulo}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  <Quitar onClick={() => onCambio({ protocolos: x.protocolos.filter(o => o.id !== p.id) })} />
                </li>
              ))}
            </ul>
            <Nueva placeholder="Título del protocolo (y su enlace tras una coma)…" alAnadir={v => { const i = v.indexOf(','); const titulo = (i < 0 ? v : v.slice(0, i)).trim(); const url = i < 0 ? '' : v.slice(i + 1).trim(); onCambio({ protocolos: [...x.protocolos, { id: nuevoId('r'), titulo, url }] }); }} />
          </div>
        </div>

        <div className="flex items-center gap-1 border-t border-slate-100 px-4 py-2">
          <button onClick={() => onMover(-1)} disabled={indice === 0} className="h-9 rounded-lg px-2.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30">← Antes</button>
          <button onClick={() => onMover(1)} disabled={indice === total - 1} className="h-9 rounded-lg px-2.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30">Después →</button>
          <button onClick={onBorrar} disabled={total <= 1} className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Quitar eslabón</button>
        </div>
      </div>
    </div>
  );
}
