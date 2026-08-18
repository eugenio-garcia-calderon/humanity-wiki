import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { Map as MapIcon, X, Maximize2, UserPlus, Building2, Bot } from 'lucide-react';
import { cn } from '../../utils/cn';
import { nombreLimpio, type Agente, type ProyectoJuego, type ItemMundo, type OverrideMundo } from './tipos';
import { MITAD, PLAZA_R, CAMINOS, NAVES, LAGOS, DISTRITO, casasAldea, trazadoRio, posicionesProyectos } from './mapa';
import { CASA_DEL_ROBOT } from './Robot';
import { PANTALLA } from './Pantalla';

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

interface Destino { tipo: 'persona' | 'proyecto' | 'robot' | 'item' | 'pantalla'; nombre: string; x: number; z: number; agente?: Agente; color?: string }

/** El color de cada cosa plantada en el mapa 2D: el mismo lenguaje que en 3D. */
const COLOR_ITEM: Record<string, string> = {
  nota: '#f59e0b', imagen: '#10b981', documento: '#0ea5e9', enlace: '#64748b',
  video: '#e11d48', musica: '#16a34a', lienzo: '#7c3aed', mapa: '#059669', prop: '#8d9e6f',
};

export default function MiniMapa({ jugadorPos, agentes, proyectos, items = [], overrides = [], onViajar, onCrearEn }: {
  jugadorPos: THREE.Vector3;
  agentes: Agente[];
  proyectos: ProyectoJuego[];
  /** Lo plantado por el jugador: también se ve y se pulsa en el mapa 2D. */
  items?: ItemMundo[];
  /** Los retoques del pueblo: los portales arrastrados salen donde están. */
  overrides?: OverrideMundo[];
  onViajar: (d: { x: number; z: number; agente?: Agente }) => void;
  /** Clic en suelo VACÍO del mapa grande: abre «Crear aquí» en ese punto —
   *  el mapa 2D es un creador completo (petición de Eugenio). */
  onCrearEn?: (p: { x: number; z: number }) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  /** Índice del marcador bajo el ratón: crece y resalta su nombre. */
  const [sobre, setSobre] = useState<number | null>(null);
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

  /** Los portales del distrito, con los arrastres del jugador aplicados. */
  const edificiosProyecto = useMemo(() => {
    const posiciones = posicionesProyectos(proyectos, overrides);
    // Los portales quitados del mapa tampoco salen aquí.
    return proyectos.slice(0, 12).map((p, i) => ({ p, ...posiciones[i] }))
      .filter(e => !e.eliminado);
  }, [proyectos, overrides]);

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
    { tipo: 'robot' as const, nombre: 'Tu robot', x: CASA_DEL_ROBOT.x, z: CASA_DEL_ROBOT.z },
    { tipo: 'pantalla' as const, nombre: 'Gran pantalla', x: PANTALLA.x, z: PANTALLA.z, color: '#ff0033' },
    ...agentes.map((a): Destino => ({
      tipo: a.tipo === 'persona' ? 'persona' : 'proyecto',
      nombre: a.nombre, x: a.x, z: a.z, agente: a,
    })),
    ...edificiosProyecto.map((e): Destino => ({
      tipo: 'proyecto', nombre: e.p.titulo, x: e.x, z: e.z + 4,
    })),
    // Lo plantado (notas, vídeos, documentos…) también vive en el mapa 2D.
    // Los props (árboles, rocas…) no: son decorado, taparían lo importante.
    ...items.filter(it => it.tipo !== 'prop').map((it): Destino => ({
      tipo: 'item',
      nombre: nombreLimpio(it.nombre, it.texto?.slice(0, 22) || it.tipo),
      x: it.x, z: it.z, color: COLOR_ITEM[it.tipo] || '#64748b',
    })),
  ], [agentes, edificiosProyecto, items]);

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
        // 10×10: la planta real de la casa a escala 6,4 (un mapa que miente es peor).
        const [x, y] = aSvg(c.x - 5, c.z - 5);
        return <rect key={i} x={x} y={y} width={10} height={10} rx={1} fill="#e8d3b4" />;
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
            return <circle key={i} cx={cx} cy={cy} r={d.tipo === 'item' ? 5 : 7}
              fill={d.color || (d.tipo === 'persona' ? '#f59e0b' : d.tipo === 'robot' ? '#10b981' : '#7ba8c9')}
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
                <span className="font-medium text-slate-400 ml-1">· pulsa algo para viajar · pulsa suelo vacío para crear ahí</span>
              </p>
              <button onClick={() => setAbierto(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-emerald-100">
              {/* Clic en suelo VACÍO del mapa = crear AHÍ (el mapa 2D es un
                  creador completo, petición de Eugenio). Los marcadores paran
                  la propagación para que su clic siga siendo «viajar». */}
              <svg
                viewBox={encuadre.viewBox}
                className={cn('w-full aspect-square max-h-[62vh]', onCrearEn && 'cursor-crosshair')}
                onClick={(e) => {
                  if (!onCrearEn) return;
                  const svg = e.currentTarget;
                  const caja = svg.getBoundingClientRect();
                  const [vx, vy, vw, vh] = encuadre.viewBox.split(' ').map(Number);
                  const x = vx + ((e.clientX - caja.left) / caja.width) * vw - MITAD;
                  const z = vy + ((e.clientY - caja.top) / caja.height) * vh - MITAD;
                  setAbierto(false);
                  onCrearEn({ x, z });
                }}
              >
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
                    const color = d.color || (d.tipo === 'persona' ? '#f59e0b' : d.tipo === 'robot' ? '#10b981' : '#7ba8c9');
                    const crecido = sobre === i ? 1.45 : 1; // hover: crece y resalta
                    return (
                      <g
                        key={i}
                        className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setSobre(null); setAbierto(false); onViajar(d); }}
                        onMouseEnter={() => setSobre(i)}
                        onMouseLeave={() => setSobre(null)}
                      >
                        <circle cx={cx} cy={cy} r={u * 5} fill="transparent" />
                        {/* hilo del marcador a su nombre cuando se ha subido */}
                        {ly < cy - u * 4 && (
                          <line x1={cx} y1={cy - u * 2.4} x2={cx} y2={ly + u} stroke={color} strokeWidth={u * 0.35} opacity={0.7} />
                        )}
                        {sobre === i && <circle cx={cx} cy={cy} r={u * 3.6} fill={color} opacity={0.25} />}
                        {d.tipo === 'item'
                          ? <rect x={cx - u * 1.5 * crecido} y={cy - u * 1.5 * crecido} width={u * 3 * crecido} height={u * 3 * crecido} rx={u * 0.7} fill={color} stroke="#fff" strokeWidth={u * 0.6} />
                          : <circle cx={cx} cy={cy} r={u * 2 * crecido} fill={color} stroke="#fff" strokeWidth={u * 0.7} />}
                        <text x={cx} y={ly} textAnchor="middle" fontSize={u * (sobre === i ? 3.9 : 3.2)} fontWeight="700"
                          fill={sobre === i ? '#000000' : '#0f172a'} stroke="#fff" strokeWidth={u} paintOrder="stroke">
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
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500 border border-white" /> Plantado</span>
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
