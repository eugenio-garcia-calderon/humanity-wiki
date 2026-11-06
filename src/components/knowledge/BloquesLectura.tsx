import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SubpaginasEnTarjetas } from '../sitio/SeccionesSitio';
import { enFilas, AIRE_BASE_DATOS, esPlegable, todosLosBloques, esBloqueDatos } from '../../utils/bloques';
import { LecturaBloqueDatos } from '../bloquesDatos/registro';
import { claseColor, PINTAN_SU_COLOR } from '../../utils/coloresBloque';
import EnlaceSubpagina from './EnlaceSubpagina';
import TextoEnriquecido from './TextoEnriquecido';
import { TarjetaMarcador, WebInsertada } from './BloqueEnlace';
import BloqueEmbed from './BloqueEmbed';
import PdfEmbebido from './PdfEmbebido';
// KaTeX se pide al pintar la primera fórmula (2026-10-06, #19).
const Formula = lazy(() => import('./Formula'));
import BloquePizarra from './BloquePizarra';
import EntityComments from './EntityComments';
import { FileText, Paperclip, ChevronRight, Info, AlertTriangle, Lightbulb, CheckCircle2, List, MessageCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Rejilla from '../tablas/Rejilla';
import ProductoPublico from './ProductoPublico';
import { Portada, RejillaProductos, Columnas, Franja } from './BloquesMaqueta';
import { MigasDePan, BotonVista } from './BloquesExtra';
import { ImagenVista } from './ImagenBloque';
import { useSitio } from '../sitio/ContextoSitio';
import { CargaEnOrden } from './CargaEnOrden';
import { BdContribuible } from '../sitio/Contribuir';
import { useEscaparate } from '../sitio/escaparate';
import { miniatura } from '../../utils/miniatura';
import { bloquesNoticia } from '../../utils/noticias';
import GaleriaNoticias from '../sitio/TarjetaNoticia';

// ============================================================================
// LEER UNA PÁGINA — el mismo contenido, sin nada con lo que tocarlo
// ============================================================================
// `Documento.tsx` sabe pintar bloques, pero lo sabe hacer ENTERO: 1.974 líneas
// donde cada bloque va enredado con el bloque activo, el guardado automático,
// el foco del cursor y los menús. Nada de eso existe para quien llega por un
// enlace a leer.
//
// Así que esto es lo que se ve cuando NO se puede escribir, y vive aparte para
// que la página pública no arrastre el editor entero.
//
// ── UNA SOLA TABLA DE ESTILOS ───────────────────────────────────────────────
// `CLASES_TEXTO` se declara AQUÍ y `Documento.tsx` la importa de aquí. Si cada
// uno tuviera la suya, el día que se cambie el tamaño de un título cambiaría en
// una pantalla y no en la otra, y el fallo aparecería en la que nadie mira: la
// pública. Lo que se lee y lo que se escribe tienen que verse igual.
//
// ── LO QUE TODAVÍA NO HACE ──────────────────────────────────────────────────
// Los bloques que apuntan a otra cosa de la plataforma (`producto`,
// `publicacion`, `ventana`) se pintan como una tarjeta con su título y su
// enlace, no con la ficha entera: la ficha necesita datos que un visitante sin
// cuenta no tiene derecho a pedir. Enseñar el título y adónde lleva es honesto;
// inventarse la ficha, no.

export const CLASES_TEXTO: Record<string, string> = {
  parrafo: 'text-[15px] leading-relaxed text-slate-700',
  titulo1: 'text-3xl font-black tracking-tight text-slate-900 mt-4',
  titulo2: 'text-xl font-black text-slate-900 mt-3',
  titulo3: 'text-base font-black text-slate-800 mt-2',
  lista: 'text-[15px] leading-relaxed text-slate-700',
  numerada: 'text-[15px] leading-relaxed text-slate-700',
  tarea: 'text-[15px] leading-relaxed text-slate-700',
  cita: 'text-[15px] leading-relaxed text-slate-600 italic',
  codigo: 'font-mono text-[13px] leading-relaxed text-slate-100 whitespace-pre-wrap',
};

/**
 * LA MARCA DE UNA LISTA SEGÚN LO HONDA QUE ESTÉ (2026-10-05). Como Notion:
 * viñetas • ◦ ▪ y números 1. a. i. que se alternan al sangrar, para que se
 * vea a simple vista qué cuelga de qué. La usan el editor y la lectura.
 */
export function marcaLista(tipo: string, n: number, nivel: number): string {
  if (tipo === 'lista') return ['•', '◦', '▪'][nivel % 3];
  const forma = nivel % 3;
  if (forma === 1) {
    // a, b, … z, aa, ab…
    let s = '', k = n;
    while (k > 0) { k--; s = String.fromCharCode(97 + (k % 26)) + s; k = Math.floor(k / 26); }
    return `${s}.`;
  }
  if (forma === 2) {
    const R: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
    let s = '', k = n;
    for (const [v, l] of R) while (k >= v) { s += l; k -= v; }
    return `${s}.`;
  }
  return `${n}.`;
}

/** La página entera, para lo que mira más allá de su sitio (el índice), y lo
 *  hondo que está cada lista. Los bloques anidados se pintan con otro
 *  `BloquesLectura` dentro, que sólo ve a sus hermanos. */
const Raiz = createContext<{ todos: any[]; paginaId?: string } | null>(null);
const Hondura = createContext(0);
/** Dentro de una franja, unas columnas, un desplegable o un aviso: ahí no se flota ni se estrecha nada. */
const Anidado = createContext(false);

// ── EL ESCAPARATE SE LEE COMO UNA NOTA DE PRENSA (2026-11-06) ────────────────
// Eugenio: «las imágenes son demasiado grandes, ocupan toda la pantalla; hazlas más pequeñas,
// al lado de otras». En un escaparate (`sitio.escaparate`) el texto va en una columna de
// lectura (max-w-3xl), las imágenes de un mismo `grupo` son una fila de miniaturas que se
// amplían al pulsarlas, una imagen suelta se pone pequeña al lado del texto y el vídeo es
// mediano. Fuera del escaparate todo se pinta como siempre.
const TEXTO_ESCAPARATE = new Set(['parrafo', 'lista', 'numerada', 'tarea', 'titulo1', 'titulo2', 'titulo3', 'cita', 'codigo', 'desplegable', 'aviso', 'tabla', 'subpagina', 'boton', 'marcador']);
/** Las clases del envoltorio de un bloque suelto en un escaparate. */
function anchoEscaparate(b: any): string {
  if (b?.tipo === 'imagen' && !b.grupo) return 'md:float-right md:clear-right md:ml-8 md:mb-4 md:w-[34%] md:max-w-sm';
  if (b?.tipo === 'medio') return 'clear-both max-w-3xl';
  if (b?.tipo === 'titulo1') return 'clear-both max-w-3xl';
  if (TEXTO_ESCAPARATE.has(b?.tipo)) return 'max-w-3xl';
  return 'clear-both';
}
const esVideo = (b: any) => b?.tipo === 'medio' && (b.medio === 'youtube' || b.medio === 'vimeo');
/** Las viñetas seguidas que son noticias van juntas (una galería de tarjetas). En un escaparate,
 *  además, las imágenes sueltas seguidas forman una fila, como si llevaran el mismo `grupo`, y
 *  los vídeos seguidos van de dos en dos. Una imagen sola (sin vecinas) se queda suelta. */
function juntarSueltas(filas: any[][], noticias: Set<any>, nota: boolean): any[][] {
  const out: any[][] = [];
  const clase = (f: any[]) => f.length !== 1 ? null : noticias.has(f[0]) ? 'noticia' : !nota ? null : f[0]?.tipo === 'imagen' && !f[0].grupo ? 'imagen' : esVideo(f[0]) ? 'video' : null;
  let anterior: string | null = null;
  for (const f of filas) {
    const c = clase(f);
    if (c && c === anterior) out[out.length - 1].push(f[0]);
    else out.push([...f]);
    anterior = c;
  }
  return out;
}
/** Una fila de imágenes en un escaparate: miniaturas, de dos a cuatro por fila. */
const FILA_ESCAPARATE = (n: number) => n <= 2 ? 'grid-cols-2 max-w-2xl' : n === 3 ? 'grid-cols-2 sm:grid-cols-3 max-w-4xl' : 'grid-cols-2 sm:grid-cols-4';

/** Una imagen que se amplía al pulsarla (escaparate). Esc, un clic o la ✕ la cierran. */
function ImagenConLupa({ b, children }: { b: any; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false); };
    window.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [abierta]);
  const alt = b.alt || b.pie || '';
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} aria-label={alt ? `Ampliar: ${alt}` : 'Ampliar la imagen'}
        className="block w-full cursor-zoom-in rounded-xl text-left transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
        {children}
      </button>
      {abierta && typeof document !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" aria-label={alt || 'Imagen'} onClick={() => setAbierta(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/85 p-4 sm:p-10">
          <img src={miniatura(b.url, 1600)} alt={alt} className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl" />
          {b.pie && <p className="max-w-3xl text-center text-sm leading-snug text-white/85">{b.pie}</p>}
          <button type="button" aria-label="Cerrar" onClick={() => setAbierta(false)}
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30">
            <X className="h-5 w-5" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

/** El id de un vídeo de YouTube o Vimeo: el guardado, o el que dice su dirección. */
const ID_YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/;
export function idDelVideo(b: any): string | null {
  if (b?.medioId) return String(b.medioId);
  const url = String(b?.url || '');
  const m = b?.medio === 'vimeo' ? /vimeo\.com\/(?:video\/)?(\d+)/.exec(url) : ID_YOUTUBE.exec(url);
  return m ? m[1] : null;
}

/*
 * ══ CADA BLOQUE SE PUEDE COMENTAR (2026-08-25, fase 5 de «todo son páginas»)
 * Eugenio: «cada elemento de la página puede ser comentado por cualquier
 * usuario, siempre y cuando esa página sea pública».
 *
 * `comentable` es el id de la página, y sólo llega desde las vistas PÚBLICAS:
 * sin él no se pinta ninguna burbuja, así que el editor y las vistas privadas
 * quedan igual que estaban. Los comentarios son los polimórficos de siempre
 * (`EntityComments`, tabla `comments`): el bloque se identifica como
 * `<pagina>:<bloque>` porque no tiene tabla propia, y el servidor usa esa
 * primera mitad para negarse si la página no es pública.
 */
/**
 * La burbuja de un bloque. Envuelve al bloque SIN tocarlo: el dibujo de cada
 * tipo sigue siendo el de siempre, y la burbuja sale a su derecha al pasar el
 * ratón. Al pulsarla se abren los comentarios de ESE bloque, debajo de él —
 * no un panel lateral: quien comenta un párrafo quiere verlo mientras escribe.
 */
function ConComentarios({ paginaId, bloqueId, children }: { paginaId: string; bloqueId: string; children: any }) {
  const [abierto, setAbierto] = useState(false);
  const [cuantos, setCuantos] = useState(0);
  return (
    <div className="group/bloq relative">
      {children}
      <button
        onClick={() => setAbierto(a => !a)}
        title={abierto ? 'Cerrar los comentarios' : 'Comentar este elemento'}
        aria-label={abierto ? 'Cerrar los comentarios de este elemento' : 'Comentar este elemento'}
        aria-expanded={abierto}
        // Outside the column only where there is room for it: on a phone,
        // `-right-9` pushed the page 16 px wider than the screen (2026-10-18).
        // 44 × 44 to tap (evaluator round 3); the bubble inside stays 28 px.
        className={cn(
          'group/com absolute -top-2 right-0 md:-right-11 grid h-11 w-11 place-items-center transition-all',
          !abierto && cuantos === 0 && 'opacity-0 group-hover/bloq:opacity-100 focus-visible:opacity-100',
        )}
      >
        <span className={cn('grid h-7 w-7 place-items-center rounded-lg text-[10px]',
          abierto ? 'bg-emerald-600 text-white'
                  : cuantos > 0 ? 'bg-slate-100 text-slate-600'
                  : 'text-slate-300 group-hover/com:bg-slate-100 group-hover/com:text-slate-600')}>
          {/* El número sólo cuando existe: una burbuja con «0» invita menos que
              una burbuja vacía. */}
          {cuantos > 0 ? <span className="font-black">{cuantos}</span> : <MessageCircle className="h-3.5 w-3.5" />}
        </span>
      </button>
      {abierto && (
        <div className="my-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <EntityComments entityType="bloque" entityId={`${paginaId}:${bloqueId}`} onCountChange={setCuantos} />
        </div>
      )}
    </div>
  );
}

export default function BloquesLectura({ bloques, comentable, paginaId }: { bloques: any[]; comentable?: string; paginaId?: string }) {
  const raiz = useContext(Raiz);
  const nivel = useContext(Hondura);
  // La primera vez (la página entera) se apunta la raíz para el índice y
  // para las migas de pan, que necesitan saber de qué página son.
  if (!raiz) {
    const todos = todosLosBloques(bloques);
    const dentro = (
      <Raiz.Provider value={{ todos, paginaId: paginaId || comentable }}>
        <BloquesLectura bloques={bloques} comentable={comentable} />
      </Raiz.Provider>
    );
    return todos.some(b => b?.tipo === 'secciones') ? <ConTarjetas>{dentro}</ConTarjetas> : dentro;
  }
  return <ListaBloques bloques={bloques} comentable={comentable} nivel={nivel} />;
}

/** Una página con bloque `secciones`: sus subpáginas que ya salen en las
 *  tarjetas no se repiten como enlaces (Wikiproducts W2, 2026-10-18). Siguen
 *  en la página, porque son las que dicen de quién cuelga cada sección (las
 *  migas, el mapa del sitio); sólo no se pintan dos veces. */
/** UNA PANTALLA DE ALTO MIENTRAS LA TABLA CARGA (ronda 3 del evaluador: CLS
 *  de 0,37 en los listados). Con 520 px de hueco, el pie de la página se veía
 *  y saltaba cuando llegaban las tarjetas. Se suelta en cuanto llegan los
 *  datos: lo que cambie entonces ya cae por debajo de la pantalla. */
function ReservaAlto({ children }: { children: (lista: () => void) => ReactNode }) {
  const [lista, setLista] = useState(false);
  return <div style={lista ? undefined : { minHeight: '100vh' }}>{children(() => setLista(true))}</div>;
}

function ConTarjetas({ children }: { children: ReactNode }) {
  const [ids, poner] = useState<Set<string> | null>(null);
  const valor = useMemo(() => ({ ids, poner }), [ids]);
  return <SubpaginasEnTarjetas.Provider value={valor}>{children}</SubpaginasEnTarjetas.Provider>;
}

function Subpagina({ id, tituloGuardado }: { id: string; tituloGuardado?: string }) {
  const t = useContext(SubpaginasEnTarjetas);
  if (t && (!t.ids || t.ids.has(id))) return null;
  return <EnlaceSubpagina id={id} tituloGuardado={tituloGuardado} />;
}

/** Los bloques que pintan ELLOS MISMOS lo que llevan dentro. El resto lo
 *  lleva debajo, con sangría (ver `uno`). */
const PINTAN_SUS_HIJOS = new Set(['desplegable', 'aviso', 'franja', 'columnas', 'boton', 'sincronizado']);

function ListaBloques({ bloques, comentable, nivel }: { bloques: any[]; comentable?: string; nivel: number }) {
  const escaparate = useEscaparate();
  const anidado = useContext(Anidado);
  /** Columna de lectura y cosas pequeñas: sólo en un escaparate y en lo de primer nivel. */
  const nota = escaparate && !anidado && nivel === 0;
  // Las viñetas que son noticias («En los medios»): tarjetas con portada y logo del medio.
  const noticias = useMemo(() => bloquesNoticia(bloques, nota), [bloques, nota]);
  // UN ENLACE A UN BLOQUE (`#b-…`, 2026-09-30). El navegador salta al ancla
  // al cargar, pero aquí los bloques llegan después: se salta a mano y se
  // resalta un momento para que se vea a qué apuntaba el enlace.
  useEffect(() => {
    const h = typeof location !== 'undefined' ? location.hash : '';
    if (nivel > 0 || !h.startsWith('#b-')) return;
    const el = document.getElementById(h.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-300', 'rounded');
    const t = setTimeout(() => el.classList.remove('ring-2', 'ring-amber-300'), 2500);
    return () => clearTimeout(t);
  }, [bloques]);

  if (!Array.isArray(bloques) || bloques.length === 0) {
    return nivel > 0 ? null : <p className="text-sm text-slate-400">Esta página todavía no tiene contenido.</p>;
  }

  const uno = (b: any, enFila = false) => {
    const i = bloques.indexOf(b);
    const envoltorio = nota && !enFila ? anchoEscaparate(b) : undefined;
    // LOS HIJOS DE UN BLOQUE (2026-10-05), debajo y con sangría, como en el
    // editor. Los desplegables y los títulos plegables los llevan dentro de
    // su caja; el resto, aquí.
    const hijos: any[] = Array.isArray(b?.bloques) && b.bloques.length && !PINTAN_SUS_HIJOS.has(b.tipo) && !esPlegable(b) ? b.bloques : [];
    const dentro = (
      <>
        <Bloque b={b} indice={i} bloques={bloques} nivel={nivel} />
        {hijos.length > 0 && (
          <div className="ml-7 mt-2.5">
            <Hondura.Provider value={nivel + 1}><BloquesLectura bloques={hijos} comentable={comentable} /></Hondura.Provider>
          </div>
        )}
      </>
    );
    // Color y ancla van en un envoltorio: ningún tipo de bloque tiene que
    // saber de ellos.
    // La base de datos recibe el color y lo pinta ella (ver `tonoDe`).
    const propio = PINTAN_SU_COLOR.has(b?.tipo);
    const color = propio ? '' : claseColor(b?.color);
    const caja = (
      <div id={b?.id ? `b-${b.id}` : undefined} data-tipo={b?.tipo || undefined}
        className={cn(color, b?.tipo === 'basedatos' && AIRE_BASE_DATOS, b?.tipo === 'basedatos' && 'scroll-mt-24', !propio && b?.color && !String(b.color).startsWith('fondo-') && '[&_*]:![color:inherit]')}>
        {dentro}
      </div>
    );
    // SIN COMENTARIOS EN LAS BASES DE DATOS (2026-10-02, Eugenio: «aparece un
    // icono de comentario en el lateral derecho de cada base de datos; no
    // sirve de nada y al pulsarlo da error»). Una galería no es un texto que
    // se discuta: cada tarjeta es una página, y ésa ya tiene los suyos.
    return comentable && b?.id && b.tipo !== 'basedatos'
      ? <div key={b.id} className={envoltorio}><ConComentarios paginaId={comentable} bloqueId={String(b.id)}>{caja}</ConComentarios></div>
      : <div key={b?.id || i} className={envoltorio}>{caja}</div>;
  };

  return (
    // `flow-root`: la imagen que flota al lado del texto no se sale por debajo de la página.
    <div className={cn('space-y-2.5', nota && 'flow-root')}>
      {juntarSueltas(enFilas(bloques), noticias, nota).map((fila, k) => fila.every((b: any) => noticias.has(b)) ? (
        <GaleriaNoticias key={`noticias-${fila[0].id || k}`} bloques={fila} />
      ) : fila.length === 1 ? uno(fila[0]) : nota && fila.every((b: any) => b?.tipo === 'imagen') ? (
        // Escaparate: una fila de miniaturas (2 a 4), que se amplían al pulsarlas.
        <div key={`fila-${fila[0].grupo || fila[0].id}-${k}`} className={cn('clear-both grid gap-3 sm:gap-4 [&_figure_img]:aspect-[4/3] [&_figure_img]:object-cover', FILA_ESCAPARATE(fila.length))}>
          {fila.map((b: any) => <div key={`col-${b.id}`} className="min-w-0">{uno(b, true)}</div>)}
        </div>
      ) : nota && fila.every(esVideo) ? (
        // Escaparate: dos vídeos seguidos, uno al lado del otro.
        <div key={`videos-${fila[0].id}-${k}`} className="clear-both grid gap-4 sm:grid-cols-2">
          {fila.map((b: any) => <div key={`col-${b.id}`} className="min-w-0">{uno(b, true)}</div>)}
        </div>
      ) : (
        // Columnas en pantalla ancha; una debajo de otra en un teléfono.
        <div key={`fila-${fila[0].grupo}-${k}`} className="flex flex-col sm:flex-row gap-2.5 sm:gap-10">
          {fila.map((b: any) => <div key={`col-${b.id}`} className="sm:flex-1 min-w-0">{uno(b, true)}</div>)}
        </div>
      ))}
    </div>
  );
}

function Bloque({ b, indice, bloques, nivel = 0 }: { b: any; indice: number; bloques: any[]; nivel?: number }) {
  const raiz = useContext(Raiz);
  const sitio = useSitio();
  const escaparate = useEscaparate();
  if (!b || typeof b !== 'object') return null;

  // LOS TÍTULOS LLEVAN ANCLA. Sin ella, el índice enlaza a `#algo` que no
  // existe en la página y el navegador no salta a ninguna parte: un índice que
  // se ve bien y no funciona. Se pone sólo en los títulos porque es lo único a
  // lo que se salta, y `scroll-mt` deja aire arriba para que el título no
  // quede pegado al borde al llegar.
  const esTitulo = b.tipo === 'titulo1' || b.tipo === 'titulo2' || b.tipo === 'titulo3';

  // LA ENTRADILLA (2026-11-06, Eugenio: «como una nota de prensa: titular, subtitular…»): un
  // párrafo con `estilo: 'entradilla'` se lee más grande, justo debajo del titular.
  const entradilla = b.tipo === 'parrafo' && b.estilo === 'entradilla';
  // UNA CIFRA (2026-11-06): `estilo: 'cifra'`, el número grande de los datos clave («3.890 km»).
  const cifra = b.tipo === 'parrafo' && b.estilo === 'cifra';
  // LOS TÍTULOS SON ENCABEZADOS DE VERDAD (2026-11-06, SEO): h2/h3/h4 como en el HTML del
  // servidor (`htmlBloques.ts`), no un div con letra grande. El h1 es el título de la página.
  const Etiqueta = (b.tipo === 'titulo1' ? 'h2' : b.tipo === 'titulo2' ? 'h3' : b.tipo === 'titulo3' ? 'h4' : 'div') as 'div';
  const texto = (extra?: string) => (
    <Etiqueta id={esTitulo && b.id ? String(b.id) : undefined}
         className={cn(entradilla ? 'text-lg sm:text-xl leading-snug font-medium text-slate-600' : cifra ? 'text-3xl sm:text-4xl font-black leading-none tracking-tight text-slate-900' : CLASES_TEXTO[b.tipo] || CLASES_TEXTO.parrafo, esTitulo && 'scroll-mt-20', extra)}
         style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      <TextoEnriquecido texto={b.texto || ''} />
    </Etiqueta>
  );

  // UN TÍTULO PLEGABLE (2026-10-05): el título de siempre, con su flecha, y
  // lo de dentro escondido hasta que se pulsa. `<details>` por lo mismo que
  // el desplegable: sin JavaScript, y Ctrl+F encuentra lo de dentro.
  if (esPlegable(b) && b.tipo !== 'desplegable') {
    const dentro: any[] = Array.isArray(b.bloques) ? b.bloques : [];
    return (
      <details open={b.abierto === true} className="group/pl">
        <summary className="flex items-center gap-1.5 min-h-11 cursor-pointer list-none -ml-1 pl-1 rounded-lg hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <ChevronRight className={cn('shrink-0 text-slate-400 transition-transform group-open/pl:rotate-90',
            b.tipo === 'titulo1' ? 'w-6 h-6' : b.tipo === 'titulo2' ? 'w-5 h-5' : 'w-4 h-4')} />
          {/* Sin el margen de arriba del título: la línea ya mide 44 px, y
              así la flecha queda a su altura en vez de por encima. */}
          {texto('flex-1 min-w-0 !mt-0')}
        </summary>
        <div className="ml-7 mt-1">
          {dentro.length > 0
            ? <Hondura.Provider value={nivel + 1}><BloquesLectura bloques={dentro} /></Hondura.Provider>
            : <p className="text-sm text-slate-400">Aquí todavía no hay nada.</p>}
        </div>
      </details>
    );
  }

  // Los bloques de datos se pintan ellos mismos (2026-10-18). Ver
  // `bloquesDatos/registro.tsx`: este fichero no tiene que saber de cada uno.
  if (esBloqueDatos(b.tipo)) return <LecturaBloqueDatos bloque={b} paginaId={raiz?.paginaId} />;

  switch (b.tipo) {
    case 'separador':
      return <hr className="border-slate-200 my-2" />;

    case 'desplegable':
      return <Anidado.Provider value><Desplegable b={b} nivel={nivel} /></Anidado.Provider>;

    case 'aviso':
      return <Anidado.Provider value><Aviso b={b} /></Anidado.Provider>;

    // UN BLOQUE SINCRONIZADO (2026-10-06): su contenido, a la misma altura
    // que el resto, como si estuviera escrito aquí. La copia que lleva la
    // página la mantiene al día el servidor cada vez que se edita en otra.
    case 'sincronizado':
      return Array.isArray(b.bloques) && b.bloques.length
        ? <Hondura.Provider value={nivel}><BloquesLectura bloques={b.bloques} /></Hondura.Provider>
        : null;

    // Las migas de pan (2026-10-05): con los enlaces del sitio si la página
    // se lee dentro de uno, y los de la plataforma si no.
    case 'migas':
      return <MigasDePan paginaId={raiz?.paginaId} enlace={sitio?.enlacePagina} />;

    // UN BOTÓN, AL LEER (2026-10-05). Sólo el que abre un enlace hace algo
    // para quien lee: insertar bloques, crear páginas o filas es de quien
    // escribe, y enseñar un botón que no hace nada sería engañar. Su
    // plantilla (sus hijos) tampoco se enseña: no es texto de la página.
    case 'boton':
      return b.boton?.tipo === 'enlace' && b.boton.url ? <BotonVista texto={b.texto} accion={b.boton} /> : null;

    case 'indice':
      // El índice necesita ver la página entera, no sólo su bloque (ni
      // sólo sus hermanos, si está dentro de un desplegable).
      return <Indice bloques={raiz?.todos || bloques} />;

    case 'cita':
      return <blockquote className="border-l-[3px] border-emerald-300 pl-3">{texto()}</blockquote>;

    case 'codigo':
      return <pre className="bg-slate-900 rounded-xl px-4 py-3 overflow-x-auto">{texto()}</pre>;

    case 'lista':
    case 'numerada': {
      // El número se cuenta sobre los hermanos seguidos del mismo tipo, igual
      // que en el editor: si no, una lista partida por un párrafo vuelve a
      // empezar en 1 en una pantalla y no en la otra.
      let n = 1;
      if (b.tipo === 'numerada') {
        for (let i = indice - 1; i >= 0 && bloques[i]?.tipo === 'numerada'; i--) n++;
      }
      return (
        <div className="flex gap-2">
          <span className="text-slate-400 select-none shrink-0 w-5 text-right leading-relaxed text-[15px]">
            {marcaLista(b.tipo, n, nivel)}
          </span>
          {texto('flex-1 min-w-0')}
        </div>
      );
    }

    case 'tarea':
      return (
        <div className="flex gap-2 items-start">
          {/* Marcado o no, pero apagado: quien lee no cambia la lista de otro. */}
          <input type="checkbox" checked={!!b.hecho} disabled readOnly
                 className="mt-1.5 accent-emerald-600 shrink-0" />
          {texto(cn('flex-1 min-w-0', b.hecho && 'line-through text-slate-400'))}
        </div>
      );

    case 'imagen':
      if (!b.url) return null;
      // Con su tamaño y su recorte (2026-10-06, ver `ImagenBloque.tsx`). En un escaparate,
      // pequeña y con lupa (ver `anchoEscaparate`).
      return (
        <figure>
          {escaparate ? <ImagenConLupa b={b}><ImagenVista b={b} /></ImagenConLupa> : <ImagenVista b={b} />}
          {b.pie && <figcaption className={cn('text-xs text-slate-400 mt-1', escaparate ? 'leading-snug' : (b.anchoImagen || b.recorte || b.relacion) && 'text-center')}>{b.pie}</figcaption>}
        </figure>
      );

    case 'medio': {
      const pie = b.pie ? <figcaption className="text-xs text-slate-400 mt-1">{b.pie}</figcaption> : null;
      if (b.medio === 'video') {
        return (
          <figure>
            <video src={b.url} controls playsInline preload="metadata"
                   className="w-full rounded-xl bg-black max-h-[70vh]" />
            {pie}
          </figure>
        );
      }
      if (b.medio === 'youtube' || b.medio === 'vimeo') {
        // EL ID, SIEMPRE (2026-11-06): cuatro vídeos de luzhumanidad.com se veían negros y daban
        // error al darle al play porque su bloque traía la dirección y no `medioId`
        // («/embed/undefined»). Si falta, se saca de la dirección.
        const id = idDelVideo(b);
        if (!id) return b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-emerald-700 underline">{b.pie || 'Ver el vídeo'}</a> : null;
        const src = b.medio === 'youtube'
        // YOUTUBE SIN COOKIES (2026-08-22). `youtube-nocookie.com` es el mismo
        // reproductor sin la cookie de seguimiento: existe exactamente para
        // incrustarse en la web de otro sin dejarle a Google un rastro de quién ha
        // mirado qué. La decisión ya estaba tomada —el Navegador y el Juego lo usaban
        // desde antes— y aquí no se había aplicado: cuatro sitios, dos criterios.
        // Importa además para la ficha de las tiendas, donde hay que DECLARAR con qué
        // terceros se comparte y para qué.
          ? `https://www.youtube-nocookie.com/embed/${id}`
          : `https://player.vimeo.com/video/${id}`;
        return (
          <figure>
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              {/* Con el origen como referencia: sin ella YouTube no reproduce (error 153). */}
              <iframe src={src} title={b.pie || 'Vídeo'} className="w-full h-full" loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen />
            </div>
            {pie}
          </figure>
        );
      }
      if (b.medio === 'audio') {
        return (
          <figure className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <audio src={b.url} controls preload="none" className="w-full" />
            {pie}
          </figure>
        );
      }
      if (b.medio === 'pdf' && b.vista === 'embebido' && b.url) {
        return <figure><PdfEmbebido url={b.url} titulo={b.pie || 'PDF'} alto={b.alto} />{pie}</figure>;
      }
      // PDF y archivo: tarjeta con el nombre y el enlace, la misma decisión que
      // tomó Eugenio para el editor el 2026-08-22 (un visor de 70vh parte la
      // lectura en dos).
      return (
        <a href={b.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors">
          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 truncate">{b.pie || 'Archivo adjunto'}</span>
        </a>
      );
    }

    case 'tabla': {
      const filas: string[][] = Array.isArray(b.filas) ? b.filas : [];
      if (filas.length === 0) return null;
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {filas.map((fila, fi) => (
                <tr key={fi}>
                  {fila.map((celda, ci) => (
                    <td key={ci}
                        className={cn('border border-slate-200 px-2.5 py-1.5 align-top',
                          fi === 0 ? 'bg-slate-50 font-bold text-slate-800' : 'text-slate-600')}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Un enlace pegado como tarjeta, o la web dentro de la página (2026-10-02).
    case 'marcador':
      return b.url ? <TarjetaMarcador b={b} /> : null;
    case 'web':
      return b.url ? <WebInsertada b={b} /> : null;

    // Contenido de un tercero y ecuación (2026-10-06, carril editorB).
    case 'embed':
      return b.url ? <BloqueEmbed b={b} /> : null;

    case 'ecuacion':
      return b.texto?.trim()
        ? <div className="text-center overflow-x-auto py-1 text-slate-800"><Suspense fallback={<code className="font-mono text-sm text-slate-400">{b.texto}</code>}><Formula tex={b.texto} bloque /></Suspense></div>
        : null;

    case 'pizarra':
      // La misma pizarra, sin poder editarla (el servidor sólo deja a su autor).
      return b.entityId ? <BloquePizarra id={b.entityId} titulo={b.pubTitulo} vista={b.vista} editable={false} /> : null;

    case 'subpagina':
      return b.entityId ? <Subpagina id={b.entityId} tituloGuardado={b.pubTitulo} /> : null;

    case 'basedatos':
      // La tabla de verdad, en modo mirar. `Rejilla` ya sabe no dejar escribir.
      // El editor guarda `tabla_id`; `tablaId` se sigue aceptando por si algún
      // bloque se escribió a mano con ese nombre.
      {
        const tablaId = b.tabla_id || (b as any).tablaId;
        // Con «Añadir entrada» para quien puede añadir en la web publicada (2026-10-20, `Contribuir.tsx`).
        return tablaId ? <BdContribuible paginaId={raiz?.paginaId} tablaId={tablaId}>{clave => <ReservaAlto key={clave}>{lista => <CargaEnOrden alto={520}><Rejilla tablaId={tablaId} onCargada={lista} editable={false} alto={520} vista={b.vistaBd || 'galeria'} color={b.color} tamano={b.tamanoGaleria || 'mediano'} tamanoTitulo={b.tamanoTitulo || 'mediano'} tituloColor={b.tituloColor} tituloPeso={b.tituloPeso || 'negrita'} nombreArriba={!!b.nombreArriba} pesoNombre={b.pesoNombre || 'negrita'} tamanoNombre={b.tamanoNombre} tituloOculto={!!b.tituloOculto} ocultarMandosPublica={!!b.ocultarMandosPublica} tituloAlineacion={b.tituloAlineacion || 'centro'} visibles={b.propsGaleria} /></CargaEnOrden>}</ReservaAlto>}</BdContribuible> : null;
      }

    // ── LOS BLOQUES DE MAQUETACIÓN (fase 9) ────────────────────────────
    // Sólo se ven al leer. En el editor se siguen tratando como bloques
    // normales, así que una página con portada se puede seguir editando sin
    // que el editor sepa dibujarla todavía.
    case 'portada':
      return <Portada b={b} />;

    case 'rejilla':
      return <RejillaProductos b={b} />;

    case 'columnas':
      return <Anidado.Provider value><Columnas b={b} Dentro={BloquesLectura} /></Anidado.Provider>;

    case 'franja':
      return <Anidado.Provider value><Franja b={b} Dentro={BloquesLectura} /></Anidado.Provider>;

    case 'producto':
      // Ficha de verdad: foto, precio y disponibilidad. Ver `ProductoPublico`
      // para por qué todavía no lleva botón de comprar.
      return b.entityId
        ? <ProductoPublico id={b.entityId} titulo={b.pubTitulo || b.texto} />
        : null;

    case 'publicacion':
    case 'ventana':
      // Ver la nota de arriba: título y destino, no la ficha entera.
      return (
        <a href={b.pubUrl || '#'} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-700 truncate">{b.pubTitulo || b.texto || 'Contenido enlazado'}</span>
        </a>
      );

    default:
      // Un tipo de bloque que esta pantalla no conoce todavía. Se enseña su
      // texto si lo tiene y se calla si no: nunca un hueco sin explicación ni
      // un `[object Object]`.
      return b.texto ? texto() : null;
  }
}

/**
 * UN DESPLEGABLE — un título que esconde lo de dentro.
 *
 * Es lo que hace legible una página larga. Sin él todo está siempre abierto, y
 * hay que leerlo entero para saber si te interesa algo.
 *
 * ── ABIERTO O CERRADO LO DECIDE QUIEN ESCRIBE, NO QUIEN LEE ─────────────────
 * `b.abierto` viene del documento: quien lo escribió decide si al llegar se ve
 * abierto o cerrado. Guardar el estado de cada lector obligaría a saber quién
 * es, y quien lee una página pública no tiene por qué serlo.
 *
 * Se usa `<details>` del navegador y no un `useState` propio: así funciona sin
 * JavaScript, el buscador de la página (Ctrl+F) encuentra lo de dentro aunque
 * esté cerrado, y el teclado lo abre solo.
 */
function Desplegable({ b, nivel = 0 }: { b: any; nivel?: number }) {
  const dentro: any[] = Array.isArray(b.bloques) ? b.bloques : [];
  return (
    <details open={b.abierto === true} className="group">
      <summary className="flex items-start gap-2 cursor-pointer list-none py-1 -ml-1 pl-1 rounded-lg hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
        <span className="text-[15px] font-bold text-slate-800 leading-relaxed" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {b.texto ? <TextoEnriquecido texto={b.texto} /> : 'Sin título'}
        </span>
      </summary>
      <div className="ml-6 mt-1 space-y-2.5">
        {/* Dos formas de tener contenido, y las dos valen: bloques anidados
            —lo que llegará cuando el editor sepa anidar— o el texto del propio
            bloque, que es como se escribe hoy. Aceptar sólo la primera dejaría
            vacío todo lo que se escriba con el editor actual. */}
        {dentro.length > 0
          ? <Hondura.Provider value={nivel + 1}><BloquesLectura bloques={dentro} /></Hondura.Provider>
          : b.detalle
            ? <p className="text-[15px] leading-relaxed text-slate-700"
                 style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{b.detalle}</p>
            : <p className="text-sm text-slate-400">Aquí todavía no hay nada.</p>}
      </div>
    </details>
  );
}

/**
 * UN AVISO — el recuadro con icono.
 *
 * Para lo que hay que destacar sin gritar en mayúsculas ni poner tres signos
 * de admiración.
 *
 * Cuatro tonos y ninguno más, de una lista cerrada. Un color libre acaba en
 * texto ilegible sobre su propio fondo, y en veinte páginas con veinte
 * amarillos distintos.
 */
const AVISOS: Record<string, { fondo: string; borde: string; texto: string; Icono: any }> = {
  info:    { fondo: 'bg-sky-50',     borde: 'border-sky-200',     texto: 'text-sky-900',     Icono: Info },
  ojo:     { fondo: 'bg-amber-50',   borde: 'border-amber-200',   texto: 'text-amber-900',   Icono: AlertTriangle },
  idea:    { fondo: 'bg-violet-50',  borde: 'border-violet-200',  texto: 'text-violet-900',  Icono: Lightbulb },
  hecho:   { fondo: 'bg-emerald-50', borde: 'border-emerald-200', texto: 'text-emerald-900', Icono: CheckCircle2 },
};

function Aviso({ b }: { b: any }) {
  const t = AVISOS[typeof b.tono === 'string' ? b.tono : ''] || AVISOS.info;
  const dentro: any[] = Array.isArray(b.bloques) ? b.bloques : [];
  return (
    <div className={`flex gap-3 p-3.5 rounded-xl border ${t.fondo} ${t.borde}`}>
      <t.Icono className={`w-4 h-4 shrink-0 mt-0.5 ${t.texto}`} />
      <div className={`min-w-0 flex-1 text-[15px] leading-relaxed ${t.texto}`}>
        {/* Su texto y, debajo, lo que lleve dentro (2026-10-05): antes era lo
            uno o lo otro, y el editor ya escribe las dos cosas. */}
        {(b.texto || !dentro.length) && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><TextoEnriquecido texto={b.texto || ''} /></p>}
        {dentro.length > 0 && <div className={b.texto ? 'mt-2' : ''}><BloquesLectura bloques={dentro} /></div>}
      </div>
    </div>
  );
}

/**
 * EL ÍNDICE — la lista de títulos de esta misma página.
 *
 * NO GUARDA NADA. Se calcula al pintar, recorriendo los bloques que ya están
 * ahí. Un índice guardado se queda viejo en cuanto alguien cambia un título, y
 * entonces miente sobre su propia página — que es peor que no tenerlo.
 *
 * Los enlaces llevan al bloque por su `id`, que ya es único dentro de la
 * página. Sin `id` no se puede saltar, así que ese título se lista sin enlace
 * en vez de con uno roto.
 */
function Indice({ bloques }: { bloques: any[] }) {
  const titulos = (bloques || []).filter(b =>
    b && (b.tipo === 'titulo1' || b.tipo === 'titulo2' || b.tipo === 'titulo3')
    && typeof b.texto === 'string' && b.texto.trim());

  if (titulos.length === 0) {
    // Sin títulos no hay índice, y decirlo es mejor que dejar un hueco: quien
    // lo puso sabe entonces que le faltan títulos, no que el bloque falle.
    return (
      <p className="text-sm text-slate-400 flex items-center gap-1.5">
        <List className="w-3.5 h-3.5" /> El índice aparecerá cuando la página tenga títulos.
      </p>
    );
  }

  return (
    <nav className="my-2 py-2 pl-3 border-l-2 border-slate-200">
      <ul className="space-y-1">
        {titulos.map((t, i) => (
          <li key={t.id || i}
              className={t.tipo === 'titulo3' ? 'ml-6' : t.tipo === 'titulo2' ? 'ml-3' : ''}>
            {t.id
              ? <a href={`#${t.id}`} className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
                  {t.texto}
                </a>
              : <span className="text-sm text-slate-600">{t.texto}</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
