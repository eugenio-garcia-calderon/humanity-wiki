// ============================================================================
// AGRICULTURA SINTRÓPICA · SPECIES CARD (2026-11-25)
// ============================================================================
// Eugenio: «si pinchas en ellas te diga… una geometría de cuánta agua necesita,
// qué valor tiene, qué alimento produce, en qué zonas de la península es adecuado».
// Everything a designer needs to place a plant, drawn rather than listed where a
// drawing says it faster: its size next to a person, its water against the
// plot's rain, and the map of the Iberian zones where it fits.

import { Droplet, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { ESTRATOS, FUNCIONES, GENERACIONES, SUCESIONES, ZONAS, type Especie, type Zona } from './especies';
import { FENOLOGIA, MESES, aspecto } from './fenologia';
import { COLOR } from './paleta';

const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

function Silueta({ e }: { e: Especie }) {
  const H = Math.max(e.altura, 2), Wd = Math.max(e.copa, 2) + 3, k = 120 / Math.max(H, Wd * 0.6);
  const ancho = Wd * k + 40, alto = H * k + 30, suelo = alto - 14, cx = 30 + (e.copa / 2) * k + 10;
  const copaH = e.forma === 'columnar' ? e.altura * 0.8 : e.forma === 'arbusto' || e.forma === 'mata' || e.forma === 'hierba' ? e.altura : e.forma === 'cepa' ? e.altura * 0.5 : e.altura * 0.6;
  const tronco = e.altura - copaH;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-36 w-full">
      <line x1={0} y1={suelo} x2={ancho} y2={suelo} stroke="#94a3b8" />
      {tronco > 0 && <rect x={cx - 2} y={suelo - tronco * k} width={4} height={tronco * k} fill="#6b4f35" />}
      <ellipse cx={cx} cy={suelo - tronco * k - (copaH * k) / 2} rx={(e.copa / 2) * k} ry={(copaH * k) / 2} fill={e.color} />
      {/* person 1.7 m */}
      <g transform={`translate(${cx + (e.copa / 2) * k + 16} ${suelo})`} fill="#e07a3a">
        <circle cy={-1.55 * k} r={0.13 * k} /><rect x={-0.13 * k} y={-1.42 * k} width={0.26 * k} height={1.42 * k} rx={0.08 * k} />
      </g>
      <text x={4} y={12} fontSize={10} fill="#cbd5e1">{num(e.altura)} m alto · {num(e.copa)} m de copa</text>
    </svg>
  );
}

export function Gotas({ n, className }: { n: number; className?: string }) {
  return <span className={cn('inline-flex', className)}>{[1, 2, 3, 4].map(i => <Droplet key={i} size={12} className={i <= n ? 'fill-sky-400 text-sky-400' : 'text-slate-600'} />)}</span>;
}

export function MapaZonas({ zonas, actual, pequeno }: { zonas: Zona[]; actual?: Zona; pequeno?: boolean }) {
  return (
    <div className={cn('grid grid-cols-3 gap-0.5 rounded-[40%_30%_35%_45%] bg-slate-800 p-1.5', pequeno ? 'w-16' : 'w-full')}>
      {[0, 1, 2].flatMap(f => [0, 1, 2].map(c => {
        const z = ZONAS.find(x => x.fila === f && x.col === c)!;
        const ok = zonas.includes(z.id);
        return (
          <div key={z.id} title={z.nombre} className={cn('flex items-center justify-center rounded text-center leading-tight', pequeno ? 'h-4 text-[0px]' : 'h-11 px-0.5 text-[9px]',
            ok ? 'bg-emerald-600/80 text-white' : 'bg-slate-700 text-slate-500', actual === z.id && 'ring-2 ring-amber-300')}>
            {!pequeno && z.corto}
          </div>
        );
      }))}
    </div>
  );
}

/** The plant's year, month by month: leaves, autumn colour, bare branches, flowers. */
function SuAno({ e }: { e: Especie }) {
  const f = FENOLOGIA[e.id];
  const meses = MESES.map((nombre, i) => {
    const a = aspecto(e.id, i + 0.5);
    const fondo = a.flor > 0.3 && f?.flor ? f.flor[2] : a.hoja < 0.15 ? COLOR.tronco : a.otono > 0.4 && f?.otono ? f.otono : e.color;
    return { nombre, fondo, flor: a.flor > 0.3, desnudo: a.hoja < 0.15 };
  });
  return (
    <section className="rounded-xl border border-slate-800 p-3">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">Su año</h3>
      <div className="grid grid-cols-12 gap-0.5">
        {meses.map(m => <div key={m.nombre} title={m.nombre} className="flex h-7 items-end justify-center rounded text-[8px] font-bold uppercase text-slate-900/70" style={{ background: m.fondo }}>{m.nombre[0]}</div>)}
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">
        {f?.caduca ? `Hoja caduca: brota en ${MESES[Math.floor(f.caduca[0])]} y la pierde en ${MESES[Math.floor(f.caduca[1])]}.` : e.ciclo === 'anual' ? 'Planta anual.' : 'Hoja perenne.'}
        {f?.flor ? ` Florece de ${MESES[Math.floor(f.flor[0])]} a ${MESES[Math.floor(f.flor[1])]}.` : ''}
      </p>
    </section>
  );
}

export default function FichaEspecie({ e, lluvia, zona, onCerrar }: { e: Especie; lluvia: number; zona: Zona; onCerrar: () => void }) {
  const estrato = ESTRATOS.find(x => x.id === e.estrato)!;
  const max = Math.max(e.mm, lluvia, 800);
  return (
    <div className="space-y-3 text-xs text-slate-300">
      <div className="flex items-start gap-2">
        <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: e.color }} />
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">{e.nombre}</h2>
          <p className="italic text-slate-400">{e.cientifico}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {e.clave && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">Especie clave</span>}
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', e.autoctona ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300')}>{e.autoctona ? 'Autóctona' : 'Introducida'}</span>
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px]">{e.ciclo === 'anual' ? 'Anual' : e.ciclo === 'perenne' ? 'Perenne' : 'Leñosa perenne'}</span>
          </div>
        </div>
        <Button variant="ghost" className="px-2 py-1 text-slate-400 hover:bg-slate-800" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></Button>
      </div>
      {e.aviso && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-amber-200">⚠ {e.aviso}</p>}

      <section className="rounded-xl border border-slate-800 p-2"><Silueta e={e} /></section>

      <section className="rounded-xl border border-slate-800 p-3">
        <h3 className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300">Agua <Gotas n={e.agua} /></h3>
        <div className="space-y-1.5">
          <div><div className="flex justify-between text-[10px]"><span>Necesita (mínimo)</span><span className="font-mono text-sky-300">{e.mm} mm/año</span></div>
            <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-sky-500" style={{ width: `${(e.mm / max) * 100}%` }} /></div></div>
          <div><div className="flex justify-between text-[10px]"><span>Llueve en tu parcela</span><span className="font-mono text-emerald-300">{lluvia} mm/año</span></div>
            <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-emerald-500" style={{ width: `${(lluvia / max) * 100}%` }} /></div></div>
          <p className="text-[10px] text-slate-400">{e.mm <= lluvia ? 'Puede vivir en secano en tu parcela.' : `Le faltan unos ${e.mm - lluvia} mm: junto a la zanja, con acolchado o con riego de apoyo.`}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {[
          ['Estrato', `${estrato.nombre}`], ['Generación', `${GENERACIONES[e.gen].nombre} · ${GENERACIONES[e.gen].plazo}`],
          ['Sucesión', SUCESIONES[e.sucesion]], ['Primera cosecha', e.fruto ? `${num(e.fruto)} años` : '—'],
          ['Tamaño adulto', `en ${num(e.madurez)} años`], ['Vive', `${num(e.vida)} años`],
          ['Aguanta heladas', `hasta ${e.helada} °C`], ['Produce', e.alimento],
        ].map(([a, b]) => <div key={a} className="rounded-lg bg-slate-800/60 p-2"><div className="text-[10px] text-slate-500">{a}</div><div className="font-semibold text-slate-200">{b}</div></div>)}
      </section>

      <section className="rounded-xl border border-slate-800 p-3">
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">Valor <span className="ml-1 text-amber-300">{'€'.repeat(e.valor)}<span className="text-slate-600">{'€'.repeat(3 - e.valor)}</span></span></h3>
        <p>{e.valorTxt}.{e.kgPlanta ? ` Cosecha orientativa de una planta adulta en secano: ${num(e.kgPlanta)} kg${e.kgRegadio ? ` (con riego, ${num(e.kgRegadio)} kg)` : ''}.` : ''}</p>
      </section>

      <SuAno e={e} />

      <section className="rounded-xl border border-slate-800 p-3">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">Funciones en el bosque</h3>
        <div className="flex flex-wrap gap-1">{e.funciones.map(f => <span key={f} className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">{FUNCIONES[f]}</span>)}</div>
      </section>

      <section className="rounded-xl border border-slate-800 p-3">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">Dónde encaja en la península</h3>
        <MapaZonas zonas={e.zonas} actual={zona} />
        <p className="mt-1 text-[10px] text-slate-500">En verde, zonas adecuadas. Recuadro ámbar: la zona de tu parcela.</p>
      </section>

      {e.notas && <p className="rounded-lg bg-slate-800/60 p-2 leading-relaxed">{e.notas}</p>}
      <p className="text-[10px] leading-relaxed text-slate-500">Valores orientativos para España, para revisar con el equipo (ingeniería agrícola y forestal y agricultores sintrópicos). No son mediciones de este proyecto.</p>
    </div>
  );
}
