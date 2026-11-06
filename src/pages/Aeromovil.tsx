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
import { Bike, Box, Camera, ClipboardList, GitCompare, X, DoorOpen, Download, Gauge, Layers, ListChecks, Map as MapIcon, Ruler, RotateCcw, Package, Wrench } from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { Visor3D, CAPAS, type CapaId, type Vista, type VisorHandle } from '../components/aeromovil/Visor3D';
import {
  PARAMETROS_POR_DEFECTO, PARAMETROS_A1, PARAMETROS_GOTA, DIAMETRO_RUEDA, NEUMATICOS, MATERIALES_CARENADO, MATERIALES_CHASIS, RANGOS_MASA, ajustarCarenado, areas, calcular, crearModelo,
  type Disposicion, type MaterialCarenado, type MaterialChasis, type Modelo, type Neumatico, type Parametros, type Puerta, type Pulgadas, type Resultados,
} from '../components/aeromovil/geometria';
import { RANGOS_MASA_A1 } from '../components/aeromovil/geometriaA1';
import { MenuDisenos, aDiseno, cargarDisenoPorDefecto, deDiseno, useAutoguardado, type Diseno } from '../components/aeromovil/Disenos';
import { VistaOtros, TablaComparacion, fichaPropia } from '../components/aeromovil/Otros';
import { fichaComparable, type Referencia } from '../components/aeromovil/referencias';
import { FormularioMejora, VistaExportar, VistaPlan, VistaPlanos, VistaTareas, cargarDueno, cargarTareas, type Dueno, type Tarea } from '../components/aeromovil/Paneles';
import { BotonesComponentes, VistaComponentes } from '../components/aeromovil/Componentes';
import { VEHICULOS_GARAJE } from '../components/aeromovil/garaje';
import { DEPARTAMENTOS, type IdDepartamento } from '../components/aeromovil/departamentos';
import { PanelDepartamento, ComparacionChasis } from '../components/aeromovil/Departamentos';
import { tubosCelosia } from '../components/aeromovil/chasisCelosia';

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
  { k: 'gaviota', n: 'Alas de gaviota (Aptera)', d: 'La ventanilla con su costado y el panel lateral suben juntos, con bisagra en el canto del techo. El techo se queda en su sitio.' },
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

/** Plano del garaje visto desde arriba: nuestro coche en el centro y los otros alrededor; se arrastran con el ratón o el dedo. */
function MapaGaraje({ garaje, largo, ancho, morro, alMover, alGirar }: { garaje: { id: string; visible: boolean; x: number; z: number; giro: number }[]; largo: number; ancho: number; morro: number; alMover: (id: string, x: number, z: number) => void; alGirar: (id: string) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const R = 7;   // metros a cada lado del centro
  const esc = (v: number) => (v / R) * 50;  // → unidades SVG (viewBox de -50 a 50)
  const arrastre = useRef<{ id: string; dx: number; dz: number } | null>(null);
  const aMetros = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientY - r.top) / r.height - 0.5) * -2 * R, z: ((e.clientX - r.left) / r.width - 0.5) * -2 * R };   // arriba = delante (+x), izquierda del coche (+z) = izquierda del plano
  };
  const coches = garaje.filter(g => g.visible);
  return (
    <svg ref={ref} viewBox="-50 -50 100 100" className="aspect-square w-full touch-none rounded-lg border border-slate-200 bg-slate-50" aria-label="Plano del garaje"
      onPointerMove={e => { const a = arrastre.current; if (!a) return; const p = aMetros(e); alMover(a.id, p.x - a.dx, p.z - a.dz); }}
      onPointerUp={e => { if (arrastre.current) { (e.target as Element).releasePointerCapture?.(e.pointerId); arrastre.current = null; } }}>
      {[-5, 0, 5].map(k => <g key={k}><line x1={esc(k)} y1={-50} x2={esc(k)} y2={50} stroke="#e2e8f0" strokeWidth={0.4} /><line x1={-50} y1={esc(k)} x2={50} y2={esc(k)} stroke="#e2e8f0" strokeWidth={0.4} /></g>)}
      <rect x={esc(-ancho / 2)} y={esc(-morro)} width={esc(ancho)} height={esc(largo)} rx={3} fill="#0f766e" opacity={0.85} />
      <text x={0} y={esc(largo / 2 - morro) + 2} textAnchor="middle" fontSize={4} fill="#fff">A1</text>
      {coches.map(c => { const v = VEHICULOS_GARAJE.find(x => x.id === c.id)!; const vert = Math.abs(Math.sin(c.giro)) < 0.5; const w = vert ? v.ancho : v.largo, h = vert ? v.largo : v.ancho;
        const cx = -c.z, cy = -(c.x - (vert ? v.largo / 2 - (v.largo - v.batalla) / 2 : 0));   // el eje delantero va a (largo − batalla)/2 del morro
        return (
        <g key={c.id} className="cursor-grab" onPointerDown={e => { const p = aMetros(e); arrastre.current = { id: c.id, dx: p.x - c.x, dz: p.z - c.z }; (e.target as Element).setPointerCapture?.(e.pointerId); }} onDoubleClick={() => alGirar(c.id)}>
          <rect x={esc(cx - w / 2)} y={esc(cy - h / 2)} width={esc(w)} height={esc(h)} rx={2.5} fill="#f59e0b" opacity={0.8} />
          <text x={esc(cx)} y={esc(cy) + 1.5} textAnchor="middle" fontSize={3.4} fill="#1e293b">{v.nombre.split(' ')[0]}</text>
        </g>); })}
    </svg>
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
function LadoA1({ P, Pa, set, res, modelo, neumaticos, malas, alNavegar, dep }: {
  P: Parametros; Pa: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: Modelo;
  neumaticos: { k: Neumatico; n: string }[]; malas: number; alNavegar: (ruta: string) => void; dep: IdDepartamento;
}) {
  const a1 = res.a1!;
  const hayCelosia = useMemo(() => { try { return tubosCelosia((modelo as any).contextoChasis()).length > 0; } catch { return false; } }, [modelo]);
  const cm = (v: number) => `${Math.round(v * 100)} cm`;
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
      </Bloque>
      </>)}

      {dep === 'carroceria' && (<>
      <Bloque titulo="Carrocería y cúpula" nota={`${m2(Pa.W)} × ${m2(Pa.H)}`}>
        <Deslizador id="a1-L" etiqueta="Largo total" valor={P.L} min={2.6} max={4.4} paso={0.01} mostrar={m2(P.L)} alCambiar={v => set('L', v)} />
        <Deslizador id="a1-fm" etiqueta="Voladizo del morro" valor={P.fMorro} min={0.15} max={0.40} paso={0.005} mostrar={`${Math.round(P.fMorro * 100)} % del largo · ${m2(P.fMorro * P.L)}`} alCambiar={v => set('fMorro', v)} />
        <Deslizador id="a1-W" etiqueta="Ancho máximo" valor={P.W} min={1.2} max={2.0} paso={0.01} mostrar={m2(P.W)} alCambiar={v => set('W', v)} />
        <Deslizador id="a1-H" etiqueta="Alto total (techo de la cúpula)" valor={P.H} min={1.0} max={1.7} paso={0.01} mostrar={m2(P.H)} alCambiar={v => set('H', v)} />
        <Deslizador id="a1-deck" etiqueta="Altura de la cubierta" valor={P.deck} min={0.55} max={0.85} paso={0.005} mostrar={m2(P.deck * P.H)} alCambiar={v => set('deck', v)} />
        <p className="-mt-2 text-xs text-slate-500">La cubierta es el techo de la carrocería baja; de ahí para arriba es cúpula de cristal.</p>
        <Deslizador id="a1-mo" etiqueta="Redondez del morro" valor={P.morroA1} min={0.2} max={1} paso={0.05} mostrar={`${fmt((0.04 + 0.10 * P.morroA1 + P.posMorro) * P.L * 100, 0)} cm de punta redonda · ${P.morroA1 > 0.85 ? 'romo' : 'Aptera'}`} alCambiar={v => set('morroA1', v)} />
        <Deslizador id="a1-pm" etiqueta="Alcance de la pieza del morro" valor={P.posMorro} min={-0.03} max={0.15} paso={0.01} mostrar={`${P.posMorro >= 0 ? '+' : ''}${(P.posMorro * P.L * 100).toFixed(0)} cm`} alCambiar={v => set('posMorro', v)} />
        <Deslizador id="a1-co" etiqueta="Forma de la cola" valor={P.colaA1} min={0} max={1} paso={0.05} mostrar={P.colaA1 < 0.35 ? 'afilada' : P.colaA1 > 0.65 ? 'llena' : 'como el SZEmission'} alCambiar={v => set('colaA1', v)} />
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
          <div><div className="text-sm font-medium text-slate-800">Opción Jaguar</div><div className="text-xs text-slate-500">la carrocería envuelve las ruedas con un abombamiento redondo, como el D-Type</div></div>
          <Button variant="outline" aria-pressed={P.jaguar} onClick={() => set('jaguar', !P.jaguar)} className={cn('shrink-0 px-3 py-1.5 text-xs normal-case tracking-normal', P.jaguar && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{P.jaguar ? 'Activada' : 'Activar'}</Button>
        </div>
        {P.jaguar && (<>
          <Deslizador id="a1-jh" etiqueta="Jaguar: cuánto sobresale" valor={P.jagAlto} min={0.01} max={0.15} paso={0.005} mostrar={`${fmt(P.jagAlto * 100, 1)} cm sobre la rueda`} alCambiar={v => set('jagAlto', v)} />
          <Deslizador id="a1-jl" etiqueta="Jaguar: largo del abombamiento" valor={P.jagLargo} min={0.6} max={2.0} paso={0.05} mostrar={m2(P.jagLargo)} alCambiar={v => set('jagLargo', v)} />
          <Deslizador id="a1-ja" etiqueta="Jaguar: alcance en vertical" valor={P.jagAncho} min={0.12} max={0.5} paso={0.01} mostrar={P.jagAncho < 0.2 ? 'solo la cintura' : P.jagAncho > 0.4 ? 'hasta el hombro' : 'cintura y flanco'} alCambiar={v => set('jagAncho', v)} />
        </>)}
        <p className="-mt-2 text-xs text-slate-500">Parabrisas plano (como el VW XL1) con montantes inclinados, una ventanilla a cada lado y el panel solar en la parte plana del techo, que baja en una sola curva hasta la cola (como el Aptera).</p>
        <Deslizador id="a1-parab" etiqueta="Inclinación del parabrisas" valor={P.parabrisas} min={0.12} max={0.32} paso={0.005} mostrar={`${m2(P.parabrisas * P.L)} de largo · ${P.parabrisas < 0.17 ? 'empinado' : P.parabrisas > 0.26 ? 'muy tumbado' : 'tumbado'}`} alCambiar={v => set('parabrisas', v)} />
        <Deslizador id="a1-techo" etiqueta="Caída del techo" valor={P.techo} min={1} max={3} paso={0.05} mostrar={P.techo < 1.25 ? 'recta desde el pico' : P.techo > 2.2 ? 'alto hasta el final' : 'curva suave (Aptera)'} alCambiar={v => set('techo', v)} />
        <Deslizador id="a1-solar" etiqueta="Techo solar: dónde empieza" valor={P.inicioSolar} min={0} max={0.6} paso={0.01} mostrar={`${fmt(P.inicioSolar * 100, 0)} cm tras el parabrisas`} alCambiar={v => set('inicioSolar', v)} />
        <Deslizador id="a1-c0" etiqueta="Parabrisas: dónde empieza" valor={P.cupX0} min={0.08} max={0.35} paso={0.005} mostrar={`${m2(P.cupX0 * P.L)} del morro`} alCambiar={v => set('cupX0', v)} />
        <Deslizador id="a1-c1" etiqueta="Cúpula: dónde acaba" valor={P.cupX1} min={0.70} max={0.995} paso={0.005} mostrar={`${m2((1 - P.cupX1) * P.L)} de la cola`} alCambiar={v => set('cupX1', v)} />
        <Deslizador id="a1-cw" etiqueta="Cabina: ancho de la base" valor={P.cupW} min={0.35} max={0.75} paso={0.01} mostrar={m2(P.cupW * P.W)} alCambiar={v => set('cupW', v)} />
        <Deslizador id="a1-tw" etiqueta="Cabina: ancho del techo" valor={P.techoW} min={0.5} max={1} paso={0.01} mostrar={`${m2(P.techoW * P.cupW * P.W)} · ${P.techoW > 0.95 ? 'costados verticales' : P.techoW < 0.7 ? 'muy inclinados' : 'inclinados (XL1)'}`} alCambiar={v => set('techoW', v)} />
        <Deslizador id="a1-nU" etiqueta="Sección superior de la carrocería" valor={P.nU} min={2.0} max={3.4} paso={0.1} mostrar={P.nU < 2.3 ? 'elíptica' : P.nU > 2.9 ? 'cuadrada' : 'redondeada'} alCambiar={v => set('nU', v)} />
        <Deslizador id="a1-nL" etiqueta="Fondo" valor={P.nL} min={2.0} max={5.0} paso={0.1} mostrar={P.nL < 2.6 ? 'redondo' : P.nL > 3.6 ? 'plano' : 'semiplano'} alCambiar={v => set('nL', v)} />
      </Bloque>
      <Bloque titulo="Material y espesores">
        <Selector id="a1-matK" etiqueta="Material de la carrocería" valor={P.matCarenado} opciones={(Object.keys(MATERIALES_CARENADO) as MaterialCarenado[]).map(k => ({ k, n: MATERIALES_CARENADO[k].n }))} alCambiar={v => set('matCarenado', v)} />
        <Deslizador id="a1-eK" etiqueta="Espesor de la carrocería" valor={P.espCarenado} min={RANGOS_MASA_A1.espCarenado[0]} max={RANGOS_MASA_A1.espCarenado[1]} paso={0.1} mostrar={`${fmt(P.espCarenado, 1)} mm`} alCambiar={v => set('espCarenado', v)} />
        <Deslizador id="a1-eV" etiqueta="Espesor de la cúpula (policarbonato)" valor={P.espCristal} min={RANGOS_MASA_A1.espCristal[0]} max={RANGOS_MASA_A1.espCristal[1]} paso={0.5} mostrar={`${fmt(P.espCristal, 1)} mm`} alCambiar={v => set('espCristal', v)} />
      </Bloque>
      </>)}

      {dep === 'chasis' && (<>
      <Bloque titulo="Chasis" nota={P.chasis === 'celosia' ? 'versión 2 · celosía' : 'versión 1 · largueros'}>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Versión del chasis">
          {([['largueros', 'Versión 1', 'largueros y travesaños'], ['celosia', 'Versión 2', 'celosía triangulada (Caterham)']] as ['largueros' | 'celosia', string, string][]).map(([k, n, d]) => (
            <Button key={k} variant="outline" role="radio" aria-checked={P.chasis === k} disabled={k === 'celosia' && !hayCelosia} title={k === 'celosia' && !hayCelosia ? 'La está diseñando un bot' : undefined} onClick={() => set('chasis', k)}
              className={cn('flex-1 flex-col items-start gap-0 px-3 py-1.5 text-left normal-case tracking-normal', P.chasis === k && 'border-teal-700 bg-teal-50 ring-1 ring-teal-700')}>
              <span className="text-xs font-semibold">{n}</span><span className="text-[11px] font-normal text-slate-500">{d}</span>
            </Button>
          ))}
        </div>
        <ComparacionChasis modelo={modelo} />
        <Deslizador id="a1-cl" etiqueta="Altura de los bajos" valor={P.clear} min={0.10} max={0.30} paso={0.005} mostrar={`${fmt(P.clear * 100, 1)} cm al suelo`} alCambiar={v => set('clear', v)} />
        <p className="-mt-2 text-xs text-slate-500">Sube y baja todo el interior: suelo, batería, asiento y piloto. El Twizy lleva 12 cm.</p>
        <Selector id="a1-sd" etiqueta="Largueros Ø" valor={String(P.spineD)} opciones={['32', '40', '50', '60'].map(k => ({ k, n: `${k} mm` }))} alCambiar={v => set('spineD', Number(v))} />
        <Selector id="a1-st" etiqueta="Pared de los largueros" valor={String(P.spineT)} opciones={['1.5', '2', '2.5', '3'].map(k => ({ k, n: `${k.replace('.', ',')} mm` }))} alCambiar={v => set('spineT', Number(v))} />
        <Selector id="a1-matC" etiqueta="Material del chasis" valor={P.matChasis} opciones={(Object.keys(MATERIALES_CHASIS) as MaterialChasis[]).map(k => ({ k, n: MATERIALES_CHASIS[k].n }))} alCambiar={v => set('matChasis', v)} />
        <Deslizador id="a1-xC" etiqueta="Uniones, chapas y tornillería" valor={P.extraChasis} min={RANGOS_MASA_A1.extraChasis[0]} max={RANGOS_MASA_A1.extraChasis[1]} paso={0.5} mostrar={`${fmt(P.extraChasis, 1)} kg`} alCambiar={v => set('extraChasis', v)} />
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
      <Bloque titulo="Ejes, ruedas y suspensión" nota="clase Twizy">
        <Deslizador id="a1-B" etiqueta="Batalla: eje delantero a trasero" valor={P.B} min={1.3} max={Math.min(2.6, P.L - 0.9)} paso={0.01} mostrar={m2(P.B)} alCambiar={v => set('B', v)} />
        <Deslizador id="a1-vF" etiqueta="Vía delantera" valor={P.viaF} min={0.9} max={1.5} paso={0.01} mostrar={m2(P.viaF)} alCambiar={v => set('viaF', v)} />
        <Deslizador id="a1-vR" etiqueta="Vía trasera" valor={P.viaR} min={0.8} max={1.5} paso={0.01} mostrar={m2(P.viaR)} alCambiar={v => set('viaR', v)} />
        <Selector id="a1-nF" etiqueta="Neumáticos delanteros" valor={P.neumF} opciones={neumaticos} alCambiar={v => set('neumF', v)} />
        <Selector id="a1-nR" etiqueta="Neumáticos traseros" valor={P.neumR} opciones={neumaticos} alCambiar={v => set('neumR', v)} />
        <Deslizador id="a1-comp" etiqueta="Compresión de la suspensión" valor={P.comp} min={0} max={1} paso={0.05} mostrar={`${Math.round(P.comp * 100)} %`} alCambiar={v => set('comp', v)} />
        <Deslizador id="a1-mR" etiqueta="Una rueda con neumático" valor={P.mRueda} min={RANGOS_MASA_A1.mRueda[0]} max={RANGOS_MASA_A1.mRueda[1]} paso={0.1} mostrar={`${fmt(P.mRueda, 1)} kg`} alCambiar={v => set('mRueda', v)} />
        <Deslizador id="a1-mS" etiqueta="Cuatro McPherson con manguetas" valor={P.mSuspension} min={RANGOS_MASA_A1.mSuspension[0]} max={RANGOS_MASA_A1.mSuspension[1]} paso={0.5} mostrar={`${fmt(P.mSuspension, 1)} kg`} alCambiar={v => set('mSuspension', v)} />
        <Deslizador id="a1-mF" etiqueta="Un freno de disco con pinza" valor={P.mFrenos} min={RANGOS_MASA_A1.mFrenos[0]} max={RANGOS_MASA_A1.mFrenos[1]} paso={0.1} mostrar={`${fmt(P.mFrenos, 1)} kg`} alCambiar={v => set('mFrenos', v)} />
        <Deslizador id="a1-mD" etiqueta="Dirección completa" valor={P.mDireccion} min={RANGOS_MASA_A1.mDireccion[0]} max={RANGOS_MASA_A1.mDireccion[1]} paso={0.5} mostrar={`${fmt(P.mDireccion, 1)} kg`} alCambiar={v => set('mDireccion', v)} />
      </Bloque>
      </>)}

      {dep === 'propulsion' && (<>
      <Bloque titulo="Motor y transmisión" nota={`${P.kWNom}/${P.kWPico} kW`}>
        <Deslizador id="a1-kn" etiqueta="Potencia nominal" valor={P.kWNom} min={4} max={40} paso={0.5} mostrar={`${fmt(P.kWNom, 1)} kW`} alCambiar={v => set('kWNom', v)} />
        <Deslizador id="a1-kp" etiqueta="Potencia máxima" valor={P.kWPico} min={P.kWNom} max={80} paso={0.5} mostrar={`${fmt(P.kWPico, 1)} kW`} alCambiar={v => set('kWPico', v)} />
        <Deslizador id="a1-v" etiqueta="Velocidad de cálculo" valor={P.speed} min={30} max={160} paso={5} mostrar={`${P.speed} km/h`} alCambiar={v => set('speed', v)} />
        <Deslizador id="a1-mM" etiqueta="Motor" valor={P.mMotor} min={RANGOS_MASA_A1.mMotor[0]} max={RANGOS_MASA_A1.mMotor[1]} paso={0.5} mostrar={`${fmt(P.mMotor, 1)} kg`} alCambiar={v => set('mMotor', v)} />
        <Deslizador id="a1-mI" etiqueta="Inversor" valor={P.mInversor} min={RANGOS_MASA_A1.mInversor[0]} max={RANGOS_MASA_A1.mInversor[1]} paso={0.5} mostrar={`${fmt(P.mInversor, 1)} kg`} alCambiar={v => set('mInversor', v)} />
        <Deslizador id="a1-mRe" etiqueta="Reductora con diferencial" valor={P.mReductora} min={RANGOS_MASA_A1.mReductora[0]} max={RANGOS_MASA_A1.mReductora[1]} paso={0.5} mostrar={`${fmt(P.mReductora, 1)} kg`} alCambiar={v => set('mReductora', v)} />
      </Bloque>
      </>)}

      {dep === 'energia' && (<>
      <Bloque titulo="Batería y energía solar" nota={`${a1.bateriaKg.toFixed(0)} kg · ${a1.bateriaL.toFixed(0)} L`}>
        <Deslizador id="a1-kwh" etiqueta="Batería" valor={P.kWh} min={5} max={45} paso={0.5} mostrar={`${fmt(P.kWh, 1)} kWh`} alCambiar={v => set('kWh', v)} />
        <Deslizador id="a1-wkg" etiqueta="Densidad del paquete (masa)" valor={P.whKg} min={100} max={220} paso={5} mostrar={`${P.whKg} Wh/kg`} alCambiar={v => set('whKg', v)} />
        <Deslizador id="a1-wl" etiqueta="Densidad del paquete (volumen)" valor={P.whL} min={120} max={320} paso={5} mostrar={`${P.whL} Wh/L`} alCambiar={v => set('whL', v)} />
        <p className="-mt-2 text-xs text-slate-500">Celdas NMC en paquete: 150-180 Wh/kg y 200-250 Wh/L. LFP: 110-130 Wh/kg. El Twizy lleva 6,1 kWh en 100 kg.</p>
        <Deslizador id="a1-altBat" etiqueta="Altura de la batería" valor={P.altBat} min={-0.06} max={0.10} paso={0.005} mostrar={Math.abs(P.altBat) < 0.003 ? 'sobre el suelo del chasis' : P.altBat < 0 ? `${fmt(-P.altBat * 100, 1)} cm bajo el suelo` : `${fmt(P.altBat * 100, 1)} cm sobre el suelo`} alCambiar={v => set('altBat', v)} />
        <Deslizador id="a1-sol" etiqueta="Sol al día (horas pico)" valor={P.sol} min={1.5} max={7} paso={0.1} mostrar={`${fmt(P.sol, 1)} h`} alCambiar={v => set('sol', v)} />
        <Deslizador id="a1-mP" etiqueta="Paneles solares por m²" valor={P.mSolarM2} min={RANGOS_MASA_A1.mSolarM2[0]} max={RANGOS_MASA_A1.mSolarM2[1]} paso={0.1} mostrar={`${fmt(P.mSolarM2, 1)} kg/m²`} alCambiar={v => set('mSolarM2', v)} />
      </Bloque>
      </>)}

      {dep === 'interior' && (<>
      <Bloque titulo="Plazas y asientos">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Plazas">
          {([[1, 'Monoplaza'], [2, 'Tándem 1+1']] as [1 | 2, string][]).map(([k, n]) => (
            <Button key={k} variant="outline" role="radio" aria-checked={P.plazas === k} onClick={() => set('plazas', k)}
              className={cn('flex-1 px-3 py-1.5 text-xs normal-case tracking-normal', P.plazas === k && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
          ))}
        </div>
        <Deslizador id="a1-xPil" etiqueta="Piloto: cadera al eje delantero" valor={P.xPil} min={0.10} max={1.30} paso={0.01} mostrar={m2(P.xPil)} alCambiar={v => set('xPil', v)} />
        <Deslizador id="a1-recPil" etiqueta="Reclinado del piloto" valor={P.recPil} min={15} max={60} paso={1} mostrar={`${P.recPil}°`} alCambiar={v => set('recPil', v)} />
        <Deslizador id="a1-altPil" etiqueta="Altura del asiento del piloto" valor={P.altPil} min={0.06} max={0.30} paso={0.005} mostrar={`${fmt(P.altPil * 100, 1)} cm sobre la batería`} alCambiar={v => set('altPil', v)} />
        {P.plazas === 2 && <>
          <Deslizador id="a1-xPas" etiqueta="Pasajero: cadera al eje delantero" valor={P.xPas} min={P.xPil + 0.60} max={P.xPil + 1.20} paso={0.01} mostrar={m2(P.xPas)} alCambiar={v => set('xPas', v)} />
          <Deslizador id="a1-recPas" etiqueta="Reclinado del pasajero" valor={P.recPas} min={15} max={85} paso={1} mostrar={`${P.recPas}°`} alCambiar={v => set('recPas', v)} />
          <Deslizador id="a1-volAlt" etiqueta="Volante: altura" valor={P.volAlt} min={-0.10} max={0.12} paso={0.01} mostrar={`${P.volAlt >= 0 ? '+' : ''}${fmt(P.volAlt * 100, 0)} cm`} alCambiar={v => set('volAlt', v)} />
          <Deslizador id="a1-volDist" etiqueta="Volante: distancia al piloto" valor={P.volDist} min={-0.12} max={0.15} paso={0.01} mostrar={`${P.volDist >= 0 ? '+' : ''}${fmt(P.volDist * 100, 0)} cm`} alCambiar={v => set('volDist', v)} />
          <Deslizador id="a1-pedDist" etiqueta="Pedales: distancia al piloto" valor={P.pedDist} min={-0.15} max={0.15} paso={0.01} mostrar={`${P.pedDist >= 0 ? '+' : ''}${fmt(P.pedDist * 100, 0)} cm`} alCambiar={v => set('pedDist', v)} />
          <Deslizador id="a1-pedAlt" etiqueta="Pedales: altura" valor={P.pedAlt} min={-0.08} max={0.12} paso={0.01} mostrar={`${P.pedAlt >= 0 ? '+' : ''}${fmt(P.pedAlt * 100, 0)} cm`} alCambiar={v => set('pedAlt', v)} />
          <Deslizador id="a1-altPas" etiqueta="Altura del asiento del pasajero" valor={P.altPas} min={0.06} max={0.30} paso={0.005} mostrar={`${fmt(P.altPas * 100, 1)} cm sobre la batería`} alCambiar={v => set('altPas', v)} />
        </>}
        <p className="text-xs text-slate-500">Sin pedales: los pies van en un reposapiés y las manos en un volante pequeño. Los asientos apoyan sobre los módulos de batería (9 cm, pegados al suelo del chasis); el pasajero va tumbado tipo Fórmula 1 con las piernas a los lados del asiento del piloto. Respaldo curvo y reposacabezas casi vertical: la cabeza va recta aunque el tronco vaya tumbado. La altura del vehículo sobre el suelo es «Altura de los bajos», en «Tamaño y ruedas».</p>
            <Deslizador id="a1-mOcc" etiqueta="Masa por ocupante" valor={P.mOcc} min={50} max={110} paso={1} mostrar={`${P.mOcc} kg`} alCambiar={v => set('mOcc', v)} />
        <Deslizador id="a1-mA" etiqueta="Un asiento" valor={P.mAsiento} min={RANGOS_MASA_A1.mAsiento[0]} max={RANGOS_MASA_A1.mAsiento[1]} paso={0.5} mostrar={`${fmt(P.mAsiento, 1)} kg`} alCambiar={v => set('mAsiento', v)} />
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
      <Bloque titulo="Varios" nota="lo que no tiene ficha propia">
        <Deslizador id="a1-mV" etiqueta="Varios: cables, cargador, luces, cierres" valor={P.mVarios} min={RANGOS_MASA_A1.mVarios[0]} max={RANGOS_MASA_A1.mVarios[1]} paso={1} mostrar={`${fmt(P.mVarios, 0)} kg`} alCambiar={v => set('mVarios', v)} />
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

const NOMBRE_CORTO: Record<IdDepartamento, string> = { proyecto: 'Proyecto', carroceria: 'Carrocería', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Energía', interior: 'Interior', accesos: 'Accesos', luces: 'Luces', fabricacion: 'Fabricación', homologacion: 'Homologación' };

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
  // Quien llega por primera vez (sin nada guardado en este navegador) abre el
  // diseño por defecto de la web, si hay uno (2026-11-06, Eugenio).
  useEffect(() => {
    let hayAlgo = false; try { hayAlgo = !!localStorage.getItem(CLAVE) || !!localStorage.getItem('aeromovil.diseno'); } catch { /* sin almacenamiento */ }
    if (hayAlgo || new URLSearchParams(loc.search).get('diseno')) return;
    cargarDisenoPorDefecto().then(d => { if (d) abrirDiseno(d); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const NOMBRE_VISTA: Record<Vista, string> = { iso: 'tres cuartos delantera', side: 'lateral', top: 'planta (desde arriba)', front: 'frontal', back: 'trasera' };
  const crearRender = async () => {
    if (!visor.current || render.estado === 'creando') return;
    if (!dueno?.sesion) { setRender({ estado: 'error', error: 'Inicia sesión para crear un render: cada imagen cuesta dinero y por eso solo se hace con sesión.', vista }); return; }
    setRender({ estado: 'creando', vista });
    try {
      const captura = await visor.current.capturar();
      const descripcion = esA1
        ? `cuatro ruedas totalmente carenadas, cúpula con parabrisas plano y pilares inclinados, una ventanilla a cada lado, techo plano cubierto de paneles solares que desciende hasta la cola, ${P.plazas === 2 ? 'piloto y pasajero en tándem' : 'monoplaza'}, puertas de ala de gaviota, unos ${P.L.toFixed(1)} m de largo`
        : 'velomóvil triciclo con carrocería en forma de gota, cúpula transparente, pedaleo asistido, unos 3 m de largo';
      const q = new URLSearchParams({ vista: NOMBRE_VISTA[vista], descripcion });
      const r = await fetch(`/api/aeromovil/render?${q}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/octet-stream' }, body: captura });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.imagen) throw new Error(j.error || `No se ha podido crear el render (${r.status}).`);
      setRender({ estado: 'listo', imagen: j.imagen, vista });
    } catch (e: any) {
      setRender({ estado: 'error', error: e?.message || 'No se ha podido crear el render.', vista });
    }
  };
  const porDefecto = JSON.stringify(aDiseno(Pa)) === JSON.stringify(aDiseno(PARAMETROS_POR_DEFECTO));
  // Cambiar de vehículo carga su juego de medidas: los dos no comparten deslizadores.
  const cambiarVehiculo = (k: Disposicion) => { if (k !== P.disposicion) { setP(k === 'cuatro' ? PARAMETROS_A1 : PARAMETROS_GOTA); setActual(null); } };

  const [visibles, setVisibles] = useState<Record<CapaId, boolean>>(() => Object.fromEntries(CAPAS.map(c => [c.k, true])) as Record<CapaId, boolean>);
  const [rayosX, setRayosX] = useState(false);
  const [corte, setCorte] = useState(false);
  const [curva, setCurva] = useState(false);
  const [verCotas, setVerCotas] = useState(false);   // apagadas al cargar (2026-11-06, Eugenio)
  const [abierta, setAbierta] = useState(false);
  const [maleteros, setMaleteros] = useState(false);
  const [sinPasajero, setSinPasajero] = useState(false);
  // Departamento abierto en el lateral y en el panel de abajo (2026-11-06, Eugenio: «el menú dividido por departamentos como una empresa de fabricación»).
  const [dep, setDep] = useState<IdDepartamento>(() => { try { return (localStorage.getItem('aeromovil.departamento') as IdDepartamento) || 'carroceria'; } catch { return 'carroceria'; } });
  useEffect(() => { try { localStorage.setItem('aeromovil.departamento', dep); } catch { /* sin memoria */ } }, [dep]);
  // El garaje: qué vehículos se ven y dónde están (eje delantero en el suelo, m). Se recuerda en este navegador.
  type PlazaGaraje = { id: string; visible: boolean; x: number; z: number; giro: number };
  const [garaje, setGaraje] = useState<PlazaGaraje[]>(() => {
    const base = VEHICULOS_GARAJE.map((v, i) => ({ id: v.id, visible: false, x: 0, z: (i % 2 ? 1 : -1) * (2.6 + 2.2 * Math.floor(i / 2)), giro: 0 }));
    try { const g = JSON.parse(localStorage.getItem('aeromovil_garaje') || 'null'); if (Array.isArray(g)) return base.map(b => ({ ...b, ...(g.find((x: any) => x?.id === b.id) || {}) })); } catch { /* sin memoria */ }
    return base;
  });
  useEffect(() => { try { localStorage.setItem('aeromovil_garaje', JSON.stringify(garaje)); } catch { /* sin memoria */ } }, [garaje]);
  // `?garaje=xl1`: mirar un modelo del garaje a solas, en el origen (para comprobarlo mientras se modela).
  const soloGaraje = useMemo(() => new URLSearchParams(window.location.search).get('garaje'), []);
  const garajeVisor = useMemo(() => soloGaraje ? [{ id: soloGaraje, x: 0, z: 0, giro: 0 }] : garaje.filter(v => v.visible).map(v => ({ id: v.id, x: v.x, z: v.z, giro: v.giro })), [garaje, soloGaraje]);
  const [vista, setVista] = useState<Vista>('iso');
  // Render fotorrealista de la vista actual: la captura del visor pasa por la IA y vuelve como foto
  const [render, setRender] = useState<{ estado: 'nada' | 'creando' | 'listo' | 'error'; imagen?: string; error?: string; vista?: Vista }>({ estado: 'nada' });
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
            alNuevo={() => { setP(PARAMETROS_POR_DEFECTO); setActual(null); cargarDisenoPorDefecto().then(d => { if (d) { setP(deDiseno(d.parametros || {})); setActual(null); } }); }}
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
        <div className="min-w-0">
        <section className={cn('relative h-[62vh] min-h-[380px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50', esA1 ? 'lg:h-[72vh]' : 'lg:sticky lg:top-[68px] lg:h-[calc(100vh-88px)]')} aria-label="Vista 3D">
          <Visor3D ref={visor} modelo={modelo} visibles={visibles} rayosX={rayosX} corte={corte} curva={curva} cotas={verCotas} abierta={abierta} maleteros={maleteros} sinPasajero={sinPasajero} garaje={garajeVisor} soloGaraje={!!soloGaraje} vista={vista}
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
            {esA1 && P.plazas === 2 && (
              <Button variant="outline" aria-pressed={sinPasajero} onClick={() => { setSinPasajero(!sinPasajero); if (!sinPasajero) setVerCotas(true); }}
                title="Quita al pasajero y su asiento y acota el espacio que queda detrás: maletero o cama"
                className={cn('bg-white px-3 py-1.5 text-xs normal-case tracking-normal', sinPasajero && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                {sinPasajero ? 'Con pasajero' : 'Sin pasajero'}
              </Button>
            )}
            <Button variant="outline" onClick={crearRender} disabled={render.estado === 'creando'}
              title="Una fotografía realista de la vista que estás viendo, como si el vehículo ya estuviera fabricado"
              className="ml-auto border-amber-500 bg-amber-500 px-3 py-1.5 text-xs normal-case tracking-normal text-white hover:bg-amber-600">
              <Camera className="mr-1 h-3.5 w-3.5" />{render.estado === 'creando' ? 'Creando render…' : 'Crear render'}
            </Button>
          </div>
          {render.estado !== 'nada' && (
            <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/85 p-3 text-white" role="dialog" aria-label="Render fotorrealista">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider">Render · vista {render.vista ? NOMBRE_VISTA[render.vista] : ''}</span>
                {render.estado === 'listo' && render.imagen && (
                  <a href={render.imagen} download={`${nombreVehiculo.replace(/\s+/g, '_')}_render_${render.vista}.png`}
                    className="ml-auto inline-flex items-center rounded-md bg-white/15 px-2.5 py-1 text-xs hover:bg-white/25"><Download className="mr-1 h-3.5 w-3.5" />Descargar</a>
                )}
                <Button variant="ghost" onClick={() => setRender({ estado: 'nada' })} aria-label="Cerrar" className={cn('px-2 py-1 text-white hover:bg-white/15', render.estado !== 'listo' && 'ml-auto')}><X className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 flex min-h-0 flex-1 items-center justify-center">
                {render.estado === 'creando' && <p className="animate-pulse text-sm">Creando la fotografía… suele tardar entre 10 y 30 segundos.</p>}
                {render.estado === 'error' && <p className="max-w-md text-center text-sm text-amber-200">{render.error}</p>}
                {render.estado === 'listo' && render.imagen && <img src={render.imagen} alt={`Render fotorrealista, vista ${render.vista}`} className="max-h-full max-w-full rounded-lg object-contain shadow-xl" />}
              </div>
            </div>
          )}
        </section>
        {esA1 && <PanelDepartamento d={DEPARTAMENTOS.find(x => x.id === dep)!} />}
        </div>

        <aside className="mt-4 flex flex-col gap-3 lg:mt-0">
          {esA1 && (
            <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2" aria-label="Departamentos">
              {DEPARTAMENTOS.map(d => (
                <Button key={d.id} variant="ghost" aria-pressed={dep === d.id} onClick={() => setDep(d.id)} title={d.lema}
                  className={cn('px-2 py-1 text-[11px] normal-case tracking-normal', dep === d.id ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-600')}>
                  {NOMBRE_CORTO[d.id]}
                </Button>
              ))}
            </nav>
          )}
          {(!esA1 || dep === 'proyecto') && <Bloque titulo="Vehículo">
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Tipo de vehículo">
              {VEHICULOS.map(o => (
                <Button key={o.k} variant="outline" role="radio" aria-checked={P.disposicion === o.k} onClick={() => cambiarVehiculo(o.k)}
                  className={cn('flex-col items-start gap-0.5 px-3 py-2 text-left normal-case tracking-normal', P.disposicion === o.k && 'border-teal-700 bg-teal-50 ring-1 ring-teal-700')}>
                  <span className="text-sm font-semibold text-slate-900">{o.n}</span>
                  <span className="text-xs font-normal text-slate-600">{o.d}</span>
                </Button>
              ))}
            </div>
          </Bloque>}
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

          {(!esA1 || dep === 'proyecto') && <Bloque titulo="Garaje" nota="otros vehículos al lado">
            <div className="flex flex-col gap-1.5">
              {VEHICULOS_GARAJE.map(v => { const pl = garaje.find(g => g.id === v.id)!; return (
                <Button key={v.id} variant="outline" aria-pressed={pl.visible} onClick={() => setGaraje(g => g.map(x => x.id === v.id ? { ...x, visible: !x.visible } : x))}
                  className={cn('justify-between gap-2 px-2.5 py-1.5 text-left text-[13px] font-medium normal-case tracking-normal', !pl.visible && 'border-dashed text-slate-400')}>
                  <span>{v.nombre}</span><span className="text-[11px] font-normal text-slate-400">{v.largo.toFixed(2).replace('.', ',')} m</span>
                </Button>); })}
            </div>
            {garaje.some(g => g.visible) && <MapaGaraje garaje={garaje} largo={P.L} ancho={P.W} morro={modelo.xn} alMover={(id, x, z) => setGaraje(g => g.map(v => v.id === id ? { ...v, x, z } : v))} alGirar={id => setGaraje(g => g.map(v => v.id === id ? { ...v, giro: (v.giro + Math.PI / 2) % (2 * Math.PI) } : v))} />}
            <p className="-mt-1 text-xs text-slate-500">Arrastra cada coche en el plano para acercarlo o apartarlo; doble clic lo gira un cuarto de vuelta. Los modelos los va haciendo un bot, uno a uno.</p>
          </Bloque>}

          {esA1 ? <LadoA1 P={P} Pa={Pa} set={set} res={res} modelo={modelo} neumaticos={neumaticos} malas={malas} dep={dep} alNavegar={r => { navegar(r); window.scrollTo({ top: 0 }); }} /> : (<>
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
