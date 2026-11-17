// «Estudio L7e: potencia del híbrido» and «Ensayos» (2026-11-17): Eugenio's L7e-A2 study made live for the current
// design (l7e.ts), with one tab per test. Inside the «Homologación» panel, for the Triciclo family.
import { useState } from 'react';
import { ExternalLink, FlaskConical, Zap } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { FichaHomologacion } from './ficha';
import { FUENTES } from './normas';
import { ETIQUETA_L7E, LIMITE_L7E, estudioL7e, type EstadoL7e } from './l7e';

const COLOR: Record<EstadoL7e, string> = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  no: 'border-red-300 bg-red-50 text-red-700',
  comprobar: 'border-amber-300 bg-amber-50 text-amber-800',
};
const kW = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });

function Fuente({ id, texto }: { id: keyof typeof FUENTES; texto: string }) {
  const f = FUENTES[id];
  return <span className="text-slate-500">{texto} · <a className="inline-flex items-center gap-0.5 text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">texto<ExternalLink className="h-3 w-3" /></a>{!f.leido && ' (citado, por confirmar)'}</span>;
}

export function EstudioL7e({ ficha }: { ficha: FichaHomologacion }) {
  const est = estudioL7e(ficha);
  const [tab, setTab] = useState(0);
  if (!est) return null;
  const el = ficha.electronica!;
  const ensayo = est.ensayos[Math.min(tab, est.ensayos.length - 1)];
  return (
    <>
      <section aria-label="Estudio L7e" className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Zap className="h-4 w-4 text-teal-700" />Estudio L7e-A2: potencia {el.hibrido ? 'del híbrido' : 'del eléctrico'}</h3>
        <p className="text-xs leading-relaxed text-slate-600">
          L7e-A pone un tope de {LIMITE_L7E} kW (Reglamento 168/2013, anexo I). En un híbrido no basta con mirar cada motor: el Reglamento 134/2014 (anexo X, apéndice 2.4) mide la potencia <span className="font-semibold">total</span> del conjunto en <span className="font-semibold">cada modo</span> y se queda con el resultado más alto, y la ficha de homologación (Reglamento 901/2014) declara aparte la potencia neta del térmico (campo 1.8.3), la continua del eléctrico (1.8.5), la <span className="font-semibold">continua total</span> (1.8.7) y la <span className="font-semibold">pico total</span> (1.8.9). La que cuenta para el tope es la continua total; el pico se declara y se justifica, pero ningún reglamento leído da una franquicia general de segundos por encima. Las cifras salen de Motor › Electrónica de potencia.
        </p>
        <p className="text-[13px] font-semibold text-slate-900">{est.resumen}</p>
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
          {est.puntos.map(p => (
            <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 px-2.5 py-1.5 text-[13px]">
              <span className={cn('mt-0.5 h-fit whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[p.estado])}>{ETIQUETA_L7E[p.estado]}</span>
              <span className="min-w-0">
                <span className="font-semibold text-slate-900">{p.campo && <span className="mr-1 font-mono text-xs text-slate-500">{p.campo}</span>}{p.titulo}:</span> <span className="font-mono text-xs">{p.valor}</span>
                <span className="block text-slate-700">{p.texto}</span>
                <span className="block text-[11px]"><Fuente id={p.fuente} texto={p.ref} /></span>
              </span>
            </li>
          ))}
        </ul>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-xs">
            <thead className="text-slate-500"><tr><th className="py-1 pr-2 font-semibold">Escenario</th><th className="px-2 text-right font-semibold">Térmico</th><th className="px-2 text-right font-semibold">Eléctrico</th><th className="px-2 text-right font-semibold">Total</th><th className="pl-2 font-semibold">¿≤ {LIMITE_L7E} kW?</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {est.escenarios.map(e => (
                <tr key={e.nombre} className="align-top">
                  <td className="py-1 pr-2 text-slate-800">{e.nombre}<span className="block text-[11px] text-slate-500">{e.nota}</span></td>
                  <td className="px-2 text-right font-mono tabular-nums">{kW(e.termico)}</td>
                  <td className="px-2 text-right font-mono tabular-nums">{kW(e.electrico)}</td>
                  <td className="px-2 text-right font-mono font-semibold tabular-nums">{kW(e.total)} kW</td>
                  <td className="pl-2"><span className={cn('whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[e.estado])}>{ETIQUETA_L7E[e.estado]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">Sumas teóricas en el eje de cada motor, sin descontar pérdidas ni comprobar que los dos dan su máximo en el mismo punto de medida. Resumen del «Estudio de homologación L7e-A2: híbrido en paralelo» que aportó Eugenio, aplicado a este diseño. Orientativo: la última palabra es del servicio técnico.</p>
      </section>

      <section aria-label="Ensayos" className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><FlaskConical className="h-4 w-4 text-teal-700" />Ensayos de homologación ({est.ensayos.length}, todos pendientes)</h3>
        <div role="tablist" aria-label="Ensayos" className="flex flex-wrap gap-1">
          {est.ensayos.map((e, i) => (
            <Button key={e.id} role="tab" aria-selected={e === ensayo} variant="outline" onClick={() => setTab(i)}
              className={cn('px-2 py-1 text-xs normal-case tracking-normal', e === ensayo ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-700')}>
              {e.corto}<span className={cn('ml-1 inline-block h-2 w-2 rounded-full', e.expectativa.estado === 'ok' ? 'bg-emerald-500' : e.expectativa.estado === 'no' ? 'bg-red-500' : 'bg-amber-500')} />
            </Button>
          ))}
        </div>
        <div role="tabpanel" className="flex flex-col gap-2 rounded-md bg-slate-50 p-2.5 text-[13px] text-slate-700">
          <p className="font-semibold text-slate-900">{ensayo.titulo} <span className="ml-1 rounded-full border border-slate-300 bg-white px-1.5 text-[10px] font-bold uppercase text-slate-600">Pendiente</span></p>
          <p><span className="font-semibold">Objetivo:</span> {ensayo.objetivo}</p>
          <div><span className="font-semibold">Cómo se hace:</span><ol className="mt-0.5 list-decimal pl-5">{ensayo.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol></div>
          <div><span className="font-semibold">Qué hay que declarar:</span><ul className="mt-0.5 list-disc pl-5">{ensayo.declarar.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded border border-slate-200 bg-white p-2 text-xs">
            {ensayo.valores.map(([a, b]) => <div key={a} className="contents"><dt className="text-slate-600">{a}</dt><dd className="text-right font-mono tabular-nums">{b}</dd></div>)}
          </dl>
          <p className="flex items-start gap-1.5"><span className={cn('mt-0.5 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[ensayo.expectativa.estado])}>{ETIQUETA_L7E[ensayo.expectativa.estado]}</span><span>{ensayo.expectativa.texto}</span></p>
          <p className="text-[11px]"><Fuente id={ensayo.fuente} texto={ensayo.ref} /></p>
        </div>
      </section>
    </>
  );
}
