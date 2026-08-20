// ============================================================================
// JUEGO VITAL — LA PÁGINA DE UN PRODUCTO (2026-08-19, petición de Eugenio:
// «cuando en el mapa 3D se hace clic en un producto que se abra una ventana
// como la de las tareas, como si fuese una nueva página, donde el admin de ese
// producto puede añadir información y reorganizarla en esa pizarra 2D: vídeos,
// fotos, botones de compra, productos relacionados…»).
// ============================================================================
// Es la MISMA pizarra que la ficha de una tarea: bloques sueltos con su x/y,
// que se arrastran y se guardan solos. Se ha copiado la lógica a propósito y no
// el componente: una tarea y un producto comparten el gesto, pero no los tipos
// de bloque (una tarea no tiene botón de comprar) ni los permisos (una tarea es
// tuya; una landing es la cara pública de algo que se vende).
//
// Quien no es el dueño la ve en SOLO LECTURA: sin asas, sin botones, sin poder
// mover nada. Es una página, no un editor compartido.
import { useEffect, useRef, useState } from 'react';
import {
  X, StickyNote, ImagePlus, Link2, Film, Globe, Play, GripHorizontal,
  ShoppingBag, ShoppingCart, Package, ExternalLink, Pencil, Eye,
} from 'lucide-react';
import { Card, Button } from '../ui/core';
import { cn } from '../../utils/cn';

/** Un bloque de la pizarra. Mismo molde que el lienzo de una tarea. */
export interface BloqueProducto {
  idx: number;
  tipo: 'texto' | 'imagen' | 'video' | 'enlace' | 'boton' | 'producto';
  texto?: string;
  url?: string;
  pie?: string;
  x: number;
  y: number;
}

export interface ProductoFicha {
  id: string;
  name: string;
  price_cents: number | null;
  currency: string | null;
  images: string[];
  descripcion?: string | null;
  bloques?: Array<Record<string, unknown>>;
  /** Quién lo creó: solo esa persona (o un admin) puede editar la página. */
  creador?: string | null;
  /** El emoji que se le haya puesto desde el menú. */
  icono?: string | null;
}

const idYoutube = (url?: string) => url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1] || null;

const precio = (cents: number | null, moneda = 'EUR') => {
  if (cents == null) return null;
  const s = moneda === 'EUR' ? '€' : moneda === 'USD' ? '$' : moneda;
  const v = cents / 100;
  return `${v % 1 === 0 ? v.toLocaleString('es-ES') : v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${s}`;
};

export default function FichaProducto({ producto, puedeEditar, onCerrar, onGuardar }: {
  producto: ProductoFicha;
  /** El dueño (o un admin) edita; el resto solo lee. */
  puedeEditar: boolean;
  onCerrar: () => void;
  /** Persiste la pizarra entera. Se llama en cada cambio, como en las tareas. */
  onGuardar: (bloques: Array<Record<string, unknown>>) => Promise<boolean>;
}) {
  const [bloques, setBloques] = useState<BloqueProducto[]>(() =>
    (producto.bloques || []).map((b, i) => ({
      idx: i,
      tipo: (b.tipo as BloqueProducto['tipo']) || 'texto',
      texto: b.texto as string | undefined,
      url: b.url as string | undefined,
      pie: b.pie as string | undefined,
      x: typeof b.x === 'number' ? b.x : 40 + (i % 3) * 300,
      y: typeof b.y === 'number' ? b.y : 30 + Math.floor(i / 3) * 200,
    })));
  /** Editar se ACTIVA a mano aunque puedas: al abrir, la página se lee.
   *  Entrar directamente en modo edición hace que el primer clic mueva algo
   *  sin querer, y una landing es lo que enseñas a otros. */
  const [editando, setEditando] = useState(false);
  const [pidiendo, setPidiendo] = useState<null | 'enlace' | 'video' | 'boton' | 'producto'>(null);
  const [campo1, setCampo1] = useState('');
  const [campo2, setCampo2] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const siguiente = useRef(bloques.length);
  /** Los otros productos del Mercado, para poder relacionar uno. */
  const [catalogo, setCatalogo] = useState<ProductoFicha[] | null>(null);

  useEffect(() => {
    if (pidiendo !== 'producto' || catalogo) return;
    fetch('/api/products?limit=60', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setCatalogo(Array.isArray(j) ? j : []))
      .catch(() => setCatalogo([]));
  }, [pidiendo, catalogo]);

  const guardar = async (nuevos: BloqueProducto[]) => {
    setBloques(nuevos);
    const ok = await onGuardar(nuevos.map(({ idx: _i, ...b }) => b));
    if (!ok) { setAviso('No se ha podido guardar.'); setTimeout(() => setAviso(null), 4000); }
  };

  const anadir = (b: Omit<BloqueProducto, 'idx' | 'x' | 'y'>) => {
    const i = siguiente.current++;
    guardar([...bloques, { ...b, idx: i, x: 40 + (i % 4) * 60, y: 40 + (i % 5) * 40 }]);
  };

  const subirFoto = async (f?: File) => {
    if (!f) return;
    setSubiendo(true);
    try {
      const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' }, body: f,
      });
      const j = await r.json();
      if (!r.ok || !j.url) { setAviso(j.error || 'No se ha podido subir la foto.'); return; }
      anadir({ tipo: 'imagen', url: j.url });
    } finally { setSubiendo(false); }
  };

  /** Acepta lo que se esté pidiendo en la barrita (enlace, vídeo, botón…). */
  const aceptar = () => {
    const a = campo1.trim();
    if (!a) return;
    if (pidiendo === 'boton') anadir({ tipo: 'boton', texto: a, url: campo2.trim() || undefined });
    else if (pidiendo === 'producto') anadir({ tipo: 'producto', url: a });
    else if (pidiendo) anadir({ tipo: pidiendo, url: a });
    setPidiendo(null); setCampo1(''); setCampo2('');
  };

  /** Arrastrar un bloque por la pizarra. Igual que en la ficha de tarea: se
   *  mueve con el puntero y se guarda UNA vez, al soltar. */
  const empezarArrastre = (e: React.PointerEvent, idx: number) => {
    if (!editando) return;
    const el = e.currentTarget as HTMLElement;
    const b = bloques.find(x => x.idx === idx);
    if (!b) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const dx = e.clientX - b.x;
    const dy = e.clientY - b.y;
    let ultimo = bloques;
    const mover = (ev: PointerEvent) => {
      setBloques(prev => {
        ultimo = prev.map(x => (x.idx === idx
          ? { ...x, x: Math.max(0, ev.clientX - dx), y: Math.max(0, ev.clientY - dy) }
          : x));
        return ultimo;
      });
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover as any);
      el.removeEventListener('pointerup', soltar);
      guardar(ultimo);
    };
    el.addEventListener('pointermove', mover as any);
    el.addEventListener('pointerup', soltar);
  };

  const p = precio(producto.price_cents, producto.currency || 'EUR');
  const btn = 'text-[11px] px-2 py-1 border border-slate-200';

  return (
    <div data-ui-juego className="absolute inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-[2px]"
      onClick={onCerrar}>
      <Card className="shadow-2xl overflow-hidden flex flex-col w-[94vw] max-w-6xl h-[86vh] p-0"
        onClick={e => e.stopPropagation()}>

        {/* Cabecera: es la ficha del producto, no un editor sin nombre */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100">
          {producto.images?.[0] && (
            <img src={producto.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
              {/* El icono que le hayas puesto en el menú manda sobre el
                  genérico (Eugenio, 2026-08-20). */}
              {producto.icono
                ? <span className="text-base leading-none shrink-0">{producto.icono}</span>
                : <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />}
              {producto.name}
            </p>
            <p className="text-[10px] text-slate-400">Página del producto</p>
          </div>
          {p && <p className="ml-2 text-lg font-black text-emerald-700 shrink-0">{p}</p>}

          <div className="ml-auto flex items-center gap-1.5">
            {puedeEditar && (
              <Button
                variant="ghost"
                onClick={() => { setEditando(v => !v); setPidiendo(null); }}
                className={cn('text-[11px] px-2.5 py-1 border', editando
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600')}
              >
                {editando
                  ? <><Eye className="w-3.5 h-3.5 mr-1 inline" />Ver como queda</>
                  : <><Pencil className="w-3.5 h-3.5 mr-1 inline" />Editar la página</>}
              </Button>
            )}
            <Button variant="ghost" onClick={onCerrar} className="p-1"><X className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {/* La barra de herramientas solo existe editando */}
        {editando && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Añadir</span>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { subirFoto(e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="ghost" className={btn} onClick={() => anadir({ tipo: 'texto', texto: '' })}>
              <StickyNote className="w-3.5 h-3.5 mr-1 inline" />Texto
            </Button>
            <Button variant="ghost" className={btn} disabled={subiendo} onClick={() => fotoRef.current?.click()}>
              <ImagePlus className="w-3.5 h-3.5 mr-1 inline" />{subiendo ? 'Subiendo…' : 'Foto'}
            </Button>
            <Button variant="ghost" className={btn} onClick={() => { setPidiendo('video'); setCampo1(''); }}>
              <Film className="w-3.5 h-3.5 mr-1 inline" />Vídeo
            </Button>
            <Button variant="ghost" className={btn} onClick={() => { setPidiendo('enlace'); setCampo1(''); }}>
              <Link2 className="w-3.5 h-3.5 mr-1 inline" />Enlace
            </Button>
            <Button variant="ghost" className="text-[11px] px-2 py-1 border border-emerald-200 text-emerald-700"
              onClick={() => { setPidiendo('boton'); setCampo1('Comprar'); setCampo2(''); }}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1 inline" />Botón de compra
            </Button>
            <Button variant="ghost" className={btn} onClick={() => { setPidiendo('producto'); setCampo1(''); }}>
              <Package className="w-3.5 h-3.5 mr-1 inline" />Producto relacionado
            </Button>
            <span className="ml-auto text-[10px] text-slate-400">Arrastra por el asa para colocarlo. Se guarda solo.</span>
          </div>
        )}

        {pidiendo && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-emerald-50/60">
            {pidiendo === 'producto' ? (
              <select
                autoFocus value={campo1} onChange={e => setCampo1(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-300"
              >
                <option value="">Elige un producto del Mercado…</option>
                {(catalogo || []).filter(x => x.id !== producto.id)
                  .map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            ) : (
              <>
                {pidiendo === 'boton' && (
                  <input
                    autoFocus value={campo1} onChange={e => setCampo1(e.target.value)}
                    placeholder="Lo que pone el botón (p. ej. «Comprar · 649 €»)"
                    className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                  />
                )}
                <input
                  autoFocus={pidiendo !== 'boton'}
                  value={pidiendo === 'boton' ? campo2 : campo1}
                  onChange={e => (pidiendo === 'boton' ? setCampo2 : setCampo1)(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') aceptar(); if (e.key === 'Escape') setPidiendo(null); }}
                  placeholder={pidiendo === 'video' ? 'Enlace del vídeo de YouTube…' : 'https://…'}
                  className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                />
              </>
            )}
            <Button onClick={aceptar} disabled={!campo1.trim()} className="shrink-0 text-xs px-2.5 py-1.5">Añadir</Button>
            <Button variant="ghost" onClick={() => setPidiendo(null)} className="shrink-0 p-1"><X className="w-3.5 h-3.5" /></Button>
          </div>
        )}
        {aviso && <p className="px-4 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border-b border-rose-100">{aviso}</p>}

        {/* LA PIZARRA */}
        <div
          className={cn('flex-1 min-h-0 overflow-auto', editando ? 'bg-slate-100' : 'bg-white')}
          style={editando
            ? { backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '22px 22px' }
            : undefined}
        >
          <div className="relative" style={{ width: 1200, height: 900 }}>
            {bloques.length === 0 && (
              <div className="absolute left-1/2 top-24 -translate-x-1/2 text-center">
                <p className="text-sm text-slate-400">Esta página está vacía.</p>
                {puedeEditar && (
                  <p className="text-xs text-slate-400 mt-1">
                    Pulsa «Editar la página» y añade textos, fotos, vídeos y un botón de compra.
                  </p>
                )}
              </div>
            )}
            {bloques.map(b => (
              <div
                key={b.idx}
                onPointerDown={e => empezarArrastre(e, b.idx)}
                className={cn('absolute group/bloque select-none touch-none',
                  editando && 'cursor-grab active:cursor-grabbing')}
                style={{ left: b.x, top: b.y }}
              >
                {editando && (
                  <>
                    <button
                      onClick={() => guardar(bloques.filter(x => x.idx !== b.idx))}
                      title="Quitar de la página"
                      className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hidden group-hover/bloque:flex items-center justify-center shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {/* El asa: un texto es todo textarea y un botón es todo
                        botón, así que sin esta franja no habría de dónde tirar. */}
                    <div title="Arrastra para mover"
                      className="flex items-center justify-center h-4 mb-1 rounded-md bg-white/80 border border-slate-200 text-slate-400 shadow-sm">
                      <GripHorizontal className="w-3.5 h-3.5" />
                    </div>
                  </>
                )}

                {b.tipo === 'texto' && (editando ? (
                  <textarea
                    defaultValue={b.texto || ''}
                    onBlur={e => {
                      const t = e.target.value;
                      if (t !== b.texto) guardar(bloques.map(x => (x.idx === b.idx ? { ...x, texto: t } : x)));
                    }}
                    placeholder="Escribe…"
                    className="w-64 h-36 p-3 text-xs leading-relaxed rounded-xl border border-slate-200 bg-white text-slate-700 shadow resize focus:outline-none focus:border-emerald-300"
                  />
                ) : (
                  <p className="w-64 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{b.texto}</p>
                ))}

                {b.tipo === 'imagen' && b.url && (
                  <img src={b.url} alt={b.pie || ''} draggable={false}
                    className="w-64 rounded-xl border border-slate-200 shadow bg-white" />
                )}

                {b.tipo === 'video' && b.url && (
                  <a href={b.url} target="_blank" rel="noreferrer"
                    onClick={e => editando && e.preventDefault()}
                    className="block relative w-64 rounded-xl overflow-hidden border border-slate-200 shadow bg-black">
                    {idYoutube(b.url)
                      ? <img src={`https://i.ytimg.com/vi/${idYoutube(b.url)}/mqdefault.jpg`} draggable={false} className="w-full" />
                      : <div className="w-full h-32 bg-slate-800" />}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-11 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </span>
                    </span>
                  </a>
                )}

                {b.tipo === 'enlace' && b.url && (
                  <a href={b.url} target="_blank" rel="noreferrer"
                    onClick={e => editando && e.preventDefault()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow text-xs text-sky-700 font-bold max-w-[16rem] truncate hover:border-sky-300">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{(() => { try { return new URL(b.url!).hostname; } catch { return b.url; } })()}</span>
                  </a>
                )}

                {/* EL BOTÓN DE COMPRA: grande y verde, que es lo que se busca
                    en una página de producto sin tener que leerla entera. */}
                {b.tipo === 'boton' && (
                  <a
                    href={b.url || '#'} target="_blank" rel="noreferrer"
                    onClick={e => { if (editando || !b.url) e.preventDefault(); }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {b.texto || 'Comprar'}
                    {!editando && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
                  </a>
                )}

                {b.tipo === 'producto' && b.url && (
                  <ProductoRelacionado id={b.url} editando={editando} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Una tarjeta de OTRO producto del Mercado, con su foto y su precio. Se pide
 *  al abrir: así el relacionado enseña su precio de HOY, no el del día que se
 *  puso en la página. */
function ProductoRelacionado({ id, editando }: { id: string; editando: boolean }) {
  const [p, setP] = useState<ProductoFicha | null>(null);
  const [falta, setFalta] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/products?limit=200`, { credentials: 'include' })
      .then(r => r.json())
      .then((j: ProductoFicha[]) => {
        if (!vivo) return;
        const x = Array.isArray(j) ? j.find(q => q.id === id) : null;
        if (x) setP(x); else setFalta(true);
      })
      .catch(() => vivo && setFalta(true));
    return () => { vivo = false; };
  }, [id]);

  if (falta) {
    return (
      <div className="w-56 p-3 rounded-xl border border-slate-200 bg-white shadow text-[11px] text-slate-400">
        Ese producto ya no está en el Mercado.
      </div>
    );
  }
  const pr = p ? precio(p.price_cents, p.currency || 'EUR') : null;
  return (
    <a
      href={p ? `/mercado?producto=${p.id}` : '#'}
      onClick={e => editando && e.preventDefault()}
      className="flex w-56 items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white shadow hover:border-emerald-300 transition-colors"
    >
      {p?.images?.[0]
        ? <img src={p.images[0]} alt="" draggable={false} className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0" />
        : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-slate-300" />
          </div>}
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-slate-700 truncate">{p?.name || 'Cargando…'}</span>
        {pr && <span className="block text-[11px] font-black text-emerald-700">{pr}</span>}
      </span>
    </a>
  );
}
