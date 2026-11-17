// The Aeromóvil 1 side panel (sliders by department). The Gota panel is still inline in pages/Aeromovil.tsx.
// Moved out of pages/Aeromovil.tsx unchanged (2026-11-16, refactor «ordenar»). See ./CLAUDE.md for the layout.
import { Fragment, useMemo } from 'react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { MATERIALES_CARENADO, MATERIALES_CHASIS, type MaterialCarenado, type MaterialChasis, type Modelo, type Neumatico, type Parametros, type Puerta, type Resultados } from './geometria';
import { RANGOS_MASA_A1 } from './geometriaA1';
import { BotonesComponentes } from './Componentes';
import type { IdDepartamento } from './departamentos';
import { ComparacionChasis } from './Departamentos';
import { tubosCelosia } from './chasisCelosia';
import { fmt, m2, Deslizador, Bloque, Selector } from './controles';
import { pesoSeccion, seccionesA1, textoPesoSeccion } from './masasSecciones';

export const PUERTAS_A1: { k: Puerta; n: string; d: string }[] = [
  { k: 'gaviota', n: 'Alas de gaviota (Aptera)', d: 'La ventanilla con su costado y el panel lateral suben juntos, con bisagra en el canto del techo. El techo se queda en su sitio.' },
  { k: 'cabina', n: 'Cúpula basculante', d: 'La cúpula entera bascula hacia delante; se entra por encima del estribo, como en un ultraligero.' },
  { k: 'aptera', n: 'Laterales tipo Aptera', d: 'Panel lateral y media cúpula con bisagra delante, inclinada: la puerta sube al abrirse y ocupa poco al lado.' },
];
/** Los deslizadores y las cifras del Aeromóvil 1. */
export function LadoA1({ P, Pa, D, set, res, modelo, neumaticos, malas, alNavegar, dep }: {
  P: Parametros; Pa: Parametros; D: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: Modelo;
  neumaticos: { k: Neumatico; n: string }[]; malas: number; alNavegar: (ruta: string) => void; dep: IdDepartamento;
}) {
  const a1 = res.a1!;
  const hayCelosia = useMemo(() => { try { return tubosCelosia((modelo as any).contextoChasis()).length > 0; } catch { return false; } }, [modelo]);
  const cm = (v: number) => `${Math.round(v * 100)} cm`;
  // (2026-11-17) each section's weight in its header, from the same list as «Peso del vehículo» (masasSecciones.ts)
  const pesos = useMemo(() => seccionesA1(res), [res]), pk = (b: string) => textoPesoSeccion(pesoSeccion(pesos, 'a1', b));
  const h = (v: number) => (v >= 10 ? `${Math.round(v)} h` : `${fmt(v, 1)} h`);
  // Cada departamento ve solo sus deslizadores (2026-11-06, Eugenio: «divide el menú por departamentos… y compacta los selectores»).
  return (
    <>
      {dep === 'proyecto' && (<>
      <Bloque titulo="Componentes" nota="ficha de cada pieza">
        <BotonesComponentes P={P} res={res} modelo={modelo} alNavegar={alNavegar} />
      </Bloque>
      <Bloque titulo="Comprobaciones" nota={malas ? `${malas} por revisar` : 'todo cabe'}>
        <ul className="flex flex-col gap-1.5">
          {res.comprobaciones.map(c => {
            const cl = c.holgura < 0 ? 'border-red-300 bg-red-50 text-red-700' : c.holgura < c.minimo ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700';
            const esRatio = c.nombre.startsWith('Velocidad') || c.nombre.startsWith('Carga por');
            return (
              <li key={c.nombre} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
                <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', cl)}>{c.holgura < 0 ? (esRatio ? 'no' : 'roza') : c.holgura < c.minimo ? 'justo' : 'ok'}</span>
                <span className="text-slate-700">{c.nombre}</span>
                <span className="font-mono text-xs tabular-nums">{esRatio ? (c.holgura >= 0 ? '+' : '−') + fmt(Math.abs(c.holgura) * 100, 0) : `${c.holgura < 0 ? '−' : ''}${fmt(Math.abs(c.holgura) * 100, 1)} cm`}</span>
              </li>
            );
          })}
        </ul>
      </Bloque>
      <Bloque titulo="Rendimiento" nota="estimación">
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
          {([
            ['Área frontal', `${fmt(res.A)} m²`], ['Cd estimado', fmt(res.Cd, 3)], ['CdA', `${fmt(res.CdA, 3)} m²`],
            ['Consumo a 100 km/h', `${fmt(a1.WhKm100 / 10, 1)} kWh/100 km`], [`Consumo a ${P.speed} km/h`, `${fmt(res.WhKm / 10, 1)} kWh/100 km`],
            [`Potencia a ${P.speed} km/h`, `${fmt(res.Pw / 1000, 1)} kW`],
            ['Autonomía a 100 km/h', `${Math.round(a1.autonomia100)} km`], [`Autonomía a ${P.speed} km/h`, `${Math.round(res.autonomia)} km`],
            [`Velocidad sostenida (${P.kWNom} kW)`, `${Math.round(a1.vmaxNominal)} km/h`], [`Velocidad punta (${P.kWPico} kW)`, `${Math.round(a1.vmaxPico)} km/h`],
            ['0 → 50 km/h', a1.acel50 > 60 ? 'no llega' : `${fmt(a1.acel50, 1)} s`], ['0 → 100 km/h', a1.acel100 > 60 ? 'no llega' : `${fmt(a1.acel100, 1)} s`],
            ['Pendiente a 100 km/h sostenida', `${fmt(a1.pendiente100, 1)} %`],
            ['Carga 0-100 %', a1.cargaHoras.map(c => `${c.kW} kW: ${h(c.h)}`).join(' · ')],
            ['Paneles solares', `${fmt(res.areas.solar)} m² · ${Math.round(res.solarPico)} W pico`],
            ['Energía solar al día', `${fmt(res.solarDia / 1000)} kWh · ${Math.round(res.kmSol)} km`],
          ] as [string, string][])
            // at the default 100 km/h the fixed «a 100 km/h» rows and the «a ${P.speed} km/h» rows are the same row twice
            .filter(([a], i, l) => l.findIndex(([x]) => x === a) === i)
            .map(([a, b]) => (<Fragment key={a}><dt className="text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
        </dl>
        <p className="text-xs text-slate-500">Rodadura 0,009, rendimiento eléctrico 88 %, 250 W de equipos, batería usable al 92 %. El Cd es orientativo: valídalo con CFD antes del molde.</p>
      </Bloque>
      <Bloque titulo="Peso del vehículo" nota={`${Math.round(res.mVeh)} kg`}>
        <div>
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200">
            <span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded bg-slate-900"
              style={{ left: `${Math.max(0, Math.min(100, (res.mVeh - res.rangoMasa[0]) / (res.rangoMasa[1] - res.rangoMasa[0]) * 100))}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
            <span>{Math.round(res.rangoMasa[0])} kg todo ligero</span><span>{Math.round(res.rangoMasa[1])} kg todo pesado</span>
          </div>
        </div>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[13px]">
          {Object.entries(res.masas).map(([k, v]) => (<Fragment key={k}><dt className="text-slate-600">{k}</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(v, 1)} kg</dd></Fragment>))}
          <dt className="font-semibold text-slate-800">Con {P.plazas === 2 ? 'dos ocupantes' : 'el piloto'}</dt><dd className="text-right font-mono text-xs font-semibold tabular-nums">{Math.round(res.mTot)} kg</dd>
        </dl>
      </Bloque>
      </>)}

      {dep === 'carroceria' && (<>
      <Bloque titulo="Carrocería y cúpula" peso={pk('Carrocería y cúpula')} nota={`${m2(Pa.W)} × ${m2(Pa.H)}`}>
        <Deslizador id="a1-L" etiqueta="Largo total" valor={P.L} clave="L" centro={D.L} min={2.6} max={4.4} paso={0.01} mostrar={m2(P.L)} alCambiar={v => set('L', v)} />
        <Deslizador id="a1-fm" etiqueta="Voladizo del morro" valor={P.fMorro} clave="fMorro" centro={D.fMorro} min={0.15} max={0.40} paso={0.005} mostrar={`${Math.round(P.fMorro * 100)} % del largo · ${m2(P.fMorro * P.L)}`} alCambiar={v => set('fMorro', v)} />
        <Deslizador id="a1-W" etiqueta="Ancho máximo" valor={P.W} clave="W" centro={D.W} min={1.2} max={2.0} paso={0.01} mostrar={m2(P.W)} alCambiar={v => set('W', v)} />
        <Deslizador id="a1-H" etiqueta="Alto total (techo de la cúpula)" valor={P.H} clave="H" centro={D.H} min={1.0} max={1.7} paso={0.01} mostrar={m2(P.H)} alCambiar={v => set('H', v)} />
        <Deslizador id="a1-deck" etiqueta="Altura de la cubierta" valor={P.deck} clave="deck" centro={D.deck} min={0.55} max={0.85} paso={0.005} mostrar={m2(P.deck * P.H)} alCambiar={v => set('deck', v)} />
        <p className="-mt-2 text-xs text-slate-500">La cubierta es el techo de la carrocería baja; de ahí para arriba es cúpula de cristal.</p>
        <Deslizador id="a1-mo" etiqueta="Redondez del morro" valor={P.morroA1} clave="morroA1" centro={D.morroA1} min={0} max={1} paso={0.05} mostrar={P.morroA1 < 0.3 ? 'ojival' : P.morroA1 > 0.85 ? 'roma' : 'gota (elipse)'} alCambiar={v => set('morroA1', v)} />
        <Deslizador id="a1-pm" etiqueta="Largo del morro (hasta la sección máxima)" valor={P.posMorro} clave="posMorro" centro={D.posMorro} min={-0.12} max={0.18} paso={0.01} mostrar={m2(Math.min(0.5, Math.max(0.2, 0.32 + P.posMorro)) * P.L)} alCambiar={v => set('posMorro', v)} />
        <Deslizador id="a1-co" etiqueta="Forma de la cola" valor={P.colaA1} clave="colaA1" centro={D.colaA1} min={0} max={1} paso={0.05} mostrar={P.colaA1 < 0.35 ? 'afilada' : P.colaA1 > 0.65 ? 'llena' : 'como el SZEmission'} alCambiar={v => set('colaA1', v)} />
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
          <div><div className="text-sm font-medium text-slate-800">Opción Jaguar</div><div className="text-xs text-slate-500">la carrocería envuelve las ruedas con un abombamiento redondo, como el D-Type</div></div>
          <Button variant="outline" aria-pressed={P.jaguar} onClick={() => set('jaguar', !P.jaguar)} className={cn('shrink-0 px-3 py-1.5 text-xs normal-case tracking-normal', P.jaguar && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{P.jaguar ? 'Activada' : 'Activar'}</Button>
        </div>
        {P.jaguar && (<>
          <Deslizador id="a1-jh" etiqueta="Jaguar: cuánto sobresale" valor={P.jagAlto} clave="jagAlto" centro={D.jagAlto} min={0.01} max={0.15} paso={0.005} mostrar={`${fmt(P.jagAlto * 100, 1)} cm sobre la rueda`} alCambiar={v => set('jagAlto', v)} />
          <Deslizador id="a1-jl" etiqueta="Jaguar: largo del abombamiento" valor={P.jagLargo} clave="jagLargo" centro={D.jagLargo} min={0.6} max={2.0} paso={0.05} mostrar={m2(P.jagLargo)} alCambiar={v => set('jagLargo', v)} />
          <Deslizador id="a1-ja" etiqueta="Jaguar: alcance en vertical" valor={P.jagAncho} clave="jagAncho" centro={D.jagAncho} min={0.12} max={0.5} paso={0.01} mostrar={P.jagAncho < 0.2 ? 'solo la cintura' : P.jagAncho > 0.4 ? 'hasta el hombro' : 'cintura y flanco'} alCambiar={v => set('jagAncho', v)} />
        </>)}
        <p className="-mt-2 text-xs text-slate-500">Parabrisas plano (como el VW XL1) con montantes inclinados, una ventanilla a cada lado y el panel solar en la parte plana del techo, que baja en una sola curva hasta la cola (como el Aptera).</p>
        <Deslizador id="a1-parab" etiqueta="Inclinación del parabrisas" valor={P.parabrisas} clave="parabrisas" centro={D.parabrisas} min={0.12} max={0.32} paso={0.005} mostrar={`${m2(P.parabrisas * P.L)} de largo · ${P.parabrisas < 0.17 ? 'empinado' : P.parabrisas > 0.26 ? 'muy tumbado' : 'tumbado'}`} alCambiar={v => set('parabrisas', v)} />
        <Deslizador id="a1-techo" etiqueta="Caída del techo" valor={P.techo} clave="techo" centro={D.techo} min={1} max={3} paso={0.05} mostrar={P.techo < 1.25 ? 'recta desde el pico' : P.techo > 2.2 ? 'alto hasta el final' : 'curva suave (Aptera)'} alCambiar={v => set('techo', v)} />
        <Deslizador id="a1-solar" etiqueta="Techo solar: dónde empieza" valor={P.inicioSolar} clave="inicioSolar" centro={D.inicioSolar} min={0} max={0.6} paso={0.01} mostrar={`${fmt(P.inicioSolar * 100, 0)} cm tras el parabrisas`} alCambiar={v => set('inicioSolar', v)} />
        <Deslizador id="a1-c0" etiqueta="Parabrisas: dónde empieza" valor={P.cupX0} clave="cupX0" centro={D.cupX0} min={0.08} max={0.35} paso={0.005} mostrar={`${m2(P.cupX0 * P.L)} del morro`} alCambiar={v => set('cupX0', v)} />
        <Deslizador id="a1-c1" etiqueta="Cúpula: dónde acaba" valor={P.cupX1} clave="cupX1" centro={D.cupX1} min={0.70} max={0.995} paso={0.005} mostrar={`${m2((1 - P.cupX1) * P.L)} de la cola`} alCambiar={v => set('cupX1', v)} />
        <Deslizador id="a1-cw" etiqueta="Cabina: ancho de la base" valor={P.cupW} clave="cupW" centro={D.cupW} min={0.35} max={0.75} paso={0.01} mostrar={m2(P.cupW * P.W)} alCambiar={v => set('cupW', v)} />
        <Deslizador id="a1-tw" etiqueta="Cabina: ancho del techo" valor={P.techoW} clave="techoW" centro={D.techoW} min={0.5} max={1} paso={0.01} mostrar={`${m2(P.techoW * P.cupW * P.W)} · ${P.techoW > 0.95 ? 'costados verticales' : P.techoW < 0.7 ? 'muy inclinados' : 'inclinados (XL1)'}`} alCambiar={v => set('techoW', v)} />
        <Deslizador id="a1-nU" etiqueta="Sección superior de la carrocería" valor={P.nU} clave="nU" centro={D.nU} min={2.0} max={3.4} paso={0.1} mostrar={P.nU < 2.3 ? 'elíptica' : P.nU > 2.9 ? 'cuadrada' : 'redondeada'} alCambiar={v => set('nU', v)} />
        <Deslizador id="a1-nL" etiqueta="Fondo" valor={P.nL} clave="nL" centro={D.nL} min={2.0} max={5.0} paso={0.1} mostrar={P.nL < 2.6 ? 'redondo' : P.nL > 3.6 ? 'plano' : 'semiplano'} alCambiar={v => set('nL', v)} />
      </Bloque>
      <Bloque titulo="Material y espesores" peso={pk('Material y espesores')}>
        <Selector id="a1-matK" etiqueta="Material de la carrocería" valor={P.matCarenado} clave="matCarenado" opciones={(Object.keys(MATERIALES_CARENADO) as MaterialCarenado[]).map(k => ({ k, n: MATERIALES_CARENADO[k].n }))} alCambiar={v => set('matCarenado', v)} />
        <Deslizador id="a1-eK" etiqueta="Espesor de la carrocería" valor={P.espCarenado} clave="espCarenado" centro={D.espCarenado} min={RANGOS_MASA_A1.espCarenado[0]} max={RANGOS_MASA_A1.espCarenado[1]} paso={0.1} mostrar={`${fmt(P.espCarenado, 1)} mm`} alCambiar={v => set('espCarenado', v)} />
        <Deslizador id="a1-eV" etiqueta="Espesor de la cúpula (policarbonato)" valor={P.espCristal} clave="espCristal" centro={D.espCristal} min={RANGOS_MASA_A1.espCristal[0]} max={RANGOS_MASA_A1.espCristal[1]} paso={0.5} mostrar={`${fmt(P.espCristal, 1)} mm`} alCambiar={v => set('espCristal', v)} />
      </Bloque>
      </>)}

      {dep === 'chasis' && (<>
      <Bloque titulo="Chasis" peso={pk('Chasis')} nota={P.chasis === 'celosia' ? 'versión 2 · celosía' : 'versión 1 · largueros'}>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Versión del chasis">
          {([['largueros', 'Versión 1', 'largueros y travesaños'], ['celosia', 'Versión 2', 'celosía triangulada (Caterham)']] as ['largueros' | 'celosia', string, string][]).map(([k, n, d]) => (
            <Button key={k} variant="outline" role="radio" aria-checked={P.chasis === k} disabled={k === 'celosia' && !hayCelosia} title={k === 'celosia' && !hayCelosia ? 'La está diseñando un bot' : undefined} onClick={() => set('chasis', k)}
              className={cn('flex-1 flex-col items-start gap-0 px-3 py-1.5 text-left normal-case tracking-normal', P.chasis === k && 'border-teal-700 bg-teal-50 ring-1 ring-teal-700')}>
              <span className="text-xs font-semibold">{n}</span><span className="text-[11px] font-normal text-slate-500">{d}</span>
            </Button>
          ))}
        </div>
        <ComparacionChasis modelo={modelo} />
        <Deslizador id="a1-cl" etiqueta="Altura de los bajos" valor={P.clear} clave="clear" centro={D.clear} min={0.10} max={0.30} paso={0.005} mostrar={`${fmt(P.clear * 100, 1)} cm al suelo`} alCambiar={v => set('clear', v)} />
        <p className="-mt-2 text-xs text-slate-500">Sube y baja todo el interior: suelo, batería, asiento y piloto. El Twizy lleva 12 cm.</p>
        <Selector id="a1-sd" etiqueta="Largueros Ø" valor={String(P.spineD)} clave="spineD" opciones={['32', '40', '50', '60'].map(k => ({ k, n: `${k} mm` }))} alCambiar={v => set('spineD', Number(v))} />
        <Selector id="a1-st" etiqueta="Pared de los largueros" valor={String(P.spineT)} clave="spineT" opciones={['1.5', '2', '2.5', '3'].map(k => ({ k, n: `${k.replace('.', ',')} mm` }))} alCambiar={v => set('spineT', Number(v))} />
        <Selector id="a1-matC" etiqueta="Material del chasis" valor={P.matChasis} clave="matChasis" opciones={(Object.keys(MATERIALES_CHASIS) as MaterialChasis[]).map(k => ({ k, n: MATERIALES_CHASIS[k].n }))} alCambiar={v => set('matChasis', v)} />
        <Deslizador id="a1-xC" etiqueta="Uniones, chapas y tornillería" valor={P.extraChasis} clave="extraChasis" centro={D.extraChasis} min={RANGOS_MASA_A1.extraChasis[0]} max={RANGOS_MASA_A1.extraChasis[1]} paso={0.5} mostrar={`${fmt(P.extraChasis, 1)} kg`} alCambiar={v => set('extraChasis', v)} />
      </Bloque>
      <Bloque titulo="Estructura" nota="estimación">
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
          {([
            ['Momento máx. en los largueros', `${Math.round(res.Mmax)} N·m`], ['Tensión dinámica (×2,5)', `${Math.round(res.tension)} MPa`],
            ['Coeficiente de seguridad', fmt(res.seguridad, 2)], ['Carga máx. por rueda', `${Math.round(res.cargaRueda)} kg`],
          ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="text-slate-600">{a}</dt><dd className={cn('text-right font-mono text-xs tabular-nums',
            a === 'Coeficiente de seguridad' && (res.seguridad < 1.3 ? 'text-red-700' : res.seguridad < 1.8 ? 'text-amber-700' : 'text-emerald-700'),
            a === 'Carga máx. por rueda' && (res.cargaRueda > 290 ? 'text-red-700' : res.cargaRueda > 240 ? 'text-amber-700' : 'text-emerald-700'))}>{b}</dd></Fragment>))}
        </dl>
        <p className="text-xs text-slate-500">Dos largueros de {MATERIALES_CHASIS[P.matChasis].n.toLowerCase()} (límite usable {MATERIALES_CHASIS[P.matChasis].limite} MPa) entre ejes, con el piloto y la batería encima; el resto del entramado no se cuenta. Un neumático 125/80 R13 (índice 65) admite 290 kg.</p>
      </Bloque>
      </>)}

      {dep === 'rodaje' && (<>
      <Bloque titulo="Ejes, ruedas y suspensión" peso={pk('Ejes, ruedas y suspensión')} nota="clase Twizy">
        <Deslizador id="a1-B" etiqueta="Batalla: eje delantero a trasero" valor={P.B} clave="B" centro={D.B} min={1.3} max={Math.min(2.6, P.L - 0.9)} paso={0.01} mostrar={m2(P.B)} alCambiar={v => set('B', v)} />
        <Deslizador id="a1-vF" etiqueta="Vía delantera" valor={P.viaF} clave="viaF" centro={D.viaF} min={0.9} max={1.5} paso={0.01} mostrar={m2(P.viaF)} alCambiar={v => set('viaF', v)} />
        <Deslizador id="a1-vR" etiqueta="Vía trasera" valor={P.viaR} clave="viaR" centro={D.viaR} min={0.8} max={1.5} paso={0.01} mostrar={m2(P.viaR)} alCambiar={v => set('viaR', v)} />
        <Selector id="a1-nF" etiqueta="Neumáticos delanteros" valor={P.neumF} clave="neumF" opciones={neumaticos} alCambiar={v => set('neumF', v)} />
        <Selector id="a1-nR" etiqueta="Neumáticos traseros" valor={P.neumR} clave="neumR" opciones={neumaticos} alCambiar={v => set('neumR', v)} />
        <Deslizador id="a1-comp" etiqueta="Compresión de la suspensión" valor={P.comp} clave="comp" centro={D.comp} min={0} max={1} paso={0.05} mostrar={`${Math.round(P.comp * 100)} %`} alCambiar={v => set('comp', v)} />
        <Deslizador id="a1-mR" etiqueta="Una rueda con neumático" valor={P.mRueda} clave="mRueda" centro={D.mRueda} min={RANGOS_MASA_A1.mRueda[0]} max={RANGOS_MASA_A1.mRueda[1]} paso={0.1} mostrar={`${fmt(P.mRueda, 1)} kg`} alCambiar={v => set('mRueda', v)} />
        <Deslizador id="a1-mS" etiqueta="Cuatro McPherson con manguetas" valor={P.mSuspension} clave="mSuspension" centro={D.mSuspension} min={RANGOS_MASA_A1.mSuspension[0]} max={RANGOS_MASA_A1.mSuspension[1]} paso={0.5} mostrar={`${fmt(P.mSuspension, 1)} kg`} alCambiar={v => set('mSuspension', v)} />
        <Deslizador id="a1-mF" etiqueta="Un freno de disco con pinza" valor={P.mFrenos} clave="mFrenos" centro={D.mFrenos} min={RANGOS_MASA_A1.mFrenos[0]} max={RANGOS_MASA_A1.mFrenos[1]} paso={0.1} mostrar={`${fmt(P.mFrenos, 1)} kg`} alCambiar={v => set('mFrenos', v)} />
        <Deslizador id="a1-mD" etiqueta="Dirección completa" valor={P.mDireccion} clave="mDireccion" centro={D.mDireccion} min={RANGOS_MASA_A1.mDireccion[0]} max={RANGOS_MASA_A1.mDireccion[1]} paso={0.5} mostrar={`${fmt(P.mDireccion, 1)} kg`} alCambiar={v => set('mDireccion', v)} />
      </Bloque>
      </>)}

      {dep === 'propulsion' && (<>
      <Bloque titulo="Motor y transmisión" peso={pk('Motor y transmisión')} nota={`${P.kWNom}/${P.kWPico} kW`}>
        <Deslizador id="a1-kn" etiqueta="Potencia nominal" valor={P.kWNom} clave="kWNom" centro={D.kWNom} min={4} max={40} paso={0.5} mostrar={`${fmt(P.kWNom, 1)} kW`} alCambiar={v => set('kWNom', v)} />
        <Deslizador id="a1-kp" etiqueta="Potencia máxima" valor={P.kWPico} clave="kWPico" centro={D.kWPico} min={P.kWNom} max={80} paso={0.5} mostrar={`${fmt(P.kWPico, 1)} kW`} alCambiar={v => set('kWPico', v)} />
        <Deslizador id="a1-v" etiqueta="Velocidad de cálculo" valor={P.speed} clave="speed" centro={D.speed} min={30} max={160} paso={5} mostrar={`${P.speed} km/h`} alCambiar={v => set('speed', v)} />
        <Deslizador id="a1-mM" etiqueta="Motor" valor={P.mMotor} clave="mMotor" centro={D.mMotor} min={RANGOS_MASA_A1.mMotor[0]} max={RANGOS_MASA_A1.mMotor[1]} paso={0.5} mostrar={`${fmt(P.mMotor, 1)} kg`} alCambiar={v => set('mMotor', v)} />
        <Deslizador id="a1-mI" etiqueta="Inversor" valor={P.mInversor} clave="mInversor" centro={D.mInversor} min={RANGOS_MASA_A1.mInversor[0]} max={RANGOS_MASA_A1.mInversor[1]} paso={0.5} mostrar={`${fmt(P.mInversor, 1)} kg`} alCambiar={v => set('mInversor', v)} />
        <Deslizador id="a1-mRe" etiqueta="Reductora con diferencial" valor={P.mReductora} clave="mReductora" centro={D.mReductora} min={RANGOS_MASA_A1.mReductora[0]} max={RANGOS_MASA_A1.mReductora[1]} paso={0.5} mostrar={`${fmt(P.mReductora, 1)} kg`} alCambiar={v => set('mReductora', v)} />
      </Bloque>
      </>)}

      {dep === 'energia' && (<>
      <Bloque titulo="Batería y energía solar" peso={pk('Batería y energía solar')} nota={`${a1.bateriaKg.toFixed(0)} kg · ${a1.bateriaL.toFixed(0)} L`}>
        <Deslizador id="a1-kwh" etiqueta="Batería" valor={P.kWh} clave="kWh" centro={D.kWh} min={5} max={45} paso={0.5} mostrar={`${fmt(P.kWh, 1)} kWh`} alCambiar={v => set('kWh', v)} />
        <Deslizador id="a1-wkg" etiqueta="Densidad del paquete (masa)" valor={P.whKg} clave="whKg" centro={D.whKg} min={100} max={220} paso={5} mostrar={`${P.whKg} Wh/kg`} alCambiar={v => set('whKg', v)} />
        <Deslizador id="a1-wl" etiqueta="Densidad del paquete (volumen)" valor={P.whL} clave="whL" centro={D.whL} min={120} max={320} paso={5} mostrar={`${P.whL} Wh/L`} alCambiar={v => set('whL', v)} />
        <p className="-mt-2 text-xs text-slate-500">Celdas NMC en paquete: 150-180 Wh/kg y 200-250 Wh/L. LFP: 110-130 Wh/kg. El Twizy lleva 6,1 kWh en 100 kg.</p>
        <Deslizador id="a1-altBat" etiqueta="Altura de la batería" valor={P.altBat} clave="altBat" centro={D.altBat} min={-0.06} max={0.10} paso={0.005} mostrar={Math.abs(P.altBat) < 0.003 ? 'sobre el suelo del chasis' : P.altBat < 0 ? `${fmt(-P.altBat * 100, 1)} cm bajo el suelo` : `${fmt(P.altBat * 100, 1)} cm sobre el suelo`} alCambiar={v => set('altBat', v)} />
        <Deslizador id="a1-sol" etiqueta="Sol al día (horas pico)" valor={P.sol} clave="sol" centro={D.sol} min={1.5} max={7} paso={0.1} mostrar={`${fmt(P.sol, 1)} h`} alCambiar={v => set('sol', v)} />
        <Deslizador id="a1-mP" etiqueta="Paneles solares por m²" valor={P.mSolarM2} clave="mSolarM2" centro={D.mSolarM2} min={RANGOS_MASA_A1.mSolarM2[0]} max={RANGOS_MASA_A1.mSolarM2[1]} paso={0.1} mostrar={`${fmt(P.mSolarM2, 1)} kg/m²`} alCambiar={v => set('mSolarM2', v)} />
      </Bloque>
      </>)}

      {dep === 'interior' && (<>
      <Bloque titulo="Plazas y asientos" peso={pk('Plazas y asientos')}>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Plazas">
          {([[1, 'Monoplaza'], [2, 'Tándem 1+1']] as [1 | 2, string][]).map(([k, n]) => (
            <Button key={k} variant="outline" role="radio" aria-checked={P.plazas === k} onClick={() => set('plazas', k)}
              className={cn('flex-1 px-3 py-1.5 text-xs normal-case tracking-normal', P.plazas === k && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
          ))}
        </div>
        <Deslizador id="a1-xPil" etiqueta="Piloto: cadera al eje delantero" valor={P.xPil} clave="xPil" centro={D.xPil} min={0.10} max={1.30} paso={0.01} mostrar={m2(P.xPil)} alCambiar={v => set('xPil', v)} />
        <Deslizador id="a1-recPil" etiqueta="Reclinado del piloto" valor={P.recPil} clave="recPil" centro={D.recPil} min={15} max={60} paso={1} mostrar={`${P.recPil}°`} alCambiar={v => set('recPil', v)} />
        <Deslizador id="a1-altPil" etiqueta="Altura del asiento del piloto" valor={P.altPil} clave="altPil" centro={D.altPil} min={0.06} max={0.30} paso={0.005} mostrar={`${fmt(P.altPil * 100, 1)} cm sobre la batería`} alCambiar={v => set('altPil', v)} />
        {P.plazas === 2 && <>
          <Deslizador id="a1-xPas" etiqueta="Pasajero: cadera al eje delantero" valor={P.xPas} clave="xPas" centro={D.xPas} min={P.xPil + 0.60} max={P.xPil + 1.20} paso={0.01} mostrar={m2(P.xPas)} alCambiar={v => set('xPas', v)} />
          <Deslizador id="a1-recPas" etiqueta="Reclinado del pasajero" valor={P.recPas} clave="recPas" centro={D.recPas} min={15} max={85} paso={1} mostrar={`${P.recPas}°`} alCambiar={v => set('recPas', v)} />
          <Deslizador id="a1-volAlt" etiqueta="Volante: altura" valor={P.volAlt} clave="volAlt" centro={D.volAlt} min={-0.10} max={0.12} paso={0.01} mostrar={`${P.volAlt >= 0 ? '+' : ''}${fmt(P.volAlt * 100, 0)} cm`} alCambiar={v => set('volAlt', v)} />
          <Deslizador id="a1-volDist" etiqueta="Volante: distancia al piloto" valor={P.volDist} clave="volDist" centro={D.volDist} min={-0.12} max={0.15} paso={0.01} mostrar={`${P.volDist >= 0 ? '+' : ''}${fmt(P.volDist * 100, 0)} cm`} alCambiar={v => set('volDist', v)} />
          <Deslizador id="a1-pedDist" etiqueta="Pedales: distancia al piloto" valor={P.pedDist} clave="pedDist" centro={D.pedDist} min={-0.15} max={0.15} paso={0.01} mostrar={`${P.pedDist >= 0 ? '+' : ''}${fmt(P.pedDist * 100, 0)} cm`} alCambiar={v => set('pedDist', v)} />
          <Deslizador id="a1-pedAlt" etiqueta="Pedales: altura" valor={P.pedAlt} clave="pedAlt" centro={D.pedAlt} min={-0.08} max={0.12} paso={0.01} mostrar={`${P.pedAlt >= 0 ? '+' : ''}${fmt(P.pedAlt * 100, 0)} cm`} alCambiar={v => set('pedAlt', v)} />
          <Deslizador id="a1-altPas" etiqueta="Altura del asiento del pasajero" valor={P.altPas} clave="altPas" centro={D.altPas} min={0.06} max={0.30} paso={0.005} mostrar={`${fmt(P.altPas * 100, 1)} cm sobre la batería`} alCambiar={v => set('altPas', v)} />
        </>}
        <p className="text-xs text-slate-500">Sin pedales: los pies van en un reposapiés y las manos en un volante pequeño. Los asientos apoyan sobre los módulos de batería (9 cm, pegados al suelo del chasis); el pasajero va tumbado tipo Fórmula 1 con las piernas a los lados del asiento del piloto. Respaldo curvo y reposacabezas casi vertical: la cabeza va recta aunque el tronco vaya tumbado. La altura del vehículo sobre el suelo es «Altura de los bajos», en «Tamaño y ruedas».</p>
            <Deslizador id="a1-mOcc" etiqueta="Masa por ocupante" valor={P.mOcc} clave="mOcc" centro={D.mOcc} min={50} max={110} paso={1} mostrar={`${P.mOcc} kg`} alCambiar={v => set('mOcc', v)} />
        <Deslizador id="a1-mA" etiqueta="Un asiento" valor={P.mAsiento} clave="mAsiento" centro={D.mAsiento} min={RANGOS_MASA_A1.mAsiento[0]} max={RANGOS_MASA_A1.mAsiento[1]} paso={0.5} mostrar={`${fmt(P.mAsiento, 1)} kg`} alCambiar={v => set('mAsiento', v)} />
      </Bloque>
      </>)}

      {dep === 'accesos' && (<>
      <Bloque titulo="Puertas y maleteros">
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Tipo de puerta">
          {PUERTAS_A1.map(o => (
            <Button key={o.k} variant="outline" role="radio" aria-checked={P.puerta === o.k} onClick={() => set('puerta', o.k)}
              className={cn('flex-col items-start gap-0.5 px-3 py-2 text-left normal-case tracking-normal', P.puerta === o.k && 'border-teal-700 bg-teal-50 ring-1 ring-teal-700')}>
              <span className="text-sm font-semibold text-slate-900">{o.n}</span>
              <span className="text-xs font-normal text-slate-600">{o.d}</span>
            </Button>
          ))}
        </div>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-slate-600">Maletero delantero (bajo el capó)</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(a1.maleteroF)} L</dd>
          <dt className="text-slate-600">Maletero trasero (bajo la cola de la cúpula)</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(a1.maleteroT)} L</dd>
        </dl>
        <p className="text-xs text-slate-500">El capó y la cola de la cúpula se abren con «Abrir maleteros». Los paneles solares van en la cúpula, sobre el maletero trasero (el capó sube a 35° mirando al frente y es donde van los faros).</p>
      </Bloque>
      </>)}

      {dep === 'fabricacion' && (<>
      <Bloque titulo="Varios" peso={pk('Varios')} nota="lo que no tiene ficha propia">
        <Deslizador id="a1-mV" etiqueta="Varios: cables, cargador, luces, cierres" valor={P.mVarios} clave="mVarios" centro={D.mVarios} min={RANGOS_MASA_A1.mVarios[0]} max={RANGOS_MASA_A1.mVarios[1]} paso={1} mostrar={`${fmt(P.mVarios, 0)} kg`} alCambiar={v => set('mVarios', v)} />
      </Bloque>
      <Bloque titulo="Componentes" nota="ficha de cada pieza">
        <BotonesComponentes P={P} res={res} modelo={modelo} alNavegar={alNavegar} />
      </Bloque>
      </>)}

      {(dep === 'luces' || dep === 'homologacion') && (
        <Bloque titulo="Sin deslizadores" nota="todo está en el panel de abajo">
          <p className="text-xs text-slate-500">Este departamento no cambia la forma del vehículo: sus responsabilidades, tareas, decisiones y proveedores están en el panel bajo el 3D.</p>
        </Bloque>
      )}
    </>
  );
}
