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

/** El estado se ve igual que al publicar; al pulsarlo se abre la lista de la columna. */
export function PildoraEstado({ estado, opciones, onCambiar, className }: {
  estado: EstadoTarjeta | null; opciones?: EstadoTarjeta[]; onCambiar?: (id: string | null) => void; className?: string;
}) {
  if (!estado && !onCambiar) return null;
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full bg-white/90 font-bold text-slate-800 shadow-sm backdrop-blur', onCambiar && 'relative hover:bg-white', className)}>
      {estado && <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: estado.color || '#94a3b8' }} />}
      {estado?.label || 'Añadir estado'}
      {onCambiar && (
        <select aria-label="Estado" value={estado?.id || ''} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
          onChange={e => onCambiar(e.target.value || null)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
          <option value="">Sin estado</option>
          {(opciones || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      )}
    </span>
  );
}

export default function TarjetaPortada({ nombre, imagen, alt, encuadre, descripcion, estado, datos, Titulo = 'h3', prioridad = 9, conDescripcion = true, edicion, esquina }: {
  nombre: string;
  imagen: string | null | undefined;
  alt?: string;
  encuadre?: { x?: number; y?: number } | null;
  descripcion?: string | null;
  estado: EstadoTarjeta | null;
  /** La línea bajo el título: «2024 · Movilidad». */
  datos?: string;
  Titulo?: 'h2' | 'h3' | 'p';
  /** Su lugar en la lista: las primeras cargan ya. */
  prioridad?: number;
  conDescripcion?: boolean;
  edicion?: { onNombre: (v: string) => void; onDescripcion: (v: string) => void; opciones?: EstadoTarjeta[]; onEstado?: (id: string | null) => void };
  /** Lo que va arriba a la derecha (abrir, más opciones). */
  esquina?: ReactNode;
}) {
  const claseNombre = 'text-2xl font-black leading-tight tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.45)] sm:text-3xl';
  const claseDescripcion = 'text-sm leading-snug text-slate-500';
  return (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {imagen ? (
          <img src={miniatura(imagen, 400)} alt={alt ?? (descripcion ? `${nombre}: ${descripcion}` : nombre)} loading={prioridad < 4 ? 'eager' : 'lazy'} decoding="async"
            {...(prioridad < 2 ? { fetchPriority: 'high' as const } : {})}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            style={encuadre ? { objectPosition: `${encuadre.x ?? 50}% ${encuadre.y ?? 50}%` } : undefined} />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-400" />
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <PildoraEstado estado={estado} opciones={edicion?.opciones} onCambiar={edicion?.onEstado}
          className="absolute left-3 top-3 px-3.5 py-1.5 text-sm" />
        {esquina && <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">{esquina}</div>}
        <div data-fondo-oscuro="" className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          {edicion
            ? <TextoEnLinea valor={nombre} onGuardar={edicion.onNombre} etiqueta="Título" obligatorio className={claseNombre} />
            : <Titulo className={claseNombre}>{nombre}</Titulo>}
          {datos && <p className="mt-1 text-sm font-semibold text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">{datos}</p>}
        </div>
      </div>
      {conDescripcion && (edicion || descripcion) && (
        <div className="px-4 py-3 sm:px-5">
          {edicion
            ? <TextoEnLinea valor={descripcion || ''} onGuardar={edicion.onDescripcion} etiqueta="Descripción" ayuda="Añadir una descripción" maximo={300} className={claseDescripcion} />
            : <p className={cn('line-clamp-2', claseDescripcion)}>{descripcion}</p>}
        </div>
      )}
    </>
  );
}
