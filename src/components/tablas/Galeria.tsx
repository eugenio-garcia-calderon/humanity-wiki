import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Plus, Move } from 'lucide-react';
import { formatear, type Celda, type Columna } from './Celda';
import { FichaRelacion } from './Relacion';
import { cn } from '../../utils/cn';
import { useSitio } from '../sitio/ContextoSitio';
import type { TamanoGaleria } from '../../utils/bloques';

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
  pequeno: 150, mediano: 220, grande: 300, 'muy-grande': 420,
};

/** Cuántas propiedades se enseñan bajo el título. Más no caben sin que la
 *  tarjeta se convierta en una ficha. */
const PROPIEDADES = 3;

/** ¿El icono es una imagen subida o un emoji? */
const esUrl = (s: string) => /^(https?:|\/)/.test(s);

export default function Galeria({ tablaId, columnas, filas, columnaTitulo, editable, onCambio, claseTitulo = '', tamano = 'mediano', visibles, sinMargen = false }: {
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
  /** Qué columnas se ven en la tarjeta, en orden. Sin valor, las tres primeras. */
  visibles?: string[];
  /** Sin el relleno de alrededor: la galería limpia de una página. */
  sinMargen?: boolean;
}) {
  const navigate = useNavigate();
  // En una página publicada, la tarjeta abre la subpágina DENTRO del sitio
  // (su dominio, su subdominio), no el editor de la plataforma.
  const sitio = useSitio();
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const colTitulo = columnas.find(c => c.id === columnaTitulo) || null;
  // Las que se ven en la tarjeta: las que eligió quien edita o, si no eligió,
  // las tres primeras. Una lista vacía elegida a propósito es «ninguna».
  const otras = visibles
    ? visibles.map(id => columnas.find(c => c.id === id)).filter((c): c is Columna => !!c && c.id !== columnaTitulo)
    : columnas.filter(c => c.id !== columnaTitulo).slice(0, PROPIEDADES);

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

  return (
    <div className={sinMargen ? '' : 'p-3'}>
      {fallo && <p className="mb-2 text-xs font-bold text-rose-600">{fallo}</p>}
      {/* EL TAMAÑO DE LAS TARJETAS (2026-10-01). Se da como ANCHO MÍNIMO de
          tarjeta y la rejilla mete las que quepan: así el mismo «grande» son
          tres por fila en un escritorio ancho y una en un teléfono, sin un
          ajuste distinto para cada pantalla. */}
      <div className="grid gap-x-4 gap-y-5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${ANCHO_TARJETA[tamano] ?? 220}px, 100%), 1fr))` }}>
        {filas.map(f => {
          const nombre = (colTitulo && formatear(f.celdas[colTitulo.id] ?? { estado: 'vacia' }, colTitulo))
            || f.pagina?.titulo || '';
          const icono = f.pagina?.icono;
          return (
            // Un `div` que hace de botón, no un `<button>`: dentro van los
            // mandos de recolocar la imagen, y un botón no puede llevar otro.
            <div key={f.id} role="link" tabIndex={0}
              aria-disabled={!!sitio && !f.pagina_id}
              onClick={() => abrir(f)}
              onKeyDown={e => { if (e.key === 'Enter') abrir(f); }}
              // SIN RECUADRO (2026-10-01, Eugenio: «sin esas líneas que envuelven
              // al contenido en forma de rectángulos»): la imagen con sus
              // esquinas redondeadas y el texto debajo, como un portfolio.
              className="group text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl">
              <div className="aspect-[16/9] bg-slate-50 rounded-xl overflow-hidden grid place-items-center transition-shadow group-hover:shadow-md">
                {f.pagina?.imagen ? (
                  <ImagenTarjeta src={f.pagina.imagen} encuadre={f.pagina.encuadre ?? null}
                    recolocable={editable && !sitio && !!f.pagina_id}
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
              </div>
              <div className="px-0.5 pt-2.5 pb-1 space-y-1">
                <p className={cn('flex items-center gap-1.5 text-sm font-bold min-w-0', claseTitulo || 'text-slate-800')}>
                  {abriendo === f.id ? <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-400" />
                    : icono ? (esUrl(icono)
                      ? <img src={icono} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                      : <span className="shrink-0">{icono}</span>)
                    : null}
                  <span className={cn('truncate', !nombre && 'text-slate-400')}>{nombre || 'Sin título'}</span>
                </p>
                {/* La descripción de la página, si la tiene: imagen, título y
                    descripción, como en la propia página. */}
                {f.pagina?.descripcion && (
                  <p className="text-xs text-slate-500 leading-snug line-clamp-2 whitespace-pre-line">{f.pagina.descripcion}</p>
                )}
                {otras.map(c => {
                  // Una relación se enseña como fichas que llevan a la página
                  // enlazada: «Movilidad» en la tarjeta del coche volador.
                  if (c.tipo === 'relacion') {
                    const lista = f.apuntados?.[c.id] || [];
                    return lista.length ? (
                      <div key={c.id} className="flex flex-wrap items-center gap-1 pt-0.5">
                        {lista.map((a: any) => <FichaRelacion key={a.id} a={a} />)}
                      </div>
                    ) : null;
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
        })}
        {editable && (
          <button onClick={nueva} disabled={abriendo === 'nueva'}
            className="min-h-[9rem] aspect-[16/9] rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-colors">
            {abriendo === 'nueva' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Nueva página
          </button>
        )}
      </div>
      {!filas.length && !editable && (
        <p className="py-6 text-center text-xs text-slate-400">Todavía no hay nada en esta base de datos.</p>
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
    <div className={cn('relative w-full h-full', modo && 'cursor-move touch-none')}
      onClick={modo ? parar : undefined}
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
          className="absolute top-2 right-2 inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
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

