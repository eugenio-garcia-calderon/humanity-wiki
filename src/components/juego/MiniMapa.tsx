import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { Map as MapIcon, X, Maximize2, UserPlus, Building2, Bot, ZoomIn, ZoomOut, Move, Trash2, Crosshair } from 'lucide-react';
import { cn } from '../../utils/cn';
import { nombreLimpio, type Agente, type ProyectoJuego, type ItemMundo, type OverrideMundo } from './tipos';
import { MITAD, PLAZA_R, PLAZA_SEC_R, CAMINOS, SENDAS, finDeSenda, NAVES, LAGOS, DISTRITO, casasAldea, trazadoRio, posicionesProyectos, piezasAldea } from './mapa';
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

interface Destino {
  tipo: 'persona' | 'proyecto' | 'robot' | 'item' | 'pantalla' | 'pieza';
  nombre: string; x: number; z: number; agente?: Agente; color?: string;
  /** Con qué llamar al editor: qué es y cuál es su id. Sin esto, el marcador
   *  solo sirve para viajar; con esto se puede mover y quitar desde el mapa. */
  edita?: { clase: 'item' | 'semilla'; id: string };
}

/** El color de cada cosa plantada en el mapa 2D: el mismo lenguaje que en 3D. */
const COLOR_ITEM: Record<string, string> = {
  nota: '#f59e0b', imagen: '#10b981', documento: '#0ea5e9', enlace: '#64748b',
  video: '#e11d48', musica: '#16a34a', lienzo: '#7c3aed', mapa: '#059669', prop: '#8d9e6f',
};

export default function MiniMapa({ jugadorPos, agentes, proyectos, items = [], overrides = [], onViajar, onCrearEn, onMoverElemento, onBorrarElemento }: {
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
  /** Arrastrar un marcador en modo edición lo recoloca en el mundo real. */
  onMoverElemento?: (sel: { clase: 'item' | 'semilla'; id: string }, x: number, z: number) => void;
  /** La papelera de un marcador en modo edición. */
  onBorrarElemento?: (sel: { clase: 'item' | 'semilla'; id: string }) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  // ZOOM Y ARRASTRE del mapa grande (2026-08-19, petición de Eugenio).
  // `vista` es null hasta que tocas algo: mientras tanto manda el encuadre
  // automático, que ya sabe enseñar «donde está tu vida».
  const [vista, setVista] = useState<{ cx: number; cz: number; lado: number } | null>(null);
  // MODO EDICIÓN: con él puesto, los marcadores se arrastran y tienen papelera.
  const [editando, setEditando] = useState(false);
  // Qué marcador se está arrastrando ahora mismo y dónde va.
  const arrastre = useRef<{ i: number; x: number; z: number } | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  // El arrastre del FONDO (mover el mapa), en coordenadas de pantalla.
  const paneo = useRef<{ px: number; py: number; cx: number; cz: number } | null>(null);
  const svgGrande = useRef<SVGSVGElement>(null);
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
    // Los proyectos ya representados por un portal CON FORMA (un objeto, una
    // pieza o una persona convertidos) no duplican espiral en el distrito.
    const representados = new Set<string>();
    for (const a of agentes) if (a.proyecto_id) representados.add(a.proyecto_id);
    for (const it of items) if (it.portal_proyecto_id) representados.add(it.portal_proyecto_id);
    for (const o of overrides) if (o.portal_proyecto_id) representados.add(o.portal_proyecto_id);
    const posiciones = posicionesProyectos(proyectos, overrides, representados);
    // Los portales quitados del mapa tampoco salen aquí.
    return proyectos.slice(0, 12).map((p, i) => ({ p, ...posiciones[i] }))
      .filter(e => !e.eliminado);
  }, [proyectos, overrides, agentes, items]);

  /**
   * El mapa grande encuadra DONDE ESTÁ TU VIDA, no las 118 ha enteras: si
   * enseñara todo el terreno, la aldea saldría del tamaño de un sello y los
   * nombres ilegibles. Se ajusta solo según crece tu mundo.
   */
  const encuadreAuto = useMemo(() => {
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
    return { cx, cz, lado };
  }, [casas, agentes, edificiosProyecto]);

  /** Lo que se ve AHORA: el automático, o lo que hayas puesto tú con el zoom. */
  const v = vista ?? encuadreAuto;
  const encuadre = useMemo(() => {
    const [sx, sz] = aSvg(v.cx - v.lado / 2, v.cz - v.lado / 2);
    return { viewBox: `${sx} ${sz} ${v.lado} ${v.lado}`, lado: v.lado };
  }, [v.cx, v.cz, v.lado]);

  /** Acercar o alejar. 240 m de tope de zoom (se ven las casas una a una) y
   *  el mundo entero de tope de alejar. */
  const zoom = useCallback((factor: number) => {
    setVista(a => {
      const b = a ?? encuadreAuto;
      return { ...b, lado: Math.min(VISTA, Math.max(40, b.lado * factor)) };
    });
  }, [encuadreAuto]);

  /** De un punto de la pantalla a metros del mundo. Lo usan el clic de crear,
   *  el arrastre de marcadores y el paneo: una sola conversión, sin copias. */
  const aMundo = useCallback((clientX: number, clientY: number) => {
    const svg = svgGrande.current;
    if (!svg) return { x: 0, z: 0 };
    const caja = svg.getBoundingClientRect();
    const [vx, vy, vw, vh] = encuadre.viewBox.split(' ').map(Number);
    return {
      x: vx + ((clientX - caja.left) / caja.width) * vw - MITAD,
      z: vy + ((clientY - caja.top) / caja.height) * vh - MITAD,
    };
  }, [encuadre.viewBox]);

  /**
   * Las piezas del pueblo (casas, naves, farolas, carteles…) con los retoques
   * del jugador aplicados. Solo salen como marcadores en MODO EDICIÓN: en el
   * mapa normal serían sesenta puntos tapando lo que importa, pero Eugenio
   * pidió poder tocar «todos» los elementos, y estos también son elementos.
   */
  const piezas = useMemo(() => {
    const ov = new Map(overrides.map(o => [o.seed_id, o]));
    return piezasAldea()
      .filter(p => p.tipo !== 'arbol')          // 1.100 árboles no son un mapa
      .map(p => { const o = ov.get(p.seed_id); return { ...p, x: o?.x ?? p.x, z: o?.z ?? p.z, fuera: !!o?.eliminado }; })
      .filter(p => !p.fuera);
  }, [overrides]);

  const NOMBRE_PIEZA: Record<string, string> = {
    casa: 'Casa', nave: 'Nave', fuente: 'Fuente', banco: 'Banco', farola: 'Farola',
    puesto: 'Puesto', pozo: 'Pozo', carro: 'Carro', camper: 'Camión', ficus: 'Ficus',
    cartel: 'Cartel', pantalla: 'Gran pantalla',
  };

  const destinos: Destino[] = useMemo(() => [
    { tipo: 'robot' as const, nombre: 'Tu robot', x: CASA_DEL_ROBOT.x, z: CASA_DEL_ROBOT.z },
    // La pantalla es la pieza pantalla:0: su marcador sigue a su retoque.
    ...(() => {
      const o = overrides.find(v => v.seed_id === 'pantalla:0');
      if (o?.eliminado) return [];
      return [{ tipo: 'pantalla' as const, nombre: 'Gran pantalla', x: o?.x ?? 27, z: o?.z ?? -18, color: '#ff0033' }];
    })(),
    ...agentes.map((a): Destino => ({
      tipo: a.tipo === 'persona' ? 'persona' : 'proyecto',
      nombre: a.nombre, x: a.x, z: a.z, agente: a,
    })),
    ...edificiosProyecto.map((e): Destino => ({
      tipo: 'proyecto', nombre: e.p.titulo, x: e.x, z: e.z + 4,
    })),
    // Lo plantado (notas, vídeos, documentos…) también vive en el mapa 2D.
    // Los props (árboles, rocas…) no: son decorado, taparían lo importante.
    // (En modo edición sí salen, más abajo, para poder quitarlos.)
    ...items.filter(it => it.tipo !== 'prop').map((it): Destino => ({
      tipo: 'item',
      nombre: nombreLimpio(it.nombre, it.texto?.slice(0, 22) || it.tipo),
      x: it.x, z: it.z, color: COLOR_ITEM[it.tipo] || '#64748b',
      edita: { clase: 'item', id: it.id },
    })),
    // En modo edición aparecen TAMBIÉN las piezas del pueblo, para poder
    // recolocarlas o quitarlas desde el mapa sin ir andando hasta ellas.
    ...(editando ? piezas.map((p): Destino => ({
      tipo: 'pieza',
      nombre: NOMBRE_PIEZA[p.tipo] || p.tipo,
      x: p.x, z: p.z, color: '#94a3b8',
      edita: { clase: 'semilla', id: p.seed_id },
    })) : []),
  ], [agentes, edificiosProyecto, items, overrides, editando, piezas]);

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
      {/* Las 6 sendas radiales y sus plazas temáticas (2026-08-19): el mapa
          dibuja lo MISMO que el mundo, cada una con su color de tema. */}
      {SENDAS.map(s2 => {
        const f = finDeSenda(s2);
        const [x1, y1] = aSvg(0, 0);
        const [x2, y2] = aSvg(f.x, f.z);
        return (
          <g key={s2.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d9c9a3" strokeWidth={s2.ancho} strokeLinecap="round" />
            <circle cx={x2} cy={y2} r={PLAZA_SEC_R} fill="#cbbfa4" />
            <circle cx={x2} cy={y2} r={PLAZA_SEC_R} fill="none" stroke={s2.color} strokeWidth={2.4} />
          </g>
        );
      })}
      <circle {...(() => { const [cx, cy] = aSvg(0, 0); return { cx, cy }; })()} r={PLAZA_R} fill="#cbbfa4" />
      {/* El ficus y su estanque, en el centro */}
      <circle {...(() => { const [cx, cy] = aSvg(0, 0); return { cx, cy }; })()} r={5.1} fill="#4a86a6" />
      <circle {...(() => { const [cx, cy] = aSvg(0, 0); return { cx, cy }; })()} r={3.4} fill="#5b8a46" />
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
                <span className="font-medium text-slate-400 ml-1 hidden sm:inline">
                  {editando
                    ? '· arrastra para colocar · la ✕ roja quita'
                    : '· pulsa algo para viajar · pulsa suelo vacío para crear ahí · rueda para acercar'}
                </span>
              </p>
              <div className="flex items-center gap-1">
                {/* MODO COLOCAR: con él puesto salen TODAS las piezas del
                    pueblo, se arrastran y tienen papelera. */}
                {onMoverElemento && (
                  <button
                    onClick={() => setEditando(v => !v)}
                    title={editando ? 'Salir de colocar' : 'Colocar y quitar cosas desde el mapa'}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors',
                      editando ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100',
                    )}
                  >
                    <Move className="w-3 h-3" /> Colocar
                  </button>
                )}
                <button onClick={() => zoom(1 / 1.4)} title="Acercar" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => zoom(1.4)} title="Alejar" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setVista({ cx: jugadorPos.x, cz: jugadorPos.z, lado: 160 })}
                  title="Centrar donde estás"
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setVista(null)} title="Ver todo" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setEditando(false); setAbierto(false); }} className="p-1 ml-1 text-slate-400 hover:text-slate-900 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative bg-emerald-100">
              {/* Clic en suelo VACÍO del mapa = crear AHÍ (el mapa 2D es un
                  creador completo, petición de Eugenio). Los marcadores paran
                  la propagación para que su clic siga siendo «viajar». */}
              <svg
                ref={svgGrande}
                viewBox={encuadre.viewBox}
                className={cn(
                  'w-full aspect-square max-h-[62vh] touch-none select-none',
                  paneo.current ? 'cursor-grabbing' : editando ? 'cursor-grab' : onCrearEn ? 'cursor-crosshair' : '',
                )}
                // RUEDA = zoom hacia donde apunta el ratón, como en cualquier
                // mapa. Sin el `passive:false` implícito de React esto haría
                // scroll de la página en vez de acercar.
                onWheel={(e) => {
                  const antes = aMundo(e.clientX, e.clientY);
                  const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
                  setVista(a => {
                    const b = a ?? encuadreAuto;
                    const lado = Math.min(VISTA, Math.max(40, b.lado * factor));
                    // El punto bajo el ratón se queda quieto: el zoom «tira»
                    // de donde miras, no del centro.
                    const k = lado / b.lado;
                    return { lado, cx: antes.x - (antes.x - b.cx) * k, cz: antes.z - (antes.z - b.cz) * k };
                  });
                }}
                onPointerDown={(e) => {
                  // Arrastrar el FONDO mueve el mapa. Los marcadores paran la
                  // propagación, así que esto solo salta en suelo vacío.
                  const b = vista ?? encuadreAuto;
                  paneo.current = { px: e.clientX, py: e.clientY, cx: b.cx, cz: b.cz };
                  (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  // 1) Recolocando un marcador
                  if (arrastre.current) {
                    const m = aMundo(e.clientX, e.clientY);
                    arrastre.current = { ...arrastre.current, x: m.x, z: m.z };
                    setArrastrando(arrastre.current.i);
                    return;
                  }
                  // 2) Moviendo el mapa
                  const p = paneo.current;
                  if (!p) return;
                  const svg = svgGrande.current;
                  if (!svg) return;
                  const caja = svg.getBoundingClientRect();
                  const metrosPorPx = encuadre.lado / caja.width;
                  setVista({
                    lado: encuadre.lado,
                    cx: p.cx - (e.clientX - p.px) * metrosPorPx,
                    cz: p.cz - (e.clientY - p.py) * metrosPorPx,
                  });
                }}
                onPointerUp={(e) => {
                  const a = arrastre.current;
                  arrastre.current = null;
                  setArrastrando(null);
                  const p = paneo.current;
                  paneo.current = null;
                  // ¿Se soltó un marcador? Se guarda su sitio nuevo.
                  if (a) {
                    const d = destinos[a.i];
                    if (d?.edita && onMoverElemento) onMoverElemento(d.edita, a.x, a.z);
                    return;
                  }
                  // ¿Fue un clic limpio en suelo vacío? Entonces, crear ahí.
                  const movido = p && (Math.abs(e.clientX - p.px) > 4 || Math.abs(e.clientY - p.py) > 4);
                  if (movido || !onCrearEn || editando) return;
                  const m = aMundo(e.clientX, e.clientY);
                  setAbierto(false);
                  onCrearEn(m);
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
                    // Mientras lo arrastras el marcador va bajo el dedo, no en
                    // su sitio guardado: sin esto parece que no se mueve.
                    const enMano = arrastrando === i && arrastre.current;
                    const [cx, cy] = enMano
                      ? aSvg(arrastre.current!.x, arrastre.current!.z)
                      : aSvg(d.x, d.z);
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
                        className={cn(editando && d.edita ? 'cursor-move' : 'cursor-pointer')}
                        onPointerDown={(e) => {
                          // En modo edición, pinchar un marcador lo AGARRA (y
                          // no mueve el mapa, que es lo que haría el fondo).
                          if (!editando || !d.edita) return;
                          e.stopPropagation();
                          arrastre.current = { i, x: d.x, z: d.z };
                          setArrastrando(i);
                          (e.currentTarget.ownerSVGElement as SVGSVGElement)?.setPointerCapture(e.pointerId);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Con el editor puesto, un clic no te teletransporta:
                          // estarías colocando cosas y saldrías disparado.
                          if (editando) return;
                          setSobre(null); setAbierto(false); onViajar(d);
                        }}
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
                        {/* La PAPELERA: solo en modo edición, y solo en lo que
                            de verdad se puede quitar (una persona se quita
                            desde su ficha, no de un manotazo en el mapa). */}
                        {editando && d.edita && onBorrarElemento && (
                          <g
                            className="cursor-pointer"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onBorrarElemento(d.edita!); }}
                          >
                            <circle cx={cx + u * 3.4} cy={cy - u * 3.4} r={u * 2.2} fill="#e11d48" stroke="#fff" strokeWidth={u * 0.5} />
                            <path
                              d={`M ${cx + u * 2.6} ${cy - u * 4.2} L ${cx + u * 4.2} ${cy - u * 2.6} M ${cx + u * 4.2} ${cy - u * 4.2} L ${cx + u * 2.6} ${cy - u * 2.6}`}
                              stroke="#fff" strokeWidth={u * 0.6} strokeLinecap="round"
                            />
                          </g>
                        )}
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
              {editando && <span className="flex items-center gap-1 text-slate-400"><Trash2 className="w-3 h-3 text-rose-500" /> La ✕ roja lo quita</span>}
              <span className="ml-auto text-slate-400">
                {Math.round(encuadre.lado)} m de lado · 118 ha en total
              </span>
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
