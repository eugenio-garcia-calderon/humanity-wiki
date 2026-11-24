// The written guide of one homologation as a page (2026-11-24, moved out of `PaginaHomologacion.tsx` so the pedal cycle's
// page and the side collapsible of the other homologations draw the same thing without importing each other): the norm as
// a table with the design's verdict, the step by step, the ways to get approved, what was checked of what Eugenio pasted,
// and the design requirement by requirement. The text itself is data in `guias.ts`; this file only draws it.
import { BadgeCheck, CircleHelp, ExternalLink, FileText, ListOrdered, Scale, ShieldCheck } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ETIQUETA_ESTADO, FUENTES, GRUPOS, categoria, type Estado, type IdFuente } from './normas';
import type { Evaluacion, Resultado } from './evaluar';
import { COLOR, CORTO, Fila, Margenes } from './PanelHomologacion';
import { LIMITES_SERIE_CORTA, VIAS, type Guia, type Revision, type Veredicto, type Via } from './guias';
import { Desplegable } from './epac/ui';

export const VEREDICTO: Record<Veredicto, { t: string; c: string }> = {
  confirmado: { t: 'Confirmado', c: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  matiz: { t: 'Con matiz', c: 'border-amber-300 bg-amber-50 text-amber-800' },
  'no comprobado': { t: 'No comprobado', c: 'border-slate-300 bg-slate-50 text-slate-600' },
};

export const Fuentes = ({ ids }: { ids: IdFuente[] }) => (
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

export function TablaRevision({ filas }: { filas: Revision[] }) {
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

export function ViaDetalle({ v }: { v: Via }) {
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

export function PaginaGuia({ g, ev, aviso }: { g: Guia; ev: Evaluacion; aviso: React.ReactNode }) {
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

