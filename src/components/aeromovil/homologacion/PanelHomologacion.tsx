// The «Homologación» tab (2026-11-17): the design against the EU type-approval rules of its category. The panel goes
// under the 3D view (it is wide: every requirement with its detail); `ResumenHomologacion` is the short card for the
// side column. The rules are in normas.ts, the design's numbers in ficha.ts, the verdicts in evaluar.ts.
import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { Modelo, Parametros, Resultados } from '../geometria';
import { CATEGORIAS, ETIQUETA_ESTADO, FUENTES, GRUPOS, categoria, type Estado, type IdCategoria } from './normas';
import { fichaHomologacion, type CdConocido } from './ficha';
import { EstudioL7e } from './EstudioL7e';
import { candidatas, elegirCategoria, evaluarCategoria, fraseMargen, margenes, type Evaluacion, type Resultado } from './evaluar';

export const COLOR: Record<Estado, string> = {
  cumple: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  no: 'border-red-300 bg-red-50 text-red-700',
  condicion: 'border-amber-300 bg-amber-50 text-amber-800',
  comprobar: 'border-slate-300 bg-slate-50 text-slate-600',
};
export const CORTO: Record<Estado, string> = { cumple: 'Cumple', no: 'No cumple', condicion: 'Limitando', comprobar: 'A comprobar' };

/** The design's homologation: its numbers, the category it falls in, and the evaluation of the one being looked at. */
export function useHomologacion(P: Parametros, modelo: Modelo, res: Resultados, cd: CdConocido | null, nombre: string) {
  const ficha = useMemo(() => fichaHomologacion(P, modelo, res, cd, nombre), [P, modelo, res, cd?.cd, cd?.areaRef, nombre]); // eslint-disable-line react-hooks/exhaustive-deps
  const auto = useMemo(() => elegirCategoria(ficha), [ficha]);
  return { ficha, auto };
}

/** The disclaimer, the same words wherever the pre-check shows. */
export const AVISO_HOMOLOGACION = 'Comprobación previa orientativa, hecha con las cifras del modelo: no es una homologación ni un informe de un servicio técnico. La categoría y cada ensayo los decide el servicio técnico y el Ministerio de Industria.';

export function PanelHomologacion({ P, modelo, res, cd, nombre }: { P: Parametros; modelo: Modelo; res: Resultados; cd: CdConocido | null; nombre: string }) {
  const { ficha, auto } = useHomologacion(P, modelo, res, cd, nombre);
  const [elegida, setElegida] = useState<IdCategoria | null>(null);
  const cat = elegida ?? auto.cat;
  const ev = useMemo(() => evaluarCategoria(ficha, cat), [ficha, cat]);
  const posibles = candidatas(ficha);
  const c = categoria(cat);
  return (
    <section aria-label="Homologación" className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-700" />Homologación europea: {ficha.vehiculo}</h2>
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{AVISO_HOMOLOGACION}</p>
      </header>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Categoría</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Categoría a comparar">
          {CATEGORIAS.map(k => {
            const activa = k.id === cat, posible = posibles.includes(k.id);
            return (
              <Button key={k.id} variant="outline" role="radio" aria-checked={activa} onClick={() => setElegida(k.id === auto.cat ? null : k.id)}
                title={posible ? k.nombre : `${k.nombre} — no es de su número de ruedas`}
                className={cn('px-2 py-1 text-xs normal-case tracking-normal', activa ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : posible ? 'text-slate-800' : 'text-slate-400')}>
                {k.id}{k.id === auto.cat && <span className={cn('ml-1 text-[10px]', activa ? 'text-teal-100' : 'text-teal-700')}>(la suya)</span>}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
        <p className="font-semibold text-slate-900">{c.nombre}{cat === auto.cat ? ' — la que le corresponde' : ' — comparando'}</p>
        <p className="mt-1">{c.resumen}</p>
        <p className="mt-1.5 text-xs text-slate-600"><span className="font-semibold">Ejemplos:</span> {c.ejemplos} · <span className="font-semibold">Permiso:</span> {c.permiso} · <span className="font-semibold">Esfuerzo:</span> {c.esfuerzo}</p>
        {cat === auto.cat && auto.descartadas.length > 0 && (
          <div className="mt-2 text-xs text-slate-600">
            <p className="font-semibold">Por qué no entra en las de abajo:</p>
            <ul className="mt-0.5 list-disc pl-4">{auto.descartadas.map(d => <li key={d.cat}><span className="font-semibold">{d.cat}</span>: {d.bloqueantes.map(b => `${b.req.titulo.toLowerCase()} (${b.texto.replace(/\.$/, '')})`).join('; ')}.</li>)}</ul>
          </div>
        )}
        {cat !== auto.cat && ev.bloqueantes.length > 0 && <p className="mt-2 text-xs text-red-700">No le corresponde: {ev.bloqueantes.map(b => b.req.titulo.toLowerCase()).join(', ')}.</p>}
      </div>

      <Margenes ev={ev} />

      {/* (2026-11-17) the L7e power study and the tests, one tab each (l7e.ts): only where the power electronics exist */}
      {ficha.electronica && <EstudioL7e ficha={ficha} />}

      <div className="flex flex-wrap gap-1.5 text-xs">
        {(['cumple', 'no', 'condicion', 'comprobar'] as Estado[]).map(e => <span key={e} className={cn('rounded-full border px-2 py-0.5 font-semibold', COLOR[e])}>{ETIQUETA_ESTADO[e]}: {ev.cuenta[e]}</span>)}
      </div>

      {GRUPOS.map(g => {
        const filas = ev.resultados.filter(r => r.req.grupo === g);
        if (!filas.length) return null;
        return (
          <div key={g} className="flex flex-col gap-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g}</h3>
            <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">{filas.map(r => <Fila key={r.req.id} r={r} />)}</ul>
          </div>
        );
      })}

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">De dónde salen las cifras del diseño</summary>
        <ul className="mt-1 list-disc pl-4">{ficha.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </details>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Textos legales</summary>
        <ul className="mt-1 flex flex-col gap-0.5">{Object.values(FUENTES).map(f => (
          <li key={f.url}><a className="text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>{!f.leido && <span className="text-slate-500"> (citado, no releído el 17-11-2026: por confirmar)</span>}</li>
        ))}</ul>
      </details>
    </section>
  );
}

export function Fila({ r }: { r: Resultado }) {
  const [abierta, setAbierta] = useState(false);
  const f = FUENTES[r.req.fuente];
  return (
    <li className="px-2.5 py-1.5">
      <Button variant="ghost" onClick={() => setAbierta(a => !a)} aria-expanded={abierta}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 p-0 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-transparent">
        <span className={cn('mt-0.5 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[r.estado])}>{CORTO[r.estado]}</span>
        <span className="min-w-0"><span className="font-semibold text-slate-900">{r.req.titulo}.</span> <span className="text-slate-700">{r.texto}</span></span>
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', abierta && 'rotate-180')} />
      </Button>
      {abierta && (
        <div className="mt-1.5 rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
          <p>{r.req.detalle}</p>
          {r.estado === 'comprobar' && r.req.queHaceFalta && <p className="mt-1"><span className="font-semibold">Qué hace falta para comprobarlo:</span> {r.req.queHaceFalta}</p>}
          <p className="mt-1 text-slate-500">{r.req.ref} · <a className="inline-flex items-center gap-0.5 text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">texto<ExternalLink className="h-3 w-3" /></a>{!f.leido && ' (por confirmar)'}</p>
        </div>
      )}
    </li>
  );
}

/** The headline margins as bars: how much of each limit the design uses. */
export function Margenes({ ev }: { ev: Evaluacion }) {
  const m = margenes(ev);
  const filas = ([['Masa en orden de marcha', m.masa, 0], ['Potencia continua', m.potencia, 1], ['Velocidad máxima', m.vmax, 0], ['Largo', m.largo, 2], ['Ancho', m.ancho, 2]] as const).filter(([, r]) => r);
  const n = (v: number, d: number) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold text-slate-900">{fraseMargen(ev)}</p>
      {filas.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[12rem_minmax(0,1fr)]">
          {filas.map(([t, r, d0]) => {
            const d = r!.unidad === 'kW' && r!.limite! < 1 ? 2 : d0; // the pedal cycle's 0,25 kW
            const usa = Math.min(1.15, r!.valor! / r!.limite!), pasa = r!.margen! < 0;
            return (
              <div key={t} className="contents">
                <dt className="text-slate-600">{t}</dt>
                <dd className="flex min-w-0 flex-col gap-0.5">
                  <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
                    <span className={cn('absolute inset-y-0 left-0 rounded-full', pasa ? 'bg-red-500' : usa > 0.9 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, usa * 100)}%` }} />
                  </div>
                  <span className="font-mono tabular-nums text-slate-700">{n(r!.valor!, d)} de {n(r!.limite!, d)} {r!.unidad} · {pasa ? `se pasa ${n(-r!.margen!, d)}` : `quedan ${n(r!.margen!, d)}`}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

/** The side column's card: category, counts and the margin sentence. */
export function ResumenHomologacion({ P, modelo, res, cd, nombre }: { P: Parametros; modelo: Modelo; res: Resultados; cd: CdConocido | null; nombre: string }) {
  const { ficha, auto } = useHomologacion(P, modelo, res, cd, nombre);
  const ev = useMemo(() => evaluarCategoria(ficha, auto.cat), [ficha, auto.cat]);
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-[13px] text-slate-700">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Homologación</h2>
      <p><span className="font-semibold text-slate-900">{categoria(auto.cat).nombre}</span></p>
      <p>{fraseMargen(ev)}</p>
      {/* the category just below, and what keeps it out (the Rombo Bala lands in M1 over its steering wheel and saddles) */}
      {auto.descartadas.length > 0 && (() => { const d = auto.descartadas[auto.descartadas.length - 1]; return (
        <p className="text-xs text-slate-600">No entra en <span className="font-semibold">{d.cat}</span> por: {d.bloqueantes.map(b => b.req.titulo.toLowerCase()).join(', ')}.</p>); })()}
      <div className="flex flex-wrap gap-1.5 text-xs">{(['no', 'condicion', 'cumple', 'comprobar'] as Estado[]).map(e => <span key={e} className={cn('rounded-full border px-2 py-0.5 font-semibold', COLOR[e])}>{CORTO[e]}: {ev.cuenta[e]}</span>)}</div>
      <p className="text-xs text-slate-500">El detalle de cada requisito, debajo de la vista 3D. {AVISO_HOMOLOGACION}</p>
    </section>
  );
}
