/**
 * The «Modelo comercial» pickers of the Bala's Motor tab (2026-11-16): one selector per kind of part, with the
 * part's published figures and a link to where they were read. Data and checks: catalogoTren.ts.
 * The page passes its own `Selector` in (as LadoBasculante takes its primitives), so the look stays the page's.
 */
import { ExternalLink } from 'lucide-react';
import type { ComponentType } from 'react';
import {
  A_MEDIDA, OPCIONES_CONTROLADOR, OPCIONES_MOTOR, OPCIONES_REDUCTORA, OPCIONES_TERMICO,
  controladorDe, motorDe, reductoraDe, rendimientoTermico, termicoDe,
} from './catalogoTren';

export type TipoCatalogo = 'motor' | 'controlador' | 'reductora' | 'termico';
type SelectorUI = ComponentType<{ id: string; etiqueta: string; valor: string; opciones: { k: string; n: string }[]; alCambiar: (v: string) => void; clave?: string }>;

const ETIQUETA: Record<TipoCatalogo, string> = {
  motor: 'Motor eléctrico: modelo comercial', controlador: 'Controlador: modelo comercial',
  reductora: 'Reductora o engranaje: modelo comercial', termico: 'Motor de gasolina: modelo comercial',
};
const OPCIONES: Record<TipoCatalogo, { k: string; n: string }[]> = { motor: OPCIONES_MOTOR, controlador: OPCIONES_CONTROLADOR, reductora: OPCIONES_REDUCTORA, termico: OPCIONES_TERMICO };

const num = (v: number | null | undefined, u: string, d = 1) => v == null ? null : `${v.toLocaleString('es-ES', { maximumFractionDigits: d })} ${u}`;
const rango = (a: number | null, b: number | null, u: string) => a == null && b == null ? null : a != null && b != null ? `${a}–${b} ${u}` : `${a ?? b} ${u}`;

/** What the car asks, from the page's energy figures (null while the tunnel computes the Cd). */
export interface Necesidad {
  /** km/h of the «Velocidad de cálculo» slider, and the power (kW) the car needs there, at the battery */
  vel: number; kWVel: number | null;
  /** the top speed the peak power gives (km/h) */
  vmaxPico: number | null;
  /** with the hybrid: the power the engine must give to hold `vel` on petrol alone (kW) */
  kWTermicoVel?: number | null;
  /** how many hub motors share the power */
  motores: 1 | 2;
}

/** One picker and, when a part is chosen, its card. */
const CLAVE: Record<TipoCatalogo, string> = { motor: 'tCatMotor', controlador: 'tCatCtrl', reductora: 'tCatReductora', termico: 'tCatTermico' };

export function CatalogoPieza({ tipo, valor, alCambiar, Selector, necesidad }: {
  tipo: TipoCatalogo; valor: string | undefined; alCambiar: (id: string) => void; Selector: SelectorUI; necesidad: Necesidad;
}) {
  const v = valor ?? A_MEDIDA;
  return (
    <div className="flex flex-col gap-1.5">
      <Selector id={`cat-${tipo}`} etiqueta={ETIQUETA[tipo]} valor={v} clave={CLAVE[tipo]} opciones={OPCIONES[tipo]} alCambiar={alCambiar} />
      {v !== A_MEDIDA && <Ficha tipo={tipo} id={v} necesidad={necesidad} />}
    </div>
  );
}

function Ficha({ tipo, id, necesidad: n }: { tipo: TipoCatalogo; id: string; necesidad: Necesidad }) {
  let filas: [string, string | null][] = [], fuente = '', leido = '', notas: string | undefined, deFabricante = true, titulo = '';
  const checks: { ok: boolean; texto: string }[] = [];
  if (tipo === 'motor') {
    const m = motorDe(id); if (!m) return null;
    titulo = `${m.marca} ${m.modelo}`; fuente = m.fuente; leido = m.leido; notas = m.notas; deFabricante = m.tipoFuente === 'fabricante';
    filas = [
      ['Tipo', `${m.montaje === 'buje' ? 'motor de buje (dentro de la rueda)' : 'motor central (con reductora a la rueda)'} · ${m.tecnologia}`],
      ['Tensión', m.vNom != null ? `${m.vNom} V${m.vMin != null || m.vMax != null ? ` (${rango(m.vMin, m.vMax, 'V')})` : ''}` : rango(m.vMin, m.vMax, 'V')],
      ['Potencia continua · pico', `${num(m.kWCont, 'kW') ?? 'no publicada'} · ${num(m.kWPico, 'kW') ?? 'no publicado'}`],
      ['Par continuo · pico', `${num(m.nmCont, 'N·m', 0) ?? 'no publicado'} · ${num(m.nmPico, 'N·m', 0) ?? 'no publicado'}`],
      ['Revoluciones máximas', m.rpmMax != null ? `${m.rpmMax.toLocaleString('es-ES')} rpm${m.reduccion ? ` (con su reductora 1:${m.reduccion.toLocaleString('es-ES')})` : ''}` : null],
      ['Masa', m.kg != null ? `${num(m.kg, 'kg')}${m.montaje === 'buje' && n.motores === 2 ? ' cada uno (dos motores)' : ''}` : null],
      ['Refrigeración', m.refrigeracion],
    ];
    const kWCont = m.kWCont != null ? m.kWCont * (m.montaje === 'buje' ? n.motores : 1) : null;
    if (kWCont != null && n.kWVel != null) checks.push({ ok: kWCont >= n.kWVel, texto: `A ${Math.round(n.vel)} km/h el coche pide ${num(n.kWVel, 'kW')}; ${m.montaje === 'buje' && n.motores === 2 ? 'los dos motores dan' : 'el motor da'} ${num(kWCont, 'kW')} continuos` });
    if (m.kWPico != null && n.vmaxPico != null) checks.push({ ok: n.vmaxPico >= n.vel, texto: `Con su pico, ${num(m.kWPico * (m.montaje === 'buje' ? n.motores : 1), 'kW')}, llega a unos ${Math.round(n.vmaxPico)} km/h` });
    if (m.montaje === 'central') checks.push({ ok: true, texto: 'El dibujo 3D sigue mostrando un motor de buje: el motor central aún no se dibuja ni se comprueba que quepa.' });
  } else if (tipo === 'controlador') {
    const c = controladorDe(id); if (!c) return null;
    titulo = `${c.marca} ${c.modelo}`; fuente = c.fuente; leido = c.leido; notas = c.notas; deFabricante = c.tipoFuente === 'fabricante';
    filas = [
      ['Tensión de batería', c.vNom != null ? `${c.vNom} V${c.vMin != null || c.vMax != null ? ` (${rango(c.vMin, c.vMax, 'V')})` : ''}` : null],
      [c.corriente === 'bateria' ? 'Corriente de batería, pico' : c.corriente === 'fase' ? 'Corriente al motor, pico' : 'Corriente de pico', c.aPico != null ? `${c.aPico} A, ${c.aPicoTiempo}` : null],
      ['Corriente de batería máxima', c.aBat != null ? `${c.aBat} A` : null],
      ['Corriente continua', c.aCont != null ? `${c.aCont} A` : null],
      ['Masa', num(c.kg, 'kg', 2)],
    ];
  } else if (tipo === 'reductora') {
    const r = reductoraDe(id); if (!r) return null;
    titulo = `${r.marca} ${r.modelo}`; fuente = r.fuente; leido = r.leido; notas = r.notas; deFabricante = r.tipoFuente === 'fabricante';
    filas = [
      ['Tipo', r.tipo === 'planetaria' ? 'engranaje planetario, una etapa' : 'reductora con diferencial'],
      ['Relación', `${r.relacion.toLocaleString('es-ES')} : 1`],
      ['Par de salida: nominal · máximo', `${num(r.nmSalida, 'N·m', 0) ?? 'no publicado'} · ${num(r.nmSalidaMax, 'N·m', 0) ?? 'no publicado'}`],
      ['Par de entrada máximo', num(r.nmEntradaMax, 'N·m', 0)],
      ['Revoluciones de entrada máximas', r.rpmEntradaMax != null ? `${r.rpmEntradaMax.toLocaleString('es-ES')} rpm` : null],
      ['Rendimiento', num(r.rendimiento, '%', 0)],
      ['Masa', num(r.kg, 'kg', 2)],
    ];
  } else {
    const t = termicoDe(id); if (!t) return null;
    titulo = `${t.marca} ${t.modelo}`; fuente = t.fuente; leido = t.leido; notas = t.notas; deFabricante = t.tipoFuente === 'fabricante';
    const rend = rendimientoTermico(t);
    filas = [
      ['Cilindrada · cilindros', `${t.cc != null ? `${t.cc.toLocaleString('es-ES')} cm³` : 'no publicada'} · ${t.cilindros}`],
      ['Ciclo · refrigeración', `${t.ciclo} · ${t.refrigeracion}`],
      [`Potencia ${t.potencia}`, `${num(t.kW, 'kW')}${t.rpm != null ? ` a ${t.rpm.toLocaleString('es-ES')} rpm` : ''}`],
      ['Potencia continua', num(t.kWCont, 'kW')],
      ['Par máximo', num(t.nm, 'N·m')],
      ['Masa', num(t.kg, 'kg')],
      ['Consumo publicado', t.consumoLh != null ? `${num(t.consumoLh, 'L/h')} a ${num(t.consumoKW, 'kW')}` : null],
      ['Rendimiento (de su consumo)', rend != null ? `${num(rend, '%')} (calculado con 8,9 kWh por litro)` : null],
    ];
    const kW = t.kWCont ?? t.kW;
    if (n.kWTermicoVel != null) checks.push({ ok: kW >= n.kWTermicoVel, texto: `Para ir a ${Math.round(n.vel)} km/h solo con gasolina hacen falta ${num(n.kWTermicoVel, 'kW')} del motor; da ${num(kW, 'kW')} ${t.kWCont != null ? 'continuos' : `(${t.potencia})`}` });
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[12px]">
      <p className="font-semibold text-slate-800">{titulo}</p>
      <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5">
        {filas.map(([a, b]) => <div key={a} className="contents"><dt className="text-slate-600">{a}</dt><dd className={b == null ? 'text-right text-slate-400' : 'text-right font-mono tabular-nums text-slate-800'}>{b ?? 'no publicado'}</dd></div>)}
      </dl>
      {checks.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {checks.map(c => <li key={c.texto} className={c.ok ? 'text-emerald-800' : 'text-amber-800'}>{c.ok ? '✓' : '✗'} {c.texto}</li>)}
        </ul>
      )}
      {notas && <p className="mt-1.5 leading-snug text-slate-500">{notas}</p>}
      <a href={fuente} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-teal-800 underline decoration-dotted underline-offset-2 hover:text-teal-900">
        <ExternalLink className="h-3 w-3" />{deFabricante ? 'Ficha del fabricante' : 'Ficha del vendedor'} · leída el {leido.split('-').reverse().join('/')}
      </a>
    </div>
  );
}
