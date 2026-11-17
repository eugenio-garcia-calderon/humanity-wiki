// «Interior › Asientos»: the riders' size (2026-11-17, «muñecos»). Eugenio: «permite cambiar el tamaño de los muñecos
// para que sean más altos o más gordos para ver cómo entran en el vehículo». The model is triciclo/talla.ts, the fit
// triciclo/ajusteOcupantes.ts; this is only the controls and a one-line verdict per rider.
import { Button } from '../ui/core';
import type { ModeloTriciclo, Parametros } from './geometria';
import { Deslizador, Selector, fmt } from './controles';
import { COMPLEXIONES, ESTATURA_MAX, ESTATURA_MIN, MASA_MAX, MASA_MIN, TALLAS, type CamposTalla, type ClaveTalla, type Complexion } from './triciclo/talla';
import { ajustePlaza, plazasMedidas } from './triciclo/ajusteOcupantes';

type Set = <K extends keyof Parametros>(k: K, v: Parametros[K]) => void;

const PARTES: Record<string, string> = { cabeza: 'la cabeza', hombros: 'los hombros', caderas: 'las caderas', vientre: 'el vientre', rodillas: 'las rodillas', pies: 'los pies' };

function Ocupante({ titulo, piloto, P, set, modelo }: { titulo: string; piloto: boolean; P: Parametros; set: Set; modelo: ModeloTriciclo }) {
  const Q = P as Parametros & CamposTalla, cu = piloto ? modelo.cuerpos.piloto : modelo.cuerpos.pasajero;
  const kT: ClaveTalla = piloto ? 'tTallaPil' : 'tTallaPas', kC: ClaveTalla = piloto ? 'tComplPil' : 'tComplPas', kM: ClaveTalla = piloto ? 'tMPil' : 'tMPas';
  const poner = (k: ClaveTalla, v: number | string | undefined) => set(k as keyof Parametros, v as never);
  const ref = TALLAS.find(t => Math.abs(t.m - cu.estatura) < 0.004)?.k ?? 'medida';
  // what does not fit, for this rider (each rear row: its outer place on the right)
  const plazas = plazasMedidas(modelo).filter(q => q.piloto === piloto);
  const fallos = plazas.flatMap(q => ajustePlaza(modelo, q)).filter(a => a.holgura < a.minimo);
  const roza = fallos.filter(a => a.holgura < 0), justo = fallos.filter(a => a.holgura >= 0);
  const lista = (l: typeof fallos) => [...new Set(l.map(a => PARTES[a.parte]))].join(', ');
  const id = piloto ? 'pil' : 'pas';
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-2">
      <div className="text-xs font-semibold text-slate-700">{titulo}</div>
      <Selector id={`t-talla-ref-${id}`} etiqueta="Talla de referencia" valor={ref}
        opciones={[...TALLAS.map(t => ({ k: t.k, n: t.n })), ...(ref === 'medida' ? [{ k: 'medida', n: 'A medida' }] : [])]}
        alCambiar={v => { const t = TALLAS.find(x => x.k === v); if (t) poner(kT, t.m); }} />
      <Deslizador id={`t-talla-${id}`} etiqueta="Estatura" valor={cu.estatura} min={ESTATURA_MIN} max={ESTATURA_MAX} paso={0.01}
        mostrar={`${fmt(cu.estatura, 2)} m`} alCambiar={v => poner(kT, Math.round(v * 1000) / 1000)} />
      <Selector<Complexion> id={`t-compl-${id}`} etiqueta="Complexión" valor={cu.complexion} opciones={COMPLEXIONES.map(c => ({ k: c.k, n: c.n }))}
        alCambiar={v => poner(kC, v)} />
      <Deslizador id={`t-masa-${id}`} etiqueta={cu.aMano ? 'Masa (escrita a mano)' : 'Masa (estimada por la talla)'} valor={cu.kg} min={MASA_MIN} max={MASA_MAX} paso={1}
        mostrar={`${Math.round(cu.kg)} kg`} alCambiar={v => poner(kM, Math.round(v))} />
      {cu.aMano && (
        <Button variant="ghost" className="self-start px-1.5 py-0.5 text-xs text-teal-800" onClick={() => poner(kM, undefined)}>
          Volver a la masa estimada ({Math.round(cu.kgEstimada)} kg)
        </Button>
      )}
      <p className={`text-xs ${roza.length ? 'text-red-700' : justo.length ? 'text-amber-800' : 'text-emerald-700'}`}>
        {roza.length ? `No cabe: toca con ${lista(roza)} (en rojo en el 3D).` : ''}
        {justo.length ? ` Justo: ${lista(justo)} (en naranja).` : ''}
        {!fallos.length ? 'Cabe: nada toca.' : ''}
      </p>
      {Q[kT] == null && Q[kC] == null && <p className="text-[11px] text-slate-500">De serie: el hombre medio, como siempre.</p>}
    </div>
  );
}

export function TallasOcupantes({ P, set, modelo }: { P: Parametros; set: Set; modelo: ModeloTriciclo }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500">
        El tamaño de los muñecos: más altos alargan el tronco, las piernas y los brazos en proporción (la cadera se queda en el asiento y los pies en
        los pedales o las plataformas); más corpulentos, más anchos de hombros y caderas y con más barriga. Lo que toca se pinta en rojo en el 3D y
        lo que queda justo, en naranja; las comprobaciones «… con su talla» dicen cuánto. La masa sigue a la talla (la «Masa por ocupante» es la del
        hombre medio, × estatura² × índice de masa corporal) y entra en el peso, el centro de gravedad y el vuelco; se puede escribir a mano.
        Tallas: ANSUR II (Gordon y otros, 2014) y DINED (TU Delft) para el neerlandés.
      </p>
      <Ocupante titulo="Piloto" piloto P={P} set={set} modelo={modelo} />
      <Ocupante titulo={modelo.filas ? 'Pasajeros (filas 2 y 3)' : 'Pasajero'} piloto={false} P={P} set={set} modelo={modelo} />
    </div>
  );
}
