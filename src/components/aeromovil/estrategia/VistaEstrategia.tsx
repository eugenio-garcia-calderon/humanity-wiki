// «Estrategia» (/aeromovil/estrategia, 2026-11-19): the decision tree from today to the factory, drawn left to right.
// The tree is data (`arbol.ts`, edited by Claude as the conversation advances); Eugenio's marks, notes and answers stay
// in his browser (`almacen.ts`). Click a box: its detail opens at the side. The chevron folds a branch.
import { proyecto as proyectoPorId, type IdProyecto } from '../proyectos';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, CircleHelp, ClipboardCopy, ExternalLink, X } from 'lucide-react';
import { Badge, Button, Card } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { ARBOL, ESTRATEGIAS, RAIZ, hijosDe, nodo, preguntasAbiertas, raizDe, type EstadoNodo, type Borrador, type NodoEstrategia, type TipoNodo } from './arbol';
import { ponerMarca, ponerNota, ponerRespuesta, useEstrategia, type DatosEstrategia, type Marca } from './almacen';

const ANCHO = 236, ALTO = 60, SEP_X = 40, PASO_Y = 70, MARGEN = 12;

const TIPO: Record<TipoNodo, string> = { meta: 'Meta', hito: 'Hito', decision: 'Decisión', opcion: 'Opción', paso: 'Paso', supuesto: 'Supuesto', regla: 'Reglas' };
const ESTADO: Record<EstadoNodo, { n: string; caja: string; punto: string }> = {
  ahora: { n: 'Ahora', caja: 'border-teal-500 bg-teal-50', punto: 'bg-teal-500' },
  elegida: { n: 'Elegida', caja: 'border-emerald-700 bg-emerald-100', punto: 'bg-emerald-700' },
  prometedora: { n: 'Prometedora', caja: 'border-emerald-500 bg-emerald-50', punto: 'bg-emerald-500' },
  'por-explorar': { n: 'Por explorar', caja: 'border-slate-300 bg-white', punto: 'bg-slate-400' },
  dudosa: { n: 'Dudosa', caja: 'border-amber-400 bg-amber-50', punto: 'bg-amber-400' },
  descartada: { n: 'Descartada', caja: 'border-rose-300 bg-rose-50', punto: 'bg-rose-400' },
  despues: { n: 'Más adelante', caja: 'border-dashed border-slate-300 bg-slate-50', punto: 'bg-slate-300' },
};
const MARCA: Record<Marca, { n: string; icono: typeof Check; clase: string }> = {
  si: { n: 'Sí', icono: Check, clase: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  no: { n: 'No', icono: X, clase: 'bg-rose-600 text-white hover:bg-rose-700' },
  dudo: { n: 'Dudo', icono: CircleHelp, clase: 'bg-amber-500 text-white hover:bg-amber-600' },
};
/** Open on a first visit: the path to the decision that matters now. */
const ABIERTOS_INICIO = ESTRATEGIAS.flatMap(e => e.abiertos);

/** One row per visible leaf; a parent sits on the row of its first child, so the tree starts at the top left and
 *  reads like an outline with branches (a centred parent left half the first screen empty, worst on a phone). */
function distribuir(abiertos: Set<string>, raiz: string) {
  const pos = new Map<string, { prof: number; fila: number }>();
  let fila = 0, hondo = 0;
  const ir = (n: NodoEstrategia, prof: number): number => {
    const hs = abiertos.has(n.id) ? hijosDe(n.id) : [];
    hondo = Math.max(hondo, prof);
    const y = hs.length ? (() => { const ys = hs.map(h => ir(h, prof + 1)); return ys[0]; })() : fila++;
    pos.set(n.id, { prof, fila: y });
    return y;
  };
  ir(nodo(raiz) ?? nodo(RAIZ)!, 0);
  return { pos, filas: fila, hondo };
}

function textoParaCopiar(d: DatosEstrategia): string {
  const l: string[] = ['Mis respuestas en la estrategia del Aeromóvil', ''];
  let antes = '';
  for (const n of ARBOL) {
    const m = d.marcas[n.id], nota = d.notas[n.id];
    const rs = (n.preguntas ?? []).map((p, i) => ({ p, r: d.respuestas[`${n.id}#${p}`] })).filter(x => x.r);
    if (!m && !nota && !rs.length) continue;
    const r = raizDe(n.id);
    if (r !== antes) { l.push(`== ${ESTRATEGIAS.find(e => e.raiz === r)?.nombre ?? r} ==`, ''); antes = r; }
    l.push(`■ ${n.titulo}`);
    if (m) l.push(`  Decisión: ${MARCA[m].n}`);
    if (nota) l.push(`  Nota: ${nota}`);
    for (const x of rs) l.push(`  P: ${x.p}`, `  R: ${x.r}`);
    l.push('');
  }
  return l.join('\n');
}

const AREA = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none';

function Lista({ titulo, items, clase }: { titulo: string; items?: string[]; clase?: string }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <h4 className={cn('text-xs font-semibold uppercase tracking-wide text-slate-500', clase)}>{titulo}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

/** The next step already written: a message to copy and send. Folded by default; it is long. */
function BorradorCorreo({ b }: { b: Borrador }) {
  const [abierto, setAbierto] = useState(false), [copiado, setCopiado] = useState(false);
  const copiar = async () => { try { await navigator.clipboard.writeText(`Asunto: ${b.asunto}\n\n${b.cuerpo}`); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* sin portapapeles: se puede seleccionar a mano */ } };
  return (
    <div className="mt-3 rounded-lg border border-slate-200">
      <Button variant="ghost" aria-expanded={abierto} onClick={() => setAbierto(a => !a)} className="w-full justify-start gap-2 px-3 py-2 text-left text-sm font-medium normal-case tracking-normal text-slate-900">
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', abierto && 'rotate-90')} /><span className="flex-1">Borrador de la consulta</span>
      </Button>
      {abierto && (
        <div className="border-t border-slate-200 p-3">
          <p className="text-xs text-slate-500">Para: {b.para}. Cambia lo que va entre corchetes antes de enviarlo.</p>
          {b.contactos?.length ? (
            <ul className="mt-2 space-y-1.5">{b.contactos.map(c => (
              <li key={c.nombre} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm">
                <span className="font-medium text-slate-900">{c.nombre}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {c.correo && <a className="break-all text-teal-700 underline-offset-2 hover:underline" href={`mailto:${c.correo}?subject=${encodeURIComponent(b.asunto)}&body=${encodeURIComponent(b.cuerpo)}`}>{c.correo}</a>}
                  {c.telefono && <a className="text-teal-700 underline-offset-2 hover:underline" href={`tel:${c.telefono.replace(/\s/g, '')}`}>{c.telefono}</a>}
                  {c.web && <a className="inline-flex items-center gap-1 text-teal-700 underline-offset-2 hover:underline" href={c.web} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />web</a>}
                </span>
                {c.nota && <span className="block text-xs text-slate-500">{c.nota}</span>}
              </li>))}
            </ul>
          ) : null}
          <p className="mt-2 text-sm font-medium text-slate-900">{b.asunto}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{b.cuerpo}</p>
          <Button variant="outline" onClick={copiar} className="mt-3 gap-2 px-3 py-1.5 text-sm font-medium normal-case tracking-normal"><ClipboardCopy className="h-4 w-4" />{copiado ? 'Copiado' : 'Copiar el correo'}</Button>
        </div>
      )}
    </div>
  );
}

function Detalle({ n, d, alIr }: { n: NodoEstrategia; d: DatosEstrategia; alIr: (id: string) => void }) {
  const est = n.estado ? ESTADO[n.estado] : null, padre = n.padre ? nodo(n.padre) : null, hs = hijosDe(n.id);
  const marca = d.marcas[n.id];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide">{TIPO[n.tipo]}</span>
        {est && <span className="inline-flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', est.punto)} />{est.n}</span>}
        {n.comprobado && <Badge variant={n.comprobado === 'leido' ? 'success' : 'warning'}>{n.comprobado === 'leido' ? 'Leído en la fuente' : 'Por confirmar'}</Badge>}
      </div>
      <h3 className="mt-1.5 text-lg font-semibold leading-snug text-slate-900">{n.titulo}</h3>
      {padre && <Button variant="ghost" onClick={() => alIr(padre.id)} className="-ml-1 mt-0.5 px-1 py-0.5 text-xs font-normal normal-case tracking-normal text-slate-500">← {padre.titulo}</Button>}
      <p className="mt-2 text-sm text-slate-700">{n.resumen}</p>
      <Lista titulo="Ya decidido" items={n.decidido} clase="text-emerald-700" />
      <Lista titulo="En detalle" items={n.detalle} />
      <Lista titulo="A favor" items={n.aFavor} clase="text-emerald-700" />
      <Lista titulo="En contra" items={n.enContra} clase="text-rose-700" />
      {(n.coste || n.plazo) && (
        <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          {n.coste && <><dt className="text-slate-500">Coste</dt><dd className="text-slate-800">{n.coste}</dd></>}
          {n.plazo && <><dt className="text-slate-500">Plazo</dt><dd className="text-slate-800">{n.plazo}</dd></>}
        </dl>
      )}
      {n.siguiente && (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-teal-800">Siguiente paso pequeño</h4>
          <p className="mt-1 text-sm text-slate-800">{n.siguiente}</p>
        </div>
      )}
      {n.borrador && <BorradorCorreo key={n.id} b={n.borrador} />}
      {n.descarta && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-800">Qué la descarta</h4>
          <p className="mt-1 text-sm text-slate-800">{n.descarta}</p>
        </div>
      )}
      {hs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{n.tipo === 'decision' ? 'Opciones' : hs.every(h => h.tipo === 'paso' || h.titulo[1] === ' ') ? 'Pasos' : 'Dentro'}</h4>
          <ul className="mt-1 space-y-0.5">{hs.map(h => (
            <li key={h.id}><Button variant="ghost" onClick={() => alIr(h.id)} className="w-full justify-start gap-2 px-1.5 py-1 text-left text-sm font-normal normal-case tracking-normal text-slate-800">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', h.estado ? ESTADO[h.estado].punto : 'bg-slate-300')} /><span className={cn('flex-1', h.estado === 'descartada' && 'line-through')}>{h.titulo}</span>
            </Button></li>))}
          </ul>
        </div>
      )}
      {n.preguntas?.map((p, i) => { const k = `${n.id}#${p}`; return (
        <label key={k} className="mt-4 block">
          <span className="text-sm font-medium text-slate-900">{p}</span>
          <textarea rows={2} className={AREA} placeholder="Tu respuesta" value={d.respuestas[k] ?? ''} onChange={e => ponerRespuesta(k, e.target.value)} />
        </label>); })}
      {n.tipo !== 'meta' && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tu decisión</h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(MARCA) as Marca[]).map(m => { const I = MARCA[m].icono, on = marca === m; return (
              <Button key={m} variant="outline" aria-pressed={on} onClick={() => ponerMarca(n.id, on ? null : m)}
                className={cn('gap-1.5 px-3 py-1.5 text-sm font-medium normal-case tracking-normal', on && cn(MARCA[m].clase, 'border-transparent'))}>
                <I className="h-4 w-4" />{MARCA[m].n}
              </Button>); })}
          </div>
          <label className="mt-3 block">
            <span className="text-xs text-slate-500">Nota tuya</span>
            <textarea rows={2} className={AREA} placeholder="Lo que quieras recordar o decirme sobre esto" value={d.notas[n.id] ?? ''} onChange={e => ponerNota(n.id, e.target.value)} />
          </label>
        </div>
      )}
      {n.fuentes?.length ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fuentes</h4>
          <ul className="mt-1 space-y-1 text-sm">{n.fuentes.map(f => (
            <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-teal-700 underline-offset-2 hover:underline"><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />{f.titulo}</a></li>))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export default function VistaEstrategia({ proyecto }: { proyecto?: IdProyecto }) {
  const d = useEstrategia();
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(ABIERTOS_INICIO));
  // (2026-11-27) each project has its own tree: the bicycle's, the car's («de hoy a la fábrica») and the aircraft's
  const propia = proyecto ? ESTRATEGIAS.find(e => e.raiz === proyectoPorId(proyecto).estrategia) : undefined;
  const [sel, setSel] = useState(propia?.inicio ?? 'h1-legal');
  useEffect(() => { if (propia) setSel(propia.inicio); }, [propia]);
  // (2026-11-24) which strategy is on screen: the tree the chosen box belongs to
  const raiz = raizDe(sel), estrategia = ESTRATEGIAS.find(e => e.raiz === raiz) ?? ESTRATEGIAS[0];
  const [copiado, setCopiado] = useState<'no' | 'si' | 'fallo'>('no');
  const refDetalle = useRef<HTMLDivElement>(null), refArbol = useRef<HTMLDivElement>(null);
  const { pos, filas, hondo } = useMemo(() => distribuir(abiertos, raiz), [abiertos, raiz]);
  const visibles = ARBOL.filter(n => pos.has(n.id));
  const x = (id: string) => MARGEN + pos.get(id)!.prof * (ANCHO + SEP_X), y = (id: string) => MARGEN + pos.get(id)!.fila * PASO_Y;
  const ancho = MARGEN * 2 + (hondo + 1) * ANCHO + hondo * SEP_X, alto = MARGEN * 2 + (filas - 1) * PASO_Y + ALTO;
  const preguntas = preguntasAbiertas(raiz), sinResponder = preguntas.filter(p => !d.respuestas[`${p.nodo.id}#${p.texto}`]).length;
  const hayAlgo = Object.keys(d.marcas).length + Object.keys(d.notas).length + Object.keys(d.respuestas).length > 0;

  const plegar = (id: string) => setAbiertos(a => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  /** Select a node and unfold the way to it; on a narrow screen the detail is below the tree, so go to it. */
  const ir = (id: string) => {
    setAbiertos(a => { const n = new Set(a); for (let p = nodo(id)?.padre; p; p = nodo(p)?.padre) n.add(p); return n; });
    setSel(id);
    if (window.innerWidth < 1024) requestAnimationFrame(() => refDetalle.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  useEffect(() => { if (copiado === 'no') return; const t = setTimeout(() => setCopiado('no'), 2500); return () => clearTimeout(t); }, [copiado]);
  const copiar = async () => { try { await navigator.clipboard.writeText(textoParaCopiar(d)); setCopiado('si'); } catch { setCopiado('fallo'); } };
  const elegido = nodo(sel) ?? nodo(raiz)!;
  // keep the chosen box in sight inside the tree's own scroll (never the page's), with a strip of its parent showing
  useEffect(() => {
    const c = refArbol.current, q = pos.get(sel);
    if (!c || !q) return;
    const bx = MARGEN + q.prof * (ANCHO + SEP_X), by = MARGEN + q.fila * PASO_Y;
    const left = bx < c.scrollLeft || bx + ANCHO + 36 > c.scrollLeft + c.clientWidth ? Math.max(0, bx - 56) : c.scrollLeft;
    const top = by < c.scrollTop || by + ALTO > c.scrollTop + c.clientHeight ? Math.max(0, by - PASO_Y) : c.scrollTop;
    if (left !== c.scrollLeft || top !== c.scrollTop) c.scrollTo({ left, top, behavior: 'smooth' });
  }, [sel, pos]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <h2 className="text-xl font-semibold text-slate-900">Estrategia</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        {estrategia.resumen} Toca una caja para ver su detalle, marcar tu decisión y responder a las preguntas. La flecha de cada caja pliega su rama.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Estrategias">
        {ESTRATEGIAS.filter(e => !propia || e === propia).map(e => (
          <Button key={e.raiz} variant="outline" role="tab" aria-selected={e.raiz === raiz} onClick={() => setSel(e.inicio)}
            className={cn('px-3 py-1.5 text-sm font-medium normal-case tracking-normal', e.raiz === raiz ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : 'text-slate-700')}>
            {e.nombre}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {(Object.keys(ESTADO) as EstadoNodo[]).map(e => <span key={e} className="inline-flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-full', ESTADO[e].punto)} />{ESTADO[e].n}</span>)}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div ref={refArbol} className="max-h-[62vh] overflow-auto rounded-xl border border-slate-200 bg-white lg:max-h-[78vh]">
          <div className="relative" style={{ width: ancho, height: alto }}>
            <svg className="absolute inset-0" width={ancho} height={alto} aria-hidden="true">
              {visibles.filter(n => n.padre && pos.has(n.padre)).map(n => {
                const x1 = x(n.padre!) + ANCHO, y1 = y(n.padre!) + ALTO / 2, x2 = x(n.id), y2 = y(n.id) + ALTO / 2, m = (x1 + x2) / 2;
                return <path key={n.id} d={`M${x1} ${y1} C${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`} fill="none" strokeWidth={1.5} className={sel === n.id || sel === n.padre ? 'stroke-slate-500' : 'stroke-slate-300'} />;
              })}
            </svg>
            {visibles.map(n => {
              const est = ESTADO[n.estado ?? 'por-explorar'], hs = hijosDe(n.id).length, abierto = abiertos.has(n.id), m = d.marcas[n.id], activo = sel === n.id;
              const I = m ? MARCA[m].icono : null;
              return (
                <div key={n.id} className={cn('absolute flex rounded-lg', activo && 'ring-2 ring-slate-900 ring-offset-1')} style={{ left: x(n.id), top: y(n.id), width: ANCHO, height: ALTO }}>
                  <Button variant="ghost" onClick={() => ir(n.id)} aria-current={activo ? 'true' : undefined} title={n.titulo}
                    className={cn('h-full min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-1 text-left font-normal normal-case tracking-normal hover:brightness-95',
                      n.tipo === 'meta' ? 'border-slate-900 bg-slate-900 hover:bg-slate-800' : est.caja, hs > 0 && 'rounded-r-none border-r-0')}>
                    <span className={cn('flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', n.tipo === 'meta' ? 'text-slate-300' : 'text-slate-500')}>
                      {TIPO[n.tipo]}{I && m && <span className={cn('ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full', MARCA[m].clase)} title={`Tu decisión: ${MARCA[m].n}`}><I className="h-3 w-3" /></span>}
                    </span>
                    <span className={cn('line-clamp-2 w-full text-[13px] font-medium leading-tight', n.tipo === 'meta' ? 'text-white' : 'text-slate-900', n.estado === 'descartada' && 'line-through', n.estado === 'despues' && 'text-slate-600')}>{n.titulo}</span>
                  </Button>
                  {hs > 0 && (
                    <Button variant="ghost" onClick={() => plegar(n.id)} aria-expanded={abierto} aria-label={`${abierto ? 'Plegar' : 'Desplegar'}: ${n.titulo}`} title={abierto ? 'Plegar la rama' : `Desplegar (${hs})`}
                      className={cn('h-full w-8 shrink-0 flex-col gap-0 rounded-l-none rounded-r-lg border px-0 py-0 text-[10px] font-semibold normal-case tracking-normal',
                        n.tipo === 'meta' ? 'border-slate-900 bg-slate-800 text-white hover:bg-slate-700' : cn(est.caja, 'text-slate-600 hover:brightness-95'))}>
                      <ChevronRight className={cn('h-4 w-4 transition-transform', abierto && 'rotate-180')} />{!abierto && hs}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div ref={refDetalle} className="scroll-mt-20 lg:sticky lg:top-20 lg:max-h-[78vh] lg:self-start lg:overflow-y-auto">
          <Detalle n={elegido} d={d} alIr={ir} />
        </div>
      </div>

      <Card className="mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Preguntas para ti</h3>
            <p className="text-sm text-slate-600">{sinResponder === 0 ? 'Todas respondidas.' : `${sinResponder} de ${preguntas.length} sin responder.`} Cada una abre la caja que la hace.</p>
          </div>
          <Button variant="outline" onClick={copiar} disabled={!hayAlgo} className="gap-2 px-3 py-2 text-sm font-medium normal-case tracking-normal disabled:opacity-50">
            <ClipboardCopy className="h-4 w-4" />{copiado === 'si' ? 'Copiado' : copiado === 'fallo' ? 'No se pudo copiar' : 'Copiar mis respuestas'}
          </Button>
        </div>
        <ol className="mt-3 divide-y divide-slate-100">{preguntas.map(p => { const r = d.respuestas[`${p.nodo.id}#${p.texto}`]; return (
          <li key={`${p.nodo.id}#${p.i}`}>
            <Button variant="ghost" onClick={() => ir(p.nodo.id)} className="w-full items-start justify-start gap-2.5 px-1.5 py-2 text-left text-sm font-normal normal-case tracking-normal text-slate-800">
              <span className={cn('mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full', r ? 'bg-emerald-600 text-white' : 'border border-slate-300')}>{r && <Check className="h-3 w-3" />}</span>
              <span className="flex-1"><span className="block">{p.texto}</span><span className="block text-xs text-slate-500">{p.nodo.titulo}</span></span>
            </Button>
          </li>); })}
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Tus decisiones, notas y respuestas se guardan sólo en este navegador: no salen de tu dispositivo ni las ve nadie más. Para que pasen a formar parte del árbol, pulsa «Copiar mis respuestas» y pégalas en la conversación con Claude.
        </p>
      </Card>
    </div>
  );
}
