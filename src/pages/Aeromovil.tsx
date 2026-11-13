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
//   /aeromovil/aranceles   (solo Aeromóvil 1) derechos de aduana de las piezas
//                         compradas en China, IVA aparte, y el vehículo entero
//
// Todo el cálculo vive en `src/components/aeromovil/geometria.ts`, que es la
// misma geometría que el script CadQuery de `public/aeromovil/`.
import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Armchair, BatteryCharging, Box, Car, Warehouse, Camera, ChevronDown, CircleDot, ClipboardList, Factory, Frame, Layers3, Lightbulb, ShieldCheck, Zap, GitCompare, X, DoorOpen, Download, Gauge, Layers, ListChecks, Map as MapIcon, Maximize2, Minimize2, Ruler, RotateCcw, Package, Ship, Wrench, Wind } from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { Visor3D, CAPAS, type CapaId, type Vista, type VisorHandle } from '../components/aeromovil/Visor3D';
import {
  PARAMETROS_POR_DEFECTO, PARAMETROS_A1, PARAMETROS_GOTA, PARAMETROS_BALA, PARAMETROS_TRICICLO, BALA_DEFECTO, DIAMETRO_RUEDA, NEUMATICOS, MATERIALES_CARENADO, MATERIALES_CHASIS, RANGOS_MASA, ajustarCarenado, areas, calcular, crearModelo,
  type Comprobacion, type Disposicion, type MaterialCarenado, type MaterialChasis, type Modelo, type ModeloBala, type ModeloTriciclo, type Neumatico, type Parametros, type Puerta, type Pulgadas, type Resultados,
} from '../components/aeromovil/geometria';
import {
  ALTO_FILAS, ANCHO_FILAS, AGARRE, AUXILIARES, CRR, DEPS_TRICICLO, EQUIPAJE, RENDIMIENTO, RUEDAS_TRICICLO, SELECTORES_TRICICLO, USABLE, VUELCO_OBJETIVO, bateriaChasis, camposTriciclo, cargasRueda, conButacas, conSalpicadero, grupoPieza, largueroAlEje, masaButaca, conPortonAptera, conPuertas, deslizadoresTriciclo, energiaTriciclo, esCuatro, estirarTriciclo, guardarTriciclo, largoTriciclo, lemasTriciclo, limitarTriciclo, nombreTriciclo, vistaTriciclo,
  type DepTriciclo, type FichaTriciclo,
} from '../components/aeromovil/geometriaTriciclo';
import { cuerpoTriciclo, peticionDe as peticionTunel } from '../components/aeromovil/tunel/nuestro';
import { claveTunel } from '../components/aeromovil/tunel/calculo';
import { pedirTunel, resultadoEnCache } from '../components/aeromovil/tunel/cliente';
import type { Resolucion } from '../components/aeromovil/tunel/malla';
import { BLOQUES_BALA, DESLIZADORES_BALA, INCLINACION, RUEDAS_DT_BALA, RUEDAS_LAT_BALA, TALLA_SENTADO, camposBala, rangoBala, type BloqueBala, type FichaBala } from '../components/aeromovil/geometriaBala';
import { RANGOS_MASA_A1 } from '../components/aeromovil/geometriaA1';
import { ColoresCarroceria } from '../components/aeromovil/ColorCarroceria';
import { CLAVES_COLOR, coloresDe } from '../components/aeromovil/coloresCarroceria';
import { MenuDisenos, aDiseno, cargarDisenoPorDefecto, deDiseno, useAutoguardado, type Diseno } from '../components/aeromovil/Disenos';
import { TablaComparacion, fichaPropia } from '../components/aeromovil/Otros';
import { fichaComparable, type Referencia } from '../components/aeromovil/referencias';
import { FormularioMejora, VistaExportar, VistaPlan, VistaPlanos, VistaTareas, cargarDueno, cargarTareas, type Dueno, type Tarea } from '../components/aeromovil/Paneles';
import { BotonesComponentes, VistaComponentes } from '../components/aeromovil/Componentes';
import { VEHICULOS_GARAJE } from '../components/aeromovil/garaje';
import { useDisenosGaraje } from '../components/aeromovil/GarajeDisenos';
import { AvisoCambios, BotonSoloReferencia, ListaGaraje, TarjetaDiseno, useEleccionDiseno } from '../components/aeromovil/garaje/NavegadorGaraje';
import { HUECO_CON_TUNEL } from '../components/aeromovil/garaje/filas';
import { TarjetaTunel, gastoEnRuedas, VELOCIDADES, type FilaTunel } from '../components/aeromovil/TarjetaTunel';
import { cuerpoAeromovil, cuerpoGaraje, type CuerpoTunel } from '../components/aeromovil/tunel/cuerpos';
import { opcionesPorDefecto, useResultadosTunel, type OpcionesTunel } from '../components/aeromovil/tunel/cliente';
import { PanelPunto, type SeleccionPunto } from '../components/aeromovil/tunel/PanelPunto';
import { TarjetaSuperponer, type Alineacion } from '../components/aeromovil/TarjetaSuperponer';
import { colorCss } from '../components/aeromovil/garaje/superponer';
import { DEPARTAMENTOS, type IdDepartamento } from '../components/aeromovil/departamentos';
import { PanelDepartamento, ComparacionChasis } from '../components/aeromovil/Departamentos';
import { VistaAranceles } from '../components/aeromovil/Aranceles';
import { tubosCelosia } from '../components/aeromovil/chasisCelosia';
import { explicacion } from '../components/aeromovil/explicaciones';

// v5 (2026-11-06): el diseño por defecto pasa a ser el Aeromóvil 1; lo guardado como v4 era del Gota y se queda en su clave.
const CLAVE = 'aeromovil.parametros.v5';
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const m2 = (v: number) => `${fmt(v)} m`;

type Seccion = 'diseno' | 'componentes' | 'aranceles' | 'tareas' | 'plan' | 'planos' | 'exportar';
const SECCIONES: { k: Seccion; n: string; ruta: string; icono: typeof Box }[] = [
  { k: 'diseno', n: 'Diseño 3D', ruta: '/aeromovil', icono: Box },
  { k: 'componentes', n: 'Componentes', ruta: '/aeromovil/componentes', icono: Wrench },
  { k: 'aranceles', n: 'Aranceles', ruta: '/aeromovil/aranceles', icono: Ship },
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
/** Las capas que tienen algo en el Bala (no lleva paneles solares, motor ni baterías dibujados). */
const CAPAS_BALA: CapaId[] = ['carenado', 'cristales', 'chasis', 'suspension', 'ruedas', 'asientos', 'ocupantes'];
/** Las del Triciclo: las del Bala más la dirección, el motor y la batería (sin transmisión: el motor va en el buje; el techo solar va con la cúpula, en «Cristales»). */
const CAPAS_TRICICLO: CapaId[] = ['carenado', 'cristales', 'chasis', 'suspension', 'direccion', 'ruedas', 'asientos', 'ocupantes', 'motor', 'baterias'];


/**
 * Deslizador compacto (2026-11-07, Eugenio: «más compacto para que quepan más
 * parámetros en menos espacio»). Con `centro` (el valor del diseño por
 * defecto), el recorrido se recoloca para que ese valor quede en el punto
 * medio: así se ve de un vistazo si un parámetro se ha movido y hacia dónde.
 * El recorrido conserva su anchura mientras cabe dentro de los límites
 * físicos; si no cabe, se estrecha de forma simétrica (y nunca por debajo de
 * un tercio).
 */
/**
 * El cuadro que se abre al pinchar en el nombre de un parámetro (2026-11-07,
 * Eugenio): qué es, por qué importa, y qué se gana y se pierde subiéndolo o
 * bajándolo. El texto viene de `explicaciones/` (lo escriben bots).
 */
function Explicacion({ clave, alCerrar }: { clave: keyof Parametros; alCerrar: () => void }) {
  const e = explicacion(clave);
  return (
    <div className="col-span-2 mt-1 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5 text-[12.5px] text-slate-700">
      {!e ? <p className="text-slate-500">La explicación de este parámetro la está escribiendo un bot; en cuanto termine aparecerá aquí.</p> : (<>
        <p className="leading-relaxed"><span className="font-semibold text-slate-900">{e.nombre}.</span> {e.queEs}</p>
        <p className="mt-1.5 leading-relaxed">{e.porQueImporta}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([['Más alto', e.masAlto], ['Más bajo', e.masBajo]] as const).map(([t, m]) => (
            <div key={t} className="rounded-md border border-slate-200 bg-white p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t}</div>
              <ul className="mt-1 space-y-0.5">{m.ventajas.map((v, i) => <li key={'v' + i} className="text-emerald-800">+ {v}</li>)}{m.desventajas.map((v, i) => <li key={'d' + i} className="text-red-800">− {v}</li>)}</ul>
            </div>
          ))}
        </div>
        {e.referencias.length > 0 && <p className="mt-2 text-[11.5px] text-slate-600"><span className="font-semibold">Referencias:</span> {e.referencias.join(' · ')}</p>}
        {e.comprobaciones?.length ? <p className="mt-1 text-[11.5px] text-slate-600"><span className="font-semibold">Comprobaciones que se resienten:</span> {e.comprobaciones.join(' · ')}</p> : null}
      </>)}
      <div className="mt-1.5 text-right"><button type="button" onClick={alCerrar} className="text-[11px] text-teal-800 hover:underline">cerrar</button></div>
    </div>
  );
}

/**
 * Deslizador (2026-11-07, Eugenio: «no tan compactos» y «al pinchar en el
 * nombre que se abra un cuadro que explique el parámetro»). Con `centro` (el
 * valor del diseño por defecto), el recorrido se recoloca para que ese valor
 * quede en el punto medio: así se ve de un vistazo si un parámetro se ha
 * movido y hacia dónde. El recorrido conserva su anchura mientras cabe dentro
 * de los límites físicos; si no cabe, se estrecha de forma simétrica (nunca
 * por debajo de un tercio).
 */
function Deslizador({ id, etiqueta, valor, min, max, paso, mostrar, alCambiar, desactivado, centro, clave }: {
  id: string; etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string; alCambiar: (v: number) => void; desactivado?: boolean; centro?: number; clave?: keyof Parametros;
}) {
  const [abierto, setAbierto] = useState(false);
  let lo = min, hi = max;
  if (centro != null && Number.isFinite(centro)) {
    const span = max - min, mitad = span / 2;
    lo = centro - mitad; hi = centro + mitad;
    if (lo < min) { lo = min; hi = centro + (centro - min); }
    if (hi > max) { hi = max; lo = centro - (max - centro); }
    if (hi - lo < span / 3) { lo = Math.max(min, centro - span / 6); hi = Math.min(max, lo + span / 3); lo = Math.max(min, hi - span / 3); }
  }
  const fuera = valor < lo || valor > hi;
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-0.5', desactivado && 'opacity-60')}>
      {clave
        ? <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} className={cn('truncate text-left text-[13px] text-slate-700 underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-teal-800', abierto && 'text-teal-800')} title="Pincha para saber más de este parámetro">{etiqueta}</button>
        : <label htmlFor={id} className="truncate text-[13px] text-slate-700" title={etiqueta}>{etiqueta}</label>}
      <output htmlFor={id} className={cn('font-mono text-xs tabular-nums', fuera ? 'text-amber-700' : 'text-slate-900')}>{mostrar}</output>
      <input id={id} type="range" min={fuera ? Math.min(lo, valor) : lo} max={fuera ? Math.max(hi, valor) : hi} step={paso} value={valor} disabled={desactivado}
        onChange={e => alCambiar(Number(e.target.value))} className="col-span-2 w-full accent-teal-700" />
      {abierto && clave && <Explicacion clave={clave} alCerrar={() => setAbierto(false)} />}
    </div>
  );
}

/**
 * Que dos coches del garaje no ocupen el mismo sitio (2026-11-09): si la plaza de un coche visible se solapa con
 * la de otro ya colocado, se aparta de 3 en 3 m hacia fuera hasta que quede libre. Pasó al llegar un coche nuevo
 * a una plaza que un garaje guardado daba a otro; con esto, un coche nuevo nunca vuelve a esconder a uno viejo.
 */
function separarGaraje<T extends { id: string; visible: boolean; x: number; z: number; giro: number }>(lista: T[]): T[] {
  // Huella en planta: centro en x (el eje delantero está en x, el centro queda media batalla detrás) y medias medidas.
  type Huella = { cx: number; z: number; mx: number; mz: number };
  const huella = (p: T, z = p.z): Huella => {
    const d = VEHICULOS_GARAJE.find(v => v.id === p.id), girado = Math.abs(Math.sin(p.giro)) > 0.5;
    const l = d?.largo ?? 4, w = d?.ancho ?? 1.8;
    return { cx: p.x - (d?.batalla ?? 2.4) / 2, z, mx: (girado ? w : l) / 2, mz: (girado ? l : w) / 2 };
  };
  const seSolapan = (a: Huella, b: Huella) => Math.abs(a.cx - b.cx) < a.mx + b.mx && Math.abs(a.z - b.z) < a.mz + b.mz + 0.3;
  // El Aeromóvil, en el centro: de unos 4 m de largo y 1,6 de ancho, con el eje delantero en x = 0.
  const puestos: Huella[] = [{ cx: -1.1, z: 0, mx: 2.1, mz: 0.8 }];
  return lista.map(p => {
    if (!p.visible) return p;
    let z = p.z;
    for (let i = 1; puestos.some(q => seSolapan(huella(p, z), q)) && i < 40; i++) z = (p.z >= 0 ? 1 : -1) * (Math.abs(p.z) + 3 * i);
    puestos.push(huella(p, z));
    return z === p.z ? p : { ...p, z };
  });
}

function Bloque({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5">
      <h3 className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
        {titulo}{nota && <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-slate-400">{nota}</span>}
      </h3>
      {children}
    </section>
  );
}

function Selector<T extends string>({ id, etiqueta, valor, opciones, alCambiar, clave }: { id: string; etiqueta: string; valor: T; opciones: { k: T; n: string }[]; alCambiar: (v: T) => void; clave?: keyof Parametros }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-0.5">
      {clave
        ? <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} className={cn('truncate text-left text-[13px] text-slate-700 underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-teal-800', abierto && 'text-teal-800')} title="Pincha para saber más de este parámetro">{etiqueta}</button>
        : <label htmlFor={id} className="text-[13px] text-slate-700">{etiqueta}</label>}
      {/* (2026-11-13) a select is as wide as its longest option: at 390 px «Ventanas laterales con montante (Aptera)» pushed the page to 490 px */}
      <select id={id} value={valor} onChange={e => alCambiar(e.target.value as T)} className="max-w-[min(14rem,55vw)] rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs">
        {opciones.map(o => <option key={o.k} value={o.k}>{o.n}</option>)}
      </select>
      {abierto && clave && <Explicacion clave={clave} alCerrar={() => setAbierto(false)} />}
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
function LadoA1({ P, Pa, D, set, res, modelo, neumaticos, malas, alNavegar, dep }: {
  P: Parametros; Pa: Parametros; D: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: Modelo;
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
      <Bloque titulo="Carrocería y cúpula" nota={`${m2(Pa.W)} × ${m2(Pa.H)}`}>
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
      <Bloque titulo="Material y espesores">
        <Selector id="a1-matK" etiqueta="Material de la carrocería" valor={P.matCarenado} clave="matCarenado" opciones={(Object.keys(MATERIALES_CARENADO) as MaterialCarenado[]).map(k => ({ k, n: MATERIALES_CARENADO[k].n }))} alCambiar={v => set('matCarenado', v)} />
        <Deslizador id="a1-eK" etiqueta="Espesor de la carrocería" valor={P.espCarenado} clave="espCarenado" centro={D.espCarenado} min={RANGOS_MASA_A1.espCarenado[0]} max={RANGOS_MASA_A1.espCarenado[1]} paso={0.1} mostrar={`${fmt(P.espCarenado, 1)} mm`} alCambiar={v => set('espCarenado', v)} />
        <Deslizador id="a1-eV" etiqueta="Espesor de la cúpula (policarbonato)" valor={P.espCristal} clave="espCristal" centro={D.espCristal} min={RANGOS_MASA_A1.espCristal[0]} max={RANGOS_MASA_A1.espCristal[1]} paso={0.5} mostrar={`${fmt(P.espCristal, 1)} mm`} alCambiar={v => set('espCristal', v)} />
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
      <Bloque titulo="Ejes, ruedas y suspensión" nota="clase Twizy">
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
      <Bloque titulo="Motor y transmisión" nota={`${P.kWNom}/${P.kWPico} kW`}>
        <Deslizador id="a1-kn" etiqueta="Potencia nominal" valor={P.kWNom} clave="kWNom" centro={D.kWNom} min={4} max={40} paso={0.5} mostrar={`${fmt(P.kWNom, 1)} kW`} alCambiar={v => set('kWNom', v)} />
        <Deslizador id="a1-kp" etiqueta="Potencia máxima" valor={P.kWPico} clave="kWPico" centro={D.kWPico} min={P.kWNom} max={80} paso={0.5} mostrar={`${fmt(P.kWPico, 1)} kW`} alCambiar={v => set('kWPico', v)} />
        <Deslizador id="a1-v" etiqueta="Velocidad de cálculo" valor={P.speed} clave="speed" centro={D.speed} min={30} max={160} paso={5} mostrar={`${P.speed} km/h`} alCambiar={v => set('speed', v)} />
        <Deslizador id="a1-mM" etiqueta="Motor" valor={P.mMotor} clave="mMotor" centro={D.mMotor} min={RANGOS_MASA_A1.mMotor[0]} max={RANGOS_MASA_A1.mMotor[1]} paso={0.5} mostrar={`${fmt(P.mMotor, 1)} kg`} alCambiar={v => set('mMotor', v)} />
        <Deslizador id="a1-mI" etiqueta="Inversor" valor={P.mInversor} clave="mInversor" centro={D.mInversor} min={RANGOS_MASA_A1.mInversor[0]} max={RANGOS_MASA_A1.mInversor[1]} paso={0.5} mostrar={`${fmt(P.mInversor, 1)} kg`} alCambiar={v => set('mInversor', v)} />
        <Deslizador id="a1-mRe" etiqueta="Reductora con diferencial" valor={P.mReductora} clave="mReductora" centro={D.mReductora} min={RANGOS_MASA_A1.mReductora[0]} max={RANGOS_MASA_A1.mReductora[1]} paso={0.5} mostrar={`${fmt(P.mReductora, 1)} kg`} alCambiar={v => set('mReductora', v)} />
      </Bloque>
      </>)}

      {dep === 'energia' && (<>
      <Bloque titulo="Batería y energía solar" nota={`${a1.bateriaKg.toFixed(0)} kg · ${a1.bateriaL.toFixed(0)} L`}>
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
      <Bloque titulo="Plazas y asientos">
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
      <Bloque titulo="Varios" nota="lo que no tiene ficha propia">
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

/**
 * Los deslizadores y las cifras del Cuadriciclo Bala en rombo (2026-11-09, Eugenio: «permíteme editarlo»).
 * Etiquetas, bloques y rangos salen de `DESLIZADORES_BALA` (geometriaBala.ts), la misma tabla que leen las
 * opciones del túnel: si se cambia una etiqueta allí, cambia en los dos sitios.
 */
function LadoBala({ P, set, res, modelo, cdTunel }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: ModeloBala; cdTunel?: number;
}) {
  const B = camposBala(P), rb = res.bala;
  const cm = (v: number) => `${fmt(v * 100, 1)} cm`;
  const mostrar = (k: FichaBala['clave'], v: number): string => {
    switch (k) {
      case 'bSuelo': return `${cm(v)} al suelo`;
      case 'bPuntaMorro': return `${fmt(v, 2)} · ${v < 0.7 ? 'ojiva llena' : v > 0.95 ? 'en aguja' : 'ojiva'}`;
      case 'bCupIni': case 'bCupFin': return `${m2(v)} tras el eje delantero`;
      case 'bVia': return rb?.viaSubida ? `${m2(v)} → ${m2(rb.viaSubida)}` : m2(v);
      case 'bAleta': return `${m2(v)} sobre el suelo`;
      case 'bAlto': return `${fmt(v, 3)} m`;
      default: return m2(v);
    }
  };
  const notaBloque: Record<BloqueBala, string> = {
    Medidas: `${m2(modelo.Lf)} × ${m2(modelo.anchoTotal)} × ${m2(modelo.alto)}`,
    'Morro y cola': `largo ${m2(modelo.Lf)}`,
    'Cúpula': rb ? `cristal ${m2(rb.cupula[0])}–${m2(rb.cupula[1])}` : '',
    Ocupantes: 'dos, a horcajadas',
  };
  const ruedas = (lista: Pulgadas[]) => lista.map(k => ({ k, n: `${k}″ (${Math.round(DIAMETRO_RUEDA[k] * 1000)} mm)` }));
  const malas = res.comprobaciones.filter(c => c.holgura < c.minimo).length;
  return (
    <>
      {BLOQUES_BALA.map(bloque => (
        <Bloque key={bloque} titulo={bloque} nota={notaBloque[bloque]}>
          {DESLIZADORES_BALA.filter(f => f.bloque === bloque).map(f => {
            const [lo, hi] = rangoBala(f.clave, B);
            return <Deslizador key={f.clave} id={`b-${f.clave}`} etiqueta={f.n} valor={B[f.clave]} clave={f.clave} centro={BALA_DEFECTO[f.clave]} min={lo} max={hi} paso={f.paso} mostrar={mostrar(f.clave, B[f.clave])} alCambiar={v => set(f.clave, v)} />;
          })}
          {bloque === 'Medidas' && <>
            {rb?.viaSubida && <p className="-mt-2 text-xs text-amber-800">Con este ancho, la vía sube a {m2(rb.viaSubida)}: es lo mínimo para que los carenados laterales queden a 3 cm de la carrocería.</p>}
            <Selector id="b-ruedaDT" etiqueta="Ruedas delantera y trasera" valor={B.bRuedaDT} clave="bRuedaDT" opciones={ruedas(RUEDAS_DT_BALA)} alCambiar={v => set('bRuedaDT', v)} />
            <Selector id="b-ruedaLat" etiqueta="Ruedas laterales" valor={B.bRuedaLat} clave="bRuedaLat" opciones={ruedas(RUEDAS_LAT_BALA)} alCambiar={v => set('bRuedaLat', v)} />
            <p className="-mt-1 text-xs text-slate-500">El largo total es morro + batalla + cola. Las ruedas delantera y trasera van dentro de la carrocería; las laterales, en carenados que crecen con la rueda. Los carenados no se inclinan.</p>
          </>}
          {bloque === 'Cúpula' && <p className="-mt-2 text-xs text-slate-500">La cúpula se abre hacia delante, con la bisagra en su punta («Abrir cúpula», abajo en el 3D).</p>}
          {bloque === 'Ocupantes' && <p className="-mt-2 text-xs text-slate-500">Piloto y pasajero a horcajadas sobre un sillín escalonado, tipo moto. El manillar y el salpicadero se quedan sobre la rueda delantera; el resto del puesto sigue a cada uno.</p>}
        </Bloque>
      ))}

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
        <p className="text-xs text-slate-500">Cabezas: un hombre sentado erguido, inclinado {INCLINACION.piloto}° hacia delante y sin casco, de talla media ({fmt(TALLA_SENTADO.p50 * 100, 1)} cm sentado) y alta (percentil 95, {fmt(TALLA_SENTADO.p95 * 100, 1)} cm), según la encuesta antropométrica del ejército de EE. UU. de 2012 (ANSUR II). Se mide sobre el eje, hasta la cara de dentro del cristal. Con casco hace falta más. Las ruedas, sin contar el recorrido de la suspensión, que el Bala aún no tiene diseñada.</p>
      </Bloque>

      <Bloque titulo="Lo que se puede calcular" nota="estimación">
        {rb ? (
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
            {([
              ['Área frontal (todo)', `${fmt(rb.area.total)} m²`],
              ['  la carrocería', `${fmt(rb.area.cuerpo)} m²`],
              ['  + carenados laterales y brazos', `${fmt(rb.area.carenados)} m²`],
              ['  + ruedas (lo que asoma)', `${fmt(rb.area.ruedas)} m²`],
              ['Volumen de la carrocería', `${fmt(rb.vol)} m³`],
              ['Piel de la carrocería', `${fmt(rb.piel - rb.cristal)} m²`],
              ['Cristal de la cúpula', `${fmt(rb.cristal)} m²`],
            ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="whitespace-pre text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
            <dt className="text-slate-600">Cd del túnel (solo la carrocería)</dt>
            <dd className="text-right font-mono text-xs tabular-nums">{cdTunel != null ? fmt(cdTunel, 3) : '—'}</dd>
          </dl>
        ) : <p className="text-xs text-slate-500">Calculando…</p>}
        <p className="text-xs text-slate-500">
          <b>Cd:</b> la fórmula del editor es la de un carenado en gota de velomóvil (esbeltez, dónde está lo más grueso, la punta de cola) y no vale para esta forma, así que aquí no se da. Lo estima el túnel de viento con la silueta de la carrocería; los carenados laterales y sus brazos quedan fuera de ese cálculo, así que el Cd real será algo más alto. {cdTunel == null && 'Ábrelo con «Túnel de viento», debajo del 3D.'}
        </p>
        <p className="text-xs text-slate-500"><b>Masa, consumo y autonomía:</b> sin calcular. El chasis, el motor y la batería del Bala no están diseñados, y cualquier cifra sería inventada. El túnel sí da lo que cuesta empujar el aire.</p>
      </Bloque>
    </>
  );
}

/** Una lista de comprobaciones: holgura en cm, o la cifra que traiga (`mostrar`: el vuelco en g, el bastidor en ×). */
function ListaComprobaciones({ lista }: { lista: Comprobacion[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {lista.map(c => {
        const cl = c.holgura < 0 ? 'border-red-300 bg-red-50 text-red-700' : c.holgura < c.minimo ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700';
        const mal = c.mostrar ? (c.nombre.startsWith('Vuelco') ? 'vuelca' : 'no') : 'roza';
        return (
          <li key={c.nombre} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
            <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', cl)}>{c.holgura < 0 ? mal : c.holgura < c.minimo ? 'justo' : 'ok'}</span>
            <span className="text-slate-700">{c.nombre}</span>
            <span className="font-mono text-xs tabular-nums">{c.mostrar ?? `${c.holgura < 0 ? '−' : ''}${fmt(Math.abs(c.holgura) * 100, 1)} cm`}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** El Cd del túnel para el Triciclo: lo que da, a qué área se refiere y si aún calcula. */
interface CdTriciclo { calculando: boolean; cd?: number; areaRef?: number }
/**
 * El Cd del Triciclo (2026-11-10): el del túnel de viento, calculado en segundo plano (solo las cifras) con la
 * silueta de la carrocería y sus tres ruedas, en el trabajador del túnel. Se pide medio segundo después del último
 * cambio de la silueta; los deslizadores que no la cambian (masas, motor, batería…) no lo vuelven a pedir. El túnel
 * da el Cd a 50, 80 y 120 km/h; a otra velocidad se interpola entre los dos más cercanos.
 */
function useCdTriciclo(modelo: Modelo, resolucion: Resolucion, kmh: number): CdTriciclo {
  const peticion = useMemo(() => modelo.tipo === 'triciclo' ? { ...peticionTunel({ ...cuerpoTriciclo(modelo), id: 'triciclo-cd' }, resolucion, 'pocas'), soloNumeros: true } : null, [modelo, resolucion]);
  const clave = peticion ? claveTunel(peticion) : '';
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!peticion) return;
    let vivo = true;
    const t = setTimeout(() => { pedirTunel(peticion, 5).then(() => { if (vivo) setVersion(v => v + 1); }); }, 500);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  if (!peticion) return { calculando: false };
  const R = resultadoEnCache(peticion);
  if (!R) return { calculando: true };
  const pv = R.porVelocidad, v = Math.min(pv[pv.length - 1].kmh, Math.max(pv[0].kmh, kmh));
  let i = 0; while (i < pv.length - 2 && v > pv[i + 1].kmh) i++;
  const u = (v - pv[i].kmh) / (pv[i + 1].kmh - pv[i].kmh);
  return { calculando: false, cd: pv[i].cd.total + (pv[i + 1].cd.total - pv[i].cd.total) * u, areaRef: peticion.area };
}

/**
 * Los deslizadores y las cifras del Triciclo Bala (2026-11-10, Eugenio: «permite modificar todo lo que se permitía
 * modificar en el Apterike»), por departamentos como el Aeromóvil 1. Etiquetas, departamentos, bloques y rangos salen
 * de `deslizadoresTriciclo()` (geometriaTriciclo.ts), la misma tabla que leen las opciones del túnel; las de la forma,
 * de la del Cuadriciclo en rombo. «Proyecto» es el resumen: todas las comprobaciones, el rendimiento y el peso.
 */
function LadoTriciclo({ P, set, res, modelo, dep, cd }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: ModeloTriciclo; dep: DepTriciclo | 'proyecto'; cd: CdTriciclo;
}) {
  const T = camposTriciclo(P), rt = res.triciclo!, cm = (v: number, d = 1) => `${fmt(v * 100, d)} cm`;
  const e = cd.cd != null && cd.areaRef != null ? energiaTriciclo(modelo, res.mTot, { cd: cd.cd, areaRef: cd.areaRef }) : null;
  const mostrar = (f: FichaTriciclo, v: number): string => {
    switch (f.clave) {
      case 'tSuelo': return modelo.elevar > 0 ? `${cm(v)} al suelo · todo sube ${cm(modelo.elevar, 0)}` : `${cm(v)} al suelo`;
      case 'tPuntaMorro': return `${fmt(v, 2)} · ${v < 0.7 ? 'ojiva llena' : v > 0.95 ? 'en aguja' : 'ojiva'}`;
      case 'tCupIni': case 'tCupFin': return v >= 0 ? `${m2(v)} tras el eje delantero` : `${m2(-v)} delante del eje delantero`;
      case 'tVia': return rt.viaSubida ? `${m2(v)} → ${m2(rt.viaSubida)}` : m2(v);
      case 'tViaTras': return Math.abs(v - modelo.via.del) < 0.005 ? `${m2(v)} · la de delante` : m2(v);
      case 'tAleta': return `${m2(v)} sobre el suelo`;
      case 'tAlto': return modelo.elevar > 0 ? `${fmt(v, 3)} m · ${fmt(v + modelo.elevar, 3)} m con la carrocería subida` : `${fmt(v, 3)} m`;
      case 'tFaldon': return v < 0.01 ? 'sin faldón' : `asoman ${cm(modelo.faldon?.y0 ?? 0)}`;
      case 'tEjeDel': return v < 0.005 ? 'donde el Cuadriciclo en rombo' : `${cm(v, 0)} más atrás`;
      case 'tSolar': return res.areas.solar < 0.005 ? 'sin techo solar' : `${m2(v)} tras el eje · ${fmt(res.areas.solar)} m²`;
      case 'tVentAlto': return `${Math.round(v * 100)} % del costado`;
      case 'tPilar': return `${m2(v)} tras el eje delantero`;
      case 'tPilarBarrido': return `${cm(v, 0)} hacia atrás`;
      case 'tManX': case 'tManY': case 'tPiesX': case 'tPiesY': return `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)}`;
      case 'tFila2X': case 'tFila3X': return cm(v, 0);
      case 'tRecPil': case 'tRecPas': case 'tRecFila': return v === 0 ? '0° (erguido)' : v < 0 ? `${-v}° hacia delante` : `${v}° hacia atrás`;
      // 2026-11-12
      case 'tBatX': case 'tPuertaDel': case 'tPuertaTras': case 'tPuerta2Parte': return `${m2(v)} tras el eje delantero`;
      // round 3 (body)
      case 'tMorroLinea': return v < 0.01 ? 'en punta (ojiva)' : v > 0.99 ? 'en línea (Aptera)' : `${Math.round(v * 100)} % hacia la línea`;
      case 'tColaPlana': return v < 0.01 ? 'en punta' : v > 0.99 ? 'plana y ancha (Aptera)' : `${Math.round(v * 100)} % hacia plana`;
      case 'tTechoPlano': return v < 0.01 ? 'redondeado' : v > 0.99 ? 'plano' : `${Math.round(v * 100)} % hacia plano`;
      case 'tCaida': return Math.abs(v) < 0.01 ? 'como siempre' : v > 0 ? `cae más tarde (+${fmt(v, 2)})` : `cae antes (${fmt(v, 2)})`;
      case 'tMorroAlto': case 'tLineaCupula': return Math.abs(v) < 0.0005 ? 'como siempre' : `${v > 0 ? '+' : '−'}${cm(Math.abs(v), 1)}`;
      case 'tBisagra2Y': return `${Math.round(v * 100)} % del canto de atrás`;
      // round 4 (2026-11-13): the roof frame
      case 'tMarcoTecho': return v < 0.0005 ? 'sin marco' : cm(v, 1);
      case 'tBisagra2Inc': return v === 0 ? '0° (tangente al canto)' : `${v}° arriba hacia delante`;
      case 'tBatAncho': return `${Math.round(v)} % · ${cm(2 * (modelo.paquete?.hz ?? 0), 0)}`;
      case 'tKWh': return modelo.paquete ? `${fmt(modelo.kWh, 1)} kWh (por el tamaño del paquete)` : `${fmt(v, 1)} kWh`;
      case 'tVolY': return modelo.volante && modelo.volante.baja > 0.001 ? `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)} · baja ${cm(modelo.volante.baja, 0)} para caber` : `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)}`;
      case 'tVolX': return modelo.volante && modelo.volante.atras > 0.001 ? `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)} · ${cm(modelo.volante.atras, 0)} más hacia el piloto para caber` : `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)}`;
      // (the hinge never goes ahead of the roof's highest point: there it stops, `portonDe`)
      case 'tMalIni': { const real = modelo.porton ? modelo.xF - modelo.porton.xH : v; return Math.abs(real - v) > 0.005 ? `${m2(v)} → ${m2(real)} (lo más alto del techo)` : `${m2(v)} tras el eje delantero`; }
      case 'tSalpY': return `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)}`;
      case 'tVolInc': return `${v}° (arriba hacia delante)`;
      case 'tUmbral': return `${cm(v, 0)} del suelo`;
      case 'tCintura': return v < 0.005 ? 'en el borde del cristal' : `${cm(v, 0)} sobre el cristal`;
      case 'tBisagraY': return v < 0.2 ? `${Math.round(v * 100)} % · casi en el pie` : v > 0.8 ? `${Math.round(v * 100)} % · casi en el techo` : `${Math.round(v * 100)} % del montante`;
      case 'tBisagraInc': return v === 0 ? '0° (tangente al montante)' : `${v > 0 ? '+' : '−'}${Math.abs(v)}°`;
      // round 3 interior: the running gear rises with the load (geometriaTriciclo.ts `dimensionar`); the rails' spacing, as built
      case 'tMSuspDel': case 'tMSuspTras': case 'tMFreno': {
        const n = f.clave === 'tMSuspDel' ? 'Suspensión delantera' : f.clave === 'tMSuspTras' ? (cuatro ? 'Suspensión trasera' : 'Basculante y amortiguador') : 'Frenos';
        const real = (res.masas[n] ?? 0) / (f.clave === 'tMFreno' ? (cuatro ? 4 : 3) : 1);
        return real > v + 0.05 ? `${fmt(v, 1)} → ${fmt(real, 1)} kg${f.clave === 'tMFreno' ? ' de media' : ''} (por la carga)` : `${fmt(v, 1)} kg`;
      }
      case 'tChSep': { const real = 2 * Math.abs(modelo.tubos.find(t => t.nombre.startsWith('Larguero der'))?.b[2] ?? v / 2); return Math.abs(real - v) > 0.005 ? `${cm(v, 0)} → ${cm(real, 0)} (carrocería estrecha)` : `${cm(v, 0)} de eje a eje`; }
      case 'tMAsiento': return butacas ? `${fmt(v, 1)} kg · butaca ${fmt(masaButaca(v), 1)} kg` : `${fmt(v, 1)} kg`;
    }
    switch (f.unidad) {
      case 'm': return m2(v);
      case 'cm': return cm(v);
      case 'mm': return `${fmt(v, 1)} mm`;
      case '°': return `${v}°`;
      case 'x': return `×${fmt(v, 2)}`;
      case 'Wh/kg': case 'Wh/L': case 'km/h': return `${Math.round(v)} ${f.unidad}`;
      case '%': return `${Math.round(v)} %`;
      default: return `${fmt(v, 1)} ${f.unidad}`;
    }
  };
  // round three: the three rows' block only shows with that layout (astride it would move nothing)
  const filas = T.tAsientos === 'filas', soloFilas = (b: string) => b === 'Tres filas' && !filas;
  // four wheels (2026-11-11): the rear track only with two rear wheels
  const cuatro = esCuatro(T), lemas = lemasTriciclo(T), tresOCuatro = cuatro ? 'cuatro' : 'tres';
  // 2026-11-12: each new option's sliders only show with it on (a steering wheel's with «Volante», the handlebar's with
  // «Manillar», the doors' with doors, the hatch's with the Aptera hatch, the pack's with the battery along the frame)
  const volante = T.tMando === 'volante', salp = conSalpicadero(T), puertas = conPuertas(T), portonA = conPortonAptera(T), paquete = bateriaChasis(T), butacas = conButacas(T);
  const PUERTA = ['tPuertaDel', 'tPuertaTras', 'tUmbral', 'tCintura', 'tBisagraY', 'tBisagraInc', 'tBisagraDentro', 'tPuertaAbre'];
  const visible = (k: string) => (k === 'tManX' || k === 'tManY') ? !volante : k.startsWith('tVol') ? volante : k.startsWith('tSalp') ? salp
    : PUERTA.includes(k) ? puertas : (k === 'tMalIni' || k === 'tMalAbre' || k === 'tMalLado') ? portonA : (k.startsWith('tBat') && k !== 'tBatDisp') ? paquete
      // round 3 (body): the headlamp's width with the headlamp, the fin's height with the fin, the second door's with it
      : k === 'tFaroD' ? T.tFaro === 'si' : k === 'tAleta' ? T.tConAleta !== 'no' : PUERTA2.includes(k) ? puertas && T.tPuertas2 === 'si' : true;
  const PUERTA2 = ['tPuerta2Parte', 'tBisagra2Y', 'tBisagra2Inc', 'tPuerta2Abre'];
  // (round 3 interior: the rails reach the rear axle only with two rear wheels; with one, the wheel is in the tail between them)
  const fichas = deslizadoresTriciclo().filter(f => f.dep === dep && !soloFilas(f.bloque) && (cuatro || f.clave !== 'tViaTras') && visible(f.clave)), sels = SELECTORES_TRICICLO.filter(s => s.dep === dep && !soloFilas(s.bloque) && ((s.clave !== 'tMaletero' && s.clave !== 'tPuertas2') || puertas) && (s.clave !== 'tChLargo' || cuatro));
  const nOcc = rt.ocupantes, conN = nOcc === 1 ? 'con el piloto solo' : `con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc] ?? nOcc} ocupantes`;
  // with three rows the passenger's saddle height is the rows' seat height; its position and recline do nothing there
  const ETIQUETA_FILAS: Partial<Record<string, string>> = { tPasY: 'Asientos de las filas 2 y 3: altura' };
  const apagadoFilas = (k: string) => filas && (k === 'tPasX' || k === 'tRecPas');
  // four wheels: what the rear wheels' sliders are, and the swing arm and the spat, which do not exist then
  const ETIQUETA_CUATRO: Partial<Record<string, string>> = { tMSuspTras: 'Suspensión trasera (las dos)', tMMotor: 'Motores de buje (los dos)', tRuedaTras: 'Ruedas traseras (en los carenados)', tFaldon: 'Rueda trasera: faldón (no hay: van en carenados)', tBasculante: 'Basculante trasero (no hay: brazos en los carenados)' };
  const apagadoCuatro = (k: string) => cuatro && (k === 'tFaldon' || k === 'tBasculante');
  // round 3 interior: with the Aptera buckets the pilot's feet are on pedals, and «Un asiento» is a saddle's mass (a bucket weighs 1.8 times it)
  const ETIQUETA_BUTACAS: Partial<Record<string, string>> = { tPiesX: 'Pedales: hacia delante', tPiesY: 'Pedales: altura', tMAsiento: 'Un asiento: sillín y respaldo (una butaca, ×1,8)' };
  const etiqueta = (k: string, n: string) => (filas && ETIQUETA_FILAS[k]) || (butacas && ETIQUETA_BUTACAS[k]) || (cuatro && ETIQUETA_CUATRO[k]) || n;
  const bloques = [...new Set([...fichas.map(f => f.bloque), ...sels.map(s => s.bloque)])];
  const checks = res.comprobaciones.filter(c => dep === 'proyecto' || (c.dep ?? '').split(',').includes(dep));
  const malas = checks.filter(c => c.holgura < c.minimo).length;
  const dl = (filas: [string, string][]) => (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
      {filas.map(([a, b]) => (<Fragment key={a}><dt className="whitespace-pre text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
    </dl>
  );
  const cdTexto = cd.calculando ? 'calculando…' : cd.cd != null ? fmt(cd.cd, 3) : '—';
  const sinCd = cd.calculando ? 'calculando…' : '—';
  const kmhVel = Math.round(T.tVel);
  const rendimiento = (
    <Bloque titulo="Rendimiento" nota={cd.calculando ? 'el túnel calcula el Cd…' : 'estimación'}>
      {dl([
        ['Cd del túnel (estimado)', cdTexto],
        ['  referido a la sección de la carrocería', cd.areaRef != null ? `${fmt(cd.areaRef)} m²` : sinCd],
        ['CdA', e ? `${fmt(e.CdA, 3)} m²` : sinCd],
        [`Consumo a ${kmhVel} km/h`, e ? `${fmt(e.WhKm / 10, 1)} kWh/100 km` : sinCd],
        ['Consumo a 50 y a 100 km/h', e ? `${fmt(e.WhKm50 / 10, 1)} · ${fmt(e.WhKm100 / 10, 1)} kWh/100 km` : sinCd],
        [`Potencia a ${kmhVel} km/h`, e ? `${fmt(e.potencia / 1000, 1)} kW` : sinCd],
        [`Autonomía a ${kmhVel} km/h`, e ? `${Math.round(e.autonomia)} km` : sinCd],
        [`Velocidad sostenida (${fmt(T.tKWNom, 1)} kW)`, e ? `${Math.round(e.vmaxNominal)} km/h` : sinCd],
        [`Velocidad punta (${fmt(T.tKWPico, 1)} kW)`, e ? `${Math.round(e.vmaxPico)} km/h` : sinCd],
        ['0 → 50 km/h', e ? (e.acel50 > 60 ? 'no llega' : `${fmt(e.acel50, 1)} s`) : sinCd],
        ['Techo solar', res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m² · ${Math.round(res.solarPico)} W pico` : 'sin techo solar'],
        ['  energía solar al día (estimada)', res.areas.solar > 0.005 ? `${fmt(res.solarDia / 1000)} kWh · ${e ? `${Math.round(e.kmSol)} km` : sinCd}` : '—'],
      ])}
      {cd.calculando && <p className="flex items-center gap-1.5 text-xs text-sky-800"><Wind className="h-3.5 w-3.5 animate-pulse" />El túnel de viento está calculando el Cd de esta forma (unos segundos). Hasta que acabe, no hay cifra.</p>}
      <p className="text-xs text-slate-500">El Cd lo calcula el túnel con la silueta de la carrocería y sus {tresOCuatro} ruedas (no hay fórmula del editor para esta forma); los carenados y los brazos solo entran como ruedas carenadas, así que el real será algo más alto. {nOcc === 1 ? 'Con el piloto solo' : `Con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc]} ocupantes`} de {T.tMOcc} kg ({Math.round(res.mTot)} kg en total), rodadura {fmt(CRR, 3)} (neumático de ciclomotor), motor y controlador al {Math.round(RENDIMIENTO * 100)} %, {AUXILIARES} W de equipos y la batería usable al {Math.round(USABLE * 100)} %. Todo supuesto, no medido.</p>
    </Bloque>
  );
  // round 3 interior (2026-11-12, Eugenio: «dentro del proyecto, que lo primero que aparezca sean todos los componentes que hay y el peso de cada uno»)
  const GRUPOS: [DepTriciclo, string][] = [['carroceria', 'Carrocería'], ['chasis', 'Chasis'], ['rodaje', 'Rodaje'], ['propulsion', 'Motor'], ['energia', 'Energía'], ['interior', 'Interior']];
  const diseno = cargasRueda(modelo, rt.piezas);
  const peso = (
    <Bloque titulo="Peso: todos los componentes" nota={`${Math.round(res.mVeh)} kg en vacío`}>
      <div className="flex flex-col gap-2.5 text-[13px]">
        {GRUPOS.map(([g, n]) => {
          const ps = rt.piezas.filter(p => grupoPieza(p.nombre) === g); if (!ps.length) return null;
          return (
            <div key={g}>
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-0.5 font-semibold text-slate-800"><span>{n}</span><span className="font-mono text-xs tabular-nums">{fmt(ps.reduce((a, p) => a + p.kg, 0), 1)} kg</span></div>
              <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                {ps.map(p => (<Fragment key={p.nombre}><dt className="min-w-0 text-slate-600">{p.nombre}{p.nota && <span className="block text-[11px] leading-snug text-slate-400">{p.nota}</span>}</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(p.kg, 1)} kg</dd></Fragment>))}
              </dl>
            </div>
          );
        })}
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t-2 border-slate-300 pt-1.5">
          <dt className="font-semibold text-slate-800">Total en vacío</dt><dd className="text-right font-mono text-xs font-semibold tabular-nums">{fmt(res.mVeh, 1)} kg</dd>
          <dt className="text-slate-600">{nOcc === 1 ? 'Con el piloto' : `Con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc]} ocupantes`} de {T.tMOcc} kg</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(res.mTot)} kg</dd>
          <dt className="text-slate-600">Y {EQUIPAJE} kg de equipaje: masa de diseño</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(diseno.masa)} kg</dd>
          <dt className="text-slate-600">  por rueda: delante · detrás</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(diseno.del)} · {Math.round(diseno.tras)} kg</dd>
        </dl>
      </div>
      <p className="text-xs text-slate-500">Las suspensiones, los frenos y los neumáticos se dimensionan para la masa de diseño: todos a bordo y {EQUIPAJE} kg de equipaje. Cada deslizador de masa es lo menos que pesa esa pieza; si la carga pide más, cuenta lo que pide la carga y aquí se dice. El bastidor pesa lo que sus tubos (largo × sección × densidad) más sus uniones. Son estimaciones de piezas de su clase, no pesadas.</p>
      <p className="text-xs text-slate-500">Centro de gravedad {nOcc === 1 ? 'con el piloto' : `con los ${['', '', 'dos', 'tres', 'cuatro'][nOcc]}`}: {cm(rt.cg.y, 0)} sobre el suelo y {m2(modelo.xF - rt.cg.x)} detrás del eje delantero ({Math.round(rt.vuelco.repartoDel * 100)} % del peso delante). Vacío: {cm(rt.cg.vacio.y, 0)} de alto.</p>
    </Bloque>
  );
  return (
    <>
      {dep === 'proyecto' && peso}
      <Bloque titulo={lemas[dep]} nota={nombreTriciclo(T)}>
        {cuatro
          ? <p className="text-xs text-slate-500">Cuatro ruedas: dos delante en carenados como el Aptera, que giran con ellas, y dos detrás en carenados iguales, que no giran, con un motor en el buje de cada una. Es el Triciclo Bala con otra parte de atrás: la carrocería y todas sus medidas son las mismas (en Rodaje, «Ruedas traseras», se vuelve a la de una rueda).</p>
          : <p className="text-xs text-slate-500">Tres ruedas: dos delante en carenados como el Aptera, que giran con ellas, y una detrás dentro de la cola, con el motor en el buje. La carrocería es la del Cuadriciclo Bala en rombo; con las medidas por defecto, la misma.</p>}
      </Bloque>
      {bloques.map(bloque => (
        <Bloque key={bloque} titulo={bloque}>
          {bloque === 'Forma' && (() => {
            // round two (2026-11-10): one lever for «hazlo un poco más grande»; it moves the nose, wheelbase and tail (see estirarTriciclo)
            const lg = largoTriciclo(T);
            return <>
              <Deslizador id="t-largo" etiqueta="Largo total (estira solo el medio)" valor={lg.valor} min={lg.min} max={lg.max} paso={0.01} mostrar={`${m2(lg.valor)} de carrocería`} alCambiar={x => { const o = estirarTriciclo(T, x); for (const [k, v] of Object.entries(o)) set(k as keyof Parametros, v as never); }} />
              <p className="-mt-1 text-xs text-slate-500">Estira la carrocería por el medio, sin tocar el morro ni la cola: solo cambia la batalla, y la cúpula acaba igual de lejos del eje trasero, así que crece la cabina. El morro y la cola conservan su forma y su largo (se cambian abajo, en «Morro y cola»). No es una escala de todo: los ocupantes, el {volante ? 'volante' : 'manillar'}, los asientos{puertas ? ', las puertas' : ''} y la batería no se mueven.</p>
            </>;
          })()}
          {fichas.filter(f => f.bloque === bloque).map(f => {
            const v = vistaTriciclo(f, T);
            // the A-pillar's sliders do nothing on a one-piece canopy
            // (2026-11-12: with doors the window frame is always there; with the pack along the frame its size decides the kWh)
            const apagado = (T.tVentanas === 'burbuja' && !puertas && f.clave.startsWith('tPilar')) || apagadoFilas(f.clave) || apagadoCuatro(f.clave) || (paquete && f.clave === 'tKWh');
            const valor = paquete && f.clave === 'tKWh' ? Math.min(v.max, Math.max(v.min, modelo.kWh)) : v.valor;
            return <Deslizador key={f.clave} id={`t-${f.clave}`} etiqueta={etiqueta(f.clave, f.n)} valor={valor} clave={f.clave} centro={f.centrar ? v.defecto : undefined} min={v.min} max={v.max} paso={f.paso} mostrar={mostrar(f, valor)} desactivado={apagado} alCambiar={x => set(f.clave, guardarTriciclo(f, x, T))} />;
          })}
          {sels.filter(s => s.bloque === bloque).map(s => <Selector key={s.clave} id={`t-${s.clave}`} etiqueta={etiqueta(s.clave, s.n)} valor={T[s.clave] as string} clave={s.clave} opciones={s.opciones} alCambiar={v => {
            set(s.clave, v as never);
            // two rear wheels start with the rear track equal to the front one (Eugenio: «con las mismas medidas»)
            if (s.clave === 'tTraseras' && v === 'dos') set('tViaTras', limitarTriciclo('tVia', T));
          }} />)}
          {bloque === 'Carenados' && <p className="-mt-1 text-xs text-slate-500">{cuatro
            ? 'Los carenados delanteros giran con sus ruedas (como en el Aptera): el neumático siempre queda igual de centrado; lo que se comprueba es que, girados a tope, no toquen la carrocería. Los traseros son iguales (tamaño, anchura, cola y brazos se mueven con estos mismos deslizadores), crecen con su rueda y no giran. Sin rueda en la cola, no hay faldón.'
            : 'Los carenados delanteros giran con sus ruedas (como en el Aptera): el neumático siempre queda igual de centrado; lo que se comprueba es que, girados a tope, no toquen la carrocería. El faldón tapa la parte de abajo de la rueda trasera.'}</p>}
          {bloque === 'Asientos' && (filas
            ? <p className="-mt-1 text-xs text-slate-500">Tres filas: el piloto solo, en un asiento de coche en el centro, con {volante ? 'el volante' : 'el manillar de siempre'}; detrás, dos asientos juntos; y al final uno más pequeño en el centro. Los de las filas 2 y 3 se pliegan (abajo, «Tres filas»). Con esta disposición la carrocería tiene unos mínimos: {m2(ANCHO_FILAS)} de ancho (para los hombros de la fila 2), {fmt(ALTO_FILAS, 2)} m de cúpula y la batalla y la cúpula largas para que la fila 3 quepa delante del amortiguador trasero. El pasajero a horcajadas no existe aquí: su posición y su reclinado no hacen nada.</p>
            : butacas ? <p className="-mt-1 text-xs text-slate-500">Dos butacas como las del Aptera, una detrás de otra en el centro: una carcasa blanca de una pieza con el reposacabezas, cojín y respaldo oscuros acolchados y una base fina sobre los largueros{paquete ? ' o el paquete' : ''}. El piloto lleva las piernas hacia delante, con los pies en los pedales (abajo, «Pedales»), hasta el {salp ? 'salpicadero' : 'morro'}; el pasajero, a los lados del asiento del piloto, con las rodillas por fuera de su respaldo, como en el asiento de atrás de un Renault Twizy. Cada butaca pesa 1,8 veces «Un asiento» ({fmt(masaButaca(T.tMAsiento), 1)} kg). Se comprueba que las rodillas y los pies del pasajero no toquen el asiento del piloto y que los pies de los dos queden dentro de la carrocería.</p>
            : <p className="-mt-1 text-xs text-slate-500">A horcajadas, como en el Cuadriciclo en rombo, con un respaldo cada uno. Reclinar baja la cabeza y la lleva hacia atrás: al piloto le da techo (la cúpula sube detrás de él), pero aleja sus manos del {volante ? 'volante' : 'manillar'}; al pasajero se lo quita, porque detrás de él la cúpula baja.</p>)}
          {bloque === 'Asientos' && <p className="-mt-1 text-xs text-slate-500">Los asientos bajan hasta quedar con 6 cm de asiento sobre lo que tienen debajo: los largueros del bastidor{paquete ? ' o, donde pasa bajo ellos, el paquete de batería' : ''} (ahora, el piloto hasta {m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tPilY')!, T).min)} y {filas ? 'las filas 2 y 3' : 'el pasajero'} hasta {m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tPasY')!, T).min)} del suelo).{butacas || filas ? '' : ' El sillín se hace más fino al bajar.'} Más bajos: menos vuelco y más techo, pero las rodillas suben.</p>}
          {bloque === 'Mandos' && butacas && <p className="-mt-1 text-xs text-slate-500">Con las butacas el piloto conduce con los pies en dos pedales, freno y acelerador, con el talón en una placa sobre el suelo{paquete ? ', el paquete' : ''} o la barra de la cuna delantera, lo que quede debajo. «Pedales» los acerca o los aleja y los sube o los baja.</p>}
          {bloque === 'Mandos' && volante && <p className="-mt-1 text-xs text-slate-500">Volante de coche en una columna que baja hacia delante hasta la cabeza de dirección (donde iba el manillar), con las manos del piloto en el aro a las tres menos cuarto. Se comprueba que el aro quede dentro de la carrocería y que no toque las rodillas.{salp ? '' : ' Sin salpicadero, los relojes van en una pantallita sobre la columna.'}</p>}
          {bloque === 'Salpicadero' && <p className="-mt-1 text-xs text-slate-500">{T.tSalpicadero === 'blanco' ? `Un salpicadero blanco de lado a lado bajo el parabrisas, con su forma (a 2 cm de la piel por dentro), desde donde el morro deja sitio hacia el piloto: un labio oscuro por el borde de atrás, los relojes bajo una visera delante del piloto, una pantalla central sobre un pie, a su derecha, con una fila de botones, salidas de aire en los dos extremos y a los lados de los relojes${volante ? ', y la funda de la columna del volante con sus dos palancas' : ''}. Ocupa el sitio del depósito y de la pantallita. Unos 6,5 kg (estimado). Fondo ${cm(modelo.salpicadero ? modelo.salpicadero.x0 - modelo.salpicadero.x1 : 0, 0)}.`
            : salp ? `Un salpicadero de lado a lado bajo el parabrisas, a 2 cm de la piel por dentro, desde donde el morro deja sitio hacia el piloto; en su cara de atrás, la pantalla de los relojes y una pantalla central. Ocupa el sitio del depósito y de la pantallita. Fondo ${cm(modelo.salpicadero ? modelo.salpicadero.x0 - modelo.salpicadero.x1 : 0, 0)}.` : 'Sin salpicadero: una pantallita sobre el depósito, delante del piloto.'}</p>}
          {bloque === 'Puertas y maletero' && <p className="-mt-1 text-xs text-slate-500">{puertas
            ? `Dos puertas como las del Aptera, cortadas en esta carrocería: cada una lleva su ventana con el marco (el montante y el carril del techo) y se abre hacia arriba y hacia fuera a la vez («de mariposa»), sobre una bisagra en el montante. El eje es la tangente al montante donde va la bisagra: así toda la puerta queda por debajo y sale hacia fuera sin rozar. Con la bisagra al pie del montante (de serie) el eje sube inclinado y la puerta sube y sale a la vez, dejando libre la entrada; con la bisagra más arriba el eje se tumba y la puerta gira como un ala sobre un eje casi a lo largo del coche, pero se queda encima del hueco: «Puerta abierta: altura libre para entrar» lo dice. Con puertas la cúpula ya no se abre, y siempre lleva montante. «Abrir puertas», abajo en el 3D.${portonA ? ' El portón es como el del Aptera: con la bisagra en el techo, cerca de su punto más alto, levanta de una pieza la luna, el techo de atrás y lo alto de la cola, más o menos la mitad de atrás del vehículo, con la aleta. «Abrir maletero».' : ' El maletero sigue siendo la tapa de lo alto de la cola; el portón largo como el del Aptera se elige en «Maletero».'}`
            : 'Con la cúpula entera, se entra levantándola hacia delante («Abrir cúpula») y el maletero es la tapa de lo alto de la cola. Las puertas como el Aptera (y con ellas el portón largo) cortan la carrocería en su sitio y dejan la cúpula fija.'}
            {T.tRetrovisores === 'espejos' ? ` Retrovisores de gota en un brazo corto, ${puertas ? 'en cada puerta' : 'en la carrocería'}, donde estaban las cámaras; el túnel de viento no los cuenta (su Cd sale algo más bajo de lo que será).` : ''}</p>}
          {bloque === 'Tres filas' && <p className="-mt-1 text-xs text-slate-500">Cada fila se pliega por separado: el respaldo cae hacia delante sobre el asiento y queda un suelo plano para carga. Sus pasajeros dejan de contar en el peso, el vuelco y el consumo. Los pies de la fila 2 van bajo el asiento del piloto y los de la fila 3 bajo los de la fila 2, como en un coche. Maletero ahora: {Math.round(rt.maletero.ahora)} L ({rt.maletero.estado}).</p>}
          {bloque === 'Ejes y ruedas' && <>
            {rt.viaSubida && <p className="-mt-1 text-xs text-amber-800">La vía sube a {m2(rt.viaSubida)}: es lo mínimo para que los carenados, girados a tope, queden a 3 cm de la carrocería.</p>}
            <p className="-mt-1 text-xs text-slate-500">El eje delantero va detrás de donde el Cuadriciclo en rombo lleva su rueda delantera: así el peso queda más cerca de las dos ruedas de delante y {cuatro ? 'la vía de delante pesa más en el vuelco' : 'el triciclo vuelca menos'} (abajo, «Vuelco»). Batalla {m2(modelo.batalla)}.</p>
            {bloque === 'Ejes y ruedas' && <p className="-mt-1 text-xs text-slate-500">Ruedas traseras: una dentro de la cola, sobre un basculante, como un triciclo; o dos fuera, en carenados como los de delante sobre dos brazos carenados cada uno, que no giran: cuatro ruedas. Con dos, el motor se reparte en dos motores de buje, uno en cada rueda, y la cola queda libre para el maletero.{cuatro ? ` La vía trasera va de lo justo para que los carenados queden a 3 cm de la cola (${m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tViaTras')!, T).min)}) a la vía delantera más ancha; de serie, la de delante.` : ''}</p>}
          </>}
          {bloque === 'Bastidor' && <p className="-mt-1 text-xs text-slate-500">Dos largueros sobre la panza con {modelo.larguerosTraseros ? 'cinco' : 'cuatro'} travesaños, {paquete ? 'la cuna de la suspensión delantera (con la batería a lo largo del bastidor, en el morro ya no hay batería), el paquete de batería sobre el fondo de la panza, con los largueros pasando por dentro' : 'la cuna de la batería (donde se apoya la suspensión delantera)'}, los soportes de los {butacas ? 'asientos' : filas ? 'asientos' : 'sillines'}, la torreta del amortiguador{modelo.larguerosTraseros ? ', los largueros siguiendo hasta el eje trasero (suben con la panza donde la cola se levanta y se cierran donde se estrecha) y una cuna trasera hasta donde llegan los brazos de los carenados de atrás' : ''} y el soporte de la columna de dirección: {fmt(rt.bastidor.metros, 1)} m de tubo. {cuatro ? (modelo.larguerosTraseros ? '' : 'Los largueros acaban en la torreta: «Largueros: hasta» › «El eje trasero» los lleva hasta donde las ruedas de atrás meten su peso. ') : 'Con una rueda detrás, los largueros acaban en la torreta: la rueda va entre ellos, en la cola. '}La separación de los largueros se mide de eje a eje; más separados, el bastidor es más ancho y el paquete de batería, que es un porcentaje de ese ancho, también. Se ve con «Rayos X» o la capa «Chasis».</p>}
          {bloque === 'Techo solar y ventanas' && <p className="-mt-1 text-xs text-slate-500">La forma de la cúpula no cambia: el techo solar y las ventanas se dibujan sobre ella. Detrás de donde empieza, lo alto de la cúpula es un panel solar opaco (da sombra a las cabezas: menos calor dentro en verano); por los lados, encima de la ventana. Delante, el parabrisas pasa por encima hasta el panel.{T.tSolarCola === 'si' ? ' Por detrás, el panel sigue por lo alto de la cola hasta su punta, como en el Aptera; con el portón, la parte de encima del portón se levanta con él (con la tapa del maletero, con la tapa).' : ''}{puertas ? ' Con las puertas como el Aptera hay montante siempre (la puerta se corta por él), aunque arriba diga «De una pieza».' : ''} El montante sale del borde del cristal, sube y se tumba hacia atrás en una sola curva hasta el techo, como en el Aptera, y sigue como marco entre la ventana y el techo.{modelo.ventanas.marco ? ` Entre el panel y el cristal va un marco de carrocería de ${cm(modelo.ventanas.marco.ancho, 0)}: arriba del parabrisas y a lo largo de los dos carriles del techo (${fmt(modelo.marcoTecho)} m² de laminado en lugar de panel).` : ''} Panel: {res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m², ${Math.round(res.solarPico)} W a pleno sol, unos ${fmt(res.solarDia / 1000)} kWh al día (estimado)` : 'ninguno'}; cristal: {fmt(res.areas.cristal)} m².</p>}
          {bloque === 'Techo solar' && <p className="-mt-1 text-xs text-slate-500">{res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m² de panel: ${Math.round(res.solarPico)} W a 1000 W/m², y de media unos ${fmt(res.solarDia / 1000)} kWh al día (${fmt(P.sol, 1)} kWh/m² al día sobre plano, el panel curvo recoge un 70 % de eso, células al ${Math.round(0.21 * 100)} % y un 15 % de pérdidas). ${Math.round(res.masas['Paneles solares'] ?? 0)} kg de panel, sobre laminado de carrocería en lugar del cristal.` : 'Sin techo solar: la cúpula es toda de cristal (se mueve en Carrocería › Techo solar y ventanas).'}</p>}
          {bloque === 'Motor' && cuatro && <p className="-mt-1 text-xs text-slate-500">Dos motores de buje, uno en cada rueda trasera, sin cadena ni correa, con un controlador doble bajo el sillín del pasajero. Cada uno da la mitad de la potencia, así que en cada llanta cabe el doble que con una rueda: en una rueda de ciclomotor unos {RUEDAS_TRICICLO['24'].kWBuje} kW de pico por rueda; en una llanta de coche de 15″, unos {RUEDAS_TRICICLO.c15.kWBuje}. «Motores de buje» es la masa de los dos juntos: su rango es el de dos motores de media potencia, con la misma regla de kilos por kW que con uno (cada motor lleva su base, así que dos pesan algo más que uno del doble).</p>}
          {bloque === 'Motor' && !cuatro && <p className="-mt-1 text-xs text-slate-500">Motor de buje en la rueda trasera, sin cadena ni correa, con su controlador bajo el sillín del pasajero. Su masa y la del controlador siguen a la potencia máxima (su rango se mueve con ella). En una rueda de ciclomotor caben unos {RUEDAS_TRICICLO['24'].kWBuje} kW de pico; en una llanta de coche de 15″, unos {RUEDAS_TRICICLO.c15.kWBuje} (como los motores en rueda del Aptera). Por encima, lo honrado sería un motor en el basculante con correa, como en las motos eléctricas, y eso aquí no se dibuja: la comprobación «Motor de buje» lo avisa.</p>}
          {bloque === 'Batería' && paquete && <p className="-mt-1 text-xs text-slate-500">Un solo paquete a lo largo del bastidor, centrado, apoyado en el fondo de la panza, con los largueros pasando por dentro: {Math.round(limitarTriciclo('tBatAncho', T))} % del ancho del bastidor (de cara exterior a cara exterior de los largueros), así que sobresale {Math.round((limitarTriciclo('tBatAncho', T) - 100) / 2)} % de ese ancho a cada lado. Su tamaño decide su capacidad: {Math.round(rt.bateria.litros)} L × {Math.round(T.tWhL)} Wh/L = {fmt(modelo.kWh, 1)} kWh y {Math.round(rt.bateria.kg)} kg (el deslizador «Batería» solo la muestra). Donde pasa, es el suelo: los pies y los asientos se apoyan encima. Empieza detrás de la cuna de la suspensión delantera; su largo y su ancho llegan hasta lo que cabe en la carrocería (el largo, ahora, hasta {m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tBatLargo')!, T).max)}), y lo que toca por el camino lo dicen las comprobaciones: el controlador, que va justo detrás, y la torreta del amortiguador{cuatro ? '' : ', la rueda trasera'}, los asientos de encima, la piel. Su masa cuenta en su sitio para el peso, el centro de gravedad, el vuelco y los largueros.</p>}
          {bloque === 'Batería' && !paquete && <p className="-mt-1 text-xs text-slate-500">Primero en el morro, donde el Cuadriciclo en rombo lleva la rueda delantera ({Math.round(rt.bateria.litrosMorro)} L), luego en un módulo estrecho entre los pies del piloto; si hace falta más, el módulo del morro sube, crece hacia la punta y queda un módulo plano bajo los sillines. Ahora: {Math.round(rt.bateria.litros)} L y {Math.round(rt.bateria.kg)} kg{rt.bateria.litros - rt.bateria.cabe > 0.05 ? `: caben ${Math.round(rt.bateria.cabe)} L, faltan ${Math.round(rt.bateria.litros - rt.bateria.cabe)} (un morro más largo, una carrocería más ancha o celdas más densas)` : ''}.</p>}
        </Bloque>
      ))}

      {dep === 'carroceria' && (
        <Bloque titulo="Lo que se mide" nota="estimación">
          {dl([
            ['Área frontal (todo)', `${fmt(rt.area.total)} m²`], ['  la carrocería', `${fmt(rt.area.cuerpo)} m²`], [cuatro ? '  + carenados y brazos (delante y detrás)' : '  + carenados delanteros y brazos', `${fmt(rt.area.carenados)} m²`], [cuatro ? '  + ruedas (lo que asoma)' : '  + ruedas y faldón (lo que asoma)', `${fmt(rt.area.ruedas)} m²`],
            ['Volumen de la carrocería', `${fmt(rt.vol)} m³`], ['Piel de la carrocería', `${fmt(rt.piel - rt.cristal)} m²`], ['Cristal de la cúpula', `${fmt(rt.cristal)} m²`],
            ['Masa: carrocería, carenados y cúpula', `${fmt((res.masas['Carrocería'] ?? 0) + (res.masas['Carenados y brazos delanteros'] ?? 0) + (res.masas['Carenados y brazos traseros'] ?? 0) + (res.masas['Cúpula'] ?? 0), 1)} kg`],
            ['Cd del túnel (estimado)', cdTexto],
          ])}
        </Bloque>
      )}
      {dep === 'chasis' && (
        <Bloque titulo="Estructura" nota="estimación">
          {dl([['Masa del bastidor (con uniones)', `${fmt(res.masas['Bastidor'] ?? 0, 1)} kg`], ['Momento máx. en los largueros', `${Math.round(rt.bastidor.M)} N·m`], ['Tensión dinámica (×2,5)', `${Math.round(rt.bastidor.tension)} MPa`], ['Coeficiente de seguridad', fmt(rt.bastidor.seguridad, 2)]])}
          <p className="text-xs text-slate-500">Los dos largueros como una viga entre la cuna delantera y {modelo.larguerosTraseros ? 'la cuna trasera, en el eje trasero' : cuatro ? 'la torreta del amortiguador' : 'el pivote del basculante'}, con los ocupantes, sus asientos y la batería encima, y 2,5 veces su peso por los baches (como en el Aeromóvil 1). El resto del bastidor no se cuenta: ayuda, así que el real aguanta algo más.</p>
        </Bloque>
      )}
      {(dep === 'rodaje' || dep === 'proyecto') && (
        <Bloque titulo="Vuelco" nota={`${fmt(rt.vuelco.ssf)} g ${nOcc === 2 ? 'con dos' : conN}`}>
          {dl([
            [`Lo tumba, ${conN}`, `${fmt(rt.vuelco.ssf)} g`], ['Lo tumba, con el piloto solo', `${fmt(rt.vuelco.ssfSolo)} g`],
            ['Centro de gravedad: altura', cm(rt.cg.y, 0)], ['  detrás del eje delantero', m2(modelo.xF - rt.cg.x)], ['  peso sobre las ruedas delanteras', `${Math.round(rt.vuelco.repartoDel * 100)} %`],
            ['Radio de giro (rueda de fuera)', m2(rt.giro.radio)], ['Ruedas a tope: dentro · fuera', `${Math.round(rt.giro.dentro)}° · ${fmt(rt.giro.fuera, 1)}°`],
          ])}
          {cuatro && <p className="text-xs text-slate-500">Con cuatro ruedas, umbral de vuelco = vía efectiva ÷ (2 × altura del centro de gravedad), con la vía efectiva entre la de delante ({m2(modelo.via.del)}) y la de detrás ({m2(modelo.via.tras)}) según el peso que lleva cada eje: la aceleración lateral, en g, a la que una curva lo tumbaría sobre las dos ruedas de fuera. Un neumático de ciclomotor agarra unos {fmt(AGARRE, 1)} g en seco: por debajo de eso vuelca antes de derrapar (rojo); se pide {fmt(VUELCO_OBJETIVO)} g porque el cálculo es de un sólido rígido. Con la misma vía delante y detrás, es la mitad de la vía entre la altura del centro de gravedad, como en un coche: mucho más que con una rueda detrás, que solo apoya en un punto del centro. Solo giran las de delante: el radio de giro es el mismo.</p>}
          {!cuatro && <p className="text-xs text-slate-500">Umbral de vuelco = vía × distancia del centro de gravedad al eje trasero ÷ (2 × altura del centro de gravedad × batalla): la aceleración lateral, en g, a la que una curva lo tumbaría sobre una rueda delantera y la trasera. Un neumático de ciclomotor agarra unos {fmt(AGARRE, 1)} g en seco: por debajo de eso vuelca antes de derrapar (rojo). Se pide {fmt(VUELCO_OBJETIVO)} g porque el cálculo es de un sólido rígido: la suspensión y los neumáticos, al ceder, lo bajan un 10-15 %. Más vía, el eje delantero más atrás, la batería más pesada o los sillines más bajos lo suben; más altura libre al suelo y más ocupantes, sobre todo detrás, lo bajan.</p>}
        </Bloque>
      )}
      {(dep === 'propulsion' || dep === 'energia' || dep === 'proyecto') && rendimiento}
      {(dep === 'interior' || dep === 'proyecto') && (
        <Bloque titulo="Maletero" nota={`${Math.round(rt.maletero.ahora)} L ahora`}>
          {dl(rt.maletero.estados.map(e => [e.nombre.charAt(0).toUpperCase() + e.nombre.slice(1), `${Math.round(e.litros)} L`] as [string, string]))}
          <p className="text-xs text-slate-500">Volumen geométrico: el hueco dentro de la carrocería (2 cm por dentro de la piel, hasta el techo de la cúpula) detrás del respaldo {filas ? 'del piloto' : 'del pasajero'}, sobre el suelo, menos el sitio de cada pasajero sentado (de la punta de sus pies a su respaldo), {cuatro ? 'la torreta del bastidor (las ruedas traseras van fuera, en sus carenados)' : 'la rueda trasera con su recorrido, la torreta del amortiguador'} y la batería. No es el método oficial de los fabricantes (VDA, con bloques de un litro), que para la misma forma da un 15-25 % menos. Se abre con «Abrir maletero», abajo en el 3D: {conPortonAptera(T) ? 'un portón largo como el del Aptera, con la bisagra en el techo cerca de su punto más alto, que levanta la luna, el techo de atrás y lo alto de la cola (se entra al maletero desde encima de los asientos de atrás)' : 'la tapa es lo alto de la cola, detrás de la cúpula, con la bisagra en la punta de la cúpula'}. Estimación sobre este modelo, no medida.</p>
        </Bloque>
      )}

      <Bloque titulo={dep === 'proyecto' ? 'Comprobaciones' : 'Comprobaciones de este departamento'} nota={checks.length ? (malas ? `${malas} por revisar` : 'todo cabe') : ''}>
        {checks.length ? <ListaComprobaciones lista={checks} /> : <p className="text-xs text-slate-500">Este departamento no tiene comprobaciones propias: todas están en «Proyecto».</p>}
        {(dep === 'interior' || dep === 'proyecto') && <p className="text-xs text-slate-500">Cabezas: un hombre sentado, sin casco, de talla media (91,8 cm sentado erguido) y alta (97,7 cm, percentil 95; ANSUR II, 2012); el tronco reclinado lo que diga su respaldo y la cabeza un tercio de eso. Se mide de la parte de arriba y de atrás del cráneo a la cara de dentro del cristal. El alcance compara del hombro al puño con un brazo de 58 cm, con los codos algo doblados.</p>}
      </Bloque>
    </>
  );
}

const ICONO_DEP: Record<IdDepartamento, typeof Box> = { proyecto: ClipboardList, carroceria: Car, chasis: Frame, rodaje: CircleDot, propulsion: Zap, energia: BatteryCharging, interior: Armchair, accesos: DoorOpen, luces: Lightbulb, fabricacion: Factory, homologacion: ShieldCheck };
/** Qué capas del 3D son de cada departamento (para «Mostrar solo …»). Sin entrada = se ve todo. */
const CAPAS_DEP: Partial<Record<IdDepartamento, CapaId[]>> = {
  carroceria: ['carenado', 'cristales', 'solar'], chasis: ['chasis'], rodaje: ['suspension', 'direccion', 'ruedas'], propulsion: ['motor', 'transmision'],
  energia: ['baterias', 'solar'], interior: ['asientos', 'ocupantes', 'direccion'], accesos: ['carenado', 'cristales'], luces: ['carenado'],
};
/**
 * Round 3 interior (2026-11-12, Eugenio: «en cada uno de los selectores… que aparezca encima de los sliders un botón que
 * sea ver solo motor, o ver solo rodaje, o ver solo chasis… y que aparezca solo, se oculte todas las otras capas»): the
 * Triciclo's own layers per department (its steering rack is running gear; its interior, the seats, wheel and dashboard).
 */
const CAPAS_DEP_TRICICLO: Record<DepTriciclo, CapaId[]> = {
  carroceria: ['carenado', 'cristales', 'solar'], interior: ['asientos', 'ocupantes'], chasis: ['chasis'], rodaje: ['suspension', 'direccion', 'ruedas'], propulsion: ['motor'], energia: ['baterias', 'solar'],
};
const VISTAS_NOMBRE: Record<Vista, string> = { iso: '3/4', side: 'Lateral', top: 'Planta', front: 'Frontal', back: 'Trasera' };
const SOLO_DEP: Partial<Record<IdDepartamento, string>> = { carroceria: 'la carrocería', chasis: 'el chasis', rodaje: 'el rodaje', propulsion: 'el motor', energia: 'la energía', interior: 'el interior', accesos: 'los accesos', luces: 'la carrocería' };
const NOMBRE_CORTO: Record<IdDepartamento, string> = { proyecto: 'Proyecto', carroceria: 'Carrocería', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Energía', interior: 'Interior', accesos: 'Accesos', luces: 'Luces', fabricacion: 'Fabricación', homologacion: 'Homologación' };

/**
 * The departments as a row of tabs IN the top bar (2026-11-12, Eugenio: «Me gustaba cómo estaba antes el menú de
 * carrocería, chasis, rodaje, motor, etcétera. Estaba desplegado debajo del menú superior y se podía pinchar e ir
 * cambiando… ese menú ponlo en la parte superior y el actual menú pliégalo»). The same tabs as before 383754a
 * (icon over a short name, the one open in teal, its one-liner as `title`), now the bar's own row; the sections
 * (Diseño 3D, Tareas…) fold into `MenuSecciones`. On a phone the row scrolls sideways.
 * Vehicles without departments (the Gota, the Cuadriciclo en rombo) have no tabs: the bar keeps only the logo and the menu.
 */
function PestanasDepartamento({ lista, dep, alElegir }: { lista: { id: IdDepartamento; lema: string }[]; dep: IdDepartamento | null; alElegir: (d: IdDepartamento) => void }) {
  return (
    <nav aria-label="Departamentos" className="order-last flex w-full min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none] sm:order-none sm:w-auto sm:flex-1 [&::-webkit-scrollbar]:hidden">
      {lista.map(d => { const Icono = ICONO_DEP[d.id], activo = dep === d.id; return (
        <Button key={d.id} variant="ghost" aria-pressed={activo} onClick={() => alElegir(d.id)} title={d.lema}
          className={cn('shrink-0 flex-col gap-0.5 px-2.5 py-1 text-[11px] normal-case tracking-normal', activo ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-600')}>
          <Icono className="h-4 w-4" />{NOMBRE_CORTO[d.id]}
        </Button>); })}
    </nav>
  );
}
/** The page's sections (Diseño 3D, Componentes, Tareas, Plan, Planos, Exportar), folded into one menu at the end of the bar (2026-11-12). */
function MenuSecciones({ lista, seccion, abiertas, alIr }: { lista: typeof SECCIONES; seccion: Seccion; abiertas?: number; alIr: (ruta: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);
  const actual = lista.find(s => s.k === seccion) ?? lista[0], Icono = actual.icono;
  return (
    <div ref={caja} className="relative shrink-0">
      <Button variant="outline" aria-expanded={abierto} aria-haspopup="menu" aria-label={`Sección: ${actual.n}`} title="Secciones" onClick={() => setAbierto(a => !a)}
        className={cn('gap-1.5 px-2.5 py-1.5 text-sm normal-case tracking-normal text-slate-800', abierto && 'bg-slate-100')}>
        <Icono className="h-4 w-4 shrink-0" /><span className="hidden whitespace-nowrap lg:inline">{actual.n}</span>
        {abiertas ? <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold tabular-nums text-white">{abiertas}</span> : null}
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', abierto && 'rotate-180')} />
      </Button>
      {abierto && (
        <div role="menu" aria-label="Secciones" className="absolute right-0 top-full z-40 mt-1 max-h-[75vh] w-[min(92vw,260px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {lista.map(s => { const I = s.icono, activa = seccion === s.k; return (
            <Button key={s.k} variant="ghost" role="menuitemradio" aria-checked={activa} onClick={() => { alIr(s.ruta); setAbierto(false); }}
              className={cn('w-full justify-start gap-2.5 px-2 py-1.5 text-left text-sm normal-case tracking-normal', activa ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-800')}>
              <I className="h-4 w-4 shrink-0" /><span className="flex-1">{s.n}</span>
              {s.k === 'tareas' && abiertas ? <span className={cn('rounded-full px-1.5 text-[11px] font-bold tabular-nums', activa ? 'bg-white text-slate-900' : 'bg-amber-500 text-white')}>{abiertas}</span> : null}
            </Button>); })}
        </div>
      )}
    </div>
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
  // (2026-11-13) The garage keeps every saved version too. A save of a design that is no longer the open one (an
  // automatic save still on its way when another design was opened) only updates the garage: it used to make that
  // design the open one again, with the other design's parameters, which the next automatic save would write over it.
  const garajeRef = useRef<{ actualizar: (d: Diseno, junto?: number | null) => void; tiene: (id: number) => boolean } | null>(null);
  const actualRef = useRef(actual); actualRef.current = actual;
  const alGuardado = useCallback((d: Diseno) => {
    const antes = actualRef.current;
    garajeRef.current?.actualizar(d, antes?.id ?? null);
    if (antes && antes.id !== d.id && garajeRef.current?.tiene(d.id)) return;
    setActual({ id: d.id, nombre: d.nombre, base: JSON.stringify(aDiseno(deDiseno(d.parametros || {}))) });
  }, []);
  const guardadoWeb = useAutoguardado(P, actual, alGuardado);
  // Los valores del diseño por defecto (el «Aptera Like»): el punto medio de cada deslizador (2026-11-07, Eugenio).
  const [D, setD] = useState<Parametros>(PARAMETROS_POR_DEFECTO);
  useEffect(() => { cargarDisenoPorDefecto().then(d => { if (d) setD(deDiseno(d.parametros || {})); }); }, []);
  // Quien llega por primera vez (sin nada guardado en este navegador) abre el
  // diseño por defecto de la web, si hay uno (2026-11-06, Eugenio).
  useEffect(() => {
    // 2026-11-10 (Eugenio): the Triciclo Bala became the default design and he wanted it to open on load.
    // A browser that already had a design open would keep it, so each browser opens the default once more.
    const UNA_VEZ = 'aeromovil.inicio.triciclo';
    let hayAlgo = false, yaAbierto = true;
    try { hayAlgo = !!localStorage.getItem(CLAVE) || !!localStorage.getItem('aeromovil.diseno'); yaAbierto = !!localStorage.getItem(UNA_VEZ); localStorage.setItem(UNA_VEZ, '1'); } catch { /* sin almacenamiento */ }
    if ((hayAlgo && yaAbierto) || new URLSearchParams(loc.search).get('diseno')) return;
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
  // (2026-11-13: the body's colours are not shape: a change of colour alone keeps the same parameters for the model, so
  // the 3D is not rebuilt; the viewer recolours its materials from `colores`)
  const sinColor = useRef<Parametros | null>(null);
  const Pforma = useMemo(() => {
    const a = sinColor.current, cambia = (k: string) => (a as unknown as Record<string, unknown>)[k] !== (P as unknown as Record<string, unknown>)[k];
    if (a && a !== P && !Object.keys({ ...a, ...P }).some(k => !(CLAVES_COLOR as readonly string[]).includes(k) && cambia(k))) return a;
    return (sinColor.current = P);
  }, [P]);
  const colores = useMemo(() => coloresDe(P), [P]);
  const Pa = useMemo(() => ajustarCarenado(Pforma), [Pforma]);
  const modelo = useMemo(() => crearModelo(Pa), [Pa]);
  // The Bala's figures take ~30 ms (frontal area, clearances): while a slider is dragged they may lag a frame behind
  // the 3D, so the slider never waits for them. Only within the same vehicle: switching computes at once.
  const diferido = useDeferredValue(modelo);
  const paraCalcular = (modelo.tipo === 'bala' || modelo.tipo === 'triciclo') && diferido.tipo === modelo.tipo ? diferido : modelo;
  const res = useMemo(() => calcular(paraCalcular, areas(paraCalcular)), [paraCalcular]);
  const esA1 = modelo.tipo === 'a1', esBala = modelo.tipo === 'bala', esTri = modelo.tipo === 'triciclo';
  // 2026-11-11: a Triciclo with two rear wheels is the «Cuadriciclo Bala clásico» wherever its name shows
  const nombreVehiculo = esA1 ? 'Aeromóvil 1' : esBala ? 'Cuadriciclo Bala en rombo' : esTri ? nombreTriciclo(camposTriciclo(P)) : 'Aeromóvil Gota';
  const NOMBRE_VISTA: Record<Vista, string> = { iso: 'tres cuartos delantera', side: 'lateral', top: 'planta (desde arriba)', front: 'frontal', back: 'trasera' };
  // «Pedir render» (2026-11-07, Eugenio: «quita lo de crear render con Gemini,
  // que gasta dinero; mantenlo bajo una petición a Claude Code con nuestra
  // suscripción»): se descarga la captura de la vista actual y se deja una
  // tarea en «Tareas» con el diseño, la vista y la descripción, para que la
  // atienda la sesión de Claude Code. Claude no genera imágenes: lo que puede
  // hacer con esa petición es mejorar el 3D o preparar el encargo; se dice en pantalla.
  const pedirRender = async () => {
    if (!visor.current || render.estado === 'creando') return;
    setRender({ estado: 'creando', vista });
    try {
      const captura = await visor.current.capturar();
      const url = URL.createObjectURL(captura); const a = document.createElement('a'); a.href = url; a.download = `${nombreVehiculo.replace(/\s+/g, '_')}_${vista}_${new Date().toISOString().slice(0, 10)}.jpg`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      let autor = ''; try { autor = localStorage.getItem('aeromovil.autor') || ''; } catch { /* nada */ }
      const texto = `Render pedido: vista ${NOMBRE_VISTA[vista]} del diseño «${actual?.nombre ?? 'sin guardar'}» (${nombreVehiculo}, ${m2(modelo.Lf)} × ${m2(modelo.P.W)} × ${m2(modelo.P.H)}). La captura se descargó en el navegador de quien lo pidió; adjuntarla a la sesión de Claude Code.`;
      const r = await fetch('/api/aeromovil/tareas', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, area: 'planos', autor, web: '' }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se ha podido apuntar la petición.');
      setRender({ estado: 'listo', vista });
    } catch (e: any) {
      setRender({ estado: 'error', error: e?.message || 'No se ha podido pedir el render.', vista });
    }
  };
  const porDefecto = JSON.stringify(aDiseno(Pa)) === JSON.stringify(aDiseno(PARAMETROS_POR_DEFECTO));
  // Cambiar de vehículo carga su juego de medidas: los dos no comparten deslizadores.
  const cambiarVehiculo = (k: Disposicion) => { if (k !== P.disposicion) { setP(k === 'cuatro' ? PARAMETROS_A1 : k === 'bala' ? PARAMETROS_BALA : k === 'triciclo' ? PARAMETROS_TRICICLO : PARAMETROS_GOTA); setActual(null); } };

  const [visibles, setVisibles] = useState<Record<CapaId, boolean>>(() => Object.fromEntries(CAPAS.map(c => [c.k, true])) as Record<CapaId, boolean>);
  const [rayosX, setRayosX] = useState(false);
  const [corte, setCorte] = useState(false);
  const [curva, setCurva] = useState(false);
  const [verCotas, setVerCotas] = useState(false);   // apagadas al cargar (2026-11-06, Eugenio)
  const [abierta, setAbierta] = useState(false);
  const [maleteros, setMaleteros] = useState(false);
  const [sinPasajero, setSinPasajero] = useState(false);
  const [tunel, setTunel] = useState(false);
  // «Superponer»: los coches del garaje encima del nuestro, alineados por el eje delantero, el morro o la cola.
  const [superponer, setSuperponer] = useState<Alineacion | null>(null);
  const [panelGaraje, setPanelGaraje] = useState(false);
  // Departamento abierto en el lateral y en el panel de abajo (2026-11-06, Eugenio: «el menú dividido por departamentos como una empresa de fabricación»).
  const [soloDep, setSoloDep] = useState(false);     // «Mostrar solo la carrocería», etc.
  const [capasAbierto, setCapasAbierto] = useState(false);
  const [vistaAbierta, setVistaAbierta] = useState(false);
  const [dep, setDep] = useState<IdDepartamento>(() => { try { return (localStorage.getItem('aeromovil.departamento') as IdDepartamento) || 'carroceria'; } catch { return 'carroceria'; } });
  useEffect(() => { try { localStorage.setItem('aeromovil.departamento', dep); } catch { /* sin memoria */ } }, [dep]);
  // «Ver solo …» (round 3 interior, 2026-11-12): leaves only the department's layers; turning it off (or going to
  // «Proyecto», or to another tab) puts back the layers as they were before it was pressed.
  const antesSolo = useRef<Record<CapaId, boolean> | null>(null);
  const verSolo = (si: boolean) => { if (si && !soloDep) antesSolo.current = visibles; setSoloDep(si); };
  const capasSolo = (d: IdDepartamento): CapaId[] | undefined => P.disposicion === 'triciclo' ? (d === 'proyecto' ? undefined : CAPAS_DEP_TRICICLO[d as DepTriciclo]) : CAPAS_DEP[d];
  useEffect(() => {
    const suyas = soloDep && dep !== 'proyecto' ? capasSolo(dep) : undefined;
    if (!suyas) { if (antesSolo.current) { setVisibles(antesSolo.current); antesSolo.current = null; } return; }
    setVisibles(Object.fromEntries(CAPAS.map(c => [c.k, suyas.includes(c.k)])) as Record<CapaId, boolean>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloDep, dep, P.disposicion]);
  // El garaje: qué vehículos se ven y dónde están (eje delantero en el suelo, m). Se recuerda en este navegador.
  type PlazaGaraje = { id: string; visible: boolean; x: number; z: number; giro: number };
  const [garaje, setGaraje] = useState<PlazaGaraje[]>(() => {
    // El Twizy, visible por defecto a 3 m al lado (2026-11-07, Eugenio); la clave v2 hace que también lo vea quien ya tenía el garaje guardado.
    // El Aptera, al otro lado a 3 m (2026-11-07, «ponlo en el garaje junto a los otros dos»). Quien ya tenía el
    // garaje guardado también lo ve: su lista guardada no lo trae y se queda con este valor.
    // Los dos XL1 (2026-11-09, Eugenio, con fotos): el de serie de 2013 enfrente del Twizy y el concept 1-Litro de 2002 al otro lado.
    // 2026-11-09, «añade el jaguar… y el velomovil aerorider» y «también este de Shell Eco Marathon»: el SZEmission,
    // el Jaguar D-Type y el AeroRider salen también por defecto, más allá de los cuatro anteriores.
    // 2026-11-12: the Tesla Model Y, shown at −15 m. A saved v5 list does not carry it, so it shows for everybody once.
    const POR_DEFECTO: Record<string, { z: number }> = { twizy: { z: 3 }, aptera: { z: -3 }, xl1: { z: 6 }, unlitro: { z: -6 }, szemission: { z: 9 }, jaguarD: { z: -9 }, aerorider: { z: 12 }, bala: { z: -12 }, nusKruce: { z: 15 }, modeloY: { z: -15 } };
    const base = VEHICULOS_GARAJE.map((v, i) => POR_DEFECTO[v.id] ? { id: v.id, visible: true, x: 0, z: POR_DEFECTO[v.id].z, giro: 0 } : ({ id: v.id, visible: false, x: 0, z: (i % 2 ? 1 : -1) * (2.6 + 2.2 * Math.floor(i / 2)), giro: 0 }));
    // v3 (2026-11-07): el XL1 deja de ser una caja y sale por defecto. En la lista v2 guardada estaba oculto,
    // así que al pasar de v2 a v3 se olvida solo lo que se guardó del XL1 (el resto se conserva).
    // v4 (2026-11-09): lo mismo con el Jaguar, que hasta hoy era una caja oculta: se olvida solo su plaza guardada.
    // v5 (2026-11-09): el garaje vuelve una vez a la colocación por defecto. Las listas guardadas traían las plazas de
    // colocaciones anteriores, y una plaza vieja puede ser la plaza nueva de otro coche: a Eugenio, el 1-Litro guardado
    // a −9 m quedó dentro del Jaguar nuevo («falta el XL1 concept», «tienes mal puesto las etiquetas»). Además vuelve el
    // XL1 de serie en lugar del Concept 2011.
    const leer = (clave: string) => { try { const g = JSON.parse(localStorage.getItem(clave) || 'null'); return Array.isArray(g) ? g : null; } catch { return null; } };
    const guardado: any[] = leer('aeromovil_garaje_v5') ?? [];
    return separarGaraje(base.map(b => ({ ...b, ...(guardado.find((x: any) => x?.id === b.id) || {}) })));
  });
  useEffect(() => { try { localStorage.setItem('aeromovil_garaje_v5', JSON.stringify(garaje)); } catch { /* sin memoria */ } }, [garaje]);
  // Comparar gasto (túnel y «Cd y consumo»): las mismas filas y la misma velocidad para la tarjeta y los carteles.
  const [kmhComparar, setKmhComparar] = useState(80);
  const [verConsumo, setVerConsumo] = useState(false);
  // Túnel de viento calculado (2026-11-09): los cuerpos que pasan por él, lo que se elige en la tarjeta y los resultados.
  // El Cd que usan el consumo y el resto del editor no cambia: el del túnel se pone al lado.
  const [opcionesTunel, setOpcionesTunel] = useState<OpcionesTunel>(opcionesPorDefecto);
  const opcionesTunelVisor = useMemo(() => ({ ...opcionesTunel, kmh: kmhComparar }), [opcionesTunel, kmhComparar]);
  // De quién es el Aeromóvil (el creador de su página en el menú lateral) y si quien mira puede decidir.
  const [dueno, setDueno] = useState<Dueno | null>(null);
  useEffect(() => { cargarDueno().then(setDueno).catch(() => setDueno(null)); }, []);
  // ── The garage in two rows (2026-11-13) ──────────────────────────────────
  // Every saved design in the first row (the one being edited at the origin), the reference cars on show in the second,
  // behind (`garaje/filas.ts`). Our designs: not in the tunnel or the overlay. Picking one opens it (`eleccion`).
  const disenosGaraje = useDisenosGaraje({
    activo: { id: actual?.id ?? null, nombre: actual?.nombre ?? 'Sin guardar', morro: modelo.xn, cola: modelo.xt, ancho: modelo.P.W },
    referencias: useMemo(() => garaje.filter(v => v.visible).map(v => v.id), [garaje]),
    resolucion: opcionesTunel.resolucion, conCd: tunel || verConsumo, huecoFila2: tunel ? HUECO_CON_TUNEL : undefined,
  });
  garajeRef.current = { actualizar: disenosGaraje.actualizar, tiene: id => !!disenosGaraje.lista?.some(d => d.id === id) };
  const eleccion = useEleccionDiseno({
    g: disenosGaraje, P, actual, abrirDiseno, sinGuardar: () => setActual(null), puedeDecidir: !!dueno?.puedeDecidir,
    nombreVehiculo, morro: modelo.xn, cola: modelo.xt,
  });
  // `?garaje=xl1`: mirar un modelo del garaje a solas, en el origen (para comprobarlo mientras se modela).
  const soloUrl = useMemo(() => new URLSearchParams(window.location.search).get('garaje'), []);
  // «Solo mostrar este» on a reference car shows it alone, as `?garaje=` does (2026-11-13)
  const soloGaraje = soloUrl || (eleccion.solo && eleccion.solo !== 'activo' ? eleccion.solo : null);
  const garajeVisor = useMemo(() => {
    if (soloGaraje) return [{ id: soloGaraje, x: 0, z: 0, giro: 0 }];
    const visibles = garaje.filter(v => v.visible);
    // (2026-11-13) in the second row, behind our designs; a car the rows could not place keeps its old place
    if (!superponer) return visibles.map(v => { const p = disenosGaraje.plazas.get(v.id); return p ? { id: v.id, x: p.x, z: p.z, giro: 0 } : { id: v.id, x: v.x, z: v.z, giro: v.giro }; });
    // Superpuestos: todos en el eje del nuestro; el morro y la cola salen de la silueta de cada coche.
    return visibles.map(v => {
      const env = VEHICULOS_GARAJE.find(d => d.id === v.id)?.envolvente, xs = env?.map(e => e[0]) ?? [0];
      const x = superponer === 'morro' ? modelo.xn - Math.max(...xs) : superponer === 'cola' ? modelo.xt - Math.min(...xs) : 0;
      return { id: v.id, x, z: 0, giro: 0 };
    });
  }, [garaje, soloGaraje, superponer, modelo.xn, modelo.xt, disenosGaraje.plazas]);
  const garajeConDisenos = useMemo(() => (eleccion.solo === 'activo' && !soloUrl ? [] : superponer || soloGaraje ? garajeVisor : [...garajeVisor, ...disenosGaraje.visor]), [garajeVisor, disenosGaraje.visor, superponer, soloGaraje, soloUrl, eleccion.solo]);

  // The Triciclo's Cd: the tunnel's, numbers only, in the background, at its calculation speed (its results and consumption use it).
  const cdTri = useCdTriciclo(paraCalcular, opcionesTunel.resolucion, esTri ? camposTriciclo(P).tVel : 80);
  const cdTriComparar = useCdTriciclo(paraCalcular, opcionesTunel.resolucion, kmhComparar);
  // The Triciclo's departments: the A1's choice is kept, but one the Triciclo does not have shows «Carrocería».
  const depTri: DepTriciclo | 'proyecto' = dep === 'proyecto' || (DEPS_TRICICLO as string[]).includes(dep) ? dep as DepTriciclo | 'proyecto' : 'carroceria';
  useEffect(() => { if (esTri && dep !== depTri) setDep(depTri); }, [esTri, dep, depTri]);
  const cuerposTunel = useMemo<CuerpoTunel[]>(() => !tunel ? [] : [
    ...(soloGaraje ? [] : [cuerpoAeromovil(modelo, res.A, nombreVehiculo)]),
    ...garajeVisor.flatMap(v => { const c = cuerpoGaraje(v); return c ? [c] : []; }),
  ], [tunel, soloGaraje, modelo, res.A, nombreVehiculo, garajeVisor]);
  const resultadosTunel = useResultadosTunel(cuerposTunel, opcionesTunel.resolucion, opcionesTunel.lineas);
  /** The tunnel's Cd for our design at the comparison speed, once it is computed (the Bala has no other). */
  const cdTunelNuestro = (() => { const R = resultadosTunel.aeromovil; return R ? (R.porVelocidad.find(q => q.kmh === kmhComparar) ?? R.porVelocidad[1]).cd.total : undefined; })();
  const areaTunelNuestro = cuerposTunel.find(c => c.id === 'aeromovil')?.area;
  const filasComparar = useMemo<FilaTunel[]>(() => [
    ...(soloGaraje ? [] : esTri ? (cdTriComparar.cd != null && cdTriComparar.areaRef != null ? [{
      // the Triciclo: the tunnel's Cd (computed in the background), with its own mass and rolling resistance
      id: 'aeromovil', nombre: nombreVehiculo, cd: cdTriComparar.cd, area: cdTriComparar.areaRef, masa: res.mTot, crr: CRR, estimado: true, origenCd: 'túnel (la carrocería y sus ruedas)',
      fuente: `Este diseño. Cd estimado por el túnel con la carrocería y sus ${esCuatro(camposTriciclo(P)) ? 'cuatro' : 'tres'} ruedas (los carenados y los brazos, solo como ruedas carenadas: el real será algo más alto); masa estimada con dos ocupantes de ${camposTriciclo(P).tMOcc} kg y rodadura ${CRR} (neumático de ciclomotor).`,
    }] : []) : esBala ? (cdTunelNuestro != null && areaTunelNuestro != null ? [{
      // the Bala: no editor formula and no mass, so the tunnel's Cd on the body's area, and air only
      id: 'aeromovil', nombre: nombreVehiculo, cd: cdTunelNuestro, area: areaTunelNuestro, estimado: true, origenCd: 'túnel (solo la carrocería)',
      fuente: 'Este diseño. Cd estimado por el túnel con la carrocería sola: los carenados laterales y sus brazos no entran, así que el real será algo más alto. Sin masa (el chasis, el motor y la batería no están diseñados): solo el aire.',
    }] : []) : [{
      id: 'aeromovil', nombre: nombreVehiculo, cd: res.Cd, area: res.A, masa: res.mTot, crr: res.Crr, estimado: true,
      fuente: `Este diseño. Cd estimado con la fórmula del editor (tómalo como optimista: el VW XL1 da 0,19 con las ruedas traseras carenadas); área medida sobre la forma 3D; masa y rodadura, las del cálculo del editor, con ${P.plazas} ocupante${P.plazas > 1 ? 's' : ''} de ${P.mOcc} kg.`,
    }]),
    ...garajeVisor.flatMap(v => {
      const d = VEHICULOS_GARAJE.find(x => x.id === v.id); if (!d?.aero) return [];
      const a = d.aero, plazas = a.plazas ?? 2;
      return [{
        id: d.id, nombre: d.nombre, cd: a.cd, area: a.area, vmax: a.vmax,
        ...(a.masaVacio != null ? { masa: a.masaVacio + plazas * P.mOcc, crr: 0.009 } : {}),
        fuente: `${a.fuente}. Rodadura 0,009 supuesta (neumáticos de coche, la misma que el Aeromóvil 1) y ${plazas} ocupantes de ${P.mOcc} kg.`,
      }];
    }),
  ], [soloGaraje, esBala, esTri, cdTriComparar.cd, cdTriComparar.areaRef, P, nombreVehiculo, cdTunelNuestro, areaTunelNuestro, res.Cd, res.A, res.mTot, res.Crr, P.plazas, P.mOcc, garajeVisor]);
  // El punto crítico cuya explicación está abierta (2026-11-09, Eugenio: «una explicación de cada uno de estos parámetros cuando se hace click»).
  const [puntoTunel, setPuntoTunel] = useState<SeleccionPunto | null>(null);
  useEffect(() => { if (!tunel) setPuntoTunel(null); }, [tunel]);
  // Carteles encima de cada coche (2026-11-07, Eugenio: «que aparezca con un botón el Cd y consumo en kWh a los 100 km de cada uno»).
  const carteles = useMemo(() => {
    if (!tunel && !verConsumo) return undefined;
    const n = (v: number, d: number) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
    const o: Record<string, string> = {};
    // (2026-11-13, Eugenio: «cuando se pincha en el CD y consumo también pon el peso, y el área frontal de cada vehículo»:
    // a third line, the empty mass and the frontal area the Cd is referred to; ours, the editor's own figures)
    const masaArea = (masa: number | null | undefined, area: number | null | undefined, aprox = false) =>
      [masa != null && masa > 0 ? `${Math.round(masa).toLocaleString('es-ES')} kg en vacío` : null, area != null && area > 0 ? `${aprox ? '≈ ' : ''}${n(area, 2)} m²` : null].filter(Boolean).join(' · ');
    const nuestraMasa = res.mVeh > 0 ? res.mVeh : null;
    for (const f of filasComparar) {
      const c = gastoEnRuedas(f, kmhComparar);
      const d = VEHICULOS_GARAJE.find(x => x.id === f.id), linea = f.id === 'aeromovil' ? masaArea(nuestraMasa, f.area) : masaArea(d?.aero?.masaVacio, f.area);
      // La velocidad y «en las ruedas» los dice la tarjeta o la barra de arriba: el cartel, corto.
      o[f.id] = `${f.nombre}${c.noLlega ? ' *' : ''}\nCd ${n(f.cd, 2)} · ${c.kWhTotal != null ? `${n(c.kWhTotal, 1)} kWh/100 km` : 'sin masa: solo aire'}${linea ? `\n${linea}` : ''}`;
    }
    // Los coches sin Cd publicado (Jaguar D-Type, AeroRider) también llevan su nombre, y dicen que no hay dato; su área, la medida en su modelo («≈»).
    for (const v of garajeVisor) { const d = VEHICULOS_GARAJE.find(x => x.id === v.id); if (d && !o[d.id]) { const l = masaArea(null, cuerpoGaraje(v)?.area, true); o[d.id] = `${d.nombre}\nCd sin publicar${l ? `\n${l}` : ''}`; } }
    // our designs in the garage (2026-11-12): their name and the Cd their card gives
    Object.assign(o, disenosGaraje.carteles);
    // (2026-11-13) with every design in the garage, ours says which design it is, not only its vehicle
    if (actual && o.aeromovil) o.aeromovil = o.aeromovil.replace(/^[^\n*]*/, actual.nombre);
    // El Bala del editor: su Cd solo lo da el túnel.
    if (esBala && !soloGaraje && !o.aeromovil) o.aeromovil = `${nombreVehiculo}\nCd: ábrelo en el túnel\n${masaArea(nuestraMasa, res.A)}`;
    if (esTri && !soloGaraje && !o.aeromovil) { const l = masaArea(nuestraMasa, null); o.aeromovil = `${nombreVehiculo}\nCd: el túnel lo está calculando…${l ? `\n${l}` : ''}`; }
    return o;
  }, [tunel, verConsumo, filasComparar, kmhComparar, garajeVisor, esBala, esTri, soloGaraje, nombreVehiculo, disenosGaraje.carteles, res.mVeh, res.A, actual]);
  const [vista, setVista] = useState<Vista>('iso');
  // Render fotorrealista de la vista actual: la captura del visor pasa por la IA y vuelve como foto
  const [render, setRender] = useState<{ estado: 'nada' | 'creando' | 'listo' | 'error'; imagen?: string; error?: string; vista?: Vista }>({ estado: 'nada' });
  const visor = useRef<VisorHandle | null>(null);
  // Pantalla completa de la ventana 3D (2026-11-09, Eugenio: «que se pueda expandir a pantalla completa con un
  // selector de expansión arriba a la derecha»). Con la pantalla completa del navegador cuando la hay ('api');
  // el iPhone solo la permite para vídeos, y ahí la ventana ocupa toda la pantalla con CSS ('css').
  const ventana3d = useRef<HTMLElement | null>(null);
  const [completa, setCompleta] = useState<'no' | 'api' | 'css'>('no');
  useEffect(() => {
    // Esc, el gesto del sistema o el botón: el navegador avisa siempre por aquí.
    const alCambiar = () => setCompleta(c => document.fullscreenElement && document.fullscreenElement === ventana3d.current ? 'api' : c === 'api' ? 'no' : c);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);
  useEffect(() => {
    if (completa !== 'css') return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setCompleta('no'); };
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [completa]);
  const salirCompleta = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* ya fuera */ }); setCompleta('no'); };
  const alternarCompleta = () => {
    if (completa !== 'no') { salirCompleta(); return; }
    const el = ventana3d.current;
    if (el && document.fullscreenEnabled && typeof el.requestFullscreen === 'function') el.requestFullscreen().then(() => setCompleta('api'), () => setCompleta('css'));
    else setCompleta('css');
  };
  // Pinchar una pieza lleva a su ficha y la ventana 3D se esconde: antes se sale de la pantalla completa.
  useEffect(() => { if (seccion !== 'diseno' && completa !== 'no') salirCompleta(); }, [seccion]); // eslint-disable-line react-hooks/exhaustive-deps
  // Otro velomóvil en el visor: solo, o junto al nuestro para comparar.
  const [referencia, setReferencia] = useState<Referencia | null>(null);
  const [modoRef, setModoRef] = useState<'no' | 'comparar' | 'sola'>('no');
  const [alinear, setAlinear] = useState<'eje' | 'morro' | 'lado'>('eje');

  const [tareas, setTareas] = useState<Tarea[] | null>(null);
  const [errorTareas, setErrorTareas] = useState<string | null>(null);
  // Fetch propio a propósito: el buzón solo lo usa esta página (excepción de src/pages/CLAUDE.md).
  const recargar = useCallback(() => { cargarTareas().then(t => { setTareas(t); setErrorTareas(null); }).catch(e => setErrorTareas(e.message)); }, []);
  useEffect(() => { recargar(); }, [recargar]);
  // (who owns the Aeromóvil: read further up, the garage needs it)
  const abiertas = tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_curso').length;

  useEffect(() => { document.title = `${nombreVehiculo} · humanity.wiki`; }, [nombreVehiculo]);

  const ruedas = (Object.keys(DIAMETRO_RUEDA) as Pulgadas[]).map(k => ({ k, n: `${k}″ (${Math.round(DIAMETRO_RUEDA[k] * 1000)} mm)` }));
  const neumaticos = (Object.keys(NEUMATICOS) as Neumatico[]).map(k => ({ k, n: NEUMATICOS[k].n }));
  const malas = res.comprobaciones.filter(c => c.holgura < c.minimo).length;
  // the garage's list, shared by the sidebar block and the «Garaje» panel inside the 3D view (2026-11-13: in the
  // Triciclo family the block sits at the end of «Proyecto», where Eugenio could not find «Mis diseños»)
  const garajeLista = (
    <ListaGaraje g={disenosGaraje} e={eleccion} actual={actual} nombreVehiculo={nombreVehiculo}
      referencias={VEHICULOS_GARAJE.map(v => ({ id: v.id, nombre: v.nombre, largo: v.largo, visible: !!garaje.find(g => g.id === v.id)?.visible }))}
      alAlternarReferencia={id => setGaraje(g => g.map(x => x.id === id ? { ...x, visible: !x.visible } : x))}
      alElegido={() => { if (window.matchMedia('(max-width: 639px)').matches) setPanelGaraje(false); }} />
  );
  const garajeBloque = (
    <Bloque titulo="Garaje" nota="tus diseños y coches de referencia">
            {garajeLista}
    </Bloque>
  );
  const capas = esBala ? CAPAS.filter(c => CAPAS_BALA.includes(c.k)) : esTri ? CAPAS.filter(c => CAPAS_TRICICLO.includes(c.k)) : CAPAS.filter(c => !('solo' in c) || c.solo === modelo.tipo);
  const a1 = res.a1;
  // the department tabs: the A1's eleven; the Triciclo's six plus «Proyecto», with its own one-liners (which follow its options)
  const pestanas = esTri
    ? DEPARTAMENTOS.filter(d => d.id === 'proyecto' || (DEPS_TRICICLO as string[]).includes(d.id)).map(d => ({ ...d, lema: lemasTriciclo(camposTriciclo(P))[d.id as DepTriciclo | 'proyecto'] }))
    : DEPARTAMENTOS;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        {/* One menu row (2026-11-12, Eugenio: «ese menú ponlo en la parte superior y el actual menú pliégalo… y así no
            tenemos dos menús superiores, solo tenemos uno»): the logo is the vehicle and design menu, the departments are
            the row of tabs (as before 383754a, now in the bar), and the page's sections are one menu at the end.
            Picking a department from another section goes back to the 3D design. */}
        {/* (on a phone the tabs take their own line under the logo, scrolling sideways: beside the logo there was room for one) */}
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1 sm:flex-nowrap sm:gap-3 sm:px-4">
          <MenuDisenos P={P} actual={actual} puedeDecidir={!!dueno?.puedeDecidir} alCargar={d => (seccion === 'diseno' ? void eleccion.elegir(d) : abrirDiseno(d))} estado={guardadoWeb} alLista={disenosGaraje.ponerLista}
            nombreVehiculo={nombreVehiculo} alVehiculo={cambiarVehiculo}
            alNuevo={() => { setP(PARAMETROS_POR_DEFECTO); setActual(null); cargarDisenoPorDefecto().then(d => { if (d) { setP(deDiseno(d.parametros || {})); setActual(null); } }); }}
            alGuardado={alGuardado} />
          {(esA1 || esTri)
            ? <PestanasDepartamento lista={pestanas} dep={seccion === 'diseno' ? (esTri ? depTri : dep) : null} alElegir={d => { setDep(d); setSoloDep(false); if (seccion !== 'diseno') navegar('/aeromovil'); }} />
            : null}
          <div className="flex-1 sm:hidden" />
          {!(esA1 || esTri) && <div className="hidden flex-1 sm:block" />}
          <MenuSecciones lista={SECCIONES.filter(s => (s.k !== 'componentes' && s.k !== 'aranceles') || esA1)} seccion={seccion} abiertas={abiertas} alIr={navegar} />
        </div>
      </header>

      {/* El diseño se queda montado aunque se mire otra vista: así «Exportar» puede sacar el STL de lo que se ve. */}
      <main className={cn('mx-auto max-w-[1600px] gap-4 px-4 py-4', seccion === 'diseno' ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px]' : 'hidden')}>
        <div className="min-w-0">
        <section ref={ventana3d} aria-label="Vista 3D" className={cn('overflow-hidden bg-slate-50',
          completa === 'no' ? cn('relative h-[62vh] min-h-[380px] rounded-xl border border-slate-200', esA1 ? 'lg:h-[72vh]' : 'lg:sticky lg:top-[68px] lg:h-[calc(100vh-88px)]')
            : completa === 'css' ? 'fixed inset-0 z-[100] h-[100dvh] w-screen' : 'relative h-full w-full')}>
          <Visor3D ref={visor} modelo={modelo} visibles={visibles} rayosX={rayosX} corte={corte} curva={curva} cotas={verCotas} abierta={abierta} maleteros={maleteros} sinPasajero={sinPasajero} garaje={garajeConDisenos} soloGaraje={!!soloGaraje} tunel={tunel} carteles={carteles} cuerposTunel={cuerposTunel} opcionesTunel={opcionesTunelVisor} alElegirPuntoTunel={setPuntoTunel} puntoTunel={puntoTunel} fichasGaraje={disenosGaraje.fichas} superponer={!!superponer && !soloGaraje} vista={vista}
            referencia={referencia} modoRef={modoRef} alinear={alinear} alPinchar={esA1 ? c => { navegar(`/aeromovil/componentes/${c}`); window.scrollTo({ top: 0 }); } : undefined}
            alPincharGaraje={eleccion.alPincharGaraje} alPincharNuestro={() => { eleccion.setTarjeta(true); eleccion.setPendiente(null); }} extraTarjeta={id => <BotonSoloReferencia e={eleccion} id={id} />}
            seguir={eleccion.seguir} nombres={soloUrl ? undefined : disenosGaraje.nombres} resaltarNuestro={disenosGaraje.enFila > 0} verGaraje={panelGaraje && !soloGaraje}
            margenDerecho={panelGaraje && typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 352 : 0}
            colores={colores} />
          {/* La esquina de arriba a la derecha es del botón de pantalla completa: las tarjetas se apartan a su izquierda
              (en el móvil, debajo, que de ancho no caben). */}
          <Button variant="outline" onClick={alternarCompleta} aria-pressed={completa !== 'no'}
            aria-label={completa !== 'no' ? 'Salir de la pantalla completa' : 'Ver en pantalla completa'}
            title={completa !== 'no' ? 'Salir de la pantalla completa (Esc)' : 'Ver en pantalla completa'}
            className="absolute right-3 top-3 z-[15] bg-white px-1.5 py-1.5 shadow-sm">
            {completa !== 'no' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {/* «Garaje»: the reference cars and «Mis diseños», reachable from any department and in full screen */}
          <Button variant="outline" onClick={() => setPanelGaraje(v => !v)} aria-pressed={panelGaraje} aria-expanded={panelGaraje}
            title="Tus diseños y los coches de referencia: cuáles se ven y cuál editas"
            className={cn('absolute right-14 top-3 z-[15] gap-1.5 bg-white px-2.5 py-1.5 text-xs normal-case tracking-normal shadow-sm', panelGaraje && 'border-teal-600 bg-teal-50 text-teal-800')}>
            <Warehouse className="h-4 w-4" />Garaje
          </Button>
          {panelGaraje && (
            <div role="dialog" aria-label="Garaje" className="absolute inset-x-2 top-14 z-[16] flex max-h-[calc(100%-8rem)] flex-col gap-2.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:inset-x-auto sm:right-3 sm:w-[340px]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Garaje</p>
                <Button variant="ghost" onClick={() => setPanelGaraje(false)} aria-label="Cerrar el garaje" className="px-1.5 py-1"><X className="h-4 w-4" /></Button>
              </div>
              {garajeLista}
            </div>
          )}
          {/* The design being edited (2026-11-13): its card, and the question about unsaved changes when leaving it */}
          <TarjetaDiseno e={eleccion} actual={actual} porDefecto={!!disenosGaraje.lista?.find(d => d.id === actual?.id)?.por_defecto} nombreVehiculo={nombreVehiculo} puedeDecidir={!!dueno?.puedeDecidir}
            className={cn('inset-x-2 top-14 sm:inset-x-auto sm:left-3 sm:top-12 sm:w-[min(340px,calc(100%-24px))]', panelGaraje && 'hidden sm:block sm:w-[min(340px,calc(100%-376px))]')} />
          <AvisoCambios e={eleccion} actual={actual} puedeDecidir={!!dueno?.puedeDecidir} className={cn('inset-x-2 top-14 sm:inset-x-auto sm:left-3 sm:top-12 sm:w-[min(360px,calc(100%-24px))]', panelGaraje && 'sm:w-[min(360px,calc(100%-376px))]')} />
          {/* La explicación de un punto del túnel va dentro de la ventana 3D: así también se ve en pantalla completa. */}
          {tunel && puntoTunel && (
            <PanelPunto sel={puntoTunel} cuerpos={cuerposTunel} resultados={resultadosTunel} kmh={kmhComparar} resolucion={opcionesTunel.resolucion}
              P={P} puedeDecidir={!!dueno?.puedeDecidir} alCerrar={() => setPuntoTunel(null)} alElegir={setPuntoTunel}
              className="absolute inset-x-2 bottom-2 top-12 sm:inset-x-auto sm:bottom-24 sm:right-3 sm:w-[400px]" />
          )}
          {superponer && !soloGaraje && (
            <TarjetaSuperponer alineacion={superponer} alCambiar={setSuperponer} alAlternar={id => setGaraje(g => g.map(x => x.id === id ? { ...x, visible: !x.visible } : x))} alCerrar={() => setSuperponer(null)} className={referencia && modoRef !== 'no' ? 'right-3 top-40 sm:right-[52px] sm:top-28' : 'right-3 top-12 sm:right-[52px] sm:top-3'}
              filas={[
                { id: 'aeromovil', nombre: nombreVehiculo, color: '#1e3a5f', largo: modelo.Lf, ancho: modelo.P.W, alto: modelo.P.H, batalla: modelo.P.B },
                // Todos los coches con silueta, visibles o no: pinchando en el nombre se ponen o se quitan.
                ...VEHICULOS_GARAJE.filter(d => d.envolvente).map(d => ({ id: d.id, nombre: d.nombre, color: colorCss(d.id), largo: d.largo, ancho: d.ancho, alto: d.alto, batalla: d.batalla, visible: !!garaje.find(g => g.id === d.id)?.visible })),
              ]} />
          )}
          {verConsumo && !tunel && !superponer && (
            <div className="absolute right-3 top-12 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm backdrop-blur sm:right-[52px] sm:top-3" role="group" aria-label="Velocidad de los carteles">
              <Gauge className="h-3.5 w-3.5 text-sky-700" />Consumo en las ruedas (aire + rodadura) a
              {VELOCIDADES.map(k => (
                <Button key={k} variant="outline" aria-pressed={kmhComparar === k} onClick={() => setKmhComparar(k)}
                  className={cn('px-1.5 py-0.5 text-[11px] normal-case tracking-normal', kmhComparar === k && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>{k} km/h</Button>
              ))}
            </div>
          )}
          {referencia && modoRef !== 'no' && (
            <div className="absolute right-3 top-12 z-10 flex max-w-[min(92%,560px)] flex-col gap-2 rounded-xl border border-teal-200 bg-white/95 p-2.5 shadow-sm backdrop-blur sm:right-[52px] sm:top-3 sm:max-w-[min(calc(100%-64px),560px)]">
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
          <div className="pointer-events-none absolute left-3 right-14 top-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            {esA1 ? `${P.plazas === 2 ? 'Tándem 1+1' : 'Monoplaza'} · cuatro ruedas · eléctrico ${P.kWNom}/${P.kWPico} kW · ${P.kWh} kWh` : esBala ? 'Biplaza a horcajadas · rombo de ruedas, laterales fijas en carenados' : esTri ? `${camposTriciclo(P).tAsientos === 'filas' ? 'Cuatro plazas en tres filas (1 + 2 + 1)' : conButacas(camposTriciclo(P)) ? 'Biplaza en tándem, dos butacas como el Aptera' : 'Biplaza a horcajadas'} · ${esCuatro(camposTriciclo(P)) ? 'cuatro ruedas, dos delante y dos detrás en carenados' : 'tres ruedas, dos delante en carenados'} · eléctrico ${fmt(camposTriciclo(P).tKWNom, 1)}/${fmt(camposTriciclo(P).tKWPico, 1)} kW · ${fmt(modelo.tipo === 'triciclo' ? modelo.kWh : camposTriciclo(P).tKWh, 1)} kWh${modelo.tipo === 'triciclo' && modelo.paquete ? ' a lo largo del bastidor' : ''}` : 'Tándem 1+2 · rombo basculante · pedaleo asistido'}
            {esA1 && <span className="block normal-case tracking-normal text-slate-400">Pincha una pieza para abrir su ficha</span>}
          </div>
          <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1">
            {eleccion.solo && <Button variant="outline" aria-pressed onClick={() => eleccion.setSolo(null)} className="border-teal-700 bg-teal-700 px-2 py-1 text-[11px] normal-case tracking-normal text-white hover:bg-teal-800">Mostrar todos</Button>}
            {/* Vista: un solo botón que despliega las cinco (2026-11-07, Eugenio: «colapsa lo de la vista en un menú») */}
            <div className="relative">
              <Button variant="outline" aria-expanded={vistaAbierta} onClick={() => { setVistaAbierta(v => !v); setCapasAbierto(false); }} className="bg-white px-2 py-1 text-[11px] normal-case tracking-normal">
                Vista: {VISTAS_NOMBRE[vista]}<ChevronDown className="ml-1 h-3 w-3" />
              </Button>
              {vistaAbierta && (
                <div className="absolute bottom-full left-0 z-20 mb-1 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg" role="menu">
                  {(Object.keys(VISTAS_NOMBRE) as Vista[]).map(k => (
                    <Button key={k} variant="ghost" role="menuitem" aria-pressed={vista === k} onClick={() => { setVista(k); setVistaAbierta(false); }}
                      className={cn('justify-start rounded-none px-3 py-1 text-[11px] normal-case tracking-normal', vista === k && 'bg-teal-700 text-white hover:bg-teal-800')}>{VISTAS_NOMBRE[k]}</Button>
                  ))}
                </div>
              )}
            </div>
            {/* Capas: colapsadas en un botón (2026-11-07, Eugenio: «quita el menú de capas de la derecha y ponlo colapsado abajo») */}
            <div className="relative">
              <Button variant="outline" aria-expanded={capasAbierto} onClick={() => { setCapasAbierto(v => !v); setVistaAbierta(false); }} className="bg-white px-2 py-1 text-[11px] normal-case tracking-normal">
                <Layers3 className="mr-1 h-3 w-3" />Capas{CAPAS.some(c => !visibles[c.k]) ? ` (${CAPAS.filter(c => visibles[c.k]).length}/${CAPAS.length})` : ''}
              </Button>
              {capasAbierto && (
                <div className="absolute bottom-full left-0 z-20 mb-1 grid w-72 grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg" role="group" aria-label="Capas">
                  {capas.map(c => (
                    <Button key={c.k} variant="ghost" aria-pressed={visibles[c.k]} onClick={() => setVisibles(v => ({ ...v, [c.k]: !v[c.k] }))}
                      className={cn('justify-start gap-1.5 px-1.5 py-1 text-left text-[11px] font-medium normal-case tracking-normal', !visibles[c.k] && 'text-slate-400')}>
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', visibles[c.k] ? c.color : 'bg-transparent ring-1 ring-slate-300')} />{c.n}
                    </Button>
                  ))}
                  <Button variant="ghost" onClick={() => { antesSolo.current = null; setVisibles(Object.fromEntries(CAPAS.map(c => [c.k, true])) as Record<CapaId, boolean>); setSoloDep(false); }} className="col-span-2 px-1.5 py-1 text-[11px] normal-case tracking-normal text-teal-800">Ver todo</Button>
                </div>
              )}
            </div>
            {(esA1 || esTri) && (esTri ? depTri : dep) !== 'proyecto' && capasSolo(esTri ? depTri : dep) && (
              <Button variant="outline" aria-pressed={soloDep} onClick={() => verSolo(!soloDep)}
                className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', soloDep && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                {soloDep ? 'Mostrar todo' : `Mostrar solo ${SOLO_DEP[esTri ? depTri : dep] ?? NOMBRE_CORTO[esTri ? depTri : dep].toLowerCase()}`}
              </Button>
            )}
            {/* El Bala no se inclina ni tiene la dirección dibujada: sin «Simular curva». */}
            {([['Cotas', verCotas, setVerCotas], ['Rayos X', rayosX, setRayosX], ['Corte', corte, setCorte], ...(esBala ? [] : [[esA1 || esTri ? 'Girar ruedas' : 'Simular curva', curva, setCurva]])] as [string, boolean, (v: boolean) => void][]).map(([n, v, f]) => (
              <Button key={n} variant="outline" aria-pressed={v} onClick={() => f(!v)}
                className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', v && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
            ))}
            <Button variant="outline" aria-pressed={abierta} onClick={() => setAbierta(!abierta)}
              className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', abierta && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
              <DoorOpen className="mr-1 h-3 w-3" />{abierta ? 'Cerrar' : 'Abrir'} {(esBala || esTri || Pa.puerta === 'cabina') && !(esTri && conPuertas(camposTriciclo(P))) ? 'cúpula' : 'puertas'}
            </Button>
            {(esA1 || esTri) && (
              <Button variant="outline" aria-pressed={maleteros} onClick={() => setMaleteros(!maleteros)}
                className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', maleteros && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                <Package className="mr-1 h-3 w-3" />{maleteros ? 'Cerrar' : 'Abrir'} {esTri ? 'maletero' : 'maleteros'}
              </Button>
            )}
            {esA1 && P.plazas === 2 && (
              <Button variant="outline" aria-pressed={sinPasajero} onClick={() => { setSinPasajero(!sinPasajero); if (!sinPasajero) setVerCotas(true); }}
                title="Quita al pasajero y su asiento y acota el espacio que queda detrás: maletero o cama"
                className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', sinPasajero && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                {sinPasajero ? 'Con pasajero' : 'Sin pasajero'}
              </Button>
            )}
            <Button variant="outline" aria-pressed={!!superponer} onClick={() => {
                if (superponer) { setSuperponer(null); return; }
                // Al superponer: fuera el túnel, vista de lado y, si el garaje está vacío, el Twizy y el Aptera.
                if (!garaje.some(g => g.visible)) setGaraje(g => g.map(x => x.id === 'twizy' || x.id === 'aptera' ? { ...x, visible: true } : x));
                setTunel(false); setSuperponer('eje'); setVista('side');
              }}
              title="Pone los coches del garaje encima de este diseño, cada uno de un color y con su silueta, para comparar tamaños"
              className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', superponer && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>
              <Layers className="mr-1 h-3 w-3" />Superponer
            </Button>
            <Button variant="outline" aria-pressed={tunel} onClick={() => {
                // Al abrir el túnel, si no hay con quién comparar, se saca el Twizy del garaje.
                if (!tunel && !garaje.some(g => g.visible && VEHICULOS_GARAJE.find(v => v.id === g.id)?.aero)) setGaraje(g => g.map(x => x.id === 'twizy' ? { ...x, visible: true } : x));
                if (!tunel) setSuperponer(null);
                setTunel(!tunel);
              }}
              title="Calcula el aire alrededor de este diseño y de los coches del garaje (presiones, líneas de corriente, puntos críticos y un Cd estimado) y lo que cuesta empujarlo"
              className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', tunel && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>
              <Wind className="mr-1 h-3 w-3" />Túnel de viento
            </Button>
            <Button variant="outline" aria-pressed={verConsumo} onClick={() => setVerConsumo(v => !v)}
              title="Pone encima de cada coche su Cd, lo que gasta cada 100 km a la velocidad elegida, su masa en vacío y su área frontal"
              className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', verConsumo && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>
              <Gauge className="mr-1 h-3 w-3" />Cd y consumo
            </Button>
            <Button variant="outline" onClick={pedirRender} disabled={render.estado === 'creando'}
              title="Descarga la captura de esta vista y deja la petición en Tareas para la sesión de Claude Code (sin coste)"
              className="ml-auto bg-white px-2 py-1 text-[11px] normal-case tracking-normal">
              <Camera className="mr-1 h-3 w-3" />Pedir render
            </Button>
          </div>
          {render.estado !== 'nada' && (
            <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/85 p-3 text-white" role="dialog" aria-label="Petición de render">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider">Render · vista {render.vista ? NOMBRE_VISTA[render.vista] : ''}</span>
                <Button variant="ghost" onClick={() => setRender({ estado: 'nada' })} aria-label="Cerrar" className="ml-auto px-2 py-1 text-white hover:bg-white/15"><X className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 flex min-h-0 flex-1 items-center justify-center">
                {render.estado === 'creando' && <p className="animate-pulse text-sm">Capturando la vista y apuntando la petición…</p>}
                {render.estado === 'error' && <p className="max-w-md text-center text-sm text-amber-200">{render.error}</p>}
                {render.estado === 'listo' && <p className="max-w-md text-center text-sm">La captura se ha descargado y la petición está en «Tareas». La atiende la sesión de Claude Code con la suscripción, sin coste por imagen. Ojo: Claude no genera fotografías; lo que puede hacer es mejorar el 3D o preparar el encargo de render a partir de esa captura.</p>}
              </div>
            </div>
          )}
        </section>
        {/* El túnel abre su tarjeta debajo del visor, no encima (2026-11-07, Eugenio: «que no estorbe»). */}
        {tunel && <TarjetaTunel alCerrar={() => setTunel(false)} base="aeromovil" kmh={kmhComparar} alCambiarKmh={setKmhComparar} filas={filasComparar} className="mt-3"
          cuerpos={cuerposTunel} resultados={resultadosTunel} opciones={opcionesTunel} alCambiarOpciones={setOpcionesTunel}
          punto={puntoTunel} alElegirPunto={s => {
            setPuntoTunel(s);
            // the explanation opens in the 3D view: bring it into sight below the sticky header (tall on a phone)
            const v = ventana3d.current, cab = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
            if (v) window.scrollTo({ top: window.scrollY + v.getBoundingClientRect().top - cab - 8, behavior: 'smooth' });
          }} />}
        {esA1 && <PanelDepartamento d={DEPARTAMENTOS.find(x => x.id === dep)!} P={P} res={res} modelo={modelo} />}
        </div>

        <aside className="mt-4 flex flex-col gap-3 lg:mt-0">
          {/* round 3 interior (2026-11-12): «Ver solo …» above the sliders of each department (the Aeromóvil 1's and the Triciclo's) */}
          {(esA1 || esTri) && (esTri ? depTri : dep) !== 'proyecto' && capasSolo(esTri ? depTri : dep) && (() => {
            const d = esTri ? depTri : dep, n = NOMBRE_CORTO[d].toLowerCase();
            return (
              <Button variant="outline" aria-pressed={soloDep} onClick={() => verSolo(!soloDep)}
                className={cn('w-full justify-center gap-1.5 bg-white px-3 py-2 text-[13px] font-semibold normal-case tracking-normal', soloDep && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                <Layers3 className="h-4 w-4" />{soloDep ? `Viendo solo ${n} · volver a las capas de antes` : `Ver solo ${n}`}
              </Button>
            );
          })()}
          {(esA1 ? dep === 'proyecto' : esTri ? false : true) && garajeBloque}

          {dueno && !dueno.puedeDecidir && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Los parámetros solo los cambia el dueño del Aeromóvil con su sesión iniciada; aquí se pueden mirar, girar el 3D y leer los departamentos.
              {!dueno.sesion && <> <Link to="/login" className="font-semibold underline">Iniciar sesión</Link></>}
            </div>
          )}
          <fieldset disabled={!dueno?.puedeDecidir} className={cn('contents', !dueno?.puedeDecidir && '[&_input]:cursor-not-allowed [&_select]:opacity-70 [&_input]:opacity-70')}>
          {/* 2026-11-13: the body's colour, in «Carrocería» (the Gota and the Cuadriciclo en rombo have no departments: always) */}
          {((esA1 || esTri) ? (esTri ? depTri : dep) === 'carroceria' : true) && <Bloque titulo="Color de la carrocería"><ColoresCarroceria P={P} set={set} /></Bloque>}
          {modelo.tipo === 'a1' ? <LadoA1 P={P} Pa={Pa} D={D} set={set} res={res} modelo={modelo} neumaticos={neumaticos} malas={malas} dep={dep} alNavegar={r => { navegar(r); window.scrollTo({ top: 0 }); }} />
            : modelo.tipo === 'bala' ? <LadoBala P={P} set={set} res={res} modelo={modelo} cdTunel={tunel ? cdTunelNuestro : undefined} />
            : modelo.tipo === 'triciclo' && res.triciclo ? <LadoTriciclo P={P} set={set} res={res} modelo={paraCalcular.tipo === 'triciclo' ? paraCalcular : modelo} dep={depTri} cd={cdTri} />
            : modelo.tipo === 'triciclo' ? null : (<>
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
          </fieldset>
          {esTri && depTri === 'proyecto' && garajeBloque}
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
        : <p className="mx-auto max-w-[1100px] px-4 py-8 text-sm text-slate-600">Las fichas de componentes son del Aeromóvil 1. Elígelo en el menú del nombre del vehículo, arriba a la izquierda, para verlas.</p>)}
      {seccion === 'aranceles' && (esA1
        ? <VistaAranceles P={P} res={res} modelo={modelo} />
        : <p className="mx-auto max-w-[1100px] px-4 py-8 text-sm text-slate-600">Los aranceles se calculan con las piezas del Aeromóvil 1. Elígelo en el menú del nombre del vehículo, arriba a la izquierda, para verlos.</p>)}
      {seccion === 'tareas' && <VistaTareas tareas={tareas} recargar={recargar} error={errorTareas} dueno={dueno} />}
      {seccion === 'plan' && <VistaPlan />}
      {seccion === 'planos' && <VistaPlanos modelo={modelo} />}
      {seccion === 'exportar' && <VistaExportar modelo={modelo} visor={visor} porDefecto={porDefecto} resultados={res} />}

      <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-6 pt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />Modelo paramétrico{!esBala && !esTri && ' · STEP generado con CadQuery'}</span>
        <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />Cifras de rendimiento estimadas</span>
        <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{abiertas ?? '…'} tareas abiertas</span>
      </footer>
    </div>
  );
}
