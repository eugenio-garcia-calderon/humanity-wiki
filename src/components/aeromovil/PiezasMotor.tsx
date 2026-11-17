// «Mostrar solo el motor», piece by piece (2026-11-17, Eugenio: «que todas esas partes, esas componentes, se les pueda
// también pinchar en mostrar solo esta parte dentro de todo el conjunto. Imagínate que solo ves la parte del radiador con
// su circuito de agua y sus tubos. O ves solo la parte del bloque del motor. O ves solo la parte del engranaje
// planetario»). With «Motor» shown alone: a list of this design's engine parts by group, each group and each part with
// «Ver solo», and a click on a part in the 3D offers «Mostrar solo esta pieza». The registry is piezasMotor.ts; the 3D
// side, visor/piezasMotor3d.ts.
import { useEffect, useMemo, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Button, Card } from '../ui/core';
import { cn } from '../../utils/cn';
import { GRUPOS_MOTOR, NOMBRES_PIEZA, grupoDePieza, piezasPresentes, type ModeloConMotor } from './piezasMotor';
import type { OpcionesPiezas } from './visor/piezasMotor3d';

export interface EstadoPiezas {
  /** «Motor» is shown alone on a vehicle with an engine parts list. */
  activo: boolean;
  grupos: { id: string; n: string; piezas: string[] }[];
  /** What is shown alone now: its name and parts; null: the whole engine. */
  solo: { n: string; piezas: string[] } | null;
  ver: (s: { n: string; piezas: string[] } | null) => void;
  /** The part last clicked in the 3D (its `componente`), offered to be shown alone. */
  pinchada: string | null;
  soltar: () => void;
  /** For the viewer's click: true when it was an engine part and the click is handled here. */
  pinchar: (donde?: { nombres: string[] }) => boolean;
  visor: OpcionesPiezas | null;
}

export function usePiezasMotor(modelo: ModeloConMotor, motorSolo: boolean): EstadoPiezas {
  const presentes = useMemo(() => piezasPresentes(modelo), [modelo]);
  const grupos = useMemo(() => GRUPOS_MOTOR.map(g => ({ id: g.id, n: g.n, piezas: g.componentes.filter(c => presentes.includes(c)) })).filter(g => g.piezas.length), [presentes]);
  const activo = motorSolo && grupos.length > 0;
  const [solo, ver] = useState<{ n: string; piezas: string[] } | null>(null);
  const [pinchada, setPinchada] = useState<string | null>(null);
  // leaving «Motor» alone (or a part that this design no longer has) puts the whole engine back
  useEffect(() => { if (!activo) { ver(null); setPinchada(null); } }, [activo]);
  useEffect(() => { if (solo && !solo.piezas.some(c => presentes.includes(c))) ver(null); if (pinchada && !presentes.includes(pinchada)) setPinchada(null); }, [presentes, solo, pinchada]);
  const pinchar = (donde?: { nombres: string[] }) => {
    if (!activo || !donde) return false;
    const c = donde.nombres.find(n => n.startsWith('comp:'))?.slice(5);
    if (!c || !grupoDePieza(c)) return false;
    setPinchada(c);
    return true;
  };
  const visorKey = `${activo}|${solo?.piezas.join(',') ?? ''}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visor = useMemo(() => activo ? { solo: solo?.piezas ?? null, etiquetas: true } : null, [visorKey]);
  return { activo, grupos, solo, ver: s => { ver(s); setPinchada(null); }, pinchada, soltar: () => setPinchada(null), pinchar, visor };
}

const nombre = (c: string) => NOMBRES_PIEZA[c] ?? c;
const igual = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

/** The side panel's list: the whole engine, each group and each of its parts, with «Ver solo». */
export function ListaPiezasMotor({ p }: { p: EstadoPiezas }) {
  if (!p.activo) return null;
  const elegido = (piezas: string[]) => !!p.solo && igual(p.solo.piezas, piezas);
  const boton = (activo: boolean) => cn('shrink-0 px-2 py-0.5 text-[11px] normal-case tracking-normal', activo ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'bg-white');
  return (
    <Card className="p-3" role="group" aria-label="Piezas del motor">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Piezas del motor</p>
        <Button variant="outline" aria-pressed={!p.solo} onClick={() => p.ver(null)} className={boton(!p.solo)}>Todo el motor</Button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        {p.solo ? `Viendo solo: ${p.solo.n}.` : 'Elige un grupo o una pieza para verla sola, o pincha una pieza en el 3D.'}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {p.grupos.map(g => (
          <li key={g.id} className="rounded-lg border border-slate-200 px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[12px] font-semibold text-slate-800">{g.n}</span>
              <Button variant="outline" aria-pressed={elegido(g.piezas)} onClick={() => p.ver({ n: g.n, piezas: g.piezas })} className={boton(elegido(g.piezas))}>
                <Eye className="mr-1 h-3 w-3" />Ver solo
              </Button>
            </div>
            {g.piezas.length > 1 && (
              <ul className="mt-1 flex flex-col gap-0.5 pl-2">
                {g.piezas.map(c => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[11px] text-slate-600">{nombre(c)}</span>
                    <Button variant="ghost" aria-pressed={elegido([c])} onClick={() => p.ver({ n: nombre(c), piezas: [c] })}
                      className={cn('shrink-0 px-1.5 py-0.5 text-[11px] normal-case tracking-normal', elegido([c]) ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-teal-800')}>
                      Ver solo esto
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Over the 3D: the part just clicked, with «Mostrar solo esta pieza» and «… todo su grupo». */
export function TarjetaPiezaPinchada({ p }: { p: EstadoPiezas }) {
  if (!p.activo || !p.pinchada) return null;
  const c = p.pinchada, g = grupoDePieza(c), piezasGrupo = p.grupos.find(x => x.id === g?.id)?.piezas ?? [c];
  return (
    <Card role="group" aria-label={`Pieza: ${nombre(c)}`} className="absolute left-3 top-3 z-[16] w-[min(290px,calc(100%-72px))] p-2.5 shadow-lg">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{nombre(c)}</p>
          {g && <p className="text-[11px] text-slate-500">{g.n}</p>}
        </div>
        <Button variant="ghost" onClick={p.soltar} aria-label="Cerrar" title="Cerrar" className="-mr-1 -mt-1 h-8 w-8 shrink-0 p-0"><X className="h-4 w-4" /></Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button variant="outline" onClick={() => p.ver({ n: nombre(c), piezas: [c] })} className="bg-white px-2 py-1 text-[11px] normal-case tracking-normal">Mostrar solo esta pieza</Button>
        {g && piezasGrupo.length > 1 && <Button variant="outline" onClick={() => p.ver({ n: g.n, piezas: piezasGrupo })} className="bg-white px-2 py-1 text-[11px] normal-case tracking-normal">Solo {g.n.toLowerCase()}</Button>}
      </div>
    </Card>
  );
}
