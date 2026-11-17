/**
 * The «Consumos» tab of the Triciclo family (2026-11-17, Eugenio: «añadir en el menú superior un elemento que sea
 * consumos y que debajo aparezca el consumo en litros a los 100 kilómetros y que ahí en consumos aparezca toda la parte
 * de rendimiento que tiene, todo lo que está ahora en energía, de autonomía»).
 *
 * The «Rendimiento» block moved here from Motor and Energía (now «Batería»), unchanged, with the speed of calculation
 * (the same `tVel` slider that is still in Motor › Motor eléctrico, since the motor's checks read it too), and the new
 * «Del enchufe a la rueda» (SistemaElectrico.tsx).
 */
import { Wind } from 'lucide-react';
import type { ModeloTriciclo, Parametros, Resultados } from '../geometria';
import { AUXILIARES, RENDIMIENTO, USABLE, camposTriciclo, deslizadoresTriciclo, energiaTriciclo, esCuatro, esRombo, guardarTriciclo, vistaTriciclo } from '../geometriaTriciclo';
import { crrTriciclo, textoCrrTriciclo } from '../triciclo/energia';
import type { CdTriciclo } from '../LadoTriciclo';
import { Bloque, Deslizador, fmt } from '../controles';
import { Fragment } from 'react';
import { BloqueDelEnchufe } from './SistemaElectrico';

export function LadoConsumos({ P, set, res, modelo, cd }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: ModeloTriciclo; cd: CdTriciclo;
}) {
  const T = camposTriciclo(P), rt = res.triciclo!;
  const e = cd.cd != null && cd.areaRef != null ? energiaTriciclo(modelo, res.mTot, { cd: cd.cd, areaRef: cd.areaRef }) : null;
  const cdTexto = cd.calculando ? 'calculando…' : cd.cd != null ? fmt(cd.cd, 3) : '—';
  const sinCd = cd.calculando ? 'calculando…' : '—';
  const kmhVel = Math.round(T.tVel);
  const nOcc = rt.ocupantes, tresOCuatro = esCuatro(T) || esRombo(T) ? 'cuatro' : 'tres';
  const fVel = deslizadoresTriciclo().find(f => f.clave === 'tVel');
  const dl = (filas: [string, string][]) => (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
      {filas.map(([a, b]) => (<Fragment key={a}><dt className="whitespace-pre text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
    </dl>
  );
  return (
    <>
      <Bloque titulo="Consumos" nota="consumo, autonomía y velocidades">
        {fVel && (() => { const v = vistaTriciclo(fVel, T); return (
          <Deslizador id="t-tVel-consumos" etiqueta={fVel.n} valor={v.valor} clave="tVel" centro={fVel.centrar ? v.defecto : undefined} min={v.min} max={v.max} paso={fVel.paso} mostrar={`${Math.round(v.valor)} km/h`} alCambiar={x => set('tVel', guardarTriciclo(fVel, x, T) as never)} />
        ); })()}
        <p className="-mt-1 text-xs text-slate-500">La velocidad a la que se calculan el consumo, la autonomía y la potencia (es la misma de Motor › Motor eléctrico). El consumo de debajo de la pestaña es a esta velocidad.</p>
      </Bloque>
      <Bloque titulo="Rendimiento" nota={cd.calculando ? 'el túnel calcula el Cd…' : 'estimación'}>
        {dl([
          ['Cd del túnel (estimado)', cdTexto],
          ['  referido a la sección de la carrocería', cd.areaRef != null ? `${fmt(cd.areaRef)} m²` : sinCd],
          ['CdA', e ? `${fmt(e.CdA, 3)} m²` : sinCd],
          [`Consumo a ${kmhVel} km/h`, e ? `${fmt(e.WhKm / 10, 1)} kWh/100 km` : sinCd],
          ['Consumo a 50 y a 100 km/h', e ? `${fmt(e.WhKm50 / 10, 1)} · ${fmt(e.WhKm100 / 10, 1)} kWh/100 km` : sinCd],
          [`Potencia a ${kmhVel} km/h`, e ? `${fmt(e.potencia / 1000, 1)} kW` : sinCd],
          [`Autonomía a ${kmhVel} km/h${e?.hibrido ? ', solo con la batería' : ''}`, e ? `${Math.round(e.autonomia)} km` : sinCd],
          // the plug-in hybrid (2026-11-15): petrol per 100 km once the battery is down, and how far the tank goes
          ...(T.tPropulsion === 'phev' ? [
            [`Gasolina a ${kmhVel} km/h (con la batería gastada)`, e?.hibrido ? `${fmt(e.hibrido.litros100, 2)} L/100 km` : sinCd],
            ['Gasolina a 50 y a 100 km/h', e?.hibrido ? `${fmt(e.hibrido.litros50, 2)} · ${fmt(e.hibrido.litros100kmh, 2)} L/100 km` : sinCd],
            [`Autonomía con el depósito (${fmt(T.tDeposito, 0)} L)`, e?.hibrido ? `${Math.round(e.hibrido.kmDeposito)} km` : sinCd],
            ['Autonomía total: batería y depósito', e?.hibrido ? `${Math.round(e.autonomia + e.hibrido.kmDeposito)} km` : sinCd],
            [`Velocidad sostenida solo con gasolina (${fmt(T.tPhevKW, 1)} kW)`, e?.hibrido ? `${Math.round(e.hibrido.vmaxGasolina)} km/h` : sinCd],
            ['Gasolina: del eje del motor a la rueda', modelo.phev ? `${fmt(modelo.phev.rendTrans * 100, 1)} %` : '—'],
            [`Motor de gasolina a ${kmhVel} km/h: vueltas, rendimiento`, e?.hibrido ? `${Math.round(e.hibrido.cifras.motor / 10) * 10} rpm · ${fmt(e.hibrido.rendTermVel * 100, 1)} %` : sinCd],
          ] as [string, string][] : []),
          [`Velocidad sostenida (${fmt(T.tKWNom, 1)} kW)`, e ? `${Math.round(e.vmaxNominal)} km/h` : sinCd],
          [`Velocidad punta (${fmt(T.tKWPico, 1)} kW)`, e ? `${Math.round(e.vmaxPico)} km/h` : sinCd],
          ['0 → 50 km/h', e ? (e.acel50 > 60 ? 'no llega' : `${fmt(e.acel50, 1)} s`) : sinCd],
          ['Techo solar', res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m² · ${Math.round(res.solarPico)} W pico` : 'sin techo solar'],
          ['  energía solar al día (estimada)', res.areas.solar > 0.005 ? `${fmt(res.solarDia / 1000)} kWh · ${e ? `${Math.round(e.kmSol)} km` : sinCd}` : '—'],
        ])}
        {cd.calculando && <p className="flex items-center gap-1.5 text-xs text-sky-800"><Wind className="h-3.5 w-3.5 animate-pulse" />El túnel de viento está calculando el Cd de esta forma (unos segundos). Hasta que acabe, no hay cifra.</p>}
        <p className="text-xs text-slate-500">El Cd lo calcula el túnel con la silueta de la carrocería y sus {tresOCuatro} ruedas (no hay fórmula del editor para esta forma); los carenados y los brazos solo entran como ruedas carenadas, así que el real será algo más alto. {nOcc === 1 ? 'Con el piloto solo' : `Con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc]} ocupantes`} de {T.tMOcc} kg ({Math.round(res.mTot)} kg en total), rodadura {fmt(crrTriciclo(T), 4)} ({textoCrrTriciclo(T)}), motor y controlador al {Math.round(RENDIMIENTO * 100)} %, {AUXILIARES} W de equipos y la batería usable al {Math.round(USABLE * 100)} %. Todo supuesto, no medido.</p>
      </Bloque>
      <BloqueDelEnchufe modelo={modelo} res={res} whKm={e?.WhKm ?? null} kmh={kmhVel} />
    </>
  );
}
