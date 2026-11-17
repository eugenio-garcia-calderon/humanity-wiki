// The L7e power study of a hybrid (or electric) Triciclo, and the tests the type-approval needs (2026-11-17, Eugenio:
// «Añade ese texto que te adjunto en la parte de homologación, resumiendo el tema de homologación de L7, y sobre todo qué
// cosas están OK y que cosas no, conectando con el tema de Electronica de control y de potencia pico y potencia continua
// configurada. y también añade los ensayos necesarios segun la normativa, añadiendo una pestaña por cada ensayo»).
//
// His study («Estudio de homologación L7e-A2: híbrido en paralelo») in short: 168/2013 annex I caps L7e-A at 15 kW; for a
// hybrid, 134/2014 annex X app. 2.4 measures the TOTAL maximum power of the drive in EVERY hybrid mode and takes the
// highest; 901/2014 declares apart the engine's net maximum (1.8.3), the e-motor's continuous rated power (1.8.5), the
// drive's continuous total (1.8.7) and its peak total (1.8.9); 3/2014 annex XVIII wants two independent limiting methods
// of different nature; UN R85 defines the 30-minute power. No regulation read grants a general allowance of N seconds above
// the continuous limit: the peak is declared and justified to the technical service.
//
// Pure: computed live from the ficha (ficha.ts) and the power electronics (triciclo/electronica.ts). Orientative.
import type { FichaHomologacion } from './ficha';
import { evaluarCategoria } from './evaluar';
import type { IdFuente } from './normas';
import { TEXTO_LIMITADOR } from '../triciclo/electronica';

/** The L7e-A power limit (kW): 168/2013, annex I. */
export const LIMITE_L7E = 15;

export type EstadoL7e = 'ok' | 'no' | 'comprobar';
export const ETIQUETA_L7E: Record<EstadoL7e, string> = { ok: 'OK', no: 'No OK', comprobar: 'A comprobar' };

export interface PuntoL7e {
  id: string;
  /** field of the 901/2014 information document, when it is one */
  campo?: string;
  titulo: string;
  valor: string;
  estado: EstadoL7e;
  texto: string;
  ref: string;
  fuente: IdFuente;
}

export interface EscenarioL7e { nombre: string; termico: number; electrico: number; total: number; estado: EstadoL7e; nota: string }

export interface Ensayo {
  id: string;
  titulo: string;
  corto: string;
  objetivo: string;
  ref: string;
  fuente: IdFuente;
  pasos: string[];
  /** what the manufacturer must declare before the test */
  declarar: string[];
  /** this design's figures for it */
  valores: [string, string][];
  /** what to expect with today's design */
  expectativa: { estado: EstadoL7e; texto: string };
  /** every test is pending: none has been done */
  estado: 'pendiente';
}

const kW = (v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kW`;
const n0 = (v: number | null | undefined) => (v == null ? '—' : Math.round(v).toLocaleString('es-ES'));

export function estudioL7e(f: FichaHomologacion): { puntos: PuntoL7e[]; escenarios: EscenarioL7e[]; ensayos: Ensayo[]; resumen: string } | null {
  const el = f.electronica;
  if (!el) return null;
  const L = LIMITE_L7E, hib = el.hibrido;
  const puntos: PuntoL7e[] = [];
  // ── the rest of the classification, from the general pre-check
  const ev = evaluarCategoria(f, 'L7e-A2');
  const clas = ev.resultados.filter(r => ['ruedas', 'gemelas', 'plazas', 'horcajadas', 'masa'].includes(r.req.id));
  const malas = clas.filter(r => r.estado === 'no' || r.estado === 'condicion'), dudas = clas.filter(r => r.estado === 'comprobar');
  puntos.push({
    id: 'clasificacion', titulo: 'Ruedas, plazas, asiento y masa de L7e-A2', valor: `${f.ruedasLegales} ruedas · ${n0(f.plazas)} plazas · ${n0(f.masaOrdenMarcha)} kg`,
    estado: malas.length ? 'no' : dudas.length ? 'comprobar' : 'ok',
    texto: malas.length ? `No: ${malas.map(r => `${r.req.titulo.toLowerCase()} (${r.texto.replace(/\.$/, '')})`).join('; ')}.` : 'Cuatro ruedas, dos plazas como mucho que no son a horcajadas y hasta 450 kg sin la batería: lo demás de la categoría se cumple (el detalle, arriba).',
    ref: 'Reglamento 168/2013, anexo I', fuente: 'r168',
  });
  if (hib) puntos.push({
    id: 'termico', campo: '1.8.3', titulo: 'Potencia neta máxima del motor térmico', valor: el.termicoNeto < el.termicoMotor ? `${kW(el.termicoNeto)} (rebajado de ${kW(el.termicoMotor)})` : kW(el.termicoNeto),
    estado: el.termicoNeto <= L + 1e-9 ? 'ok' : el.estrategia !== 'libre' && el.limCont != null && el.limCont <= L + 1e-9 ? 'comprobar' : 'no',
    texto: el.termicoNeto <= L + 1e-9 ? `Él solo cabe en los ${L} kW${el.termicoNeto >= L - 1e-9 ? ', pero ya los gasta enteros: cualquier ayuda eléctrica a la vez los pasa' : ''}.`
      : el.estrategia !== 'libre' && el.limCont != null && el.limCont <= L + 1e-9
        ? `El motor da ${kW(el.termicoNeto)} en banco; la electrónica no deja pasar de ${kW(el.limCont)} al conjunto, pero el ensayo 1 mide el motor solo y declararía ${kW(el.termicoNeto)}. Lo seguro: «Térmico rebajado» o un motor de ${L} kW o menos.`
        : `Él solo ya pasa de ${L} kW: L7e no es posible sin rebajarlo («Térmico rebajado» o un motor más pequeño).`,
    ref: 'Reglamento 901/2014, ficha, campo 1.8.3; 134/2014, anexo X', fuente: 'r901',
  });
  puntos.push({
    id: 'electrico', campo: '1.8.5', titulo: 'Potencia continua nominal del motor eléctrico (30 minutos)', valor: `${kW(el.elecCont)} (pico ${kW(el.elecPico)})`,
    estado: el.elecCont <= L + 1e-9 ? 'ok' : 'no',
    texto: el.elecCont <= L + 1e-9 ? 'Cabe sola en el límite. Es la potencia media que aguanta 30 minutos (Reglamento UN 85): hay que medirla, no basta con la del catálogo.' : `Sola pasa de ${L} kW.`,
    ref: 'Reglamento 901/2014, campo 1.8.5; Reglamento UN 85', fuente: 'r85',
  });
  const libreSuma = hib && el.estrategia === 'libre';
  puntos.push({
    id: 'continuaTotal', campo: '1.8.7', titulo: 'Potencia continua total de la propulsión', valor: `${kW(el.contTotal)} (modo «${el.modoCont.nombre}»)`,
    estado: el.contTotal <= L + 1e-9 ? 'ok' : 'no',
    texto: el.contTotal <= L + 1e-9
      ? `Cabe en los ${L} kW en todos los modos${el.limCont != null ? ` gracias al límite configurado de ${kW(el.limCont)}` : ''}.`
      : `${kW(el.contTotal)} en el modo «${el.modoCont.nombre}»: se pasa en ${kW(el.contTotal - L)}. ${libreSuma ? 'Los dos motores pueden empujar a la vez y nadie limita la suma (reparto «Sin gestión»). ' : ''}Se arregla en Motor › Electrónica de potencia: un límite continuo del conjunto de ${L} kW con «Límite dinámico» o «Térmico rebajado», y sin un modo que lo quite.`,
    ref: 'Reglamento 168/2013, anexo I; 901/2014, campo 1.8.7; 134/2014, anexo X, ap. 2.4', fuente: 'r134anx',
  });
  puntos.push({
    id: 'picoTotal', campo: '1.8.9', titulo: 'Potencia pico máxima de la propulsión', valor: `${kW(el.picoTotal)} durante ${n0(el.picoSeg)} s como mucho`,
    estado: el.picoTotal <= L + 1e-9 ? 'ok' : 'comprobar',
    texto: el.picoTotal <= L + 1e-9 ? 'No pasa de 15 kW ni en pico.'
      : `Pasa de ${L} kW en pico. No es lo mismo que la continua (901/2014 las declara aparte), así que no descarta L7e por sí sola; pero ningún reglamento leído da una franquicia general de 5, 10 o 30 segundos: el ensayo del conjunto (134/2014, anexo X, ap. 2.4) mide la máxima alcanzable y su aceptación se acuerda con el servicio técnico.`,
    ref: 'Reglamento 901/2014, campo 1.8.9; 134/2014, anexo X, ap. 2.4', fuente: 'r901',
  });
  const sobre = el.modos.filter(m => m.cont > L + 1e-9);
  puntos.push({
    id: 'modos', titulo: 'Cada modo de conducción, ensayado', valor: el.modos.map(m => `${m.nombre} ${kW(m.cont)}`).join(' · '),
    estado: sobre.length ? 'no' : 'ok',
    texto: sobre.length ? `Se toma el resultado más alto de todos los modos: ${sobre.map(m => `«${m.nombre}» da ${kW(m.cont)} continuos`).join(', ')}. No sirve limitar el modo normal y dejar que el conductor elija otro que pasa del límite.${el.elegibles.length ? ` Elegibles por el conductor: ${el.elegibles.join(' y ')}.` : ''}`
      : `Todos los modos (${el.modos.map(m => m.nombre.toLowerCase()).join(', ')}) quedan en ${L} kW continuos o menos.`,
    ref: 'Reglamento 134/2014, anexo X, apéndice 2.4', fuente: 'r134anx',
  });
  if (hib && el.limCont != null && el.estrategia === 'libre') puntos.push({
    id: 'coherencia', titulo: 'El límite configurado se aplica de verdad', valor: `límite ${kW(el.limCont)} · reparto «Sin gestión»`, estado: 'no',
    texto: 'Hay un límite del conjunto, pero con el reparto «Sin gestión» nadie lo hace cumplir cuando empujan los dos: elige «Límite dinámico del conjunto», «Térmico rebajado» o «Modos separados».',
    ref: 'Reglamento 3/2014, anexo XVIII', fuente: 'r3',
  });
  // the two independent limiters: needed as soon as the hardware could give more than the limit
  const bruta = el.termicoMotor + el.elecPico, haceFalta = bruta > L + 1e-9;
  const { primero, segundo, independientes } = el.limitadores;
  puntos.push({
    id: 'limitadores', titulo: 'Dos limitadores independientes, de distinta naturaleza', valor: `1.º ${TEXTO_LIMITADOR[primero]} · 2.º ${TEXTO_LIMITADOR[segundo]}`,
    estado: !haceFalta ? 'ok' : independientes ? 'comprobar' : 'no',
    texto: !haceFalta ? `Los motores no dan más de ${L} kW ni juntos: no hace falta limitar.`
      : independientes ? 'Hay dos métodos de distinta filosofía que funcionan cada uno por su lado. Que el servicio técnico los acepte se comprueba en el ensayo 4.'
        : `Los motores pueden dar ${kW(bruta)} juntos: hacen falta dos métodos independientes (por ejemplo, el par combinado en la unidad del híbrido y, por otra vía, un recorte por la velocidad medida en la rueda). Ahora ${primero === 'ninguno' && segundo === 'ninguno' ? 'no hay ninguno' : 'solo hay uno'} (Motor › Electrónica de potencia).`,
    ref: 'Reglamento 3/2014, anexo XVIII', fuente: 'r3',
  });
  puntos.push({
    id: 'manipulacion', titulo: 'Que el límite no se pueda quitar', valor: el.elegibles.length ? `elegibles: ${el.elegibles.join(', ')}` : 'nada elegible por el conductor',
    estado: el.elegibles.length && sobre.length ? 'no' : 'comprobar',
    texto: `${el.elegibles.length && sobre.length ? 'El conductor puede elegir algo que pasa del límite. ' : ''}Hay que demostrar que no se elimina cambiando el programa, el modo o el mapa del motor, manipulando sensores ni tocando la gestión de la batería o del inversor (protección contra la manipulación, 44/2014, anexo II). Solo se puede ver en el ensayo.`,
    ref: 'Reglamento 3/2014, anexo XVIII; 44/2014, anexo II', fuente: 'r44',
  });
  // ── the scenarios of the study, with this design's numbers
  const est = (t: number): EstadoL7e => (t <= L + 1e-9 ? 'ok' : 'no');
  const escenarios: EscenarioL7e[] = hib ? [
    { nombre: 'Los dos a su potencia continua, sin gestión', termico: el.termicoMotor, electrico: el.elecCont, total: el.termicoMotor + el.elecCont, estado: est(el.termicoMotor + el.elecCont), nota: 'Escenario A del estudio: si pueden ir a la vez, esta es la continua del conjunto.' },
    { nombre: 'Térmico a tope y eléctrico en pico, sin gestión', termico: el.termicoMotor, electrico: el.elecPico, total: el.termicoMotor + el.elecPico, estado: el.termicoMotor + el.elecPico <= L + 1e-9 ? 'ok' : 'comprobar', nota: 'Escenario B: es pico, no continua; se declara y se justifica.' },
    ...el.modos.map(m => ({ nombre: `Con la electrónica configurada: modo «${m.nombre}»`, termico: m.termico, electrico: m.elecCont, total: m.cont, estado: est(m.cont), nota: `${m.texto} Pico ${kW(m.pico)}.` })),
    { nombre: 'Ejemplo del estudio: térmico reducido + eléctrico continuo', termico: Math.max(0, L - el.elecCont), electrico: Math.min(el.elecCont, L), total: Math.max(0, L - el.elecCont) + Math.min(el.elecCont, L), estado: 'ok', nota: 'Escenario C: el reparto que cabe justo (cualquier mezcla que sume 15 vale).' },
  ] : el.modos.map(m => ({ nombre: `Modo «${m.nombre}»`, termico: 0, electrico: m.elecCont, total: m.cont, estado: est(m.cont), nota: `Pico ${kW(m.pico)}.` }));
  const nNo = puntos.filter(p => p.estado === 'no').length, nC = puntos.filter(p => p.estado === 'comprobar').length;
  const resumen = nNo ? `Para L7e-A2, ${nNo} ${nNo === 1 ? 'punto no está' : 'puntos no están'} bien y ${nC} ${nC === 1 ? 'queda' : 'quedan'} por comprobar con el servicio técnico.`
    : `Para L7e-A2, nada sale mal con lo configurado; ${nC} ${nC === 1 ? 'punto queda' : 'puntos quedan'} por demostrar en los ensayos.`;
  return { puntos, escenarios, ensayos: ensayosL7e(f), resumen };
}

/** The tests, one per tab. The first four are the study's; the rest come from the requirements in normas.ts. */
export function ensayosL7e(f: FichaHomologacion): Ensayo[] {
  const el = f.electronica!, L = LIMITE_L7E, hib = el.hibrido;
  const E = (e: Omit<Ensayo, 'estado'>): Ensayo => ({ ...e, estado: 'pendiente' });
  const lista: Ensayo[] = [];
  if (hib) lista.push(E({
    id: 'termico', corto: '1 · Térmico', titulo: 'Ensayo 1: potencia neta del motor térmico', ref: 'Reglamento 134/2014, anexo X; 901/2014, campo 1.8.3', fuente: 'r134anx',
    objetivo: 'Medir la potencia neta máxima del motor de gasolina solo, con sus equipos, y confirmar la cifra declarada.',
    pasos: ['Motor en banco (o el vehículo en banco de rodillos con el eléctrico desconectado), con escape, admisión y auxiliares de serie.', 'Plena carga de ralentí a corte, por escalones de régimen.', 'Curva de par y potencia; corrección a condiciones de referencia.', 'Comparar con la declarada (tolerancia del anexo X).'],
    declarar: ['Potencia neta máxima y su régimen (campo 1.8.3).', 'Si va rebajada: cómo (mapa de inyección, mariposa) y que no se pueda quitar.'],
    valores: [['Motor de gasolina sin limitar', kW(el.termicoMotor)], ['Declarada (con la electrónica)', kW(el.termicoNeto)]],
    expectativa: el.termicoNeto <= L + 1e-9 ? { estado: 'ok', texto: `Pasaría: ${kW(el.termicoNeto)} ≤ ${L} kW.` } : { estado: 'no', texto: `No: ${kW(el.termicoNeto)} > ${L} kW.` },
  }));
  lista.push(E({
    id: 'electrico', corto: `${hib ? 2 : 1} · Eléctrico 30 min`, titulo: `Ensayo ${hib ? 2 : 1}: potencia continua de 30 minutos del motor eléctrico`, ref: 'Reglamento UN 85; 168/2013, art. 3.35; 901/2014, campo 1.8.5', fuente: 'r85',
    objetivo: 'Medir la potencia media neta que el motor eléctrico con su controlador entrega 30 minutos seguidos sin pasarse de temperatura, y la curva de par y potencia.',
    pasos: ['Motor y controlador de serie en banco dinamométrico, alimentados como en el vehículo (tensión de la batería).', 'Curva de par y potencia máximos a varios regímenes.', '30 minutos a la potencia continua declarada, a un régimen fijo; registrar temperatura del motor y del inversor.', 'La potencia media de esos 30 minutos es la continua; comprobar que no baja de la declarada.'],
    declarar: ['Potencia continua nominal (campo 1.8.5) y potencia pico con su duración.', 'Tensión de trabajo y refrigeración.'],
    valores: [['Continua (30 min)', kW(el.elecCont)], ['Pico', kW(el.elecPico)], ['Duración máxima del pico configurada', `${n0(el.picoSeg)} s`]],
    expectativa: el.elecCont <= L + 1e-9 ? { estado: 'ok', texto: `Pasaría si el motor aguanta de verdad ${kW(el.elecCont)} media hora (dato del fabricante, no medido).` } : { estado: 'no', texto: `${kW(el.elecCont)} > ${L} kW.` },
  }));
  if (hib) lista.push(E({
    id: 'conjunto', corto: '3 · Conjunto híbrido', titulo: 'Ensayo 3: potencia del conjunto híbrido, en cada modo', ref: 'Reglamento 134/2014, anexo X, apéndice 2.4; 901/2014, campos 1.8.7 y 1.8.9', fuente: 'r134anx',
    objetivo: 'El ensayo que decide: los dos motores juntos, con la batería en el estado que permite la máxima ayuda eléctrica, medir el par y la potencia totales en cada modo híbrido y quedarse con el más alto.',
    pasos: ['Vehículo en banco de rodillos (o el conjunto en banco), batería cargada al máximo.', 'Aceleración a fondo en cada modo seleccionable (y cada mapa elegible).', 'Registrar la potencia total en la rueda en el tiempo: el pico y la que se sostiene.', 'Repetir el tiempo suficiente para ver la continua total (la que queda cuando el pico se acaba).', 'El resultado más alto de todos los modos es el que cuenta. No se puede preparar el vehículo para esconder prestaciones disponibles en uso normal.'],
    declarar: ['La lista de modos y mapas, y qué limita cada uno.', 'Potencia continua total (1.8.7) y potencia pico total (1.8.9).'],
    valores: [...el.modos.map(m => [`Modo «${m.nombre}»: continua · pico`, `${kW(m.cont)} · ${kW(m.pico)}`] as [string, string]), ['Velocidad punta con los dos a la vez', f.vmaxConjunta != null ? `${n0(f.vmaxConjunta)} km/h` : 'falta el Cd del túnel']],
    expectativa: el.contTotal <= L + 1e-9 ? { estado: el.picoTotal > L + 1e-9 ? 'comprobar' : 'ok', texto: el.picoTotal > L + 1e-9 ? `Continua total ${kW(el.contTotal)}: dentro. El pico de ${kW(el.picoTotal)} se declara y su aceptación se acuerda con el servicio técnico.` : `Pasaría: ${kW(el.contTotal)} continuos y ${kW(el.picoTotal)} de pico.` }
      : { estado: 'no', texto: `No: el modo «${el.modoCont.nombre}» da ${kW(el.contTotal)} continuos.` },
  }));
  const bruta = el.termicoMotor + el.elecPico;
  lista.push(E({
    id: 'limitaciones', corto: `${hib ? 4 : 2} · Limitadores`, titulo: `Ensayo ${hib ? 4 : 2}: las limitaciones no se pueden eliminar`, ref: 'Reglamento 3/2014, anexo XVIII; 44/2014, anexo II', fuente: 'r3',
    objetivo: 'Demostrar que el límite de potencia se mantiene con cada uno de los dos métodos funcionando solo, y que no se quita cambiando el programa, el modo, el mapa, los sensores ni la gestión de batería o inversor.',
    pasos: ['Con el primer limitador anulado en banco, comprobar que el segundo solo mantiene el límite (y al revés).', 'Probar cada modo y cada mapa seleccionable.', 'Simular fallos de sensores (velocidad, vueltas, par) y ver que la potencia baja, no sube.', 'Revisar que el programa está protegido (firmas, sin acceso del usuario) y documentarlo en el expediente.'],
    declarar: ['Los dos métodos, su naturaleza y por qué son independientes.', 'La protección contra la manipulación.'],
    valores: [['Primer limitador', TEXTO_LIMITADOR[el.limitadores.primero]], ['Segundo limitador', TEXTO_LIMITADOR[el.limitadores.segundo]], ['Lo que darían los motores sin límites', kW(bruta)], ['Elegible por el conductor', el.elegibles.length ? el.elegibles.join(', ') : 'nada']],
    expectativa: bruta <= L + 1e-9 ? { estado: 'ok', texto: 'Los motores no pasan de 15 kW ni juntos: no hay nada que limitar.' }
      : el.limitadores.independientes ? { estado: 'comprobar', texto: 'Hay dos métodos independientes configurados; su aceptación se ve en el ensayo.' } : { estado: 'no', texto: 'Faltan limitadores: hacen falta dos, independientes y de distinta naturaleza.' },
  }));
  let k = lista.length;
  const sig = () => ++k;
  lista.push(E({
    id: 'vmax', corto: `${sig()} · Velocidad máxima`, titulo: `Ensayo ${k}: velocidad máxima por construcción`, ref: 'Reglamento 134/2014, anexo X', fuente: 'r134',
    objetivo: 'Medir la velocidad máxima en pista, en los dos sentidos, con el vehículo en orden de marcha y el conductor.',
    pasos: ['Pista llana, viento bajo el límite del anexo.', 'Dos pasadas en sentidos opuestos a fondo, en el modo más rápido.', 'Media de las dos.'],
    declarar: ['Velocidad máxima por construcción.'],
    valores: [['Con la potencia eléctrica (modelo)', f.vmax != null ? `${n0(f.vmax)} km/h` : 'falta el Cd'], ...(hib ? [['Con los dos motores a la vez (modelo)', f.vmaxConjunta != null ? `${n0(f.vmaxConjunta)} km/h` : 'falta el Cd'] as [string, string]] : [])],
    expectativa: { estado: 'ok', texto: 'L7e-A2 no tiene límite de velocidad: se mide y se declara.' },
  }));
  if (hib) lista.push(E({
    id: 'emisiones', corto: `${sig()} · Emisiones`, titulo: `Ensayo ${k}: emisiones de escape Euro 5, evaporación y OBD`, ref: 'Reglamento 168/2013, anexo VI; 134/2014; 44/2014, anexo XII', fuente: 'r168anx6',
    objetivo: 'Medir CO, HC, HCNM, NOx y partículas en el ciclo WMTC, la evaporación (SHED) y comprobar la diagnosis a bordo.',
    pasos: ['Banco de rodillos con el ciclo WMTC, batería en el estado que pide el procedimiento de híbridos.', 'Análisis de los gases del escape.', 'Ensayo SHED de evaporación del depósito.', 'Prueba de la diagnosis a bordo (OBD fase I).'],
    declarar: ['El motor y su homologación Euro 5 si viene de otro vehículo.', 'La estrategia de arranque del térmico (afecta al ciclo).'],
    valores: [['Motor de gasolina', kW(el.termicoNeto)], ['Arranca si la batería baja de', `${n0(el.arranque.soc)} %`], ['Calentamiento antes de plena carga', `${n0(el.arranque.calentamiento)} s`]],
    expectativa: { estado: 'comprobar', texto: 'El modelo no calcula emisiones: depende del motor elegido y de su catalizador.' },
  }));
  lista.push(E({
    id: 'ruido', corto: `${sig()} · Ruido`, titulo: `Ensayo ${k}: ruido`, ref: 'Reglamento 168/2013, anexo VI(D); Reglamento UN 9', fuente: 'r168anx6',
    objetivo: 'Medir el ruido al paso y parado: L7e hasta 80 dB(A).',
    pasos: ['Pista normalizada, micrófonos a 7,5 m.', 'Pasadas aceleradas según el procedimiento.', hib ? 'Con el térmico en marcha (forzado si hace falta).' : 'Un eléctrico: suenan la rodadura y la reductora.'],
    declarar: ['Escape y silenciador de serie.'],
    valores: [['Límite', '80 dB(A)']],
    expectativa: hib ? { estado: 'comprobar', texto: 'Depende del escape del motor de gasolina.' } : { estado: 'ok', texto: 'Eléctrico: previsiblemente muy por debajo (por medir).' },
  }));
  lista.push(E({
    id: 'frenos', corto: `${sig()} · Frenado`, titulo: `Ensayo ${k}: frenado`, ref: 'Reglamento 3/2014, anexo III; Reglamento UN 78', fuente: 'r3',
    objetivo: 'Distancias de parada, eficacia en caliente y freno de estacionamiento, con el vehículo cargado; con freno regenerativo, cómo se combina con el de fricción.',
    pasos: ['Frenadas desde la velocidad de ensayo, vacío y cargado.', 'Serie de frenadas para calentar y repetir.', 'Freno de estacionamiento en pendiente.', 'Con el regenerativo: comprobar que el freno de servicio no depende de la carga de la batería.'],
    declarar: ['El sistema de frenos y la potencia del regenerativo.'],
    valores: [['Masa máxima (modelo)', `${n0(f.masaMaxima)} kg`], ['Frenada regenerativa máxima', kW(el.regen)]],
    expectativa: { estado: 'comprobar', texto: 'Hace falta un prototipo en pista.' },
  }));
  lista.push(E({
    id: 'electrica', corto: `${sig()} · Alta tensión`, titulo: `Ensayo ${k}: seguridad eléctrica`, ref: 'Reglamento 3/2014, anexo IV; Reglamento UN 100', fuente: 'r3',
    objetivo: 'Protección contra el contacto, resistencia de aislamiento, interbloqueo y seguridad durante la carga.',
    pasos: ['Medida de la resistencia de aislamiento.', 'Protección IP de las partes con tensión.', 'Prueba del interbloqueo y de la desconexión de servicio.'],
    declarar: ['El esquema de alta tensión (Energía › Sistema eléctrico).'],
    valores: [['Potencia del controlador del motor', kW(el.elecPico)]],
    expectativa: { estado: 'comprobar', texto: 'Mejor con batería y controlador que traigan su certificado UN 100.' },
  }));
  lista.push(E({
    id: 'cem', corto: `${sig()} · CEM`, titulo: `Ensayo ${k}: compatibilidad electromagnética`, ref: 'Reglamento 44/2014, anexo VII; Reglamento UN 10', fuente: 'r44',
    objetivo: 'Que el vehículo no perturbe y no se deje perturbar: el inversor y el cargador son lo que más emite.',
    pasos: ['Emisiones radiadas en cámara anecoica.', 'Inmunidad con el vehículo en marcha (en banco).'],
    declarar: ['Los certificados UN 10 de los componentes electrónicos.'],
    valores: [['Componentes con conmutación de potencia', hib ? 'inversor, convertidor CC-CC, cargador, generador' : 'inversor, convertidor CC-CC, cargador']],
    expectativa: { estado: 'comprobar', texto: 'Ensayo en cámara (IDIADA o CTAG).' },
  }));
  return lista;
}
