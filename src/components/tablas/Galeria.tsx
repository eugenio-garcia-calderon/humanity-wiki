import { useEffect, useMemo, useRef, useState } from 'react';
import TextoEnriquecido from '../knowledge/TextoEnriquecido';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowRightLeft, ArrowUpToLine, Copy, ExternalLink, FileText, GripVertical, Link2, Loader2, MoreHorizontal, Move, Plus, Trash2 } from 'lucide-react';
import { formatear, type Celda, type Columna } from './Celda';
import BotonCompra from './BotonCompra';
import { FichaRelacion } from './Relacion';
import { cn } from '../../utils/cn';
import { useSitio } from '../sitio/ContextoSitio';
import type { TamanoGaleria } from '../../utils/bloques';
import GaleriaCarrusel from './GaleriaCarrusel';
import MenuAcciones, { type AccionMenu } from './MenuAcciones';
import { duplicarFila, eliminarFila, restaurarFila } from './accionesFila';

// ============================================================================
// TABLAS · LA GALERÍA (2026-09-30)
// ============================================================================
// Eugenio: «una vista de galería como la que tiene Notion, y que sea la vista
// por defecto; cuando pinchas en la imagen se te abre esa página dentro de esa
// base de datos».
//
// Cada tarjeta ES una página: la fila y su cuerpo. La imagen sale de la
// portada de la página o, si no tiene, de la primera imagen que haya dentro
// —lo mismo que hace Notion con «contenido de la página»—. Las filas de antes
// del 30 de septiembre no tienen página todavía: se crea al abrirlas.

type Fila = {
  id: string;
  pagina_id?: string | null;
  pagina?: { titulo: string; imagen: string | null; icono: string | null; resumen: string; descripcion?: string | null; encuadre?: { x: number; y: number } | null } | null;
  celdas: Record<string, Celda>;
  apuntados?: Record<string, any[]>;
  archivos?: Record<string, any[]>;
};

/** Ancho mínimo de una tarjeta, en píxeles, por tamaño. */
export const ANCHO_TARJETA: Record<TamanoGaleria, number> = {
  xxs: 84, xs: 112, pequeno: 150, mediano: 220, grande: 300, 'muy-grande': 420,
};

/** Cuántas propiedades se enseñan bajo el título. Más no caben sin que la
 *  tarjeta se convierta en una ficha. */
const PROPIEDADES = 3;

/** Las galerías montadas ahora mismo en la página y editables, para ofrecer
 *  «Mover a…» en el menú de una tarjeta (el arrastre no existe en una pantalla
 *  táctil ni con el teclado). Se lee al abrir el menú, nunca al pintar. */
type Receptora = { tablaId: string; titulo: string; recibir: (d: { fila: string; tabla: string; nombre?: string }, antes: string | null) => Promise<void> };
const galerias = new Map<symbol, { actual: Receptora }>();

/** Lo que viaja en un arrastre de entrada, para soltarla en OTRA base de datos. */
const MIME_FILA = 'application/x-humanity-fila';
const esFilaAjena = (e: React.DragEvent) => Array.from(e.dataTransfer.types || []).includes(MIME_FILA);

/** ¿El icono es una imagen subida o un emoji? */
const esUrl = (s: string) => /^(https?:|\/)/.test(s);

const LETRA_NOMBRE: Record<TamanoGaleria, string> = {
  xxs: 'text-[10px] leading-tight', xs: 'text-xs', pequeno: 'text-sm', mediano: 'text-base', grande: 'text-lg', 'muy-grande': 'text-xl',
};

export default function Galeria({ tablaId, columnas, filas, columnaTitulo, editable, onCambio, claseTitulo = '', tamano = 'mediano', tamanoNombre, visibles, sinMargen = false, centrada = false, carrusel = false, velocidad, ordenable = false, motivoSinOrden, tituloTabla }: {
  /** Carrusel (una fila que se mueve) o galería quieta (2026-10-06). */
  carrusel?: boolean;
  /** Carrusel: píxeles por segundo. */
  velocidad?: number;
  /** Se pueden arrastrar las tarjetas para cambiar el orden de la tabla. */
  ordenable?: boolean;
  /** Cómo se llama esta base de datos: sale en «Mover a…» de las demás galerías. */
  tituloTabla?: string;
  /** Por qué no se puede ordenar a mano (p. ej. hay un orden por propiedad). */
  motivoSinOrden?: string;
  tablaId: string;
  columnas: Columna[];
  filas: Fila[];
  columnaTitulo: string | null;
  editable: boolean;
  /** Tras crear algo, para que la tabla se recargue. */
  onCambio: () => void;
  /** El color de texto del bloque, para los títulos de las tarjetas. */
  claseTitulo?: string;
  /** Tamaño de las tarjetas. */
  tamano?: TamanoGaleria;
  /** Letra del nombre de cada tarjeta; sin valor, la que corresponde al tamaño de la tarjeta. */
  tamanoNombre?: TamanoGaleria;
  /** Qué columnas se ven en la tarjeta, en orden. Sin valor, las tres primeras. */
  visibles?: string[];
  /** Sin el relleno de alrededor: la galería limpia de una página. */
  sinMargen?: boolean;
  /** Las tarjetas al centro, no pegadas a la izquierda (bloque de página). */
  centrada?: boolean;
}) {
  const navigate = useNavigate();
  // En una página publicada, la tarjeta abre la subpágina DENTRO del sitio
  // (su dominio, su subdominio), no el editor de la plataforma.
  const sitio = useSitio();
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  // ── ORDENAR ARRASTRANDO (2026-10-08) ─────────────────────────────────────
  // Eugenio: «pinchar una de las imágenes y arrastrarla a una posición nueva,
  // por ejemplo la primera». La tarjeta soltada va ANTES de la que tiene
  // debajo si se suelta en su mitad izquierda, y DESPUÉS si es en la derecha.
  // Se enseña el resultado al instante (`ordenLocal`) y se guarda en
  // segundo plano; si falla, se vuelve atrás y se dice por qué.
  const [arrastrada, setArrastrada] = useState<string | null>(null);
  const [destino, setDestino] = useState<{ id: string; lado: 'antes' | 'despues'; eje: 'h' | 'v' } | null>(null);
  const [ordenLocal, setOrdenLocal] = useState<string[] | null>(null);
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [anuncio, setAnuncio] = useState('');
  useEffect(() => { setOrdenLocal(null); setArrastrada(null); setDestino(null); }, [filas]);
  // Si la tarjeta arrastrada se va a otra base de datos, desaparece de aquí
  // antes de que el navegador avise de que soltaron («dragend» no llega a un
  // elemento que ya no existe): sin esto, esta galería se quedaba creyendo
  // que seguía arrastrando y trataba lo que le soltaban como una orden de
  // recolocar una fila que ya no es suya.
  useEffect(() => {
    const limpiar = () => setTimeout(() => { setArrastrada(null); setDestino(null); setEntrando(false); }, 0);
    window.addEventListener('dragend', limpiar, true);
    window.addEventListener('drop', limpiar, true);
    return () => { window.removeEventListener('dragend', limpiar, true); window.removeEventListener('drop', limpiar, true); };
  }, []);

  const filasVis = useMemo(() => {
    let lista = filas.filter(f => !ocultas.has(f.id));
    if (ordenLocal) {
      const m = new Map(lista.map(f => [f.id, f]));
      const puestas = ordenLocal.map(id => m.get(id)).filter((f): f is Fila => !!f);
      const ya = new Set(puestas.map(f => f.id));
      lista = [...puestas, ...lista.filter(f => !ya.has(f.id))];
    }
    return lista;
  }, [filas, ordenLocal, ocultas]);

  const moverFila = async (id: string, antesDe: string | null) => {
    const ids = filasVis.map(f => f.id);
    const sin = ids.filter(x => x !== id);
    const i = antesDe ? sin.indexOf(antesDe) : sin.length;
    if (i < 0) return;
    const nuevo = [...sin.slice(0, i), id, ...sin.slice(i)];
    if (nuevo.join() === ids.join()) return;
    setOrdenLocal(nuevo);
    setAnuncio(`Movida a la posición ${nuevo.indexOf(id) + 1} de ${nuevo.length}`);
    try {
      const r = await fetch(`/api/bd/tablas/${tablaId}/orden-filas`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, antes_de: antesDe }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'No se pudo cambiar el orden.'); }
      onCambio();
    } catch (e: any) { setOrdenLocal(null); setFallo(e.message); }
  };

  const soltar = (f: Fila) => {
    const id = arrastrada, lado = destino?.id === f.id ? destino.lado : 'antes';
    setArrastrada(null); setDestino(null);
    if (!id || id === f.id) return;
    if (lado === 'antes') { moverFila(id, f.id); return; }
    const resto = filasVis.filter(x => x.id !== id);
    const k = resto.findIndex(x => x.id === f.id);
    moverFila(id, resto[k + 1]?.id ?? null);
  };

  // ── SOLTAR UNA ENTRADA DE OTRA BASE DE DATOS (2026-10-08) ────────────────
  // Eugenio: «arrastrar una entrada de una base de datos a otra, como
  // Notion». La tarjeta lleva su id y su tabla en el arrastre; quien la recibe
  // pide al servidor que la mueva aquí (`mover-a-tabla`), y todas las
  // galerías de la página se recargan (`bd:cambio`).
  const [entrando, setEntrando] = useState(false);
  const colocarAjena = async (d: { fila: string; tabla: string; nombre?: string }, antes: string | null) => {
    setFallo(null);
    try {
      if (d.tabla === tablaId) {
        // Otra vista de la MISMA base de datos: es solo recolocar.
        if (antes === d.fila) return;
        const r = await fetch(`/api/bd/tablas/${tablaId}/orden-filas`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.fila, antes_de: antes }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo cambiar el orden.');
      } else {
        setAviso({ texto: `Moviendo «${d.nombre || 'la entrada'}»…` });
        const r = await fetch(`/api/bd/filas/${d.fila}/mover-a-tabla`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tabla_destino: tablaId, antes_de: antes }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'No se pudo mover la entrada.');
        const donde = j.tabla_titulo || tituloTabla || 'esta base de datos';
        const perdidas: string[] = j.perdidas || [];
        // «Deshacer» solo si no se perdió nada: lo perdido no vuelve.
        setAviso(perdidas.length
          ? { texto: `Movida a «${donde}». Sin sitio allí, no pasó: ${perdidas.join(', ')}`, larga: true }
          : { texto: `Movida a «${donde}»`, deshacer: async () => {
            // Deshacer = mandarla de vuelta a la base de datos de la que salió.
            const v = await fetch(`/api/bd/filas/${d.fila}/mover-a-tabla`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tabla_destino: d.tabla }) });
            if (!v.ok) { setFallo((await v.json().catch(() => ({}))).error || 'No se pudo deshacer.'); return; }
            setAviso(null); onCambio();
            window.dispatchEvent(new CustomEvent('bd:cambio', { detail: { desde: tablaId } }));
          } });
      }
      onCambio();
      window.dispatchEvent(new CustomEvent('bd:cambio', { detail: { desde: tablaId } }));
    } catch (err: any) { setAviso(null); setFallo(err.message); }
  };
  const recibir = (e: React.DragEvent, antes: string | null) => {
    setEntrando(false); setDestino(null);
    let d: { fila: string; tabla: string; nombre?: string } | null = null;
    try { d = JSON.parse(e.dataTransfer.getData(MIME_FILA)); } catch { d = null; }
    if (!d?.fila || !d.tabla) return;
    e.preventDefault(); e.stopPropagation();
    colocarAjena(d, antes);
  };
  // Esta galería se anuncia como destino posible de «Mover a…».
  const receptora = useRef<Receptora>({ tablaId, titulo: tituloTabla || '', recibir: colocarAjena });
  receptora.current = { tablaId, titulo: tituloTabla || '', recibir: colocarAjena };
  useEffect(() => {
    if (!editable || sitio) return;
    const k = Symbol('galeria');
    galerias.set(k, { actual: receptora.current });
    const t = setInterval(() => { const g = galerias.get(k); if (g) g.actual = receptora.current; }, 500);
    return () => { clearInterval(t); galerias.delete(k); };
  }, [editable, sitio]);

  /** Con el teclado: Alt + flecha mueve la tarjeta enfocada un puesto. */
  const moverUno = (id: string, dir: -1 | 1) => {
    const k = filasVis.findIndex(x => x.id === id);
    if (k < 0) return;
    if (dir < 0) { if (k > 0) moverFila(id, filasVis[k - 1].id); }
    else if (k < filasVis.length - 1) moverFila(id, filasVis[k + 2]?.id ?? null);
  };

  // ── MENÚ DE LA ENTRADA (2026-10-08) ──────────────────────────────────────
  // Clic derecho (PC), dos dedos (Mac) o «⋯» (móvil): abrir, duplicar,
  // copiar el enlace y eliminar. Eliminar no pregunta: la entrada queda
  // recuperable y el aviso trae «Deshacer», como en Notion.
  const [menu, setMenu] = useState<{ fila: Fila; x: number; y: number } | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void; larga?: boolean } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.deshacer || aviso.larga ? 10000 : 3500);
    return () => clearTimeout(t);
  }, [aviso]);
  const nombreDe = (f: Fila) => (columnas.find(c => c.id === columnaTitulo)
    ? formatear(f.celdas[columnaTitulo as string] ?? { estado: 'vacia' }, columnas.find(c => c.id === columnaTitulo)!) : '')
    || f.pagina?.titulo || 'Sin título';

  const duplicar = async (f: Fila) => {
    setFallo(null); setAviso({ texto: 'Duplicando…' });
    try { await duplicarFila(f.id); onCambio(); setAviso({ texto: 'Entrada duplicada, debajo de la original' }); }
    catch (e: any) { setAviso(null); setFallo(e.message); }
  };
  const eliminar = async (f: Fila) => {
    setFallo(null);
    try {
      await eliminarFila(f.id);
      setOcultas(o => new Set(o).add(f.id)); onCambio();
      setAviso({
        texto: `«${nombreDe(f)}» eliminada`,
        deshacer: async () => {
          try { await restaurarFila(f.id); setOcultas(o => { const n = new Set(o); n.delete(f.id); return n; }); onCambio(); setAviso(null); }
          catch (e: any) { setFallo(e.message); }
        },
      });
    } catch (e: any) { setFallo(e.message); }
  };
  const accionesDe = (f: Fila, puedeMover: boolean): AccionMenu[] => [
    { etiqueta: 'Abrir', icono: FileText, onClick: () => abrir(f) },
    { etiqueta: 'Abrir en pestaña nueva', icono: ExternalLink, deshabilitada: !f.pagina_id, onClick: () => window.open(f.pagina_id ? `/paginas/${f.pagina_id}` : '/', '_blank', 'noopener') },
    { etiqueta: 'Copiar enlace', icono: Link2, deshabilitada: !f.pagina_id, onClick: () => {
      navigator.clipboard?.writeText(`${window.location.origin}/paginas/${f.pagina_id}`)
        .then(() => setAviso({ texto: 'Enlace copiado' }), () => setFallo('No se pudo copiar el enlace.'));
    } },
    { etiqueta: 'Duplicar', icono: Copy, onClick: () => duplicar(f) },
    ...(puedeMover ? [
      { etiqueta: 'Mover al principio', icono: ArrowUpToLine, deshabilitada: filasVis[0]?.id === f.id, onClick: () => moverFila(f.id, filasVis[0]?.id ?? null) },
      { etiqueta: 'Mover al final', icono: ArrowDownToLine, deshabilitada: filasVis[filasVis.length - 1]?.id === f.id, onClick: () => moverFila(f.id, null) },
    ] : []),
    ...[...new Map([...galerias.values()].map(g => g.actual).filter(g => g.tablaId !== tablaId && g.titulo).map(g => [g.tablaId, g])).values()].map(g => (
      { etiqueta: `Mover a «${g.titulo.length > 22 ? g.titulo.slice(0, 21) + '…' : g.titulo}»`, icono: ArrowRightLeft, onClick: () => { g.recibir({ fila: f.id, tabla: tablaId, nombre: nombreDe(f) }, null); } } as AccionMenu)),
    { etiqueta: 'Eliminar', icono: Trash2, peligro: true, onClick: () => eliminar(f) },
  ];

  const colTitulo = columnas.find(c => c.id === columnaTitulo) || null;
  // Las que se ven en la tarjeta: las que eligió quien edita o, si no eligió,
  // las tres primeras. Una lista vacía elegida a propósito es «ninguna».
  const otras = visibles
    ? visibles.map(id => columnas.find(c => c.id === id)).filter((c): c is Columna => !!c && c.id !== columnaTitulo)
    // Without a choice, the first few — plus the buy button wherever it sits:
    // a product card without its button is a catalogue nobody can buy from.
    : [...columnas.filter(c => c.id !== columnaTitulo && c.tipo !== 'compra').slice(0, PROPIEDADES), ...columnas.filter(c => c.tipo === 'compra')];

  const abrir = async (f: Fila) => {
    setFallo(null);
    if (f.pagina_id) { navigate(sitio ? sitio.enlacePagina(f.pagina_id) : `/paginas/${f.pagina_id}`); return; }
    // Un lector no puede crear la página que falta: lo hará su autor al
    // abrirla la primera vez.
    if (sitio) return;
    setAbriendo(f.id);
    try {
      const r = await fetch(`/api/bd/filas/${f.id}/pagina`, { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (!r.ok || !j.pagina_id) throw new Error(j.error || 'No se pudo abrir la página.');
      navigate(`/paginas/${j.pagina_id}`);
    } catch (e: any) { setFallo(e.message); setAbriendo(null); }
  };

  /** «+ Nuevo», como en Notion: la página nace y se abre para escribirla. */
  const nueva = async () => {
    setFallo(null);
    setAbriendo('nueva');
    try {
      const r = await fetch(`/api/bd/tablas/${tablaId}/filas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const j = await r.json();
      if (!r.ok || !j.pagina_id) throw new Error(j.error || 'No se pudo crear la página.');
      onCambio();
      navigate(`/paginas/${j.pagina_id}`);
    } catch (e: any) { setFallo(e.message); setAbriendo(null); }
  };

  /** Una tarjeta. `copia` es la segunda vuelta del carrusel: no se enfoca ni se lee. */
  // XS y XXS (2026-10-08): miniaturas con solo imagen y nombre. Sin descripción,
  // propiedades ni mandos grandes: no caben, y taparían la imagen.
  const chica = tamano === 'xs' || tamano === 'xxs';
  const tarjeta = (f: Fila, copia = false, arrastre = false, mover = false) => {
          const conMenu = editable && !sitio && !copia;
          const nombre = (colTitulo && formatear(f.celdas[colTitulo.id] ?? { estado: 'vacia' }, colTitulo))
            || f.pagina?.titulo || '';
          const icono = f.pagina?.icono;
          return (
            // Un `div` que hace de botón, no un `<button>`: dentro van los
            // mandos de recolocar la imagen, y un botón no puede llevar otro.
            <div key={copia ? `${f.id}-copia` : f.id} role="link" tabIndex={copia ? -1 : 0}
              aria-hidden={copia || undefined}
              aria-disabled={!!sitio && !f.pagina_id}
              onClick={() => abrir(f)}
              onKeyDown={e => {
                if (e.key === 'Enter') abrir(f);
                if (mover && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); e.stopPropagation(); moverUno(f.id, e.key === 'ArrowLeft' ? -1 : 1); }
              }}
              onContextMenu={conMenu ? e => {
                e.preventDefault(); e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                // Con la tecla de menú no hay puntero: se abre en la esquina de la tarjeta.
                const sinPuntero = e.clientX === 0 && e.clientY === 0;
                setMenu({ fila: f, x: sinPuntero ? r.left + 16 : e.clientX, y: sinPuntero ? r.top + 16 : e.clientY });
              } : undefined}
              draggable={arrastre || undefined}
              onDragStart={arrastre ? e => {
                setArrastrada(f.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id);
                e.dataTransfer.setData(MIME_FILA, JSON.stringify({ fila: f.id, tabla: tablaId, nombre: nombreDe(f) }));
              } : undefined}
              onDragEnd={arrastre ? e => {
                setArrastrada(null); setDestino(null);
                // Soltada en otra base de datos: aquí ya no está.
                if (e.dataTransfer.dropEffect === 'move') onCambio();
              } : undefined}
              onDragOver={arrastre ? e => {
                const propia = !!arrastrada;
                if (propia ? arrastrada === f.id : !esFilaAjena(e)) return;
                // Dentro de la misma galería solo se reordena si el orden es a mano.
                if (propia && !mover) return;
                e.preventDefault(); e.dataTransfer.dropEffect = 'move';
                if (!mover) return;
                const r = e.currentTarget.getBoundingClientRect();
                // En una rejilla de varias columnas se decide por la mitad izquierda o
                // derecha; en una sola columna (una página estrecha, un teléfono), por
                // la mitad de arriba o de abajo. Se sabe mirando si algún vecino
                // está a la misma altura.
                const vecino = [e.currentTarget.previousElementSibling, e.currentTarget.nextElementSibling]
                  .some(v => v && Math.abs(v.getBoundingClientRect().top - r.top) < r.height / 2);
                const eje = vecino ? 'h' : 'v';
                const lado = (eje === 'h' ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2) ? 'antes' : 'despues';
                setDestino(d => (d && d.id === f.id && d.lado === lado && d.eje === eje ? d : { id: f.id, lado, eje }));
              } : undefined}
              onDragLeave={arrastre ? e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDestino(d => (d?.id === f.id ? null : d));
              } : undefined}
              onDrop={arrastre ? e => {
                if (arrastrada) { if (!mover) return; e.preventDefault(); e.stopPropagation(); soltar(f); return; }
                if (!esFilaAjena(e)) return;
                // De otra base de datos: antes o después de ESTA tarjeta, o al final si el orden no es a mano.
                let antes: string | null = null;
                if (mover) {
                  const lado = destino?.id === f.id ? destino.lado : 'antes';
                  antes = lado === 'antes' ? f.id : (filasVis[filasVis.findIndex(x => x.id === f.id) + 1]?.id ?? null);
                }
                recibir(e, antes);
              } : undefined}
              // SIN RECUADRO (2026-10-01, Eugenio: «sin esas líneas que envuelven
              // al contenido en forma de rectángulos»): la imagen con sus
              // esquinas redondeadas y el texto debajo, como un portfolio.
              className={cn('group relative text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl transition-opacity', arrastrada === f.id && 'opacity-40')}>
              {/* Dónde caerá la tarjeta: una barra verde en el lado correspondiente. */}
              {mover && destino?.id === f.id && (
                <span aria-hidden className={cn('pointer-events-none absolute z-20 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]',
                  destino.eje === 'h'
                    ? cn('top-0 h-[calc(100%-0.5rem)] w-1', destino.lado === 'antes' ? '-left-2.5' : '-right-2.5')
                    : cn('inset-x-0 h-1', destino.lado === 'antes' ? '-top-3' : '-bottom-3')
                )} />
              )}
              <div className="relative aspect-[16/9] bg-slate-50 rounded-xl overflow-hidden grid place-items-center transition-shadow group-hover:shadow-md">
                {f.pagina?.imagen ? (
                  <ImagenTarjeta src={f.pagina.imagen} encuadre={f.pagina.encuadre ?? null}
                    recolocable={editable && !sitio && !!f.pagina_id && !chica}
                    onGuardar={async (x, y) => {
                      const r = await fetch(`/api/bd/filas/${f.id}/encuadre`, {
                        method: 'PUT', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ x, y }),
                      });
                      if (!r.ok) { setFallo('No se pudo guardar la posición de la imagen.'); return; }
                      onCambio();
                    }} />
                ) : f.pagina?.resumen ? (
                  // Sin imagen, Notion enseña el principio del texto. Mejor
                  // que un hueco gris: dice de qué va sin abrirla.
                  <p className="w-full h-full p-3 text-[11px] leading-snug text-slate-400 overflow-hidden">{f.pagina.resumen}</p>
                ) : (
                  <FileText className="w-8 h-8 text-slate-200" />
                )}
                {/* El asa dice que se puede arrastrar; toda la tarjeta se arrastra. */}
                {mover && !chica && (
                  <span role="img" aria-label="Arrastrar para cambiar el orden" title="Arrastra para cambiar el orden (Alt + flechas con el teclado)"
                    className="absolute bottom-2 left-2 z-10 grid h-8 w-8 cursor-grab place-items-center rounded-lg border border-slate-200 bg-white/90 text-slate-500 opacity-60 shadow-sm transition-opacity group-hover:opacity-100 [@media(hover:none)]:hidden">
                    <GripVertical className="h-4 w-4" />
                  </span>
                )}
                {/* Los tres puntitos: lo que en el PC es el botón derecho y en el
                    Mac los dos dedos. En una pantalla táctil se ven siempre. */}
                {conMenu && (
                  <button type="button" aria-label="Más opciones" title="Más opciones" aria-haspopup="menu" aria-expanded={menu?.fila.id === f.id}
                    onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ fila: f, x: r.right - 240, y: r.bottom + 4 }); }}
                    onKeyDown={e => e.stopPropagation()}
                    className={cn('absolute z-10 grid place-items-center rounded-lg', chica ? 'right-1 top-1 h-6 w-6 [@media(hover:none)]:h-9 [@media(hover:none)]:w-9' : 'right-2 top-2 h-8 w-8 [@media(hover:none)]:h-11 [@media(hover:none)]:w-11',
                    ' border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition-opacity hover:bg-white hover:text-slate-900 focus:opacity-100 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100')}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* CENTRADOS EN UNA PÁGINA (2026-10-02, Eugenio: «el título de cada
                  tarjeta centrado, al igual que la descripción, y no a la
                  izquierda»). En la herramienta «Tablas» siguen a la izquierda. */}
              <div className={cn(chica ? 'px-0 pt-1.5 pb-0.5 space-y-0.5' : 'px-0.5 pt-2.5 pb-1 space-y-1', centrada && 'text-center')}>
                <p className={cn('flex items-center gap-1.5 font-bold min-w-0', tamanoNombre ? LETRA_NOMBRE[tamanoNombre] : chica ? (tamano === 'xxs' ? 'text-[10px] leading-tight' : 'text-[11px] leading-tight') : 'text-sm', centrada && 'justify-center', claseTitulo || 'text-slate-800')}>
                  {abriendo === f.id ? <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-400" />
                    : icono ? (esUrl(icono)
                      ? <img src={icono} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                      : <span className="shrink-0">{icono}</span>)
                    : null}
                  <span className={cn('truncate', !nombre && 'text-slate-400')}>{nombre || 'Sin título'}</span>
                </p>
                {/* La descripción de la página, si la tiene: imagen, título y
                    descripción, como en la propia página. */}
                {!chica && f.pagina?.descripcion && (
                  <p className="text-xs text-slate-500 leading-snug line-clamp-2 whitespace-pre-line"><TextoEnriquecido texto={f.pagina.descripcion} /></p>
                )}
                {!chica && otras.map(c => {
                  // Una relación se enseña como fichas que llevan a la página
                  // enlazada: «Movilidad» en la tarjeta del coche volador.
                  if (c.tipo === 'relacion') {
                    const lista = f.apuntados?.[c.id] || [];
                    // Con «qué se ve» elegido, cada enlazado sale con su imagen,
                    // su texto y sus campos (2026-10-02). Sin elegir, las fichas
                    // de siempre.
                    if (lista.length && Array.isArray(c.config?.mostrar) && c.config.mostrar.length) {
                      return (
                        <div key={c.id} className="pt-1 space-y-1.5">
                          {lista.map((a: any) => <div key={a.id}><Enlazado a={a} /></div>)}
                        </div>
                      );
                    }
                    return lista.length ? (
                      <div key={c.id} className={cn('flex flex-wrap items-center gap-1 pt-0.5', centrada && 'justify-center')}>
                        {lista.map((a: any) => <FichaRelacion key={a.id} a={a} />)}
                      </div>
                    ) : null;
                  }
                  // The shop card (2026-10-06): the buy button itself, so a
                  // gallery of products is a catalogue you can buy from.
                  if (c.tipo === 'compra') {
                    const cc = f.celdas[c.id];
                    return cc?.estado === 'ok' ? <BotonCompra key={c.id} datos={cc.valor} centrado={centrada} /> : null;
                  }
                  const v = formatear(f.celdas[c.id] ?? { estado: 'vacia' }, c,
                    { apuntados: f.apuntados?.[c.id], archivos: f.archivos?.[c.id] });
                  return v ? (
                    <p key={c.id} className="text-xs text-slate-500 truncate">
                      <span className="text-slate-400">{c.nombre}: </span>{v}
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          );
  };

  /** El «+ Nueva página» de quien edita: junto a «Ver todo» y dentro del pop-up. */
  const botonNueva = editable ? (
    <button onClick={nueva} disabled={abriendo === 'nueva'}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 text-[13px] font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-60">
      {abriendo === 'nueva' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Nueva página
    </button>
  ) : null;

  /** La galería entera, sin carrusel: todas las entradas, las filas que hagan falta. */
  const rejilla = (
    <div>
      <div className={cn(chica ? 'grid gap-x-2 gap-y-3' : 'grid gap-x-4 gap-y-5', entrando && 'rounded-xl ring-2 ring-emerald-300 ring-offset-4 bg-emerald-50/40')}
        onDragOver={editable && !sitio ? e => { if (!arrastrada && esFilaAjena(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setEntrando(true); } } : undefined}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEntrando(false); }}
        onDrop={editable && !sitio ? e => { if (!arrastrada && esFilaAjena(e)) recibir(e, null); } : undefined}
        style={centrada
        ? { gridTemplateColumns: `repeat(auto-fit, minmax(min(${ANCHO_TARJETA[tamano] ?? 220}px, 100%), ${Math.round((ANCHO_TARJETA[tamano] ?? 220) * 1.5)}px))`, justifyContent: 'center' }
        : { gridTemplateColumns: `repeat(auto-fill, minmax(min(${ANCHO_TARJETA[tamano] ?? 220}px, 100%), 1fr))` }}>
        {filasVis.map(f => tarjeta(f, false, editable && !sitio, ordenable && editable && !sitio))}
        {editable && (
          <button onClick={nueva} disabled={abriendo === 'nueva'}
            onDragOver={arrastrada ? e => { e.preventDefault(); } : undefined}
            onDrop={arrastrada ? e => { e.preventDefault(); const id = arrastrada; setArrastrada(null); setDestino(null); moverFila(id, null); } : undefined}
            className={cn('aspect-[16/9] rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-colors', chica ? 'min-h-0' : 'min-h-[9rem]')} aria-label="Nueva página">
            {abriendo === 'nueva' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {tamano !== 'xxs' && !(tamano === 'xs') && 'Nueva página'}
          </button>
        )}
      </div>
      {editable && !ordenable && motivoSinOrden && filas.length > 1 && (
        <p className="mt-3 text-center text-[11px] font-bold text-slate-400">{motivoSinOrden}</p>
      )}
    </div>
  );

  return (
    <div className={sinMargen ? '' : 'p-3'}>
      {fallo && <p className="mb-2 text-xs font-bold text-rose-600">{fallo}</p>}
      {/* EL TAMAÑO DE LAS TARJETAS (2026-10-01). Se da como ANCHO MÍNIMO de
          tarjeta y la rejilla mete las que quepan: así el mismo «grande» son
          tres por fila en un escritorio ancho y una en un teléfono, sin un
          ajuste distinto para cada pantalla. */}
      {/* CENTRADA (2026-10-02): con `auto-fill` y `1fr` sobraban columnas
          vacías a la derecha y dos tarjetas quedaban pegadas a la izquierda.
          Con `auto-fit` las columnas vacías desaparecen, cada tarjeta crece
          como mucho un 50 % y lo que sobra se reparte a los dos lados. */}
      {/* UNA SOLA FILA QUE SE MUEVE (2026-10-06): ver `GaleriaCarrusel`. Quien edita
          ve «+ Nueva página» al lado de «Ver todo». */}
      {/* GALERÍA O CARRUSEL (2026-10-06, Eugenio: «que se pueda escoger
          entre la galería, estática, y el carrusel móvil»). */}
      {carrusel ? (
        <GaleriaCarrusel ancho={ANCHO_TARJETA[tamano] ?? 220} velocidad={velocidad}
          tarjetas={filasVis.map(f => tarjeta(f))} copias={filasVis.map(f => tarjeta(f, true))}
          pie={botonNueva} todo={rejilla} />
      ) : rejilla}
      {!filas.length && !editable && (
        <p className="py-6 text-center text-xs text-slate-400">Todavía no hay nada en esta base de datos.</p>
      )}
      <span className="sr-only" role="status" aria-live="polite">{anuncio}</span>
      {menu && <MenuAcciones x={menu.x} y={menu.y} acciones={accionesDe(menu.fila, ordenable && editable && !sitio && filasVis.length > 1)} onCerrar={() => setMenu(null)} etiqueta={`Acciones de ${nombreDe(menu.fila)}`} />}
      {aviso && (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[400] flex h-11 max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 text-[13px] font-bold text-white shadow-2xl">
          <span className="truncate">{aviso.texto}</span>
          {aviso.deshacer && <button type="button" onClick={aviso.deshacer} className="shrink-0 rounded-md px-1.5 py-0.5 font-black text-emerald-300 hover:bg-white/10">Deshacer</button>}
        </div>
      )}
    </div>
  );
}

/**
 * La imagen de una tarjeta, con «Recolocar» como en Notion: se pulsa, se
 * arrastra la imagen dentro del marco y se guarda. La posición es el
 * `object-position` en %, así que vale igual para cualquier tamaño de
 * tarjeta y de pantalla.
 */
function ImagenTarjeta({ src, encuadre, recolocable, onGuardar }: {
  src: string;
  encuadre: { x: number; y: number } | null;
  recolocable: boolean;
  onGuardar: (x: number, y: number) => Promise<void>;
}) {
  const [modo, setModo] = useState(false);
  const [pos, setPos] = useState(encuadre || { x: 50, y: 50 });
  const [guardando, setGuardando] = useState(false);
  const inicio = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);
  const visible = modo ? pos : (encuadre || { x: 50, y: 50 });
  const parar = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    // `absolute inset-0` Y NO `w-full h-full` (2026-10-02). Dentro de la rejilla
    // del marco, `h-full` no se resolvía: la imagen salía con su alto natural,
    // el marco la recortaba por `overflow` y `object-position` no tenía nada
    // que mover —por eso «Recolocar» no hacía nada, y además el centro de la
    // imagen quedaba fuera de la parte visible, donde no se podía arrastrar.
    <div className={cn('absolute inset-0', modo && 'cursor-move touch-none')}
      onClick={modo ? parar : undefined}
      onMouseDown={modo ? e => e.preventDefault() : undefined}
      onPointerDown={modo ? e => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        inicio.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, w: r.width, h: r.height };
        e.currentTarget.setPointerCapture(e.pointerId);
      } : undefined}
      onPointerMove={modo ? e => {
        const i = inicio.current;
        if (!i) return;
        // Arrastrar la imagen hacia abajo enseña su parte de arriba: por eso
        // el desplazamiento resta.
        const c = (n: number) => Math.min(100, Math.max(0, n));
        setPos({ x: c(i.x - ((e.clientX - i.px) / i.w) * 100), y: c(i.y - ((e.clientY - i.py) / i.h) * 100) });
      } : undefined}
      onPointerUp={modo ? () => { inicio.current = null; } : undefined}>
      <img src={src} alt="" loading="lazy" draggable={false}
        onError={e => { e.currentTarget.style.display = 'none'; }}
        style={{ objectPosition: `${visible.x}% ${visible.y}%` }}
        className={cn('w-full h-full object-cover select-none', !modo && 'group-hover:scale-[1.02] transition-transform')} />

      {recolocable && !modo && (
        <button type="button"
          onClick={e => { e.stopPropagation(); setPos(encuadre || { x: 50, y: 50 }); setModo(true); }}
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <Move className="w-3 h-3" /> Recolocar
        </button>
      )}
      {modo && (
        <>
          <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-slate-900/75 text-white text-[10px] font-bold pointer-events-none">
            Arrastra la imagen
          </span>
          <div className="absolute bottom-2 right-2 flex gap-1" onPointerDown={parar}>
            <button type="button" onClick={e => { e.stopPropagation(); setModo(false); }}
              className="h-8 px-2.5 rounded-lg bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600">
              Cancelar
            </button>
            <button type="button" disabled={guardando}
              onClick={async e => { e.stopPropagation(); setGuardando(true); await onGuardar(pos.x, pos.y); setGuardando(false); setModo(false); }}
              className="h-8 px-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar posición'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Un elemento de otra base de datos dentro de la tarjeta, con lo que se haya
 * elegido enseñar de él: su imagen, su texto y sus campos. Lleva a su página.
 */
function Enlazado({ a }: { a: any }) {
  const sitio = useSitio();
  const m = a.muestra || {};
  const campos = (m.campos || [])
    .map((x: any) => ({ nombre: x.nombre, v: formatear(x.celda ?? { estado: 'vacia' }, x) }))
    .filter((x: any) => x.v);
  const pagina = a.extra?.pagina_id as string | undefined;
  const dentro = (
    <>
      {m.imagen && <img src={m.imagen} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100" />}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-slate-700 truncate">{a.etiqueta || 'Sin título'}</span>
        {m.texto && <span className="block text-[11px] text-slate-500 leading-snug line-clamp-2">{m.texto}</span>}
        {campos.map((x: any) => (
          <span key={x.nombre} className="block text-[11px] text-slate-500 truncate"><span className="text-slate-400">{x.nombre}: </span>{x.v}</span>
        ))}
      </span>
    </>
  );
  // `inline-flex`: dentro de una tarjeta centrada, la ficha va al centro y su
  // texto sigue alineado a su imagen.
  const clase = 'inline-flex max-w-full items-start gap-2 p-1.5 rounded-lg text-left align-top transition-colors';
  if (!pagina || a.existe === false) return <div className={clase}>{dentro}</div>;
  return (
    <Link to={sitio ? sitio.enlacePagina(pagina) : `/paginas/${pagina}`} onClick={e => e.stopPropagation()}
      className={cn(clase, 'hover:bg-slate-50')}>
      {dentro}
    </Link>
  );
}
