// The Triciclo family side panel (Triciclo, Cuadriciclo clásico, rombo): sliders, selectors and info sheets by department, which fields show, and the 3D click → block mapping.
// Moved out of pages/Aeromovil.tsx unchanged (2026-11-16, refactor «ordenar»). See ./CLAUDE.md for the layout.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Wind } from 'lucide-react';
import { type Modelo, type ModeloTriciclo, type Parametros, type Resultados } from './geometria';
import { ALTO_FILAS, ANCHO_FILAS, AUXILIARES, valorFijoCatalogo, EQUIPAJE, RENDIMIENTO, RUEDAS_TRICICLO, SELECTORES_TRICICLO, USABLE, bateriaChasis, camposTriciclo, cargasRueda, conButacas, conSalpicadero, grupoPieza, masaButaca, conPortonAptera, conPuertas, deslizadoresTriciclo, energiaTriciclo, conBatalla, esCuatro, esRombo, estirarTriciclo, guardarTriciclo, largoTriciclo, lemasTriciclo, limitarTriciclo, nombreTriciclo, vistaTriciclo, type DepTriciclo, type FichaTriciclo } from './geometriaTriciclo';
import { TECNOLOGIAS_BASCULA, type Tilt } from './basculacion';
import { TAPICES } from './interiorTriciclo';
import { cuerpoTriciclo, peticionDe as peticionTunel } from './tunel/nuestro';
import { claveTunel } from './tunel/calculo';
import { pedirTunel, resultadoEnCache } from './tunel/cliente';
import type { Resolucion } from './tunel/malla';
import { filasDetras, fraseFila } from './filasTriciclo';
import { FichaHibrido } from './FichaHibrido';
import { TallasOcupantes } from './TallasOcupantes';
import { CatalogoPieza, type Necesidad } from './CatalogoTren';
import { ComparadorMotores } from './ComparadorMotores';
import { BloqueElectronica, BLOQUE_ELECTRONICA } from './electronica/BloqueElectronica';
import { BLOQUE_REFRIGERACION, BloqueRefrigeracion } from './RefrigeracionTriciclo';
import { BLOQUE_PEDALES, BloqueClaseBici, BloquePedales } from './BiciTriciclo';
import { BLOQUE_BICI } from './triciclo/campos';
import { esBici } from './bici/clase';
import { pasoTriciclo } from './triciclo/medidas';
import { pesoSeccion, seccionesTriciclo, textoPesoSeccion } from './masasSecciones';
import { DesglosePeso, SinSeccion } from './PesoSeccion';
import { ContextoProveedores } from './proveedores/ProveedorParte';
import { conPrecio, precioSeccion, preciosDiseno, textoPesoPrecio, type ContextoPrecio } from './precios/precios';
import { valoresCatalogo, type CATALOGO_CLAVES } from './catalogoTren';
import { fmt, m2, Deslizador, Bloque, Selector, ListaComprobaciones } from './controles';
import { BloqueBWB, BLOQUE_BWB } from './BloqueBWB';
import { neumaticosTriciclo } from './triciclo/neumaticos';
import { crrTriciclo, textoCrrTriciclo } from './triciclo/energia';
import { lineaNeumatico } from './ruedas/neumaticos';
import { ANGULO_MAX, estimacionKamm } from './garaje/kamm';

/** El Cd del túnel para el Triciclo: lo que da, a qué área se refiere y si aún calcula. */
export interface CdTriciclo { calculando: boolean; cd?: number; areaRef?: number }
/**
 * El Cd del Triciclo (2026-11-10): el del túnel de viento, calculado en segundo plano (solo las cifras) con la
 * silueta de la carrocería y sus tres ruedas, en el trabajador del túnel. Se pide medio segundo después del último
 * cambio de la silueta; los deslizadores que no la cambian (masas, motor, batería…) no lo vuelven a pedir. El túnel
 * da el Cd a 50, 80 y 120 km/h; a otra velocidad se interpola entre los dos más cercanos.
 */
export function useCdTriciclo(modelo: Modelo, resolucion: Resolucion, kmh: number): CdTriciclo {
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
 * The tilt system's engineering sheet (2026-11-16, basculacion.ts): the figures it is sized on, then every part with
 * what it does, what to build or buy, and its mass, for the people who will make it.
 */
export function FichaTilt({ t, tres, rombo }: { t: Tilt; tres: boolean; rombo: boolean }) {
  const tec = TECNOLOGIAS_BASCULA.find(x => x.k === t.tec)?.n ?? t.tec;
  return (
    <div className="flex flex-col gap-2.5 text-xs text-slate-600">
      <p className="text-slate-500">{tec}. {tres ? 'El triciclo se inclina sobre los brazos de delante: la rueda de la cola va en la carrocería, se inclina con ella y no aguanta nada de lado, así que el balancín de delante sostiene el coche entero.' : rombo ? 'En rombo se inclina sobre los brazos de las laterales: las ruedas del morro y de la cola se inclinan con la carrocería.' : 'Con cuatro ruedas, un balancín en cada eje, cada uno con la parte del peso que lleva su eje.'} Un balancín en el centro, unido a los dos brazos de arriba por dos bieletas, gira lo mismo que ellos: lo que gira el balancín inclina el coche.</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt>Momento del coche parado y del todo inclinado</dt><dd className="text-right font-mono">{fmt(t.momentoEstatico, 0)} N·m</dd>
        <dt>Momento de diseño (con el margen y la inercia)</dt><dd className="text-right font-mono">{fmt(t.momentoDiseno, 0)} N·m</dd>
        <dt>De derecho a inclinado del todo</dt><dd className="text-right font-mono">{fmt(t.tiempo, 2)} s</dd>
        {t.porEje.map(e => <Fragment key={e.nombre}><dt>Balancín {e.nombre}: par y giro</dt><dd className="text-right font-mono">{fmt(e.parBalancin, 0)} N·m · ×{fmt(e.relacion, 2)}</dd></Fragment>)}
        {t.tec !== 'libre' && <><dt>Potencia de pico</dt><dd className="text-right font-mono">{fmt(t.potenciaTotal, 0)} W</dd><dt>Energía por curva (ida y vuelta)</dt><dd className="text-right font-mono">{fmt(t.energiaCurva / 3600, 2)} Wh</dd></>}
        <dt className="font-semibold">Masa de todo el sistema</dt><dd className="text-right font-mono font-semibold">{fmt(t.kg, 1)} kg</dd>
      </dl>
      <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Piezas para fabricar o comprar</h4>
      <ol className="flex flex-col gap-2">
        {t.componentes.map((c, i) => (
          <li key={c.id} className="rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-baseline justify-between gap-2"><span className="font-semibold text-slate-800">{i + 1}. {c.nombre}{c.cantidad > 1 ? ` (×${c.cantidad})` : ''}</span><span className="shrink-0 font-mono text-slate-500">{fmt(c.kg, 2)} kg</span></div>
            <p className="mt-1 text-slate-500">{c.funcion}</p>
            <ul className="mt-1 list-disc pl-4">{c.ficha.map(l => <li key={l}>{l}</li>)}</ul>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-slate-400">Estimaciones de un primer diseño: el momento con el coche parado y del todo inclinado por el margen, más la inercia de inclinarse en ese tiempo; el motor a 3.000 rpm y 48 V con un 55 % entre la planetaria y el sin fin; la hidráulica a 120 bar; masas por reglas de piezas de su clase. Un ingeniero tiene que comprobarlas antes de comprar nada. El vuelco, el consumo y la autonomía todavía no cuentan la inclinación.</p>
    </div>
  );
}

/**
 * The interior finish's sheet (2026-11-16, interiorTriciclo.ts): what is drawn and what it weighs, part by part.
 */
export function FichaAcabado({ T, piezas, areas, consola }: { T: { tAcabado: string; tConsolaTecho: string; tConsolaCentral: string; tAmbiente: string }; piezas: { nombre: string; kg: number; nota?: string }[]; areas: { lados: number; techo: number; suelo: number } | null; consola: boolean }) {
  const ps = piezas.filter(p => /^(Interior|Tapicería|Cinturones)/.test(p.nombre));
  return (
    <div className="-mt-1 flex flex-col gap-1.5 text-xs text-slate-500">
      <p>{T.tAcabado === 'chasis'
        ? 'Sin forro, como hasta ahora: por dentro se ven la piel de la carrocería y el chasis tubular (largueros, travesaños, la cuna y la torreta del amortiguador). Con «Paneles» o «Lujo» se forran los costados hasta el borde del cristal, el techo bajo el panel solar y el suelo sobre los largueros, y se tapa la torreta.'
        : `${T.tAcabado === 'lujo' ? 'Lujo: paneles acolchados de ante (como el techo del Vision Jet) con espuma y fieltro acústico detrás, a 2,2 cm de la piel' : 'Paneles forrados de tela a 1,4 cm de la piel'}: cubren los costados desde el suelo hasta el borde del cristal (en las puertas, el trozo de cada puerta se abre con ella), el techo bajo el panel solar y su marco, y un suelo de moqueta sobre los largueros; una funda tapa la torreta del amortiguador. Las ventanas quedan libres, con un borde enrollado alrededor. Una moldura recorre los dos costados a la altura de los codos.${areas ? ` Costados ${areas.lados.toFixed(2).replace('.', ',')} m², techo ${areas.techo.toFixed(2).replace('.', ',')} m², suelo ${areas.suelo.toFixed(2).replace('.', ',')} m².` : ''}${T.tConsolaTecho !== 'no' && !consola ? ' La consola de techo necesita techo opaco (el panel solar) encima de los asientos: con esta cúpula no cabe.' : ''}`}</p>
      {ps.length > 0 && <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5">{ps.map(p => <Fragment key={p.nombre}><dt>{p.nombre}{p.nota && <span className="block text-[11px] text-slate-400">{p.nota}</span>}</dt><dd className="text-right font-mono tabular-nums">{p.kg >= 0 ? '+' : '−'}{Math.abs(p.kg).toFixed(1).replace('.', ',')} kg</dd></Fragment>)}</dl>}
      <p className="text-[11px] text-slate-400">Masas estimadas para piezas de su clase (kg por m² de panel, de moqueta, de funda; kg por metro de moldura), no pesadas.</p>
    </div>
  );
}

/** The order of the side panel's blocks (2026-11-15): the body front to back, then the rest as they come. */
// (2026-11-16, Eugenio: «la parte de propulsión … tiene que estar arriba del todo»: in Motor, propulsion first, then the hybrid, then the electric motor)
export const ORDEN_BLOQUES = ['Propulsión', 'Híbrido enchufable', 'Motor eléctrico', 'Forma', 'Morro', 'Cúpula', 'Cola', 'Techo solar y ventanas', 'Carenados', 'Puertas y maletero', 'Material y espesores'];
export const ordenBloque = (b: string) => { const i = ORDEN_BLOQUES.indexOf(b); return i < 0 ? 100 : i; };
/**
 * (2026-11-17, Eugenio: «que en los desplegables también de motor eléctrico y motor gasolina que aparezcan con esos
 * nombres, y que según la selección que tengas, pues que aparezca también el peso de ese desplegable»): the hybrid's
 * block shows as «Motor gasolina»; its key stays «Híbrido enchufable» (FILAS, ORDEN_BLOQUES, zonaTriciclo and the
 * remembered open blocks use it). Both engine blocks carry their mass in the header (`peso`, masasSecciones.ts).
 */
const TITULO_BLOQUE: Partial<Record<string, string>> = { 'Híbrido enchufable': 'Motor gasolina' };
const BLOQUES_MOTOR = ['Motor eléctrico', 'Híbrido enchufable'];
/**
 * Which department and block a click on the Triciclo's 3D model opens (2026-11-15): by the layer it hit, and on the
 * body by where: ahead of the canopy's glass the nose, behind it the tail, between them the canopy (or the general sizes
 * low on the flanks).
 */
export function zonaTriciclo(m: ModeloTriciclo, d: { punto: [number, number, number]; capa: string | null; nombres: string[] }): { dep: DepTriciclo; bloque: string } {
  const [x, y] = d.punto, n = d.nombres.join(' ');
  if (/comp:basculacion/.test(n)) return { dep: 'rodaje', bloque: 'Basculación' };
  // (2026-11-16) the hybrid's engine, its connection, tank and exhaust (hibrido3d.ts)
  if (/comp:hibrido/.test(n)) return { dep: 'propulsion', bloque: 'Híbrido enchufable' };
  // (2026-11-17, capo) the cooling: intakes, radiator, pipes (visor/refrigeracion.ts)
  if (/comp:refrigeracion/.test(n)) return { dep: 'propulsion', bloque: BLOQUE_REFRIGERACION };
  // (2026-11-24) the driver's pedals and their generator (visor/bici.ts)
  if (/comp:pedales/.test(n)) return { dep: 'propulsion', bloque: BLOQUE_PEDALES };
  // (2026-11-16) the interior finish's parts (garaje/balaInterior.ts)
  if (/cinturon/.test(n)) return { dep: 'interior', bloque: 'Tapicería' };
  if (/forro|moldura|consola|reposabrazos|suelo-moqueta|borde-ventana|funda-torreta|luz-ambiente|foco/.test(n)) return { dep: 'interior', bloque: 'Acabado interior' };
  if (/puerta|porton|maletero/i.test(n)) return { dep: 'carroceria', bloque: 'Puertas y maletero' };
  if (/carenado|brazo/i.test(n)) return { dep: 'carroceria', bloque: 'Carenados' };
  switch (d.capa) {
    case 'ruedas': case 'suspension': case 'direccion': return { dep: 'rodaje', bloque: 'Ejes y ruedas' };
    case 'chasis': return { dep: 'chasis', bloque: 'Bastidor' };
    case 'baterias': return { dep: 'energia', bloque: 'Batería' };
    case 'motor': case 'transmision': return { dep: 'propulsion', bloque: 'Motor eléctrico' };
    case 'asientos': case 'ocupantes': return { dep: 'interior', bloque: deslizadoresTriciclo().find(f => f.dep === 'interior')?.bloque ?? 'Asientos' };
    case 'solar': return { dep: 'carroceria', bloque: 'Techo solar y ventanas' };
    case 'cristales': return { dep: 'carroceria', bloque: 'Cúpula' };
  }
  const T = m.campos, ini = -limitarTriciclo('tCupIni', T), fin = -limitarTriciclo('tCupFin', T);
  if (x > ini) return { dep: 'carroceria', bloque: 'Morro' };
  if (x < fin) return { dep: 'carroceria', bloque: 'Cola' };
  return { dep: 'carroceria', bloque: y > 0.75 + m.elevar ? 'Cúpula' : 'Forma' };
}
/**
 * Los deslizadores y las cifras del Triciclo Bala (2026-11-10, Eugenio: «permite modificar todo lo que se permitía
 * modificar en el Apterike»), por departamentos como el Aeromóvil 1. Etiquetas, departamentos, bloques y rangos salen
 * de `deslizadoresTriciclo()` (geometriaTriciclo.ts), la misma tabla que leen las opciones del túnel; las de la forma,
 * de la del Cuadriciclo en rombo. «Proyecto» es el resumen: todas las comprobaciones, el rendimiento y el peso.
 */
export function LadoTriciclo({ P, set, res, modelo, dep, cd, abrir }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: ModeloTriciclo; dep: DepTriciclo | 'proyecto'; cd: CdTriciclo;
  /** (2026-11-15) a block to open and show: the one under a click on the 3D car (`n` changes on every click) */
  abrir?: { bloque: string; n: number } | null;
}) {
  // (2026-11-15, Eugenio: «los slider en acordeón plegados por categoría … y con capacidad de pinchar y que se vea la
  // configuración»): every block folds; which are open is remembered in this browser (a convenience: it may come back empty)
  const [abiertos, setAbiertos] = useState<Set<string>>(() => { try { const a = new Set(JSON.parse(localStorage.getItem('aeromovil.bloquesAbiertos') ?? '[]') as string[]); if (a.has('Motor')) a.add('Motor eléctrico'); /* (renamed 2026-11-16) */ return a; } catch { return new Set(); } });
  const alternar = (b: string) => setAbiertos(a => { const n = new Set(a); if (n.has(b)) n.delete(b); else n.add(b); try { localStorage.setItem('aeromovil.bloquesAbiertos', JSON.stringify([...n])); } catch { /* nada */ } return n; });
  useEffect(() => {
    if (!abrir) return;
    setAbiertos(a => (a.has(abrir.bloque) ? a : new Set([...a, abrir.bloque])));
    const t = setTimeout(() => document.getElementById(`bloque-${abrir.bloque}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [abrir]);
  const T = camposTriciclo(P), rt = res.triciclo!, cm = (v: number, d = 1) => `${fmt(v * 100, d)} cm`;
  const e = cd.cd != null && cd.areaRef != null ? energiaTriciclo(modelo, res.mTot, { cd: cd.cd, areaRef: cd.areaRef }) : null;
  const bici = esBici(T);
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
      case 'tEjeTras': return Math.abs(v) < 0.005 ? 'donde lo deja la batalla' : v > 0 ? `${cm(v, 0)} más adelante` : `${cm(-v, 0)} más atrás`;
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
      // (2026-11-13: with the smooth body the nose's and the tail's edges stay where the deck can still fall to them: what is built, if it differs)
      case 'tMorroAlto': { const pu = modelo.F.puntas, d = pu.morro - pu.morroPedida, txt = (w: number) => (Math.abs(w) < 0.0005 ? 'como siempre' : `${w > 0 ? '+' : '−'}${cm(Math.abs(w), 1)}`); return Math.abs(d) > 0.001 ? `${txt(v)} → ${txt(v + d)} (lo que deja la cubierta lisa)` : txt(v); }
      case 'tPuntaCola': { const pu = modelo.F.puntas, d = pu.cola - pu.colaPedida; return Math.abs(d) > 0.001 ? `${m2(v)} → ${m2(v + d)} (${T.tCubierta === 'lisa' ? 'lo que deja la cubierta lisa' : 'lo que cabe dentro de la cola'})` : m2(v); }
      case 'tLineaCupula': return Math.abs(v) < 0.0005 ? 'como siempre' : `${v > 0 ? '+' : '−'}${cm(Math.abs(v), 1)}`;
      // 2026-11-13: the smooth body
      // (2026-11-16: the round body's flat tail up to 1.5, wider than the cabin; and the cabin–tail transition)
      case 'tColaPlanaAncho': return v < 0.01 ? 'como siempre' : Math.abs(v - 1) < 0.01 ? 'todo el ancho (Aptera)' : v > 1 ? `más ancha que la cabina (+${Math.round((v - 1) * 100)} %)` : `${Math.round(v * 100)} % hacia todo el ancho`;
      // 2026-11-17: the Kamm tail
      case 'tKammSeccion': { const k = modelo.F.kamm; return `${Math.round(v * 100)} % de la sección mayor${k ? `${k.limitado ? ` → ${Math.round(k.fraccion * 100)} % (lo más adelante que deja la cúpula, 15 cm detrás de su final)` : ''} · a ${m2(-k.x)} del eje delantero, ${cm(k.ahorro, 0)} más corta que la cola larga` : ''}`; }
      case 'tKammCavidad': return v < 0.0005 ? 'culote plano' : `${cm(v, 1)} de hondo`;
      case 'tColaTrans': { const t = modelo.F.transicion; return t > 0 && t < v - 0.005 ? `${cm(v, 0)} → ${cm(t, 0)} (lo que cabe entre el final de la cúpula y el eje)` : cm(v, 0); }
      case 'tColaAncho': case 'tMorroAncho': return v < 0.01 ? 'como siempre' : v > 0.99 ? 'todo el ancho (Aptera)' : `${Math.round(v * 100)} % hacia todo el ancho`;
      case 'tColaGrosor': case 'tMorroGrosor': return v < 0.0005 ? 'se cierra en punta' : `${cm(v, 1)} de grueso`;
      case 'tColaBombeo': case 'tMorroBombeo': return v < 0.0005 ? 'plana' : `${cm(v, 1)} sobre la recta`;
      case 'tBajosIni': return Math.abs(v) < 0.005 ? 'en el eje trasero' : `${cm(Math.abs(v), 0)} ${v > 0 ? 'delante' : 'detrás'} del eje trasero`;
      case 'tBajosCurva': return v < 0.01 ? 'suben tarde y de golpe' : v > 0.99 ? 'una curva larga (Aptera)' : `${Math.round(v * 100)} % hacia la curva larga`;
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
        const d = bici && f.clave === 'tMFreno' ? 2 : 1;
        return real > v + 0.05 ? `${fmt(v, d)} → ${fmt(real, d)} kg${f.clave === 'tMFreno' ? ' de media' : ''} (por la carga)` : `${fmt(v, d)} kg`;
      }
      case 'tChSep': { const real = 2 * Math.abs(modelo.tubos.find(t => t.nombre.startsWith('Larguero der'))?.b[2] ?? v / 2); return Math.abs(real - v) > 0.005 ? `${cm(v, 0)} → ${cm(real, 0)} (carrocería estrecha)` : `${cm(v, 0)} de eje a eje`; }
      case 'tMAsiento': return butacas ? `${fmt(v, 1)} kg · butaca ${fmt(masaButaca(v), 1)} kg` : `${fmt(v, 1)} kg`;
    }
    // (2026-11-24) bicycle parts are small: a 250 W motor is not «0,3 kW», nor a 180 g controller «0,2 kg»
    if (bici && (f.clave === 'tKWNom' || f.clave === 'tKWPico')) return v < 1 ? `${Math.round(v * 1000)} W` : `${fmt(v, 2)} kW`;
    if (bici && f.clave === 'tMInversor') return `${fmt(v, 2)} kg`;
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
  // (2026-11-15: a diamond, `tRuedas`, has four wheels too, but one rear in the tail and the pods at the sides)
  const cuatro = esCuatro(T), rombo = esRombo(T), lemas = lemasTriciclo(T), tresOCuatro = cuatro || rombo ? 'cuatro' : 'tres';
  // (2026-11-16, Eugenio: «añade marcas de motores … que podamos seleccionar»): a catalogue part writes its published
  // figures into the sliders (and rangoTriciclo keeps them there while it is chosen); catalogoTren.ts
  const motoresBuje = cuatro ? 2 : 1;
  const elegirCatalogo = (k: typeof CATALOGO_CLAVES[number], id: string) => {
    set(k, id as never);
    for (const [c, v] of Object.entries(valoresCatalogo({ ...T, [k]: id }, motoresBuje))) set(c as keyof Parametros, v as never);
  };
  const necesidad: Necesidad = {
    vel: T.tVel, kWVel: e ? e.potencia / 1000 : null, vmaxPico: e ? e.vmaxPico : null, motores: motoresBuje,
    // on petrol alone: what the wheels ask, through the hybrid's connection, plus the equipment
    kWTermicoVel: e && modelo.phev ? ((e.potencia - AUXILIARES) * RENDIMIENTO / modelo.phev.rendTrans + AUXILIARES) / 1000 : null,
  };
  // 2026-11-12: each new option's sliders only show with it on (a steering wheel's with «Volante», the handlebar's with
  // «Manillar», the doors' with doors, the hatch's with the Aptera hatch, the pack's with the battery along the frame)
  const volante = T.tMando === 'volante', salp = conSalpicadero(T), puertas = conPuertas(T), portonA = conPortonAptera(T), paquete = bateriaChasis(T), butacas = conButacas(T);
  const PUERTA = ['tPuertaDel', 'tPuertaTras', 'tUmbral', 'tCintura', 'tBisagraY', 'tBisagraInc', 'tBisagraDentro', 'tPuertaAbre'];
  const visible = (k: string) => (k === 'tManX' || k === 'tManY') ? !volante : k.startsWith('tVol') ? volante : k.startsWith('tSalp') ? salp
    : PUERTA.includes(k) ? puertas : (k === 'tMalIni' || k === 'tMalAbre' || k === 'tMalLado') ? portonA : (k.startsWith('tBat') && k !== 'tBatDisp') ? paquete
      // round 3 (body): the headlamp's width with the headlamp, the fin's height with the fin, the second door's with it
      : k === 'tFaroD' ? T.tFaro === 'si' : k === 'tAleta' ? T.tConAleta !== 'no' : PUERTA2.includes(k) ? puertas && T.tPuertas2 === 'si'
        // 2026-11-13: the smooth body's sliders only with «Cubierta lisa»
        : LISA.includes(k) ? T.tCubierta === 'lisa'
          // 2026-11-16: the round body's flat tail width, with a flat tail and without the smooth body
          : k === 'tColaPlanaAncho' ? T.tCubierta !== 'lisa' && T.tColaPlana > 0
            // 2026-11-17: the Kamm tail's sliders only with «Cola cortada»
            : k === 'tKammSeccion' || k === 'tKammCavidad' ? T.tColaCorte === 'kamm' : true;
  // 2026-11-16: each hybrid architecture shows its own efficiency sliders (hibrido.ts)
  const arqH = T.tHibArq ?? 'reparto';
  const hibridoVisible = (k: string) => k === 'tHibMec' ? arqH === 'reparto' : k === 'tRendElec' ? arqH !== 'paralelo' : k === 'tRendCaja' ? arqH === 'paralelo' : true;
  const LISA = ['tColaAncho', 'tColaGrosor', 'tColaBombeo', 'tBajosIni', 'tBajosCurva', 'tMorroAncho', 'tMorroGrosor', 'tMorroBombeo'];
  const PUERTA2 = ['tPuerta2Parte', 'tBisagra2Y', 'tBisagra2Inc', 'tPuerta2Abre'];
  // (round 3 interior: the rails reach the rear axle only with two rear wheels; with one, the wheel is in the tail between them)
  // 2026-11-16, the interior finish: the lining's colour, trim, roof console and light only with a lining; the stitching only on a new cover
  const selInterior = (k: string) => (['tForroColor', 'tMoldura', 'tConsolaTecho', 'tAmbiente'].includes(k) ? T.tAcabado !== 'chasis' : k === 'tCostura' ? T.tTapiz !== 'serie' : k === 'tCosturaColor' ? T.tTapiz !== 'serie' && T.tCostura !== 'no' : true);
  const fichas = deslizadoresTriciclo().filter(f => f.dep === dep && f.bloque !== BLOQUE_ELECTRONICA && !soloFilas(f.bloque) && (cuatro || f.clave !== 'tViaTras') && (f.bloque !== 'Basculación' || T.tBascula === 'si') && (rombo ? f.clave !== 'tEjeDel' : f.clave !== 'tEjeLat') && (f.bloque !== 'Híbrido enchufable' || T.tPropulsion === 'phev') && hibridoVisible(f.clave) && visible(f.clave)), sels = SELECTORES_TRICICLO.filter(s => s.dep === dep && s.bloque !== BLOQUE_ELECTRONICA && s.bloque !== BLOQUE_BICI && !soloFilas(s.bloque) && ((s.clave !== 'tMaletero' && s.clave !== 'tPuertas2') || puertas) && (s.clave !== 'tChLargo' || cuatro) && (s.clave !== 'tBascTec' || T.tBascula === 'si') && (s.clave !== 'tTraseras' || !rombo) && (s.bloque !== 'Híbrido enchufable' || T.tPropulsion === 'phev') && (s.clave !== 'tMotorElec' || (T.tPropulsion === 'phev' && arqH === 'reparto')) && selInterior(s.clave));
  // (2026-11-17, «muñecos»: each rider weighs what its size says, triciclo/talla.ts)
  const kgsOcc = modelo.plazas.map(q => Math.round(q.kg)), deKg = kgsOcc.every(k => k === kgsOcc[0]) ? `${kgsOcc[0] ?? T.tMOcc} kg` : `${kgsOcc.join(' + ')} kg`;
  const nOcc = rt.ocupantes, conN = nOcc === 1 ? 'con el piloto solo' : `con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc] ?? nOcc} ocupantes`;
  // with three rows the passenger's saddle height is the rows' seat height; its position and recline do nothing there
  const ETIQUETA_FILAS: Partial<Record<string, string>> = { tPasY: 'Asientos de las filas 2 y 3: altura' };
  const apagadoFilas = (k: string) => filas && (k === 'tPasX' || k === 'tRecPas');
  // four wheels: what the rear wheels' sliders are, and the swing arm and the spat, which do not exist then
  const ETIQUETA_CUATRO: Partial<Record<string, string>> = { tMSuspTras: 'Suspensión trasera (las dos)', tMMotor: 'Motores de buje (los dos)', tRuedaTras: 'Ruedas traseras (en los carenados)', tFaldon: 'Rueda trasera: faldón (no hay: van en carenados)', tBasculante: 'Basculante trasero (no hay: brazos en los carenados)' };
  const apagadoCuatro = (k: string) => cuatro && (k === 'tFaldon' || k === 'tBasculante');
  // round 3 interior: with the Aptera buckets the pilot's feet are on pedals, and «Un asiento» is a saddle's mass (a bucket weighs 1.8 times it)
  const ETIQUETA_BUTACAS: Partial<Record<string, string>> = { tPiesX: 'Pedales: hacia delante', tPiesY: 'Pedales: altura', tMAsiento: 'Un asiento: sillín y respaldo (una butaca, ×1,8)' };
  // (2026-11-15) in a diamond the pods' wheels are the lateral ones, and the rear wheel's size is also the nose wheel's
  const ETIQUETA_ROMBO: Partial<Record<string, string>> = { tVia: 'Vía de las ruedas laterales', tRuedaDel: 'Ruedas laterales (en los carenados)', tRuedaTras: 'Ruedas del morro y de la cola', tGiro: 'Giro máximo de la rueda del morro', tMSuspDel: 'Suspensión de las laterales (las dos)', tRecDel: 'Recorrido de la suspensión de las laterales' };
  // (2026-11-17: the traction motor central, MG2 on the planetary)
  const etiqueta = (k: string, n: string) => (k === 'tMMotor' && modelo.motor.tipo === 'central' ? 'Motor eléctrico central (MG2)' : null) || (filas && ETIQUETA_FILAS[k]) || (butacas && ETIQUETA_BUTACAS[k]) || (rombo && ETIQUETA_ROMBO[k]) || (cuatro && ETIQUETA_CUATRO[k]) || n;
  const bloques = [...new Set([...fichas.map(f => f.bloque), ...sels.map(s => s.bloque)])];
  const tituloBloque = (b: string) => TITULO_BLOQUE[b] ?? b;
  // (2026-11-17) the engine blocks' weight: the same sections as every other block's (masasSecciones.ts)
  // and every other block's (2026-11-17, «pesossecciones»: «en todos los demás desplegables … el peso sumado de toda esa
  // sección»); a block with no mass shows nothing
  const pesosSec = dep === 'proyecto' ? null : seccionesTriciclo(res, modelo);
  const seccionDe = (b: string) => (dep === 'proyecto' ? null : pesoSeccion(pesosSec, dep, b));
  const seccionMotor = (b: string) => (BLOQUES_MOTOR.includes(b) ? pesoSeccion(pesosSec, 'propulsion', b) : null);
  // (2026-11-17, «precios»: «en todas las secciones y todos los componentes el precio»): each block's price next to its
  // weight, and each part's inside its breakdown (precios/precios.ts, from the same sections)
  const preciosSec = pesosSec ? preciosDiseno(pesosSec, { P, modelo: modelo as unknown as ContextoPrecio['modelo'], res }) : null;
  const precioDe = (b: string) => (dep === 'proyecto' ? null : precioSeccion(preciosSec, dep, b));
  const alPrecio = (nombre: string, v: number | null) => set('precios', conPrecio(P, nombre, v));
  const cdComparar = cd.cd != null && cd.areaRef != null ? { cd: cd.cd, areaRef: cd.areaRef } : null;
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
        [`Autonomía a ${kmhVel} km/h${e?.hibrido ? ', solo con la batería' : ''}`, e ? `${Math.round(e.autonomia)} km` : sinCd],
        // the plug-in hybrid (2026-11-15): petrol per 100 km once the battery is down, and how far the tank goes
        ...(T.tPropulsion === 'phev' ? [
          [`Gasolina a ${kmhVel} km/h (con la batería gastada)`, e?.hibrido ? `${fmt(e.hibrido.litros100, 2)} L/100 km` : sinCd],
          ['Gasolina a 50 y a 100 km/h', e?.hibrido ? `${fmt(e.hibrido.litros50, 2)} · ${fmt(e.hibrido.litros100kmh, 2)} L/100 km` : sinCd],
          [`Autonomía con el depósito (${fmt(T.tDeposito, 0)} L)`, e?.hibrido ? `${Math.round(e.hibrido.kmDeposito)} km` : sinCd],
          ['Autonomía total: batería y depósito', e?.hibrido ? `${Math.round(e.autonomia + e.hibrido.kmDeposito)} km` : sinCd],
          [`Velocidad sostenida solo con gasolina (${fmt(T.tPhevKW, 1)} kW)`, e?.hibrido ? `${Math.round(e.hibrido.vmaxGasolina)} km/h` : sinCd],
          // (2026-11-16) by architecture: what reaches the wheel, and the engine's rpm at the speed of calculation
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
      <p className="text-xs text-slate-500">El Cd lo calcula el túnel con la silueta de la carrocería y sus {tresOCuatro} ruedas (no hay fórmula del editor para esta forma); los carenados y los brazos solo entran como ruedas carenadas, así que el real será algo más alto. {nOcc === 1 ? 'Con el piloto solo' : `Con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc]} ocupantes`} de {deKg} ({Math.round(res.mTot)} kg en total), rodadura {fmt(crrTriciclo(T), 4)} ({textoCrrTriciclo(T)}), motor y controlador al {Math.round(RENDIMIENTO * 100)} %, {AUXILIARES} W de equipos y la batería usable al {Math.round(USABLE * 100)} %. Todo supuesto, no medido.</p>
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
          <dt className="text-slate-600">{nOcc === 1 ? 'Con el piloto' : `Con ${['', 'uno', 'dos', 'tres', 'cuatro'][nOcc]} ocupantes`} de {deKg}</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(res.mTot)} kg</dd>
          <dt className="text-slate-600">Y {EQUIPAJE} kg de equipaje: masa de diseño</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(diseno.masa)} kg</dd>
          <dt className="text-slate-600">  por rueda: delante · detrás</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(diseno.del)} · {Math.round(diseno.tras)} kg</dd>
        </dl>
      </div>
      <p className="text-xs text-slate-500">Las suspensiones, los frenos y los neumáticos se dimensionan para la masa de diseño: todos a bordo y {EQUIPAJE} kg de equipaje. Cada deslizador de masa es lo menos que pesa esa pieza; si la carga pide más, cuenta lo que pide la carga y aquí se dice. El bastidor pesa lo que sus tubos (largo × sección × densidad) más sus uniones. Son estimaciones de piezas de su clase, no pesadas.</p>
      <p className="text-xs text-slate-500">Centro de gravedad {nOcc === 1 ? 'con el piloto' : `con los ${['', '', 'dos', 'tres', 'cuatro'][nOcc]}`}: {cm(rt.cg.y, 0)} sobre el suelo y {m2(modelo.xF - rt.cg.x)} detrás del eje delantero ({Math.round(rt.vuelco.repartoDel * 100)} % del peso delante). Vacío: {cm(rt.cg.vacio.y, 0)} de alto.</p>
    </Bloque>
  );
  return (
    // (2026-11-17, «proveedores») each part's supplier, model and files read the design from here (proveedores/)
    <ContextoProveedores.Provider value={{ P, set }}>
      {dep === 'proyecto' && peso}
      <Bloque titulo={lemas[dep]} nota={nombreTriciclo(T)}>
        {cuatro || rombo
          ? (rombo ? <p className="text-xs text-slate-500">Cuatro ruedas en rombo: una en el morro, que gira; dos laterales en carenados, que no giran (con «Bascular en las curvas», se inclinan con la cabina); y una en la cola con el motor en el buje. Es la disposición del Cuadriciclo Bala en rombo con esta carrocería (en Rodaje, «Disposición de las ruedas», se vuelve a la de dos delante).</p> : <p className="text-xs text-slate-500">Cuatro ruedas: dos delante en carenados como el Aptera, que giran con ellas, y dos detrás en carenados iguales, que no giran, {modelo.motor.tipo === 'central' ? 'movidas por el motor eléctrico MG2, que va junto al de gasolina, en el planetario' : 'con un motor en el buje de cada una'}. Es el Triciclo Bala con otra parte de atrás: la carrocería y todas sus medidas son las mismas (en Rodaje, «Ruedas traseras», se vuelve a la de una rueda).</p>)
          : <p className="text-xs text-slate-500">Tres ruedas: dos delante en carenados como el Aptera, que giran con ellas, y una detrás dentro de la cola, {modelo.motor.tipo === 'central' ? 'movida por el motor eléctrico MG2, junto al de gasolina' : 'con el motor en el buje'}. La carrocería es la del Cuadriciclo Bala en rombo; con las medidas por defecto, la misma.</p>}
        <SinSeccion partes={dep === 'proyecto' ? undefined : pesosSec?.sinSeccion[dep]} />
      </Bloque>
      {[...bloques].sort((a, b) => ordenBloque(a) - ordenBloque(b)).map(bloque => (
        <Bloque key={bloque} id={`bloque-${bloque}`} titulo={tituloBloque(bloque)} peso={textoPesoPrecio(textoPesoSeccion(seccionDe(bloque)), precioDe(bloque))} plegable={bloque === 'Propulsión' ? undefined : { abierto: abiertos.has(bloque), alAlternar: () => alternar(bloque) }} nota={`${fichas.filter(f => f.bloque === bloque).length + sels.filter(s => s.bloque === bloque).length} ajustes`}>
          {bloque === 'Forma' && (() => {
            // round two (2026-11-10): one lever for «hazlo un poco más grande»; it moves the nose, wheelbase and tail (see estirarTriciclo)
            const lg = largoTriciclo(T);
            return <>
              <Deslizador id="t-largo" etiqueta="Largo total (estira solo el medio)" valor={lg.valor} min={lg.min} max={lg.max} paso={0.01} mostrar={`${m2(lg.valor)} de carrocería`} alCambiar={x => { const o = estirarTriciclo(T, x); for (const [k, v] of Object.entries(o)) set(k as keyof Parametros, v as never); }} />
              <p className="-mt-1 text-xs text-slate-500">Estira la carrocería por el medio, sin tocar el morro ni la cola: solo cambia la batalla, y la cúpula acaba igual de lejos del eje trasero, así que crece la cabina. El morro y la cola conservan su forma y su largo (se cambian abajo, en «Morro y cola»). No es una escala de todo: los ocupantes, el {volante ? 'volante' : 'manillar'}, los asientos{puertas ? ', las puertas' : ''} y la batería no se mueven.</p>
            </>;
          })()}
          {/* (2026-11-16) the hybrid's architecture first in its block: the sliders under it depend on it */}
          {bloque === 'Híbrido enchufable' && sels.filter(s => s.clave === 'tHibArq').map(s => <Selector key={s.clave} id={`t-${s.clave}`} etiqueta={s.n} valor={T[s.clave] as string} clave={s.clave} opciones={s.opciones} alCambiar={v => set(s.clave, v as never)} />)}
          {bloque === 'Híbrido enchufable' && <ComparadorMotores tipo="gasolina" modelo={modelo} mTot={res.mTot} cd={cdComparar} actual={T.tCatTermico} alElegir={id => elegirCatalogo('tCatTermico', id)} motores={motoresBuje} partes={seccionMotor(bloque)?.partes ?? []} />}
          {bloque === 'Híbrido enchufable' && <CatalogoPieza tipo="termico" valor={T.tCatTermico} alCambiar={id => elegirCatalogo('tCatTermico', id)} Selector={Selector as never} necesidad={necesidad} />}
          {/* (2026-11-17) where the electric motor goes, first in its block: the catalogue under it depends on it */}
          {bloque === 'Motor eléctrico' && sels.filter(s => s.clave === 'tMotorElec').map(s => <Selector key={s.clave} id={`t-${s.clave}`} etiqueta={s.n} valor={T[s.clave] as string} clave={s.clave} opciones={s.opciones} alCambiar={v => set(s.clave, v as never)} />)}
          {bloque === 'Motor eléctrico' && modelo.motor.tipo === 'central' && <p className="-mt-1 text-xs text-slate-500">Un solo motor eléctrico, el MG2, junto al motor de gasolina: en el mismo eje que el engranaje planetario, por fuera de él, unido a su corona (como en el Prius). Desde la corona, la cadena{cuatro ? ', el diferencial y los dos palieres llevan' : ' lleva'} su fuerza a {cuatro ? 'las ruedas traseras' : 'la rueda trasera'}, al {fmt(modelo.motor.rend * 100, 0)} %. Sus {fmt(modelo.motor.kg, 1)} kg ya no van en {cuatro ? 'las ruedas' : 'la rueda'}: la masa no suspendida baja {fmt(cuatro ? modelo.motor.kg / 2 : modelo.motor.kg, 1)} kg en cada rueda trasera. En la lista de abajo solo salen motores centrales.</p>}
          {bloque === 'Motor eléctrico' && <>
            <ComparadorMotores tipo="electrico" velocidad={bici ? T.tVel : undefined} modelo={modelo} mTot={res.mTot} cd={cdComparar} actual={T.tCatMotor} alElegir={id => elegirCatalogo('tCatMotor', id)} motores={motoresBuje} partes={seccionMotor(bloque)?.partes ?? []} />
            <CatalogoPieza tipo="motor" valor={T.tCatMotor} alCambiar={id => elegirCatalogo('tCatMotor', id)} Selector={Selector as never} necesidad={necesidad} />
            <CatalogoPieza tipo="controlador" valor={T.tCatCtrl} alCambiar={id => elegirCatalogo('tCatCtrl', id)} Selector={Selector as never} necesidad={necesidad} />
            <CatalogoPieza tipo="reductora" valor={T.tCatReductora} alCambiar={id => elegirCatalogo('tCatReductora', id)} Selector={Selector as never} necesidad={necesidad} />
            <p className="-mt-0.5 text-xs text-slate-500">Piezas que se venden hoy, con las cifras que publica su fabricante o su vendedor (enlace en cada ficha). Al elegir una, sus cifras pasan a los deslizadores de abajo y quedan fijas; lo que no publica, sigue en su deslizador. «A medida» vuelve a dejarlo todo libre.</p>
          </>}
          {fichas.filter(f => f.bloque === bloque).map(f => {
            const v = vistaTriciclo(f, T);
            // the A-pillar's sliders do nothing on a one-piece canopy
            // (2026-11-12: with doors the window frame is always there; with the pack along the frame its size decides the kWh)
            const apagado = (T.tVentanas === 'burbuja' && !puertas && f.clave.startsWith('tPilar')) || apagadoFilas(f.clave) || apagadoCuatro(f.clave) || (paquete && f.clave === 'tKWh') || valorFijoCatalogo(f.clave, T) != null;
            const valor = paquete && f.clave === 'tKWh' ? Math.min(v.max, Math.max(v.min, modelo.kWh)) : v.valor;
            return <Deslizador key={f.clave} id={`t-${f.clave}`} etiqueta={etiqueta(f.clave, f.n)} valor={valor} clave={f.clave} centro={f.centrar ? v.defecto : undefined} min={v.min} max={v.max} paso={pasoTriciclo(f.clave, T)} mostrar={mostrar(f, valor)} desactivado={apagado} alCambiar={x => { const g = guardarTriciclo(f, x, T); if (f.clave === 'tBatalla') for (const [k, v] of Object.entries(conBatalla(T, g))) set(k as keyof Parametros, v as never); else set(f.clave, g); }} />;
          })}
          {sels.filter(s => s.bloque === bloque && s.clave !== 'tHibArq' && s.clave !== 'tMotorElec').map(s => <Selector key={s.clave} id={`t-${s.clave}`} etiqueta={etiqueta(s.clave, s.n)} valor={T[s.clave] as string} clave={s.clave} opciones={s.opciones} alCambiar={v => {
            set(s.clave, v as never);
            // two rear wheels start with the rear track equal to the front one (Eugenio: «con las mismas medidas»)
            if (s.clave === 'tTraseras' && v === 'dos') set('tViaTras', limitarTriciclo('tVia', T));
          }} />)}
          {bloque === 'Carenados' && <p className="-mt-1 text-xs text-slate-500">{cuatro
            ? 'Los carenados delanteros giran con sus ruedas (como en el Aptera): el neumático siempre queda igual de centrado; lo que se comprueba es que, girados a tope, no toquen la carrocería. Los traseros son iguales (tamaño, anchura, cola y brazos se mueven con estos mismos deslizadores), crecen con su rueda y no giran. Sin rueda en la cola, no hay faldón.'
            : 'Los carenados delanteros giran con sus ruedas (como en el Aptera): el neumático siempre queda igual de centrado; lo que se comprueba es que, girados a tope, no toquen la carrocería. El faldón tapa la parte de abajo de la rueda trasera.'}</p>}
          {bloque === 'Asientos' && (filas
            ? <p className="-mt-1 text-xs text-slate-500">Tres filas: el piloto solo, en un asiento de coche en el centro, con {volante ? 'el volante' : 'el manillar de siempre'}; detrás, en la fila 2, {fraseFila(filasDetras(T)[0])}; y al final, en la fila 3, {fraseFila(filasDetras(T)[1])}. En cada una de esas dos filas se escoge cuántas plazas lleva (una, dos o tres) y qué asiento, y se pliegan (abajo, «Tres filas»). Con esta disposición la carrocería tiene unos mínimos: {m2(ANCHO_FILAS)} de ancho (para los hombros de la fila 2) y la batalla y la cúpula largas para que la fila 3 quepa delante del amortiguador trasero. El alto de la cúpula se puede bajar libremente; por debajo de unos {fmt(ALTO_FILAS, 2)} m las cabezas ya no caben y las comprobaciones lo marcan en rojo. El pasajero a horcajadas no existe aquí: su posición y su reclinado no hacen nada.</p>
            : butacas ? <p className="-mt-1 text-xs text-slate-500">Dos butacas como las del Aptera, una detrás de otra en el centro: una carcasa blanca de una pieza con el reposacabezas, cojín y respaldo oscuros acolchados y una base fina sobre los largueros{paquete ? ' o el paquete' : ''}. El piloto lleva las piernas hacia delante, con los pies en los pedales (abajo, «Pedales»), hasta el {salp ? 'salpicadero' : 'morro'}; el pasajero, a los lados del asiento del piloto, con las rodillas por fuera de su respaldo, como en el asiento de atrás de un Renault Twizy. Cada butaca pesa 1,8 veces «Un asiento» ({fmt(masaButaca(T.tMAsiento), 1)} kg). Se comprueba que las rodillas y los pies del pasajero no toquen el asiento del piloto y que los pies de los dos queden dentro de la carrocería.</p>
            : <p className="-mt-1 text-xs text-slate-500">A horcajadas, como en el Cuadriciclo en rombo, con un respaldo cada uno. Reclinar baja la cabeza y la lleva hacia atrás: al piloto le da techo (la cúpula sube detrás de él), pero aleja sus manos del {volante ? 'volante' : 'manillar'}; al pasajero se lo quita, porque detrás de él la cúpula baja.</p>)}
          {bloque === 'Asientos' && <TallasOcupantes P={P} set={set} modelo={modelo} />}
          {bloque === 'Asientos' && <p className="-mt-1 text-xs text-slate-500">Los asientos bajan hasta quedar con 6 cm de asiento sobre lo que tienen debajo: los largueros del bastidor{paquete ? ' o, donde pasa bajo ellos, el paquete de batería' : ''} (ahora, el piloto hasta {m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tPilY')!, T).min)} y {filas ? 'las filas 2 y 3' : 'el pasajero'} hasta {m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tPasY')!, T).min)} del suelo).{butacas || filas ? '' : ' El sillín se hace más fino al bajar.'} Más bajos: menos vuelco y más techo, pero las rodillas suben.</p>}
          {bloque === 'Mandos' && butacas && <p className="-mt-1 text-xs text-slate-500">Con las butacas el piloto conduce con los pies en dos pedales, freno y acelerador, con el talón en una placa sobre el suelo{paquete ? ', el paquete' : ''} o la barra de la cuna delantera, lo que quede debajo. «Pedales» los acerca o los aleja y los sube o los baja.</p>}
          {bloque === 'Mandos' && volante && <p className="-mt-1 text-xs text-slate-500">Volante de coche en una columna que baja hacia delante hasta la cabeza de dirección (donde iba el manillar), con las manos del piloto en el aro a las tres menos cuarto. Se comprueba que el aro quede dentro de la carrocería y que no toque las rodillas.{salp ? '' : ' Sin salpicadero, los relojes van en una pantallita sobre la columna.'}</p>}
          {bloque === 'Salpicadero' && <p className="-mt-1 text-xs text-slate-500">{T.tSalpicadero === 'blanco' ? `Un salpicadero blanco de lado a lado bajo el parabrisas, con su forma (a 2 cm de la piel por dentro), desde donde el morro deja sitio hacia el piloto: un labio oscuro por el borde de atrás, los relojes bajo una visera delante del piloto, una pantalla central sobre un pie, a su derecha, con una fila de botones, salidas de aire en los dos extremos y a los lados de los relojes${volante ? ', y la funda de la columna del volante con sus dos palancas' : ''}. Ocupa el sitio del depósito y de la pantallita. Unos 6,5 kg (estimado). Fondo ${cm(modelo.salpicadero ? modelo.salpicadero.x0 - modelo.salpicadero.x1 : 0, 0)}.`
            : salp ? `Un salpicadero de lado a lado bajo el parabrisas, a 2 cm de la piel por dentro, desde donde el morro deja sitio hacia el piloto; en su cara de atrás, la pantalla de los relojes y una pantalla central. Ocupa el sitio del depósito y de la pantallita. Fondo ${cm(modelo.salpicadero ? modelo.salpicadero.x0 - modelo.salpicadero.x1 : 0, 0)}.` : 'Sin salpicadero: una pantallita sobre el depósito, delante del piloto.'}</p>}
          {bloque === 'Puertas y maletero' && <p className="-mt-1 text-xs text-slate-500">{puertas
            ? `Dos puertas como las del Aptera, cortadas en esta carrocería: cada una lleva su ventana con el marco (el montante y el carril del techo) y se abre hacia arriba y hacia fuera a la vez («de mariposa»), sobre una bisagra en el montante. El eje es la tangente al montante donde va la bisagra: así toda la puerta queda por debajo y sale hacia fuera sin rozar. Con la bisagra al pie del montante (de serie) el eje sube inclinado y la puerta sube y sale a la vez, dejando libre la entrada; con la bisagra más arriba el eje se tumba y la puerta gira como un ala sobre un eje casi a lo largo del coche, pero se queda encima del hueco: «Puerta abierta: altura libre para entrar» lo dice. Con puertas la cúpula ya no se abre, y siempre lleva montante. «Abrir puertas», abajo en el 3D.${portonA ? ' El portón es como el del Aptera: con la bisagra en el techo, cerca de su punto más alto, levanta de una pieza la luna, el techo de atrás y lo alto de la cola, más o menos la mitad de atrás del vehículo, con la aleta.' + (T.tCubierta === 'lisa' ? ' Con la cubierta lisa, detrás de las puertas el portón es toda la cubierta de la cola: de canto a canto y hasta el borde de atrás, una sola pieza con su panel solar.' : '') + ' «Abrir maletero y capó».' : ' El maletero sigue siendo la tapa de lo alto de la cola; el portón largo como el del Aptera se elige en «Maletero».'}`
            : 'Con la cúpula entera, se entra levantándola hacia delante («Abrir cúpula») y el maletero es la tapa de lo alto de la cola. Las puertas como el Aptera (y con ellas el portón largo) cortan la carrocería en su sitio y dejan la cúpula fija.'}
            {T.tRetrovisores === 'espejos' ? ` Retrovisores de gota en un brazo corto, ${puertas ? 'en cada puerta' : 'en la carrocería'}, donde estaban las cámaras; el túnel de viento no los cuenta (su Cd sale algo más bajo de lo que será).` : ''}</p>}
          {bloque === 'Tres filas' && <p className="-mt-1 text-xs text-slate-500">Cada fila se pliega por separado: el respaldo cae hacia delante sobre el asiento y queda un suelo plano para carga. Sus pasajeros dejan de contar en el peso, el vuelco y el consumo. Los pies de la fila 2 van bajo el asiento del piloto y los de la fila 3 bajo los de la fila 2, como en un coche. Maletero ahora: {Math.round(rt.maletero.ahora)} L ({rt.maletero.estado}). Las plazas van a 49 cm de centro a centro: con tres en una fila hace falta una carrocería más ancha, y «Asientos de la fila … caben de lado» dice si caben.</p>}
          {bloque === 'Ejes y ruedas' && <>
            {rt.viaSubida && <p className="-mt-1 text-xs text-amber-800">La vía sube a {m2(rt.viaSubida)}: es lo mínimo para que los carenados, girados a tope, queden a 3 cm de la carrocería.</p>}
            {rombo ? <p className="-mt-1 text-xs text-slate-500">En rombo la rueda del morro va donde la lleva el Cuadriciclo Bala en rombo, y las dos laterales a {m2(-modelo.xF)} por detrás: mejor cerca del centro de gravedad, que está a {m2(-res.triciclo!.cg.x)} (abajo, «Vuelco»). De la del morro a la de la cola, {m2(-modelo.xR)}.</p> : <p className="-mt-1 text-xs text-slate-500">El eje delantero va detrás de donde el Cuadriciclo en rombo lleva su rueda delantera: así el peso queda más cerca de las dos ruedas de delante y {cuatro ? 'la vía de delante pesa más en el vuelco' : 'el triciclo vuelca menos'} (abajo, «Vuelco»). Batalla {m2(modelo.batalla)}.</p>}
            {bloque === 'Ejes y ruedas' && <p className="-mt-1 text-xs text-slate-500">Ruedas traseras: una dentro de la cola, sobre un basculante, como un triciclo; o dos fuera, en carenados como los de delante sobre dos brazos carenados cada uno, que no giran: cuatro ruedas. Con dos, el motor se reparte en dos motores de buje, uno en cada rueda, y la cola queda libre para el maletero.{cuatro ? ` La vía trasera va de lo justo para que los carenados queden a 3 cm de la cola (${m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tViaTras')!, T).min)}) a la vía delantera más ancha; de serie, la de delante.` : ''}</p>}
            {(() => { const n = neumaticosTriciclo(T); return <p className="-mt-1 text-xs text-slate-600"><b>Neumáticos delanteros:</b> {lineaNeumatico(n.del)} <b>{rombo ? 'Morro y cola:' : cuatro ? 'Traseros:' : 'Trasero:'}</b> {lineaNeumatico(n.tras)} Rodadura y masa, comparadas con el neumático de serie de esa medida; el agarre es absoluto: un neumático de carretera radial agarra 0,90 g en seco sea cual sea su medida (uno diagonal de ciclomotor, 0,86). Agarre, duración y precio son estimaciones con sus fuentes en el código.</p>; })()}
          </>}
          {bloque === 'Bastidor' && <p className="-mt-1 text-xs text-slate-500">Dos largueros sobre la panza con {modelo.larguerosTraseros ? 'cinco' : 'cuatro'} travesaños, {paquete ? 'la cuna de la suspensión delantera (con la batería a lo largo del bastidor, en el morro ya no hay batería), el paquete de batería sobre el fondo de la panza, con los largueros pasando por dentro' : 'la cuna de la batería (donde se apoya la suspensión delantera)'}, los soportes de los {butacas ? 'asientos' : filas ? 'asientos' : 'sillines'}, la torreta del amortiguador{modelo.larguerosTraseros ? ', los largueros siguiendo hasta el eje trasero (suben con la panza donde la cola se levanta y se cierran donde se estrecha) y una cuna trasera hasta donde llegan los brazos de los carenados de atrás' : ''} y el soporte de la columna de dirección: {fmt(rt.bastidor.metros, 1)} m de tubo. {cuatro ? (modelo.larguerosTraseros ? '' : 'Los largueros acaban en la torreta: «Largueros: hasta» › «El eje trasero» los lleva hasta donde las ruedas de atrás meten su peso. ') : 'Con una rueda detrás, los largueros acaban en la torreta: la rueda va entre ellos, en la cola. '}La separación de los largueros se mide de eje a eje; más separados, el bastidor es más ancho y el paquete de batería, que es un porcentaje de ese ancho, también. Se ve con «Rayos X» o la capa «Chasis».</p>}
          {bloque === 'Cola' && modelo.F.kamm && <ParrafoKamm modelo={modelo} cd={cd} />}
          {bloque === 'Forma' && T.tCubierta === 'lisa' && <p className="-mt-1 text-xs text-slate-500">Cubierta lisa: detrás del cristal de la cúpula y delante del parabrisas, lo de arriba ya no sigue la forma redonda de la cúpula. Es una cubierta casi plana, un poco abombada en el centro (el «bombeo»), que solo baja hacia la punta, con un canto redondeado hacia los lados. Así no salen montículos ni hombros, se muevan como se muevan los deslizadores (lo comprueba un programa con cada deslizador en sus dos extremos y muchas combinaciones). Entre la cúpula y la cubierta la forma se funde a lo largo de 30 cm, sobre el cristal.</p>}
          {bloque === 'Techo solar y ventanas' && <p className="-mt-1 text-xs text-slate-500">La forma de la cúpula no cambia: el techo solar y las ventanas se dibujan sobre ella. Detrás de donde empieza, lo alto de la cúpula es un panel solar opaco (da sombra a las cabezas: menos calor dentro en verano); por los lados, encima de la ventana. Delante, el parabrisas pasa por encima hasta el panel.{T.tSolarCola === 'si' ? ` Por detrás, el panel sigue por lo alto de la cola hasta su punta, como en el Aptera; con el portón, la parte de encima del portón se levanta con él (con la tapa del maletero, con la tapa).${T.tCubierta === 'lisa' ? ' Con la cubierta lisa cubre toda la cubierta de la cola, dejando un marco de unos 5 cm a cada lado.' : ''}` : ''}{puertas ? ' Con las puertas como el Aptera hay montante siempre (la puerta se corta por él), aunque arriba diga «De una pieza».' : ''} El montante sale del borde del cristal, sube y se tumba hacia atrás en una sola curva hasta el techo, como en el Aptera, y sigue como marco entre la ventana y el techo.{modelo.ventanas.marco ? ` Entre el panel y el cristal va un marco de carrocería de ${cm(modelo.ventanas.marco.ancho, 0)}: arriba del parabrisas y a lo largo de los dos carriles del techo (${fmt(modelo.marcoTecho)} m² de laminado en lugar de panel).` : ''} Panel: {res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m², ${Math.round(res.solarPico)} W a pleno sol, unos ${fmt(res.solarDia / 1000)} kWh al día (estimado)` : 'ninguno'}; cristal: {fmt(res.areas.cristal)} m².</p>}
          {bloque === 'Techo solar' && <p className="-mt-1 text-xs text-slate-500">{res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m² de panel: ${Math.round(res.solarPico)} W a 1000 W/m², y de media unos ${fmt(res.solarDia / 1000)} kWh al día (${fmt(P.sol, 1)} kWh/m² al día sobre plano, el panel curvo recoge un 70 % de eso, células al ${Math.round(0.21 * 100)} % y un 15 % de pérdidas). ${Math.round(res.masas['Paneles solares'] ?? 0)} kg de panel, sobre laminado de carrocería en lugar del cristal.` : 'Sin techo solar: la cúpula es toda de cristal (se mueve en Carrocería › Techo solar y ventanas).'}</p>}
          {bloque === 'Basculación' && (rt.tilt ? <FichaTilt t={rt.tilt} tres={!cuatro && !rombo} rombo={rombo} /> : <p className="-mt-1 text-xs text-slate-500">Con «Sí», la cabina se inclina hacia dentro en las curvas, como una moto, y los carenados de las ruedas con ella, cada uno sobre sus dos brazos en paralelogramo. {cuatro || rombo ? '' : 'En el triciclo se inclinan los dos carenados de delante; la rueda de la cola va dentro de la carrocería y se inclina con ella. '}Aquí se elige la tecnología que la mueve y salen, una a una, las piezas que hay que construir.</p>)}
          {bloque === 'Propulsión' && <p className="-mt-1 text-xs text-slate-500">{T.tPropulsion === 'phev' ? 'Híbrido enchufable: se carga enchufado y gasta primero la batería; cuando se acaba, sigue con gasolina. Debajo, el motor de gasolina y cómo se une a las ruedas («Motor gasolina») y, después, el motor eléctrico («Motor eléctrico»); cada uno con lo que pesa en su título.' : 'Solo eléctrico: la batería y el motor de buje. Con «Híbrida enchufable» se añade un motor de gasolina en el maletero, con tres maneras de unirlo a las ruedas.'}</p>}
          {bloque === 'Híbrido enchufable' && modelo.phev && <FichaHibrido modelo={modelo} vel={T.tVel} hib={e?.hibrido ?? null} />}
          {bloque === 'Motor eléctrico' && cuatro && modelo.motor.tipo === 'buje' && <p className="-mt-1 text-xs text-slate-500">Dos motores de buje, uno en cada rueda trasera, sin cadena ni correa, con un controlador doble bajo el sillín del pasajero. Cada uno da la mitad de la potencia, así que en cada llanta cabe el doble que con una rueda: en una rueda de ciclomotor unos {RUEDAS_TRICICLO['24'].kWBuje} kW de pico por rueda; en una llanta de coche de 15″, unos {RUEDAS_TRICICLO.c15.kWBuje}. «Motores de buje» es la masa de los dos juntos: su rango es el de dos motores de media potencia, con la misma regla de kilos por kW que con uno (cada motor lleva su base, así que dos pesan algo más que uno del doble).</p>}
          {bloque === 'Motor eléctrico' && modelo.phev && modelo.motor.tipo === 'buje' && <p className="-mt-1 text-xs text-slate-500">{modelo.phev.arq === 'serie' ? 'Con el híbrido en serie, el motor eléctrico lo mueve todo también con gasolina: el generador le manda la electricidad por el controlador. Su potencia nominal limita la velocidad que se sostiene con gasolina.' : `Con el híbrido, ${modelo.phev.arq === 'reparto' ? 'la corona del planetario' : 'la caja de cambios'} empuja ${cuatro ? 'las ruedas traseras por una cadena, un diferencial y dos palieres' : 'la rueda trasera por una cadena, en el lado izquierdo'}, junto al motor de buje${cuatro ? ' de cada rueda' : ''}${modelo.phev.arq === 'reparto' ? ', que hace de MG2' : ''}.`}</p>}
          {bloque === 'Motor eléctrico' && !cuatro && modelo.motor.tipo === 'buje' && <p className="-mt-1 text-xs text-slate-500">Motor de buje en la rueda trasera, sin cadena ni correa, con su controlador bajo el sillín del pasajero. Su masa y la del controlador siguen a la potencia máxima (su rango se mueve con ella). En una rueda de ciclomotor caben unos {RUEDAS_TRICICLO['24'].kWBuje} kW de pico; en una llanta de coche de 15″, unos {RUEDAS_TRICICLO.c15.kWBuje} (como los motores en rueda del Aptera). Por encima, lo honrado sería un motor en el basculante con correa, como en las motos eléctricas, y eso aquí no se dibuja: la comprobación «Motor de buje» lo avisa.</p>}
          {bloque === 'Batería' && paquete && <p className="-mt-1 text-xs text-slate-500">Un solo paquete a lo largo del bastidor, centrado, apoyado en el fondo de la panza, con los largueros pasando por dentro: {Math.round(limitarTriciclo('tBatAncho', T))} % del ancho del bastidor (de cara exterior a cara exterior de los largueros), así que sobresale {Math.round((limitarTriciclo('tBatAncho', T) - 100) / 2)} % de ese ancho a cada lado. Su tamaño decide su capacidad: {Math.round(rt.bateria.litros)} L × {Math.round(T.tWhL)} Wh/L = {fmt(modelo.kWh, 1)} kWh y {Math.round(rt.bateria.kg)} kg (el deslizador «Batería» solo la muestra). Donde pasa, es el suelo: los pies y los asientos se apoyan encima. Empieza detrás de la cuna de la suspensión delantera; su largo llega hasta lo que cabe en la carrocería y su ancho puede pasarse de ella hasta 400 % (si se sale, «Batería dentro de la carrocería» dice cuánto sobresale) (el largo, ahora, hasta {m2(vistaTriciclo(deslizadoresTriciclo().find(f => f.clave === 'tBatLargo')!, T).max)}), y lo que toca por el camino lo dicen las comprobaciones: el controlador, que va justo detrás, y la torreta del amortiguador{cuatro ? '' : ', la rueda trasera'}, los asientos de encima, la piel. Su masa cuenta en su sitio para el peso, el centro de gravedad, el vuelco y los largueros.</p>}
          {bloque === 'Acabado interior' && <FichaAcabado T={T} piezas={rt.piezas} areas={modelo.interior.forro?.areas ?? null} consola={!!modelo.interior.consola} />}
          {bloque === 'Tapicería' && <p className="-mt-1 text-xs text-slate-500">{T.tTapiz === 'serie' ? 'Los asientos de serie: vinilo gris oscuro acolchado en rombos con un pespunte rojo. Al elegir otra tapicería, la funda cambia en los mismos asientos (sillín y respaldos, butacas o asientos de las filas); en las butacas, la carcasa blanca pasa al color de los laterales.' : `${TAPICES.find(t => t.k === T.tTapiz)?.n ?? ''}: la funda nueva cubre los mismos asientos${T.tAsientos === 'butacas' ? ' y la carcasa de las butacas toma el color oscuro de los laterales, como los costados de los asientos del Vision Jet' : ''}. ${T.tCostura === 'no' ? 'Sin costura vista.' : T.tCostura === 'recta' ? 'Costura recta: canales a lo largo, con un pespunte doble a cada lado.' : 'Costura geométrica: líneas que se cruzan desde dos nudos, como la del Vision Jet, con pespunte doble.'} Masa: la diferencia de la funda con la de serie (que ya cuenta «Un asiento»).`}{T.tCinturon !== 'no' ? ' Cinturones de tres puntos: del hombro, por encima del pecho, a la hebilla en la otra cadera, y la cinta de las caderas; en un asiento vacío, recogido por su costado.' : ''}</p>}
          {bloque === 'Batería' && !paquete && <p className="-mt-1 text-xs text-slate-500">Primero en el morro, donde el Cuadriciclo en rombo lleva la rueda delantera ({Math.round(rt.bateria.litrosMorro)} L), luego en un módulo estrecho entre los pies del piloto; si hace falta más, el módulo del morro sube, crece hacia la punta y queda un módulo plano bajo los sillines. Ahora: {Math.round(rt.bateria.litros)} L y {Math.round(rt.bateria.kg)} kg{rt.bateria.litros - rt.bateria.cabe > 0.05 ? `: caben ${Math.round(rt.bateria.cabe)} L, faltan ${Math.round(rt.bateria.litros - rt.bateria.cabe)} (un morro más largo, una carrocería más ancha o celdas más densas)` : ''}.</p>}
          <DesglosePeso s={seccionDe(bloque)} abierto={bloque === 'Bastidor'} precios={{ s: precioDe(bloque), alCambiar: alPrecio }} />
        </Bloque>
      ))}
      {/* (2026-11-24) bicycle components: the class and the bicycle running gear (Rodaje), the driver's chainless pedals (Motor): BiciTriciclo.tsx */}
      {dep === 'rodaje' && <BloqueClaseBici P={P} T={T} set={set} bloque={BLOQUE_BICI} plegable={{ abierto: abiertos.has(BLOQUE_BICI), alAlternar: () => alternar(BLOQUE_BICI) }} />}
      {dep === 'propulsion' && <BloquePedales P={P} set={set} modelo={modelo} pedaleo={e?.pedaleo ?? null} kmh={T.tVel} autonomia={e ? e.autonomia : null} seccion={pesoSeccion(pesosSec, 'propulsion', BLOQUE_PEDALES)} precios={{ s: precioSeccion(preciosSec, 'propulsion', BLOQUE_PEDALES), alCambiar: alPrecio }} plegable={{ abierto: abiertos.has(BLOQUE_PEDALES), alAlternar: () => alternar(BLOQUE_PEDALES) }} />}
      {/* (2026-11-17) Motor › Electrónica de potencia: its own block (electronica/BloqueElectronica.tsx) */}
      {dep === 'propulsion' && <BloqueElectronica T={T} set={set} modelo={modelo} mTot={res.mTot} e={e} plegable={{ abierto: abiertos.has(BLOQUE_ELECTRONICA), alAlternar: () => alternar(BLOQUE_ELECTRONICA) }} />}
      {/* (2026-11-17, capo) the hybrid's cooling and air intakes: RefrigeracionTriciclo.tsx */}
      {dep === 'propulsion' && modelo.phev && <BloqueRefrigeracion P={P} set={set} modelo={modelo} seccion={pesoSeccion(pesosSec, 'propulsion', BLOQUE_REFRIGERACION)} plegable={{ abierto: abiertos.has(BLOQUE_REFRIGERACION), alAlternar: () => alternar(BLOQUE_REFRIGERACION) }} />}
      {/* (2026-11-17) the blended-wing-body fairing: BloqueBWB.tsx, triciclo/bwb.ts */}
      {dep === 'carroceria' && <BloqueBWB P={P} set={set} modelo={modelo} res={res} cdA={cd.cd != null && cd.areaRef != null ? cd.cd * cd.areaRef : null} seccion={pesoSeccion(pesosSec, 'carroceria', BLOQUE_BWB)} plegable={{ abierto: abiertos.has(BLOQUE_BWB), alAlternar: () => alternar(BLOQUE_BWB) }} />}

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
          {cuatro && <p className="text-xs text-slate-500">Con cuatro ruedas, umbral de vuelco = vía efectiva ÷ (2 × altura del centro de gravedad), con la vía efectiva entre la de delante ({m2(modelo.via.del)}) y la de detrás ({m2(modelo.via.tras)}) según el peso que lleva cada eje: la aceleración lateral, en g, a la que una curva lo tumbaría sobre las dos ruedas de fuera. Sus neumáticos agarran unos {fmt(rt.vuelco.agarre)} g en seco (la media de las ruedas, con el tipo y la construcción de cada eje): por debajo de eso vuelca antes de derrapar (rojo); se pide {fmt(rt.vuelco.objetivo)} g porque el cálculo es de un sólido rígido. Con la misma vía delante y detrás, es la mitad de la vía entre la altura del centro de gravedad, como en un coche: mucho más que con una rueda detrás, que solo apoya en un punto del centro. Solo giran las de delante: el radio de giro es el mismo.</p>}
          {!cuatro && <p className="text-xs text-slate-500">Umbral de vuelco = vía × distancia del centro de gravedad al eje trasero ÷ (2 × altura del centro de gravedad × batalla): la aceleración lateral, en g, a la que una curva lo tumbaría sobre una rueda delantera y la trasera. Sus neumáticos agarran unos {fmt(rt.vuelco.agarre)} g en seco (la media de las ruedas, con el tipo y la construcción de cada eje): por debajo de eso vuelca antes de derrapar (rojo). Se pide {fmt(rt.vuelco.objetivo)} g porque el cálculo es de un sólido rígido: la suspensión y los neumáticos, al ceder, lo bajan un 10-15 %. Más vía, el eje delantero más atrás, la batería más pesada o los sillines más bajos lo suben; más altura libre al suelo y más ocupantes, sobre todo detrás, lo bajan.</p>}
        </Bloque>
      )}
      {(dep === 'propulsion' || dep === 'energia' || dep === 'proyecto') && rendimiento}
      {(dep === 'interior' || dep === 'proyecto') && (
        <Bloque titulo="Maletero" nota={`${Math.round(rt.maletero.ahora)} L ahora`}>
          {dl(rt.maletero.estados.map(e => [e.nombre.charAt(0).toUpperCase() + e.nombre.slice(1), `${Math.round(e.litros)} L`] as [string, string]))}
          <p className="text-xs text-slate-500">Volumen geométrico: el hueco dentro de la carrocería (2 cm por dentro de la piel, hasta el techo de la cúpula) detrás del respaldo {filas ? 'del piloto' : 'del pasajero'}, sobre el suelo, menos el sitio de cada pasajero sentado (de la punta de sus pies a su respaldo), {cuatro ? 'la torreta del bastidor (las ruedas traseras van fuera, en sus carenados)' : 'la rueda trasera con su recorrido, la torreta del amortiguador'} y la batería. No es el método oficial de los fabricantes (VDA, con bloques de un litro), que para la misma forma da un 15-25 % menos. Se abre con «Abrir maletero y capó», abajo en el 3D: {conPortonAptera(T) ? 'un portón largo como el del Aptera, con la bisagra en el techo cerca de su punto más alto, que levanta la luna, el techo de atrás y lo alto de la cola (se entra al maletero desde encima de los asientos de atrás)' : 'la tapa es lo alto de la cola, detrás de la cúpula, con la bisagra en la punta de la cúpula'}. Estimación sobre este modelo, no medida.</p>
        </Bloque>
      )}

      <Bloque titulo={dep === 'proyecto' ? 'Comprobaciones' : 'Comprobaciones de este departamento'} nota={checks.length ? (malas ? `${malas} por revisar` : 'todo cabe') : ''}>
        {checks.length ? <ListaComprobaciones lista={checks} /> : <p className="text-xs text-slate-500">Este departamento no tiene comprobaciones propias: todas están en «Proyecto».</p>}
        {(dep === 'interior' || dep === 'proyecto') && <p className="text-xs text-slate-500">Cabezas: un hombre sentado, sin casco, de talla media (91,8 cm sentado erguido) y alta (97,7 cm, percentil 95; ANSUR II, 2012); el tronco reclinado lo que diga su respaldo y la cabeza un tercio de eso. Se mide de la parte de arriba y de atrás del cráneo a la cara de dentro del cristal. El alcance compara del hombro al puño con un brazo de 58 cm, con los codos algo doblados.</p>}
      </Bloque>
    </ContextoProveedores.Provider>
  );
}

/**
 * The Kamm tail in the «Cola» block (2026-11-17): where it is cut, what it saves, the taper ahead of the cut, and the
 * literature's base drag next to the tunnel's Cd, labelled as what it is (garaje/kamm.ts). The tunnel sees the cut through
 * the body's silhouette; its constants are not touched.
 */
function ParrafoKamm({ modelo, cd }: { modelo: ModeloTriciclo; cd: CdTriciclo }) {
  const k = modelo.F.kamm!, areaRef = cd.areaRef ?? null, e = areaRef ? estimacionKamm(k, areaRef) : null;
  const cm = (v: number, d = 0) => `${fmt(v * 100, d)} cm`, grados = (v: number) => `${Math.round(v)}°`;
  const pend = Math.max(k.angTecho, k.angLado, k.angBajos);
  return (
    <p className="-mt-1 text-xs text-slate-500">
      Cola cortada: la carrocería se dibuja con su cola larga y se corta en recto donde su sección ha bajado al {Math.round(k.fraccion * 100)} % de la mayor
      (Kamm cortaba al 50 %). Largo del coche {m2(modelo.F.LARGO)}: {cm(k.ahorro)} menos que con la cola entera. El culote mide {cm(k.alto)} de alto por {cm(k.ancho)} de ancho
      ({fmt(k.area, 2)} m²){k.cavidad > 0.0005 ? `, con un hueco de ${cm(k.cavidad, 1)}` : ''}. Justo antes del corte la cola se cierra {grados(k.angTecho)} por arriba,
      {' '}{grados(k.angLado)} por los lados y {grados(k.angBajos)} por abajo{pend > ANGULO_MAX ? `: más de ${ANGULO_MAX}°, el aire ya se ha soltado antes de llegar al corte y el corte no ayuda (alarga la cola imaginaria, «Techo: caída» más tarde o sube la punta, o corta más atrás)` : ': el aire llega pegado al borde, que es lo que hace funcionar el corte'}.
      {' '}Cd del túnel con este corte: {cd.cd != null ? fmt(cd.cd, 3) : 'calculando…'} (lo ve por la silueta: el culote, menos superficie y menos largo).
      {e ? ` Estimación aparte, de la literatura (no del túnel): solo el culote cuesta entre ${fmt(e.min, 3)} y ${fmt(e.max, 3)} de Cd (succión de ${fmt(0.15, 2)}–${fmt(0.20, 2)} sobre ${fmt(k.area, 2)} m² de culote${k.cavidad > 0.0005 ? `, ${Math.round((1 - e.factorCavidad) * 100)} % menos por el hueco` : ''}). Una cola larga bien cerrada no paga ese culote; el corte cambia largo por arrastre.` : ''}
    </p>
  );
}