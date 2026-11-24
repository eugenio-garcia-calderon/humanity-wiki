// The «Homologación» page (2026-11-24, Eugenio: «cuando se pinche en homologación … se abre la homologación en pantalla
// completa … todos los tipos de homologación … según vas pinchando se va desplegando la información»). It takes the whole
// page (the garage and the 3D view are hidden: homologation needs none of it). One card per homologation (L1e-A, heavy
// quadricycle) and one for the three ways to approve; each is a guide (guias.ts: the norm as a table, what was checked
// of what Eugenio pasted, the steps, the ways) with the design's verdict beside every row it can be checked against
// (normas.ts + evaluar.ts, the same engine as the side card). Text as data in guias.ts; this file only draws it.
import { useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, ChevronDown, CircleHelp, ExternalLink, FileText, ListOrdered, Scale, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { Modelo, Parametros, Resultados } from '../geometria';
import { CATEGORIAS, ETIQUETA_ESTADO, FUENTES, GRUPOS, categoria, type Estado, type IdCategoria, type IdFuente } from './normas';
import type { CdConocido } from './ficha';
import { evaluarCategoria, type Evaluacion, type Resultado } from './evaluar';
import { COLOR, CORTO, Fila, Margenes, AVISO_HOMOLOGACION, useHomologacion } from './PanelHomologacion';
import { GUIAS, LIMITES_SERIE_CORTA, VIAS, type Guia, type Revision, type Veredicto, type Via } from './guias';

const VEREDICTO: Record<Veredicto, { t: string; c: string }> = {
  confirmado: { t: 'Confirmado', c: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  matiz: { t: 'Con matiz', c: 'border-amber-300 bg-amber-50 text-amber-800' },
  'no comprobado': { t: 'No comprobado', c: 'border-slate-300 bg-slate-50 text-slate-600' },
};

/** A closed-by-default box: a title that opens its content (the page unfolds as it is tapped). */
function Desplegable({ titulo, resumen, children, abierto, marca }: { titulo: React.ReactNode; resumen?: React.ReactNode; children: React.ReactNode; abierto?: boolean; marca?: React.ReactNode }) {
  const [a, setA] = useState(!!abierto);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Button variant="ghost" onClick={() => setA(v => !v)} aria-expanded={a}
        className="flex w-full items-start gap-2 p-2.5 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
        {marca}
        <span className="min-w-0 flex-1"><span className="font-semibold text-slate-900">{titulo}</span>{resumen && <span className="mt-0.5 block text-slate-600">{resumen}</span>}</span>
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', a && 'rotate-180')} />
      </Button>
      {a && <div className="border-t border-slate-100 p-2.5 text-[13px] leading-relaxed text-slate-700">{children}</div>}
    </div>
  );
}

const Fuentes = ({ ids }: { ids: IdFuente[] }) => (
  <p className="mt-2 text-xs text-slate-500">Fuentes: {ids.map((id, i) => { const f = FUENTES[id]; return (
    <span key={id}>{i > 0 && ' · '}<a className="inline-flex items-center gap-0.5 text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}<ExternalLink className="h-3 w-3" /></a>{!f.leido && ' (por confirmar)'}</span>
  ); })}</p>
);

function Titulo({ icono: I, children }: { icono: typeof ShieldCheck; children: React.ReactNode }) {
  return <h3 className="flex items-center gap-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900"><I className="h-4 w-4 text-teal-700" />{children}</h3>;
}

/** The norm as a table, one row per rule, with the design's verdict on the right. */
function TablaNorma({ g, ev }: { g: Guia; ev: Evaluacion }) {
  const por = new Map<string, Resultado>(ev.resultados.map(r => [r.req.id, r]));
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 text-[13px]">
      <div className="hidden grid-cols-[11rem_minmax(0,1.5fr)_9rem_minmax(0,1fr)] gap-3 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 md:grid">
        <span>Característica</span><span>Qué dice la norma</span><span>Dónde</span><span>Tu diseño</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {g.tabla.map(f => {
          const r = f.req ? por.get(f.req) : undefined, fu = FUENTES[f.fuente];
          return (
            <li key={f.concepto} className="grid gap-x-3 gap-y-1 px-3 py-2 md:grid-cols-[11rem_minmax(0,1.5fr)_9rem_minmax(0,1fr)]">
              <span className="font-semibold text-slate-900">{f.concepto}</span>
              <span className="text-slate-700">{f.norma}</span>
              <a className="text-xs text-teal-700 underline" href={fu.url} target="_blank" rel="noreferrer">{f.ref}</a>
              <span className="min-w-0">{r ? (<><span className={cn('mr-1.5 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[r.estado])}>{CORTO[r.estado]}</span><span className="text-slate-700">{r.texto}</span></>) : <span className="text-slate-400">Sin cifra en el diseño que comparar.</span>}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TablaRevision({ filas }: { filas: Revision[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {filas.map(r => (
        <li key={r.texto} className="rounded-lg border border-slate-200 bg-white p-2.5 text-[13px]">
          <div className="flex items-start gap-2">
            <span className={cn('mt-0.5 shrink-0 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', VEREDICTO[r.veredicto].c)}>{VEREDICTO[r.veredicto].t}</span>
            <p className="font-semibold text-slate-900">{r.texto}</p>
          </div>
          <p className="mt-1 text-slate-700">{r.comentario}</p>
          {r.fuente && <Fuentes ids={[r.fuente]} />}
        </li>
      ))}
    </ul>
  );
}

function ViaDetalle({ v }: { v: Via }) {
  return (
    <Desplegable titulo={v.nombre} resumen={<><span className="font-semibold">{v.unidades}</span> · vale en {v.valeEn}. {v.cuando}</>}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qué se pide y quién lo hace (pulsa cada cosa)</p>
      <div className="mt-1 flex flex-col gap-1.5">
        {v.piden.map(p => (
          <Desplegable key={p.cosa} titulo={p.cosa}>
            <p><span className="font-semibold">Qué significa:</span> {p.que}</p>
            <p className="mt-1"><span className="font-semibold">Quién lo da o lo hace:</span> {p.quien}</p>
          </Desplegable>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Los pasos</p>
      <ol className="mt-1 list-decimal pl-5">{v.pasos.map(p => <li key={p}>{p}</li>)}</ol>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Ojo con</p>
      <ul className="mt-1 list-disc pl-5">{v.ojo.map(p => <li key={p}>{p}</li>)}</ul>
      {v.id === 'serie-corta' && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unidades por tipo y año (anexo III)</p>
          <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
            {LIMITES_SERIE_CORTA.map(([id, n, u]) => <div key={id} className="contents"><dt className="font-mono font-semibold">{id}</dt><dd className="text-slate-600">{n}</dd><dd className="text-right font-mono tabular-nums">{u}</dd></div>)}
          </dl>
          <p className="mt-1 text-xs text-slate-500">L1e-B y L2e no tienen cifra en el texto que leí.</p>
        </div>
      )}
      <Fuentes ids={v.fuentes} />
    </Desplegable>
  );
}

function PaginaGuia({ g, ev, aviso }: { g: Guia; ev: Evaluacion; aviso: React.ReactNode }) {
  const c = categoria(ev.cat);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
        <p className="font-semibold text-slate-900">{c.nombre}</p>
        <p className="mt-1">{c.resumen}</p>
        <p className="mt-1.5 text-xs text-slate-600"><span className="font-semibold">Ejemplos:</span> {c.ejemplos} · <span className="font-semibold">Permiso:</span> {c.permiso}</p>
      </div>
      {aviso}
      <Margenes ev={ev} />
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(['cumple', 'no', 'condicion', 'comprobar'] as Estado[]).map(e => <span key={e} className={cn('rounded-full border px-2 py-0.5 font-semibold', COLOR[e])}>{ETIQUETA_ESTADO[e]}: {ev.cuenta[e]}</span>)}
      </div>

      <section className="flex flex-col gap-2"><Titulo icono={Scale}>Qué dice la norma, y tu diseño</Titulo><TablaNorma g={g} ev={ev} /></section>

      <section className="flex flex-col gap-2"><Titulo icono={ListOrdered}>Paso a paso</Titulo>
        <ol className="flex flex-col gap-1.5">
          {g.pasos.map((p, i) => (
            <li key={p.titulo}>
              {p.fase && <h4 className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500', i > 0 && 'mt-2')}>{p.fase}</h4>}
              <Desplegable titulo={`${i + 1}. ${p.titulo}`} resumen={p.resumen}>
                <p><span className="font-semibold">Quién:</span> {p.quien}</p>
                <ul className="mt-1 list-disc pl-5">{p.detalle.map(d => <li key={d}>{d}</li>)}</ul>
              </Desplegable>
            </li>
          ))}
        </ol>
      </section>

      {g.cuestiones && (
        <section className="flex flex-col gap-2"><Titulo icono={CircleHelp}>Lo que decide el procedimiento exacto</Titulo>
          <div className="overflow-hidden rounded-lg border border-slate-200 text-[13px]">
            <ul className="divide-y divide-slate-100">{g.cuestiones.map(c => (
              <li key={c.pregunta} className="grid gap-x-3 gap-y-0.5 px-3 py-2 md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.5fr)]">
                <span className="font-semibold text-slate-900">{c.pregunta}</span><span className="text-slate-600">{c.opciones}</span><span className="text-slate-700">{c.porque}</span>
              </li>))}</ul>
          </div>
        </section>
      )}

      {g.tramites && (
        <section className="flex flex-col gap-2"><Titulo icono={FileText}>Qué trámites hacen falta y cuáles no</Titulo>
          <div className="overflow-hidden rounded-lg border border-slate-200 text-[13px]">
            <ul className="divide-y divide-slate-100">{g.tramites.map(t => (
              <li key={t.tramite} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 px-3 py-1.5 md:grid-cols-[4.5rem_16rem_minmax(0,1fr)]">
                <span className={cn('w-fit rounded-full border px-1.5 text-[10px] font-bold uppercase', t.hace ? COLOR.comprobar : COLOR.cumple)}>{t.hace ? 'Sí hace falta' : 'No hace falta'}</span>
                <span className="font-semibold text-slate-900">{t.tramite}</span>
                <span className="col-span-2 text-slate-600 md:col-span-1">{t.nota ?? ''}</span>
              </li>))}</ul>
          </div>
        </section>
      )}

      {g.propia && (
        <section className="flex flex-col gap-2"><Titulo icono={FileText}>La vía: el fabricante lo certifica él mismo</Titulo>
          <ViaDetalle v={g.propia} />
        </section>
      )}

      {g.vias.length > 0 && (
        <section className="flex flex-col gap-2"><Titulo icono={FileText}>Vías para conseguirla: una unidad, serie corta o tipo UE</Titulo>
          <div className="flex flex-col gap-1.5">{g.vias.map(id => <ViaDetalle key={id} v={VIAS.find(x => x.id === id)!} />)}</div>
        </section>
      )}

      <section className="flex flex-col gap-2"><Titulo icono={BadgeCheck}>Lo que contrasté con los textos legales</Titulo><TablaRevision filas={g.revision} /></section>

      <section className="flex flex-col gap-2"><Titulo icono={ShieldCheck}>Tu diseño, requisito a requisito</Titulo>
        {GRUPOS.map(gr => {
          const filas = ev.resultados.filter(r => r.req.grupo === gr);
          if (!filas.length) return null;
          return (
            <div key={gr} className="flex flex-col gap-1">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{gr}</h4>
              <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">{filas.map(r => <Fila key={r.req.id} r={r} />)}</ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function PaginaHomologacion({ P, modelo, res, cd, nombre }: { P: Parametros; modelo: Modelo; res: Resultados; cd: CdConocido | null; nombre: string }) {
  const { ficha, auto } = useHomologacion(P, modelo, res, cd, nombre);
  const [sel, setSel] = useState<string>('l1ea');
  const [catPesado, setCatPesado] = useState<IdCategoria | null>(null);
  const g = GUIAS.find(x => x.id === sel) ?? null;
  const catGuia: IdCategoria = g ? (g.id === 'pesado' ? (catPesado ?? (g.categorias.includes(auto.cat) ? auto.cat : g.porDefecto)) : g.porDefecto) : 'L1e-A';
  const ev = useMemo(() => evaluarCategoria(ficha, catGuia), [ficha, catGuia]);
  const evGuia = useMemo(() => evaluarCategoria(ficha, g?.id === 'epac' ? 'EPAC' : 'L1e-A'), [ficha, g?.id]);
  return (
    <section aria-label="Homologación" className="mx-auto flex max-w-5xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="flex flex-col gap-1.5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-700" />Homologación · {ficha.vehiculo}</h2>
        <p className="text-[13px] text-slate-600">Elige una homologación: cada una es una página completa, con la norma en tabla, el paso a paso y tu diseño frente a cada requisito (en verde lo que cumple, en rojo lo que hay que cambiar antes de construir).</p>
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{AVISO_HOMOLOGACION}</p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Tipos de homologación">
        {[...GUIAS.map(x => ({ id: x.id, titulo: x.titulo, lema: x.lema })), { id: 'vias', titulo: 'Vías: una unidad, serie corta o tipo UE', lema: 'Qué se pide en cada una, qué significa y quién lo hace' }].map(t => (
          <Button key={t.id} variant="outline" role="tab" aria-selected={sel === t.id} onClick={() => setSel(t.id)}
            className={cn('flex h-auto flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left normal-case tracking-normal', sel === t.id ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-800')}>
            <span className="text-[13px] font-semibold">{t.titulo}</span>
            <span className={cn('text-[11px] font-normal', sel === t.id ? 'text-teal-100' : 'text-slate-500')}>{t.lema}</span>
          </Button>
        ))}
      </div>

      {g && g.id === 'pesado' && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Categoría pesada a comparar">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Categoría</span>
          {g.categorias.map(k => (
            <Button key={k} variant="outline" role="radio" aria-checked={k === catGuia} onClick={() => setCatPesado(k)}
              title={categoria(k).nombre} className={cn('px-2 py-1 text-xs normal-case tracking-normal', k === catGuia ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-800')}>{k}{k === auto.cat && ' (la suya)'}</Button>
          ))}
          <span className="flex-1" />
          <a className="inline-flex items-center gap-0.5 text-xs text-teal-700 underline" href={FUENTES.r168.url} target="_blank" rel="noreferrer">Reglamento 168/2013<ExternalLink className="h-3 w-3" /></a>
        </div>
      )}

      {g && (
        <PaginaGuia key={g.id + catGuia} g={g} ev={ev} aviso={g.id === 'l1ea' || g.id === 'epac'
          ? <p className={cn('rounded-lg border px-3 py-2 text-[13px]', evGuia.bloqueantes.length ? COLOR.no : COLOR.cumple)}>
              {evGuia.bloqueantes.length
                ? <><span className="font-semibold">Tu diseño no entra en {g.id === 'epac' ? 'esta vía' : 'L1e-A'} todavía:</span> {evGuia.bloqueantes.map(b => `${b.req.titulo.toLowerCase()} (${b.texto.replace(/\.$/, '')})`).join('; ')}.</>
                : <><span className="font-semibold">Tu diseño cumple lo que decide {g.id === 'epac' ? 'esta vía' : 'L1e-A'}.</span> Quedan los ensayos, los papeles y las piezas por comprobar.{evGuia.cuenta.no > 0 && ` Ojo: ${evGuia.cuenta.no === 1 ? 'hay 1 requisito en rojo' : `hay ${evGuia.cuenta.no} requisitos en rojo`} más abajo.`}</>}
            </p>
          : null} />
      )}

      {sel === 'vias' && (
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[13px] text-slate-700"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />Tres formas de conseguir que un vehículo sea legal. Se elige por cuántas unidades quieres y dónde: una (individual), hasta unas decenas al año (serie corta nacional) o muchas, también fuera de España (tipo UE). Pulsa cada una para ver qué se pide y quién lo da.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 text-[13px]">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 md:grid"><span>Vía</span><span>Unidades</span><span>Vale en</span></div>
            <ul className="divide-y divide-slate-100">{VIAS.map(v => <li key={v.id} className="grid gap-x-3 px-3 py-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]"><span className="font-semibold text-slate-900">{v.nombre}</span><span>{v.unidades}</span><span>{v.valeEn}</span></li>)}</ul>
          </div>
          <div className="flex flex-col gap-1.5">{VIAS.map(v => <ViaDetalle key={v.id} v={v} />)}</div>
        </div>
      )}

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">De dónde salen las cifras del diseño</summary>
        <ul className="mt-1 list-disc pl-4">{ficha.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </details>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Textos legales</summary>
        <ul className="mt-1 flex flex-col gap-0.5">{Object.values(FUENTES).map(f => (
          <li key={f.url}><a className="text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>{!f.leido && <span className="text-slate-500"> (citado, no releído: por confirmar)</span>}</li>
        ))}</ul>
      </details>
    </section>
  );
}
