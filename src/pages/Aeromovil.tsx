// ============================================================================
// AEROMÓVIL (2026-11-05, Eugenio)
// ============================================================================
// Dos vehículos en la misma página (ver `geometria.ts`):
//   · Aeromóvil 1 (por defecto desde el 2026-11-06): eléctrico de cuatro
//     ruedas con carrocería baja y cúpula, a partir del SZEmission un 30 %
//     mayor y con ruedas, frenos y suspensión de la clase del Twizy.
//   · Aeromóvil Gota: pedaleo asistido para tres (piloto delante, dos
//     pasajeros detrás), rombo basculante, carenado en gota. Es lo que abren
//     los diseños guardados antes del 2026-11-06.
//
// PÁGINA PROPIA, fuera del Layout: su menú es el del Aeromóvil, no el de Wiki
// Creator. Cinco vistas, cada una con su dirección:
//   /aeromovil            Diseño 3D por capas, con medidas ajustables
//   /aeromovil/tareas     comentarios de mejora = tareas pendientes (en la BD)
//   /aeromovil/plan       plan de desarrollo por etapas
//   /aeromovil/planos     láminas y DXF de fabricación del carenado y el chasis
//   /aeromovil/exportar   STEP por capas, STL y parámetros para regenerar el STEP
//   /aeromovil/componentes[/:id]  (solo Aeromóvil 1) ficha de cada pieza: peso,
//                         coste, proveedor y alternativas
//
// Todo el cálculo vive en `src/components/aeromovil/geometria.ts`, que es la
// misma geometría que el script CadQuery de `public/aeromovil/`.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bike, Box, ClipboardList, GitCompare, X, DoorOpen, Download, Gauge, Layers, ListChecks, Map as MapIcon, Ruler, RotateCcw, Package, Wrench } from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { Visor3D, CAPAS, type CapaId, type Vista, type VisorHandle } from '../components/aeromovil/Visor3D';
import {
  PARAMETROS_POR_DEFECTO, PARAMETROS_A1, PARAMETROS_GOTA, DIAMETRO_RUEDA, NEUMATICOS, MATERIALES_CARENADO, MATERIALES_CHASIS, RANGOS_MASA, ajustarCarenado, areas, calcular, crearModelo,
  type Disposicion, type MaterialCarenado, type MaterialChasis, type Modelo, type Neumatico, type Parametros, type Puerta, type Pulgadas, type Resultados,
} from '../components/aeromovil/geometria';
import { RANGOS_MASA_A1 } from '../components/aeromovil/geometriaA1';
import { MenuDisenos, aDiseno, deDiseno, useAutoguardado, type Diseno } from '../components/aeromovil/Disenos';
import { VistaOtros, TablaComparacion, fichaPropia } from '../components/aeromovil/Otros';
import { fichaComparable, type Referencia } from '../components/aeromovil/referencias';
import { FormularioMejora, VistaExportar, VistaPlan, VistaPlanos, VistaTareas, cargarDueno, cargarTareas, type Dueno, type Tarea } from '../components/aeromovil/Paneles';
import { BotonesComponentes, VistaComponentes } from '../components/aeromovil/Componentes';

// v5 (2026-11-06): el diseño por defecto pasa a ser el Aeromóvil 1; lo guardado como v4 era del Gota y se queda en su clave.
const CLAVE = 'aeromovil.parametros.v5';
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const m2 = (v: number) => `${fmt(v)} m`;

type Seccion = 'diseno' | 'componentes' | 'otros' | 'tareas' | 'plan' | 'planos' | 'exportar';
const SECCIONES: { k: Seccion; n: string; ruta: string; icono: typeof Box }[] = [
  { k: 'diseno', n: 'Diseño 3D', ruta: '/aeromovil', icono: Box },
  { k: 'componentes', n: 'Componentes', ruta: '/aeromovil/componentes', icono: Wrench },
  { k: 'otros', n: 'Otros velomóviles', ruta: '/aeromovil/otros', icono: Bike },
  { k: 'tareas', n: 'Tareas', ruta: '/aeromovil/tareas', icono: ListChecks },
  { k: 'plan', n: 'Plan', ruta: '/aeromovil/plan', icono: MapIcon },
  { k: 'planos', n: 'Planos', ruta: '/aeromovil/planos', icono: Ruler },
  { k: 'exportar', n: 'Exportar a CAD', ruta: '/aeromovil/exportar', icono: Download },
];

const PUERTAS: { k: Puerta; n: string; d: string }[] = [
  { k: 'cabina', n: 'Cabina de ultraligero', d: 'Cúpula de una pieza con bisagra delante: bascula hacia arriba y deja libres las tres plazas.' },
  { k: 'gaviota', n: 'Alas de gaviota', d: 'Dos puertas con bisagra en el centro del techo, una por lado. Se entra de pie y sin pasar por encima del morro.' },
  { k: 'aptera', n: 'Laterales tipo Aptera', d: 'Una puerta por lado con bisagra delante, que sube y se abre hacia fuera. Ocupa poco espacio al lado.' },
];
const PUERTAS_A1: { k: Puerta; n: string; d: string }[] = [
  { k: 'gaviota', n: 'Alas de gaviota', d: 'Media cúpula y el panel lateral suben juntos, con bisagra en la línea central del techo. Es lo que lleva el SZEmission.' },
  { k: 'cabina', n: 'Cúpula basculante', d: 'La cúpula entera bascula hacia delante; se entra por encima del estribo, como en un ultraligero.' },
  { k: 'aptera', n: 'Laterales tipo Aptera', d: 'Panel lateral y media cúpula con bisagra delante, inclinada: la puerta sube al abrirse y ocupa poco al lado.' },
];
const VEHICULOS: { k: Disposicion; n: string; d: string }[] = [
  { k: 'cuatro', n: 'Aeromóvil 1', d: 'Eléctrico de cuatro ruedas, carrocería baja con cúpula (SZEmission ×1,3), clase Twizy.' },
  { k: 'rombo', n: 'Aeromóvil Gota', d: 'Velomóvil tándem 1+2 de pedaleo asistido, rombo basculante, carenado en gota.' },
];

function Logo({ nombre }: { nombre: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 20" className="h-6 w-12 text-teal-700" aria-hidden>
        <path d="M2 12 C 6 3, 24 1, 38 9 C 30 15, 12 17, 2 12 Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="9" cy="16" r="2.4" fill="currentColor" /><circle cx="31" cy="15" r="2.4" fill="currentColor" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-slate-900">{nombre}</span>
    </span>
  );
}

function Deslizador({ id, etiqueta, valor, min, max, paso, mostrar, alCambiar, desactivado }: {
  id: string; etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string; alCambiar: (v: number) => void; desactivado?: boolean;
}) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3', desactivado && 'opacity-60')}>
      <label htmlFor={id} className="text-sm text-slate-700">{etiqueta}</label>
      <output htmlFor={id} className="font-mono text-xs tabular-nums text-slate-900">{mostrar}</output>
      <input id={id} type="range" min={min} max={max} step={paso} value={valor} disabled={desactivado}
        onChange={e => alCambiar(Number(e.target.value))} className="col-span-2 mt-1 w-full accent-teal-700" />
    </div>
  );
}

function Bloque({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <h3 className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
        {titulo}{nota && <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-slate-400">{nota}</span>}
      </h3>
      {children}
    </section>
  );
}

function Selector<T extends string>({ id, etiqueta, valor, opciones, alCambiar }: { id: string; etiqueta: string; valor: T; opciones: { k: T; n: string }[]; alCambiar: (v: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-slate-700">{etiqueta}</label>
      <select id={id} value={valor} onChange={e => alCambiar(e.target.value as T)} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs">
        {opciones.map(o => <option key={o.k} value={o.k}>{o.n}</option>)}
      </select>
    </div>
  );
}

function cargarParametros(): Parametros {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && typeof g === 'object') return deDiseno(g);
  } catch { /* sin almacenamiento o dato roto: los de por defecto */ }
  return PARAMETROS_POR_DEFECTO;
}

/** Los deslizadores y las cifras del Aeromóvil 1. */
function LadoA1({ P, Pa, set, res, modelo, neumaticos, malas, alNavegar }: {
  P: Parametros; Pa: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: Modelo;
  neumaticos: { k: Neumatico; n: string }[]; malas: number; alNavegar: (ruta: string) => void;
}) {
  const a1 = res.a1!;
  const cm = (v: number) => `${Math.round(v * 100)} cm`;
  const h = (v: number) => (v >= 10 ? `${Math.round(v)} h` : `${fmt(v, 1)} h`);
  return (
    <>
      <Bloque titulo="Componentes" nota="ficha de cada pieza">
        <BotonesComponentes P={P} res={res} modelo={modelo} alNavegar={alNavegar} />
      </Bloque>

      <Bloque titulo="Tamaño y ruedas" nota="clase Twizy">
        <Deslizador id="a1-L" etiqueta="Largo total" valor={P.L} min={2.6} max={4.4} paso={0.01} mostrar={m2(P.L)} alCambiar={v => set('L', v)} />
        <Deslizador id="a1-B" etiqueta="Batalla: eje delantero a trasero" valor={P.B} min={1.3} max={Math.min(2.6, P.L - 0.9)} paso={0.01} mostrar={m2(P.B)} alCambiar={v => set('B', v)} />
        <Deslizador id="a1-fm" etiqueta="Voladizo del morro" valor={P.fMorro} min={0.15} max={0.40} paso={0.005} mostrar={`${Math.round(P.fMorro * 100)} % del largo · ${m2(P.fMorro * P.L)}`} alCambiar={v => set('fMorro', v)} />
        <Deslizador id="a1-vF" etiqueta="Vía delantera" valor={P.viaF} min={0.9} max={1.5} paso={0.01} mostrar={m2(P.viaF)} alCambiar={v => set('viaF', v)} />
        <Deslizador id="a1-vR" etiqueta="Vía trasera" valor={P.viaR} min={0.8} max={1.5} paso={0.01} mostrar={m2(P.viaR)} alCambiar={v => set('viaR', v)} />
        <Deslizador id="a1-cl" etiqueta="Altura de los bajos" valor={P.clear} min={0.10} max={0.30} paso={0.005} mostrar={`${fmt(P.clear * 100, 1)} cm al suelo`} alCambiar={v => set('clear', v)} />
        <p className="-mt-2 text-xs text-slate-500">Sube y baja todo el interior: suelo, batería, asiento y piloto. El Twizy lleva 12 cm.</p>
        <Selector id="a1-nF" etiqueta="Neumáticos delanteros" valor={P.neumF} opciones={neumaticos} alCambiar={v => set('neumF', v)} />
        <Selector id="a1-nR" etiqueta="Neumáticos traseros" valor={P.neumR} opciones={neumaticos} alCambiar={v => set('neumR', v)} />
        <Selector id="a1-sd" etiqueta="Largueros Ø" valor={String(P.spineD)} opciones={['32', '40', '50', '60'].map(k => ({ k, n: `${k} mm` }))} alCambiar={v => set('spineD', Number(v))} />
        <Selector id="a1-st" etiqueta="Pared de los largueros" valor={String(P.spineT)} opciones={['1.5', '2', '2.5', '3'].map(k => ({ k, n: `${k.replace('.', ',')} mm` }))} alCambiar={v => set('spineT', Number(v))} />
      </Bloque>

      <Bloque titulo="Carrocería y cúpula" nota={`${m2(Pa.W)} × ${m2(Pa.H)}`}>
        <Deslizador id="a1-W" etiqueta="Ancho máximo" valor={P.W} min={1.2} max={2.0} paso={0.01} mostrar={m2(P.W)} alCambiar={v => set('W', v)} />
        <Deslizador id="a1-H" etiqueta="Alto total (techo de la cúpula)" valor={P.H} min={1.0} max={1.7} paso={0.01} mostrar={m2(P.H)} alCambiar={v => set('H', v)} />
        <Deslizador id="a1-deck" etiqueta="Altura de la cubierta" valor={P.deck} min={0.55} max={0.85} paso={0.005} mostrar={m2(P.deck * P.H)} alCambiar={v => set('deck', v)} />
        <p className="-mt-2 text-xs text-slate-500">La cubierta es el techo de la carrocería baja; de ahí para arriba es cúpula de cristal.</p>
        <Deslizador id="a1-mo" etiqueta="Forma del morro" valor={P.morroA1} min={0} max={1} paso={0.05} mostrar={P.morroA1 < 0.35 ? 'afilado' : P.morroA1 > 0.65 ? 'romo' : 'como el SZEmission'} alCambiar={v => set('morroA1', v)} />
        <Deslizador id="a1-co" etiqueta="Forma de la cola" valor={P.colaA1} min={0} max={1} paso={0.05} mostrar={P.colaA1 < 0.35 ? 'afilada' : P.colaA1 > 0.65 ? 'llena' : 'como el SZEmission'} alCambiar={v => set('colaA1', v)} />
        <div className="flex gap-1.5" role="radiogroup" aria-label="Parabrisas">
          {([['burbuja', 'Parabrisas burbuja'], ['plano', 'Parabrisas plano']] as ['burbuja' | 'plano', string][]).map(([k, n]) => (
            <Button key={k} variant="outline" role="radio" aria-checked={P.parabrisas === k} onClick={() => set('parabrisas', k)}
              className={cn('flex-1 px-3 py-1.5 text-xs normal-case tracking-normal', P.parabrisas === k && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-slate-500">{P.parabrisas === 'plano'
          ? 'Luna casi plana y estrecha, solo para el piloto (como el VW XL1), que sube del capó con la curva suave del Aptera. Detrás de los hombros, la cúpula de siempre.'
          : 'La cúpula del SZEmission: el parabrisas es parte de una sola burbuja.'}</p>
        <Deslizador id="a1-c0" etiqueta="Cúpula: dónde empieza" valor={P.cupX0} min={0.08} max={0.35} paso={0.005} mostrar={`${m2(P.cupX0 * P.L)} del morro`} alCambiar={v => set('cupX0', v)} />
        <Deslizador id="a1-c1" etiqueta="Cúpula: dónde acaba" valor={P.cupX1} min={0.70} max={0.995} paso={0.005} mostrar={`${m2((1 - P.cupX1) * P.L)} de la cola`} alCambiar={v => set('cupX1', v)} />
        <Deslizador id="a1-cw" etiqueta="Anchura de la cúpula" valor={P.cupW} min={0.35} max={0.75} paso={0.01} mostrar={m2(P.cupW * P.W)} alCambiar={v => set('cupW', v)} />
        <Deslizador id="a1-nU" etiqueta="Sección superior de la carrocería" valor={P.nU} min={2.0} max={3.4} paso={0.1} mostrar={P.nU < 2.3 ? 'elíptica' : P.nU > 2.9 ? 'cuadrada' : 'redondeada'} alCambiar={v => set('nU', v)} />
        <Deslizador id="a1-nL" etiqueta="Fondo" valor={P.nL} min={2.0} max={5.0} paso={0.1} mostrar={P.nL < 2.6 ? 'redondo' : P.nL > 3.6 ? 'plano' : 'semiplano'} alCambiar={v => set('nL', v)} />
      </Bloque>

      <Bloque titulo="Plazas y asientos">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Plazas">
          {([[1, 'Monoplaza'], [2, 'Tándem 1+1']] as [1 | 2, string][]).map(([k, n]) => (
            <Button key={k} variant="outline" role="radio" aria-checked={P.plazas === k} onClick={() => set('plazas', k)}
              className={cn('flex-1 px-3 py-1.5 text-xs normal-case tracking-normal', P.plazas === k && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
          ))}
        </div>
        <Deslizador id="a1-xPil" etiqueta="Piloto: cadera al eje delantero" valor={P.xPil} min={0.10} max={1.30} paso={0.01} mostrar={m2(P.xPil)} alCambiar={v => set('xPil', v)} />
        <Deslizador id="a1-recPil" etiqueta="Reclinado del piloto" valor={P.recPil} min={15} max={60} paso={1} mostrar={`${P.recPil}°`} alCambiar={v => set('recPil', v)} />
        {P.plazas === 2 && <>
          <Deslizador id="a1-xPas" etiqueta="Pasajero: cadera al eje delantero" valor={P.xPas} min={P.xPil + 0.70} max={P.xPil + 1.20} paso={0.01} mostrar={m2(P.xPas)} alCambiar={v => set('xPas', v)} />
          <Deslizador id="a1-recPas" etiqueta="Reclinado del pasajero" valor={P.recPas} min={15} max={60} paso={1} mostrar={`${P.recPas}°`} alCambiar={v => set('recPas', v)} />
        </>}
        <p className="text-xs text-slate-500">Sin pedales: los pies van en un reposapiés y las manos en un volante pequeño. El asiento apoya sobre el módulo de batería.</p>
      </Bloque>

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

      <Bloque titulo="Motor y batería" nota={`${a1.bateriaKg.toFixed(0)} kg · ${a1.bateriaL.toFixed(0)} L`}>
        <Deslizador id="a1-kn" etiqueta="Potencia nominal" valor={P.kWNom} min={4} max={40} paso={0.5} mostrar={`${fmt(P.kWNom, 1)} kW`} alCambiar={v => set('kWNom', v)} />
        <Deslizador id="a1-kp" etiqueta="Potencia máxima" valor={P.kWPico} min={P.kWNom} max={80} paso={0.5} mostrar={`${fmt(P.kWPico, 1)} kW`} alCambiar={v => set('kWPico', v)} />
        <Deslizador id="a1-kwh" etiqueta="Batería" valor={P.kWh} min={5} max={45} paso={0.5} mostrar={`${fmt(P.kWh, 1)} kWh`} alCambiar={v => set('kWh', v)} />
        <Deslizador id="a1-wkg" etiqueta="Densidad del paquete (masa)" valor={P.whKg} min={100} max={220} paso={5} mostrar={`${P.whKg} Wh/kg`} alCambiar={v => set('whKg', v)} />
        <Deslizador id="a1-wl" etiqueta="Densidad del paquete (volumen)" valor={P.whL} min={120} max={320} paso={5} mostrar={`${P.whL} Wh/L`} alCambiar={v => set('whL', v)} />
        <p className="-mt-2 text-xs text-slate-500">Celdas NMC en paquete: 150-180 Wh/kg y 200-250 Wh/L. LFP: 110-130 Wh/kg. El Twizy lleva 6,1 kWh en 98 kg (62 Wh/kg).</p>
        <Deslizador id="a1-v" etiqueta="Velocidad de cálculo" valor={P.speed} min={30} max={160} paso={5} mostrar={`${P.speed} km/h`} alCambiar={v => set('speed', v)} />
        <Deslizador id="a1-mo" etiqueta="Masa por ocupante" valor={P.mOcc} min={50} max={110} paso={1} mostrar={`${P.mOcc} kg`} alCambiar={v => set('mOcc', v)} />
        <Deslizador id="a1-sol" etiqueta="Sol al día (horas pico)" valor={P.sol} min={1.5} max={7} paso={0.1} mostrar={`${fmt(P.sol, 1)} h`} alCambiar={v => set('sol', v)} />
        <Deslizador id="a1-comp" etiqueta="Compresión de la suspensión" valor={P.comp} min={0} max={1} paso={0.05} mostrar={`${Math.round(P.comp * 100)} %`} alCambiar={v => set('comp', v)} />
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
          ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
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
        <Selector id="a1-matC" etiqueta="Material del chasis" valor={P.matChasis} opciones={(Object.keys(MATERIALES_CHASIS) as MaterialChasis[]).map(k => ({ k, n: MATERIALES_CHASIS[k].n }))} alCambiar={v => set('matChasis', v)} />
        <Deslizador id="a1-xC" etiqueta="Uniones, chapas y tornillería" valor={P.extraChasis} min={RANGOS_MASA_A1.extraChasis[0]} max={RANGOS_MASA_A1.extraChasis[1]} paso={0.5} mostrar={`${fmt(P.extraChasis, 1)} kg`} alCambiar={v => set('extraChasis', v)} />
        <Deslizador id="a1-mR" etiqueta="Una rueda con neumático" valor={P.mRueda} min={RANGOS_MASA_A1.mRueda[0]} max={RANGOS_MASA_A1.mRueda[1]} paso={0.1} mostrar={`${fmt(P.mRueda, 1)} kg`} alCambiar={v => set('mRueda', v)} />
        <Deslizador id="a1-mS" etiqueta="Cuatro McPherson con manguetas" valor={P.mSuspension} min={RANGOS_MASA_A1.mSuspension[0]} max={RANGOS_MASA_A1.mSuspension[1]} paso={0.5} mostrar={`${fmt(P.mSuspension, 1)} kg`} alCambiar={v => set('mSuspension', v)} />
        <Deslizador id="a1-mF" etiqueta="Un freno de disco con pinza" valor={P.mFrenos} min={RANGOS_MASA_A1.mFrenos[0]} max={RANGOS_MASA_A1.mFrenos[1]} paso={0.1} mostrar={`${fmt(P.mFrenos, 1)} kg`} alCambiar={v => set('mFrenos', v)} />
        <Deslizador id="a1-mM" etiqueta="Motor" valor={P.mMotor} min={RANGOS_MASA_A1.mMotor[0]} max={RANGOS_MASA_A1.mMotor[1]} paso={0.5} mostrar={`${fmt(P.mMotor, 1)} kg`} alCambiar={v => set('mMotor', v)} />
        <Deslizador id="a1-mI" etiqueta="Inversor" valor={P.mInversor} min={RANGOS_MASA_A1.mInversor[0]} max={RANGOS_MASA_A1.mInversor[1]} paso={0.5} mostrar={`${fmt(P.mInversor, 1)} kg`} alCambiar={v => set('mInversor', v)} />
        <Deslizador id="a1-mRe" etiqueta="Reductora con diferencial" valor={P.mReductora} min={RANGOS_MASA_A1.mReductora[0]} max={RANGOS_MASA_A1.mReductora[1]} paso={0.5} mostrar={`${fmt(P.mReductora, 1)} kg`} alCambiar={v => set('mReductora', v)} />
        <Deslizador id="a1-mD" etiqueta="Dirección completa" valor={P.mDireccion} min={RANGOS_MASA_A1.mDireccion[0]} max={RANGOS_MASA_A1.mDireccion[1]} paso={0.5} mostrar={`${fmt(P.mDireccion, 1)} kg`} alCambiar={v => set('mDireccion', v)} />
        <Deslizador id="a1-mA" etiqueta="Un asiento" valor={P.mAsiento} min={RANGOS_MASA_A1.mAsiento[0]} max={RANGOS_MASA_A1.mAsiento[1]} paso={0.5} mostrar={`${fmt(P.mAsiento, 1)} kg`} alCambiar={v => set('mAsiento', v)} />
        <Selector id="a1-matK" etiqueta="Material de la carrocería" valor={P.matCarenado} opciones={(Object.keys(MATERIALES_CARENADO) as MaterialCarenado[]).map(k => ({ k, n: MATERIALES_CARENADO[k].n }))} alCambiar={v => set('matCarenado', v)} />
        <Deslizador id="a1-eK" etiqueta="Espesor de la carrocería" valor={P.espCarenado} min={RANGOS_MASA_A1.espCarenado[0]} max={RANGOS_MASA_A1.espCarenado[1]} paso={0.1} mostrar={`${fmt(P.espCarenado, 1)} mm`} alCambiar={v => set('espCarenado', v)} />
        <Deslizador id="a1-eV" etiqueta="Espesor de la cúpula (policarbonato)" valor={P.espCristal} min={RANGOS_MASA_A1.espCristal[0]} max={RANGOS_MASA_A1.espCristal[1]} paso={0.5} mostrar={`${fmt(P.espCristal, 1)} mm`} alCambiar={v => set('espCristal', v)} />
        <Deslizador id="a1-mP" etiqueta="Paneles solares por m²" valor={P.mSolarM2} min={RANGOS_MASA_A1.mSolarM2[0]} max={RANGOS_MASA_A1.mSolarM2[1]} paso={0.1} mostrar={`${fmt(P.mSolarM2, 1)} kg/m²`} alCambiar={v => set('mSolarM2', v)} />
        <Deslizador id="a1-mV" etiqueta="Varios: cables, cargador, luces, cierres" valor={P.mVarios} min={RANGOS_MASA_A1.mVarios[0]} max={RANGOS_MASA_A1.mVarios[1]} paso={1} mostrar={`${fmt(P.mVarios, 0)} kg`} alCambiar={v => set('mVarios', v)} />
        <p className="text-xs text-slate-500">El chasis y los brazos se calculan tubo a tubo con su material; la batería, por su densidad; carrocería, cúpula y paneles, con su superficie real. El Twizy pesa 474 kg con 6,1 kWh.</p>
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
    </>
  );
}

export default function Aeromovil() {
  const loc = useLocation(), navegar = useNavigate();
  const ruta = loc.pathname.replace(/\/+$/, '');
  const seccion: Seccion = (SECCIONES.find(s => s.k !== 'diseno' && (ruta === s.ruta || ruta.startsWith(s.ruta + '/')))?.k) ?? 'diseno';

  const [P, setP] = useState<Parametros>(cargarParametros);
  const set = useCallback(<K extends keyof Parametros>(k: K, v: Parametros[K]) => setP(q => ({ ...q, [k]: v })), []);
  useEffect(() => { try { localStorage.setItem(CLAVE, JSON.stringify(P)); } catch { /* sin almacenamiento */ } }, [P]);

  // El diseño abierto (guardado en el servidor). `base` es cómo estaba al
  // abrirlo o guardarlo, para saber si hay cambios sin guardar.
  const [actual, setActual] = useState<{ id: number; nombre: string; base: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem('aeromovil.diseno') || 'null'); } catch { return null; }
  });
  useEffect(() => { try { localStorage.setItem('aeromovil.diseno', JSON.stringify(actual)); } catch { /* sin almacenamiento */ } }, [actual]);
  const abrirDiseno = useCallback((d: Diseno) => {
    const Q = deDiseno(d.parametros || {});
    setP(Q); setActual({ id: d.id, nombre: d.nombre, base: JSON.stringify(aDiseno(Q)) });
  }, []);
  const alGuardado = useCallback((d: Diseno) => setActual({ id: d.id, nombre: d.nombre, base: JSON.stringify(aDiseno(deDiseno(d.parametros || {}))) }), []);
  const guardadoWeb = useAutoguardado(P, actual, alGuardado);
  // `?diseno=ID` abre ese diseño (es el enlace que se comparte desde el menú).
  useEffect(() => {
    const id = Number(new URLSearchParams(loc.search).get('diseno'));
    if (!Number.isInteger(id) || id <= 0) return;
    fetch('/api/aeromovil/disenos', { credentials: 'include' }).then(r => (r.ok ? r.json() : [])).then((l: Diseno[]) => {
      const d = l.find(x => x.id === id); if (d) abrirDiseno(d);
    }).catch(() => { /* sin red: se queda lo que había */ });
  }, [loc.search, abrirDiseno]);

  // El ajuste automático decide W y H; lo demás sale tal cual de los deslizadores.
  const Pa = useMemo(() => ajustarCarenado(P), [P]);
  const modelo = useMemo(() => crearModelo(Pa), [Pa]);
  const res = useMemo(() => calcular(modelo, areas(modelo)), [modelo]);
  const esA1 = modelo.tipo === 'a1';
  const nombreVehiculo = esA1 ? 'Aeromóvil 1' : 'Aeromóvil Gota';
  const porDefecto = JSON.stringify(aDiseno(Pa)) === JSON.stringify(aDiseno(PARAMETROS_POR_DEFECTO));
  // Cambiar de vehículo carga su juego de medidas: los dos no comparten deslizadores.
  const cambiarVehiculo = (k: Disposicion) => { if (k !== P.disposicion) { setP(k === 'cuatro' ? PARAMETROS_A1 : PARAMETROS_GOTA); setActual(null); } };

  const [visibles, setVisibles] = useState<Record<CapaId, boolean>>(() => Object.fromEntries(CAPAS.map(c => [c.k, true])) as Record<CapaId, boolean>);
  const [rayosX, setRayosX] = useState(false);
  const [corte, setCorte] = useState(false);
  const [curva, setCurva] = useState(false);
  const [verCotas, setVerCotas] = useState(true);
  const [abierta, setAbierta] = useState(false);
  const [maleteros, setMaleteros] = useState(false);
  const [vista, setVista] = useState<Vista>('iso');
  const visor = useRef<VisorHandle | null>(null);
  // Otro velomóvil en el visor: solo, o junto al nuestro para comparar.
  const [referencia, setReferencia] = useState<Referencia | null>(null);
  const [modoRef, setModoRef] = useState<'no' | 'comparar' | 'sola'>('no');
  const [alinear, setAlinear] = useState<'eje' | 'morro' | 'lado'>('eje');
  const verRef = (r: Referencia, modo: 'comparar' | 'sola') => { setReferencia(r); setModoRef(modo); setVista('side'); navegar('/aeromovil'); window.scrollTo({ top: 0 }); };

  const [tareas, setTareas] = useState<Tarea[] | null>(null);
  const [errorTareas, setErrorTareas] = useState<string | null>(null);
  // Fetch propio a propósito: el buzón solo lo usa esta página (excepción de src/pages/CLAUDE.md).
  const recargar = useCallback(() => { cargarTareas().then(t => { setTareas(t); setErrorTareas(null); }).catch(e => setErrorTareas(e.message)); }, []);
  useEffect(() => { recargar(); }, [recargar]);
  // De quién es el Aeromóvil (el creador de su página en el menú lateral) y si quien mira puede decidir.
  const [dueno, setDueno] = useState<Dueno | null>(null);
  useEffect(() => { cargarDueno().then(setDueno).catch(() => setDueno(null)); }, []);
  const abiertas = tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_curso').length;

  useEffect(() => { document.title = `${nombreVehiculo} · humanity.wiki`; }, [nombreVehiculo]);

  const ruedas = (Object.keys(DIAMETRO_RUEDA) as Pulgadas[]).map(k => ({ k, n: `${k}″ (${Math.round(DIAMETRO_RUEDA[k] * 1000)} mm)` }));
  const neumaticos = (Object.keys(NEUMATICOS) as Neumatico[]).map(k => ({ k, n: NEUMATICOS[k].n }));
  const malas = res.comprobaciones.filter(c => c.holgura < c.minimo).length;
  const capas = CAPAS.filter(c => !('solo' in c) || c.solo === modelo.tipo);
  const a1 = res.a1;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Logo nombre={nombreVehiculo} />
          {dueno?.nombre && <span className="-ml-3 text-xs text-slate-500">de {dueno.nombre}</span>}
          <MenuDisenos P={P} actual={actual} puedeDecidir={!!dueno?.puedeDecidir} alCargar={abrirDiseno} estado={guardadoWeb}
            alNuevo={() => { setP(PARAMETROS_POR_DEFECTO); setActual(null); }}
            alGuardado={alGuardado} />
          <nav className="flex flex-wrap gap-1" aria-label="Aeromóvil">
            {SECCIONES.filter(s => s.k !== 'componentes' || esA1).map(s => {
              const Icono = s.icono, activa = seccion === s.k;
              return (
                <Button key={s.k} variant="ghost" aria-current={activa ? 'page' : undefined} onClick={() => navegar(s.ruta)}
                  className={cn('gap-1.5 px-3 py-1.5 text-sm normal-case tracking-normal', activa ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-700')}>
                  <Icono className="h-4 w-4" />{s.n}
                  {s.k === 'tareas' && abiertas ? <span className={cn('ml-0.5 rounded-full px-1.5 text-[11px] font-bold tabular-nums', activa ? 'bg-white text-slate-900' : 'bg-amber-500 text-white')}>{abiertas}</span> : null}
                </Button>
              );
            })}
          </nav>
          <span className="ml-auto hidden font-mono text-xs text-slate-500 lg:inline">
            {m2(modelo.Lf)} × {m2(Pa.W)} × {m2(Pa.H)} · {Math.round(res.mVeh)} kg
          </span>
        </div>
      </header>

      {/* El diseño se queda montado aunque se mire otra vista: así «Exportar» puede sacar el STL de lo que se ve. */}
      <main className={cn('mx-auto max-w-[1600px] gap-4 px-4 py-4', seccion === 'diseno' ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px]' : 'hidden')}>
        <section className="relative h-[62vh] min-h-[380px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:sticky lg:top-[68px] lg:h-[calc(100vh-88px)]" aria-label="Vista 3D">
          <Visor3D ref={visor} modelo={modelo} visibles={visibles} rayosX={rayosX} corte={corte} curva={curva} cotas={verCotas} abierta={abierta} maleteros={maleteros} vista={vista}
            referencia={referencia} modoRef={modoRef} alinear={alinear} alPinchar={esA1 ? c => { navegar(`/aeromovil/componentes/${c}`); window.scrollTo({ top: 0 }); } : undefined} />
          {referencia && modoRef !== 'no' && (
            <div className="absolute right-3 top-3 z-10 flex max-w-[min(92%,560px)] flex-col gap-2 rounded-xl border border-teal-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-1.5">
                <GitCompare className="h-4 w-4 text-teal-700" />
                <span className="text-sm font-semibold text-slate-900">{modoRef === 'comparar' ? `Comparando con ${referencia.nombre}` : referencia.nombre}</span>
                <span className="ml-auto flex gap-1">
                  <Button variant="outline" aria-pressed={modoRef === 'comparar'} onClick={() => setModoRef(modoRef === 'comparar' ? 'sola' : 'comparar')}
                    className="px-2 py-1 text-xs normal-case tracking-normal">{modoRef === 'comparar' ? 'Ver solo' : 'Comparar'}</Button>
                  <Button variant="ghost" aria-label="Quitar el otro velomóvil" onClick={() => setModoRef('no')} className="px-1.5 py-1"><X className="h-4 w-4" /></Button>
                </span>
              </div>
              {modoRef === 'comparar' && (
                <>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600" role="group" aria-label="Alinear">
                    Alinear:
                    {([['eje', 'por la rueda delantera'], ['morro', 'por el morro'], ['lado', 'al lado']] as const).map(([k, n]) => (
                      <Button key={k} variant="outline" aria-pressed={alinear === k} onClick={() => setAlinear(k)}
                        className={cn('px-2 py-0.5 text-[11px] normal-case tracking-normal', alinear === k && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
                    ))}
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-teal-700">Tabla de medidas</summary>
                    <div className="mt-1 max-h-56 overflow-y-auto"><TablaComparacion propia={fichaPropia(modelo, res)} otra={fichaComparable(referencia)} nombre={referencia.nombre} nuestro={nombreVehiculo} /></div>
                  </details>
                </>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            {esA1 ? `${P.plazas === 2 ? 'Tándem 1+1' : 'Monoplaza'} · cuatro ruedas · eléctrico ${P.kWNom}/${P.kWPico} kW · ${P.kWh} kWh` : 'Tándem 1+2 · rombo basculante · pedaleo asistido'}
            {esA1 && <span className="block normal-case tracking-normal text-slate-400">Pincha una pieza para abrir su ficha</span>}
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-1.5">
            <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white" role="group" aria-label="Vistas">
              {([['iso', '3/4'], ['side', 'Lateral'], ['top', 'Planta'], ['front', 'Frontal'], ['back', 'Trasera']] as [Vista, string][]).map(([k, n]) => (
                <Button key={k} variant="ghost" aria-pressed={vista === k} onClick={() => setVista(k)}
                  className={cn('rounded-none px-3 py-1.5 text-xs normal-case tracking-normal', vista === k && 'bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
              ))}
            </div>
            {([['Cotas', verCotas, setVerCotas], ['Rayos X', rayosX, setRayosX], ['Corte', corte, setCorte], [esA1 ? 'Girar ruedas' : 'Simular curva', curva, setCurva]] as [string, boolean, (v: boolean) => void][]).map(([n, v, f]) => (
              <Button key={n} variant="outline" aria-pressed={v} onClick={() => f(!v)}
                className={cn('bg-white px-3 py-1.5 text-xs normal-case tracking-normal', v && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
            ))}
            <Button variant="outline" aria-pressed={abierta} onClick={() => setAbierta(!abierta)}
              className={cn('bg-white px-3 py-1.5 text-xs normal-case tracking-normal', abierta && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
              <DoorOpen className="mr-1 h-3.5 w-3.5" />{abierta ? 'Cerrar' : 'Abrir'} {Pa.puerta === 'cabina' ? 'cúpula' : 'puertas'}
            </Button>
            {esA1 && (
              <Button variant="outline" aria-pressed={maleteros} onClick={() => setMaleteros(!maleteros)}
                className={cn('bg-white px-3 py-1.5 text-xs normal-case tracking-normal', maleteros && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                <Package className="mr-1 h-3.5 w-3.5" />{maleteros ? 'Cerrar' : 'Abrir'} maleteros
              </Button>
            )}
          </div>
        </section>

        <aside className="mt-4 flex flex-col gap-3 lg:mt-0">
          <Bloque titulo="Vehículo">
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Tipo de vehículo">
              {VEHICULOS.map(o => (
                <Button key={o.k} variant="outline" role="radio" aria-checked={P.disposicion === o.k} onClick={() => cambiarVehiculo(o.k)}
                  className={cn('flex-col items-start gap-0.5 px-3 py-2 text-left normal-case tracking-normal', P.disposicion === o.k && 'border-teal-700 bg-teal-50 ring-1 ring-teal-700')}>
                  <span className="text-sm font-semibold text-slate-900">{o.n}</span>
                  <span className="text-xs font-normal text-slate-600">{o.d}</span>
                </Button>
              ))}
            </div>
          </Bloque>
          <Bloque titulo="Capas" nota="clic para ocultar">
            <div className="grid grid-cols-2 gap-1.5">
              {capas.map(c => (
                <Button key={c.k} variant="outline" aria-pressed={visibles[c.k]} onClick={() => setVisibles(v => ({ ...v, [c.k]: !v[c.k] }))}
                  className={cn('justify-start gap-2 px-2.5 py-1.5 text-left text-[13px] font-medium normal-case tracking-normal', !visibles[c.k] && 'border-dashed text-slate-400')}>
                  <span className={cn('h-3 w-3 shrink-0 rounded-sm', visibles[c.k] ? c.color : 'bg-transparent ring-1 ring-slate-300')} />{c.n}
                </Button>
              ))}
            </div>
          </Bloque>

          {esA1 ? <LadoA1 P={P} Pa={Pa} set={set} res={res} modelo={modelo} neumaticos={neumaticos} malas={malas} alNavegar={r => { navegar(r); window.scrollTo({ top: 0 }); }} /> : (<>
          <Bloque titulo="Chasis y ruedas">
            <Deslizador id="am-B" etiqueta="Batalla: rueda delantera a trasera" valor={P.B} min={2.6} max={3.8} paso={0.01} mostrar={m2(P.B)} alCambiar={v => set('B', v)} />
            <Deslizador id="am-xL" etiqueta="Eje lateral desde la rueda delantera" valor={P.xLm} min={1.1} max={Math.min(2.3, P.B - 0.8)} paso={0.01} mostrar={m2(P.xLm)} alCambiar={v => set('xLm', v)} />
            <Deslizador id="am-hq" etiqueta="Inclinación de la horquilla" valor={P.horquilla} min={0} max={35} paso={1} mostrar={`${P.horquilla}° · avance ${Math.round(modelo.avance * 100)} cm`} alCambiar={v => set('horquilla', v)} />
            <p className="-mt-2 text-xs text-slate-500">Menos grados lleva la parte de arriba de la horquilla hacia delante y deja más sitio a los pedales; por debajo de 4 cm de avance la dirección se vuelve nerviosa.</p>
            <Deslizador id="am-cl" etiqueta="Altura de los bajos" valor={P.clear} min={0.08} max={0.40} paso={0.01} mostrar={`${Math.round(P.clear * 100)} cm al suelo`} alCambiar={v => set('clear', v)} />
            <p className="-mt-2 text-xs text-slate-500">Del suelo al fondo del carenado. Sube y baja con él todo el interior: viga, asientos, ocupantes y baterías; las ruedas se quedan en el suelo y la suspensión se alarga hasta ellas. Más alto pasa mejor por bordillos y caminos, pero sube el centro de gravedad y hace falta más techo.</p>
            <Deslizador id="am-track" etiqueta="Ancho del eje lateral (vía)" valor={P.track} min={0.65} max={1.20} paso={0.01} mostrar={m2(P.track)} alCambiar={v => set('track', v)} />
            <Selector id="am-wF" etiqueta="Ruedas delantera y trasera" valor={P.wF} opciones={ruedas} alCambiar={v => set('wF', v)} />
            <Selector id="am-wL" etiqueta="Ruedas laterales" valor={P.wL} opciones={ruedas} alCambiar={v => set('wL', v)} />
            <Selector id="am-sd" etiqueta="Tubo central Ø" valor={String(P.spineD)} opciones={['50.8', '63.5', '76.2', '88.9'].map(k => ({ k, n: `${k.replace('.', ',')} mm` }))} alCambiar={v => set('spineD', Number(v))} />
            <Selector id="am-st" etiqueta="Pared del tubo central" valor={String(P.spineT)} opciones={['2', '2.5', '3', '4'].map(k => ({ k, n: `${k.replace('.', ',')} mm` }))} alCambiar={v => set('spineT', Number(v))} />
          </Bloque>

          <Bloque titulo="Asientos">
            <Deslizador id="am-xPil" etiqueta="Piloto: cadera al eje delantero" valor={P.xPil} min={1.10} max={1.55} paso={0.01} mostrar={m2(P.xPil)} alCambiar={v => set('xPil', v)} />
            <Deslizador id="am-xPas" etiqueta="Pasajeros: cadera al eje delantero" valor={P.xPas} min={P.xPil + 0.70} max={P.xPil + 1.15} paso={0.01} mostrar={m2(P.xPas)} alCambiar={v => set('xPas', v)} />
            <Deslizador id="am-recPil" etiqueta="Reclinado del piloto" valor={P.recPil} min={10} max={55} paso={1} mostrar={`${P.recPil}°`} alCambiar={v => set('recPil', v)} />
            <Deslizador id="am-recPas" etiqueta="Reclinado de los pasajeros" valor={P.recPas} min={10} max={55} paso={1} mostrar={`${P.recPas}°`} alCambiar={v => set('recPas', v)} />
            <p className="text-xs text-slate-500">Menos distancia acerca el asiento al manillar; los pedales y el manillar siguen al piloto. Más reclinado baja la cabeza y deja bajar el techo.</p>
          </Bloque>

          <Bloque titulo="Carenado aerodinámico" nota={`L ${m2(modelo.Lf)}`}>
            <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="am-auto">
              <input id="am-auto" type="checkbox" checked={P.auto} onChange={e => set('auto', e.target.checked)} className="accent-teal-700" />
              Ajustar ancho y alto a los ocupantes
            </label>
            {P.auto && <Deslizador id="am-hol" etiqueta="Holgura interior (volumen)" valor={P.holgura} min={0.02} max={0.15} paso={0.005} mostrar={`${fmt(P.holgura * 100, 1)} cm`} alCambiar={v => set('holgura', v)} />}
            <Deslizador id="am-W" etiqueta="Ancho máximo" valor={Pa.W} min={1.1} max={2.0} paso={0.01} mostrar={m2(Pa.W)} alCambiar={v => set('W', v)} desactivado={P.auto} />
            <Deslizador id="am-H" etiqueta="Alto total" valor={Pa.H} min={1.0} max={1.7} paso={0.01} mostrar={m2(Pa.H)} alCambiar={v => set('H', v)} desactivado={P.auto} />
            <Deslizador id="am-oF" etiqueta="Hueco del morro a la rueda delantera" valor={P.overF} min={0.05} max={0.80} paso={0.01} mostrar={`${Math.round(P.overF * 100)} cm`} alCambiar={v => set('overF', v)} />
            <Deslizador id="am-morro" etiqueta="Forma del morro" valor={P.morro} min={0} max={1} paso={0.05} mostrar={P.morro < 0.25 ? 'afilado' : P.morro < 0.6 ? 'redondeado' : 'romo'} alCambiar={v => set('morro', v)} />
            <Deslizador id="am-tail" etiqueta="Hueco de la cola a la rueda trasera" valor={P.tail} min={0.05} max={1.4} paso={0.01} mostrar={`${Math.round(P.tail * 100)} cm`} alCambiar={v => set('tail', v)} />
            <Deslizador id="am-tr" etiqueta="Redondez de la punta de cola" valor={P.tailRound} min={0} max={0.8} paso={0.05} mostrar={P.tailRound < 0.1 ? 'en punta' : P.tailRound < 0.5 ? 'redondeada' : 'roma'} alCambiar={v => set('tailRound', v)} />
            <Deslizador id="am-pm" etiqueta="Posición del espesor máximo" valor={P.pmax} min={0.25} max={0.60} paso={0.01} mostrar={`${Math.round(P.pmax * 100)} %`} alCambiar={v => set('pmax', v)} />
            <Deslizador id="am-full" etiqueta="Plenitud de cola" valor={P.full} min={0.5} max={1.4} paso={0.05} mostrar={P.full < 0.75 ? 'llena' : P.full > 1.05 ? 'afilada' : 'media'} alCambiar={v => set('full', v)} />
            <Deslizador id="am-tip" etiqueta="Altura de la punta de cola" valor={P.tipH} min={0.25} max={0.70} paso={0.01} mostrar={m2(Pa.clear + (Pa.H - Pa.clear) * P.tipH)} alCambiar={v => set('tipH', v)} />
            <Deslizador id="am-nU" etiqueta="Sección superior" valor={P.nU} min={2.0} max={3.4} paso={0.1} mostrar={P.nU < 2.3 ? 'elíptica' : P.nU > 2.9 ? 'cuadrada' : 'redondeada'} alCambiar={v => set('nU', v)} />
            <Deslizador id="am-nL" etiqueta="Fondo" valor={P.nL} min={2.0} max={5.0} paso={0.1} mostrar={P.nL < 2.6 ? 'redondo' : P.nL > 3.6 ? 'plano' : 'semiplano'} alCambiar={v => set('nL', v)} />
          </Bloque>

          <Bloque titulo="Puerta y apertura">
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Tipo de puerta">
              {PUERTAS.map(o => (
                <Button key={o.k} variant="outline" role="radio" aria-checked={P.puerta === o.k} onClick={() => set('puerta', o.k)}
                  className={cn('flex-col items-start gap-0.5 px-3 py-2 text-left normal-case tracking-normal', P.puerta === o.k && 'border-teal-700 bg-teal-50 ring-1 ring-teal-700')}>
                  <span className="text-sm font-semibold text-slate-900">{o.n}</span>
                  <span className="text-xs font-normal text-slate-600">{o.d}</span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Cristal solo delante y en las ventanillas; el techo y la cubierta trasera son paneles solares, para que no se caliente por dentro.</p>
          </Bloque>

          <Bloque titulo="Movimiento y uso">
            <Deslizador id="am-tilt" etiqueta="Inclinación máxima en curva" valor={P.tiltMax} min={10} max={30} paso={1} mostrar={`${P.tiltMax}°`} alCambiar={v => set('tiltMax', v)} />
            <Deslizador id="am-comp" etiqueta="Compresión de suspensiones" valor={P.comp} min={0} max={1} paso={0.05} mostrar={`${Math.round(P.comp * 100)} %`} alCambiar={v => set('comp', v)} />
            <Deslizador id="am-mo" etiqueta="Masa por ocupante" valor={P.mOcc} min={50} max={110} paso={1} mostrar={`${P.mOcc} kg`} alCambiar={v => set('mOcc', v)} />
            <Deslizador id="am-ped" etiqueta="Potencia de pedaleo" valor={P.pedal} min={0} max={200} paso={5} mostrar={`${P.pedal} W`} alCambiar={v => set('pedal', v)} />
            <Deslizador id="am-v" etiqueta="Velocidad de cálculo" valor={P.speed} min={10} max={45} paso={1} mostrar={`${P.speed} km/h`} alCambiar={v => set('speed', v)} />
            <Deslizador id="am-sol" etiqueta="Sol al día (horas pico)" valor={P.sol} min={1.5} max={7} paso={0.1} mostrar={`${fmt(P.sol, 1)} h`} alCambiar={v => set('sol', v)} />
          </Bloque>

          <Bloque titulo="Comprobaciones" nota={malas ? `${malas} por revisar` : 'todo cabe'}>
            <ul className="flex flex-col gap-1.5">
              {res.comprobaciones.map(c => {
                const cl = c.holgura < 0 ? 'border-red-300 bg-red-50 text-red-700' : c.holgura < c.minimo ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700';
                return (
                  <li key={c.nombre} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
                    <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', cl)}>{c.holgura < 0 ? 'roza' : c.holgura < c.minimo ? 'justo' : 'ok'}</span>
                    <span className="text-slate-700">{c.nombre}</span>
                    <span className="font-mono text-xs tabular-nums">{c.holgura < 0 ? '−' : ''}{fmt(Math.abs(c.holgura) * 100, 1)} cm</span>
                  </li>
                );
              })}
            </ul>
          </Bloque>

          <Bloque titulo="Aerodinámica, energía y sol" nota="estimación">
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
              {([
                ['Volumen del carenado', `${fmt(res.vol)} m³`], ['Área frontal', `${fmt(res.A)} m²`], ['Esbeltez L/D', fmt(res.FR, 1)],
                ['Cd estimado', fmt(res.Cd, 3)], ['CdA', `${fmt(res.CdA, 3)} m²`],
                [`Potencia a ${P.speed} km/h`, `${Math.round(res.Pw)} W`], ['Consumo', `${fmt(res.WhKm, 1)} Wh/km`],
                [`Aporte del pedaleo (${P.pedal} W)`, `${fmt(res.pedWhKm, 1)} Wh/km`], ['Autonomía con 4 × 500 Wh', `${Math.round(res.autonomia)} km`],
                ['Velocidad sostenida con 250 W', `${Math.round(res.vmax)} km/h`],
                ['Paneles solares', `${fmt(res.areas.solar)} m² · ${Math.round(res.solarPico)} W pico`],
                ['Energía solar al día', `${fmt(res.solarDia / 1000)} kWh · ${Math.round(res.kmSol)} km`],
                ['Cristal', `${fmt(res.areas.cristal)} m²`],
              ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
            </dl>
            <p className="text-xs text-slate-500">Cd orientativo según esbeltez y forma; valídalo con CFD antes de fabricar el molde.</p>
          </Bloque>

          <Bloque titulo="Peso del vehículo" nota={`${Math.round(res.mVeh)} kg`}>
            {/* El rango: todo al mínimo y todo al máximo, con el diseño actual marcado */}
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
            </dl>
            <Selector id="am-matC" etiqueta="Material del chasis" valor={P.matChasis} opciones={(Object.keys(MATERIALES_CHASIS) as MaterialChasis[]).map(k => ({ k, n: MATERIALES_CHASIS[k].n }))} alCambiar={v => set('matChasis', v)} />
            <Deslizador id="am-xC" etiqueta="Uniones, pletinas y tornillería" valor={P.extraChasis} min={RANGOS_MASA.extraChasis[0]} max={RANGOS_MASA.extraChasis[1]} paso={0.1} mostrar={`${fmt(P.extraChasis, 1)} kg`} alCambiar={v => set('extraChasis', v)} />
            <Deslizador id="am-mR" etiqueta="Una rueda completa" valor={P.mRueda} min={RANGOS_MASA.mRueda[0]} max={RANGOS_MASA.mRueda[1]} paso={0.05} mostrar={`${fmt(P.mRueda, 2)} kg`} alCambiar={v => set('mRueda', v)} />
            <Deslizador id="am-mS" etiqueta="Horquilla y amortiguadores" valor={P.mSuspension} min={RANGOS_MASA.mSuspension[0]} max={RANGOS_MASA.mSuspension[1]} paso={0.1} mostrar={`${fmt(P.mSuspension, 1)} kg`} alCambiar={v => set('mSuspension', v)} />
            <Deslizador id="am-mM" etiqueta="Motor de buje" valor={P.mMotor} min={RANGOS_MASA.mMotor[0]} max={RANGOS_MASA.mMotor[1]} paso={0.1} mostrar={`${fmt(P.mMotor, 1)} kg`} alCambiar={v => set('mMotor', v)} />
            <Deslizador id="am-mG" etiqueta="Generador de pedalier" valor={P.mGenerador} min={RANGOS_MASA.mGenerador[0]} max={RANGOS_MASA.mGenerador[1]} paso={0.1} mostrar={`${fmt(P.mGenerador, 1)} kg`} alCambiar={v => set('mGenerador', v)} />
            <Deslizador id="am-mB" etiqueta="Una batería (lleva 4)" valor={P.mBateria} min={RANGOS_MASA.mBateria[0]} max={RANGOS_MASA.mBateria[1]} paso={0.05} mostrar={`${fmt(P.mBateria, 2)} kg`} alCambiar={v => set('mBateria', v)} />
            <Deslizador id="am-mA" etiqueta="Un asiento" valor={P.mAsiento} min={RANGOS_MASA.mAsiento[0]} max={RANGOS_MASA.mAsiento[1]} paso={0.1} mostrar={`${fmt(P.mAsiento, 1)} kg`} alCambiar={v => set('mAsiento', v)} />
            <Selector id="am-matK" etiqueta="Material del carenado" valor={P.matCarenado} opciones={(Object.keys(MATERIALES_CARENADO) as MaterialCarenado[]).map(k => ({ k, n: MATERIALES_CARENADO[k].n }))} alCambiar={v => set('matCarenado', v)} />
            <Deslizador id="am-eK" etiqueta="Espesor del carenado" valor={P.espCarenado} min={RANGOS_MASA.espCarenado[0]} max={RANGOS_MASA.espCarenado[1]} paso={0.1} mostrar={`${fmt(P.espCarenado, 1)} mm`} alCambiar={v => set('espCarenado', v)} />
            <Deslizador id="am-eV" etiqueta="Espesor del cristal (policarbonato)" valor={P.espCristal} min={RANGOS_MASA.espCristal[0]} max={RANGOS_MASA.espCristal[1]} paso={0.1} mostrar={`${fmt(P.espCristal, 1)} mm`} alCambiar={v => set('espCristal', v)} />
            <Deslizador id="am-mP" etiqueta="Paneles solares por m²" valor={P.mSolarM2} min={RANGOS_MASA.mSolarM2[0]} max={RANGOS_MASA.mSolarM2[1]} paso={0.1} mostrar={`${fmt(P.mSolarM2, 1)} kg/m²`} alCambiar={v => set('mSolarM2', v)} />
            <Deslizador id="am-mV" etiqueta="Varios: cables, luces, frenos" valor={P.mVarios} min={RANGOS_MASA.mVarios[0]} max={RANGOS_MASA.mVarios[1]} paso={0.5} mostrar={`${fmt(P.mVarios, 1)} kg`} alCambiar={v => set('mVarios', v)} />
            <p className="text-xs text-slate-500">El chasis y la suspensión se calculan tubo a tubo con su material; carenado, cristal y paneles, con su superficie real.</p>
          </Bloque>

          <Bloque titulo="Estructura y masa" nota="estimación">
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
              {([
                ['Masa del vehículo', `${Math.round(res.mVeh)} kg`], ['  carenado, cristal y paneles', `${Math.round(res.masas.Carenado + res.masas.Cristales + res.masas['Paneles solares'])} kg`],
                ['  chasis y suspensión', `${fmt(res.masas.Chasis + res.masas['Suspensión'], 1)} kg`], ['Con 3 ocupantes', `${Math.round(res.mTot)} kg`],
                ['Momento máx. en la viga', `${Math.round(res.Mmax)} N·m`], ['Tensión dinámica (×2,5)', `${Math.round(res.tension)} MPa`],
                ['Coeficiente de seguridad', fmt(res.seguridad, 2)], ['Carga máx. por rueda', `${Math.round(res.cargaRueda)} kg`],
              ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="whitespace-pre text-slate-600">{a}</dt><dd className={cn('text-right font-mono text-xs tabular-nums',
                a === 'Coeficiente de seguridad' && (res.seguridad < 1.3 ? 'text-red-700' : res.seguridad < 1.8 ? 'text-amber-700' : 'text-emerald-700'),
                a === 'Carga máx. por rueda' && (res.cargaRueda > 120 ? 'text-red-700' : res.cargaRueda > 100 ? 'text-amber-700' : 'text-emerald-700'))}>{b}</dd></Fragment>))}
            </dl>
            <p className="text-xs text-slate-500">Viga de {MATERIALES_CHASIS[P.matChasis].n.toLowerCase()} (límite usable {MATERIALES_CHASIS[P.matChasis].limite} MPa){P.matChasis === 'al6061' ? ', con tratamiento T6 tras soldar' : ''}; una rueda de bici aguanta unos 100 kg.</p>
          </Bloque>

          </>)}
          <Bloque titulo="¿Algo que mejorar?">
            <FormularioMejora alEnviar={() => { recargar(); }} />
            <p className="text-xs text-slate-500">Se añade a <a className="text-teal-700 underline" href="/aeromovil/tareas" onClick={e => { e.preventDefault(); navegar('/aeromovil/tareas'); }}>Tareas</a> como pendiente.</p>
          </Bloque>

          <Button variant="ghost" onClick={() => { setP(PARAMETROS_POR_DEFECTO); setActual(null); }} className="self-start text-xs normal-case tracking-normal">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Empezar un diseño nuevo (medidas por defecto)
          </Button>
        </aside>
      </main>

      {seccion === 'componentes' && (esA1
        ? <VistaComponentes P={P} res={res} modelo={modelo} id={ruta.split('/')[3]} alCambiar={setP} alNavegar={r => { navegar(r); window.scrollTo({ top: 0 }); }}
            alVerEn3D={capa => { setVisibles(Object.fromEntries(CAPAS.map(c => [c.k, true])) as Record<CapaId, boolean>); setRayosX(!['carenado', 'cristales', 'solar'].includes(capa)); setVista('iso'); navegar('/aeromovil'); window.scrollTo({ top: 0 }); }} />
        : <p className="mx-auto max-w-[1100px] px-4 py-8 text-sm text-slate-600">Las fichas de componentes son del Aeromóvil 1. Elige ese vehículo en «Diseño 3D» para verlas.</p>)}
      {seccion === 'otros' && <VistaOtros modelo={modelo} resultados={res} puedeDecidir={!!dueno?.puedeDecidir} alVer={r => verRef(r, 'sola')} alComparar={r => verRef(r, 'comparar')} />}
      {seccion === 'tareas' && <VistaTareas tareas={tareas} recargar={recargar} error={errorTareas} dueno={dueno} />}
      {seccion === 'plan' && <VistaPlan />}
      {seccion === 'planos' && <VistaPlanos modelo={modelo} />}
      {seccion === 'exportar' && <VistaExportar modelo={modelo} visor={visor} porDefecto={porDefecto} resultados={res} />}

      <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-6 pt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />Modelo paramétrico · STEP generado con CadQuery</span>
        <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />Cifras de rendimiento estimadas</span>
        <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{abiertas ?? '…'} tareas abiertas</span>
      </footer>
    </div>
  );
}
