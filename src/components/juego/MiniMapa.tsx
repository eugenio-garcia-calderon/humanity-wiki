import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { Map as MapIcon, X, Maximize2, UserPlus, Building2, Bot } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Agente, ProyectoJuego } from './tipos';
import { MITAD, PLAZA_R, CAMINOS, NAVES, LAGOS, DISTRITO, casasAldea, trazadoRio, posicionProyecto } from './mapa';
import { CASA_DEL_ROBOT } from './Robot';

// ============================================================================
// JUEGO VITAL — minimapa estilo GTA (2026-08-18, petición de Eugenio)
// ============================================================================
// Arriba a la derecha, siempre visible. Al pulsarlo se despliega a pantalla
// completa con toda la aldea en 2D, y desde ahí se puede pinchar en cualquier
// persona o proyecto para viajar hasta él.
//
// Se dibuja en SVG, no en el lienzo 3D: es nítido a cualquier tamaño, los
// marcadores son botones de verdad (accesibles y pulsables con el dedo) y no
// le cuesta un solo fotograma al motor.
//
// El punto del jugador se mueve escribiendo el atributo `transform` a mano en
// cada fotograma. Meterlo en el estado de React sería re-renderizar el mapa 60
// veces por segundo para mover un círculo.

const VISTA = MITAD * 2; // el mundo es cuadrado: 1090 × 1090 m

/** Mundo (x, z) → coordenadas del SVG, con el norte arriba. */
const aSvg = (x: number, z: number) => [x + MITAD, z + MITAD];

interface Destino { tipo: 'persona' | 'proyecto' | 'robot'; nombre: string; x: number; z: number; agente?: Agente }

export default function MiniMapa({ jugadorPos, agentes, proyectos, onViajar }: {
  jugadorPos: THREE.Vector3;
  agentes: Agente[];
  proyectos: ProyectoJuego[];
  onViajar: (d: { x: number; z: number; agente?: Agente }) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const jugadorMini = useRef<SVGGElement>(null);
  const jugadorGrande = useRef<SVGGElement>(null);
  const svgMini = useRef<SVGSVGElement>(null);

  // El marcador del jugador, y el encuadre del minimapa que le sigue, se
  // actualizan fuera de React (ver cabecera): son atributos, no estado.
  useEffect(() => {
    let vivo = true;
    const VENTANA = 240; // metros visibles alrededor de ti en el minimapa
    const paso = () => {
      if (!vivo) return;
      const [px, pz] = aSvg(jugadorPos.x, jugadorPos.z);
      const t = `translate(${px} ${pz})`;
      jugadorMini.current?.setAttribute('transform', t);
      jugadorGrande.current?.setAttribute('transform', t);
      svgMini.current?.setAttribute(
        'viewBox',
        `${px - VENTANA / 2} ${pz - VENTANA / 2} ${VENTANA} ${VENTANA}`,
      );
      requestAnimationFrame(paso);
    };
    const id = requestAnimationFrame(paso);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [jugadorPos, abierto]);

  const casas = useMemo(() => casasAldea(), []);
  const rio = useMemo(() => trazadoRio(), []);

  /** Los edificios de proyectos que NO son agentes (los de la Fase 1). */
  const edificiosProyecto = useMemo(() =>
    proyectos.slice(0, 12).map((p, i) => ({ p, ...posicionProyecto(i) })), [proyectos]);

  /**
   * El mapa grande encuadra DONDE ESTÁ TU VIDA, no las 118 ha enteras: si
   * enseñara todo el terreno, la aldea saldría del tamaño de un sello y los
   * nombres ilegibles. Se ajusta solo según crece tu mundo.
   */
  const encuadre = useMemo(() => {
    const puntos: Array<[number, number]> = [
      [0, 0], [-90, 0], [DISTRITO.x1, DISTRITO.z0], [DISTRITO.x1, DISTRITO.z1],
      ...casas.map(c => [c.x, c.z] as [number, number]),
      ...agentes.map(a => [a.x, a.z] as [number, number]),
      ...edificiosProyecto.map(e => [e.x, e.z] as [number, number]),
    ];
    const xs = puntos.map(p => p[0]);
    const zs = puntos.map(p => p[1]);
    const margen = 45;
    const x0 = Math.min(...xs) - margen, x1 = Math.max(...xs) + margen;
    const z0 = Math.min(...zs) - margen, z1 = Math.max(...zs) + margen;
    // Cuadrado, centrado en el contenido: el mapa no se deforma.
    const lado = Math.max(x1 - x0, z1 - z0, 220);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const [sx, sz] = aSvg(cx - lado / 2, cz - lado / 2);
    return { viewBox: `${sx} ${sz} ${lado} ${lado}`, lado };
  }, [casas, agentes, edificiosProyecto]);

  const destinos: Destino[] = useMemo(() => [
    { tipo: 'robot', nombre: 'Tu robot', x: CASA_DEL_ROBOT.x, z: CASA_DEL_ROBOT.z },
    ...agentes.map((a): Destino => ({
      tipo: a.tipo === 'persona' ? 'persona' : 'proyecto',
      nombre: a.nombre, x: a.x, z: a.z, agente: a,
    })),
    ...edificiosProyecto.map((e): Destino => ({
      tipo: 'proyecto', nombre: e.p.titulo, x: e.x, z: e.z + 4,
    })),
  ], [agentes, edificiosProyecto]);

  /** El terreno: lo mismo en el minimapa y en el mapa grande. */
  const terreno = (
    <>
      <rect x={0} y={0} width={VISTA} height={VISTA} fill="#7cb356" />
      {LAGOS.map((l, i) => (
        <ellipse key={i} {...(() => { const [cx, cy] = aSvg(l.x, l.z); return { cx, cy }; })()}
          rx={l.rx} ry={l.rz} fill="#3f93c4" />
      ))}
      <polyline
        points={rio.map(([x, z]) => aSvg(x, z).join(',')).join(' ')}
        fill="none" stroke="#4fa3d1" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round"
      />
      {CAMINOS.map(([cx, cz, w, l], i) => {
        const [x, y] = aSvg(cx - w / 2, cz - l / 2);
        return <rect key={i} x={x} y={y} width={w} height={l} fill="#d9c9a3" />;
      })}
      <circle {...(() => { const [cx, cy] = aSvg(0, 0); return { cx, cy }; })()} r={PLAZA_R} fill="#cbbfa4" />
      {NAVES.map((n, i) => {
        const [x, y] = aSvg(n.x - n.ancho / 2, n.z - n.fondo / 2);
        return <rect key={i} x={x} y={y} width={n.ancho} height={n.fondo} fill="#8fa3ad" />;
      })}
      {casas.map((c, i) => {
        const [x, y] = aSvg(c.x - 3, c.z - 3);
        return <rect key={i} x={x} y={y} width={6} height={6} rx={1} fill="#e8d3b4" />;
      })}
      <rect
        {...(() => { const [x, y] = aSvg(DISTRITO.x0, DISTRITO.z0); return { x, y }; })()}
        width={DISTRITO.x1 - DISTRITO.x0} height={DISTRITO.z1 - DISTRITO.z0}
        fill="#ffffff" opacity={0.12} rx={4}
      />
    </>
  );

  const marcadorJugador = (escala: number) => (
    <g>
      <circle r={escala * 1.6} fill="#059669" opacity={0.25} />
      <circle r={escala} fill="#059669" stroke="#ffffff" strokeWidth={escala * 0.4} />
    </g>
  );

  return (
    <>
      {/* ---- Minimapa siempre visible, arriba a la derecha ---- */}
      <button
        onClick={() => setAbierto(true)}
        title="Abrir el mapa"
        className="absolute top-3 right-3 z-30 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/80 shadow-xl bg-emerald-100 hover:border-emerald-300 transition-colors group"
      >
        {/* Encuadre cercano al jugador para que se vea dónde estás */}
        <svg ref={svgMini} viewBox={`${MITAD - 120} ${MITAD - 120} 240 240`} className="w-full h-full">
          {terreno}
          {destinos.map((d, i) => {
            const [cx, cy] = aSvg(d.x, d.z);
            return <circle key={i} cx={cx} cy={cy} r={7}
              fill={d.tipo === 'persona' ? '#f59e0b' : d.tipo === 'robot' ? '#10b981' : '#7ba8c9'}
              stroke="#fff" strokeWidth={2} />;
          })}
          <g ref={jugadorMini}>{marcadorJugador(9)}</g>
        </svg>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white/90 rounded text-[8px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
          <Maximize2 className="w-2 h-2" /> Mapa
        </span>
      </button>

      {/* ---- Mapa grande ---- */}
      {abierto && (
        <div
          className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAbierto(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-3xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <MapIcon className="w-3.5 h-3.5 text-emerald-600" /> Tu aldea
                <span className="font-medium text-slate-400 ml-1">· pulsa un sitio para viajar</span>
              </p>
              <button onClick={() => setAbierto(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-emerald-100">
              <svg viewBox={encuadre.viewBox} className="w-full aspect-square max-h-[62vh]">
                {terreno}
                {/* Tamaños relativos al encuadre: los nombres se leen igual de
                    bien cuando tu mundo es pequeño que cuando ya es grande. */}
                {(() => {
                  const u = encuadre.lado / 100; // 1 unidad = 1% del ancho
                  // Los nombres se apilan cuando dos sitios caen cerca: si no,
                  // «Javier» y «Anita» se pisan y no se lee ninguno de los dos.
                  const puestos: Array<{ x: number; y: number }> = [];
                  const alturaLinea = u * 4.2;
                  return destinos.map((d, i) => {
                    const [cx, cy] = aSvg(d.x, d.z);
                    let ly = cy - u * 3.4;
                    while (puestos.some(p => Math.abs(p.x - cx) < u * 26 && Math.abs(p.y - ly) < alturaLinea)) {
                      ly -= alturaLinea;
                    }
                    puestos.push({ x: cx, y: ly });
                    const color = d.tipo === 'persona' ? '#f59e0b' : d.tipo === 'robot' ? '#10b981' : '#7ba8c9';
                    return (
                      <g key={i} className="cursor-pointer" onClick={() => { setAbierto(false); onViajar(d); }}>
                        <circle cx={cx} cy={cy} r={u * 5} fill="transparent" />
                        {/* hilo del marcador a su nombre cuando se ha subido */}
                        {ly < cy - u * 4 && (
                          <line x1={cx} y1={cy - u * 2.4} x2={cx} y2={ly + u} stroke={color} strokeWidth={u * 0.35} opacity={0.7} />
                        )}
                        <circle cx={cx} cy={cy} r={u * 2} fill={color} stroke="#fff" strokeWidth={u * 0.7} />
                        <text x={cx} y={ly} textAnchor="middle" fontSize={u * 3.2} fontWeight="700"
                          fill="#0f172a" stroke="#fff" strokeWidth={u} paintOrder="stroke">
                          {d.nombre.length > 22 ? `${d.nombre.slice(0, 21)}…` : d.nombre}
                        </text>
                      </g>
                    );
                  });
                })()}
                <g ref={jugadorGrande}>{marcadorJugador(encuadre.lado / 100 * 2.2)}</g>
              </svg>
            </div>

            <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white" /> Tú</span>
              <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-emerald-500" /> Robot</span>
              <span className="flex items-center gap-1"><UserPlus className="w-3 h-3 text-amber-500" /> Personas</span>
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-sky-500" /> Proyectos</span>
              <span className="ml-auto text-slate-400">118 ha · 1,09 × 1,09 km</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Fundido del viaje rápido: se pinta encima mientras «vuelas». */
export function VeloViaje({ activo, destino }: { activo: boolean; destino: string | null }) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-40 pointer-events-none flex items-center justify-center transition-opacity duration-300',
        activo ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="absolute inset-0 bg-slate-900/60" />
      {destino && (
        <p className="relative text-white text-sm font-black tracking-wide animate-pulse">
          Viajando a {destino}…
        </p>
      )}
    </div>
  );
}
