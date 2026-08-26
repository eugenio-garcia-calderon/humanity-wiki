import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, GitBranch, Info } from 'lucide-react';
import { OBJETIVOS, hexDelColor } from '../../utils/objetivos';
import { cn } from '../../utils/cn';

/*
 * EL ÁRBOL DEL CONOCIMIENTO (2026-08-26) — fase 1
 * ============================================================================
 * Eugenio: «vamos a explorar cómo quedaría esa rueda si fuese en forma de
 * árbol, donde en la base tienes la palabra red de conocimiento y sube un
 * tronco gordo que se divide en tres áreas… y a raíz de esas tres ramas surgen
 * los quince objetivos… pero en realidad así no puede ser, el árbol tiene que
 * ir de izquierda a derecha, donde la red de conocimiento está a la izquierda
 * y luego van desplegando hacia la derecha a medida que vamos haciendo clic».
 *
 * ── POR QUÉ DE IZQUIERDA A DERECHA Y NO HACIA ARRIBA ──────────────────────
 * Lo pidió él y además es lo que aguanta el tamaño. Un árbol que crece hacia
 * arriba reparte a los hijos en horizontal: con quince objetivos y ocho
 * subtemas cada uno, el cuarto nivel mide kilómetros de ancho y no hay
 * pantalla. Creciendo hacia la derecha, los hijos se reparten en VERTICAL, y
 * hacia abajo se puede desplazar sin fin. Es la misma razón por la que un
 * índice de un libro se lee en columna y no en fila.
 *
 * ── ES UN GRAFO: LO MISMO SALE DOS VECES, Y HAY QUE DECIRLO ───────────────
 * Eugenio eligió que una rama pueda colgar de varias madres. Consecuencia
 * directa en el dibujo: SALUD puede aparecer bajo ECOLOGÍA y bajo SOCIAL, y
 * son la misma SALUD. Si no se avisa, se lee como dos temas repetidos y
 * alguien «arregla» el duplicado borrando uno.
 *
 * Por eso cada nodo se identifica por su CAMINO y no por su id —el mismo id
 * puede estar en dos sitios y React necesita claves distintas— y las
 * apariciones repetidas llevan borde discontinuo y el número de sitios donde
 * está. Un grafo dibujado como un árbol sin decirlo es un árbol con erratas.
 */

export type Rama = { id: string; nombre: string; color: string; orden: number };
export type Arista = { hijo: string; madre: string; orden: number };
export type Hoja = { id: string; nombre: string };

const RAIZ = 'RAIZ';

/** Ancho de cada columna y alto de cada fila. El alto manda: es lo que separa
 *  dos nombres para que no se toquen, y 26 px es el mínimo con el que la
 *  etiqueta de 11 px respira. */
const PASO = 208;
const FILA = 28;
const MARGEN = 24;

/** Grosor del trazo por nivel: el tronco gordo abajo y las ramitas finas
 *  arriba, que es lo que él describió. No es adorno — el grosor dice a simple
 *  vista cuánto falta para llegar al final. */
const grosor = (nivel: number) => Math.max(1.5, 14 - nivel * 3.5);

type Nodo = {
  camino: string;      // 'RAIZ/TR_SOCIAL/O007' — la identidad en el DIBUJO
  id: string;          // el id de verdad, que puede repetirse
  nombre: string;
  color: string;
  nivel: number;
  hijos: number;
  madres: number;      // en cuántos sitios cuelga; > 1 es el micelio
  repetido: boolean;   // ésta no es su primera aparición
  x: number;
  y: number;
  madreCamino: string | null;
  madreId: string | null;
  tipo: 'raiz' | 'rama' | 'objetivo' | 'subtema';
};

export default function ArbolDeConocimiento({
  hijosDe,
  puedeEditar,
  onElegir,
}: {
  hijosDe: Record<string, Hoja[]>;
  puedeEditar: boolean;
  onElegir?: (id: string) => void;
}) {
  const [ramas, setRamas] = useState<Rama[]>([]);
  const [aristas, setAristas] = useState<Arista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set([RAIZ]));
  const [arrastrando, setArrastrando] = useState<{ id: string; madre: string; nombre: string } | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cajaRef = useRef<HTMLDivElement | null>(null);

  const cargar = () => {
    fetch('/api/tronco')
      .then(r => r.json())
      .then(j => {
        if (j.error) { setFallo(j.error); return; }
        setRamas(j.ramas || []);
        setAristas(j.aristas || []);
        // Las tres ramas abiertas de entrada: el dibujo tiene que enseñar los
        // quince desde el primer segundo. Un árbol que abre cerrado obliga a
        // tres clics antes de contar nada.
        //
        // Va por CAMINO, no por id, y ésa es la diferencia entera: abriendo
        // por id, la misma rama colgada de dos madres se abriría en los dos
        // sitios a la vez. Aquí sólo se abre donde se ha pulsado. La primera
        // versión abría por id y no abría nada: el reparto pregunta por el
        // camino y encontraba un id suelto que no coincidía con ninguno.
        setAbiertos(new Set([RAIZ, ...(j.ramas || []).map((r: Rama) => `${RAIZ}/${r.id}`)]));
      })
      .catch(e => setFallo(e.message))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const nombreDe = (id: string): string => {
    if (id === RAIZ) return 'RED DE CONOCIMIENTO';
    const r = ramas.find(x => x.id === id);
    if (r) return r.nombre;
    const o = OBJETIVOS.find(x => x.id === id);
    if (o) return o.titulo;
    for (const lista of Object.values(hijosDe)) {
      const h = lista.find(x => x.id === id);
      if (h) return h.nombre;
    }
    return id;
  };

  const colorDe = (id: string, heredado: string): string => {
    const r = ramas.find(x => x.id === id);
    if (r) return r.color;
    const o = OBJETIVOS.find(x => x.id === id);
    if (o) return hexDelColor(o.color);
    return heredado;
  };

  /** Cuántas madres tiene cada id. Es lo que distingue «esto sale dos veces
   *  porque está en dos sitios» de «esto está duplicado por error». */
  const madresPorId = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of aristas) m[a.hijo] = (m[a.hijo] || 0) + 1;
    return m;
  }, [aristas]);

  const hijosDelTronco = (id: string) =>
    aristas.filter(a => a.madre === id).sort((a, b) => a.orden - b.orden).map(a => a.hijo);

  /** Los hijos de un nodo, vengan del tronco (arriba) o de `subtemas` (abajo).
   *  Las dos mitades del árbol se unen aquí y en ningún otro sitio. */
  const hijosVisibles = (id: string): string[] => {
    const arriba = hijosDelTronco(id);
    if (arriba.length) return arriba;
    return (hijosDe[id] || []).map(h => h.id);
  };

  // ── EL REPARTO EN EL PAPEL ─────────────────────────────────────────────
  // Cada hoja ocupa una fila; cada padre se coloca en la media de sus hijos.
  // Es el reparto de toda la vida, y con crecimiento a la derecha el «alto»
  // es lo único que crece, así que no hay nada que comprimir.
  const { nodos, alto, ancho } = useMemo(() => {
    const out: Nodo[] = [];
    const yaSalio = new Set<string>();
    let fila = 0;

    const colocar = (
      id: string, nivel: number, madreCamino: string | null, madreId: string | null, heredado: string,
    ): number => {
      const camino = madreCamino ? `${madreCamino}/${id}` : id;
      const color = colorDe(id, heredado);
      const repetido = yaSalio.has(id);
      yaSalio.add(id);

      const hs = hijosVisibles(id);
      // Un repetido NO se despliega, aunque su rama esté abierta: si SALUD
      // cuelga de dos sitios y las dos se abren, sus ocho subtemas se pintan
      // dos veces y el dibujo dice que hay dieciséis. Se cuenta entero donde
      // sale la primera vez, y en las demás se enseña como enlace.
      const abierto = abiertos.has(camino) && !repetido && hs.length > 0;
      const tipo: Nodo['tipo'] =
        id === RAIZ ? 'raiz'
        : ramas.some(r => r.id === id) ? 'rama'
        : OBJETIVOS.some(o => o.id === id) ? 'objetivo'
        : 'subtema';

      let y: number;
      if (!abierto) {
        y = fila * FILA;
        fila += 1;
      } else {
        const yes = hs.map(h => colocar(h, nivel + 1, camino, id, color));
        y = (yes[0] + yes[yes.length - 1]) / 2;
      }
      out.push({
        camino, id, nombre: nombreDe(id), color, nivel, hijos: hs.length,
        madres: madresPorId[id] || 0, repetido, x: nivel * PASO, y,
        madreCamino, madreId, tipo,
      });
      return y;
    };

    colocar(RAIZ, 0, null, null, '#0f172a');
    const nivelMax = out.reduce((m, n) => Math.max(m, n.nivel), 0);
    return { nodos: out, alto: Math.max(fila, 1) * FILA + MARGEN * 2, ancho: (nivelMax + 1) * PASO + MARGEN };
  }, [aristas, ramas, abiertos, hijosDe, madresPorId]);

  const porCamino = useMemo(() => {
    const m: Record<string, Nodo> = {};
    for (const n of nodos) m[n.camino] = n;
    return m;
  }, [nodos]);

  const alternar = (camino: string, x: number) => {
    const abriendo = !abiertos.has(camino);
    setAbiertos(a => { const n = new Set(a); n.has(camino) ? n.delete(camino) : n.add(camino); return n; });
    // ── QUE SE VEA LO QUE ACABAS DE ABRIR ──────────────────────────────
    // El árbol crece hacia la derecha, así que en una pantalla estrecha el
    // nivel nuevo nace FUERA de la pantalla: pulsas, pasa algo, y no ves
    // nada. Parece que no ha funcionado, y el segundo clic lo vuelve a
    // cerrar. Se corre la caja para que la columna nueva entre.
    if (!abriendo) return;
    requestAnimationFrame(() => {
      const caja = cajaRef.current;
      if (!caja) return;
      const destino = x + PASO * 1.6 - caja.clientWidth;
      if (destino > caja.scrollLeft) caja.scrollTo({ left: destino, behavior: 'smooth' });
    });
  };

  // ── ARRASTRAR PARA CAMBIAR DE RAMA ─────────────────────────────────────
  // Con el ratón encima de una rama al soltar. La zona de caída es la fila
  // entera de la rama, no la etiqueta: apuntar a un texto de 11 px con algo
  // colgando del cursor es pedir puntería, y el que arrastra no la tiene.
  const puntoEnSvg = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const caja = svg.getBoundingClientRect();
    return {
      x: (e.clientX - caja.left) * (ancho / caja.width) - MARGEN,
      y: (e.clientY - caja.top) * (alto / caja.height) - MARGEN,
    };
  };

  const ramaBajoElPunto = (p: { x: number; y: number } | null): Nodo | null => {
    if (!p) return null;
    for (const n of nodos) {
      if (n.tipo !== 'rama' && n.tipo !== 'raiz') continue;
      if (Math.abs(n.y - p.y) <= FILA / 2 && p.x >= n.x - 12 && p.x <= n.x + PASO - 20) return n;
    }
    return null;
  };

  const mover = async (hijo: string, de: string, a: string) => {
    setAviso(null);
    const r = await fetch('/api/tronco/mover', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ hijo, de, a }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setAviso(j.error || 'No se ha podido mover.'); return; }
    cargar();
  };

  const tambienEn = async (hijo: string, madre: string) => {
    setAviso(null);
    const r = await fetch('/api/tronco/arista', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ hijo, madre }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setAviso(j.error || 'No se ha podido colgar.'); return; }
    cargar();
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-14 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Dibujando el árbol…
      </div>
    );
  }
  if (fallo) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        El árbol no se ha podido cargar: {fallo}. La rueda de abajo sigue funcionando.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-3">
        <GitBranch className="h-4 w-4 shrink-0 text-slate-400" />
        <h2 className="text-sm font-black text-slate-800">El árbol del conocimiento</h2>
        <span className="text-[11px] text-slate-400">
          Pulsa para abrir una rama.
          {puedeEditar && ' Arrastra un objetivo a otra rama para moverlo, o con Alt para colgarlo también ahí.'}
        </span>
      </header>

      {aviso && (
        <p className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {aviso}
        </p>
      )}

      <div ref={cajaRef} className="overflow-x-auto p-3">
        <svg
          ref={svgRef}
          width={ancho + MARGEN}
          height={alto}
          viewBox={`${-MARGEN} ${-MARGEN} ${ancho + MARGEN} ${alto}`}
          style={{ maxWidth: 'none' }}
          onPointerMove={e => { if (arrastrando) setEncima(ramaBajoElPunto(puntoEnSvg(e))?.id ?? null); }}
          onPointerUp={e => {
            if (!arrastrando) return;
            const destino = ramaBajoElPunto(puntoEnSvg(e));
            const cae = arrastrando;
            setArrastrando(null); setEncima(null);
            if (destino && destino.id !== cae.madre) {
              e.altKey ? tambienEn(cae.id, destino.id) : mover(cae.id, cae.madre, destino.id);
            }
          }}
        >
          {/* LOS TRAZOS PRIMERO, para que ningún nombre quede debajo de una línea. */}
          {nodos.map(n => {
            const madre = n.madreCamino ? porCamino[n.madreCamino] : null;
            if (!madre) return null;
            const x1 = madre.x + 10, y1 = madre.y, x2 = n.x - 8, y2 = n.y;
            const medio = (x1 + x2) / 2;
            return (
              <path
                key={`l${n.camino}`}
                d={`M${x1} ${y1} C ${medio} ${y1}, ${medio} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={n.color}
                strokeWidth={grosor(n.nivel)}
                strokeLinecap="round"
                opacity={n.repetido ? 0.25 : 0.55}
                strokeDasharray={n.repetido ? '3 4' : undefined}
              />
            );
          })}

          {nodos.map(n => {
            const esArrastrable = puedeEditar && n.tipo === 'objetivo' && !n.repetido;
            const resaltada = encima === n.id && (n.tipo === 'rama' || n.tipo === 'raiz');
            const abierto = abiertos.has(n.camino);
            return (
              <g
                key={n.camino}
                className={cn(n.hijos > 0 && !n.repetido && 'cursor-pointer', esArrastrable && 'cursor-grab')}
                onPointerDown={e => {
                  if (!esArrastrable) return;
                  e.preventDefault();
                  (e.target as Element).releasePointerCapture?.(e.pointerId);
                  setArrastrando({ id: n.id, madre: n.madreId || RAIZ, nombre: n.nombre });
                }}
                onClick={() => {
                  if (arrastrando) return;
                  onElegir?.(n.id);
                  if (n.hijos > 0 && !n.repetido) alternar(n.camino, n.x);
                }}
              >
                {resaltada && (
                  <rect x={n.x - 14} y={n.y - FILA / 2} width={PASO - 12} height={FILA}
                        rx={8} fill={n.color} opacity={0.12} />
                )}
                <circle
                  cx={n.x} cy={n.y}
                  r={n.tipo === 'raiz' ? 9 : n.tipo === 'rama' ? 7 : n.tipo === 'objetivo' ? 5.5 : 3.5}
                  fill={n.repetido ? '#fff' : n.color}
                  stroke={n.color}
                  strokeWidth={n.repetido ? 1.6 : 0}
                  strokeDasharray={n.repetido ? '2 2' : undefined}
                />
                {/* EL NOMBRE, CON HALO ─────────────────────────────────
                    `paintOrder: stroke` pinta primero un borde blanco y
                    encima la letra, así que el nombre se lee aunque le pase
                    un tronco de 14 px por detrás. Sin esto, «TECNOLOGÍA»
                    sale tachada por su propia rama: el trazo va de la madre
                    al hijo y el nombre está justo en medio del camino.

                    El número de hijos va DENTRO del mismo `text`, como un
                    trozo más, y no en uno aparte colocado con una cuenta.
                    Lo intenté con la cuenta —ancho estimado por número de
                    letras— y se montaba encima del nombre en la mitad de
                    los casos: «ALIMENTACIÓN8». El navegador sabe dónde
                    acaba un texto; estimarlo con una multiplicación es
                    fingir que lo sabes tú. */}
                <text
                  x={n.x + 13} y={n.y + 3.5}
                  style={{
                    fontSize: n.tipo === 'raiz' ? 12 : n.tipo === 'rama' ? 11.5 : 10.5,
                    fontWeight: n.tipo === 'subtema' ? 600 : 900,
                    fill: n.repetido ? '#94a3b8' : n.tipo === 'subtema' ? '#475569' : '#0f172a',
                    paintOrder: 'stroke',
                    stroke: '#fff',
                    strokeWidth: 3.5,
                    strokeLinejoin: 'round',
                    userSelect: 'none',
                  }}
                >
                  {n.nombre.length > 24 ? n.nombre.slice(0, 23) + '…' : n.nombre}
                  {n.hijos > 0 && !n.repetido && (
                    <tspan style={{ fontSize: 9, fontWeight: 700, fill: abierto ? '#cbd5e1' : '#94a3b8' }}>
                      {abierto ? '  −' : `  +${n.hijos}`}
                    </tspan>
                  )}
                  {n.repetido && (
                    <tspan style={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}>
                      {`  ·también aquí`}
                    </tspan>
                  )}
                </text>
                {/* EL MICELIO, DICHO. Sale aquí y no en una leyenda porque la
                    pregunta («¿por qué está esto dos veces?») se hace mirando
                    el nodo, no el pie del dibujo. */}
                {n.madres > 1 && (
                  <title>{`${n.nombre} cuelga de ${n.madres} ramas. Es el mismo tema, no una copia.`}</title>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {arrastrando && (
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] font-bold text-slate-500">
          Moviendo <b className="text-slate-800">{arrastrando.nombre}</b> — suéltalo sobre una rama.
          Con <b>Alt</b> se queda también donde estaba.
        </p>
      )}
    </section>
  );
}
