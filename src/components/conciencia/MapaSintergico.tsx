// The drawing of the consciousness map: an SVG world of LIENZO units, with
// pan and zoom (mouse, trackpad, touch), dragging concepts, and drawing a new
// arrow by pulling the «+» handle of a concept onto another one.
//
// It owns only what is about LOOKING (zoom, pan, the line being drawn). The map
// itself, the selection and saving belong to the page: this component reports
// gestures (`onMover`, `onFinMover`, `onConectar`, `onSeleccion`) and the page
// decides what they mean.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Sun, Moon, Flower2, Eye, EyeOff, Brain, Network, Waves, Sparkles, Hand, Ear, Mic, Wind, User, BookOpen,
  Orbit, Radar, Telescope, Infinity as Infinito, Heart, Star, Atom, Zap, Lightbulb,
} from 'lucide-react';
import { LIENZO, type Icono, type MapaConciencia, type Nodo } from '../../data/concienciaMapa';
import {
  medir, trazar, puntaDeFlecha, colorSeguro, aleatorio, anchoEtiqueta, limites, ALTO_ETIQUETA, FUENTE, FUENTE_TITULO,
  type Medida, type Punto,
} from './geometria';

export const ICONOS_LUCIDE: Record<Icono, LucideIcon | null> = {
  ninguno: null, sol: Sun, luna: Moon, loto: Flower2, ojo: Eye, ojoCerrado: EyeOff, cerebro: Brain, red: Network,
  ondas: Waves, chispas: Sparkles, mano: Hand, oido: Ear, voz: Mic, olfato: Wind, persona: User, libro: BookOpen,
  orbita: Orbit, radar: Radar, telescopio: Telescope, infinito: Infinito, corazon: Heart, estrella: Star, atomo: Atom, rayo: Zap,
  bombilla: Lightbulb,
};

export type Seleccion = { tipo: 'nodo' | 'flecha'; id: string } | null;

export interface MapaHandle {
  /** Frame the whole map. `margenAbajo`: room to keep free at the bottom (a caption over the map). */
  ajustar(margenAbajo?: number): void;
  zoom(factor: number): void;
  /** The point of the world at the centre of the screen: where a new concept appears. */
  centro(): Punto;
  svg(): SVGSVGElement | null;
}

interface Props {
  mapa: MapaConciencia;
  editando: boolean;
  seleccion: Seleccion;
  onSeleccion(s: Seleccion): void;
  onMover(id: string, x: number, y: number): void;
  onFinMover(): void;
  onConectar(de: string, a: string): void;
  /** «Conectar con…» from the panel: the next concept tapped becomes the arrow's end. */
  conectarDesde: string | null;
  /** While a walkthrough plays: the concepts in focus. The rest fade back. */
  resaltados?: string[] | null;
  /** Extra drawing on top of the map, in world units (the walkthrough). */
  capa?: (ctx: { porId: Map<string, Nodo>; medidas: Map<string, Medida> }) => ReactNode;
  className?: string;
}

// Night-sky drawing constants. This is artwork, not interface chrome: the page's
// buttons and text use Tailwind tokens; these are the paint of the picture.
const NOCHE = '#070b1f';
const TINTA = '#0b1030';
const HALO = '#060a1c';

/** Profile of a head looking right, centred on (0,0), about 140 units tall. */
const CABEZA = 'M-25,70 C-25,50 -32,38 -38,26 C-58,0 -55,-45 -25,-62 C0,-76 40,-70 50,-40 C55,-28 52,-18 56,-10 L68,8 C70,12 66,14 60,14 C63,19 61,23 57,25 C60,30 57,35 52,37 C49,46 36,48 26,46 C22,54 22,62 24,70 Z';

const idColor = (c: string) => c.replace('#', '');

function Lineas({ lineas, x, y, tam, alto = 1.2, ...resto }: { lineas: string[]; x: number; y: number; tam: number; alto?: number } & React.SVGProps<SVGTextElement>) {
  if (!lineas.length) return null;
  return (
    <text x={x} y={y} fontSize={tam} {...resto}>
      {lineas.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : tam * alto}>{l}</tspan>)}
    </text>
  );
}

function IconoEn({ icono, x, y, tam, color }: { icono?: Icono; x: number; y: number; tam: number; color: string }) {
  const C = icono ? ICONOS_LUCIDE[icono] : null;
  if (!C) return null;
  return <C x={x - tam / 2} y={y - tam / 2} width={tam} height={tam} color={color} strokeWidth={1.8} aria-hidden />;
}

// ── One concept ──────────────────────────────────────────────────────────────

function Concepto({ n, m }: { n: Nodo; m: Medida }) {
  const color = colorSeguro(n.color);
  const c = idColor(color);
  const k = Math.min(2.2, Math.max(0.5, n.tam ?? 1));
  const claro = '#f4f6ff';
  const tenue = '#c8cfee';

  switch (n.forma) {
    case 'matriz': {
      const { rx, ry } = m;
      const total = m.titulo.length * m.fT * 1.1 + m.sub.length * m.fS * 1.3;
      const fuera = n.etiquetaPos === 'abajo' || n.etiquetaPos === 'arriba';
      const y0 = n.etiquetaPos === 'abajo' ? ry + 30 * k : n.etiquetaPos === 'arriba' ? -ry - 22 * k - total : -total / 2;
      const alta = ry > rx;
      return (
        <g>
          <ellipse rx={rx * (alta ? 1.45 : 1.16)} ry={ry * (alta ? 1.12 : 1.55)} fill={`url(#cz-halo-${c})`} className="cz-latido" />
          <ellipse rx={rx} ry={ry} fill={`url(#cz-rg-${c})`} />
          <g clipPath={`url(#cz-clip-${n.id.replace(/[^\w-]/g, '')})`}>
            <rect x={-rx} y={-ry} width={rx * 2} height={ry * 2} fill={`url(#cz-red-${c})`} opacity={0.75} />
          </g>
          <ellipse rx={rx} ry={ry} fill="none" stroke={color} strokeOpacity={0.65} strokeWidth={1.6} className="cz-cuerpo" />
          <ellipse rx={rx * 0.72} ry={ry * 0.6} fill="none" stroke={color} strokeOpacity={0.25} strokeDasharray="3 9" />
          <ellipse rx={rx * 0.42} ry={ry * 0.3} fill="none" stroke={color} strokeOpacity={0.18} strokeDasharray="2 7" />
          {fuera ? null : <ellipse rx={Math.min(rx * 0.8, 400 * k)} ry={total / 2 + 30 * k} fill="url(#cz-velo)" />}
          <Lineas lineas={m.titulo} x={0} y={y0 + m.fT * 0.8} tam={m.fT} alto={1.1} textAnchor="middle" fill={claro} fontFamily={FUENTE_TITULO} fontWeight={700} letterSpacing={1.5} />
          <Lineas lineas={m.sub} x={0} y={y0 + m.titulo.length * m.fT * 1.1 + m.fS * 1.1} tam={m.fS} alto={1.3} textAnchor="middle" fill={color} fontFamily={FUENTE} fontStyle="italic" />
        </g>
      );
    }
    case 'campo': {
      const r = m.r;
      const s = (r / 80) * 0.95;
      const pos = n.etiquetaPos ?? 'abajo';
      const bloque = m.titulo.length * m.fT * 1.15 + m.sub.length * m.fS * 1.3;
      let tx = 0, ty = r * 1.38 + m.fT, ancla: 'middle' | 'start' | 'end' = 'middle';
      if (pos === 'derecha') { tx = r * 1.42; ty = -bloque / 2 + m.fT * 0.85; ancla = 'start'; }
      if (pos === 'izquierda') { tx = -r * 1.42; ty = -bloque / 2 + m.fT * 0.85; ancla = 'end'; }
      if (pos === 'arriba') { ty = -r * 1.38 - bloque + m.fT * 0.85; }
      return (
        <g>
          <circle r={r * 1.6} fill={`url(#cz-rg-${c})`} opacity={0.3} className="cz-respira" />
          {/* The neuronal field is a distortion of the lattice, so it is drawn as the same mesh. */}
          <g className="cz-giro-lento">
            <circle r={r * 1.45} fill={`url(#cz-malla-${c})`} mask="url(#cz-fundido)" />
          </g>
          <circle r={r * 1.45} fill="none" stroke={color} strokeOpacity={0.4} strokeDasharray="2 10" className="cz-giro" />
          <circle r={r} fill={TINTA} opacity={0.55} />
          <circle r={r} fill="none" stroke={color} strokeOpacity={0.7} strokeWidth={1.4} className="cz-cuerpo" />
          <g transform={`scale(${n.espejo ? -s : s},${s})`}>
            <path d={CABEZA} fill={`url(#cz-cabeza-${c})`} stroke={color} strokeWidth={1.6 / s} strokeOpacity={0.9} />
            <circle cx={6} cy={-28} r={30} fill={`url(#cz-rg-${c})`} className="cz-latido" />
            <circle cx={6} cy={-28} r={7} fill={claro} opacity={0.9} />
            {[[-14, -38], [24, -44], [-6, -6], [22, -14], [-22, -18]].map(([px, py], i) => (
              <g key={i}>
                <line x1={6} y1={-28} x2={px} y2={py} stroke={claro} strokeOpacity={0.35} strokeWidth={0.8 / s} />
                <circle cx={px} cy={py} r={2.4} fill={claro} opacity={0.75} />
              </g>
            ))}
          </g>
          <Lineas lineas={m.titulo} x={tx} y={ty} tam={m.fT} alto={1.15} textAnchor={ancla} fill={claro} fontFamily={FUENTE_TITULO} fontWeight={700} />
          <Lineas lineas={m.sub} x={tx} y={ty + m.titulo.length * m.fT * 1.15 - m.fT * 0.15 + m.fS * 0.6} tam={m.fS} alto={1.3} textAnchor={ancla} fill={color} fontFamily={FUENTE} fontStyle="italic" />
        </g>
      );
    }
    case 'estado': {
      const { w, h } = m;
      const ix = -w / 2 + 54 * k;
      const tx = -w / 2 + 104 * k;
      const bloque = m.titulo.length * m.fT * 1.12 + m.sub.length * m.fS * 1.3;
      const ty = -bloque / 2 + m.fT * 0.82;
      return (
        <g>
          <rect x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 12} rx={(h + 12) / 2} fill={`url(#cz-rg-${c})`} opacity={0.35} className="cz-latido" />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={TINTA} opacity={0.92} />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={`url(#cz-lg-${c})`} stroke={color} strokeOpacity={0.75} strokeWidth={1.5} className="cz-cuerpo" />
          <circle cx={ix} cy={0} r={36 * k} fill={`url(#cz-rg-${c})`} />
          <circle cx={ix} cy={0} r={30 * k} fill={color} opacity={0.92} />
          <IconoEn icono={n.icono} x={ix} y={0} tam={32 * k} color={TINTA} />
          <Lineas lineas={m.titulo} x={tx} y={ty} tam={m.fT} alto={1.12} fill={claro} fontFamily={FUENTE_TITULO} fontWeight={700} />
          <Lineas lineas={m.sub} x={tx} y={ty + m.titulo.length * m.fT * 1.12 - m.fT * 0.2 + m.fS} tam={m.fS} alto={1.3} fill={tenue} fontFamily={FUENTE} fontStyle="italic" />
        </g>
      );
    }
    case 'nivel': {
      const { w, h } = m;
      const bloque = m.titulo.length * m.fT * 1.2 + m.sub.length * m.fS * 1.3;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={TINTA} opacity={0.9} />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={`url(#cz-lg-${c})`} stroke={color} strokeOpacity={0.6} strokeWidth={1.2} className="cz-cuerpo" />
          <circle cx={-w / 2 + 22 * k} cy={0} r={7 * k} fill={color} className="cz-latido" />
          <Lineas lineas={m.titulo} x={10 * k} y={-bloque / 2 + m.fT * 0.85} tam={m.fT} textAnchor="middle" fill={claro} fontFamily={FUENTE} fontWeight={600} />
          <Lineas lineas={m.sub} x={10 * k} y={-bloque / 2 + m.titulo.length * m.fT * 1.2 + m.fS * 0.7} tam={m.fS} alto={1.3} textAnchor="middle" fill={tenue} fontFamily={FUENTE} fontStyle="italic" />
        </g>
      );
    }
    case 'capacidad': {
      const { w, h } = m;
      const conIcono = !!n.icono && n.icono !== 'ninguno';
      const tx = -w / 2 + (conIcono ? 60 : 16) * k;
      const bloque = m.titulo.length * m.fT * 1.2 + m.sub.length * m.fS * 1.3;
      const estrella = (x: number, y: number, r: number) =>
        `M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z`;
      return (
        <g>
          <rect x={-w / 2 - 8} y={-h / 2 - 8} width={w + 16} height={h + 16} rx={22} fill={`url(#cz-rg-${c})`} opacity={0.4} className="cz-latido" />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={16 * k} fill={TINTA} opacity={0.92} stroke={color} strokeOpacity={0.8} strokeWidth={1.4} className="cz-cuerpo" />
          {conIcono && <circle cx={-w / 2 + 31 * k} cy={0} r={21 * k} fill={color} opacity={0.16} stroke={color} strokeOpacity={0.6} />}
          {conIcono && <IconoEn icono={n.icono} x={-w / 2 + 31 * k} y={0} tam={24 * k} color={color} />}
          <path d={estrella(w / 2 - 12 * k, -h / 2 + 2, 9 * k)} fill={color} className="cz-latido" />
          <path d={estrella(w / 2 + 2, -h / 2 + 16 * k, 4.5 * k)} fill={color} opacity={0.7} />
          <Lineas lineas={m.titulo} x={tx} y={-bloque / 2 + m.fT * 0.85} tam={m.fT} fill={claro} fontFamily={FUENTE} fontWeight={600} />
          <Lineas lineas={m.sub} x={tx} y={-bloque / 2 + m.titulo.length * m.fT * 1.2 + m.fS * 0.7} tam={m.fS} alto={1.3} fill={tenue} fontFamily={FUENTE} fontStyle="italic" />
        </g>
      );
    }
    case 'canal': {
      const { w, h } = m;
      let y = -h / 2 + 18 * k + m.fT * 0.85;
      const tituloY = y;
      y += m.titulo.length * m.fT * 1.2 - m.fT * 0.2;
      const subY = y + m.fS * 0.85;
      y += m.sub.length * m.fS * 1.35 + 10 * k;
      const conIcono = !!n.icono && n.icono !== 'ninguno';
      return (
        <g>
          <rect x={-w / 2 - 8} y={-h / 2 - 8} width={w + 16} height={h + 16} rx={28 * k} fill={`url(#cz-rg-${c})`} opacity={0.3} className="cz-latido" />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22 * k} fill={TINTA} opacity={0.92} />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22 * k} fill={`url(#cz-lg-${c})`} stroke={color} strokeOpacity={0.75} strokeWidth={1.4} className="cz-cuerpo" />
          {conIcono && <IconoEn icono={n.icono} x={-w / 2 + 26 * k} y={-h / 2 + 26 * k} tam={20 * k} color={color} />}
          <Lineas lineas={m.titulo} x={0} y={tituloY} tam={m.fT} textAnchor="middle" fill={claro} fontFamily={FUENTE_TITULO} fontWeight={700} />
          <Lineas lineas={m.sub} x={0} y={subY} tam={m.fS} alto={1.35} textAnchor="middle" fill={color} fontFamily={FUENTE} fontStyle="italic" />
          {m.filas.map((fila, i) => {
            const anchos = fila.map(e => anchoEtiqueta(e, m.fX));
            const total = anchos.reduce((s, a) => s + a, 0) + (fila.length - 1) * 6;
            let x = -total / 2;
            const fy = y + i * (ALTO_ETIQUETA + 6) * k;
            return fila.map((e, j) => {
              const ex = x; x += anchos[j] + 6;
              return (
                <g key={`${i}-${j}`}>
                  <rect x={ex} y={fy} width={anchos[j]} height={ALTO_ETIQUETA * k} rx={12 * k} fill={color} fillOpacity={0.16} stroke={color} strokeOpacity={0.55} />
                  <text x={ex + anchos[j] / 2} y={fy + ALTO_ETIQUETA * k * 0.68} fontSize={m.fX} textAnchor="middle" fill={claro} fontFamily={FUENTE}>{e}</text>
                </g>
              );
            });
          })}
        </g>
      );
    }
    case 'nota': {
      const { w, h } = m;
      const ty = -h / 2 + 18 * k + m.fT * 0.85;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={14 * k} fill={TINTA} opacity={0.82} stroke={color} strokeOpacity={0.55} strokeDasharray="5 6" className="cz-cuerpo" />
          <Lineas lineas={m.titulo} x={-w / 2 + 16 * k} y={ty} tam={m.fT} alto={1.25} fill={color} fontFamily={FUENTE} fontWeight={700} />
          <Lineas lineas={m.texto} x={-w / 2 + 16 * k} y={ty + m.titulo.length * m.fT * 1.25 + m.fX * 0.5} tam={m.fX} alto={1.4} fill={tenue} fontFamily={FUENTE} />
        </g>
      );
    }
    case 'estudio': {
      const { w, h } = m;
      const bloque = m.titulo.length * m.fT * 1.25 + m.fS * 1.4;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10 * k} fill={TINTA} opacity={0.9} stroke={color} strokeOpacity={0.6} strokeDasharray="6 4" className="cz-cuerpo" />
          <IconoEn icono={n.icono && n.icono !== 'ninguno' ? n.icono : 'libro'} x={-w / 2 + 26 * k} y={0} tam={22 * k} color={color} />
          <Lineas lineas={m.titulo} x={-w / 2 + 50 * k} y={-bloque / 2 + m.fT * 0.85} tam={m.fT} alto={1.25} fill={claro} fontFamily={FUENTE} fontWeight={600} />
          <Lineas lineas={m.sub} x={-w / 2 + 50 * k} y={-bloque / 2 + m.titulo.length * m.fT * 1.25 + m.fS * 0.8} tam={m.fS} fill={color} fontFamily={FUENTE} />
        </g>
      );
    }
    case 'consejos': {
      // Folded: a pill with a bulb, the title and a «+». Tapping it opens the window.
      const { w, h } = m;
      return (
        <g>
          <rect x={-w / 2 - 5} y={-h / 2 - 5} width={w + 10} height={h + 10} rx={(h + 10) / 2} fill={`url(#cz-rg-${c})`} opacity={0.35} className="cz-latido" />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={TINTA} opacity={0.95} stroke={color} strokeOpacity={0.9} strokeWidth={1.4} className="cz-cuerpo" />
          <circle cx={-w / 2 + h / 2} cy={0} r={h / 2 - 5} fill={color} />
          <IconoEn icono={n.icono && n.icono !== 'ninguno' ? n.icono : 'bombilla'} x={-w / 2 + h / 2} y={0} tam={h * 0.5} color={TINTA} />
          <text x={-w / 2 + h + 8 * k} y={m.fT * 0.36} fontSize={m.fT} fill={claro} fontFamily={FUENTE} fontWeight={600}>{m.titulo[0] || ''}</text>
          <circle cx={w / 2 - h / 2} cy={0} r={h / 2 - 8} fill="none" stroke={color} strokeWidth={1.4} />
          <path d={`M${w / 2 - h / 2 - 5},0 H${w / 2 - h / 2 + 5} M${w / 2 - h / 2},-5 V5`} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      );
    }
    case 'franja': {
      const { w, h } = m;
      const tx = -w / 2 + 22 * k, ty = -h / 2 + 30 * k;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={30 * k} fill={color} fillOpacity={0.055} stroke={color} strokeOpacity={0.28} strokeDasharray="10 8" className="cz-cuerpo" />
          <text x={tx} y={ty} fontSize={m.fT} fill={color} fontFamily={FUENTE_TITULO} fontWeight={700} letterSpacing={3}>{m.titulo[0] || ''}</text>
          <Lineas lineas={m.sub} x={tx} y={ty + m.fT * 0.6 + m.fS * 1.1} tam={m.fS} alto={1.3} fill={tenue} fontFamily={FUENTE} fontStyle="italic" />
        </g>
      );
    }
    case 'titulo':
    default: {
      return (
        <g>
          <rect x={-m.w / 2} y={-m.h / 2} width={m.w} height={m.h} fill="transparent" />
          <text x={0} y={m.fT * 0.35} fontSize={m.fT} textAnchor="middle" fill={color} fontFamily={FUENTE_TITULO} fontWeight={700} letterSpacing={3} className="cz-cuerpo">
            {n.titulo.toUpperCase()}
          </text>
          <line x1={-m.w / 2 + 10} x2={m.w / 2 - 10} y1={m.fT * 0.95} y2={m.fT * 0.95} stroke={`url(#cz-raya-${c})`} strokeWidth={1.2} />
        </g>
      );
    }
  }
}

function contorno(m: Medida): { tipo: 'circulo' | 'elipse' | 'rect'; w: number; h: number } {
  if (m.borde === 'circulo') return { tipo: 'circulo', w: m.r * 2.9, h: m.r * 2.9 };
  if (m.borde === 'elipse') return { tipo: 'elipse', w: m.rx * 2 + 24, h: m.ry * 2 + 24 };
  return { tipo: 'rect', w: m.w + 18, h: m.h + 18 };
}

/** Where the «+» handle sits, relative to the node centre. */
function posAsa(m: Medida): Punto {
  if (m.borde === 'circulo') return { x: m.r * 1.12 + 22, y: -m.r * 0.9 };
  if (m.borde === 'elipse') return { x: m.rx * 0.62, y: -m.ry - 22 };
  return { x: m.w / 2 + 20, y: 0 };
}

// ── The whole map ───────────────────────────────────────────────────────────

type Gesto =
  | { tipo: 'nada' }
  | { tipo: 'pan'; x0: number; y0: number; tx0: number; ty0: number; movido: boolean }
  | { tipo: 'nodo'; id: string; dx: number; dy: number; x0: number; y0: number; movido: boolean }
  | { tipo: 'flecha'; id: string; x0: number; y0: number; movido: boolean }
  | { tipo: 'asa'; de: string }
  | { tipo: 'pinza'; d0: number; k0: number; cx: number; cy: number; tx0: number; ty0: number };

export const MapaSintergico = forwardRef<MapaHandle, Props>(function MapaSintergico(
  { mapa, editando, seleccion, onSeleccion, onMover, onFinMover, onConectar, conectarDesde, resaltados, capa, className }, ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 800, h: 600 });
  const [vista, setVista] = useState({ k: 0.5, tx: 0, ty: 0 });
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const gesto = useRef<Gesto>({ tipo: 'nada' });
  const punteros = useRef(new Map<number, Punto>());
  const [lineaTemp, setLineaTemp] = useState<{ de: Punto; a: Punto } | null>(null);
  const ajustado = useRef(false);
  /** The bottom room asked for by the last `ajustar`, kept when the box resizes. */
  const margenFijo = useRef(0);

  const medidas = useMemo(() => {
    const m = new Map<string, Medida>();
    for (const n of mapa.nodos) m.set(n.id, medir(n));
    return m;
  }, [mapa.nodos]);
  const porId = useMemo(() => new Map(mapa.nodos.map(n => [n.id, n])), [mapa.nodos]);

  const colores = useMemo(() => {
    const s = new Set<string>();
    for (const n of mapa.nodos) s.add(colorSeguro(n.color));
    for (const f of mapa.flechas) s.add(colorSeguro(f.color));
    return [...s];
  }, [mapa]);

  const estrellas = useMemo(() => {
    const r = aleatorio(1946);
    return Array.from({ length: 170 }, () => ({
      x: -300 + r() * (LIENZO.ancho + 600), y: -300 + r() * (LIENZO.alto + 600),
      r: 0.4 + r() * 1.5, o: 0.15 + r() * 0.7, t: r() < 0.25, d: r() * 6,
    }));
  }, []);

  const ajustar = useCallback((margenAbajo = 0) => {
    const { x0, y0, x1, y1 } = limites(mapa.nodos);
    // Room for the toolbar on top and the hint line (or a caption) at the bottom.
    const lado = 16, arriba = 64, abajo = 34 + Math.max(0, margenAbajo);
    const anchoUtil = tam.w - lado * 2, altoUtil = tam.h - arriba - abajo;
    const k = Math.min(anchoUtil / (x1 - x0), altoUtil / (y1 - y0), 1.4);
    setVista({ k, tx: lado + (anchoUtil - (x1 - x0) * k) / 2 - x0 * k, ty: arriba + (altoUtil - (y1 - y0) * k) / 2 - y0 * k });
  }, [mapa.nodos, tam]);

  const zoomEn = useCallback((factor: number, cx?: number, cy?: number) => {
    setVista(v => {
      const k = Math.min(4, Math.max(0.12, v.k * factor));
      const px = cx ?? tam.w / 2, py = cy ?? tam.h / 2;
      return { k, tx: px - (px - v.tx) * (k / v.k), ty: py - (py - v.ty) * (k / v.k) };
    });
  }, [tam]);

  useImperativeHandle(ref, () => ({
    ajustar: (margenAbajo?: number) => { margenFijo.current = margenAbajo ?? 0; ajustar(margenAbajo); },
    zoom: (f: number) => zoomEn(f),
    centro: () => ({ x: (tam.w / 2 - vistaRef.current.tx) / vistaRef.current.k, y: (tam.h / 2 - vistaRef.current.ty) / vistaRef.current.k }),
    svg: () => svgRef.current,
  }), [ajustar, zoomEn, tam]);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setTam({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Fit once when the box first has a size, and again whenever the box changes
  // size a lot (rotating a phone, entering full screen).
  const ultimoTam = useRef(tam);
  useEffect(() => {
    if (tam.w < 50) return;
    const cambio = Math.abs(tam.w - ultimoTam.current.w) > 80 || Math.abs(tam.h - ultimoTam.current.h) > 80;
    if (!ajustado.current || cambio) { ajustar(margenFijo.current); ajustado.current = true; ultimoTam.current = tam; }
  }, [tam, ajustar]);

  // The side panel (bottom sheet on phones) opens over the map when something is
  // selected. If the chosen concept would end up under it — and with it its «+»
  // handle — slide the view just enough to keep it in sight.
  useEffect(() => {
    if (seleccion?.tipo !== 'nodo') return;
    const n = porId.get(seleccion.id);
    const m = n && medidas.get(n.id);
    if (!n || !m) return;
    const v = vistaRef.current;
    if (tam.w >= 768) {
      const limite = tam.w - 395;
      const borde = v.tx + n.x * v.k + (m.w / 2 + 48) * v.k;
      if (borde > limite) setVista(x => ({ ...x, tx: x.tx - (borde - limite) }));
    } else {
      const limite = tam.h * 0.36;
      const borde = v.ty + n.y * v.k + (m.h / 2) * v.k;
      if (borde > limite) setVista(x => ({ ...x, ty: x.ty - (borde - limite) }));
    }
    // Only when the selection changes, not on every drag frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion?.tipo, seleccion?.id]);

  // SVG's own animations (the walkthrough) do not obey CSS; pause them by hand
  // for people who asked their system for less motion.
  useEffect(() => {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) svgRef.current?.pauseAnimations(); } catch { /* old browser */ }
  }, [capa]);

  // Ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms; a plain
  // wheel keeps scrolling the page, so the map never traps someone reading below it.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEn(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => el.removeEventListener('wheel', rueda);
  }, [zoomEn]);

  const aMundo = (clientX: number, clientY: number): Punto => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = vistaRef.current;
    return { x: (clientX - r.left - v.tx) / v.k, y: (clientY - r.top - v.ty) / v.k };
  };

  const nodoBajo = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY) as Element | null;
    return el?.closest('[data-nodo]')?.getAttribute('data-nodo') ?? null;
  };

  const abajo = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== undefined && e.button > 0) return;
    const svg = svgRef.current!;
    svg.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = vistaRef.current;

    if (punteros.current.size === 2) {
      const [p, q] = [...punteros.current.values()];
      const r = svg.getBoundingClientRect();
      gesto.current = { tipo: 'pinza', d0: Math.hypot(p.x - q.x, p.y - q.y), k0: v.k, cx: (p.x + q.x) / 2 - r.left, cy: (p.y + q.y) / 2 - r.top, tx0: v.tx, ty0: v.ty };
      setLineaTemp(null);
      return;
    }
    const objetivo = e.target as Element;
    const asa = objetivo.closest('[data-asa]')?.getAttribute('data-asa');
    if (asa && editando) {
      const n = porId.get(asa);
      if (n) {
        gesto.current = { tipo: 'asa', de: asa };
        setLineaTemp({ de: { x: n.x, y: n.y }, a: aMundo(e.clientX, e.clientY) });
      }
      return;
    }
    const idNodo = objetivo.closest('[data-nodo]')?.getAttribute('data-nodo');
    if (idNodo) {
      const n = porId.get(idNodo)!;
      const p = aMundo(e.clientX, e.clientY);
      gesto.current = { tipo: 'nodo', id: idNodo, dx: p.x - n.x, dy: p.y - n.y, x0: e.clientX, y0: e.clientY, movido: false };
      return;
    }
    const idFlecha = objetivo.closest('[data-flecha]')?.getAttribute('data-flecha');
    if (idFlecha) {
      gesto.current = { tipo: 'flecha', id: idFlecha, x0: e.clientX, y0: e.clientY, movido: false };
      return;
    }
    gesto.current = { tipo: 'pan', x0: e.clientX, y0: e.clientY, tx0: v.tx, ty0: v.ty, movido: false };
  };

  const mueve = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    switch (g.tipo) {
      case 'pinza': {
        const [p, q] = [...punteros.current.values()];
        if (!p || !q) return;
        const k = Math.min(4, Math.max(0.12, g.k0 * Math.hypot(p.x - q.x, p.y - q.y) / (g.d0 || 1)));
        setVista({ k, tx: g.cx - (g.cx - g.tx0) * (k / g.k0), ty: g.cy - (g.cy - g.ty0) * (k / g.k0) });
        return;
      }
      case 'pan': {
        const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
        if (!g.movido && Math.hypot(dx, dy) < 4) return;
        g.movido = true;
        setVista(v => ({ ...v, tx: g.tx0 + dx, ty: g.ty0 + dy }));
        return;
      }
      case 'nodo': {
        if (!g.movido && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 4) return;
        if (!editando) {
          // Exploring: dragging a concept moves the view instead, so nothing changes by accident.
          const v = vistaRef.current;
          gesto.current = { tipo: 'pan', x0: e.clientX, y0: e.clientY, tx0: v.tx, ty0: v.ty, movido: true };
          return;
        }
        g.movido = true;
        const p = aMundo(e.clientX, e.clientY);
        onMover(g.id, Math.round((p.x - g.dx) / 2) * 2, Math.round((p.y - g.dy) / 2) * 2);
        return;
      }
      case 'flecha': {
        if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) >= 4) {
          const v = vistaRef.current;
          gesto.current = { tipo: 'pan', x0: e.clientX, y0: e.clientY, tx0: v.tx, ty0: v.ty, movido: true };
        }
        return;
      }
      case 'asa': {
        setLineaTemp(l => (l ? { ...l, a: aMundo(e.clientX, e.clientY) } : l));
        return;
      }
    }
  };

  const arriba = (e: React.PointerEvent<SVGSVGElement>) => {
    punteros.current.delete(e.pointerId);
    try { svgRef.current?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    const g = gesto.current;
    if (g.tipo === 'pinza') { gesto.current = { tipo: 'nada' }; return; }
    gesto.current = { tipo: 'nada' };
    switch (g.tipo) {
      case 'nodo':
        if (g.movido) { onFinMover(); return; }
        if (conectarDesde && conectarDesde !== g.id) { onConectar(conectarDesde, g.id); return; }
        onSeleccion({ tipo: 'nodo', id: g.id });
        return;
      case 'flecha':
        onSeleccion({ tipo: 'flecha', id: g.id });
        return;
      case 'pan':
        if (!g.movido) onSeleccion(null);
        return;
      case 'asa': {
        setLineaTemp(null);
        const a = nodoBajo(e.clientX, e.clientY);
        if (a && a !== g.de) onConectar(g.de, a);
        return;
      }
    }
  };

  const cancelar = (e: React.PointerEvent<SVGSVGElement>) => {
    punteros.current.delete(e.pointerId);
    if (gesto.current.tipo === 'nodo' && (gesto.current as any).movido) onFinMover();
    gesto.current = { tipo: 'nada' };
    setLineaTemp(null);
  };

  const foco = useMemo(() => (resaltados ? new Set(resaltados) : null), [resaltados]);
  /** Lanes and the matrix never fade: they are the stage the walkthrough happens on. */
  const enFoco = (id: string) => {
    if (!foco) return true;
    if (foco.has(id)) return true;
    const n = porId.get(id);
    return n?.forma === 'matriz' || n?.forma === 'franja';
  };

  const sel = seleccion;
  const nodoSel = sel?.tipo === 'nodo' ? porId.get(sel.id) : undefined;

  return (
    <div ref={caja} className={className} style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        width="100%" height="100%"
        role="img"
        aria-label="Mapa de la teoría sintérgica de Jacobo Grinberg: el campo mental del ser humano interactúa con la matriz fundamental del universo en vigilia, en sueño y en meditación, y dos campos mentales se comunican por los sentidos y a través de la matriz."
        style={{ display: 'block', userSelect: 'none', cursor: conectarDesde ? 'crosshair' : 'grab', background: NOCHE }}
        onPointerDown={abajo} onPointerMove={mueve} onPointerUp={arriba} onPointerCancel={cancelar}
        data-mundo={JSON.stringify(LIENZO)}
      >
        <style>{`
          @keyframes cz-flujo { to { stroke-dashoffset: -48; } }
          @keyframes cz-respira { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
          @keyframes cz-latido { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
          @keyframes cz-giro { to { transform: rotate(360deg); } }
          .cz-flujo { animation: cz-flujo 1.4s linear infinite; }
          .cz-respira { transform-box: fill-box; transform-origin: center; animation: cz-respira 6s ease-in-out infinite; }
          .cz-latido { animation: cz-latido 4.5s ease-in-out infinite; }
          .cz-giro { transform-box: fill-box; transform-origin: center; animation: cz-giro 60s linear infinite; }
          @keyframes cz-aparece { from { opacity: 0; } to { opacity: 1; } }
          .cz-aparece { animation: cz-aparece .7s ease both; }
          .cz-giro-lento { transform-box: fill-box; transform-origin: center; animation: cz-giro 180s linear infinite; }
          [data-nodo], [data-flecha] { transition: opacity .45s ease; }
          [data-nodo] { cursor: ${editando ? 'move' : 'pointer'}; }
          [data-nodo]:hover .cz-cuerpo { filter: brightness(1.35); }
          [data-flecha] { cursor: pointer; }
          [data-flecha]:hover .cz-trazo { stroke-opacity: 1; }
          [data-asa] { cursor: crosshair; }
          @media (prefers-reduced-motion: reduce) { .cz-flujo, .cz-respira, .cz-latido, .cz-giro, .cz-giro-lento { animation: none; } }
        `}</style>
        <defs>
          <radialGradient id="cz-cielo" cx="50%" cy="58%" r="75%">
            <stop offset="0%" stopColor="#1a1450" />
            <stop offset="55%" stopColor="#0b1033" />
            <stop offset="100%" stopColor={NOCHE} />
          </radialGradient>
          <radialGradient id="cz-fundido-grad">
            <stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <stop offset="55%" stopColor="#fff" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <mask id="cz-fundido" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="url(#cz-fundido-grad)" />
          </mask>
          <radialGradient id="cz-velo">
            <stop offset="0%" stopColor={HALO} stopOpacity={0.8} />
            <stop offset="60%" stopColor={HALO} stopOpacity={0.55} />
            <stop offset="100%" stopColor={HALO} stopOpacity={0} />
          </radialGradient>
          <filter id="cz-desenfoque" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
          {colores.map(col => {
            const c = idColor(col);
            return (
              <g key={c}>
                <radialGradient id={`cz-rg-${c}`}>
                  <stop offset="0%" stopColor={col} stopOpacity={0.85} />
                  <stop offset="45%" stopColor={col} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={col} stopOpacity={0} />
                </radialGradient>
                <radialGradient id={`cz-halo-${c}`}>
                  <stop offset="0%" stopColor={col} stopOpacity={0.22} />
                  <stop offset="70%" stopColor={col} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={col} stopOpacity={0} />
                </radialGradient>
                <linearGradient id={`cz-lg-${c}`} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={col} stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id={`cz-cabeza-${c}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={col} stopOpacity={0.12} />
                </linearGradient>
                <linearGradient id={`cz-raya-${c}`} x1="0" x2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={0} />
                  <stop offset="50%" stopColor={col} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={col} stopOpacity={0} />
                </linearGradient>
                {/* The lattice: a triangular net whose vertices glow, tinted per colour. */}
                <pattern id={`cz-red-${c}`} width="40" height="69.28" patternUnits="userSpaceOnUse">
                  <path d="M0,0 H40 M0,34.64 H40 M0,69.28 H40 M0,0 L20,34.64 L40,0 M0,69.28 L20,34.64 L40,69.28" stroke={col} strokeOpacity={0.45} strokeWidth={0.7} fill="none" />
                  {[[0, 0], [40, 0], [20, 34.64], [0, 69.28], [40, 69.28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.7} fill={col} opacity={0.9} />)}
                </pattern>
                {/* The same net, finer and brighter: the neuronal field of a person. */}
                <pattern id={`cz-malla-${c}`} width="24" height="41.57" patternUnits="userSpaceOnUse">
                  <path d="M0,0 H24 M0,20.78 H24 M0,41.57 H24 M0,0 L12,20.78 L24,0 M0,41.57 L12,20.78 L24,41.57" stroke={col} strokeOpacity={0.8} strokeWidth={0.8} fill="none" />
                  {[[0, 0], [24, 0], [12, 20.78], [0, 41.57], [24, 41.57]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.5} fill={col} />)}
                </pattern>
              </g>
            );
          })}
          <pattern id="cz-red-fondo" width="40" height="69.28" patternUnits="userSpaceOnUse">
            <path d="M0,0 H40 M0,34.64 H40 M0,69.28 H40 M0,0 L20,34.64 L40,0 M0,69.28 L20,34.64 L40,69.28" stroke="#5ee6d0" strokeOpacity={0.5} strokeWidth={0.5} fill="none" />
          </pattern>
          <radialGradient id="cz-mascara-grad" cx="50%" cy="59%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
            <stop offset="60%" stopColor="#fff" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.03} />
          </radialGradient>
          <mask id="cz-mascara" maskUnits="userSpaceOnUse" x={-400} y={-400} width={LIENZO.ancho + 800} height={LIENZO.alto + 800}>
            <rect x={-400} y={-400} width={LIENZO.ancho + 800} height={LIENZO.alto + 800} fill="url(#cz-mascara-grad)" />
          </mask>
          {mapa.nodos.filter(n => n.forma === 'matriz').map(n => {
            const m = medidas.get(n.id)!;
            return <clipPath key={n.id} id={`cz-clip-${n.id.replace(/[^\w-]/g, '')}`}><ellipse rx={m.rx} ry={m.ry} /></clipPath>;
          })}
        </defs>

        <rect x={0} y={0} width="100%" height="100%" fill="url(#cz-cielo)" data-fondo />

        <g transform={`translate(${vista.tx},${vista.ty}) scale(${vista.k})`} data-mundo-g>
          {/* The whole universe sits on the lattice: faint everywhere, brighter near the centre. */}
          <rect x={-400} y={-400} width={LIENZO.ancho + 800} height={LIENZO.alto + 800} fill="url(#cz-red-fondo)" mask="url(#cz-mascara)" opacity={0.35} />
          {estrellas.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} className={s.t ? 'cz-latido' : undefined} style={s.t ? { animationDelay: `-${s.d}s` } : undefined} />
          ))}

          {/* Background concepts first (lanes, the matrix), then arrows, then the rest. */}
          {mapa.nodos.filter(n => n.forma === 'franja' || n.forma === 'matriz').map(n => (
            <g key={n.id} data-nodo={n.id} transform={`translate(${n.x},${n.y})`} opacity={enFoco(n.id) ? 1 : 0.4}>
              <Concepto n={n} m={medidas.get(n.id)!} />
            </g>
          ))}

          {mapa.flechas.map(f => {
            const a = porId.get(f.de), b = porId.get(f.a);
            if (!a || !b) return null;
            const t = trazar(f, a, medidas.get(a.id)!, b, medidas.get(b.id)!);
            if (!t) return null;
            const color = colorSeguro(f.color);
            const g = Math.min(8, Math.max(1, f.grosor ?? 2));
            const elegida = sel?.tipo === 'flecha' && sel.id === f.id;
            const raya = f.estilo === 'discontinua' ? '10 8' : f.estilo === 'puntos' ? '0.5 9' : undefined;
            return (
              <g key={f.id} data-flecha={f.id} opacity={enFoco(f.de) && enFoco(f.a) ? 1 : 0.15}>
                <path d={t.dBase} stroke="transparent" strokeWidth={Math.max(18, g + 14)} fill="none" style={{ pointerEvents: 'stroke' }} />
                {elegida && <path d={t.d} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={g + 9} fill="none" strokeLinecap="round" data-ui />}
                {f.estilo === 'energia' ? (
                  <>
                    <path d={t.d} stroke={color} strokeWidth={g * 4} strokeOpacity={0.25} fill="none" filter="url(#cz-desenfoque)" />
                    <path d={t.d} stroke={color} strokeWidth={g} strokeOpacity={0.6} fill="none" className="cz-trazo" />
                    <path d={t.d} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={Math.max(1, g * 0.8)} fill="none" strokeDasharray="3 21" strokeLinecap="round" className="cz-flujo" />
                  </>
                ) : (
                  <path d={t.d} stroke={color} strokeWidth={f.estilo === 'puntos' ? g + 1.5 : g} strokeOpacity={0.85} fill="none" strokeDasharray={raya} strokeLinecap="round" strokeLinejoin="round" className="cz-trazo" />
                )}
                {t.puntas.map((p, i) => <polygon key={i} points={puntaDeFlecha(p.punta, p.dir, g)} fill={color} />)}
                {f.etiqueta && (
                  <text x={t.medio.x} y={t.medio.y + 4} fontSize={14} textAnchor="middle" fontFamily={FUENTE} fontStyle="italic"
                    fill="#eef1ff" stroke={HALO} strokeWidth={5} strokeOpacity={0.9} paintOrder="stroke" strokeLinejoin="round">
                    {f.etiqueta}
                  </text>
                )}
              </g>
            );
          })}

          {/* The concepts. */}
          {mapa.nodos.filter(n => n.forma !== 'franja' && n.forma !== 'matriz').map(n => {
            const m = medidas.get(n.id)!;
            return (
              <g key={n.id} data-nodo={n.id} transform={`translate(${n.x},${n.y})`} opacity={enFoco(n.id) ? 1 : 0.22}>
                <Concepto n={n} m={m} />
              </g>
            );
          })}

          {capa && <g pointerEvents="none" data-capa>{capa({ porId, medidas })}</g>}

          {/* Selection, the «+» handle and the arrow being drawn: interface, left out of exports. */}
          <g data-ui>
            {nodoSel && (() => {
              const m = medidas.get(nodoSel.id)!;
              const c = contorno(m);
              const forma: ReactNode = c.tipo === 'circulo'
                ? <circle r={c.w / 2} />
                : c.tipo === 'elipse' ? <ellipse rx={c.w / 2} ry={c.h / 2} />
                  : <rect x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} rx={16} />;
              const asa = posAsa(m);
              return (
                <g transform={`translate(${nodoSel.x},${nodoSel.y})`}>
                  <g fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={1.5 / Math.max(0.5, vista.k)} strokeDasharray="6 5" pointerEvents="none">{forma}</g>
                  {editando && (
                    <g data-asa={nodoSel.id} transform={`translate(${asa.x},${asa.y})`}>
                      <circle r={22} fill="transparent" />
                      <circle r={13} fill={colorSeguro(nodoSel.color)} stroke="#ffffff" strokeWidth={2} />
                      <path d="M-6,0 H6 M0,-6 V6" stroke={TINTA} strokeWidth={2.6} strokeLinecap="round" />
                    </g>
                  )}
                </g>
              );
            })()}
            {lineaTemp && (
              <line x1={lineaTemp.de.x} y1={lineaTemp.de.y} x2={lineaTemp.a.x} y2={lineaTemp.a.y} stroke="#ffffff" strokeWidth={2} strokeDasharray="8 6" pointerEvents="none" />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
});
