// «Motor › Electrónica de potencia» (2026-11-17, Eugenio: «Crea un nuevo apartado dentro de MOTOR que sea Electronica de
// potencia y añade el control de potencia, todas logicas de arranque del termico y cuando se activa con sliders, mapa de
// motor, y esas cosas importantes»). The block draws its own sliders (rows `tEp…` of FILAS, campos.ts; LadoTriciclo
// leaves that block out of its generic list) so that they can be grouped and read in words; the model is
// triciclo/electronica.ts, and its figures reach the speeds (energia.ts) and the homologation (homologacion/ficha.ts).
import { Fragment } from 'react';
import { Bloque, Deslizador, Selector, fmt } from '../controles';
import type { Parametros } from '../geometria';
import { AUXILIARES, RENDIMIENTO, crrTriciclo, limitarTriciclo, rangoTriciclo, SELECTORES_TRICICLO, fichaTriciclo, type CamposTriciclo, type ClaveNumTriciclo, type ModeloTriciclo } from '../geometriaTriciclo';
import { arrancaTermico, electronicaTriciclo, ECO_PICO, TEXTO_LIMITADOR } from '../triciclo/electronica';
import { LIMITE_L7E } from '../homologacion/l7e';
import { cn } from '../../../utils/cn';

export const BLOQUE_ELECTRONICA = 'Electrónica de potencia';

interface Energia { CdA: number; vmaxNominal: number; vmaxPico: number; vmaxConjunta: number; acel50: number; hibrido: { vmaxGasolina: number } | null }

const kW = (v: number) => `${fmt(v, 1)} kW`;

export function BloqueElectronica({ T, set, modelo, mTot, e, plegable }: {
  T: CamposTriciclo; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; modelo: ModeloTriciclo; mTot: number;
  e: Energia | null; plegable?: { abierto: boolean; alAlternar: () => void };
}) {
  const el = electronicaTriciclo(T), hib = el.hibrido;
  const texto = (k: ClaveNumTriciclo, v: number): string => {
    switch (k) {
      case 'tEpLimCont': case 'tEpLimPico': return v <= 0 ? 'sin límite' : kW(v);
      case 'tEpArrKW': return v <= 0 ? 'nunca por potencia' : kW(v);
      case 'tEpArrVel': return v <= 0 ? 'nunca por velocidad' : `${Math.round(v)} km/h`;
      case 'tEpHist': return `+${Math.round(v)} % (para al ${Math.round(limitarTriciclo('tEpArrSoc', T) + v)} %)`;
      case 'tEpPicoSeg': case 'tEpCalent': return `${Math.round(v)} s`;
      case 'tEpArrSoc': return `${Math.round(v)} %`;
      default: return kW(v);
    }
  };
  const desl = (k: ClaveNumTriciclo) => {
    const f = fichaTriciclo(k)!, [a, b] = rangoTriciclo(k, T), v = limitarTriciclo(k, T);
    return <Deslizador key={k} id={`t-${k}`} clave={k} etiqueta={f.n} valor={v} min={a} max={b} paso={f.paso} mostrar={texto(k, v)} alCambiar={x => set(k, x as never)} />;
  };
  const sel = (k: 'tEpEstrategia' | 'tEpSport' | 'tEpMapa' | 'tEpLim1' | 'tEpLim2') => {
    const s = SELECTORES_TRICICLO.find(x => x.clave === k)!;
    return <Selector key={k} id={`t-${k}`} clave={k} etiqueta={s.n} valor={T[k] as string} opciones={s.opciones} alCambiar={v => set(k, v as never)} />;
  };
  const sub = (t: string) => <h4 className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t}</h4>;
  const nota = (t: string) => <p className="-mt-0.5 text-xs text-slate-500">{t}</p>;
  // the power the car asks at a speed on the flat (kW at the battery, as energia.ts counts it)
  const pide = (kmh: number) => { if (!e) return null; const v = kmh / 3.6; return ((0.5 * 1.2 * e.CdA * v ** 3 + crrTriciclo(T) * mTot * 9.81 * v) / RENDIMIENTO + AUXILIARES) / 1000; };
  const vel = Math.round(limitarTriciclo('tVel', T));
  const velocidades = [...new Set([30, 50, 90, 120, vel])].sort((a, b) => a - b);
  const pasa = (v: number) => v > LIMITE_L7E + 1e-9;
  const ESTRATEGIA: Record<CamposTriciclo['tEpEstrategia'], string> = {
    libre: 'Sin gestión: cuando los dos empujan, cada uno da todo lo suyo y la suma no la limita nadie. Es como estaba el modelo hasta hoy.',
    dinamica: 'La unidad de control del híbrido (HCU) calcula sin parar lo que da cada motor y recorta la suma al límite: si el térmico da 12 kW, el eléctrico solo puede añadir 3 (con 15 kW de límite). Conserva todo el pico del eléctrico para cuando el térmico da poco.',
    termico: 'El motor de gasolina se rebaja de una vez (mapa de inyección) para que, con toda la continua del eléctrico, la suma quepa en el límite. Más sencillo de demostrar; a cambio, con la batería gastada el coche va con poca potencia.',
    modos: 'Tres modos separados: térmico (solo gasolina), eléctrico (solo batería) e híbrido (los dos, con la suma recortada al límite). Cada modo que deje más potencia se ensaya también.',
  };
  return (
    <Bloque id={`bloque-${BLOQUE_ELECTRONICA}`} titulo={BLOQUE_ELECTRONICA} plegable={plegable} nota={`continua ${kW(el.contTotal)} · pico ${kW(el.picoTotal)}`}>
      {nota(`Cómo manda la electrónica la potencia a las ruedas: cuánta da cada motor, cuándo arranca el de gasolina y qué impide que se pase del límite. Son ajustes del programa de los controladores; con los de serie el coche va como hasta ahora (sin límite del conjunto). Las piezas (controlador del motor, convertidor CC-CC, cargador) están en Motor eléctrico y en Energía › Sistema solar y de carga; la unidad de control del híbrido (HCU), que es la que aplica estos ajustes, aún no tiene pieza en ninguna lista.`)}

      {sub('Control de potencia')}
      {hib && sel('tEpEstrategia')}
      {hib && nota(ESTRATEGIA[el.estrategia])}
      {desl('tEpLimCont')}
      {desl('tEpLimPico')}
      {desl('tEpPicoSeg')}
      {nota(`El límite continuo es lo que el conjunto puede dar sin parar (la cifra de la categoría: L7e, ${LIMITE_L7E} kW); el pico, lo más que da unos segundos para acelerar o adelantar. 0 = sin límite.${hib && el.estrategia === 'libre' && el.limCont != null ? ' Ojo: con «Sin gestión» el límite no se aplica cuando empujan los dos.' : ''}`)}
      {sel('tEpMapa')}
      {nota(`Mapa del acelerador: «Normal» da todo el par; «Eco» recorta el pico eléctrico al ${Math.round(ECO_PICO * 100)} % (más suave, gasta menos). Si el conductor puede elegir, en la homologación cuenta el normal.`)}
      {sel('tEpSport')}
      {T.tEpSport === 'si' && nota('Un modo sport quita el límite continuo y deja el pico todo el rato: se ensaya también, y si pasa del límite, el coche entero pasa (134/2014, anexo X, ap. 2.4).')}
      {desl('tEpRegen')}
      {nota('Frenada regenerativa: el motor eléctrico frena cargando la batería, hasta esta potencia. Lo demás lo frena el freno de disco.')}

      {hib && <>
        {sub('Arranque del motor de gasolina')}
        {desl('tEpArrSoc')}
        {desl('tEpArrKW')}
        {desl('tEpArrVel')}
        {desl('tEpHist')}
        {desl('tEpCalent')}
        {nota(`Va en eléctrico hasta que se cumple una de estas: la batería baja del ${Math.round(el.arranque.soc)} % (hasta ahí la autonomía eléctrica la gasta), se piden ${el.arranque.kW != null ? `más de ${kW(el.arranque.kW)}` : '— (desactivado)'} o se va ${el.arranque.vel != null ? `a más de ${el.arranque.vel} km/h` : '— (desactivado)'}. Arrancado, se calienta ${el.arranque.calentamiento} s antes de dar plena carga, y no para hasta que la batería ha subido un ${Math.round(el.arranque.histeresis)} % por encima del umbral (así no arranca y para cada minuto).`)}
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500"><tr><th className="py-0.5 font-semibold">En llano a</th><th className="text-right font-semibold">Pide</th><th className="pl-2 font-semibold">Con la batería por encima del {Math.round(el.arranque.soc)} %</th></tr></thead>
          <tbody>{velocidades.map(v => {
            const p = pide(v), m = p != null ? arrancaTermico(el, v, p) : null;
            return <tr key={v} className={cn(v === vel && 'font-semibold')}><td className="py-0.5">{v} km/h{v === vel ? ' (cálculo)' : ''}</td><td className="text-right font-mono tabular-nums">{p != null ? kW(p) : '—'}</td><td className="pl-2">{p == null ? 'falta el Cd del túnel' : m ? `térmico en marcha: ${m}` : 'solo eléctrico'}</td></tr>;
          })}</tbody>
        </table>
      </>}

      {sub('Limitadores (dos, independientes)')}
      {sel('tEpLim1')}
      {sel('tEpLim2')}
      {nota(el.limitadores.independientes ? `Dos métodos de distinta naturaleza: ${TEXTO_LIMITADOR[el.limitadores.primero]}; y ${TEXTO_LIMITADOR[el.limitadores.segundo]}. Es lo que pide el Reglamento 3/2014 (anexo XVIII) para un límite «por construcción».` : 'Para que un límite cuente en la homologación hacen falta dos métodos independientes y de distinta filosofía (Reglamento 3/2014, anexo XVIII): uno por programa en la unidad del híbrido y otro por una vía aparte (las vueltas del motor, la velocidad medida en la rueda o un límite físico).')}

      {sub('Lo que llega a las ruedas, modo a modo')}
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[13px]">
        {el.modos.map(m => (
          <Fragment key={m.id}>
            <dt className="text-slate-600">{m.nombre}{m.termico > 0 && m.elecCont > 0 ? `: ${fmt(m.termico, 1)} + ${fmt(m.elecCont, 1)}` : ''}</dt>
            <dd className={cn('text-right font-mono text-xs tabular-nums', pasa(m.cont) && 'text-red-700')}>{kW(m.cont)} · pico {kW(m.pico)}</dd>
          </Fragment>
        ))}
        <dt className="font-semibold text-slate-800">Continua total (ficha, 1.8.7)</dt><dd className={cn('text-right font-mono text-xs font-semibold tabular-nums', pasa(el.contTotal) ? 'text-red-700' : 'text-emerald-700')}>{kW(el.contTotal)}</dd>
        <dt className="font-semibold text-slate-800">Pico total (ficha, 1.8.9)</dt><dd className="text-right font-mono text-xs font-semibold tabular-nums">{kW(el.picoTotal)} · {el.picoSeg} s</dd>
        {e && <>
          <dt className="text-slate-600">Velocidad sostenida en eléctrico</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(e.vmaxNominal)} km/h</dd>
          <dt className="text-slate-600">Velocidad punta en eléctrico</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(e.vmaxPico)} km/h</dd>
          {e.hibrido && <><dt className="text-slate-600">Sostenida solo con gasolina</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(e.hibrido.vmaxGasolina)} km/h</dd></>}
          {hib && <><dt className="text-slate-600">Con los dos a la vez (modo «{el.modoPico.nombre}»)</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(e.vmaxConjunta)} km/h</dd></>}
          <dt className="text-slate-600">0 → 50 km/h</dt><dd className="text-right font-mono text-xs tabular-nums">{e.acel50 > 60 ? 'no llega' : `${fmt(e.acel50, 1)} s`}</dd>
        </>}
      </dl>
      {nota(`${pasa(el.contTotal) ? `Para L7e (tope ${LIMITE_L7E} kW continuos) se pasa en ${kW(el.contTotal - LIMITE_L7E)}: ` : `Cabe en el tope de L7e (${LIMITE_L7E} kW continuos). `}El estudio completo, lo que está bien y lo que no y los ensayos, en la pestaña Homologación. Estas cifras son la configuración del controlador, no una medida.${modelo.cuatro ? ' Con dos ruedas traseras, la potencia eléctrica es la de los dos motores juntos.' : ''}`)}
    </Bloque>
  );
}
