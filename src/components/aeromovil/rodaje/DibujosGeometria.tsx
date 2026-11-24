// The steering's geometry, drawn (2026-11-24, Eugenio: «sobre todo con imágenes del tema de los ángulos … la rueda externa
// tiene que girar de forma distinta a la rueda interna, con el sistema Ackermann»). Two things:
//  - `VistaAckermann`: the top view of THIS design (its wheelbase, its front track), with a slider for the steering lock and
//    a switch between parallel steering and Ackermann. The two wheels' perpendiculars meet on the rear axle's line when the
//    outer wheel turns less than the inner one; with parallel steering they do not, and one tyre has to skid sideways;
//  - `DibujoConcepto`: a small original drawing for each angle of the study (caster, kingpin, scrub radius, toe, camber, bump
//    steer), drawn here for this screen: schematic and not to scale.
// Colours are Tailwind classes on the SVG parts (never a hex colour in a page).
import { useState } from 'react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { fmt } from '../controles';
import { circuloDeGiro, errorParalelo, fueraIdeal } from './geometriaDireccion';
import type { IdConcepto } from './direccion';

const RAD = Math.PI / 180;

// ---------------------------------------------------------------- the top view of this design
const W = 680;
export function VistaAckermann({ batalla, via, viaTras, maximo, inicial }: {
  /** wheelbase and front track of the design (m); the rear track (m); the largest lock the design offers (°) and the one it asks for (°) */
  batalla: number; via: number; viaTras: number; maximo: number; inicial: number;
}) {
  const ang0 = Math.min(Math.round(maximo), Math.max(5, Math.round(inicial)));
  const [dentro, setDentro] = useState(ang0);
  const [paralelo, setParalelo] = useState(false);
  const ideal = fueraIdeal(dentro, batalla, via), fuera = paralelo ? dentro : ideal, falta = errorParalelo(dentro, batalla, via);
  const cir = circuloDeGiro(dentro, batalla, via);
  // The picture is seen from above with the vehicle heading UP and the centre of the turn out to the LEFT, on the rear axle's line. The scale is fixed by
  // the lock the design asks for, so that centre is in the picture there; at smaller locks it moves off to the left (the text says where it is).
  const zc0 = Math.min(9, via / 2 + batalla / Math.tan(ang0 * RAD)), derecha = via / 2 + 0.95, izquierda = 0.55;
  const k = Math.min(140, 400 / (batalla + 0.9), (W - 30) / (zc0 + derecha + izquierda));
  const x0 = W - 15 - derecha * k, y0 = 58, H = Math.round(y0 + (batalla + 0.6) * k);
  const X = (z: number) => x0 - z * k, Y = (x: number) => y0 - x * k;
  // a front wheel at (x = 0, z) turned `giro`° to the left: the line its axle lies on reaches the rear axle's line, x = −batalla, at z + batalla / tan(giro)
  const zPerp = (z: number, giro: number) => z + batalla / Math.tan(giro * RAD);
  const zDentro = zPerp(via / 2, dentro), zFuera = zPerp(-via / 2, fuera), zc = zDentro + 0;   // zc: the centre when both agree (Ackermann)
  const rueda = (x: number, z: number, giro: number, clave: string, color: string) => (
    <g key={clave} transform={`translate(${X(z)} ${Y(x)}) rotate(${-giro})`}>
      <rect x={-Math.max(2.5, 0.045 * k)} y={-0.26 * k} width={Math.max(5, 0.09 * k)} height={0.52 * k} rx={2.5} className={color} />
    </g>);
  const perpendicular = (z: number, zFin: number, clave: string, color: string) => <line key={clave} x1={X(z)} y1={Y(0)} x2={X(zFin)} y2={Y(-batalla)} className={color} strokeDasharray="5 4" />;
  const ancho = Math.max(via, viaTras), radioFuera = Math.hypot(zc + via / 2, batalla), enCuadro = (z: number) => X(z) > 6 && X(z) < W - 6;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white" role="img"
        aria-label={`Visto desde arriba, el vehículo girando: la rueda de dentro a ${fmt(dentro, 1)}° y la de fuera a ${fmt(fuera, 1)}°`}>
        <text x={12} y={20} className="fill-slate-600 text-[11px] font-medium">Visto desde arriba · el vehículo va hacia arriba · {paralelo ? 'las dos ruedas giran igual' : 'dirección Ackermann'}</text>
        {/* the circle the outer front wheel draws, and the centre of the turn */}
        {!paralelo && radioFuera * k < 3000 && <circle cx={X(zc)} cy={Y(-batalla)} r={radioFuera * k} className="fill-none stroke-teal-200" strokeWidth={1.5} strokeDasharray="3 5" />}
        {/* the body (a schematic outline) and the two axles */}
        <rect x={X(ancho / 2 - 0.05)} y={Y(0.4)} width={(ancho - 0.1) * k} height={(batalla + 0.7) * k} rx={0.3 * k} className="fill-slate-50 stroke-slate-300" />
        <line x1={X(viaTras / 2)} x2={X(-viaTras / 2)} y1={Y(-batalla)} y2={Y(-batalla)} className="stroke-slate-400" strokeWidth={2} />
        <line x1={X(via / 2)} x2={X(-via / 2)} y1={Y(0)} y2={Y(0)} className="stroke-slate-400" strokeWidth={2} />
        {/* the rear axle's line, reaching out to the left towards the centre of the turn */}
        <line x1={X(-via / 2 - 0.4)} x2={Math.max(X(zDentro), -50)} y1={Y(-batalla)} y2={Y(-batalla)} className="stroke-teal-600" strokeWidth={1.5} />
        {perpendicular(via / 2, zDentro, 'pd', 'stroke-slate-500')}
        {perpendicular(-via / 2, zFuera, 'pf', paralelo ? 'stroke-red-500' : 'stroke-slate-500')}
        {rueda(-batalla, viaTras / 2, 0, 'td', 'fill-slate-700')}{rueda(-batalla, -viaTras / 2, 0, 'ti', 'fill-slate-700')}
        {rueda(0, via / 2, dentro, 'fd', 'fill-teal-700')}{rueda(0, -via / 2, fuera, 'fi', paralelo ? 'fill-red-600' : 'fill-teal-700')}
        {/* where each perpendicular reaches the rear axle's line: one point with Ackermann, two with the wheels turned the same */}
        {enCuadro(zDentro) && <circle cx={X(zDentro)} cy={Y(-batalla)} r={5.5} className={paralelo ? 'fill-white stroke-slate-700' : 'fill-teal-500 stroke-teal-800'} strokeWidth={2} />}
        {paralelo && enCuadro(zFuera) && <circle cx={X(zFuera)} cy={Y(-batalla)} r={5.5} className="fill-red-500 stroke-red-700" strokeWidth={2} />}
        {!paralelo && enCuadro(zc) && <text x={X(zc)} y={Y(-batalla) + 20} textAnchor="middle" className="fill-teal-800 text-[11px] font-medium">centro de giro</text>}
        <text x={X(via / 2) - 0.32 * k} y={Y(0) - 0.12 * k} textAnchor="end" className="fill-slate-800 text-[12px] font-semibold">dentro {fmt(dentro, 1)}°</text>
        <text x={X(-via / 2) + 0.32 * k} y={Y(0) - 0.12 * k} className={cn('text-[12px] font-semibold', paralelo ? 'fill-red-700' : 'fill-teal-800')}>fuera {fmt(fuera, 1)}°</text>
        <text x={X(-via / 2 - 0.4) + 6} y={Y(-batalla) + 4} className="fill-teal-700 text-[10px]">eje trasero</text>
        <text x={12} y={H - 8} className="fill-slate-400 text-[10px]">Ruedas y ejes a escala; la carrocería es un esquema.</text>
      </svg>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          <span>Giro de la rueda de dentro: <span className="font-mono font-semibold text-slate-900">{fmt(dentro, 0)}°</span></span>
          <input type="range" min={5} max={Math.max(6, Math.round(maximo))} step={1} value={dentro} onChange={e => setDentro(Number(e.target.value))} className="w-full accent-teal-700" aria-label="Giro de la rueda de dentro, en grados" />
        </label>
        <div className="flex gap-1">
          <Button variant="outline" aria-pressed={!paralelo} onClick={() => setParalelo(false)} className={cn('px-2 py-1 text-[11px] normal-case tracking-normal', !paralelo && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>Ackermann</Button>
          <Button variant="outline" aria-pressed={paralelo} onClick={() => setParalelo(true)} className={cn('px-2 py-1 text-[11px] normal-case tracking-normal', paralelo && 'border-red-700 bg-red-700 text-white hover:bg-red-800')}>Las dos igual</Button>
        </div>
      </div>
      <figcaption className="text-xs leading-relaxed text-slate-600">
        {paralelo
          ? <>Con las dos ruedas giradas lo mismo, sus rayas (las perpendiculares a cada rueda) son <strong>paralelas</strong>: no se cortan en ningún sitio. No hay un único centro de giro, así que una de las dos ruedas tiene que patinar de lado en cada curva. La de fuera debería girar <strong>{fmt(falta, 1)}°</strong> menos.</>
          : <>La rueda de dentro gira <strong>{fmt(dentro, 1)}°</strong> y la de fuera <strong>{fmt(ideal, 1)}°</strong>: <strong>{fmt(falta, 1)}°</strong> menos. Así las dos rayas se cortan en un único punto del eje trasero y las dos ruedas ruedan sin patinar.</>}
        {cir && !paralelo && <> Con este giro, el centro de la curva queda a {fmt(cir.centroEje, 1)} m de la línea central del vehículo y la rueda de fuera dibuja un círculo de {fmt(cir.diametro, 1)} m de diámetro.</>}
        {' '}Este dibujo usa la batalla ({fmt(batalla, 2)} m) y la vía delantera ({fmt(via, 2)} m) del diseño.
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- the study's angles, one small drawing each
// (320 × 170 each; the text is anchored so that nothing leaves the frame)
const T = 'fill-slate-500 text-[10px]', ETIQ = 'fill-teal-800 text-[11px] font-semibold';
function Marco({ children, alt }: { children: React.ReactNode; alt: string }) {
  return <svg viewBox="0 0 320 170" className="w-full max-w-[380px] rounded-md border border-slate-200 bg-white" role="img" aria-label={alt}>{children}</svg>;
}
function Flecha({ x1, y1, x2, y2, clase = 'stroke-slate-500' }: { x1: number; y1: number; x2: number; y2: number; clase?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1), p = (d: number) => `${x2 - 7 * Math.cos(a + d)},${y2 - 7 * Math.sin(a + d)}`;
  return <g className={clase}><line x1={x1} y1={y1} x2={x2} y2={y2} /><polyline points={`${p(0.45)} ${x2},${y2} ${p(-0.45)}`} className="fill-none" /></g>;
}
/** An arc of the circle of centre (cx, cy) and radius r, from height y1 to height y2, on the side of smaller x (the part that bulges to the left). */
const arco = (cx: number, cy: number, r: number, y1: number, y2: number) => `M ${(cx - Math.sqrt(r * r - (y1 - cy) ** 2)).toFixed(1)} ${y1} A ${r} ${r} 0 0 0 ${(cx - Math.sqrt(r * r - (y2 - cy) ** 2)).toFixed(1)} ${y2}`;
const Rueda = ({ x, y, g, w = 12, h = 80, clase = 'fill-teal-700' }: { x: number; y: number; g: number; w?: number; h?: number; clase?: string }) => <g transform={`translate(${x} ${y}) rotate(${g})`}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={3} className={clase} /></g>;
export function DibujoConcepto({ id }: { id: IdConcepto }) {
  switch (id) {
    case 'ackermann': return (
      <Marco alt="Visto desde arriba: dos ruedas delanteras giradas distinto, con las perpendiculares a cada una cortándose en un punto del eje trasero">
        <text x={12} y={20} className={ETIQ}>La de dentro gira más que la de fuera</text>
        <line x1={20} x2={305} y1={140} y2={140} className="stroke-teal-600" strokeWidth={1.5} /><text x={305} y={158} textAnchor="end" className={T}>línea del eje trasero</text>
        <line x1={200} y1={42} x2={40} y2={140} className="stroke-slate-400" strokeDasharray="4 3" /><line x1={270} y1={42} x2={40} y2={140} className="stroke-slate-400" strokeDasharray="4 3" />
        <circle cx={40} cy={140} r={5} className="fill-teal-500 stroke-teal-800" strokeWidth={2} /><text x={40} y={158} textAnchor="middle" className={T}>centro del giro</text>
        <Rueda x={200} y={42} g={-32} w={9} h={46} /><Rueda x={270} y={42} g={-23.5} w={9} h={46} />
        <text x={188} y={70} textAnchor="end" className={T}>32°</text><text x={282} y={70} className={T}>24°</text>
        <text x={160} y={90} textAnchor="middle" className="fill-slate-500 text-[10px]">las perpendiculares se cortan en un punto</text>
      </Marco>);
    case 'avance': return (
      <Marco alt="Vista lateral: el pivote de la rueda inclinado hacia atrás, que toca el suelo delante de la huella del neumático">
        <text x={12} y={20} className={T}>visto de lado</text>
        <line x1={10} x2={310} y1={135} y2={135} className="stroke-slate-400" />
        <circle cx={150} cy={85} r={50} className="fill-white stroke-slate-600" strokeWidth={2} /><circle cx={150} cy={85} r={4} className="fill-slate-600" />
        <line x1={146} y1={12} x2={176} y2={135} className="stroke-teal-700" strokeWidth={2.5} strokeDasharray="7 4" />
        <circle cx={150} cy={135} r={4} className="fill-slate-800" /><circle cx={176} cy={135} r={4} className="fill-teal-700" />
        <line x1={150} x2={176} y1={147} y2={147} className="stroke-slate-500" /><text x={184} y={151} className={ETIQ}>avance</text>
        <text x={158} y={26} className={ETIQ}>eje del pivote</text>
        <Flecha x1={240} y1={110} x2={298} y2={110} /><text x={240} y={102} className={T}>marcha</text>
      </Marco>);
    case 'pivote': return (
      <Marco alt="Vista frontal: el eje del pivote inclinado hacia dentro por arriba">
        <line x1={10} x2={310} y1={140} y2={140} className="stroke-slate-400" />
        <rect x={114} y={40} width={26} height={100} rx={7} className="fill-white stroke-slate-600" strokeWidth={2} />
        <line x1={127} y1={14} x2={127} y2={140} className="stroke-slate-300" strokeDasharray="2 3" />
        <line x1={157} y1={14} x2={127} y2={140} className="stroke-teal-700" strokeWidth={2.5} strokeDasharray="7 4" />
        <text x={176} y={36} className={ETIQ}>inclinación del pivote</text><text x={176} y={50} className={T}>(KPI): por arriba, el eje</text><text x={176} y={62} className={T}>se inclina hacia dentro</text>
        <line x1={296} y1={14} x2={296} y2={140} className="stroke-slate-300" strokeDasharray="4 3" /><text x={290} y={158} textAnchor="end" className={T}>centro del vehículo →</text>
      </Marco>);
    case 'pivotamiento': return (
      <Marco alt="Vista frontal: la distancia en el suelo entre el punto donde el pivote lo toca y el centro de la huella">
        <line x1={10} x2={310} y1={140} y2={140} className="stroke-slate-400" />
        <rect x={100} y={50} width={26} height={90} rx={7} className="fill-white stroke-slate-600" strokeWidth={2} />
        <line x1={168} y1={14} x2={142} y2={140} className="stroke-teal-700" strokeWidth={2.5} strokeDasharray="7 4" />
        <circle cx={113} cy={140} r={4} className="fill-slate-800" /><circle cx={142} cy={140} r={4} className="fill-teal-700" />
        <line x1={113} x2={142} y1={151} y2={151} className="stroke-slate-500" /><text x={150} y={155} className={ETIQ}>radio de pivotamiento</text>
        <text x={310} y={34} textAnchor="end" className={T}>el pivote toca el suelo aquí</text>
        <text x={12} y={96} className={T}>centro de la huella</text><line x1={60} y1={102} x2={110} y2={136} className="stroke-slate-300" />
      </Marco>);
    case 'convergencia': return (
      <Marco alt="Visto desde arriba: las dos ruedas delanteras apuntan un poco una hacia la otra">
        <text x={12} y={20} className={T}>visto desde arriba, exagerado</text>
        <line x1={100} y1={28} x2={100} y2={142} className="stroke-slate-300" strokeDasharray="3 3" /><line x1={220} y1={28} x2={220} y2={142} className="stroke-slate-300" strokeDasharray="3 3" />
        <Rueda x={100} y={85} g={8} w={12} h={80} /><Rueda x={220} y={85} g={-8} w={12} h={80} />
        <line x1={106} x2={214} y1={40} y2={40} className="stroke-slate-500" /><text x={160} y={34} textAnchor="middle" className={T}>delante: B</text>
        <line x1={94} x2={226} y1={132} y2={132} className="stroke-slate-500" /><text x={160} y={148} textAnchor="middle" className={T}>detrás: A</text>
        <text x={160} y={166} textAnchor="middle" className={ETIQ}>convergencia = A − B</text>
        <Flecha x1={40} y1={110} x2={40} y2={56} /><text x={48} y={86} className={T}>marcha</text>
      </Marco>);
    case 'caida': return (
      <Marco alt="Vista frontal: las ruedas inclinadas, con la parte de arriba hacia dentro">
        <text x={160} y={20} textAnchor="middle" className={ETIQ}>caída negativa: arriba, hacia dentro</text>
        <line x1={10} x2={310} y1={140} y2={140} className="stroke-slate-400" />
        <line x1={105} y1={30} x2={105} y2={140} className="stroke-slate-300" strokeDasharray="3 3" /><line x1={215} y1={30} x2={215} y2={140} className="stroke-slate-300" strokeDasharray="3 3" />
        <g transform="translate(105 140) rotate(8)"><rect x={-13} y={-105} width={26} height={105} rx={7} className="fill-white stroke-slate-600" strokeWidth={2} /></g>
        <g transform="translate(215 140) rotate(-8)"><rect x={-13} y={-105} width={26} height={105} rx={7} className="fill-white stroke-slate-600" strokeWidth={2} /></g>
        <text x={12} y={162} className={T}>visto de frente, exagerado</text>
      </Marco>);
    case 'bump': return (
      <Marco alt="Visto de frente: el arco del brazo de suspensión y el arco de la bieleta de dirección no coinciden">
        <rect x={250} y={28} width={56} height={118} className="fill-slate-100 stroke-slate-300" /><text x={278} y={160} textAnchor="middle" className={T}>chasis</text>
        <rect x={84} y={60} width={26} height={80} rx={7} className="fill-white stroke-slate-500" strokeWidth={2} />
        <line x1={250} y1={134} x2={100} y2={118} className="stroke-slate-500" strokeWidth={2.5} /><line x1={250} y1={50} x2={100} y2={82} className="stroke-slate-400" strokeWidth={2} />
        <path d={arco(250, 134, 150.9, 92, 144)} className="fill-none stroke-teal-700" strokeWidth={2.5} /><path d={arco(250, 50, 153.4, 56, 108)} className="fill-none stroke-red-500" strokeWidth={2.5} strokeDasharray="5 3" />
        <circle cx={100} cy={118} r={4} className="fill-teal-700" /><circle cx={100} cy={82} r={4} className="fill-red-500" />
        <text x={240} y={160} textAnchor="end" className="fill-teal-800 text-[10px]">arco del brazo de suspensión</text><text x={114} y={46} className="fill-red-700 text-[10px]">arco de la bieleta de dirección</text>
        <text x={12} y={20} className={ETIQ}>si los arcos no coinciden, el bache gira la rueda</text>
      </Marco>);
  }
}
