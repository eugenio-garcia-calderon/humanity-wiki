// (2026-11-27) The «Homologación» page of the car and aircraft projects (`proyectos.ts`). The bicycle's is the pedal cycle's file
// (`PaginaHomologacion.tsx` → `epac/PaginaEpac.tsx`); the car's is the L6e/L7e pre-check with the three ways to approve; the
// aircraft's is `avion.ts` drawn as tables. Text as data; these screens only draw it.
import { useCallback, useState } from 'react';
import { AlertTriangle, ExternalLink, Layers, Plane, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { Modelo, Parametros, Resultados } from '../geometria';
import type { CdConocido } from './ficha';
import { FUENTES } from './normas';
import { PanelHomologacion, useHomologacion } from './PanelHomologacion';
import { OtrasHomologaciones } from './OtrasHomologaciones';
import { ViaDetalle } from './GuiaPagina';
import { VIAS } from './guias';
import { FUENTES_AVION, LIMITES_ULM, NO_COMPROBADO, PASOS_AVION, TABLA_ULM, VIAS_AVION } from './avion';

const kg = (v: number) => `${Math.round(v).toLocaleString('es-ES')} kg`;

/** «Aeromóvil coche»: a motor quadricycle (L6e / L7e). */
export function PaginaHomologacionCoche({ P, modelo, res, cd, nombre }: { P: Parametros; modelo: Modelo; res: Resultados; cd: CdConocido | null; nombre: string }) {
  const { ficha, auto } = useHomologacion(P, modelo, res, cd, nombre);
  const [otras, setOtras] = useState(false);
  const cerrar = useCallback(() => setOtras(false), []);
  return (
    <section aria-label="Homologación" className="mx-auto flex max-w-6xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-72">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-700" />Homologación · Aeromóvil coche: cuadriciclo de motor</h2>
          <p className="text-[13px] text-slate-600">{ficha.vehiculo}. La categoría europea que le toca (L6e o L7e, o turismo si pasa de sus límites), lo que cumple y lo que no, y las tres vías para aprobarlo.</p>
        </div>
        <Button variant="outline" onClick={() => setOtras(true)} aria-haspopup="dialog" className="gap-1.5 px-3 py-1.5 text-xs normal-case tracking-normal"><Layers className="h-3.5 w-3.5" />Otras homologaciones (L1e-A, guías)</Button>
      </header>
      <PanelHomologacion P={P} modelo={modelo} res={res} cd={cd} nombre={nombre} />
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-slate-900">Cómo se aprueba: tres vías</h3>
        {VIAS.map(v => <ViaDetalle key={v.id} v={v} />)}
      </div>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Textos legales</summary>
        <ul className="mt-1 flex flex-col gap-0.5">{Object.entries(FUENTES).map(([id, f]) => (
          <li key={id}><a className="text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>{!f.leido && <span className="text-slate-500"> (citado, no releído: por confirmar)</span>}</li>
        ))}</ul>
      </details>
      <OtrasHomologaciones ficha={ficha} auto={auto} abierto={otras} cerrar={cerrar} />
    </section>
  );
}

/** «Aeromóvil avión»: the legal boxes of an aircraft that also rolls, and the design's mass against the ULM limit. */
export function PaginaHomologacionAvion({ res, nombre }: { res: Resultados; nombre: string }) {
  const vacio = res.mVeh, conOcupantes = res.mTot, total = conOcupantes + LIMITES_ULM.equipaje, margen = LIMITES_ULM.masaMaxima - total;
  const fuente = (k: string) => FUENTES_AVION[k];
  return (
    <section aria-label="Homologación" className="mx-auto flex max-w-6xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Plane className="h-5 w-5 text-teal-700" />Homologación · Aeromóvil avión</h2>
        <p className="text-[13px] text-slate-600">{nombre}. Un avión se certifica con otra autoridad que un coche (AESA en España, EASA en Europa). Aquí, los cajones legales posibles, del más barato al más caro, y el número que lo decide todo: la masa.</p>
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Primera versión, sin leer todavía los textos legales: cada cifra está por confirmar en el BOE y en las páginas de AESA. Orientativo, no es una certificación.</p>
      </header>

      <div className={cn('rounded-lg border p-3 text-[13px]', margen >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950')}>
        <p className="font-semibold">Masa frente al límite de un ULM biplaza ({kg(LIMITES_ULM.masaMaxima)}, por confirmar)</p>
        <dl className="mt-1 grid max-w-md grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 font-mono text-xs tabular-nums">
          <dt className="font-sans">En vacío (este diseño)</dt><dd className="text-right">{kg(vacio)}</dd>
          <dt className="font-sans">Con los ocupantes</dt><dd className="text-right">{kg(conOcupantes)}</dd>
          <dt className="font-sans">Y {LIMITES_ULM.equipaje} kg de equipaje</dt><dd className="text-right">{kg(total)}</dd>
          <dt className="font-sans font-semibold">{margen >= 0 ? 'Margen' : 'Sobran'}</dt><dd className="text-right font-semibold">{kg(Math.abs(margen))}</dd>
        </dl>
        <p className="mt-1 text-xs">{margen >= 0 ? 'Cabe, sin contar todavía las alas, el motor de vuelo y su estructura: el editor no los calcula aún.' : 'No cabe ni sin alas: hay que quitar peso antes de dibujarlas, o ir a un cajón con más masa (EASA).'}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-slate-900">Los cuatro cajones</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-1 pr-2 font-medium">Vía</th><th className="px-2 font-medium">Quién certifica</th><th className="px-2 font-medium">Vale en</th><th className="px-2 font-medium">Se puede vender</th><th className="px-2 font-medium">Cuándo</th><th className="pl-2 font-medium">Ojo</th></tr></thead>
            <tbody>{VIAS_AVION.map(v => (
              <tr key={v.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-2 font-semibold text-slate-900">{v.nombre}</td><td className="px-2 text-slate-700">{v.quien}</td><td className="px-2 text-slate-700">{v.vale}</td><td className="px-2 text-slate-700">{v.vender}</td>
                <td className="px-2 text-slate-700">{v.cuando}</td><td className="pl-2 text-slate-600">{v.ojo} {v.fuentes.map(k => <a key={k} href={fuente(k).url} target="_blank" rel="noreferrer" className="inline-flex items-center text-teal-700" title={fuente(k).titulo}><ExternalLink className="ml-0.5 h-3 w-3" /></a>)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-slate-900">Lo que pide un ultraligero (ULM) en España</h3>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[13px]">
          {TABLA_ULM.map(f => (
            <li key={f.concepto} className="grid gap-x-3 px-3 py-2 md:grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)_minmax(0,1fr)]">
              <span className="font-semibold text-slate-900">{f.concepto}</span>
              <span className="text-slate-700">{f.norma}</span>
              <span className="text-xs text-slate-500">{f.ref} · <a className="text-teal-700 underline" href={fuente(f.fuente).url} target="_blank" rel="noreferrer">fuente</a> · <span className="text-amber-700">por confirmar</span></span>
            </li>))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-slate-900">Pasos</h3>
        <ol className="ml-5 list-decimal space-y-1 text-[13px] text-slate-700">{PASOS_AVION.map(p => <li key={p.titulo}><strong className="text-slate-900">{p.titulo}.</strong> {p.texto}</li>)}</ol>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-900">Lo que no está comprobado</p>
        <ul className="ml-4 mt-1 list-disc">{NO_COMPROBADO.map(t => <li key={t}>{t}</li>)}</ul>
      </div>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Fuentes (vistas en el buscador, sin abrir)</summary>
        <ul className="mt-1 flex flex-col gap-0.5">{Object.entries(FUENTES_AVION).map(([id, f]) => <li key={id}><a className="text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a></li>)}</ul>
      </details>
    </section>
  );
}
