// The 2D scheme Eugenio asked for: every element, with arrows showing where
// the money goes, how it is split and what comes back. Read left to right:
// 1 every payment → 2 the payment system sets its tier aside (0, 20 or 40 %) →
// 3 the open common fund splits it in eighths → 4 each scale, in thirds, gives
// back services; and the loop at the bottom: services go back to people,
// people vote the priorities.
import { useEffect, useState } from 'react';
import {
  ESCALAS, type EscalaId, type Modo, cuentasPais, euros, millones,
} from '../../data/modeloSocioeconomico';
import { Libre } from './piezas';

const W = 1120, H = 784;
const PAGO_X = 24, PAGO_W = 232, PAGO_H = 66;
const PAS_X = 322, PAS_Y = 150, PAS_W = 190, PAS_H = 200;
const FON_X = 570, FON_W = 46, FON_Y = 70, FON_H = 628;
const NIV_X = 700, NIV_W = 232, NIV_H = 66, NIV_Y0 = 70, NIV_PASO = 80;
const ESPINA_X = 946, VUELVE_X = 962;
const PERS_Y = 500;

const nivelY = (i: number) => NIV_Y0 + i * NIV_PASO;

/** Splits a text into lines of about `max` characters, on spaces. */
function lineas(t: string, max: number) {
  const out: string[] = [];
  let l = '';
  for (const p of t.split(' ')) {
    if ((l + ' ' + p).trim().length > max && l) { out.push(l); l = p; } else l = (l + ' ' + p).trim();
  }
  if (l) out.push(l);
  return out;
}

function usePocoMovimiento() {
  const [poco, setPoco] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPoco(m.matches);
    const f = () => setPoco(m.matches);
    m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return poco;
}

export function EsquemaFlujos({ modo, activa, onActiva, mover }: {
  modo: Modo; activa: EscalaId | null; onActiva: (e: EscalaId | null) => void; mover: boolean;
}) {
  const pais = cuentasPais(modo);
  const poco = usePocoMovimiento();
  const animar = mover && !poco;

  const pagos = [
    { id: 'sueldo', t: 'Una empresa paga un sueldo', s: 'pequeña 0, mediana 20, grande 40 %' },
    { id: 'compra', t: 'Alguien compra algo', s: 'tramo 1: 0 %, 2: 20 %, 3: 40 %' },
    { id: 'vivienda', t: 'Se vende una vivienda', s: 'la habitual 0 %, otra 20 %' },
    {
      id: 'empresas', t: 'Una empresa compra a otra',
      s: modo === 'eslabon' ? 'paga y lo recupera al vender' : 'el 20 % general se queda',
      tenue: modo === 'eslabon',
    },
  ];
  const yPago = (i: number) => 90 + i * 86;
  const entradaPas = (i: number) => PAS_Y + 40 + i * 40;

  const nivel = (id: EscalaId) => !activa || activa === id;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[820px] font-[inherit]" role="img"
      aria-label="Esquema: cada pago aporta su tramo (0, 20 o 40 %) al sistema de pago, que lo pasa al fondo común; el fondo da un octavo a cada una de las ocho escalas; cada escala reparte lo suyo en tres tercios (producir, cuidar y libre) y devuelve servicios a las personas; las personas votan las prioridades de cada escala.">
      <defs>
        <marker id="ms-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-slate-500" />
        </marker>
        <marker id="ms-flecha-oscura" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-slate-900" />
        </marker>
      </defs>

      {/* Column headings: a real sequence, so they are numbered. */}
      {[
        { x: PAGO_X, n: 1, t: 'Cada pago' },
        { x: PAS_X, n: 2, t: 'El sistema de pago' },
        { x: FON_X - 6, n: 3, t: 'El reparto' },
        { x: NIV_X, n: 4, t: 'Las ocho escalas' },
        { x: VUELVE_X, n: 5, t: 'Lo que devuelven' },
      ].map(h => (
        <g key={h.n} transform={`translate(${h.x} 34)`}>
          {h.n === 4 && <text x={27} y={19} fontSize={11.5} className="fill-slate-600">cada una en tercios: producir, cuidar, libre</text>}
          <circle cx={10} cy={-5} r={10} className="fill-slate-900" />
          <text x={10} y={-1} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-white">{h.n}</text>
          <text x={27} y={0} fontSize={14} fontWeight={700} className="fill-slate-900">{h.t}</text>
        </g>
      ))}

      {/* 1 · Payments, and their arrows into the payment system */}
      {pagos.map((p, i) => {
        const y = yPago(i), yc = y + PAGO_H / 2, yt = entradaPas(i);
        const d = `M ${PAGO_X + PAGO_W} ${yc} C ${PAGO_X + PAGO_W + 36} ${yc}, ${PAS_X - 36} ${yt}, ${PAS_X - 2} ${yt}`;
        return (
          <g key={p.id} style={{ opacity: p.tenue ? 0.62 : 1 }}>
            <rect x={PAGO_X} y={y} width={PAGO_W} height={PAGO_H} rx={12} className="fill-white stroke-slate-300" strokeDasharray={p.tenue ? '5 4' : undefined} />
            <text x={PAGO_X + 16} y={y + 28} fontSize={14} fontWeight={650} className="fill-slate-900">{p.t}</text>
            <text x={PAGO_X + 16} y={y + 47} fontSize={12} className="fill-slate-600">{p.s}</text>
            <path id={`ms-pago-${i}`} d={d} fill="none" className="stroke-slate-500" strokeWidth={1.6} strokeDasharray={p.tenue ? '5 4' : undefined} markerEnd="url(#ms-flecha)" />
            {animar && !p.tenue && (
              <circle r={3.5} className="fill-slate-900">
                <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${i * 0.45}s`}><mpath href={`#ms-pago-${i}`} /></animateMotion>
              </circle>
            )}
          </g>
        );
      })}

      {/* 2 · The payment system */}
      <rect x={PAS_X} y={PAS_Y} width={PAS_W} height={PAS_H} rx={16} className="fill-slate-900" />
      <text x={PAS_X + 18} y={PAS_Y + 34} fontSize={15} fontWeight={700} className="fill-white">Aparta su tramo</text>
      {lineas('el 0, el 20 o el 40 %, en el mismo instante del pago, con banco, tarjeta, Bizum o euro digital. Nadie declara nada.', 24).map((l, k) => (
        <text key={k} x={PAS_X + 18} y={PAS_Y + 60 + k * 18} fontSize={12.5} className="fill-slate-300">{l}</text>
      ))}
      {/* the rest to whoever is paid */}
      <path d={`M ${PAS_X + PAS_W / 2} ${PAS_Y + PAS_H} L ${PAS_X + PAS_W / 2} ${PAS_Y + PAS_H + 52}`} className="stroke-slate-500" strokeWidth={1.6} markerEnd="url(#ms-flecha)" />
      <text x={PAS_X + PAS_W / 2 + 8} y={PAS_Y + PAS_H + 30} fontSize={12} fontWeight={650} className="fill-slate-700">el resto</text>
      <rect x={PAS_X} y={PAS_Y + PAS_H + 56} width={PAS_W} height={58} rx={12} className="fill-white stroke-slate-300" />
      <text x={PAS_X + 16} y={PAS_Y + PAS_H + 80} fontSize={13.5} fontWeight={650} className="fill-slate-900">Quien cobra</text>
      <text x={PAS_X + 16} y={PAS_Y + PAS_H + 98} fontSize={12} className="fill-slate-600">el trabajador o la tienda</text>

      {/* what was set aside, into the fund */}
      <path id="ms-al-fondo" d={`M ${PAS_X + PAS_W} ${PAS_Y + PAS_H / 2} L ${FON_X - 2} ${PAS_Y + PAS_H / 2}`} className="stroke-slate-900" strokeWidth={2.4} markerEnd="url(#ms-flecha-oscura)" />
      <text x={(PAS_X + PAS_W + FON_X) / 2} y={PAS_Y + PAS_H / 2 - 9} textAnchor="middle" fontSize={11.5} fontWeight={700} className="fill-slate-900">al fondo</text>
      {animar && (
        <circle r={4} className="fill-slate-900">
          <animateMotion dur="1.6s" repeatCount="indefinite"><mpath href="#ms-al-fondo" /></animateMotion>
        </circle>
      )}

      {/* 3 · The open common fund */}
      <rect x={FON_X} y={FON_Y} width={FON_W} height={FON_H} rx={14} className="fill-slate-200 stroke-slate-400" />
      <text transform={`translate(${FON_X + FON_W / 2 + 5} ${FON_Y + FON_H / 2}) rotate(-90)`} textAnchor="middle" fontSize={13} fontWeight={650} className="fill-slate-800">
        Fondo común abierto: cada euro se ve en tiempo real
      </text>

      {/* 4 · The eight scales */}
      {ESCALAS.map((e, i) => {
        const y = nivelY(i), yc = y + NIV_H / 2;
        const on = nivel(e.id);
        const d = `M ${FON_X + FON_W} ${yc} L ${NIV_X - 2} ${yc}`;
        return (
          <g key={e.id}
            role="button" tabIndex={0} aria-pressed={activa === e.id}
            aria-label={`${e.nombre}: ${millones(pais.porEscala)} al año, ${euros(pais.porPersonaEscala)} por persona`}
            className="cursor-pointer outline-none [&:focus-visible>rect.caja]:stroke-slate-900 [&:focus-visible>rect.caja]:stroke-[2.5]"
            style={{ opacity: on ? 1 : 0.28, transition: 'opacity .2s' }}
            onMouseEnter={() => onActiva(e.id)} onMouseLeave={() => onActiva(null)}
            onFocus={() => onActiva(e.id)} onBlur={() => onActiva(null)}
            onClick={() => onActiva(activa === e.id ? null : e.id)}
            onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onActiva(activa === e.id ? null : e.id); } }}
          >
            <path id={`ms-nivel-${i}`} d={d} fill="none" stroke={e.color} strokeWidth={activa === e.id ? 4 : 2.4} markerEnd="url(#ms-flecha)" />
            <text x={(FON_X + FON_W + NIV_X) / 2} y={yc - 8} textAnchor="middle" fontSize={11.5} fontWeight={650} className="fill-slate-700">1/8</text>
            {animar && (
              <circle r={3.5} fill={e.color}>
                <animateMotion dur="1.4s" repeatCount="indefinite" begin={`${0.2 + i * 0.12}s`}><mpath href={`#ms-nivel-${i}`} /></animateMotion>
              </circle>
            )}
            <rect className="caja fill-white stroke-slate-300" x={NIV_X} y={y} width={NIV_W} height={NIV_H} rx={12} />
            <rect x={NIV_X} y={y} width={7} height={NIV_H} rx={3} fill={e.color} />
            <text x={NIV_X + 20} y={y + 24} fontSize={14} fontWeight={700} className="fill-slate-900">{e.nombre}</text>
            <text x={NIV_X + 20} y={y + 42} fontSize={12} className="fill-slate-700">{millones(pais.porEscala)} al año en España</text>
            <text x={NIV_X + 20} y={y + 58} fontSize={12} className="fill-slate-500">{euros(pais.porPersonaEscala)} por habitante</text>
            {/* the three thirds: produce, care, free */}
            {[0, 1, 2].map(k => (
              <rect key={k} x={NIV_X + NIV_W - 58 + k * 17} y={y + 50} width={15} height={7} rx={2} fill={e.color} style={{ opacity: 1 - k * 0.3 }} />
            ))}
            {lineas(e.devuelve, 26).slice(0, 4).map((l, k, arr) => (
              <text key={k} x={VUELVE_X} y={yc - (arr.length - 1) * 7.5 + k * 15 + 4} fontSize={12} className="fill-slate-700">{l}</text>
            ))}
          </g>
        );
      })}

      {/* The loop: services go back to people; people vote the priorities. */}
      <rect x={PAGO_X} y={PERS_Y} width={PAGO_W} height={96} rx={14} className="fill-white stroke-slate-900" strokeWidth={1.6} />
      <text x={PAGO_X + 16} y={PERS_Y + 28} fontSize={15} fontWeight={700} className="fill-slate-900">Todas las personas</text>
      {lineas('reciben los servicios de las ocho escalas y votan en la asamblea de cada una', 32).map((l, k) => (
        <text key={k} x={PAGO_X + 16} y={PERS_Y + 50 + k * 17} fontSize={12.5} className="fill-slate-600">{l}</text>
      ))}
      <path d={`M ${VUELVE_X + 74} ${nivelY(7) + NIV_H + 18} L ${VUELVE_X + 74} 734 L ${PAGO_X + 70} 734 L ${PAGO_X + 70} ${PERS_Y + 100}`}
        fill="none" className="stroke-slate-900" strokeWidth={2} markerEnd="url(#ms-flecha-oscura)" />
      <text x={600} y={726} textAnchor="middle" fontSize={12.5} fontWeight={650} className="fill-slate-900">
        Servicios, infraestructuras y derechos vuelven a todas las personas
      </text>
      <path d={`M ${PAGO_X + 160} ${PERS_Y + 96} L ${PAGO_X + 160} 760 L ${ESPINA_X} 760 L ${ESPINA_X} ${NIV_Y0 + 8}`}
        fill="none" className="stroke-slate-500" strokeWidth={1.6} strokeDasharray="6 5" />
      {ESCALAS.map((e, i) => (
        <path key={e.id} d={`M ${ESPINA_X} ${nivelY(i) + NIV_H / 2} L ${NIV_X + NIV_W + 2} ${nivelY(i) + NIV_H / 2}`}
          className="stroke-slate-500" strokeWidth={1.4} strokeDasharray="3 3" markerEnd="url(#ms-flecha)" style={{ opacity: nivel(e.id) ? 1 : 0.28 }} />
      ))}
      <text x={600} y={778} textAnchor="middle" fontSize={12.5} className="fill-slate-600">
        Prioridades: cada persona vota en la asamblea de sus escalas y un comité técnico las ejecuta
      </text>
    </svg>
  );
}

/** The same scheme, top to bottom, for phones: the SVG needs 820 px to be read. */
export function EsquemaVertical({ modo, activa, onActiva }: { modo: Modo; activa: EscalaId | null; onActiva: (e: EscalaId | null) => void }) {
  const pais = cuentasPais(modo);
  const Flecha = ({ t }: { t?: string }) => (
    <div className="flex items-center gap-2 py-1.5 pl-5 text-xs font-semibold text-slate-700">
      <span aria-hidden className="text-lg leading-none text-slate-400">↓</span>{t}
    </div>
  );
  return (
    <ol className="text-[15px]">
      <li className="rounded-xl border border-slate-300 bg-white p-4">
        <p className="font-bold text-slate-900">1. Cada pago</p>
        <p className="mt-1 text-sm text-slate-600">Un sueldo (empresa pequeña 0 %, mediana 20 %, grande 40 %), una compra (tramo 1: 0 %, 2: 20 %, 3: 40 %), la venta de una vivienda{modo === 'literal' ? '; y también las compras entre empresas, al 20 %' : '. Cuando una empresa compra a otra, paga y lo recupera al vender'}.</p>
      </li>
      <Flecha />
      <li className="rounded-xl bg-slate-900 p-4 text-white">
        <p className="font-bold">2. El sistema de pago aparta su tramo</p>
        <p className="mt-1 text-sm text-slate-300">En el mismo instante. El resto llega a quien cobra. Nadie declara nada.</p>
      </li>
      <Flecha t="Lo apartado, al fondo común abierto" />
      <li className="rounded-xl border border-slate-300 bg-slate-100 p-4">
        <p className="font-bold text-slate-900">3 y 4. El reparto: un octavo para cada una de las ocho escalas</p>
        <p className="mt-1 text-sm text-slate-600">{millones(pais.porEscala)} al año para cada una en España, {euros(pais.porPersonaEscala)} por habitante. Cada escala lo divide en tres tercios: producir, cuidar y libre.</p>
        <ul className="mt-3 space-y-1.5">
          {ESCALAS.map(e => (
            <li key={e.id}>
              <Libre aria-pressed={activa === e.id} onClick={() => onActiva(activa === e.id ? null : e.id)}
                className={`flex w-full items-start gap-3 rounded-lg bg-white p-2.5 text-left ${activa === e.id ? 'ring-2 ring-slate-900' : ''}`}>
                <span aria-hidden className="mt-0.5 h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">{e.nombre}</span>
                  <span className="block text-sm text-slate-600">{e.devuelve}</span>
                </span>
              </Libre>
            </li>
          ))}
        </ul>
      </li>
      <Flecha t="Servicios, infraestructuras y derechos" />
      <li className="rounded-xl border-2 border-slate-900 bg-white p-4">
        <p className="font-bold text-slate-900">5. Todas las personas</p>
        <p className="mt-1 text-sm text-slate-600">Reciben los servicios de las ocho escalas y votan en la asamblea de cada una las prioridades; un comité técnico las ejecuta. Y vuelta a empezar.</p>
      </li>
    </ol>
  );
}
