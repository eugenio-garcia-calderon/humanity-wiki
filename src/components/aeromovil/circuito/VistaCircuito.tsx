// ============================================================================
// AEROMÓVIL · CIRCUITO DE ESTABILIDAD EN CURVAS (2026-11-15, Eugenio)
// ============================================================================
// «Crea además del garaje un circuito de simulación de estabilidad en curvas del
// vehículo donde el primero que se pueda probar sea el Lumeneo Smera de 4 ruedas
// con basculación para ver qué tal es, y compararlo con otro vehículo como el
// Aptera y entender su seguridad y estabilidad en curva a nivel gráfica».
//
// A SECTION of /aeromovil (`/aeromovil/circuito`), not a page: same vehicles,
// same garage, another way of looking at them (src/pages/CLAUDE.md, «new view»).
// The physics lives in `fisica.ts`, the vehicles in `datos.ts`; this file only
// draws. Loaded with `lazy` from Aeromovil.tsx: recharts is heavy and only this
// section needs it.
//
// Colours: Tailwind's palette as CSS variables (`var(--color-teal-600)`), never
// hex. Tailwind 4 only emits a variable that some class uses, so every colour
// here also appears as a `bg-…` class in a legend swatch (`COLORES`).
import { useEffect, useMemo, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, Bar, BarChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChevronDown, Pause, Play, Info } from 'lucide-react';
import { Badge, Button, Card } from '../../ui/core';
import { Deslizador } from '../../ui/Deslizador';
import { cn } from '../../../utils/cn';
import type { Modelo, Resultados } from '../geometria';
import { CURVAS, RESERVA, aLateral, aceleracion, frenada, indiceEn, limites, semiViaEfectiva, trazado, velocidadDe, veredicto, vuelta, type Lectura, type Limites, type Modo, type Punto, type VehiculoFisico, type Vuelta } from './fisica';
import { FICHAS, FRACCION_ALTURA_CDG, NOMBRE_DISPOSICION, apoyosDe, fichaDeDiseno, fichaGaraje, fisicoDe, type CampoEstimable, type FichaDinamica } from './datos';

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const kmh = (v: number) => `${Math.round(v)} km/h`;

/** The two vehicles' colours: stroke for the SVG/recharts, classes for swatches and text. */
const VEH = [
  { trazo: 'var(--color-teal-600)', fondo: 'bg-teal-600', texto: 'text-teal-700', relleno: 'fill-teal-600' },
  { trazo: 'var(--color-violet-600)', fondo: 'bg-violet-600', texto: 'text-violet-700', relleno: 'fill-violet-600' },
];
/** One colour per corner in the first chart. */
const COLOR_CURVA: Record<string, { trazo: string; fondo: string }> = {
  horquilla: { trazo: 'var(--color-rose-600)', fondo: 'bg-rose-600' },
  chicane: { trazo: 'var(--color-amber-600)', fondo: 'bg-amber-600' },
  curva40: { trazo: 'var(--color-sky-600)', fondo: 'bg-sky-600' },
  enlace60: { trazo: 'var(--color-emerald-600)', fondo: 'bg-emerald-600' },
  rapida: { trazo: 'var(--color-slate-500)', fondo: 'bg-slate-500' },
};
const AGARRE_TRAZO = 'var(--color-slate-800)';
const LECTURA: Record<Lectura, { n: string; badge: 'success' | 'warning' | 'danger'; extra?: string; punto: string; trazo: string }> = {
  ok: { n: 'OK', badge: 'success', punto: 'fill-emerald-500', trazo: 'var(--color-emerald-600)' },
  limite: { n: 'Al límite', badge: 'warning', punto: 'fill-amber-400', trazo: 'var(--color-amber-500)' },
  derrapa: { n: 'Derrapa', badge: 'danger', extra: 'bg-orange-50 text-orange-700', punto: 'fill-orange-500', trazo: 'var(--color-orange-600)' },
  vuelca: { n: 'Vuelca', badge: 'danger', punto: 'fill-red-600', trazo: 'var(--color-red-600)' },
};
const NOMBRE_CAMPO: Record<CampoEstimable, string> = {
  h: 'altura del centro de gravedad', repartoDel: 'reparto de peso', viaDel: 'vía delantera', viaTras: 'vía trasera', masa: 'masa',
  inclinacionMax: 'inclinación máxima', batalla: 'batalla', vmax: 'velocidad máxima',
};
const claseSelect = 'h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500';

function BadgeLectura({ l, className }: { l: Lectura; className?: string }) {
  const L = LECTURA[l];
  return <Badge variant={L.badge} className={cn('text-[10px] tracking-normal', L.extra, className)}>{L.n}</Badge>;
}
const Estimado = ({ title }: { title?: string }) => <Badge variant="info" className="ml-1 align-middle text-[9px] tracking-normal normal-case" title={title}>estimado</Badge>;

interface Sel { f: FichaDinamica; fis: VehiculoFisico; L: Limites; vu: Vuelta; c: (typeof VEH)[number] }

export default function VistaCircuito({ modelo, res, nombreDiseno }: { modelo: Modelo; res: Resultados; nombreDiseno: string }) {
  const diseno = useMemo(() => fichaDeDiseno(modelo, res, nombreDiseno), [modelo, res, nombreDiseno]);
  const fichas = useMemo(() => [...FICHAS.map(fichaGaraje), ...(diseno ? [diseno] : [])], [diseno]);
  const [idA, setIdA] = useState('smera');
  const [idB, setIdB] = useState('aptera');
  const [mu, setMu] = useState(0.8);
  const [tipoModo, setTipoModo] = useState<Modo['tipo']>('apurar');
  const [vFija, setVFija] = useState(50);
  const [pct, setPct] = useState(90);
  const [sinBasc, setSinBasc] = useState(false);
  const [deltaH, setDeltaH] = useState(0);
  const modo: Modo = tipoModo === 'fija' ? { tipo: 'fija', kmh: vFija } : { tipo: 'apurar', fraccion: pct / 100 };
  const { puntos, largo } = useMemo(() => trazado(), []);

  const sel: Sel[] = useMemo(() => {
    const ids = [idA, idB].filter((x, i, a) => x && a.indexOf(x) === i);
    return ids.map((id, i) => {
      const f = fichas.find(x => x.id === id) ?? fichas[0];
      const fis = fisicoDe(f, { deltaH: deltaH / 100, sinBasculacion: sinBasc });
      const L = limites(fis, mu);
      return { f, fis, L, vu: vuelta(fis, L, mu, modo, puntos), c: VEH[i] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichas, idA, idB, mu, tipoModo, vFija, pct, sinBasc, deltaH, puntos]);

  const hayBasculante = sel.some(s => s.f.inclinacionMax > 0);
  const hayEstimadoH = sel.some(s => s.f.estimados.h);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Circuito de estabilidad en curvas</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Cada vehículo recorre cinco curvas de radios distintos. En cada una se calcula cuánta fuerza lateral hace falta, cuánta aguantan los neumáticos antes de <b>derrapar</b> y cuánta aguanta el vehículo antes de <b>volcar</b>; lo que llegue antes manda.
          Un vehículo que bascula, como el Smera, se inclina hacia dentro como una moto. Cómo se calcula cada cifra, al final.
        </p>
      </header>

      {/* ---------------------------------------------------------------- controls */}
      <Card className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">Vehículo 1
            <select className={cn(claseSelect, 'mt-1')} value={idA} onChange={e => setIdA(e.target.value)} aria-label="Vehículo 1">
              {fichas.map(f => <option key={f.id} value={f.id}>{f.nombre}{f.inclinacionMax > 0 ? ' · bascula' : ''}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Comparar con
            <select className={cn(claseSelect, 'mt-1')} value={idB} onChange={e => setIdB(e.target.value)} aria-label="Comparar con">
              <option value="">Ninguno</option>
              {fichas.filter(f => f.id !== idA).map(f => <option key={f.id} value={f.id}>{f.nombre}{f.inclinacionMax > 0 ? ' · bascula' : ''}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {sel.map(s => <span key={s.f.id} className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><span className={cn('h-2.5 w-5 rounded-full', s.c.fondo)} />{s.f.corto}</span>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">Agarre del suelo (μ)</p>
          <div className="flex flex-wrap gap-1.5">
            {[[0.8, 'Seco'], [0.5, 'Mojado'], [1.0, 'Seco, neumático deportivo'], [0.2, 'Nieve']].map(([v, n]) => (
              <Button key={n} variant="outline" aria-pressed={mu === v} onClick={() => setMu(v as number)}
                className={cn('px-2 py-1 text-[11px] normal-case tracking-normal', mu === v && 'border-teal-600 bg-teal-50 text-teal-800')}>{n as string} · {fmt(v as number, 1)}</Button>
            ))}
          </div>
          <Deslizador tono="claro" etiqueta="μ" valor={mu} min={0.1} max={1.2} paso={0.05} unidad="g" onChange={setMu} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">Cómo se conduce la vuelta</p>
          <div className="flex gap-1.5">
            <Button variant="outline" aria-pressed={tipoModo === 'apurar'} onClick={() => setTipoModo('apurar')} className={cn('flex-1 px-2 py-1 text-[11px] normal-case tracking-normal', tipoModo === 'apurar' && 'border-teal-600 bg-teal-50 text-teal-800')}>Apurar cada curva</Button>
            <Button variant="outline" aria-pressed={tipoModo === 'fija'} onClick={() => setTipoModo('fija')} className={cn('flex-1 px-2 py-1 text-[11px] normal-case tracking-normal', tipoModo === 'fija' && 'border-teal-600 bg-teal-50 text-teal-800')}>Velocidad fija</Button>
          </div>
          {tipoModo === 'apurar'
            ? <><Deslizador tono="claro" etiqueta="Cada curva al … de su velocidad límite" valor={pct} min={50} max={115} paso={1} unidad="%" onChange={setPct} />
              <p className="text-[11px] text-slate-500">Cada vehículo entra en cada curva a ese porcentaje de <i>su</i> velocidad límite (al 90 % de la velocidad usa el 81 % de su límite: la fuerza lateral crece con el cuadrado); en las rectas, a fondo hasta su velocidad máxima. Por encima de 100 %, falla.</p></>
            : <><Deslizador tono="claro" etiqueta="Velocidad en todo el circuito" valor={vFija} min={10} max={130} paso={1} unidad="km/h" onChange={setVFija} />
              <p className="text-[11px] text-slate-500">La misma velocidad en todas las curvas (sin pasar de la máxima del vehículo). El coche dibujado sigue la curva aunque en la realidad se saldría: así se ve lo que pide cada una.</p></>}
        </div>
        <div className="space-y-2">
          {hayBasculante && (
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" className="mt-0.5 accent-teal-600" checked={sinBasc} onChange={e => setSinBasc(e.target.checked)} />
              <span><b>Basculación apagada</b>: el mismo vehículo, rígido. Enseña para qué sirve que se incline.</span>
            </label>
          )}
          <Deslizador tono="claro" etiqueta="¿Y si el centro de gravedad estimado estuviera…?" valor={deltaH} min={-10} max={15} paso={1} unidad="cm" onChange={setDeltaH} />
          <p className="text-[11px] text-slate-500">{hayEstimadoH ? `Sube o baja solo las alturas estimadas (las marcadas «estimado»). ${deltaH === 0 ? 'Ahora: tal cual.' : deltaH > 0 ? `Ahora: ${deltaH} cm más alto.` : `Ahora: ${-deltaH} cm más bajo.`}` : 'Los vehículos elegidos tienen la altura del centro de gravedad calculada: este ajuste no les afecta.'}</p>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- the two limits, in one line per vehicle */}
      <div className="grid gap-3 md:grid-cols-2">
        {sel.map(s => <ResumenVehiculo key={s.f.id} s={s} mu={mu} sinBasc={sinBasc} />)}
      </div>

      {/* ---------------------------------------------------------------- the track */}
      <Pista sel={sel} puntos={puntos} largo={largo} mu={mu} />

      {/* ---------------------------------------------------------------- safety reading */}
      <Card className="p-4">
        <h2 className="text-base font-bold text-slate-900">Lectura de seguridad, curva a curva</h2>
        <p className="mb-3 text-xs text-slate-500">
          <b>OK</b>: usa menos del {Math.round((1 - RESERVA) * 100)} % de su primer límite. <b>Al límite</b>: entre el {Math.round((1 - RESERVA) * 100)} y el 100 %, sin reserva para un bache o un error. <b>Derrapa</b> o <b>vuelca</b>: lo que pasaría primero. Margen: lo que le queda de ese límite.
        </p>
        <TablaLecturas sel={sel} modo={modo} />
      </Card>

      {/* ---------------------------------------------------------------- charts */}
      <GraficaAceleracion sel={sel} mu={mu} modo={modo} />
      <GraficaVelocidades sel={sel} modo={modo} />
      <GraficaInclinacion sel={sel} puntos={puntos} hayBasculante={hayBasculante} sinBasc={sinBasc} />

      {/* ---------------------------------------------------------------- data */}
      <TablaDatos fichas={sel.map(s => s.f)} todas={fichas} />
      <ComoSeCalcula mu={mu} />
    </div>
  );
}

// ============================================================================ the summary per vehicle
function ResumenVehiculo({ s, mu, sinBasc }: { s: Sel; mu: number; sinBasc: boolean }) {
  const { f, L, fis } = s;
  const bascula = f.inclinacionMax > 0 && !sinBasc;
  const reserva = L.vuelco / mu;
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className={cn('h-2.5 w-5 rounded-full', s.c.fondo)} />{f.nombre}</p>
      <p className="mt-0.5 text-xs text-slate-500">{NOMBRE_DISPOSICION[f.disposicion]}{f.inclinacionMax > 0 ? (sinBasc ? ' · basculación apagada' : ` · bascula hasta ${f.inclinacionMax}°`) : ' · no bascula'} · vía {fmt(f.viaDel)}{f.viaTras && Math.abs(f.viaTras - f.viaDel) > 0.005 ? `/${fmt(f.viaTras)}` : ''} m · centro de gravedad a {fmt(fis.h)} m{f.estimados.h ? <Estimado title={f.estimados.h} /> : null}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Vuelca a</dt><dd className="text-lg font-bold tabular-nums text-slate-900">{fmt(L.vuelco)} g</dd>{bascula && <dd className="text-[10px] text-slate-500">de pie: {fmt(L.vuelcoRigido)} g</dd>}</div>
        <div className="rounded-xl bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Derrapa a</dt><dd className="text-lg font-bold tabular-nums text-slate-900">{fmt(mu)} g</dd><dd className="text-[10px] text-slate-500">el agarre, μ</dd></div>
        <div className="rounded-xl bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Primero</dt><dd className="pt-1"><BadgeLectura l={L.primero} /></dd><dd className="text-[10px] text-slate-500">a {fmt(L.limite)} g</dd></div>
      </dl>
      <p className="mt-2 text-xs text-slate-600">
        {L.primero === 'vuelca'
          ? <>Vuelca <b>antes</b> de derrapar: en una curva demasiado rápida, las ruedas de dentro se levantan mientras los neumáticos aún agarran. Es el caso peligroso.</>
          : reserva < 1.25
            ? <>Derrapa antes de volcar, pero con poca reserva: vuelca a solo {fmt(reserva)} veces el agarre. Un bordillo o un neumático más agarrado le dan la vuelta.</>
            : <>Derrapa antes de volcar, con reserva: vuelca a {fmt(reserva)} veces el agarre.</>}
        {bascula && <> Se equilibra inclinándose hasta {fmt(L.balanceo)} g (tan {f.inclinacionMax}°); por encima, el resto empuja sobre su vía de {fmt(f.viaDel)} m.</>}
      </p>
    </Card>
  );
}

// ============================================================================ the track, animated
function Pista({ sel, puntos, largo, mu }: { sel: Sel[]; puntos: Punto[]; largo: number; mu: number }) {
  const [t, setT] = useState(0);
  const [jugando, setJugando] = useState(true);
  const [escala, setEscala] = useState(4);
  const ultimo = useRef<number | null>(null);
  useEffect(() => {
    if (!jugando) { ultimo.current = null; return; }
    let id = 0;
    const paso = (ahora: number) => {
      if (ultimo.current !== null) { const dt = Math.min(0.1, (ahora - ultimo.current) / 1000); setT(x => x + dt * escala); }
      ultimo.current = ahora; id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [jugando, escala]);

  const caja = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of puntos) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const mx = 52, my = 30; return { x: x0 - mx, y: -(y1 + my), w: x1 - x0 + 2 * mx, h: y1 - y0 + 2 * my };   // room for the corner labels
  }, [puntos]);
  const d = useMemo(() => puntos.filter((_, i) => i % 2 === 0).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${(-p.y).toFixed(1)}`).join(' ') + 'Z', [puntos]);
  // a label beside each corner, outside the bend; the chicane and the 60 m link, once
  const etiquetas = useMemo(() => {
    const vistos = new Set<string>(), out: { id: string; x: number; y: number }[] = [];
    for (const c of CURVAS) {
      const tramo = puntos.filter(p => p.curva === c.id && p.k !== 0);
      if (!tramo.length || vistos.has(c.id)) continue; vistos.add(c.id);
      const p = tramo[Math.floor(tramo.length / 2)], sg = Math.sign(p.k);
      const nx = -Math.sin(p.rumbo), ny = Math.cos(p.rumbo), off = c.id === 'horquilla' ? 26 : c.id === 'rapida' ? -30 : 24;
      out.push({ id: c.id, x: p.x - sg * nx * off, y: p.y - sg * ny * off });
    }
    return out;
  }, [puntos]);
  const ahora = sel.map(s => {
    const i = indiceEn(s.vu.t, t), p = puntos[i];
    return { s, i, p, v: s.vu.v[i] * 3.6, a: s.vu.a[i], phi: s.vu.phi[i], ver: veredicto(s.L, s.vu.a[i]) };
  });
  const tMax = Math.max(...sel.map(s => s.vu.tiempo));

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-bold text-slate-900">El circuito <span className="text-xs font-normal text-slate-500">· {Math.round(largo)} m por vuelta, visto desde arriba</span></h2>
        <Button variant="outline" onClick={() => setJugando(j => !j)} aria-label={jugando ? 'Pausa' : 'Seguir'} className="gap-1 px-2.5 py-1 text-xs normal-case tracking-normal">
          {jugando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{jugando ? 'Pausa' : 'Seguir'}
        </Button>
        {[1, 4, 10].map(e => <Button key={e} variant="outline" aria-pressed={escala === e} onClick={() => setEscala(e)} className={cn('px-2 py-1 text-xs normal-case tracking-normal', escala === e && 'border-teal-600 bg-teal-50 text-teal-800')}>×{e}</Button>)}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <svg viewBox={`${caja.x} ${caja.y} ${caja.w} ${caja.h}`} className="h-auto w-full rounded-xl bg-emerald-50" role="img" aria-label="Circuito visto desde arriba con los vehículos">
          <path d={d} className="fill-none stroke-slate-400" strokeWidth={11} strokeLinejoin="round" />
          <path d={d} className="fill-none stroke-slate-600" strokeWidth={9} strokeLinejoin="round" />
          <path d={d} className="fill-none stroke-white/70" strokeWidth={0.6} strokeDasharray="4 5" />
          {/* start line */}
          <line x1={0} y1={-5} x2={0} y2={5} className="stroke-white" strokeWidth={1.6} />
          {etiquetas.map(e => {
            const c = CURVAS.find(x => x.id === e.id)!;
            return (
              <g key={e.id} transform={`translate(${e.x.toFixed(1)} ${(-e.y).toFixed(1)})`}>
                <text textAnchor="middle" className="fill-slate-800" fontSize={9} fontWeight={700}>{c.nombre}</text>
                <text textAnchor="middle" y={9} className="fill-slate-500" fontSize={7}>r {c.radio} m</text>
                {sel.map((s, k) => {
                  const vk = s.vu.enCurva[c.id] ?? 0, l = veredicto(s.L, aLateral(vk / 3.6, c.radio)).lectura;
                  return <circle key={s.f.id} cx={(k - (sel.length - 1) / 2) * 9} cy={16} r={3.4} className={cn(LECTURA[l].punto, 'stroke-white')} strokeWidth={0.8}><title>{`${s.f.corto}: ${LECTURA[l].n}`}</title></circle>;
                })}
              </g>
            );
          })}
          {ahora.map(({ s, p }, k) => {
            // two lanes, so the cars do not sit on top of each other; drawn three times their real size to be seen
            const lado = sel.length > 1 ? (k === 0 ? 2.2 : -2.2) : 0, nx = -Math.sin(p.rumbo), ny = Math.cos(p.rumbo);
            const x = p.x + nx * lado, y = p.y + ny * lado, ang = (-p.rumbo * 180) / Math.PI;
            return (
              <g key={s.f.id} transform={`translate(${x.toFixed(2)} ${(-y).toFixed(2)}) rotate(${ang.toFixed(1)})`}>
                <rect x={-6} y={-2.6} width={12} height={5.2} rx={2.2} className={cn(s.c.relleno, 'stroke-white')} strokeWidth={0.7} />
                <rect x={1.5} y={-1.8} width={3} height={3.6} rx={1} className="fill-white/70" />
              </g>
            );
          })}
        </svg>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {ahora.map(x => <VistaTrasera key={x.s.f.id} s={x.s} a={x.a} phi={x.phi} v={x.v} curva={x.p.curva} mu={mu} />)}
        </div>
      </div>
      <div className="mt-2">
        <Deslizador tono="claro" etiqueta="Momento de la vuelta (arrastra para parar en un punto)" valor={Math.round((t % tMax) * 10) / 10} min={0} max={Math.ceil(tMax)} paso={0.1} unidad="s"
          onChange={v => { setJugando(false); setT(v); }} />
        <p className="mt-1 text-[11px] text-slate-500">
          Coches dibujados al triple de su tamaño. Tiempo de vuelta: {sel.map(s => `${s.f.corto} ${fmt(s.vu.tiempo, 1)} s`).join(' · ')}. El punto de colores junto a cada curva es su lectura (verde OK, ámbar al límite, naranja derrapa, rojo vuelca).
        </p>
      </div>
    </Card>
  );
}

/**
 * The car seen from behind: the body leaned (a tilting vehicle) or upright (a rigid one), the centre of gravity, and
 * the line of the resultant of weight and lateral force. While that line hits the ground between the wheels, the car
 * stays on its wheels; when it falls outside the outer wheel, it rolls over. The wheels are drawn at the EFFECTIVE track
 * (for a three-wheeler, the track under its centre of gravity), with the real track dashed when it differs.
 */
function VistaTrasera({ s, a, phi, v, curva, mu }: { s: Sel; a: number; phi: number; v: number; curva: string | null; mu: number }) {
  const { f, fis, L } = s;
  const E = 58, suelo = 118, cx = 100;                                 // px per metre, ground line, centre
  const e = semiViaEfectiva(apoyosDe(f), fis.xg), real = Math.max(f.viaDel, f.viaTras) / 2;
  const fuera = Math.sign(a) || 1;                                      // screen side of the outside of the turn
  const ver = veredicto(L, a);
  const vuelca = ver.lectura === 'vuelca', derrapa = ver.lectura === 'derrapa';
  const giro = -phi;                                                    // lean into the turn: top goes to the inside
  const vuelco = vuelca ? 6 * fuera : 0;                                // the whole car tipping on its outer wheel
  const phiR = (phi * Math.PI) / 180;
  // centre of gravity on screen (after the lean), and where the resultant meets the ground
  const gx = cx - Math.sin(phiR) * fis.h * E * 1, gy = suelo - Math.cos(phiR) * fis.h * E;
  const hx = gx + fuera * Math.abs(a) * (suelo - gy);
  // inside the wheels while it does not roll: the same test as the reading, not a pixel comparison
  const dentro = Math.abs(a) <= L.vuelco;
  const ancho = Math.min(f.ancho, 3.2), alto = Math.min(f.alto, 1.9);
  const rueda = (z: number, k: string, tenue = false) => (
    <rect key={k} x={cx + z * E - 4} y={suelo - 22} width={8} height={22} rx={2.5} transform={`rotate(${giro} ${cx + z * E} ${suelo})`}
      className={tenue ? 'fill-none stroke-slate-400' : 'fill-slate-800'} strokeDasharray={tenue ? '2 2' : undefined} />
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><span className={cn('h-2 w-4 rounded-full', s.c.fondo)} />{f.corto} <span className="font-normal text-slate-500">desde atrás</span></p>
      <svg viewBox="0 0 200 132" className="h-auto w-full" role="img" aria-label={`${f.corto} visto desde atrás`}>
        <line x1={0} y1={suelo} x2={200} y2={suelo} className="stroke-slate-400" strokeWidth={1.2} />
        <g transform={`rotate(${vuelco} ${cx + fuera * e * E} ${suelo})`}>
          {Math.abs(real - e) > 0.05 && [rueda(real, 'rd', true), rueda(-real, 'ri', true)]}
          <g transform={`rotate(${giro} ${cx} ${suelo})`}>
            <rect x={cx - (ancho / 2) * E} y={suelo - alto * E} width={ancho * E} height={(alto - 0.18) * E} rx={14} className="fill-slate-200 stroke-slate-400" strokeWidth={1} />
            <rect x={cx - (ancho / 2) * E * 0.7} y={suelo - alto * E + 6} width={ancho * E * 0.7} height={alto * E * 0.32} rx={8} className="fill-sky-100" />
          </g>
          {[rueda(e, 'ed'), rueda(-e, 'ei')]}
          <circle cx={gx} cy={gy} r={3.5} className="fill-slate-900" />
          <line x1={gx} y1={gy} x2={hx} y2={suelo} strokeWidth={1.6} strokeDasharray="3 2" style={{ stroke: dentro ? 'var(--color-emerald-600)' : 'var(--color-red-600)' }} />
          <circle cx={hx} cy={suelo} r={2.6} style={{ fill: dentro ? 'var(--color-emerald-600)' : 'var(--color-red-600)' }} />
        </g>
        {(vuelca || derrapa) && <text x={100} y={14} textAnchor="middle" fontSize={12} fontWeight={800} className={vuelca ? 'fill-red-600' : 'fill-orange-600'}>{vuelca ? 'VOLCARÍA' : 'DERRAPARÍA'}</text>}
      </svg>
      <p className="min-h-[3em] text-[11px] leading-snug text-slate-600">
        {Math.round(v)} km/h{curva ? ` · ${CURVAS.find(c => c.id === curva)?.nombre}` : ' · recta'} · <b className="tabular-nums">{fmt(Math.abs(a))} g</b> lateral{f.inclinacionMax > 0 && fis.inclinacionMax > 0 ? <> · inclinado <b className="tabular-nums">{Math.round(Math.abs(phi))}°</b> de {fis.inclinacionMax}°</> : null}
        {' · '}<BadgeLectura l={ver.lectura} className="px-1 py-0" />
      </p>
      <p className="min-h-[4.2em] text-[10px] text-slate-400">Línea: la resultante del peso y la fuerza lateral. Dentro de las ruedas, no vuelca. {Math.abs(real - e) > 0.05 ? `Ruedas a la vía efectiva bajo el centro de gravedad (${fmt(2 * e)} m); a trazos, la real (${fmt(2 * real)} m).` : ''} Derrapa por encima de {fmt(mu)} g.</p>
    </div>
  );
}

// ============================================================================ safety table
function TablaLecturas({ sel, modo }: { sel: Sel[]; modo: Modo }) {
  return (
    <div className="divide-y divide-slate-100">
      <div className="hidden grid-cols-[150px_repeat(2,minmax(0,1fr))] gap-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>Curva</span>{sel.map(s => <span key={s.f.id} className={s.c.texto}>{s.f.corto}</span>)}
      </div>
      {CURVAS.map(c => (
        <div key={c.id} className="grid gap-x-3 gap-y-1 py-2 sm:grid-cols-[150px_repeat(2,minmax(0,1fr))]">
          <div><p className="text-sm font-semibold text-slate-800">{c.nombre}</p><p className="text-[11px] text-slate-500">radio {c.radio} m</p></div>
          {sel.map(s => {
            const v = modo.tipo === 'fija' ? Math.min(modo.kmh, s.f.vmax) : s.vu.enCurva[c.id] ?? 0;
            const a = aLateral(v / 3.6, c.radio), V = veredicto(s.L, a), vl = velocidadDe(s.L.limite, c.radio), vs = velocidadDe((1 - RESERVA) * s.L.limite, c.radio);
            return (
              <div key={s.f.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-slate-600">
                <span className={cn('w-14 font-semibold sm:hidden', s.c.texto)}>{s.f.corto}</span>
                <BadgeLectura l={V.lectura} />
                <span className="tabular-nums">{kmh(v)} · {fmt(a)} g · margen <b className={cn(V.margen < 0 ? 'text-red-700' : V.margen < RESERVA ? 'text-amber-700' : 'text-emerald-700')}>{Math.round(V.margen * 100)} %</b></span>
                <span className="basis-full text-[11px] text-slate-500 sm:basis-auto">límite {kmh(vl)}, segura {kmh(vs)}{vl > s.f.vmax ? ` (más que su máxima, ${kmh(s.f.vmax)})` : ''}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ============================================================================ charts
function Leyenda({ items }: { items: { n: string; fondo: string; trazo?: 'solido' | 'trazos' | 'puntos' }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
      {items.map(i => (
        <li key={i.n} className="inline-flex items-center gap-1.5">
          <span className={cn('inline-block h-0.5 w-5', i.trazo === 'trazos' ? 'border-t-2 border-dashed bg-transparent' : i.trazo === 'puntos' ? 'border-t-2 border-dotted bg-transparent' : i.fondo,
            i.trazo && i.trazo !== 'solido' ? i.fondo.replace('bg-', 'border-') : '')} />{i.n}
        </li>
      ))}
    </ul>
  );
}

function GraficaAceleracion({ sel, mu, modo }: { sel: Sel[]; mu: number; modo: Modo }) {
  const datos = useMemo(() => {
    const out: Record<string, number>[] = [];
    for (let v = 0; v <= 140; v += 2) { const r: Record<string, number> = { v }; for (const c of CURVAS) r[c.id] = aLateral(v / 3.6, c.radio); out.push(r); }
    return out;
  }, []);
  const yMax = Math.min(2, Math.max(1.3, ...sel.map(s => s.L.vuelco + 0.15), mu + 0.2));
  return (
    <Card className="p-4">
      <h2 className="text-base font-bold text-slate-900">Aceleración lateral según la velocidad</h2>
      <p className="mb-2 text-xs text-slate-500">Cada curva de color es una curva del circuito: cuanto más cerrada, más deprisa sube. Las líneas horizontales son los límites: donde una curva las cruza, esa es su velocidad máxima.</p>
      <div className="h-[300px] w-full sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 18, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" />
            <XAxis dataKey="v" type="number" domain={[0, 140]} ticks={[0, 20, 40, 60, 80, 100, 120, 140]} tick={{ fontSize: 11 }} label={{ value: 'km/h', position: 'insideBottomRight', offset: -8, fontSize: 11 }} />
            <YAxis domain={[0, yMax]} allowDataOverflow tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt(v, 1)} label={{ value: 'g', position: 'insideTopLeft', offset: 14, fontSize: 11 }} />
            <Tooltip formatter={(v: number, n: string) => [`${fmt(v)} g`, CURVAS.find(c => c.id === n)?.nombre ?? n]} labelFormatter={(v: number) => `${v} km/h`} contentStyle={{ fontSize: 12 }} />
            {CURVAS.map(c => <Line key={c.id} dataKey={c.id} name={c.id} dot={false} stroke={COLOR_CURVA[c.id].trazo} strokeWidth={2} isAnimationActive={false} />)}
            <ReferenceLine y={mu} stroke={AGARRE_TRAZO} strokeWidth={1.5} label={{ value: `Derrapa (μ ${fmt(mu)})`, position: 'insideBottomRight', fontSize: 10, fill: AGARRE_TRAZO }} />
            {sel.map(s => <ReferenceLine key={s.f.id} y={s.L.vuelco} stroke={s.c.trazo} strokeDasharray="6 3" strokeWidth={2} label={{ value: `Vuelca ${s.f.corto} ${fmt(s.L.vuelco)}`, position: 'insideTopLeft', fontSize: 10, fill: s.c.trazo }} />)}
            {sel.filter(s => s.fis.inclinacionMax > 0).map(s => <ReferenceLine key={`b${s.f.id}`} y={s.L.balanceo} stroke={s.c.trazo} strokeDasharray="1 3" strokeWidth={2} label={{ value: `${s.f.corto}: ya no se inclina más`, position: 'insideBottomLeft', fontSize: 10, fill: s.c.trazo }} />)}
            {modo.tipo === 'fija' && <ReferenceLine x={modo.kmh} stroke="var(--color-slate-500)" strokeDasharray="2 2" label={{ value: `${modo.kmh} km/h`, position: 'top', fontSize: 10 }} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Leyenda items={[
        ...CURVAS.map(c => ({ n: `${c.nombre} (r ${c.radio} m)`, fondo: COLOR_CURVA[c.id].fondo })),
        { n: 'Derrapa: el agarre μ', fondo: 'bg-slate-800' },
        ...sel.map(s => ({ n: `Vuelca: ${s.f.corto}`, fondo: s.c.fondo, trazo: 'trazos' as const })),
        ...sel.filter(s => s.fis.inclinacionMax > 0).map(s => ({ n: `${s.f.corto} deja de inclinarse (tan ${s.fis.inclinacionMax}°)`, fondo: s.c.fondo, trazo: 'puntos' as const })),
      ]} />
    </Card>
  );
}

function GraficaVelocidades({ sel, modo }: { sel: Sel[]; modo: Modo }) {
  const datos = CURVAS.map(c => {
    const r: Record<string, string | number> = { curva: `${c.nombre}` };
    for (const s of sel) r[s.f.id] = Math.round(velocidadDe(s.L.limite, c.radio));
    return r;
  });
  return (
    <Card className="p-4">
      <h2 className="text-base font-bold text-slate-900">Velocidad máxima en cada curva</h2>
      <p className="mb-2 text-xs text-slate-500">La velocidad a la que llega a su primer límite, sea derrapar o volcar. La segura, con un {Math.round(RESERVA * 100)} % de reserva, es un {Math.round((1 - Math.sqrt(1 - RESERVA)) * 100)} % menos (en la tabla de arriba). Si los dos derrapan antes de volcar, salen iguales: el agarre es el mismo para todos.</p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
            <XAxis dataKey="curva" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'km/h', position: 'insideTopLeft', offset: 14, fontSize: 11 }} />
            <Tooltip formatter={(v: number, n: string) => [`${v} km/h`, sel.find(s => s.f.id === n)?.f.corto ?? n]} contentStyle={{ fontSize: 12 }} />
            {sel.map(s => <Bar key={s.f.id} dataKey={s.f.id} fill={s.c.trazo} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
            {modo.tipo === 'fija' && <ReferenceLine y={modo.kmh} stroke="var(--color-slate-700)" strokeDasharray="4 3" label={{ value: `vas a ${modo.kmh} km/h`, position: 'insideTopRight', fontSize: 10 }} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Leyenda items={sel.map(s => ({ n: s.f.nombre, fondo: s.c.fondo }))} />
    </Card>
  );
}

function GraficaInclinacion({ sel, puntos, hayBasculante, sinBasc }: { sel: Sel[]; puntos: Punto[]; hayBasculante: boolean; sinBasc: boolean }) {
  const basc = sel.filter(s => s.fis.inclinacionMax > 0);
  const datos = useMemo(() => {
    const out: Record<string, number>[] = [];
    for (let i = 0; i < puntos.length; i += 4) {
      const r: Record<string, number> = { s: Math.round(puntos[i].s) };
      for (const s of basc) { r[s.f.id] = s.vu.phi[i]; r[`${s.f.id}_p`] = Math.max(-60, Math.min(60, s.vu.pedida[i])); }
      out.push(r);
    }
    return out;
  }, [puntos, basc]);
  const tramos = useMemo(() => {
    const out: { id: string; s0: number; s1: number }[] = [];
    let cur: { id: string; s0: number; s1: number } | null = null;
    for (const p of puntos) {
      if (p.curva) { if (cur && cur.id === p.curva) cur.s1 = p.s; else { cur = { id: p.curva, s0: p.s, s1: p.s }; out.push(cur); } } else cur = null;
    }
    return out;
  }, [puntos]);
  return (
    <Card className="p-4">
      <h2 className="text-base font-bold text-slate-900">Inclinación a lo largo de la vuelta</h2>
      {!basc.length ? (
        <p className="text-sm text-slate-600">{hayBasculante && sinBasc ? 'La basculación está apagada: el vehículo va recto en todas las curvas.' : 'Ninguno de los vehículos elegidos bascula. Elige el Lumeneo Smera (o un diseño que bascule, como el Gota) para ver cómo se inclina en cada curva.'}</p>
      ) : (<>
        <p className="mb-2 text-xs text-slate-500">Positivo: inclinado a la izquierda; negativo, a la derecha. La línea fina es la inclinación que equilibraría del todo la curva (atan de la aceleración lateral); la gruesa, la que alcanza, hasta su máximo. Donde se separan, el resto de la fuerza lateral carga la rueda de fuera. Las bandas grises son las curvas. Sin curvas de transición en el dibujo, la inclinación salta de golpe al entrar en cada curva.</p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 18, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" />
              {tramos.map((tr, k) => <ReferenceArea key={k} x1={tr.s0} x2={tr.s1} fill="var(--color-slate-300)" fillOpacity={0.35} ifOverflow="visible" />)}
              <XAxis dataKey="s" type="number" domain={[0, Math.round(puntos[puntos.length - 1].s)]} tick={{ fontSize: 11 }} label={{ value: 'metros de vuelta', position: 'insideBottomRight', offset: -8, fontSize: 11 }} />
              <YAxis domain={[-45, 45]} allowDataOverflow ticks={[-40, -25, -10, 0, 10, 25, 40]} tick={{ fontSize: 11 }} label={{ value: '°', position: 'insideTopLeft', offset: 14, fontSize: 11 }} />
              <Tooltip formatter={(v: number, n: string) => [`${Math.round(v)}°`, n.endsWith('_p') ? 'la que equilibraría' : 'inclinación']} labelFormatter={(v: number) => `metro ${v}`} contentStyle={{ fontSize: 12 }} />
              {basc.map(s => <Line key={`${s.f.id}_p`} dataKey={`${s.f.id}_p`} dot={false} stroke={s.c.trazo} strokeWidth={1} strokeDasharray="3 2" isAnimationActive={false} />)}
              {basc.map(s => <Line key={s.f.id} dataKey={s.f.id} dot={false} stroke={s.c.trazo} strokeWidth={2.5} isAnimationActive={false} />)}
              {basc.map(s => [s.fis.inclinacionMax, -s.fis.inclinacionMax].map(y => <ReferenceLine key={`${s.f.id}${y}`} y={y} stroke={s.c.trazo} strokeDasharray="6 3" label={{ value: `máx. ${s.fis.inclinacionMax}°`, position: y > 0 ? 'insideTopRight' : 'insideBottomRight', fontSize: 10, fill: s.c.trazo }} />))}
              <Legend content={() => null} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {basc.map(s => s.vu.ritmoChicane && (
          <p key={s.f.id} className="mt-1 text-xs text-slate-600">
            <b>{s.f.corto} en la chicane:</b> pasa de {Math.round(s.vu.ritmoChicane.desde)}° a {Math.round(s.vu.ritmoChicane.hasta)}° en {fmt(s.vu.ritmoChicane.segundos)} s, unos <b>{Math.round(s.vu.ritmoChicane.gradosS)}°/s</b>. Es lo que un basculante necesita de su motor de inclinación; si no llega, va inclinado de menos y el resto de la fuerza carga su vía estrecha. Lumeneo no publicó la velocidad de inclinación del Smera, así que aquí no se juzga: se enseña.
          </p>
        ))}
      </>)}
    </Card>
  );
}

// ============================================================================ data and method
function TablaDatos({ fichas, todas }: { fichas: FichaDinamica[]; todas: FichaDinamica[] }) {
  const [todasVisibles, setTodasVisibles] = useState(false);
  const lista = todasVisibles ? todas : fichas;
  const cel = (f: FichaDinamica, k: CampoEstimable, txt: string) => <>{txt}{f.estimados[k] ? <Estimado title={f.estimados[k]} /> : null}</>;
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-bold text-slate-900">Los datos de cada vehículo</h2>
        <Button variant="outline" onClick={() => setTodasVisibles(v => !v)} className="px-2 py-1 text-xs normal-case tracking-normal">{todasVisibles ? 'Solo los elegidos' : 'Ver todos'}</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {lista.map(f => (
          <div key={f.id} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
            <p className="text-sm font-bold text-slate-900">{f.nombre}</p>
            <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
              <dt className="text-slate-500">Ruedas</dt><dd>{NOMBRE_DISPOSICION[f.disposicion]}</dd>
              <dt className="text-slate-500">Masa con conductor</dt><dd>{cel(f, 'masa', `${Math.round(f.masa)} kg`)}</dd>
              <dt className="text-slate-500">Batalla</dt><dd>{cel(f, 'batalla', `${fmt(f.batalla)} m`)}</dd>
              <dt className="text-slate-500">Vía delante / detrás</dt><dd>{cel(f, 'viaDel', `${fmt(f.viaDel)} m`)} / {f.viaTras ? cel(f, 'viaTras', `${fmt(f.viaTras)} m`) : 'una rueda'}</dd>
              <dt className="text-slate-500">Centro de gravedad</dt><dd>{cel(f, 'h', `${fmt(f.h)} m de alto`)}, {cel(f, 'repartoDel', `${Math.round(f.repartoDel * 100)} % del peso delante`)}</dd>
              <dt className="text-slate-500">Basculación</dt><dd>{f.inclinacionMax > 0 ? cel(f, 'inclinacionMax', `hasta ${f.inclinacionMax}°`) : 'no'}</dd>
              <dt className="text-slate-500">Velocidad máxima</dt><dd>{cel(f, 'vmax', kmh(f.vmax))}</dd>
              <dt className="text-slate-500">Neumáticos</dt><dd>{f.neumaticos}</dd>
            </dl>
            {Object.keys(f.estimados).length > 0 && (
              <div className="mt-2 rounded-lg bg-blue-50/60 p-2">
                <p className="font-semibold text-slate-700">Estimado, y cómo:</p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4">{(Object.entries(f.estimados) as [CampoEstimable, string][]).map(([k, t]) => <li key={k}><b>{NOMBRE_CAMPO[k]}</b>: {t}.</li>)}</ul>
              </div>
            )}
            <details className="mt-2"><summary className="cursor-pointer text-slate-500">Fuentes</summary><ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">{f.fuentes.map(x => <li key={x}>{x}</li>)}</ul></details>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">La masa no cambia ningún límite (está a los dos lados de cada cuenta y se va); cambia dónde queda el centro de gravedad, que sí cuenta.</p>
    </Card>
  );
}

function ComoSeCalcula({ mu }: { mu: number }) {
  const [abierto, setAbierto] = useState(false);
  const ej = { v: 50, r: 25 }, aEj = aLateral(ej.v / 3.6, ej.r);
  return (
    <Card className="p-0">
      <Button variant="ghost" aria-expanded={abierto} onClick={() => setAbierto(a => !a)} className="w-full justify-between rounded-none px-4 py-3 text-left text-sm normal-case tracking-normal text-slate-900">
        <span className="inline-flex items-center gap-2 font-bold"><Info className="h-4 w-4" />Cómo se calcula</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', abierto && 'rotate-180')} />
      </Button>
      {abierto && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
          <p><b>El modelo.</b> Cada curva es un círculo recorrido a velocidad constante, el tiempo suficiente para que el vehículo se asiente (modelo «cuasi-estático»). El vehículo es un sólido rígido apoyado en sus ruedas: sin suspensión que se hunda, sin neumáticos que cedan, sin aerodinámica.</p>
          <p><b>1. La fuerza lateral.</b> Para girar en un círculo de radio r a velocidad v hace falta una aceleración hacia el centro a = v² / r. Dividida entre g = 9,81 m/s² se lee en «g». Ejemplo: {ej.v} km/h son {fmt(ej.v / 3.6, 1)} m/s; en un radio de {ej.r} m, a = {fmt(ej.v / 3.6, 1)}² / {ej.r} = {fmt(aEj * 9.81, 1)} m/s² = <b>{fmt(aEj)} g</b>. Al doble de velocidad, cuatro veces más.</p>
          <p><b>2. Derrapar.</b> Los neumáticos sujetan hasta μ veces el peso: μ ≈ 0,8 en asfalto seco con neumáticos normales, 0,5 mojado, 1,0 o algo más con neumáticos deportivos, 0,2 con nieve. Derrapa cuando a &gt; μ (ahora, {fmt(mu)} g). La masa está a los dos lados de la cuenta y se va: con el mismo μ, todos derrapan a la vez.</p>
          <p><b>3. Volcar, cuatro ruedas.</b> En la curva, la fuerza lateral m·a empuja el centro de gravedad, a una altura h, hacia fuera; el peso m·g lo sujeta. Tomando momentos sobre la línea de las ruedas de fuera: el peso tiene un brazo de media vía (t/2) y la fuerza lateral, de h. Vuelca cuando m·a·h &gt; m·g·t/2, es decir, cuando <b>a/g &gt; t / (2h)</b>. Ese número es el <i>factor de estabilidad estática</i> (SSF) con el que la NHTSA de EE. UU. da sus estrellas de vuelco: cinco estrellas es menos de un 10 % de riesgo de vuelco en un accidente de un solo vehículo, una estrella más del 40 %; con un SSF de 1,00 su modelo predice cerca de un 45 %, y por encima de 1,2 ningún coche llega a levantar ruedas en sus pruebas dinámicas. Con vías distintas delante y detrás, cuenta la vía bajo el centro de gravedad: (t<sub>del</sub>·b + t<sub>tras</sub>·a) / L, con a y b las distancias del centro de gravedad a los ejes delantero y trasero y L la batalla.</p>
          <p><b>4. Volcar, tres ruedas.</b> Con una sola rueda en un eje, el vehículo no vuelca sobre «las dos de fuera» sino sobre la línea que va de una rueda delantera a la trasera, que está inclinada. Con dos ruedas delante (como el Aptera): <b>a/g = t·b / (2·h·L)</b>, con b la distancia del centro de gravedad al eje <i>trasero</i>: es la t/2h de antes con una vía «efectiva» t·b/L, la anchura del triángulo a la altura del centro de gravedad. Cuanto más peso delante, más estable. Con una rueda delante (como el Reliant Robin) es al revés: t·a / (2·h·L), con a la distancia al eje delantero. En general, el programa toma el polígono que forman las ruedas en el suelo y busca el lado de fuera más fácil de volcar (para cada lado, la distancia del centro de gravedad a ese lado entre h y entre lo que ese lado mira hacia fuera). Así salen también el rombo del Gota y cualquier diseño del editor. Es la misma fórmula que ya usaba el editor del Triciclo para su «Vuelco».</p>
          <p><b>5. El basculante.</b> Un vehículo que se inclina φ hacia dentro, con φ = atan(a/g), pone la resultante del peso y la fuerza lateral justo en el plano de sus ruedas, como una moto: no carga más la rueda de fuera y <b>no puede volcar</b>; solo derrapar. Eso vale hasta su inclinación máxima (25° en el Smera, que equilibra tan 25° = 0,47 g). Por encima ya no se inclina más y lo que sobra empuja sobre su vía estrecha. Con la carrocería inclinada φ, el centro de gravedad se ha movido h·sen φ hacia dentro y ha bajado a h·cos φ, así que vuelca cuando <b>a/g &gt; t / (2·h·cos φ) + tan φ</b>. En el Smera: vía 0,655 m, centro de gravedad estimado a 0,52 m: de pie volcaría a 0,63 g (menos que el agarre en seco: <i>volcaría antes de derrapar</i>, por eso necesita bascular); inclinado 25° aguanta 1,16 g, más que el agarre.</p>
          <p><b>6. Lo que llega antes, el margen y la velocidad máxima.</b> El primer límite es el menor de los dos: vuelco o agarre. Lectura: <b>OK</b> si la curva pide menos del {Math.round((1 - RESERVA) * 100)} % de ese límite; <b>al límite</b> entre el {Math.round((1 - RESERVA) * 100)} y el 100 %; por encima, <b>derrapa</b> o <b>vuelca</b>, según cuál llegue antes. El {Math.round(RESERVA * 100)} % de reserva es lo que el sólido rígido no ve: la suspensión y los neumáticos, al ceder, bajan el umbral real de vuelco un 10–15 %. Margen = 1 − a / límite. Velocidad máxima = √(límite × g × r).</p>
          <p><b>7. La vuelta.</b> «Velocidad fija»: la misma en todo el circuito. «Apurar»: cada curva al porcentaje elegido de la velocidad límite de ese vehículo en ella (la fuerza lateral, a ese porcentaje al cuadrado), y las rectas a fondo hasta su velocidad máxima, acelerando a {fmt(aceleracion(mu), 1)} m/s² y frenando a {fmt(frenada(mu), 1)} m/s² (el 70 % del agarre); igual para todos, para que solo cuenten las curvas. Con eso sale el tiempo de vuelta.</p>
          <p><b>8. Lo estimado.</b> La altura del centro de gravedad casi nunca se publica. Para los coches de la tabla se toma el {Math.round(FRACCION_ALTURA_CDG * 100)} % de su altura total, la proporción típica de un coche con la batería en el suelo y el conductor sentado (comprobación aproximada: en el Model Y da un SSF de 1,44, y Tesla anuncia cinco estrellas de vuelco, un 7,9 % de riesgo). El deslizador «¿Y si el centro de gravedad estimado estuviera…?» sube o baja esas estimaciones para ver cuánto cambia la respuesta. Los diseños del Triciclo y el Cuadriciclo del editor usan su propio centro de gravedad, calculado pieza a pieza con sus ocupantes.</p>
          <p><b>Lo que este modelo no ve.</b> (1) <i>El vuelco por tropiezo</i>: un coche que derrapa de lado y choca con un bordillo o se hunde en tierra puede volcar aunque derrape antes de volcar en asfalto; es la causa de la mayoría de los vuelcos reales, y la NHTSA usa el SSF precisamente porque predice bien ese riesgo: cuanto más alto, menos vuelcos. (2) Los transitorios: en la chicane, el cambio de lado es brusco y la carrocería oscila; un basculante necesita que su motor de inclinación llegue a tiempo. (3) Frenar o acelerar en plena curva, que gasta parte del agarre. (4) El peralte, los baches, el viento lateral. (5) Que el sistema de basculación del Smera es activo: si se avería o va lento, el vehículo se comporta como con la basculación apagada.</p>
          <div>
            <p className="font-semibold">Referencias</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>NHTSA, «Consumer Information Regulations; Federal Motor Vehicle Safety Standards; Rollover Resistance», Federal Register 66 FR 3388 (12 de enero de 2001): el factor de estabilidad estática SSF = T / 2H y sus estrellas. Ampliado con una prueba dinámica en «Consumer Information; New Car Assessment Program; Rollover Resistance», Federal Register del 14 de octubre de 2003 (documento 03-25360). Las franjas de las estrellas, el 45 % con SSF 1,00 y el umbral de 1,2 de las pruebas dinámicas: NHTSA, «Rollover Resistance» (documento técnico de la regla, nhtsa.gov).</li>
              <li>J. C. Huston, B. J. Graves y D. B. Johnson, «Three Wheeled Vehicle Dynamics», SAE Technical Paper 820139 (1982): estabilidad y vuelco de los triciclos con una y con dos ruedas delante.</li>
              <li>R. Rajamani, J. Gohl, L. Alexander y P. Starr, «Dynamics of narrow tilting vehicles», Mathematical and Computer Modelling of Dynamical Systems 9 (2), 209–231 (2003).</li>
              <li>S. Kidane, R. Rajamani, L. Alexander, P. J. Starr y M. Donath, «Development and experimental evaluation of a tilt stability control system for narrow commuter vehicles», IEEE Transactions on Control Systems Technology 18 (6), 1266–1279 (2010).</li>
              <li>Datos de cada vehículo: en «Los datos de cada vehículo», con su fuente.</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
