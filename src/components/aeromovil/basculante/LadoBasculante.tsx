// ============================================================================
// CUADRICICLO BASCULANTE · los deslizadores y las cifras (2026-11-15)
// ============================================================================
// The sidebar of the editor for this family, by departments as the Aeromóvil 1
// and the Triciclo. Labels, departments, blocks and ranges come from ONE table
// (`deslizadoresBasculante()`, geometriaBasculante.ts). The page's own small
// components (block, slider, selector, list of checks) are passed in, so this
// looks exactly like the other families and the page keeps one copy of them.
import { esDelCatalogo, lineaRueda } from '../ruedas/catalogo';
import { lineaNeumatico } from '../ruedas/neumaticos';
import { Fragment, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { claveTunel } from '../tunel/calculo';
import { pedirTunel, resultadoEnCache } from '../tunel/cliente';
import type { Resolucion } from '../tunel/malla';
import { cuerpoBasculante, peticionDe } from '../tunel/nuestro';
import type { Modelo } from '../geometria';
import { Wind } from 'lucide-react';
import type { Comprobacion, Parametros, Resultados } from '../geometria';
import {
  AGARRE_B, AUXILIARES_B, crrBasculante, neumaticosBasculante, EQUIPAJE_B, LEMAS_BASCULANTE, NOMBRE_BASCULANTE, RENDIMIENTO_B, RUEDAS_BASCULANTE, SELECTORES_BASCULANTE, USABLE_B,
  camposBasculante, deslizadoresBasculante, energiaBasculante, largoBasculante, limitarBasculante,
  type DepBasculante, type FichaBasculante, type ModeloBasculante,
} from '../geometriaBasculante';

/** What the Cd of this family is: the tunnel's, computed in the background (as the Triciclo's). */
export interface CdBasculante { calculando: boolean; cd?: number; areaRef?: number }

/**
 * The Cd (2026-11-15), as the Triciclo's (Aeromovil.tsx `useCdTriciclo`): the wind tunnel's, numbers only, in the
 * background, half a second after the silhouette last changed; at another speed than the three it computes (50, 80,
 * 120 km/h) it is interpolated. Sliders that do not change the silhouette do not ask again.
 */
/** 2026-11-17: the sheet of each catalogue wheel chosen (size, mass, rolling resistance, load, who uses it). */
const fichasElegidas = (del: string, tras: string) => del === tras && esDelCatalogo(del) ? ` Delante y detrás: ${lineaRueda(del)}`
  : `${esDelCatalogo(del) ? ` Delante: ${lineaRueda(del)}` : ''}${esDelCatalogo(tras) ? ` Detrás: ${lineaRueda(tras)}` : ''}`;
export function useCdBasculante(modelo: Modelo, resolucion: Resolucion, kmh: number): CdBasculante {
  const peticion = useMemo(() => modelo.tipo === 'basculante' ? { ...peticionDe({ ...cuerpoBasculante(modelo), id: 'basculante-cd' }, resolucion, 'pocas'), soloNumeros: true } : null, [modelo, resolucion]);
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

export interface UiLado {
  Bloque: ComponentType<{ titulo: string; nota?: string; children: ReactNode }>;
  Deslizador: ComponentType<{ id: string; etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string; alCambiar: (v: number) => void; desactivado?: boolean; centro?: number; clave?: keyof Parametros }>;
  Selector: ComponentType<{ id: string; etiqueta: string; valor: string; opciones: { k: string; n: string }[]; alCambiar: (v: string) => void; clave?: keyof Parametros }>;
  ListaComprobaciones: ComponentType<{ lista: Comprobacion[] }>;
}

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const m2 = (v: number) => `${fmt(v)} m`;
const cm = (v: number, d = 1) => `${fmt(v * 100, d)} cm`;
/** The aerodynamic body's own shape sliders: the Smera body (its traced lines) has no use for them. */
const SOLO_AERO = new Set<string>(['qAnchoIni', 'qAnchoFin', 'qMorroAlto', 'qMorroPunta', 'qMorroRedondo', 'qMorroAncho', 'qColaAlto', 'qColaCurva', 'qColaAncho', 'qColaGrosor', 'qBajosCola',
  'qLineaEje', 'qParabrisasX', 'qParabrisas', 'qCaida', 'qCintura', 'qVentAlto', 'qCupFin', 'qSolarIni', 'qSolarFin', 'qMorroSobre', 'qPasoAbre']);
const GRUPOS: [DepBasculante, string][] = [['carroceria', 'Carrocería'], ['chasis', 'Chasis'], ['rodaje', 'Rodaje'], ['propulsion', 'Motor'], ['energia', 'Energía'], ['interior', 'Interior']];

/** What a slider shows next to its value. */
function mostrar(f: FichaBasculante, v: number, m: ModeloBasculante, res: Resultados): string {
  switch (f.clave) {
    case 'qMorro': return m.morroAlargado ? `${m2(m.xn)} · más corto no tapa las ruedas` : m2(v);
    case 'qLineaEje': return m.F.techo(0) > v + 0.005 ? `${m2(v)} · pasa a ${m2(m.F.techo(0))}: lo piden las ruedas` : m2(v);
    case 'qMorroSobre': return `${cm(v, 1)} · capó a ${m2(m.F.techo(0))} sobre el eje`;
    case 'qAlto': return `${fmt(v, 3)} m · un ${Math.round((1 - v / 1.48) * 100)} % bajo el Smera`;
    case 'qAnchoIni': case 'qAnchoFin': case 'qParabrisasX': case 'qCaida': case 'qCupFin': case 'qSolarIni': case 'qPilX': case 'qPasX': return `${m2(v)} tras el eje delantero`;
    case 'qSolarFin': return res.areas.solar < 0.005 ? 'sin techo solar' : `${m2(v)} · ${fmt(res.areas.solar)} m²`;
    case 'qMorroPunta': return v < 0.05 ? 'en punta' : v > 0.95 ? 'redondo' : `${Math.round(v * 100)} % hacia redondo`;
    case 'qPodForma': return v < 0.05 ? 'cola redonda' : v > 0.95 ? 'cola en punta' : `${Math.round(v * 100)} % hacia la punta`;
    case 'qColaCurva': return v < 1.5 ? `${fmt(v, 2)} · casi recta` : v > 2.4 ? `${fmt(v, 2)} · aguanta arriba y cae al final` : `${fmt(v, 2)} · curva suave (Aptera)`;
    case 'qSeccion': case 'qPanza': return v < 2.2 ? `${fmt(v, 2)} · redonda` : v > 3.1 ? `${fmt(v, 2)} · casi plana` : fmt(v, 2);
    case 'qMorroAncho': case 'qColaAncho': return `${Math.round(v * 100)} % del ancho`;
    case 'qCentro': case 'qCintura': case 'qVentAlto': return `${Math.round(v * 100)} %`;
    case 'qPodCubre': return v < 0.02 ? 'hasta el eje' : `${Math.round(v * 100)} % del radio bajo el eje`;
    case 'qBajosCola': return Math.abs(v) < 0.005 ? 'en el eje trasero' : `${cm(Math.abs(v), 0)} ${v > 0 ? 'delante' : 'detrás'} del eje trasero`;
    case 'qRecPil': case 'qRecPas': return `${v}° desde la vertical`;
    case 'qBascMax': return `${v}° · equilibra ${fmt(Math.tan(v * Math.PI / 180))} g`;
    case 'qGiro': return `${v}° · radio ${m2(res.basculante?.basculacion.radio ?? 0)}`;
    case 'qVolX': case 'qVolY': case 'qPedX': case 'qPedY': return `${v >= 0 ? '+' : '−'}${cm(Math.abs(v), 0)}`;
    case 'qKWh': return `${fmt(v, 1)} kWh · ${Math.round(m.bateria.litros)} L`;
    case 'qPodAlto': case 'qPodAncho': case 'qPodFrente': case 'qPodCola': return `×${fmt(v, 2)}`;
  }
  switch (f.unidad) {
    case 'm': return m2(v);
    case 'cm': return cm(v);
    case 'mm': return `${fmt(v, 1)} mm`;
    case '°': return `${v}°`;
    case 'x': return `×${fmt(v, 2)}`;
    case 'Wh/kg': case 'Wh/L': case 'km/h': return `${Math.round(v)} ${f.unidad}`;
    default: return `${fmt(v, 1)} ${f.unidad}`;
  }
}

/** A paragraph under a block, in plain Spanish: what the block's sliders do. */
function nota(bloque: string, m: ModeloBasculante, res: Resultados): string | null {
  const Q = m.campos, b = res.basculante!;
  switch (bloque) {
    case 'Forma': if (m.smera) return `Carrocería como el Lumeneo Smera de 2008: sus líneas (el techo, la panza a ${cm(m.F.bajos(-0.8), 0)} del suelo, el ancho, las ventanas, la puerta, los faros) están calcadas de las fotos de prensa de Lumeneo, a escala con su batalla de 1,70 m. Los deslizadores la estiran sin cambiar su forma: «Largo total» alarga la batalla, «Morro» y «Cola» lo de delante y lo de detrás, «Alto total» la sube o la baja por encima del suelo y «Ancho» la ensancha. Para bajarla sin que las cabezas toquen el techo, reclina más a los dos (Interior). ${m2(m.Lf)} de la punta a la cola, más la barra negra de delante.`;
      return `La carrocería es una sola piel lisa: cada sección son dos superelipses (la mitad de arriba y la de abajo) y sus tres líneas a lo largo (el techo, la panza y el ancho) son curvas que nunca se pasan de un punto al siguiente, así que no salen montículos se muevan como se muevan los deslizadores (lo comprueba un programa con cada deslizador en sus dos extremos). ${m.enMorro ? `Delante envuelve las dos ruedas en una sola pieza: es lo más ancho del coche (${m2(m.anchoCuerpo)}) y desde ahí se estrecha en una curva hasta la cola, como una gota vista desde arriba.` : `Entre las ruedas delanteras se estrecha sola: deja ${cm(Q.qHuecoCuerpo, 0)} a lo que barren los carenados al girar e inclinarse a tope.`} Alto ${m2(m.alto)}: el Lumeneo Smera mide 1,48 m (auto123.com, prototipo), así que es un ${Math.round((1 - m.alto / 1.48) * 100)} % más bajo.`;
    case 'Sección': if (m.smera) return 'La mitad de arriba es redonda («Sección arriba»). La de abajo, como en el Smera, no es una elipse: cae desde un hombro en la cintura (el pliegue de la puerta) hasta un suelo plano de unos 42 cm, una bañera estrecha entre las ruedas para que se pueda inclinar sin tocar el suelo. «Cintura» no cambia en esta carrocería: va a 0,85 m, donde la foto de frente es más ancha.';
      return 'La mitad de abajo redonda deja inclinar sin que la panza toque el suelo (abajo, «Carrocería al suelo inclinada»); más plana da más sitio al suelo, a la batería y a los pies, pero con menos inclinación ya roza.';
    case 'Morro y cola': if (m.smera) return 'El morro del Smera es corto y redondo: los faros en sus esquinas de arriba, a los lados de la máscara negra bajo el parabrisas, y la barra negra abajo, entre las ruedas. Detrás, el techo acaba en una visera sobre la luneta y la trasera cae casi vertical y redondeada, con los pilotos en las esquinas. Más largos, los dos se estiran sin cambiar de forma.';
      return `${m.enMorro ? `El morro es una sola pieza redondeada delante de las dos ruedas${m.morroAlargado ? ` (llega a ${m2(m.xn)} del eje: con la punta redondeada que pides, más corto apretaría los pasos de rueda)` : ''}` : 'El morro va entre los dos carenados delanteros, más estrecho que ellos'}; la cola cae en una sola curva desde el techo hasta un borde fino, como la del Aptera, con los bajos subiendo hasta ella en otra curva larga (el difusor). Con la curva más alta el techo aguanta arriba y cae al final (más techo para el pasajero, más resistencia); más baja, cae antes y casi recta.`;
    case 'Cúpula': return `Morro, cabina y cola son una sola línea suave de punta a cola, como en el Aptera y el Cuadriciclo Bala: desde la punta sube sin doblarse nunca hacia abajo, pasa sobre el eje delantero a ${m2(m.F.techo(0))}, el parabrisas va encima de ella (sin capó propio ni escalón en su pie) y llega al techo sin quiebro; detrás, la cola cae en una sola curva. Toda la parte de arriba entre el pie del parabrisas y el final de las ventanas es una cúpula de policarbonato con el techo solar, que se abre hacia delante en una pieza («Abrir cúpula»). Los montantes y los bordes llevan una junta negra. Cristal: ${fmt(res.areas.cristal)} m².`;
    case 'Techo solar': if (m.smera) return res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m² de panel${m.conSolar ? ' en todo el techo' : ''}${m.solarCola ? (m.conSolar ? ' y' : '') + ' en la luna de atrás, en vez del cristal' : ''}: ${Math.round(res.solarPico)} W a pleno sol y de media unos ${fmt(res.solarDia / 1000)} kWh al día (estimación).` : 'Sin paneles: el Smera de 2008 no los llevaba. «Paneles en el techo» los pone en todo el techo, y «en la cola», en la luna de atrás.';
      return res.areas.solar > 0.005 ? `${[m.solarMorro && 'el morro', m.conSolar && 'el techo', m.solarCola && 'la cola'].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' y $1')}: ${fmt(res.areas.solar)} m² de panel en una franja de punta a cola, como en el Aptera; ${Math.round(res.solarPico)} W a pleno sol y de media unos ${fmt(res.solarDia / 1000)} kWh al día (4,5 kWh/m² al día sobre plano, el panel curvo recoge un 70 %, células al 21 % y un 15 % de pérdidas). Estimación.` : 'Sin paneles solares.';
    case 'Ruedas delanteras': if (m.smera && m.pasoDel) return `Como en el Smera, cada rueda va en un paso de rueda abierto por el lado, con su guardabarros plateado que gira y se inclina con ella; las traseras, igual, con el guardabarros fijo a su brazo. Por dentro, la pared del paso sigue a la rueda girada: junto al eje deja ${cm(m.pasoDel.zIn(0) * 2, 0)} entre las dos para los pies del piloto.`;
      return m.enMorro && m.arcoDel && m.pasoDel
      ? `Las dos ruedas delanteras van dentro del morro, en pasos de rueda que les dejan girar ${Math.round(m.giro * 180 / Math.PI)}°, inclinarse ${Math.round(m.phiMax * 180 / Math.PI)}° y hundirse en la suspensión a la vez (la de dentro de la curva sube ${cm(m.arcoDel.yTop - 2 * m.rF - Q.qPasoHueco, 0)}). El techo del morro va ${cm(Q.qMorroSobre, 0)} por encima del paso de rueda: más alto, el morro sale más estrecho; más bajo, más ancho. Como en un velomóvil, la rueda solo asoma por debajo: la abertura sube ${cm(Q.qPasoAbre, 0)} sobre el eje por el lado, y todo lo que la rueda barre por encima, girada e inclinada, lo tapa el morro. Por dentro, la pared del paso sigue a la rueda girada: junto al eje deja ${cm(m.pasoDel.zIn(0) * 2, 0)} entre las dos para los pies del piloto.`
      : 'Cada rueda delantera va en su propio carenado, que gira y se inclina con ella (abajo, «Carenados delanteros»).';
    case 'Carenados delanteros': return `Los carenados van con su rueda: giran con la dirección y se inclinan con ella, como los del Aptera, así que el neumático siempre queda igual de centrado (${cm(Q.qPodHueco, 1)} de hueco). Lo que se comprueba es que, girados a tope e inclinados al máximo, no toquen la carrocería ni el suelo. Más largos o más anchos son más aerodinámicos pero estrechan el morro (los pies del piloto van entre ellos).`;
    case 'Material y espesores': return null;
    case 'Asientos': return 'Dos asientos en tándem, los dos reclinados como en un velomóvil: es lo que deja bajar el techo un 25 % respecto al Smera. La cabeza va más recta que la espalda (un 45 % de su reclinado), para mirar al frente. El pasajero lleva las piernas a los lados del asiento del piloto, con los pies en dos reposapiés junto a sus caderas, como en un Renault Twizy. Más reclinado: más techo, pero más largo hace falta el coche.';
    case 'Mandos': if (m.smera) return 'Volante redondo, como el del Smera, delante del pecho del conductor, que va sentado casi derecho; dos pedales entre las ruedas delanteras. La inclinación no se maneja: la decide un controlador con la velocidad y el giro.';
      return 'Volante tipo «yoke» delante del pecho del piloto, con la columna hasta la cremallera en el morro; dos pedales (acelerador y freno) entre las ruedas delanteras, con los talones altos para que las rodillas se doblen y no toquen el volante. La inclinación no se maneja: la decide un controlador con la velocidad y el giro (como en el Smera).';
    case 'Bastidor': return `Dos largueros sobre la panza (se juntan hacia el morro para ir entre las ruedas delanteras), la torre delantera y la trasera que sostienen los paralelogramos, travesaños bajo los asientos y un arco detrás del piloto hasta la cintura: ${fmt(b.bastidor.metros, 1)} m de tubo. Se ve con «Rayos X» o la capa «Chasis».`;
    case 'Ejes y ruedas': return `${esDelCatalogo(Q.qRuedaDel) || esDelCatalogo(Q.qRuedaTras) ? 'Las ruedas de moto' : 'Ruedas de scooter delante y detrás'}: su banda redonda deja inclinar unos 45° (un neumático de coche, plano, apenas unos grados). ${m.enMorro ? 'Las cuatro van dentro de la carrocería' : 'Las traseras van dentro de la carrocería'}, en pasos de rueda que dejan sitio a que suban y bajen al inclinarse. Vía efectiva ${m2(b.basculacion.viaEf)}.${fichasElegidas(Q.qRuedaDel, Q.qRuedaTras)}`;
    case 'Basculación': return `En cada eje, dos brazos de lado a lado giran sobre el bastidor en el centro y sostienen en sus puntas un pilar por rueda: un paralelogramo. Al inclinar, los brazos se quedan paralelos a la carretera y la carrocería y las cuatro ruedas se inclinan juntas alrededor del suelo bajo el centro del coche; un actuador eléctrico mueve el paralelogramo delantero. Inclinado ${Math.round(b.basculacion.phiMax * 180 / Math.PI)}° equilibra una curva de ${fmt(b.basculacion.aEquilibrada)} g sin cargar los neumáticos de lado. «Bascular», abajo en el 3D.`;
    case 'Suspensión y dirección': return `Cada rueda va en un pilar telescópico con su muelle (como el Piaggio MP3). Las delanteras giran sobre ese pilar; la de dentro de la curva gira más (Ackermann). Más giro, menos radio (ahora ${m2(b.basculacion.radio)} a la rueda de fuera), pero ${m.enMorro ? 'los pasos de rueda tienen que ser más largos y más anchos por dentro (menos sitio para los pies)' : 'los carenados barren más y el morro se estrecha'}.`;
    case 'Motores': return `Un motor en el buje de cada rueda trasera, sin cadena ni correa, con sus controladores en la torre trasera. En una llanta de scooter caben unos ${RUEDAS_BASCULANTE[Q.qRuedaTras].kWBuje} kW de pico por rueda (regla aproximada).`;
    case 'Batería': return `Tres paquetes bajos: entre las ruedas traseras bajo el respaldo del pasajero (como el Twizy bajo su asiento de atrás), bajo los muslos del piloto y uno plano bajo el asiento del pasajero, siempre entre los largueros. Ahora: ${Math.round(b.bateria.litros)} L y ${Math.round(b.bateria.kg)} kg; caben ${Math.round(b.bateria.cabe)} L.`;
  }
  return null;
}

export function LadoBasculante({ P, set, res, modelo, dep, cd, ui, unido }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: ModeloBasculante; dep: DepBasculante | 'proyecto'; cd: CdBasculante; ui: UiLado;
  /** (2026-11-27) one half of the merged tab «Chasis y carrocería»: the frame's half has no vehicle summary */
  unido?: 'carroceria' | 'chasis';
}) {
  const { Bloque, Deslizador, Selector, ListaComprobaciones } = ui;
  const Q = camposBasculante(P), b = res.basculante!;
  const e = cd.cd != null && cd.areaRef != null ? energiaBasculante(modelo, res.mTot, { cd: cd.cd, areaRef: cd.areaRef }, res.areas.solar, b.basculacion.repartoDel) : null;
  // (the fairings' sliders only with the fairings; the nose's over the wheels only with the wheels in the nose)
  // (the Smera's body is drawn from its traced lines: the aerodynamic body's own shape sliders do not apply to it)
  const fichas = deslizadoresBasculante().filter(f => f.dep === dep && (modelo.enMorro ? f.bloque !== 'Carenados delanteros' : f.bloque !== 'Ruedas delanteras') && !(modelo.smera && SOLO_AERO.has(f.clave))), sels = SELECTORES_BASCULANTE.filter(s => s.dep === dep && !(modelo.smera && s.clave === 'qRuedasDel'));
  const bloques = [...new Set([...fichas.map(f => f.bloque), ...sels.map(s => s.bloque)])];
  const checks = res.comprobaciones.filter(c => dep === 'proyecto' || (c.dep ?? '').split(',').includes(dep));
  const malas = checks.filter(c => c.holgura < c.minimo).length;
  const dl = (filas: [string, string][]) => (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
      {filas.map(([a, v]) => (<Fragment key={a}><dt className="whitespace-pre text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{v}</dd></Fragment>))}
    </dl>
  );
  const sinCd = cd.calculando ? 'calculando…' : '—', kmh = Math.round(limitarBasculante('qVel', Q));
  const grados = Math.round(b.basculacion.phiMax * 180 / Math.PI);
  const rendimiento = (
    <Bloque titulo="Rendimiento" nota={cd.calculando ? 'el túnel calcula el Cd…' : 'estimación'}>
      {dl([
        ['Cd del túnel (estimado)', cd.cd != null ? fmt(cd.cd, 3) : sinCd],
        ['  referido a la sección de la carrocería', cd.areaRef != null ? `${fmt(cd.areaRef)} m²` : sinCd],
        ['CdA', e ? `${fmt(e.CdA, 3)} m²` : sinCd],
        [`Consumo a ${kmh} km/h`, e ? `${fmt(e.WhKm / 10, 1)} kWh/100 km` : sinCd],
        ['Consumo a 50 y a 100 km/h', e ? `${fmt(e.WhKm50 / 10, 1)} · ${fmt(e.WhKm100 / 10, 1)} kWh/100 km` : sinCd],
        [`Autonomía a ${kmh} km/h`, e ? `${Math.round(e.autonomia)} km` : sinCd],
        [`Velocidad sostenida (${fmt(Q.qKWNom, 1)} kW)`, e ? `${Math.round(e.vmaxNominal)} km/h` : sinCd],
        [`Velocidad punta (${fmt(Q.qKWPico, 1)} kW)`, e ? `${Math.round(e.vmaxPico)} km/h` : sinCd],
        ['0 → 50 km/h', e ? (e.acel50 > 60 ? 'no llega' : `${fmt(e.acel50, 1)} s`) : sinCd],
        ['Techo solar', res.areas.solar > 0.005 ? `${fmt(res.areas.solar)} m² · ${Math.round(res.solarPico)} W pico` : 'sin techo solar'],
        ['  energía solar al día (estimada)', res.areas.solar > 0.005 ? `${fmt(res.solarDia / 1000)} kWh · ${e ? `${Math.round(e.kmSol)} km` : sinCd}` : '—'],
      ])}
      {cd.calculando && <p className="flex items-center gap-1.5 text-xs text-sky-800"><Wind className="h-3.5 w-3.5 animate-pulse" />El túnel de viento está calculando el Cd de esta forma (unos segundos). Hasta que acabe, no hay cifra.</p>}
      <p className="text-xs text-slate-500">El Cd lo calcula el túnel con la silueta de la carrocería y sus cuatro ruedas (no hay fórmula del editor para esta forma); {modelo.enMorro ? 'las ruedas delanteras, como las traseras, van dentro con la parte de abajo al aire' : 'los carenados delanteros solo entran como ruedas carenadas, así que el real será algo más alto'}. Con los dos ocupantes de {Q.qMOcc} kg ({Math.round(res.mTot)} kg en total), rodadura {fmt(crrBasculante(Q), 4)} ({esDelCatalogo(Q.qRuedaDel) || esDelCatalogo(Q.qRuedaTras) ? 'la media de los neumáticos elegidos, con sus fuentes en «Ejes y ruedas»' : 'neumático de scooter'}), motores y controladores al {Math.round(RENDIMIENTO_B * 100)} %, {AUXILIARES_B} W de equipos y la batería usable al {Math.round(USABLE_B * 100)} %. Todo supuesto, no medido.</p>
    </Bloque>
  );
  const peso = (
    <Bloque titulo="Peso: todos los componentes" nota={`${Math.round(res.mVeh)} kg en vacío`}>
      <div className="flex flex-col gap-2.5 text-[13px]">
        {GRUPOS.map(([g, n]) => {
          const ps = b.piezas.filter(p => p.grupo === g); if (!ps.length) return null;
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
          <dt className="text-slate-600">Con los dos de {Q.qMOcc} kg</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(res.mTot)} kg</dd>
          <dt className="text-slate-600">Y {EQUIPAJE_B} kg de equipaje</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(res.mTot + EQUIPAJE_B)} kg</dd>
        </dl>
      </div>
      <p className="text-xs text-slate-500">Eugenio pidió «unos 250 kg», entre una moto y un Twizy (unos 470 kg con batería). Con laminado de carbono-lino, bastidor de aluminio y {fmt(Q.qKWh, 1)} kWh sale menos; con fibra de vidrio, tubos de acero y más batería se acerca a 250. Cada deslizador de masa es una estimación de piezas de su clase, no pesadas.</p>
      <p className="text-xs text-slate-500">Centro de gravedad con los dos: {cm(b.cg.y, 0)} sobre el suelo y {m2(-b.cg.x)} detrás del eje delantero ({Math.round(b.basculacion.repartoDel * 100)} % del peso delante). Vacío: {cm(b.cg.vacio.y, 0)} de alto.</p>
    </Bloque>
  );
  return (
    <>
      {dep === 'proyecto' && peso}
      {unido === 'chasis' ? (
        <Bloque titulo={`Chasis: ${LEMAS_BASCULANTE.chasis}`} nota="el bastidor">
          <p className="text-xs text-slate-500">El chasis y la carrocería se trabajan juntos en esta pestaña: lo de arriba es la piel; esto, los tubos que van dentro. Todo de fibra o metal y fibra: «Materiales y estructura», debajo del 3D.</p>
        </Bloque>
      ) : <Bloque titulo={LEMAS_BASCULANTE[dep]} nota={NOMBRE_BASCULANTE}>
        {modelo.smera
          ? <p className="text-xs text-slate-500">Carrocería como el Lumeneo Smera (Francia, 2008): su réplica, calcada de las fotos de prensa de Lumeneo, con su paralelogramo que inclina la cabina y las cuatro ruedas, sus dos puertas que se abren, el conductor delante y el pasajero detrás. Todos los deslizadores la cambian: más larga, más baja, los dos más reclinados, paneles en el techo y en la cola. {m2(modelo.Lf)} × {m2(modelo.anchoTotal)} × {m2(modelo.alto)} (la carrocería, {m2(modelo.anchoCuerpo)} de ancho; con las ruedas, {m2(modelo.anchoTotal)}).</p>
          : <p className="text-xs text-slate-500">Cuatro ruedas que se inclinan en las curvas, como en el Lumeneo Smera (francés, 2008-2012), pero más bajo: el techo un 25 % más bajo, con los dos reclinados como en un velomóvil, la cola curva del Aptera y {modelo.enMorro ? 'las dos ruedas delanteras dentro del morro, envueltas en una sola pieza' : 'las ruedas delanteras en carenados que giran y se inclinan con ellas'}. {m2(modelo.Lf)} × {m2(modelo.anchoTotal)} × {m2(modelo.alto)}{modelo.pod ? ` (la carrocería, ${m2(modelo.anchoCuerpo)} de ancho; con los carenados, ${m2(modelo.anchoTotal)})` : ' (lo más ancho es el morro, sobre las ruedas delanteras)'}.</p>}
      </Bloque>}
      {bloques.map(bloque => (
        <Bloque key={bloque} titulo={bloque}>
          {bloque === 'Forma' && (() => {
            const lg = largoBasculante(Q);
            return <Deslizador id="q-largo" etiqueta="Largo total (estira la batalla)" valor={lg.valor} min={lg.min} max={lg.max} paso={0.01} mostrar={`${m2(lg.valor)} · el Smera, 2,40-2,50`} alCambiar={x => set('qBatalla', +(x - (lg.valor - limitarBasculante('qBatalla', Q))).toFixed(3))} />;
          })()}
          {fichas.filter(f => f.bloque === bloque).map(f => {
            const v = limitarBasculante(f.clave, Q);
            // (the whole range shows: re-centred on the default, as the other families' sliders, it would hide part of it)
            return <Deslizador key={f.clave} id={`q-${f.clave}`} etiqueta={f.n} valor={v} clave={f.clave} min={f.min} max={f.max} paso={f.paso} mostrar={mostrar(f, v, modelo, res)} alCambiar={x => set(f.clave, x)} />;
          })}
          {sels.filter(s => s.bloque === bloque).map(s => <Selector key={s.clave} id={`q-${s.clave}`} etiqueta={s.n} valor={Q[s.clave] as string} clave={s.clave} opciones={s.opciones} alCambiar={v => set(s.clave, v as never)} />)}
          {nota(bloque, modelo, res) && <p className="-mt-1 text-xs text-slate-500">{nota(bloque, modelo, res)}</p>}
          {bloque === 'Ejes y ruedas' && (() => { const n = neumaticosBasculante(Q); return <p className="-mt-1 text-xs text-slate-600"><b>Neumáticos delanteros:</b> {lineaNeumatico(n.del)} <b>Traseros:</b> {lineaNeumatico(n.tras)} Comparado con el neumático de serie de esa medida; agarre en seco y mojado, duración y precio son estimaciones con sus fuentes en el código.</p>; })()}
        </Bloque>
      ))}
      {dep === 'carroceria' && (
        <Bloque titulo="Lo que se mide" nota="estimación">
          {dl([
            ['Área frontal (todo)', `${fmt(b.area.total)} m²`], ['  la carrocería', `${fmt(b.area.cuerpo)} m²`], ...(modelo.pod ? [['  + los dos carenados delanteros', `${fmt(b.area.carenados)} m²`] as [string, string]] : []), ['  + ruedas (lo que asoma)', `${fmt(b.area.ruedas)} m²`],
            ['Volumen de la carrocería', `${fmt(b.vol)} m³`], ['Piel de la carrocería', `${fmt(res.areas.carroceria)} m²`], ['Cristal de la cúpula', `${fmt(res.areas.cristal)} m²`], ...(modelo.pod ? [['Piel de los carenados', `${fmt(b.pielCarenados)} m²`] as [string, string]] : []),
            [modelo.pod ? 'Masa: carrocería, carenados y cúpula' : 'Masa: carrocería y cúpula', `${fmt((res.masas['Carrocería'] ?? 0) + (res.masas['Carenados delanteros (los dos)'] ?? 0) + (res.masas['Cúpula de policarbonato'] ?? 0), 1)} kg`],
            ['Cd del túnel (estimado)', cd.cd != null ? fmt(cd.cd, 3) : sinCd],
          ])}
        </Bloque>
      )}
      {(dep === 'rodaje' || dep === 'proyecto') && (
        <Bloque titulo="Basculación y vuelco" nota={`${grados}° · ${fmt(b.basculacion.ssfInclinado)} g`}>
          {dl([
            [`Inclinación máxima`, `${grados}°`], ['Curva que equilibra inclinado a tope', `${fmt(b.basculacion.aEquilibrada)} g`],
            [`Lo tumba, inclinado ${grados}°`, `${fmt(b.basculacion.ssfInclinado)} g`], ['Lo tumba, sin bascular (parado)', `${fmt(b.basculacion.ssfRecto)} g`],
            ['Centro de gravedad: altura', cm(b.cg.y, 0)], ['  detrás del eje delantero', m2(-b.cg.x)], ['  peso sobre las ruedas delanteras', `${Math.round(b.basculacion.repartoDel * 100)} %`],
            ['Vías: delante · detrás', `${m2(modelo.via.del)} · ${m2(modelo.via.tras)}`], ['Radio de giro (rueda de fuera)', m2(b.basculacion.radio)],
          ])}
          <p className="text-xs text-slate-500">Inclinado un ángulo φ hacia dentro de la curva, el peso y la fuerza de la curva se equilibran cuando la aceleración lateral vale g·tan φ: hasta ahí los neumáticos no trabajan de lado, como en una moto. Lo que lo tumbaría sobre las dos ruedas de fuera es (media vía + altura del centro de gravedad × sen φ) ÷ (altura × cos φ), en g: inclinarse lo sube mucho. Sin bascular (parado, a paso de peatón, con la inclinación bloqueada) es media vía ÷ altura, y es menos que lo que agarra un neumático (unos {fmt(AGARRE_B, 1)} g): por eso bascula. Un controlador decide la inclinación con la velocidad y el giro; aquí se dibuja hasta la máxima. Todo de sólido rígido, sin la suspensión.</p>
        </Bloque>
      )}
      {(dep === 'propulsion' || dep === 'energia' || dep === 'proyecto') && rendimiento}
      <Bloque titulo={dep === 'proyecto' ? 'Comprobaciones' : unido === 'chasis' ? 'Comprobaciones del chasis' : unido === 'carroceria' ? 'Comprobaciones de la carrocería' : 'Comprobaciones de este departamento'} nota={checks.length ? (malas ? `${malas} por revisar` : 'todo cabe') : ''}>
        {checks.length ? <ListaComprobaciones lista={checks} /> : <p className="text-xs text-slate-500">Este departamento no tiene comprobaciones propias: todas están en «Proyecto».</p>}
        {(dep === 'interior' || dep === 'proyecto') && <p className="text-xs text-slate-500">Cabezas: un hombre sentado, sin casco, de talla media (91,8 cm sentado erguido) y alta (97,7 cm, percentil 95; ANSUR II, 2012); el tronco reclinado lo que diga su respaldo y la cabeza un 45 % de eso. Se mide de la parte de arriba y de atrás del cráneo a la cara de dentro de la cúpula.</p>}
        {(dep === 'rodaje' || dep === 'carroceria' || dep === 'proyecto') && <p className="text-xs text-slate-500">Las comprobaciones de la basculación se hacen en las posiciones extremas: inclinado a tope a cada lado, con las ruedas rectas y giradas a tope, con la carrocería vista desde sí misma (las ruedas y sus pasos) y desde la calle (el suelo).</p>}
      </Bloque>
    </>
  );
}
