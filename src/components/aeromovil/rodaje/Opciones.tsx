// The options of a part of the running gear, side by side (2026-11-24, Eugenio: «uno puede seleccionar la opción favorita con una
// estrellita … la opción favorita es la que luego muestra el peso y el precio y lo manda arriba al proyecto … tienen que
// aparecer las otras opciones … para poder estudiarlas y compararlas»). A card per option with its star, its figures, what it
// is made of, its pros and cons and where each figure was read; and a table to compare them. The star writes the design's
// own field (`opciones.ts` `camposDeFavorita`), so nothing here keeps a second list.
import { Check, ExternalLink, Star, TriangleAlert } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { eur, type PrecioParte } from '../precios/precios';
import { fmt } from '../controles';
import type { AguantaRueda } from './numeros';
import type { IdSub, OpcionRodaje } from './tipos';

type Eje = 'del' | 'tras' | 'todas';
/** the option's favourites: a steering, brake or suspension has one; the wheels one per axle */
export type Favoritas = { sub: Exclude<IdSub, 'ruedas'>; id: string } | { sub: 'ruedas'; del: string; tras: string };
const esFav = (f: Favoritas, id: string) => f.sub === 'ruedas' ? f.del === id || f.tras === id : f.id === id;

const kg = (v: number) => `${fmt(v, v < 1 ? 2 : 1)} kg`;
const dif = (v: number, unidad: 'kg' | '€') => `${v >= 0 ? '+' : '−'}${unidad === 'kg' ? fmt(Math.abs(v), Math.abs(v) < 1 ? 2 : 1) : fmt(Math.abs(v), 0)} ${unidad}`;

/** «publicado» (a maker's or a shop's page says it) or «estimado» (a figure for a part of its class): both are shown, never mixed up. */
export function Dato({ tipo, children }: { tipo: 'publicado' | 'estimado' | 'mixto'; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded px-1 py-px text-[10px] font-medium', tipo === 'publicado' ? 'bg-emerald-50 text-emerald-800' : tipo === 'estimado' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700')}>{children}</span>;
}
/** What the mass of an option is made of: all its parts' kg published, none of them, or some; null when the option does not list its parts' kg (the wheels: the catalogue's own figure). */
const datoPeso = (o: OpcionRodaje): 'publicado' | 'estimado' | 'mixto' | null => {
  const ps = o.partes.filter(p => p.kg != null);
  return ps.length === 0 ? null : ps.every(p => p.dato === 'publicado') ? 'publicado' : ps.every(p => p.dato === 'estimado') ? 'estimado' : 'mixto';
};

function Estrella({ activa, etiqueta, alPulsar, texto }: { activa: boolean; etiqueta: string; alPulsar: () => void; texto?: string }) {
  return (
    <Button variant="ghost" aria-pressed={activa} aria-label={etiqueta} title={etiqueta} onClick={alPulsar}
      className={cn('shrink-0 gap-1 px-1.5 py-1 text-[11px] normal-case tracking-normal', activa ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600')}>
      <Star className={cn('h-5 w-5', activa && 'fill-amber-400')} />{texto}
    </Button>
  );
}

function TarjetaOpcion({ o, fav, unidades, actual, alElegir, aguanta }: {
  o: OpcionRodaje; fav: Favoritas; unidades: number; actual: { kg: number; eur: number };
  alElegir: (id: string, eje?: Eje) => void; aguanta?: (id: string, eje: 'del' | 'tras') => AguantaRueda | null;
}) {
  const elegida = esFav(fav, o.id), ruedas = fav.sub === 'ruedas';
  const totKg = o.kg * unidades, totEur = o.precio.eur * unidades;
  return (
    <article className={cn('flex flex-col gap-2 rounded-lg border bg-white p-3', elegida ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200')}>
      <header className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-semibold leading-snug text-slate-900">{o.n}</h4>
          {elegida && <p className="text-[11px] font-medium text-amber-700">
            {fav.sub === 'ruedas' ? `La favorita ${fav.del === o.id && fav.tras === o.id ? 'de las cuatro ruedas' : fav.del === o.id ? 'de las delanteras' : 'de las traseras'}` : 'La favorita: su peso y su precio van al proyecto'}</p>}
        </div>
        {ruedas ? (
          <div className="flex shrink-0 flex-col items-end">
            <Estrella activa={fav.del === o.id && fav.tras === o.id} etiqueta={`Elegir ${o.n} para las cuatro ruedas`} alPulsar={() => alElegir(o.id, 'todas')} texto="las 4" />
            <div className="flex">
              <Estrella activa={fav.del === o.id} etiqueta={`Elegir ${o.n} para las ruedas delanteras`} alPulsar={() => alElegir(o.id, 'del')} texto="del." />
              <Estrella activa={fav.tras === o.id} etiqueta={`Elegir ${o.n} para las ruedas traseras`} alPulsar={() => alElegir(o.id, 'tras')} texto="tras." />
            </div>
          </div>
        ) : <Estrella activa={elegida} etiqueta={elegida ? `${o.n} es la favorita` : `Elegir ${o.n} como favorita`} alPulsar={() => alElegir(o.id)} />}
      </header>
      <p className="text-xs leading-snug text-slate-600">{o.resumen}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-slate-500">Peso {o.por}</dt><dd className="text-right font-mono tabular-nums text-slate-900">{kg(o.kg)}</dd>
        <dt className="text-slate-500">Precio {o.por}</dt><dd className="text-right font-mono tabular-nums text-slate-900">{eur(o.precio.eur)}</dd>
        {unidades > 1 && <><dt className="text-slate-500">En el vehículo (× {unidades})</dt><dd className="text-right font-mono tabular-nums text-slate-900">{kg(totKg)} · {eur(totEur)}</dd></>}
        {!elegida && !ruedas && <><dt className="text-slate-500">Frente a lo que lleva hoy</dt><dd className="text-right font-mono tabular-nums text-slate-700">{dif(totKg - actual.kg, 'kg')} · {dif(totEur - actual.eur, '€')}</dd></>}
      </dl>
      <p className="flex flex-wrap gap-1 text-[10px]">
        <Dato tipo={o.precio.tipo}>precio {o.precio.tipo}</Dato>
        {datoPeso(o) && <Dato tipo={datoPeso(o)!}>peso {datoPeso(o)}</Dato>}
      </p>
      {ruedas && aguanta && (['del', 'tras'] as const).map(e => { const a = aguanta(o.id, e); return a && (
        <p key={e} className={cn('flex items-start gap-1 text-[11px]', a.cargaOk && a.velocidadOk ? 'text-emerald-800' : 'text-red-700')}>
          {a.cargaOk && a.velocidadOk ? <Check className="mt-0.5 h-3 w-3 shrink-0" /> : <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />}
          <span>{e === 'del' ? 'Delante' : 'Detrás'}: carga {fmt(a.carga, 0)} de {a.capacidad} kg, {a.velocidad} de {a.vmax} km/h {a.cargaOk && a.velocidadOk ? 'aguanta' : 'NO aguanta'}</span>
        </p>); })}
      <details className="text-xs text-slate-700">
        <summary className="cursor-pointer select-none font-medium text-teal-800">De qué está hecha y de dónde sale cada cifra</summary>
        <div className="mt-2 flex flex-col gap-2">
          {o.partes.length > 0 && (
            <table className="w-full text-left text-[11px]">
              <thead><tr className="text-slate-500"><th className="py-0.5 pr-2 font-medium">Pieza</th><th className="px-1 text-right font-medium">Uds.</th><th className="px-1 text-right font-medium">kg</th><th className="px-1 text-right font-medium">€</th><th className="pl-1 font-medium">Se</th></tr></thead>
              <tbody>{o.partes.map(p => (
                <tr key={p.n} className="border-t border-slate-100 align-top">
                  <td className="py-0.5 pr-2"><span className="font-medium text-slate-800">{p.n}</span><span className="block leading-snug text-slate-500">{p.nota}</span></td>
                  <td className="px-1 text-right font-mono tabular-nums">{p.cantidad}</td>
                  <td className="px-1 text-right font-mono tabular-nums">{p.kg != null ? fmt(p.kg, p.kg < 1 ? 3 : 2) : '—'}</td>
                  <td className="px-1 text-right font-mono tabular-nums">{p.eur != null ? fmt(p.eur, 0) : '—'}</td>
                  <td className="pl-1"><Dato tipo={p.dato}>{p.dato}</Dato><span className="block text-slate-400">{p.origen === 'fabricar' ? 'se fabrica' : 'se compra'}</span></td>
                </tr>))}</tbody>
            </table>)}
          <p className="text-slate-600"><span className="font-medium text-slate-800">Peso:</span> {o.masa}.</p>
          <p className="text-slate-600"><span className="font-medium text-slate-800">Precio:</span> {o.precio.nota}.</p>
          {o.datos && <ul className="text-slate-600">{o.datos.map(([k, v]) => <li key={k}><span className="font-medium text-slate-800">{k}:</span> {v}</li>)}</ul>}
          {(o.pros.length > 0 || o.contras.length > 0) && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ul className="space-y-0.5">{o.pros.map(p => <li key={p} className="text-emerald-800">+ {p}</li>)}</ul>
              <ul className="space-y-0.5">{o.contras.map(p => <li key={p} className="text-red-800">− {p}</li>)}</ul>
            </div>)}
          <ul className="space-y-0.5 text-[11px]">
            {o.fuentes.map(f => (
              <li key={f.url + f.t} className="flex flex-wrap items-center gap-1">
                <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-teal-700 underline">{f.t}<ExternalLink className="h-3 w-3" /></a>
                {f.leido ? <span className="text-slate-400">leída el {f.leido}</span> : <span className="rounded bg-amber-50 px-1 text-amber-800">citada en el estudio; no se pudo abrir</span>}
              </li>))}
          </ul>
        </div>
      </details>
    </article>
  );
}

/** The options as a table, one column each, with the cheapest and the lightest marked and the others' difference to the favourite. */
function TablaComparar({ lista, fav, unidades }: { lista: OpcionRodaje[]; fav: Favoritas; unidades: number }) {
  const minKg = Math.min(...lista.map(o => o.kg)), minEur = Math.min(...lista.map(o => o.precio.eur));
  const claves = [...new Set(lista.flatMap(o => (o.datos ?? []).map(d => d[0])))];
  const celda = 'px-2 py-1 text-right font-mono tabular-nums';
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="px-2 py-1 font-medium">&nbsp;</th>
            {lista.map(o => (
              <th key={o.id} className={cn('max-w-[11rem] px-2 py-1 text-right align-bottom font-medium', esFav(fav, o.id) && 'bg-amber-50 text-amber-800')}>
                {esFav(fav, o.id) && <Star className="mb-0.5 ml-auto h-3.5 w-3.5 fill-amber-400 text-amber-600" />}{o.n}
              </th>))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100"><th className="px-2 py-1 font-medium text-slate-600">Peso (unidad)</th>{lista.map(o => <td key={o.id} className={cn(celda, o.kg === minKg && 'font-semibold text-emerald-700')}>{kg(o.kg)}</td>)}</tr>
          <tr className="border-b border-slate-100"><th className="px-2 py-1 font-medium text-slate-600">Precio (unidad)</th>{lista.map(o => <td key={o.id} className={cn(celda, o.precio.eur === minEur && 'font-semibold text-emerald-700')}>{eur(o.precio.eur)}</td>)}</tr>
          {unidades > 1 && <tr className="border-b border-slate-100"><th className="px-2 py-1 font-medium text-slate-600">En el vehículo (× {unidades})</th>{lista.map(o => <td key={o.id} className={celda}>{kg(o.kg * unidades)}<br />{eur(o.precio.eur * unidades)}</td>)}</tr>}
          <tr className="border-b border-slate-100"><th className="px-2 py-1 font-medium text-slate-600">Precio</th>{lista.map(o => <td key={o.id} className="px-2 py-1 text-right"><Dato tipo={o.precio.tipo}>{o.precio.tipo}</Dato></td>)}</tr>
          <tr className="border-b border-slate-100"><th className="px-2 py-1 font-medium text-slate-600">Piezas</th>{lista.map(o => <td key={o.id} className={celda}>{o.partes.reduce((a, p) => a + p.cantidad, 0) || '—'}</td>)}</tr>
          <tr className={claves.length ? 'border-b border-slate-100' : ''}><th className="px-2 py-1 font-medium text-slate-600">Se fabrican</th>{lista.map(o => <td key={o.id} className={celda}>{o.partes.filter(p => p.origen === 'fabricar').reduce((a, p) => a + p.cantidad, 0) || '—'}</td>)}</tr>
          {claves.map(k => <tr key={k} className="border-b border-slate-100 last:border-0"><th className="px-2 py-1 font-medium text-slate-600">{k}</th>{lista.map(o => <td key={o.id} className="px-2 py-1 text-right text-[11px] text-slate-700">{o.datos?.find(d => d[0] === k)?.[1] ?? '—'}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function Opciones({ lista, fav, unidades, actual, alElegir, aguanta }: {
  lista: OpcionRodaje[]; fav: Favoritas; unidades: number;
  /** what the project carries now for this part (kg, €): the favourite's, or the model's own estimate when none is chosen */
  actual: { kg: number; eur: number };
  alElegir: (id: string, eje?: Eje) => void; aguanta?: (id: string, eje: 'del' | 'tras') => AguantaRueda | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-600">
        Pulsa la <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-600" /> de una opción para hacerla <strong>la favorita</strong>: su peso y su precio pasan al proyecto, sus piezas salen en «Peso: todos los componentes» y en los
        precios, y las comprobaciones la usan. Las demás siguen aquí para estudiarlas y compararlas; cambiar de favorita se puede deshacer pulsando otra.
      </p>
      <div className="grid gap-3 md:grid-cols-2">{lista.map(o => <TarjetaOpcion key={o.id} o={o} fav={fav} unidades={unidades} actual={actual} alElegir={alElegir} aguanta={aguanta} />)}</div>
      <h4 className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Comparación</h4>
      <TablaComparar lista={lista} fav={fav} unidades={unidades} />
    </div>
  );
}

/** The model's own parts behind a part's numbers: what the mass list holds and where each price comes from. */
export function PartesDelProyecto({ partes }: { partes: PrecioParte[] }) {
  if (partes.length === 0) return <p className="text-xs text-slate-500">El proyecto no lleva todavía ninguna pieza de esta parte.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-xs">
      {partes.map(p => (
        <li key={p.nombre} className="flex flex-col gap-0.5 px-2.5 py-1.5">
          <div className="flex items-baseline justify-between gap-3"><span className="font-medium text-slate-800">{p.nombre}</span><span className="shrink-0 font-mono tabular-nums text-slate-800">{kg(p.kg)} · {eur(p.eur)}</span></div>
          <p className="text-[11px] leading-snug text-slate-500">{p.como}{p.propio ? ' (precio escrito por ti)' : ''}</p>
        </li>))}
    </ul>
  );
}
