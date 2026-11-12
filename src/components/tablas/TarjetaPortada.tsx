import { useEffect, useRef, useState, type ReactNode } from 'react';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';

// ============================================================================
// LA TARJETA CON EL TÍTULO SOBRE LA IMAGEN (2026-11-10)
// ============================================================================
// Eugenio: «todo eso que hemos mejorado en Luz & Humanidad, donde las tarjetas ocupan dos por
// línea y el título está en blanco sobre la imagen, que sea configurable para replicarlo, que se
// vea ya desde el editor cómo quedaría y que se puedan editar directamente los títulos y los
// estados». Es la misma tarjeta en tres sitios: la portada del escaparate
// (`VistaProyectosSitio`), cualquier galería con «Título sobre la imagen» (`Galeria`) y el
// editor. Con `edicion`, lo que se lee se escribe en el mismo sitio y con la misma letra.

export type EstadoTarjeta = { id: string; label: string; color?: string | null };

export const CLASE_TARJETA_PORTADA = 'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md';

/** Un texto que se edita donde está: guarda al salir o con Intro, y Esc lo deja como estaba. */
export function TextoEnLinea({ valor, onGuardar, className, ayuda, etiqueta, obligatorio = false, maximo }: {
  valor: string; onGuardar: (v: string) => void; className?: string; ayuda?: string; etiqueta: string; obligatorio?: boolean; maximo?: number;
}) {
  const [texto, setTexto] = useState(valor);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setTexto(valor), [valor]);
  // Se mide al cambiar el texto y al cambiar el ancho: si nace en un bloque escondido, mide cero
  // hasta que se enseña.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el.parentElement || el);
    return () => o.disconnect();
  }, [texto]);
  const salir = () => {
    const limpio = texto.trim();
    if (obligatorio && !limpio) { setTexto(valor); return; }
    if (limpio !== valor.trim()) onGuardar(limpio);
  };
  return (
    <textarea ref={ref} rows={1} value={texto} aria-label={etiqueta} placeholder={ayuda} maxLength={maximo}
      onChange={e => setTexto(e.target.value)} onBlur={salir}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { setTexto(valor); requestAnimationFrame(() => ref.current?.blur()); }
      }}
      className={cn('block w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 outline-none transition-colors hover:bg-slate-500/10 focus:bg-slate-500/15 focus:ring-2 focus:ring-emerald-400', className)} />
  );
}

/** La píldora blanca de arriba (la categoría, o el estado en la página de un proyecto): se ve igual
 *  que al publicar y, al editar, al pulsarla se abre su lista. Blanca también en modo oscuro. */
export function PildoraEstado({ estado, opciones, onCambiar, className, icono, nombre = 'Estado' }: {
  estado: EstadoTarjeta | null; opciones?: EstadoTarjeta[]; onCambiar?: (id: string | null) => void; className?: string; icono?: ReactNode; nombre?: string;
}) {
  if (!estado && !onCambiar) return null;
  return (
    <span data-fondo-oscuro="" className={cn('inline-flex items-center gap-2 rounded-full bg-white/90 font-bold text-slate-800 shadow-sm backdrop-blur', onCambiar && 'relative hover:bg-white', className)}>
      {estado && (icono || <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: estado.color || '#94a3b8' }} />)}
      {estado?.label || `Añadir ${nombre.toLowerCase()}`}
      {onCambiar && (
        <select aria-label={nombre} value={estado?.id || ''} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
          onChange={e => onCambiar(e.target.value || null)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
          <option value="">{`Sin ${nombre.toLowerCase()}`}</option>
          {(opciones || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      )}
    </span>
  );
}

/** The image fades into the black bottom of the card, where the title goes: clear at the top, dark only under the text. */
const FUNDIDO = 'linear-gradient(to bottom, #000 62%, transparent 100%)';

export default function TarjetaPortada({ nombre, imagen, alt, encuadre, descripcion, pildora, iconoPildora, nombrePildora, Titulo = 'h3', prioridad = 9, conDescripcion = true, edicion, esquina, fondo, compacta = false }: {
  nombre: string;
  imagen: string | null | undefined;
  alt?: string;
  encuadre?: { x?: number; y?: number } | null;
  descripcion?: string | null;
  /** La etiqueta blanca de arriba a la izquierda. */
  pildora: EstadoTarjeta | null;
  iconoPildora?: ReactNode;
  /** Qué es esa etiqueta («Categoría», «Estado»): para quien edita. */
  nombrePildora?: string;
  Titulo?: 'h2' | 'h3' | 'p';
  /** Su lugar en la lista: las primeras cargan ya. */
  prioridad?: number;
  conDescripcion?: boolean;
  edicion?: { onNombre: (v: string) => void; onDescripcion: (v: string) => void; opciones?: EstadoTarjeta[]; onPildora?: (id: string | null) => void };
  /** Lo que va arriba a la derecha (abrir, más opciones). */
  esquina?: ReactNode;
  /** Lo que se pinta si no hay imagen, en vez del degradado gris. */
  fondo?: ReactNode;
  /** Más pequeña, dentro de un panel de sector de la portada (2026-11-12, `VistaProyectosSitio`). */
  compacta?: boolean;
}) {
  // EL TÍTULO Y LA DESCRIPCIÓN, JUNTOS SOBRE LA IMAGEN (2026-11-10, Eugenio): letra blanca con sombra,
  // la descripción algo mayor y en dos líneas como mucho, y abajo casi negro, aclarándose hacia el centro.
  const claseNombre = cn('font-black leading-tight tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]',
    compacta ? 'text-xl 2xl:text-2xl' : 'text-xl sm:text-2xl 2xl:text-3xl');
  const claseDescripcion = cn('font-medium leading-snug text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]', compacta ? 'text-sm 2xl:text-[15px]' : 'text-base');
  return (
    // LA IMAGEN, CLARA Y MÁS ARRIBA (2026-11-12, Eugenio: «un filtro menos oscuro… que la parte de arriba de la imagen
    // no tenga filtro negro y que se concentre en el título y el subtítulo»): la tarjeta, algo más alargada; la imagen
    // ocupa la parte de arriba con su centro un poco más alto y se funde en negro por abajo, donde va el texto, que así
    // no tapa nada importante. Encima, un degradado suave solo en la franja del texto.
    <div className={cn('relative w-full overflow-hidden', imagen ? 'bg-black' : 'bg-slate-100', compacta ? 'aspect-square' : 'aspect-[4/3]')}>
      {imagen ? (
        <img src={miniatura(imagen, 400)} srcSet={`${miniatura(imagen, 400)} 800w, ${miniatura(imagen, 800)} 1600w`} sizes={compacta ? '(min-width: 1024px) 17vw, (min-width: 640px) 50vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'} alt={alt ?? (descripcion ? `${nombre}: ${descripcion}` : nombre)} loading={prioridad < 6 ? 'eager' : 'lazy'} decoding="async"
          {...(prioridad < 3 ? { fetchPriority: 'high' as const } : {})}
          className="absolute inset-x-0 top-0 h-[84%] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          style={{ objectPosition: `${encuadre?.x ?? 50}% ${encuadre?.y ?? 40}%`, maskImage: FUNDIDO, WebkitMaskImage: FUNDIDO }} />
      ) : fondo || (
        <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-400" />
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/85 via-black/35 via-45% to-transparent" />
      <PildoraEstado estado={pildora} opciones={edicion?.opciones} onCambiar={edicion?.onPildora} icono={iconoPildora} nombre={nombrePildora}
        className={compacta ? 'absolute left-2 top-2 px-2 py-0.5 text-[11px]' : 'absolute left-3 top-3 px-3.5 py-1.5 text-sm'} />
      {esquina && <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">{esquina}</div>}
      <div data-fondo-oscuro="" className={cn('absolute inset-x-0 bottom-0', compacta ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5')}>
        {edicion
          ? <TextoEnLinea valor={nombre} onGuardar={edicion.onNombre} etiqueta="Título" obligatorio className={claseNombre} />
          : <Titulo className={cn('line-clamp-2', claseNombre)}>{nombre}</Titulo>}
        {conDescripcion && (edicion || descripcion) && (
          <div className="mt-1.5">
            {edicion
              ? <TextoEnLinea valor={descripcion || ''} onGuardar={edicion.onDescripcion} etiqueta="Descripción" ayuda="Añadir una descripción" maximo={300} className={cn('placeholder:text-white/70', claseDescripcion)} />
              : <p className={cn('line-clamp-2', claseDescripcion)}>{descripcion}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
