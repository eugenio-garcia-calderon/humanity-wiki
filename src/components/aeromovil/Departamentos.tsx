// Panel de un departamento del «fabricante» del Aeromóvil (2026-11-06,
// Eugenio): bajo el 3D, al elegir una pestaña del lateral, se ven la misión y
// responsabilidades del equipo, las tareas hacia el prototipo 1, las decisiones
// pendientes, los aliados (CRM) y los mensajes preparados para pedir presupuesto.
// El contenido vive en `departamentos/<id>.ts` y lo escriben bots; aquí solo se
// enseña. También la comparación de las dos versiones del chasis.
import { useMemo, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { Departamento } from './departamentos';
import { evaluarChasis, tubosCelosia, type EvaluacionChasis } from './chasisCelosia';
import type { Modelo } from './geometria';

type Pestana = 'equipo' | 'tareas' | 'decisiones' | 'partners' | 'mensajes' | 'referencias';
const PESTANAS: { k: Pestana; n: string }[] = [
  { k: 'equipo', n: 'Equipo' }, { k: 'tareas', n: 'Tareas' }, { k: 'decisiones', n: 'Decisiones' },
  { k: 'partners', n: 'Aliados' }, { k: 'mensajes', n: 'Mensajes' }, { k: 'referencias', n: 'Referencias' },
];
const PRIORIDAD: Record<string, string> = { alta: 'border-red-300 bg-red-50 text-red-700', media: 'border-amber-300 bg-amber-50 text-amber-800', baja: 'border-slate-300 bg-slate-50 text-slate-600' };
const ESTADO: Record<string, string> = { 'por contactar': 'bg-slate-100 text-slate-600', contactado: 'bg-sky-100 text-sky-800', 'en conversación': 'bg-emerald-100 text-emerald-800', descartado: 'bg-slate-100 text-slate-400 line-through' };

export function PanelDepartamento({ d }: { d: Departamento }) {
  const [pestana, setPestana] = useState<Pestana>('equipo');
  const [copiado, setCopiado] = useState<string | null>(null);
  const vacio = !d.responsabilidades.length && !d.tareas.length;
  const cuenta: Record<Pestana, number> = { equipo: d.responsabilidades.length, tareas: d.tareas.length, decisiones: d.decisiones.length, partners: d.partners.length, mensajes: d.mensajes.length, referencias: d.referencias.length };
  const copiar = async (texto: string, clave: string) => { try { await navigator.clipboard.writeText(texto); setCopiado(clave); setTimeout(() => setCopiado(null), 1500); } catch { /* sin portapapeles */ } };
  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white" aria-label={`Departamento: ${d.nombre}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{d.nombre}</h2>
          <p className="text-xs text-slate-500">{d.lema}</p>
        </div>
        <span className="font-mono text-[11px] text-slate-400">revisado {d.revisado.fecha} · {d.revisado.por}</span>
      </header>
      {vacio ? (
        <p className="px-4 py-6 text-sm text-slate-500">Este departamento está en manos de un bot ahora mismo: en cuanto termine, aquí aparecerán su misión, sus tareas, sus decisiones, sus aliados y los mensajes preparados.</p>
      ) : (<>
        <nav className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-2" aria-label="Apartados">
          {PESTANAS.map(p => (
            <Button key={p.k} variant="ghost" aria-pressed={pestana === p.k} onClick={() => setPestana(p.k)}
              className={cn('gap-1.5 px-2.5 py-1 text-xs normal-case tracking-normal', pestana === p.k ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-600')}>
              {p.n}<span className={cn('rounded-full px-1.5 font-mono text-[10px]', pestana === p.k ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{cuenta[p.k]}</span>
            </Button>
          ))}
        </nav>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm text-slate-700">
          {pestana === 'equipo' && (<>
            <p className="mb-3 leading-relaxed">{d.mision}</p>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Responsabilidades</h3>
            <ul className="list-disc space-y-1 pl-5">{d.responsabilidades.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </>)}
          {pestana === 'tareas' && (
            <ol className="space-y-2">
              {d.tareas.map((t, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{i + 1}</span>
                    <span className="font-medium text-slate-900">{t.titulo}</span>
                    <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', PRIORIDAD[t.prioridad])}>{t.prioridad}</span>
                    {t.semanas != null && <span className="font-mono text-[11px] text-slate-500">{t.semanas} sem.</span>}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{t.detalle}</p>
                  {t.entregable && <p className="mt-1 text-[12px] text-slate-500"><span className="font-semibold">Sale:</span> {t.entregable}</p>}
                  {t.dependeDe?.length ? <p className="mt-0.5 text-[12px] text-slate-500"><span className="font-semibold">Después de:</span> {t.dependeDe.join(' · ')}</p> : null}
                </li>
              ))}
            </ol>
          )}
          {pestana === 'decisiones' && (
            <div className="space-y-3">
              {d.decisiones.map((de, i) => (
                <article key={i} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-medium text-slate-900">{de.tema}</h4><span className="text-[11px] text-slate-500">{de.cuando}</span></div>
                  <p className="mt-1 text-[13px] text-slate-600">{de.contexto}</p>
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {de.opciones.map((o, j) => (
                      <li key={j} className={cn('rounded-md border p-2 text-[12px]', o.nombre === de.recomendacion ? 'border-teal-300 bg-teal-50' : 'border-slate-200')}>
                        <div className="font-semibold text-slate-800">{o.nombre}{o.coste ? <span className="ml-1 font-mono font-normal text-slate-500">{o.coste}</span> : null}</div>
                        <div className="text-emerald-800">+ {o.pros}</div><div className="text-red-800">− {o.contras}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[13px]"><span className="font-semibold text-teal-800">Recomendación:</span> {de.recomendacion}. <span className="text-slate-600">{de.porQue}</span></p>
                </article>
              ))}
            </div>
          )}
          {pestana === 'partners' && (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-1 pr-2">Quién</th><th className="py-1 pr-2">Qué nos da</th><th className="py-1 pr-2">Por qué</th><th className="py-1">Estado</th></tr></thead>
              <tbody>
                {d.partners.map((p, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 pr-2"><div className="font-medium text-slate-900">{p.web ? <a href={p.web} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-800 hover:underline">{p.nombre}<ExternalLink className="h-3 w-3" /></a> : p.nombre}</div><div className="text-[11px] text-slate-500">{p.tipo} · {p.pais}{p.verificado ? '' : ' · por verificar'}</div></td>
                    <td className="py-1.5 pr-2 text-slate-700">{p.que}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{p.porQue}</td>
                    <td className="py-1.5"><span className={cn('rounded-full px-1.5 py-0.5 text-[11px]', ESTADO[p.estado])}>{p.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pestana === 'mensajes' && (
            <div className="space-y-3">
              {d.mensajes.map((m, i) => {
                const texto = `Para: ${m.para}\nAsunto: ${m.asunto}\n\n${m.cuerpo}`;
                return (
                  <article key={i} className="rounded-lg border border-slate-200 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><span className="font-medium text-slate-900">{m.para}</span><span className="ml-2 text-[11px] text-slate-500">{m.canal} · {m.idioma === 'es' ? 'español' : 'inglés'}</span></div>
                      <Button variant="outline" onClick={() => copiar(texto, `m${i}`)} className="gap-1 px-2 py-1 text-xs normal-case tracking-normal"><Copy className="h-3 w-3" />{copiado === `m${i}` ? 'Copiado' : 'Copiar'}</Button>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-slate-800">{m.asunto}</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-sans text-[12.5px] leading-relaxed text-slate-700">{m.cuerpo}</pre>
                    <p className="mt-1 text-[12px] text-slate-500"><span className="font-semibold">Pedimos:</span> {m.quePedimos.join(' · ')}</p>
                  </article>
                );
              })}
            </div>
          )}
          {pestana === 'referencias' && (
            <ul className="space-y-1.5">
              {d.referencias.map((r, i) => <li key={i} className="text-[13px]"><a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-teal-800 hover:underline">{r.titulo}</a><span className="text-slate-600"> — {r.nota}</span></li>)}
            </ul>
          )}
        </div>
      </>)}
    </section>
  );
}

/** Las dos versiones del chasis, lado a lado: peso, tubos, nudos, triángulos y rigidez estimada. */
export function ComparacionChasis({ modelo }: { modelo: Modelo }) {
  const ev = useMemo<[EvaluacionChasis, EvaluacionChasis] | null>(() => {
    if (modelo.tipo !== 'a1') return null;
    const m = modelo as any;
    try {
      const c = m.contextoChasis();
      const v1 = evaluarChasis('largueros', m.tubosEstructuraV1(), c);
      const v2 = evaluarChasis('celosia', tubosCelosia(c), c);
      return [v1, v2];
    } catch { return null; }
  }, [modelo]);
  if (!ev) return null;
  const f = (v: number | null, u: string, d = 0) => (v == null ? '—' : `${v.toLocaleString('es-ES', { maximumFractionDigits: d })} ${u}`);
  const filas: [string, (e: EvaluacionChasis) => string][] = [
    ['Peso de la estructura', e => f(e.masaKg, 'kg', 1)], ['Tubos', e => f(e.nTubos, '')], ['Metros de tubo', e => f(e.largoM, 'm', 1)],
    ['Nudos', e => f(e.nNudos, '')], ['Triángulos', e => f(e.triangulos, '')],
    ['Rigidez a torsión', e => f(e.rigidezTorsion, 'N·m/°')], ['Rigidez a flexión', e => f(e.rigidezFlexion, 'N/mm')],
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <table className="w-full text-[12px]">
        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="py-0.5"></th><th className="py-0.5 text-right">v1 largueros</th><th className="py-0.5 text-right">v2 celosía</th></tr></thead>
        <tbody>{filas.map(([n, g]) => <tr key={n}><td className="py-0.5 text-slate-600">{n}</td><td className="py-0.5 text-right font-mono tabular-nums">{g(ev[0])}</td><td className="py-0.5 text-right font-mono tabular-nums">{g(ev[1])}</td></tr>)}</tbody>
      </table>
      {[...ev[0].notas, ...ev[1].notas].filter(n => n !== 'pendiente').slice(0, 4).map((n, i) => <p key={i} className="mt-1 text-[11px] leading-snug text-slate-500">{n}</p>)}
      {ev[1].notas.includes('pendiente') && <p className="mt-1 text-[11px] text-slate-500">La versión 2 la está diseñando un bot: cuando termine, aquí saldrán sus números.</p>}
    </div>
  );
}
