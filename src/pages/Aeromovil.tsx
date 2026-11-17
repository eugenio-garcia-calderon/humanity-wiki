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
//   /aeromovil/circuito   estabilidad en curvas: el Lumeneo Smera (bascula), el
//                         Aptera, otros del garaje y el diseño abierto, curva a curva
//
// Todo el cálculo vive en `src/components/aeromovil/geometria.ts`, que es la
// misma geometría que el script CadQuery de `public/aeromovil/`.
//
// 2026-11-16 (refactor «ordenar»): each vehicle's side panel lives in its own file next to the viewer
// (src/components/aeromovil/LadoA1.tsx, LadoBala.tsx, LadoTriciclo.tsx, basculante/LadoBasculante.tsx) and the shared
// slider/selector/block controls in controles.tsx. This page keeps the layout, the state and the 3D toolbar.
import { Fragment, Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Armchair, BatteryCharging, Box, Fuel, Car, Route as RutaIcono, Warehouse, Camera, ChevronDown, CircleDot, ClipboardList, Factory, Weight, Hammer, Frame, Layers3, Lightbulb, ShieldCheck, Zap, GitCompare, X, DoorOpen, Download, Gauge, Layers, ListChecks, Map as MapIcon, Maximize2, Minimize2, Ruler, RotateCcw, Package, Ship, Wrench, Wind } from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { Visor3D, CAPAS, type CapaId, type Vista, type VisorHandle } from '../components/aeromovil/Visor3D';
import {
  PARAMETROS_POR_DEFECTO, PARAMETROS_A1, PARAMETROS_GOTA, PARAMETROS_BALA, PARAMETROS_TRICICLO, PARAMETROS_BASCULANTE, DIAMETRO_RUEDA, NEUMATICOS, MATERIALES_CARENADO, MATERIALES_CHASIS, RANGOS_MASA, ajustarCarenado, areas, calcular, crearModelo, type Disposicion, type MaterialCarenado, type MaterialChasis, type Neumatico, type Parametros, type Puerta, type Pulgadas,
} from '../components/aeromovil/geometria';
import {
  CRR, DEPS_TRICICLO, camposTriciclo, energiaTriciclo, conButacas, conPuertas, esCuatro, esRombo, lemasTriciclo, nombreTriciclo, type DepTriciclo,
} from '../components/aeromovil/geometriaTriciclo';
import { kgPorDepartamento, textoKg, type KgDepartamento } from '../components/aeromovil/PesosDepartamento';
import { LadoConsumos } from '../components/aeromovil/electrico/LadoConsumos';
import { BloqueSistemaElectrico, textoConsumoPestana } from '../components/aeromovil/electrico/SistemaElectrico';
/**
 * (2026-11-17, «consumos») A tab of the top bar: a department, or «Consumos» (Triciclo family only), which has no
 * `Departamento` of its own (as «Masas»). Kept here and not in `IdDepartamento`: «Energía» kept its id `energia` (now
 * named «Batería»), so a tab remembered in a browser still opens.
 */
type IdPestana = IdDepartamento | 'consumos';
import { LadoResumen, centroParaVisor, useMasas } from '../components/aeromovil/LadoResumen';
// (2026-11-17) prices: «Proyecto › Coste del prototipo» and the «Mano de obra» tab (precios/)
import { costeProyecto } from '../components/aeromovil/precios/coste';
import { eur } from '../components/aeromovil/precios/precios';
import { BloqueCoste } from '../components/aeromovil/precios/BloqueCoste';
import { PanelManoObra } from '../components/aeromovil/precios/PanelManoObra';
// ── Cuadriciclo Basculante (2026-11-15): its sidebar, its Cd and its departments (basculante/, geometriaBasculante.ts)
import { LadoBasculante, useCdBasculante } from '../components/aeromovil/basculante/LadoBasculante';
import { CRR_B, LEMAS_BASCULANTE, NOMBRE_BASCULANTE, camposBasculante } from '../components/aeromovil/geometriaBasculante';
import { ColoresCarroceria } from '../components/aeromovil/ColorCarroceria';
import { CLAVES_COLOR, coloresDe } from '../components/aeromovil/coloresCarroceria';
import { rotuloFilas } from '../components/aeromovil/filasTriciclo';
import { MenuDisenos, aDiseno, cargarDisenoPorDefecto, deDiseno, useAutoguardado, type Diseno } from '../components/aeromovil/Disenos';
import { TablaComparacion, fichaPropia } from '../components/aeromovil/Otros';
import { fichaComparable, type Referencia } from '../components/aeromovil/referencias';
import { FormularioMejora, VistaExportar, VistaPlan, VistaPlanos, VistaTareas, cargarDueno, cargarTareas, type Dueno, type Tarea } from '../components/aeromovil/Paneles';
import { VistaComponentes } from '../components/aeromovil/Componentes';
import { VEHICULOS_GARAJE } from '../components/aeromovil/garaje';
import { alternarReferencia, quitarReferencia, recuperarReferencia } from '../components/aeromovil/garaje/quitados';
import { masaGaraje } from '../components/aeromovil/garaje/tipos';
import { useDisenosGaraje } from '../components/aeromovil/GarajeDisenos';
import { AvisoCambios, BotonEditableReferencia, BotonFilaReferencia, BotonQuitarReferencia, BotonSoloReferencia, ListaGaraje, TarjetaDiseno, useEleccionDiseno } from '../components/aeromovil/garaje/NavegadorGaraje';
import { HUECO_CON_TUNEL } from '../components/aeromovil/garaje/filas';
import { TarjetaTunel, gastoEnRuedas, VELOCIDADES, type FilaTunel } from '../components/aeromovil/TarjetaTunel';
import { cuerpoAeromovil, cuerpoGaraje, type CuerpoTunel } from '../components/aeromovil/tunel/cuerpos';
import { opcionesPorDefecto, useResultadosTunel, type OpcionesTunel } from '../components/aeromovil/tunel/cliente';
import { PanelPunto, type SeleccionPunto } from '../components/aeromovil/tunel/PanelPunto';
import { TarjetaSuperponer, type Alineacion } from '../components/aeromovil/TarjetaSuperponer';
import { colorCss } from '../components/aeromovil/garaje/superponer';
import { DEPARTAMENTOS, type IdDepartamento } from '../components/aeromovil/departamentos';
import { PanelDepartamento } from '../components/aeromovil/Departamentos';
import { VistaAranceles } from '../components/aeromovil/Aranceles';
import { fmt, m2, Deslizador, Bloque, Selector, ListaComprobaciones } from '../components/aeromovil/controles';
import { LadoA1 } from '../components/aeromovil/LadoA1';
import { LadoBala } from '../components/aeromovil/LadoBala';
import { useCdTriciclo, zonaTriciclo, LadoTriciclo } from '../components/aeromovil/LadoTriciclo';
import { BloqueAerodinamica } from '../components/aeromovil/estudio/EstudioAerodinamico';
// (2026-11-17) the «Homologación» tab: the design against its EU category (homologacion/)
import { PanelHomologacion, ResumenHomologacion } from '../components/aeromovil/homologacion/PanelHomologacion';
import { fichaHomologacion } from '../components/aeromovil/homologacion/ficha';
import { comprobacionesHomologacion } from '../components/aeromovil/homologacion/evaluar';

// The cornering circuit (2026-11-15): its own chunk, recharts comes with it and only this section needs it.
const VistaCircuito = lazy(() => import('../components/aeromovil/circuito/VistaCircuito'));

// v5 (2026-11-06): el diseño por defecto pasa a ser el Aeromóvil 1; lo guardado como v4 era del Gota y se queda en su clave.
const CLAVE = 'aeromovil.parametros.v5';
type Seccion = 'diseno' | 'componentes' | 'aranceles' | 'circuito' | 'tareas' | 'plan' | 'planos' | 'exportar';
const SECCIONES: { k: Seccion; n: string; ruta: string; icono: typeof Box }[] = [
  { k: 'diseno', n: 'Diseño 3D', ruta: '/aeromovil', icono: Box },
  { k: 'componentes', n: 'Componentes', ruta: '/aeromovil/componentes', icono: Wrench },
  { k: 'aranceles', n: 'Aranceles', ruta: '/aeromovil/aranceles', icono: Ship },
  // 2026-11-15, Eugenio: «crea además del garaje un circuito de simulación de estabilidad en curvas»
  { k: 'circuito', n: 'Circuito', ruta: '/aeromovil/circuito', icono: RutaIcono },
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
/** Las capas que tienen algo en el Bala (no lleva paneles solares, motor ni baterías dibujados). */
const CAPAS_BALA: CapaId[] = ['carenado', 'cristales', 'chasis', 'suspension', 'ruedas', 'asientos', 'ocupantes'];
/** Las del Triciclo: las del Bala más la dirección, el motor y la batería (sin transmisión: el motor va en el buje; el techo solar va con la cúpula, en «Cristales»). */
const CAPAS_TRICICLO: CapaId[] = ['carenado', 'cristales', 'chasis', 'suspension', 'direccion', 'ruedas', 'asientos', 'ocupantes', 'motor', 'baterias'];


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

function cargarParametros(): Parametros {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && typeof g === 'object') return deDiseno(g);
  } catch { /* sin almacenamiento o dato roto: los de por defecto */ }
  return PARAMETROS_POR_DEFECTO;
}

const ICONO_DEP: Record<IdPestana, typeof Box> = { consumos: Fuel, proyecto: ClipboardList, masas: Weight, manoobra: Hammer, carroceria: Car, chasis: Frame, rodaje: CircleDot, propulsion: Zap, energia: BatteryCharging, interior: Armchair, accesos: DoorOpen, luces: Lightbulb, fabricacion: Factory, homologacion: ShieldCheck };
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
/** (2026-11-17) The Triciclo family's and the Basculante's «Homologación» tab, after «Interior» (the A1 has it among its eleven). */
const PESTANA_HOMOLOGACION = { id: 'homologacion' as IdDepartamento, lema: 'la categoría europea que le toca, lo que cumple y lo que no, y el margen que queda de masa, potencia y velocidad' };
const VISTAS_NOMBRE: Record<Vista, string> = { iso: '3/4', side: 'Lateral', top: 'Planta', front: 'Frontal', back: 'Trasera' };
const SOLO_DEP: Partial<Record<IdDepartamento, string>> = { carroceria: 'la carrocería', chasis: 'el chasis', rodaje: 'el rodaje', propulsion: 'el motor', energia: 'la batería', interior: 'el interior', accesos: 'los accesos', luces: 'la carrocería' };
const NOMBRE_CORTO: Record<IdPestana, string> = { consumos: 'Consumos', proyecto: 'Proyecto', masas: 'Masas', manoobra: 'Mano de obra', carroceria: 'Carrocería', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Batería', interior: 'Interior', accesos: 'Accesos', luces: 'Luces', fabricacion: 'Fabricación', homologacion: 'Homologación' };

/**
 * The departments as a row of tabs IN the top bar (2026-11-12, Eugenio: «Me gustaba cómo estaba antes el menú de
 * carrocería, chasis, rodaje, motor, etcétera. Estaba desplegado debajo del menú superior y se podía pinchar e ir
 * cambiando… ese menú ponlo en la parte superior y el actual menú pliégalo»). The same tabs as before 383754a
 * (icon over a short name, the one open in teal, its one-liner as `title`), now the bar's own row; the sections
 * (Diseño 3D, Tareas…) fold into `MenuSecciones`. On a phone the row scrolls sideways.
 * Vehicles without departments (the Gota, the Cuadriciclo en rombo) have no tabs: the bar keeps only the logo and the menu.
 */
function PestanasDepartamento({ lista, dep, alElegir, kg, consumo, extra }: { lista: { id: IdPestana; lema: string }[]; dep: IdPestana | null; alElegir: (d: IdPestana) => void; kg?: KgDepartamento | null;
  /** (2026-11-17, «precios») a tab's own figure where it has no mass («Mano de obra»: its euros) */
  extra?: Partial<Record<IdPestana, string>>;
  /** (2026-11-17) the line(s) under «Consumos»: litres per 100 km (electric: ≈ litres of equal energy, and kWh) */
  consumo?: { lineas: string[]; largo: string } | null }) {
  return (
    <nav aria-label="Departamentos" className="order-last flex w-full min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none] sm:order-none sm:w-auto sm:flex-1 [&::-webkit-scrollbar]:hidden">
      {lista.map(d => { const Icono = ICONO_DEP[d.id], activo = dep === d.id; return (
        <Button key={d.id} variant="ghost" aria-pressed={activo} onClick={() => alElegir(d.id)} title={d.id === 'consumos' && consumo ? `${d.lema}. A la velocidad de cálculo: ${consumo.largo}` : d.lema}
          className={cn('shrink-0 flex-col gap-0.5 px-2.5 py-1 text-[11px] normal-case tracking-normal', activo ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-600')}>
          <Icono className="h-4 w-4" />{NOMBRE_CORTO[d.id]}
          {/* (2026-11-16) the department's mass, from the same pieces as «Peso: todos los componentes» (PesosDepartamento.ts) */}
          {d.id === 'consumos' && consumo && consumo.lineas.map(l => <span key={l} className={cn('-mt-0.5 whitespace-nowrap font-mono text-[10px] leading-none tabular-nums', activo ? 'text-teal-100' : 'text-slate-500')}>{l}</span>)}
          {kg && textoKg(kg[d.id as keyof KgDepartamento]) && <span className={cn('-mt-0.5 font-mono text-[10px] leading-none tabular-nums', activo ? 'text-teal-100' : 'text-slate-500')}>{textoKg(kg[d.id as keyof KgDepartamento])}</span>}
          {/* (2026-11-17) a tab's own figure where it has no mass («Mano de obra»: its euros) */}
          {extra?.[d.id] && <span className={cn('-mt-0.5 font-mono text-[10px] leading-none tabular-nums', activo ? 'text-teal-100' : 'text-slate-500')}>{extra[d.id]}</span>}
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
  const paraCalcular = (modelo.tipo === 'bala' || modelo.tipo === 'triciclo' || modelo.tipo === 'basculante') && diferido.tipo === modelo.tipo ? diferido : modelo;
  const res = useMemo(() => calcular(paraCalcular, areas(paraCalcular)), [paraCalcular]);
  const esA1 = modelo.tipo === 'a1', esBala = modelo.tipo === 'bala', esTri = modelo.tipo === 'triciclo';
  // Cuadriciclo Basculante (2026-11-15): departments as the Triciclo's (`porDeps`), its own sidebar
  const esBas = modelo.tipo === 'basculante', porDeps = esTri || esBas;
  // 2026-11-11: a Triciclo with two rear wheels is the «Cuadriciclo Bala clásico» wherever its name shows
  const nombreVehiculo = esBas ? NOMBRE_BASCULANTE : esA1 ? 'Aeromóvil 1' : esBala ? 'Cuadriciclo Bala en rombo' : esTri ? nombreTriciclo(camposTriciclo(P)) : 'Aeromóvil Gota';
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
  const cambiarVehiculo = (k: Disposicion) => { if (k !== P.disposicion) { setP(k === 'basculante' ? PARAMETROS_BASCULANTE : k === 'cuatro' ? PARAMETROS_A1 : k === 'bala' ? PARAMETROS_BALA : k === 'triciclo' ? PARAMETROS_TRICICLO : PARAMETROS_GOTA); setActual(null); } };

  const [visibles, setVisibles] = useState<Record<CapaId, boolean>>(() => Object.fromEntries(CAPAS.map(c => [c.k, true])) as Record<CapaId, boolean>);
  const [rayosX, setRayosX] = useState(false);
  const [corte, setCorte] = useState(false);
  const [curva, setCurva] = useState(false);
  // Cuadriciclo Basculante: «Bascular» (a counter: each press leans it to the maximum each way and back)
  const [bascular, setBascular] = useState(0);
  // (2026-11-15) the side panel's block under the last click on the 3D car
  const [abrirBloque, setAbrirBloque] = useState<{ bloque: string; n: number } | null>(null);
  // (2026-11-15: and the «Cuadriciclo Bala clásico» set to lean, `tBascula`) its maximum lean, 0 for a car that does not
  const anguloBascular = Math.round((modelo.tipo === 'basculante' ? modelo.phiMax : modelo.tipo === 'triciclo' && modelo.bascula ? modelo.bascula.phiMax : 0) * 180 / Math.PI);
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
  // (2026-11-17) the Gota's and the Bala's homologation panel (they have no department tabs)
  const [verHomologacion, setVerHomologacion] = useState(false);
  // (2026-11-17: the aerodynamics now lives inside «Carrocería»: a remembered tab that is not a department, such as an old
  // «aerodinamica»/«tunel» one, opens «Carrocería» instead of an empty panel)
  // (2026-11-17: and «masas», which is a tab and not a department; the Aeromóvil 1, which has no such tab, opens «Proyecto» for it)
  const [dep, setDep] = useState<IdPestana>(() => { try { const g = localStorage.getItem('aeromovil.departamento'); return g && (g === 'masas' || g === 'consumos' || g === 'manoobra' || DEPARTAMENTOS.some(d => d.id === g)) ? g as IdPestana : 'carroceria'; } catch { return 'carroceria'; } });
  useEffect(() => { try { localStorage.setItem('aeromovil.departamento', dep); } catch { /* sin memoria */ } }, [dep]);
  // «Ver solo …» (round 3 interior, 2026-11-12): leaves only the department's layers; turning it off (or going to
  // «Proyecto», or to another tab) puts back the layers as they were before it was pressed.
  const antesSolo = useRef<Record<CapaId, boolean> | null>(null);
  const verSolo = (si: boolean) => { if (si && !soloDep) antesSolo.current = visibles; setSoloDep(si); };
  const capasSolo = (d: IdPestana): CapaId[] | undefined => d === 'consumos' ? undefined : P.disposicion === 'triciclo' || P.disposicion === 'basculante' ? (d === 'proyecto' || d === 'masas' || d === 'manoobra' ? undefined : CAPAS_DEP_TRICICLO[d as DepTriciclo]) : CAPAS_DEP[d];
  useEffect(() => {
    const suyas = soloDep && dep !== 'proyecto' ? capasSolo(dep) : undefined;
    if (!suyas) { if (antesSolo.current) { setVisibles(antesSolo.current); antesSolo.current = null; } return; }
    setVisibles(Object.fromEntries(CAPAS.map(c => [c.k, suyas.includes(c.k)])) as Record<CapaId, boolean>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloDep, dep, P.disposicion]);
  // El garaje: qué vehículos se ven y dónde están (eje delantero en el suelo, m). Se recuerda en este navegador.
  // `quitado` (2026-11-16): taken out of the garage («Eliminar del garaje») until «Recuperar» (`garaje/quitados.ts`)
  type PlazaGaraje = { id: string; visible: boolean; x: number; z: number; giro: number; quitado?: boolean };
  const [garaje, setGaraje] = useState<PlazaGaraje[]>(() => {
    // El Twizy, visible por defecto a 3 m al lado (2026-11-07, Eugenio); la clave v2 hace que también lo vea quien ya tenía el garaje guardado.
    // El Aptera, al otro lado a 3 m (2026-11-07, «ponlo en el garaje junto a los otros dos»). Quien ya tenía el
    // garaje guardado también lo ve: su lista guardada no lo trae y se queda con este valor.
    // Los dos XL1 (2026-11-09, Eugenio, con fotos): el de serie de 2013 enfrente del Twizy y el concept 1-Litro de 2002 al otro lado.
    // 2026-11-09, «añade el jaguar… y el velomovil aerorider» y «también este de Shell Eco Marathon»: el SZEmission,
    // el Jaguar D-Type y el AeroRider salen también por defecto, más allá de los cuatro anteriores.
    // 2026-11-12: the Tesla Model Y, shown at −15 m. A saved v5 list does not carry it, so it shows for everybody once.
    // 2026-11-15: the Lumeneo Smera and the Mercedes Vision EQXX, on show too (a saved v5 list does not carry them either).
    // The rows place every car (`garaje/filas.ts`); these z only matter if the rows cannot.
    const POR_DEFECTO: Record<string, { z: number }> = { twizy: { z: 3 }, aptera: { z: -3 }, xl1: { z: 6 }, unlitro: { z: -6 }, szemission: { z: 9 }, jaguarD: { z: -9 }, aerorider: { z: 12 }, bala: { z: -12 }, nusKruce: { z: 15 }, modeloY: { z: -15 }, smera: { z: 18 }, eqxx: { z: -18 } };
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
    // (2026-11-13) a renamed design: the open one's name changes; its saved parameters («base») do not
    alRenombrado: d => setActual(a => (a && a.id === d.id ? { ...a, nombre: d.nombre } : a)),
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
  // (2026-11-17: and «Masas», the masses' own tab; and «Homologación», next to «Interior»)
  // (2026-11-17) «Consumos» is the Triciclo family's: on the Basculante it opens «Batería», where its consumption still is
  // (2026-11-17, «precios») and «Mano de obra», the labour's tab
  const depTri: DepTriciclo | 'proyecto' | 'masas' | 'homologacion' | 'consumos' | 'manoobra' = dep === 'consumos' ? (esTri ? 'consumos' : 'energia') : dep === 'proyecto' || dep === 'masas' || dep === 'homologacion' || dep === 'manoobra' || (DEPS_TRICICLO as string[]).includes(dep) ? dep as DepTriciclo | 'proyecto' | 'masas' | 'homologacion' | 'manoobra' : 'carroceria';
  // the masses of the design (LadoResumen.tsx): the «Masas» tab, and the 3D's centre of gravity while it is open
  const masas = useMasas(paraCalcular, res);
  useEffect(() => { if (porDeps && dep !== depTri) setDep(depTri); }, [porDeps, dep, depTri]);
  // (2026-11-17) «Masas» remembered from a Triciclo opens «Proyecto» on a vehicle without that tab (the Aeromóvil 1)
  useEffect(() => { if (!porDeps && (dep === 'masas' || dep === 'consumos' || dep === 'manoobra')) setDep('proyecto'); }, [porDeps, dep]);
  // (2026-11-17) the prototype's cost: parts by department + labour (precios/coste.ts), for «Proyecto» and «Mano de obra»
  const coste = useMemo(() => (porDeps ? costeProyecto(P, paraCalcular, res) : null), [porDeps, P, paraCalcular, res]);
  // (2026-11-17) the consumption under «Consumos»: the same calculation as its «Rendimiento» block, once the tunnel has the Cd
  const consumoPestana = esTri && paraCalcular.tipo === 'triciclo' && cdTri.cd != null && cdTri.areaRef != null ? textoConsumoPestana(energiaTriciclo(paraCalcular, res.mTot, { cd: cdTri.cd, areaRef: cdTri.areaRef })) : null;
  // the Cuadriciclo Basculante's Cd: the tunnel's, as the Triciclo's
  const cdBas = useCdBasculante(paraCalcular, opcionesTunel.resolucion, esBas ? camposBasculante(P).qVel : 80);
  const cdBasComparar = useCdBasculante(paraCalcular, opcionesTunel.resolucion, kmhComparar);
  // (2026-11-17) the homologation fails, for «Proyecto › Revisión de puntos críticos» (homologacion/evaluar.ts)
  const cdHom = esTri ? cdTri : esBas ? cdBas : null;
  const fallosHomologacion = useMemo(() => porDeps && depTri === 'proyecto' ? comprobacionesHomologacion(fichaHomologacion(paraCalcular.P, paraCalcular, res, cdHom, nombreVehiculo)) : [], [porDeps, depTri, paraCalcular, res, cdHom?.cd, cdHom?.areaRef, nombreVehiculo]); // eslint-disable-line react-hooks/exhaustive-deps
  const cuerposTunel = useMemo<CuerpoTunel[]>(() => !tunel ? [] : [
    ...(soloGaraje ? [] : [cuerpoAeromovil(modelo, res.A, nombreVehiculo)]),
    ...garajeVisor.flatMap(v => { const c = cuerpoGaraje(v); return c ? [c] : []; }),
  ], [tunel, soloGaraje, modelo, res.A, nombreVehiculo, garajeVisor]);
  const resultadosTunel = useResultadosTunel(cuerposTunel, opcionesTunel.resolucion, opcionesTunel.lineas);
  /** The tunnel's Cd for our design at the comparison speed, once it is computed (the Bala has no other). */
  const cdTunelNuestro = (() => { const R = resultadosTunel.aeromovil; return R ? (R.porVelocidad.find(q => q.kmh === kmhComparar) ?? R.porVelocidad[1]).cd.total : undefined; })();
  const areaTunelNuestro = cuerposTunel.find(c => c.id === 'aeromovil')?.area;
  const filasComparar = useMemo<FilaTunel[]>(() => [
    ...(soloGaraje ? [] : esBas ? (cdBasComparar.cd != null && cdBasComparar.areaRef != null ? [{
      id: 'aeromovil', nombre: nombreVehiculo, cd: cdBasComparar.cd, area: cdBasComparar.areaRef, masa: res.mTot, crr: CRR_B, estimado: true, origenCd: 'túnel (la carrocería y sus ruedas)',
      fuente: `Este diseño. Cd estimado por el túnel con la carrocería y sus cuatro ruedas${camposBasculante(P).qRuedasDel === 'carenados' ? ' (los carenados delanteros, solo como ruedas carenadas: el real será algo más alto)' : ''}; masa estimada con dos ocupantes de ${camposBasculante(P).qMOcc} kg y rodadura ${CRR_B} (neumático de scooter).`,
    }] : []) : esTri ? (cdTriComparar.cd != null && cdTriComparar.areaRef != null ? [{
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
  ], [soloGaraje, esBala, esTri, esBas, cdBasComparar.cd, cdBasComparar.areaRef, cdTriComparar.cd, cdTriComparar.areaRef, P, nombreVehiculo, cdTunelNuestro, areaTunelNuestro, res.Cd, res.A, res.mTot, res.Crr, P.plazas, P.mOcc, garajeVisor]);
  // El punto crítico cuya explicación está abierta (2026-11-09, Eugenio: «una explicación de cada uno de estos parámetros cuando se hace click»).
  const [puntoTunel, setPuntoTunel] = useState<SeleccionPunto | null>(null);
  /** The tunnel on and off: the 3D view's button and «Carrocería › Aerodinámica» (2026-11-17) do the same. */
  const alternarTunel = () => {
    // Al abrir el túnel, si no hay con quién comparar, se saca el Twizy del garaje.
    if (!tunel && !garaje.some(g => g.visible && VEHICULOS_GARAJE.find(v => v.id === g.id)?.aero)) setGaraje(g => g.map(x => x.id === 'twizy' && !x.quitado ? { ...x, visible: true } : x));
    if (!tunel) setSuperponer(null);
    setTunel(!tunel);
  };
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
    if ((esTri || esBas) && !soloGaraje && !o.aeromovil) { const l = masaArea(nuestraMasa, null); o.aeromovil = `${nombreVehiculo}\nCd: el túnel lo está calculando…${l ? `\n${l}` : ''}`; }
    return o;
  }, [tunel, verConsumo, filasComparar, kmhComparar, garajeVisor, esBala, esTri, esBas, soloGaraje, nombreVehiculo, disenosGaraje.carteles, res.mVeh, res.A, actual]);
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
  /** «Eliminar del garaje» on a reference car (2026-11-16): out of the list and the 3D; «Solo mostrar este» on it ends. */
  const quitarDelGaraje = (id: string) => { setGaraje(g => quitarReferencia(g, id)); if (eleccion.solo === id) eleccion.setSolo(null); };
  const garajeLista = (
    <ListaGaraje g={disenosGaraje} e={eleccion} actual={actual} nombreVehiculo={nombreVehiculo} puedeDecidir={!!dueno?.puedeDecidir}
      referencias={VEHICULOS_GARAJE.map(v => { const g = garaje.find(x => x.id === v.id); return { id: v.id, nombre: v.nombre, largo: v.largo, masa: masaGaraje(v), visible: !!g?.visible, quitado: !!g?.quitado }; })}
      alAlternarReferencia={id => setGaraje(g => alternarReferencia(g, id))}
      alQuitarReferencia={quitarDelGaraje} alRecuperarReferencia={id => setGaraje(g => recuperarReferencia(g, id))}
      alElegido={() => { if (window.matchMedia('(max-width: 639px)').matches) setPanelGaraje(false); }} />
  );
  const garajeBloque = (
    <Bloque titulo="Garaje" nota="tus diseños y coches de referencia">
            {garajeLista}
    </Bloque>
  );
  const capas = esBas ? CAPAS.filter(c => c.k !== 'transmision') : esBala ? CAPAS.filter(c => CAPAS_BALA.includes(c.k)) : esTri ? CAPAS.filter(c => CAPAS_TRICICLO.includes(c.k)) : CAPAS.filter(c => !('solo' in c) || c.solo === modelo.tipo);
  const a1 = res.a1;
  // the department tabs: the A1's eleven; the Triciclo's six plus «Proyecto», with its own one-liners (which follow its options)
  const pestanas = porDeps
    ? DEPARTAMENTOS.filter(d => d.id === 'proyecto' || (DEPS_TRICICLO as string[]).includes(d.id)).flatMap(d => [{ ...d, lema: esBas ? LEMAS_BASCULANTE[d.id as DepTriciclo | 'proyecto'] : lemasTriciclo(camposTriciclo(P))[d.id as DepTriciclo | 'proyecto'] },
      // (2026-11-17) «Masas» right after «Proyecto»
      ...(d.id === 'proyecto' ? [{ id: 'masas' as IdDepartamento, lema: 'el peso total, el centro de gravedad y el peso en cada eje y en cada rueda' }] : []),
      // (2026-11-17, «consumos») «Consumos» right after «Motor», before «Batería» (Triciclo family only)
      ...(d.id === 'propulsion' && esTri ? [{ id: 'consumos' as IdPestana, lema: 'consumo en litros y kWh a los 100 km, autonomía, velocidades y del enchufe a la rueda' }] : [])] as { id: IdPestana; lema: string }[])
      // (2026-11-17, «precios») «Mano de obra» at the end
      .concat([{ id: 'manoobra', lema: 'las horas de taller para construir el prototipo y lo que cuestan' }])
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
          {(esA1 || porDeps)
            ? <PestanasDepartamento lista={porDeps ? [...pestanas, PESTANA_HOMOLOGACION] : pestanas} kg={porDeps ? kgPorDepartamento(res) : null} consumo={consumoPestana} extra={coste ? { manoobra: eur(coste.manoObra) } : undefined} dep={seccion === 'diseno' ? (porDeps ? depTri : dep) : null} alElegir={d => { setDep(d); setSoloDep(false); if (seccion !== 'diseno') navegar('/aeromovil'); }} />
            : null}
          <div className="flex-1 sm:hidden" />
          {!(esA1 || porDeps) && <div className="hidden flex-1 sm:block" />}
          <MenuSecciones lista={SECCIONES.filter(s => (s.k !== 'componentes' && s.k !== 'aranceles') || esA1)} seccion={seccion} abiertas={abiertas} alIr={navegar} />
        </div>
      </header>

      {/* El diseño se queda montado aunque se mire otra vista: así «Exportar» puede sacar el STL de lo que se ve. */}
      <main className={cn('mx-auto max-w-[1600px] gap-4 px-4 py-4', seccion === 'diseno' ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px]' : 'hidden')}>
        <div className="min-w-0">
        <section ref={ventana3d} aria-label="Vista 3D" className={cn('overflow-hidden bg-slate-50',
          completa === 'no' ? cn('relative h-[62vh] min-h-[380px] rounded-xl border border-slate-200', esA1 ? 'lg:h-[72vh]' : 'lg:sticky lg:top-[68px] lg:h-[calc(100vh-88px)]')
            : completa === 'css' ? 'fixed inset-0 z-[100] h-[100dvh] w-screen' : 'relative h-full w-full')}>
          <Visor3D ref={visor} modelo={modelo} visibles={visibles} rayosX={rayosX} corte={corte} curva={curva} bascular={bascular} cotas={verCotas} abierta={abierta} maleteros={maleteros} sinPasajero={sinPasajero} garaje={garajeConDisenos} soloGaraje={!!soloGaraje} tunel={tunel} carteles={carteles} cuerposTunel={cuerposTunel} opcionesTunel={opcionesTunelVisor} alElegirPuntoTunel={setPuntoTunel} puntoTunel={puntoTunel} fichasGaraje={disenosGaraje.fichas} superponer={!!superponer && !soloGaraje} vista={vista}
            referencia={referencia} modoRef={modoRef} alinear={alinear} alPinchar={esA1 ? c => { navegar(`/aeromovil/componentes/${c}`); window.scrollTo({ top: 0 }); } : undefined}
            alPincharGaraje={eleccion.alPincharGaraje} alPincharNuestro={donde => { eleccion.setTarjeta(true); eleccion.setPendiente(null); if (donde && modelo.tipo === 'triciclo') { const z = zonaTriciclo(modelo, donde); setDep(z.dep); setSoloDep(false); setAbrirBloque(a => ({ bloque: z.bloque, n: (a?.n ?? 0) + 1 })); } }} extraTarjeta={id => <><BotonFilaReferencia g={disenosGaraje} id={id} /><BotonSoloReferencia e={eleccion} id={id} /><BotonEditableReferencia e={eleccion} id={id} />{VEHICULOS_GARAJE.some(v => v.id === id) && !soloUrl && <BotonQuitarReferencia key={id} id={id} nombre={VEHICULOS_GARAJE.find(v => v.id === id)!.nombre} alQuitar={quitarDelGaraje} />}</>}
            alMoverGaraje={superponer || soloGaraje ? undefined : disenosGaraje.mover}
            seguir={eleccion.seguir} nombres={soloUrl ? undefined : disenosGaraje.nombres} resaltarNuestro={disenosGaraje.enFila > 0} verGaraje={panelGaraje && !soloGaraje}
            margenDerecho={panelGaraje && typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 352 : 0}
            colores={colores} centroGravedad={seccion === 'diseno' && porDeps && depTri === 'masas' ? centroParaVisor(masas) : null} />
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
          <TarjetaDiseno e={eleccion} g={disenosGaraje} actual={actual} porDefecto={!!disenosGaraje.lista?.find(d => d.id === actual?.id)?.por_defecto} nombreVehiculo={nombreVehiculo} puedeDecidir={!!dueno?.puedeDecidir}
            bascular={anguloBascular > 0 ? { angulo: anguloBascular, alPulsar: () => { setCurva(false); setBascular(n => n + 1); } } : undefined}
            className={cn('inset-x-2 top-14 sm:inset-x-auto sm:left-3 sm:top-12 sm:w-[min(340px,calc(100%-24px))]', panelGaraje && 'hidden sm:block sm:w-[min(340px,calc(100%-376px))]')} />
          <AvisoCambios e={eleccion} actual={actual} puedeDecidir={!!dueno?.puedeDecidir} className={cn('inset-x-2 top-14 sm:inset-x-auto sm:left-3 sm:top-12 sm:w-[min(360px,calc(100%-24px))]', panelGaraje && 'sm:w-[min(360px,calc(100%-376px))]')} />
          {/* La explicación de un punto del túnel va dentro de la ventana 3D: así también se ve en pantalla completa. */}
          {tunel && puntoTunel && (
            <PanelPunto sel={puntoTunel} cuerpos={cuerposTunel} resultados={resultadosTunel} kmh={kmhComparar} resolucion={opcionesTunel.resolucion}
              P={P} puedeDecidir={!!dueno?.puedeDecidir} alCerrar={() => setPuntoTunel(null)} alElegir={setPuntoTunel}
              className="absolute inset-x-2 bottom-2 top-12 sm:inset-x-auto sm:bottom-24 sm:right-3 sm:w-[400px]" />
          )}
          {superponer && !soloGaraje && (
            <TarjetaSuperponer alineacion={superponer} alCambiar={setSuperponer} alAlternar={id => setGaraje(g => alternarReferencia(g, id))} alCerrar={() => setSuperponer(null)} className={referencia && modoRef !== 'no' ? 'right-3 top-40 sm:right-[52px] sm:top-28' : 'right-3 top-12 sm:right-[52px] sm:top-3'}
              filas={[
                { id: 'aeromovil', nombre: nombreVehiculo, color: '#1e3a5f', largo: modelo.Lf, ancho: modelo.P.W, alto: modelo.P.H, batalla: modelo.P.B },
                // Todos los coches con silueta, visibles o no: pinchando en el nombre se ponen o se quitan.
                ...VEHICULOS_GARAJE.filter(d => d.envolvente && !garaje.find(g => g.id === d.id)?.quitado).map(d => ({ id: d.id, nombre: d.nombre, color: colorCss(d.id), largo: d.largo, ancho: d.ancho, alto: d.alto, batalla: d.batalla, visible: !!garaje.find(g => g.id === d.id)?.visible })),
              ]} />
          )}
          {/* (sm: right-[156px] leaves room for the «Garaje» button, which sits at right-14 next to full screen) */}
          {verConsumo && !tunel && !superponer && (
            <div className="absolute right-3 top-12 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm backdrop-blur sm:right-[156px] sm:top-3" role="group" aria-label="Velocidad de los carteles">
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
            {esBas ? `Biplaza en tándem, reclinados · cuatro ruedas que se inclinan ${Math.round((modelo.tipo === 'basculante' ? modelo.phiMax : 0) * 180 / Math.PI)}° · eléctrico ${fmt(camposBasculante(P).qKWNom, 1)}/${fmt(camposBasculante(P).qKWPico, 1)} kW · ${fmt(camposBasculante(P).qKWh, 1)} kWh` : esA1 ? `${P.plazas === 2 ? 'Tándem 1+1' : 'Monoplaza'} · cuatro ruedas · eléctrico ${P.kWNom}/${P.kWPico} kW · ${P.kWh} kWh` : esBala ? 'Biplaza a horcajadas · rombo de ruedas, laterales fijas en carenados' : esTri ? `${camposTriciclo(P).tAsientos === 'filas' ? rotuloFilas(camposTriciclo(P)) : conButacas(camposTriciclo(P)) ? 'Biplaza en tándem, dos butacas como el Aptera' : 'Biplaza a horcajadas'} · ${esRombo(camposTriciclo(P)) ? `cuatro ruedas en rombo, las laterales en carenados${modelo.tipo === 'triciclo' && modelo.bascula ? ' que se inclinan' : ''}` : esCuatro(camposTriciclo(P)) ? 'cuatro ruedas, dos delante y dos detrás en carenados' : 'tres ruedas, dos delante en carenados'} · eléctrico ${fmt(camposTriciclo(P).tKWNom, 1)}/${fmt(camposTriciclo(P).tKWPico, 1)} kW · ${fmt(modelo.tipo === 'triciclo' ? modelo.kWh : camposTriciclo(P).tKWh, 1)} kWh${modelo.tipo === 'triciclo' && modelo.paquete ? ' a lo largo del bastidor' : ''}${modelo.tipo === 'triciclo' && modelo.phev ? ` · híbrido enchufable, gasolina ${fmt(modelo.phev.kW, 1)} kW ${modelo.phev.arq === 'reparto' ? 'con planetario' : modelo.phev.arq === 'serie' ? 'en serie' : 'en paralelo'}` : ''}` : 'Tándem 1+2 · rombo basculante · pedaleo asistido'}
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
            {(esA1 || porDeps) && (porDeps ? depTri : dep) !== 'proyecto' && capasSolo(porDeps ? depTri : dep) && (
              <Button variant="outline" aria-pressed={soloDep} onClick={() => verSolo(!soloDep)}
                className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', soloDep && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                {soloDep ? 'Mostrar todo' : `Mostrar solo ${SOLO_DEP[porDeps ? depTri : dep] ?? NOMBRE_CORTO[porDeps ? depTri : dep].toLowerCase()}`}
              </Button>
            )}
            {/* El Bala no se inclina ni tiene la dirección dibujada: sin «Simular curva». */}
            {([['Cotas', verCotas, setVerCotas], ['Rayos X', rayosX, setRayosX], ['Corte', corte, setCorte], ...(esBala ? [] : [[esA1 || esTri ? 'Girar ruedas' : 'Simular curva', curva, setCurva]])] as [string, boolean, (v: boolean) => void][]).map(([n, v, f]) => (
              <Button key={n} variant="outline" aria-pressed={v} onClick={() => f(!v)}
                className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', v && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{n}</Button>
            ))}
            {/* Cuadriciclo Basculante (2026-11-15): «Bascular», the car and its four wheels leaning to the maximum each way and back */}
            {anguloBascular > 0 && (
              <Button variant="outline" onClick={() => { setCurva(false); setBascular(n => n + 1); }}
                title={`Inclina la carrocería y las cuatro ruedas hasta ${anguloBascular}° a cada lado y vuelve, como en una curva`}
                className="bg-white px-2 py-1 text-[11px] normal-case tracking-normal">Bascular</Button>
            )}
            <Button variant="outline" aria-pressed={abierta} onClick={() => setAbierta(!abierta)}
              className={cn('bg-white px-2 py-1 text-[11px] normal-case tracking-normal', abierta && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
              <DoorOpen className="mr-1 h-3 w-3" />{abierta ? 'Cerrar' : 'Abrir'} {esBas ? (camposBasculante(P).qCarroceria === 'smera' ? 'puertas' : 'cúpula') : (esBala || esTri || Pa.puerta === 'cabina') && !(esTri && conPuertas(camposTriciclo(P))) ? 'cúpula' : 'puertas'}
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
            <Button variant="outline" aria-pressed={tunel} onClick={alternarTunel}
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
        {esA1 && DEPARTAMENTOS.some(x => x.id === dep) && <PanelDepartamento d={DEPARTAMENTOS.find(x => x.id === dep)!} P={P} res={res} modelo={modelo} />}
        {/* (2026-11-17, Eugenio: «Falta un apartado en el menú que sea de homologación») the pre-check under the 3D view;
            the Gota and the Bala, which have no tabs, open it with a button */}
        {((esA1 && dep === 'homologacion') || (porDeps && depTri === 'homologacion') || (!esA1 && !porDeps && verHomologacion)) &&
          <PanelHomologacion P={paraCalcular.P} modelo={paraCalcular} res={res} cd={esTri ? cdTri : esBas ? cdBas : null} nombre={nombreVehiculo} />}
        {!esA1 && !porDeps && (
          <Button variant="outline" onClick={() => setVerHomologacion(v => !v)} aria-expanded={verHomologacion} className="mt-3 w-full justify-center gap-1.5 bg-white px-3 py-2 text-[13px] normal-case tracking-normal">
            <ShieldCheck className="h-4 w-4" />{verHomologacion ? 'Ocultar la homologación' : 'Homologación: ¿en qué categoría entra y qué cumple?'}
          </Button>
        )}
        </div>

        <aside className="mt-4 flex flex-col gap-3 lg:mt-0">
          {/* round 3 interior (2026-11-12): «Ver solo …» above the sliders of each department (the Aeromóvil 1's and the Triciclo's) */}
          {(esA1 || porDeps) && (porDeps ? depTri : dep) !== 'proyecto' && capasSolo(porDeps ? depTri : dep) && (() => {
            const d = porDeps ? depTri : dep, n = NOMBRE_CORTO[d].toLowerCase();
            return (
              <Button variant="outline" aria-pressed={soloDep} onClick={() => verSolo(!soloDep)}
                className={cn('w-full justify-center gap-1.5 bg-white px-3 py-2 text-[13px] font-semibold normal-case tracking-normal', soloDep && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                <Layers3 className="h-4 w-4" />{soloDep ? `Viendo solo ${n} · volver a las capas de antes` : `Ver solo ${n}`}
              </Button>
            );
          })()}
          {(esA1 ? dep === 'proyecto' : porDeps ? false : true) && garajeBloque}

          {dueno && !dueno.puedeDecidir && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Los parámetros solo los cambia el dueño del Aeromóvil con su sesión iniciada; aquí se pueden mirar, girar el 3D y leer los departamentos.
              {!dueno.sesion && <> <Link to="/login" className="font-semibold underline">Iniciar sesión</Link></>}
            </div>
          )}
          <fieldset disabled={!dueno?.puedeDecidir} className={cn('contents', !dueno?.puedeDecidir && '[&_input]:cursor-not-allowed [&_select]:opacity-70 [&_input]:opacity-70')}>
          {/* 2026-11-13: the body's colour, in «Carrocería» (the Gota and the Cuadriciclo en rombo have no departments: always) */}
          {((esA1 || porDeps) ? (porDeps ? depTri : dep) === 'carroceria' : true) && <Bloque titulo="Color de la carrocería"><ColoresCarroceria P={P} set={set} /></Bloque>}
          {/* 2026-11-17 (Eugenio: «mete la parte de aerodinámica dentro de carrocería… un botón que diga "hacer estudio aerodinámico"»): the tunnel and the study, in «Carrocería» (always for the vehicles without departments) */}
          {((esA1 || porDeps) ? (porDeps ? depTri : dep) === 'carroceria' : true) && <BloqueAerodinamica P={P} set={set} kmh={kmhComparar} resolucion={opcionesTunel.resolucion} tunel={tunel} alTunel={alternarTunel} />}
          {/* (2026-11-17) «Proyecto»: the prototype's cost first (precios/BloqueCoste.tsx) */}
          {porDeps && depTri === 'proyecto' && coste && <BloqueCoste c={coste} alIr={d => { setDep(d as IdDepartamento); setSoloDep(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
          {/* (2026-11-17) «Homologación» of the vehicles with departments: a short card here, the detail under the 3D view */}
          {porDeps && depTri === 'homologacion' ? <ResumenHomologacion P={paraCalcular.P} modelo={paraCalcular} res={res} cd={esTri ? cdTri : esBas ? cdBas : null} nombre={nombreVehiculo} />
            /* (2026-11-17) «Mano de obra»: the labour's tab (precios/PanelManoObra.tsx) */
            : porDeps && depTri === 'manoobra' ? (coste ? <PanelManoObra c={coste} P={P} set={set} /> : null)
            /* (2026-11-17) «Masas» and «Proyecto» of the vehicles with departments: their own panels (LadoResumen.tsx) */
            : porDeps && (depTri === 'masas' || depTri === 'proyecto') && (paraCalcular.tipo === 'triciclo' || paraCalcular.tipo === 'basculante') ? <LadoResumen dep={depTri} modelo={paraCalcular} res={res} masas={masas} alIr={d => { setDep(d as IdDepartamento); setSoloDep(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}  extra={depTri === 'proyecto' ? fallosHomologacion : undefined} />
            : modelo.tipo === 'a1' ? <LadoA1 P={P} Pa={Pa} D={D} set={set} res={res} modelo={modelo} neumaticos={neumaticos} malas={malas} dep={dep as IdDepartamento} alNavegar={r => { navegar(r); window.scrollTo({ top: 0 }); }} />
            : modelo.tipo === 'basculante' ? (paraCalcular.tipo === 'basculante' && res.basculante ? <LadoBasculante P={P} set={set} res={res} modelo={paraCalcular} dep={depTri as Exclude<typeof depTri, 'masas' | 'homologacion' | 'consumos' | 'manoobra'>} cd={cdBas} ui={{ Bloque, Deslizador, Selector: Selector as never, ListaComprobaciones }} /> : null)
            : modelo.tipo === 'bala' ? <LadoBala P={P} set={set} res={res} modelo={modelo} cdTunel={tunel ? cdTunelNuestro : undefined} />
            : modelo.tipo === 'triciclo' && res.triciclo && depTri === 'consumos' && paraCalcular.tipo === 'triciclo' ? <LadoConsumos P={P} set={set} res={res} modelo={paraCalcular} cd={cdTri} />
            : modelo.tipo === 'triciclo' && res.triciclo ? <><LadoTriciclo P={P} set={set} res={res} modelo={paraCalcular.tipo === 'triciclo' ? paraCalcular : modelo} dep={depTri as Exclude<typeof depTri, 'masas' | 'homologacion' | 'consumos' | 'manoobra'>} cd={cdTri} abrir={abrirBloque} />
              {/* (2026-11-17) «Batería»: the solar and charging system, part by part (electrico/) */}
              {depTri === 'energia' && paraCalcular.tipo === 'triciclo' && <BloqueSistemaElectrico modelo={paraCalcular} res={res} />}</>
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
          {porDeps && depTri === 'proyecto' && garajeBloque}
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
      {seccion === 'circuito' && (
        <Suspense fallback={<p className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-slate-500">Cargando el circuito…</p>}>
          <VistaCircuito modelo={paraCalcular} res={res} nombreDiseno={nombreVehiculo} />
        </Suspense>
      )}
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
