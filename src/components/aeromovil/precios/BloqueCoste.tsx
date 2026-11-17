/**
 * «Coste» under «Proyecto» (2026-11-17, Eugenio: «el precio global tiene que aparecer sumado debajo de proyecto»): the
 * materials and parts by department, the labour, the total and € per kg, from `costeProyecto` (coste.ts). Compact: one
 * line per department, a button to each tab, and one to «Mano de obra».
 */
import { ArrowRight } from 'lucide-react';
import { Button } from '../../ui/core';
import { Bloque } from '../controles';
import { eur } from './precios';
import type { CosteProyecto } from './coste';

const NOMBRES: Record<string, string> = { carroceria: 'Carrocería', interior: 'Interior', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Energía' };

export function BloqueCoste({ c, alIr }: { c: CosteProyecto; alIr: (dep: string) => void }) {
  const deps = Object.keys(NOMBRES).filter(d => (c.precios.porDep as Record<string, number | undefined>)[d] != null);
  const horas = c.partidas.reduce((a, p) => a + p.h, 0), propios = c.precios.propios + c.partidas.filter(p => p.propio).length;
  const fila = 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2';
  return (
    <Bloque titulo="Coste del prototipo" nota={eur(c.total)}>
      <div className="flex flex-col gap-0.5 text-[13px]">
        {deps.map(d => (
          <div key={d} className={fila}>
            <span className="text-slate-600">{NOMBRES[d]}</span>
            <span className="font-mono text-xs tabular-nums text-slate-700">{eur((c.precios.porDep as Record<string, number>)[d])}</span>
            <Button variant="ghost" onClick={() => alIr(d)} className="px-1 py-0 text-slate-400" title={`Ver los precios de ${NOMBRES[d]}`} aria-label={`Abrir ${NOMBRES[d]}`}><ArrowRight className="h-3 w-3" /></Button>
          </div>
        ))}
        <div className={`${fila} border-t border-slate-200 pt-1`}>
          <span className="font-medium text-slate-700">Materiales y piezas</span>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">{eur(c.materiales)}</span><span className="w-5" />
        </div>
        <div className={fila}>
          <span className="font-medium text-slate-700">Mano de obra <span className="font-normal text-slate-400">({Math.round(horas)} h)</span></span>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">{eur(c.manoObra)}</span>
          <Button variant="ghost" onClick={() => alIr('manoobra')} className="px-1 py-0 text-slate-400" title="Abrir «Mano de obra»" aria-label="Abrir Mano de obra"><ArrowRight className="h-3 w-3" /></Button>
        </div>
        <div className={`${fila} border-t border-slate-300 pt-1`}>
          <span className="font-semibold text-slate-900">Total</span>
          <span className="font-mono text-sm font-bold tabular-nums text-teal-800">{eur(c.total)}</span><span className="w-5" />
        </div>
        {c.eurKg != null && <p className="text-right font-mono text-[11px] text-slate-500">{eur(c.eurKg)} por kg en vacío</p>}
      </div>
      <p className="text-xs text-slate-500">Lo que cuesta construir un prototipo: piezas y materiales comprados en tienda, y horas de taller. {propios ? `${propios} precio${propios > 1 ? 's' : ''} puesto${propios > 1 ? 's' : ''} por ti; el resto,` : 'Todos'} estimados por clase de pieza (o el precio publicado del catálogo, si eliges una pieza de él). El precio de cada pieza está en el desplegable de su sección, junto a su peso: púlsalo para poner el tuyo.</p>
    </Bloque>
  );
}
