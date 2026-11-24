// The favourite steering's plan (2026-11-24, Eugenio: «de ahí también se sacan los planos de la opción favorita»): a top view of
// the front end with the design's own track, the arms at the angle that gives 100 % Ackermann, the option's central part
// (the rack, or the rocker or the kart's central arm) and the tie rods, with the dimensions that follow from them. It is a
// layout drawing with its dimensions, NOT a workshop drawing: tolerances, bushings and the knuckle itself are not in it,
// and the plan says so. Downloadable as an SVG with its colours written in (a file opened outside the page has no Tailwind).
import { Download } from 'lucide-react';
import { Button } from '../../ui/core';
import { fmt } from '../controles';
import { CREMALLERA_GEMINI } from './direccion';
import { anguloBrazoAckermann, brazoNecesario } from './geometriaDireccion';
import type { OpcionRodaje } from './tipos';

const W = 680, H = 372;
const mm = (m: number) => `${Math.round(m * 1000)} mm`;

export interface CotasPlano {
  via: number; batalla: number; dentro: number;
  /** the arm's angle to the centre line (°) that makes the two arms, extended, meet on the middle of the rear axle */
  anguloBrazo: number;
  /** the arm's length (m) and whether it follows from the rack's travel or is the plan's own assumption */
  brazo: number; brazoDeLaCremallera: boolean;
  /** the tie rod's length (m), the distance between the two arm ball joints (m), and the rack's own numbers when it is one */
  barra: number; entreRotulas: number;
  cremallera: boolean;
}
export function cotasDelPlano(opcion: OpcionRodaje, via: number, batalla: number, dentro: number): CotasPlano {
  const cremallera = opcion.id === 'cremallera', anguloBrazo = anguloBrazoAckermann(batalla, via), a = anguloBrazo * Math.PI / 180;
  const calculado = cremallera ? brazoNecesario(CREMALLERA_GEMINI.recorrido / 2, dentro) : 0.12;
  const brazo = Math.min(0.22, Math.max(0.06, calculado)), semiCentro = cremallera ? CREMALLERA_GEMINI.largo / 2 : 0.08;
  const punta = via / 2 - brazo * Math.sin(a);
  return { via, batalla, dentro, anguloBrazo, brazo, brazoDeLaCremallera: cremallera && Math.abs(calculado - brazo) < 1e-9, barra: Math.hypot(Math.max(0, punta - semiCentro), 0.02), entreRotulas: 2 * punta, cremallera };
}

/** The same drawing with its styles written into the elements, as a file of its own. */
function descargarSvg(svg: SVGSVGElement, nombre: string) {
  const copia = svg.cloneNode(true) as SVGSVGElement, origen = [svg, ...svg.querySelectorAll('*')], destino = [copia, ...copia.querySelectorAll('*')];
  origen.forEach((e, i) => {
    const c = getComputedStyle(e), d = destino[i] as SVGElement;
    for (const p of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight', 'font-family', 'text-anchor']) { const v = c.getPropertyValue(p); if (v) d.style.setProperty(p, v); }
    d.removeAttribute('class');
  });
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: 'image/svg+xml' }));
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PlanoDireccion({ opcion, via, batalla, dentro, mando }: { opcion: OpcionRodaje; via: number; batalla: number; dentro: number; mando: 'manillar' | 'volante' }) {
  const c = cotasDelPlano(opcion, via, batalla, dentro), a = c.anguloBrazo * Math.PI / 180;
  const k = Math.min(260, (W - 240) / (via + 0.2)), cx = W / 2, y0 = 140;
  const X = (x: number) => cx + x * k, Y = (y: number) => y0 - y * k;
  const yR = -c.brazo * Math.cos(a), semi = c.cremallera ? CREMALLERA_GEMINI.largo / 2 : 0.08;
  const punta = (lado: 1 | -1) => ({ x: lado * (via / 2 - c.brazo * Math.sin(a)), y: yR });
  const yAbajo = Y(-0.66), yEntre = Y(-0.5);
  let svgRef: SVGSVGElement | null = null;
  const filas: [string, string][] = [
    ['Vía delantera (de centro a centro de las ruedas)', mm(via)],
    ['Distancia entre ejes', mm(batalla)],
    ['Ángulo de cada brazo con el eje del vehículo (100 % Ackermann)', `${fmt(c.anguloBrazo, 1)}°`],
    [c.brazoDeLaCremallera ? 'Longitud del brazo (la que pide el recorrido de la cremallera a ' + fmt(dentro, 0) + '°)' : 'Longitud del brazo (supuesta: aún no hay mangueta dibujada)', mm(c.brazo)],
    ['Entre las dos rótulas de los brazos', mm(c.entreRotulas)],
    ['Longitud de cada barra, de rótula a rótula (aprox.)', mm(c.barra)],
    ...(c.cremallera ? [
      ['Cremallera: largo y recorrido', `${mm(CREMALLERA_GEMINI.largo)} · ${mm(CREMALLERA_GEMINI.recorrido)} (${mm(CREMALLERA_GEMINI.recorrido / 2)} a cada lado)`] as [string, string],
      ['Cremallera: de tope a tope', `${fmt(CREMALLERA_GEMINI.vueltas, 2)} vueltas`] as [string, string],
    ] : []),
  ];
  const cabe = c.entreRotulas >= CREMALLERA_GEMINI.rotulasMin && c.entreRotulas <= CREMALLERA_GEMINI.rotulasMax;
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-slate-200"><svg ref={e => { svgRef = e; }} viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px] bg-white" role="img"
        aria-label={`Plano de la dirección ${opcion.n}, vista desde arriba, con la vía de ${mm(via)}`}>
        <rect x={0} y={0} width={W} height={H} className="fill-white" />
        <text x={14} y={22} className="fill-slate-800 text-[13px] font-semibold">Dirección: {opcion.n}</text>
        <text x={14} y={38} className="fill-slate-500 text-[11px]">vista desde arriba · delante, arriba · cotas del diseño · {mando === 'volante' ? 'con volante' : 'con manillar'}</text>
        {/* the front axle's line and the two wheels, straight */}
        <line x1={X(-via / 2 - 0.12)} x2={X(via / 2 + 0.12)} y1={Y(0)} y2={Y(0)} className="stroke-slate-300" strokeDasharray="6 4" />
        {([-1, 1] as const).map(l => (
          <g key={l}>
            <rect x={X(l * via / 2) - 0.035 * k} y={Y(0.26)} width={0.07 * k} height={0.52 * k} rx={4} className="fill-slate-200 stroke-slate-600" />
            <circle cx={X(l * via / 2)} cy={Y(0)} r={5} className="fill-white stroke-slate-800" strokeWidth={2} />
            <line x1={X(l * via / 2)} y1={Y(0)} x2={X(punta(l).x)} y2={Y(punta(l).y)} className="stroke-teal-700" strokeWidth={5} strokeLinecap="round" />
            <circle cx={X(punta(l).x)} cy={Y(punta(l).y)} r={4.5} className="fill-teal-100 stroke-teal-800" strokeWidth={2} />
            <line x1={X(punta(l).x)} y1={Y(punta(l).y)} x2={X(l * semi)} y2={Y(yR)} className="stroke-slate-700" strokeWidth={3} />
          </g>))}
        {/* the central part: the rack, or the rocker */}
        {c.cremallera
          ? <><rect x={X(-semi)} y={Y(yR) - 8} width={2 * semi * k} height={16} rx={4} className="fill-slate-100 stroke-slate-700" strokeWidth={2} /><circle cx={X(0)} cy={Y(yR)} r={9} className="fill-white stroke-slate-800" strokeWidth={2} /></>
          : <><line x1={X(-semi)} y1={Y(yR)} x2={X(semi)} y2={Y(yR)} className="stroke-slate-800" strokeWidth={7} strokeLinecap="round" /><circle cx={X(0)} cy={Y(yR)} r={7} className="fill-white stroke-slate-800" strokeWidth={2} /></>}
        <line x1={X(0)} y1={Y(yR)} x2={X(0)} y2={Y(yR - 0.14)} className="stroke-slate-500" strokeWidth={4} /><text x={X(0) + 8} y={Y(yR - 0.14) + 4} className="fill-slate-500 text-[10px]">columna, hacia el {mando === 'volante' ? 'volante' : 'manillar'}</text>
        <text x={X(0)} y={Y(yR) - 14} textAnchor="middle" className="fill-slate-700 text-[10px]">{c.cremallera ? 'cremallera' : opcion.id === 'kart' ? 'brazo central' : 'balancín'}</text>
        <text x={X((c.entreRotulas / 2 + semi) / 2)} y={Y(yR) - 8} textAnchor="middle" className="fill-slate-700 text-[10px]">barra</text>
        <text x={X(via / 2) + 0.07 * k + 8} y={Y(0.1)} className="fill-slate-700 text-[10px]">pivote</text>
        <text x={X(via / 2) + 0.07 * k + 8} y={Y(yR / 2) + 3} className="fill-teal-800 text-[10px]">brazo {mm(c.brazo)}</text>
        {/* dimensions */}
        <g className="stroke-slate-500">
          <line x1={X(-via / 2)} x2={X(via / 2)} y1={yAbajo} y2={yAbajo} />
          <line x1={X(-via / 2)} x2={X(-via / 2)} y1={Y(-0.26)} y2={yAbajo + 6} strokeDasharray="2 3" /><line x1={X(via / 2)} x2={X(via / 2)} y1={Y(-0.26)} y2={yAbajo + 6} strokeDasharray="2 3" />
        </g>
        <text x={cx} y={yAbajo - 5} textAnchor="middle" className="fill-slate-800 text-[11px] font-semibold">vía {mm(via)}</text>
        <g className="stroke-slate-500">
          <line x1={X(-c.entreRotulas / 2)} x2={X(c.entreRotulas / 2)} y1={yEntre} y2={yEntre} />
          <line x1={X(-c.entreRotulas / 2)} x2={X(-c.entreRotulas / 2)} y1={Y(yR)} y2={yEntre + 5} strokeDasharray="2 3" /><line x1={X(c.entreRotulas / 2)} x2={X(c.entreRotulas / 2)} y1={Y(yR)} y2={yEntre + 5} strokeDasharray="2 3" />
        </g>
        <text x={cx} y={yEntre - 5} textAnchor="middle" className="fill-slate-700 text-[11px]">entre rótulas {mm(c.entreRotulas)}</text>
        <text x={14} y={H - 24} className="fill-slate-400 text-[10px]">Esquema acotado, no plano de taller: faltan las tolerancias, los casquillos y la mangueta. El brazo, dibujado a escala.</text>
        <text x={14} y={H - 10} className="fill-slate-400 text-[10px]">Las ruedas, rectas; los brazos, a {fmt(c.anguloBrazo, 1)}° del eje del vehículo.</text>
      </svg></div>
      <ul className="grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
        {filas.map(([k2, v]) => <li key={k2} className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-0.5"><span className="text-slate-600">{k2}</span><span className="shrink-0 font-mono tabular-nums text-slate-900">{v}</span></li>)}
      </ul>
      {c.cremallera && (
        <p className={cabe && Math.abs(c.barra - CREMALLERA_GEMINI.barra) < 0.03 ? 'text-xs text-emerald-800' : 'text-xs text-amber-800'}>
          El paquete de Gemini abarca de {mm(CREMALLERA_GEMINI.rotulasMin)} a {mm(CREMALLERA_GEMINI.rotulasMax)} de rótula exterior a rótula exterior, con dos barras de {mm(CREMALLERA_GEMINI.barra)}.
          Con los brazos de este plano, este diseño tiene {mm(c.entreRotulas)} y pediría barras de unos {mm(c.barra)}: {cabe ? 'el ancho entra' : c.entreRotulas < CREMALLERA_GEMINI.rotulasMin ? 'el ancho queda estrecho para ese paquete' : 'el ancho queda grande para ese paquete'}
          {Math.abs(c.barra - CREMALLERA_GEMINI.barra) < 0.03 ? ' y las barras cuadran' : ' y las barras de serie no cuadran: habría que cambiarlas'}. Es una cuenta orientativa: depende de dónde anclen los brazos y de la mangueta, que aún no está dibujada.
        </p>)}
      <div>
        <Button variant="outline" onClick={() => svgRef && descargarSvg(svgRef, `plano-direccion-${opcion.id}.svg`)} className="gap-1.5 bg-white px-3 py-1.5 text-xs normal-case tracking-normal">
          <Download className="h-3.5 w-3.5" />Descargar el plano (SVG)
        </Button>
      </div>
    </figure>
  );
}
