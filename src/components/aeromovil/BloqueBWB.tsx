// «Carenado BWB (ala integrada)» (2026-11-17): the side-panel block of the blended-wing-body fairing (triciclo/bwb.ts).
// Its own sliders and options (prefix `tBwb`, every one optional in the design), the spans folded and unfolded against
// the road width limits, the mass it adds and, as textbook estimates, what the wings cost and lift at top speed.
import { Fragment } from 'react';
import type { ModeloTriciclo, Parametros, Resultados } from './geometria';
import { Bloque, Deslizador, Selector, fmt } from './controles';
import { DesglosePeso } from './PesoSeccion';
import { textoPesoSeccion, type SeccionPeso } from './masasSecciones';
import { FILAS_BWB, SELECTORES_BWB, aeroBWB, textoBWB, valorBWB, type CamposBWB, type ClaveNumBWB, type FilaBWB } from './triciclo/bwb';

export const BLOQUE_BWB = 'Carenado BWB (ala integrada)';

/** The road width limits the homologation tab uses (homologacion/normas.ts, «Ancho total»): L7e-CP 1,5 m; L5e, L7e-A 2,0 m; M1 2,55 m. */
const LIMITES: [number, string][] = [[1.5, 'L7e-CP (cuadriciclo pesado de viajeros)'], [2.0, 'L5e-A y L7e-A (triciclo y cuadriciclo de carretera)'], [2.55, 'M1 (turismo)']];
const GRUPOS: FilaBWB['grupo'][] = ['Planta', 'Sección', 'Integración', 'Punta', 'Plegado'];

export function BloqueBWB({ P, set, modelo, res, cdA, seccion, plegable }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; modelo: ModeloTriciclo; res: Resultados;
  /** the tunnel's Cd·A of the body (m²), to compare the wings' drag with; null while it computes */
  cdA: number | null;
  seccion: SeccionPeso | null; plegable?: { abierto: boolean; alAlternar: () => void };
}) {
  const T = P as Parametros & CamposBWB;
  const poner = (k: keyof CamposBWB, v: number | string) => set(k as keyof Parametros, v as never);
  const w = modelo.bwb;
  const punta = textoBWB('tBwbPunta', T);
  const filas = FILAS_BWB.filter(f => f.grupo !== 'Punta' || punta === 'winglet' || punta === 'sharklet');
  const mostrar = (f: FilaBWB, v: number) => `${fmt(v, f.paso < 0.01 ? 3 : f.paso < 1 ? 2 : 0)}${f.u ? ` ${f.u}` : ''}`;
  const masa = res.triciclo?.piezas.filter(p => /^Carenado BWB/.test(p.nombre)).reduce((a, p) => a + p.kg, 0) ?? 0;
  const e = (res.triciclo as unknown as { energia?: { vmaxPico?: number } } | undefined)?.energia;
  const kmh = Math.max(valorNum(T.tVel, 80), e?.vmaxPico ?? 0);
  const a = w ? aeroBWB(w, kmh, res.mTot ?? res.mVeh, valorBWB('tBwbRadio', T)) : null;
  const ancho = (v: number) => {
    const malos = LIMITES.filter(([l]) => v > l);
    return malos.length ? `pasa de ${malos.map(([l]) => `${fmt(l, 2)} m`).join(', ')}` : 'cabe en todos';
  };
  const dl = (f: [string, string, string?][]) => (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[13px]">
      {f.map(([x, y, cl]) => (<Fragment key={x}><dt className="text-slate-600">{x}</dt><dd className={`text-right font-mono text-xs tabular-nums ${cl ?? ''}`}>{y}</dd></Fragment>))}
    </dl>
  );
  return (
    <Bloque id={`bloque-${BLOQUE_BWB}`} titulo={BLOQUE_BWB} peso={textoPesoSeccion(seccion)} plegable={plegable} nota={w ? `${fmt(w.envergaduraVista, 2)} m de ancho` : 'sin alas'}>
      <p className="-mt-1 text-xs text-slate-500">
        Un carenado extra con alas que nacen de la carrocería y se funden con ella, como un «ala integrada» (Blended Wing Body: el Airbus ZEROe, el Airbus MAVERIC o el X-48 de la NASA).
        Cada ala se puede plegar por una bisagra a lo largo, hacia arriba, para que el coche sea más estrecho.
      </p>
      <Selector id="t-tBwb" etiqueta="Carenado BWB" valor={T.tBwb === 'si' ? 'si' : 'no'} opciones={[{ k: 'no', n: 'Sin alas' }, { k: 'si', n: 'Con alas integradas' }]} alCambiar={v => poner('tBwb', v)} />
      {w && (<>
        <Selector id="t-tBwbPlegadas" etiqueta="Alas plegadas" valor={T.tBwbPlegadas === 'si' ? 'si' : 'no'} opciones={[{ k: 'no', n: 'Abiertas' }, { k: 'si', n: 'Plegadas' }]} alCambiar={v => poner('tBwbPlegadas', v)} />
        {SELECTORES_BWB.map(s => (
          <Selector key={s.k} id={`t-${s.k}`} etiqueta={s.n} valor={String(textoBWB(s.k, T))} opciones={s.opciones} alCambiar={v => poner(s.k, v)} />
        ))}
        {GRUPOS.map(g => {
          const fs = filas.filter(f => f.grupo === g);
          if (!fs.length) return null;
          return (
            <div key={g} className="mt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g}</p>
              {fs.map(f => {
                const v = valorBWB(f.k as ClaveNumBWB, T);
                return <Deslizador key={f.k} id={`t-${f.k}`} etiqueta={f.n} valor={v} min={f.min} max={f.max} paso={f.paso} mostrar={mostrar(f, v)} alCambiar={x => poner(f.k, x)} />;
              })}
            </div>
          );
        })}
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Medidas</p>
        {dl([
          ['Envergadura abierta', `${fmt(w.envergadura, 2)} m · ${ancho(w.envergadura)}`, w.envergadura > 2 ? 'text-red-700' : w.envergadura > 1.5 ? 'text-amber-700' : ''],
          [`Plegada a ${Math.round(w.anguloPliegue)}°`, `${fmt(w.envergaduraPlegada, 2)} m · ${ancho(w.envergaduraPlegada)}`, w.envergaduraPlegada > 2 ? 'text-red-700' : w.envergaduraPlegada > 1.5 ? 'text-amber-700' : ''],
          ['Lo que se pliega', `${fmt(w.envergadura - w.envergaduraPlegada, 2)} m menos`],
          ['Superficie de las alas (en planta)', `${fmt(w.areaPlanta, 2)} m²${w.areaWinglets ? ` + ${fmt(w.areaWinglets, 2)} m² de winglets` : ''}`],
          ['Superficie mojada añadida', `${fmt(w.areaMojada, 2)} m²`],
          ['Área frontal añadida', `${fmt(w.areaFrontal, 3)} m²`],
          ['Alargamiento · cuerda media', `${fmt(w.alargamiento, 1)} · ${fmt(w.cuerdaMedia, 2)} m`],
          ['Masa añadida', `${fmt(masa, 1)} kg`],
        ])}
        {(w.envergaduraVista > 1.5) && <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Ancho para circular: el coche mide ahora {fmt(w.envergaduraVista, 2)} m de ancho ({w.plegadas ? 'con las alas plegadas' : 'con las alas abiertas'}). Los límites de anchura de la homologación son 1,5 m (L7e-CP), 2,0 m (L5e-A, L7e-A) y 2,55 m (M1).
          {w.envergadura > 2 && w.envergaduraPlegada <= 2 && ' Plegadas sí caben en 2,0 m: para circular tendrían que ir plegadas.'}
          {' '}La pestaña «Homologación» cuenta el ancho que se ve ahora: con «Alas plegadas» lee el plegado.
        </p>}
        {w.holguraPods != null && w.holguraPods < 0.02 && <p className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">El ala {w.holguraPods < 0 ? `atraviesa los carenados de las ruedas laterales (${fmt(-w.holguraPods * 100, 0)} cm)` : `pasa a ${fmt(w.holguraPods * 100, 0)} cm de los carenados de las ruedas laterales`}: muévela hacia atrás («Posición: detrás del morro») o súbela.</p>}
        {a && (<>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">A {Math.round(kmh)} km/h (estimación de libro, no del túnel)</p>
          {dl([
            ['Arrastre de las alas (Cd·A)', `+${fmt(a.dCdA, 3)} m²${cdA ? ` (+${Math.round(a.dCdA / cdA * 100)} % sobre ${fmt(cdA, 3)} m² del túnel)` : ''}`],
            ['· rozamiento y forma', `${fmt(a.dCdAfriccion, 3)} m²`],
            ['· inducido por la sustentación', `${fmt(a.dCdAinducida, 4)} m²`],
            ['Potencia que cuestan', `${fmt(a.potencia / 1000, 2)} kW`],
            ['Sustentación (+ levanta, − aprieta)', `${a.kg >= 0 ? '+' : ''}${fmt(a.kg, 0)} kg (${a.fraccionPeso >= 0 ? '+' : ''}${fmt(a.fraccionPeso * 100, 1)} % del peso)`, a.fraccionPeso > 0.15 ? 'text-red-700' : a.fraccionPeso > 0.05 ? 'text-amber-700' : ''],
          ])}
          {a.fraccionPeso > 0.05 && <p className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">A {Math.round(kmh)} km/h las alas levantan {fmt(a.kg, 0)} kg: las ruedas apoyan con menos fuerza, frenan y giran peor, y con viento de cara o un bache puede despegar. Baja la «Incidencia» (negativa aprieta el coche contra el suelo), usa el perfil reflejado o simétrico, o pon más torsión.</p>}
          <p className="text-xs text-slate-500">
            El túnel de viento de esta página solo ve la carrocería y no calcula sustentación: estas cifras son de libro. Rozamiento: placa plana turbulenta (Schlichting) con el número de Reynolds de la cuerda media ({fmt(a.Re / 1e6, 1)} millones), factor de forma de Raymer ({fmt(a.FF, 2)}) y la superficie mojada; interferencia {a.Q === 1 ? '1,0 (con filete)' : '1,1 (sin filete)'}.
            Sustentación: pendiente de sustentación de DATCOM para el alargamiento y la flecha, ángulo de sustentación nula del perfil, la incidencia y el 40 % de la torsión (CL {fmt(a.CL, 3)}). No cuenta el efecto suelo (cerca del asfalto un ala sustenta más) ni la carrocería como ala. El consumo de la pestaña Energía aún no suma este arrastre.
          </p>
        </>)}
      </>)}
      <DesglosePeso s={seccion} />
    </Bloque>
  );
}
const valorNum = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
