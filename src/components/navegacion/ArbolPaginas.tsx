import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, FileText, FolderKanban, Boxes, Loader2 } from 'lucide-react';
import { componenteDeTrazo } from '../ui/iconosDeTrazo';
import { cn } from '../../utils/cn';

// ============================================================================
// TUS PÁGINAS EN ÁRBOL, EN EL MENÚ DE LA IZQUIERDA (2026-10-05)
// ============================================================================
// Eugenio, dos peticiones que son una:
//   · «al darle al icono de desplegar, en vez de abrirse otro submenú
//     ocupando más ancho, que se despliegue en acordeón debajo del título, y
//     si dentro hay otra página con páginas, que se pueda volver a abrir, de
//     forma indefinida, como hace Notion».
//   · «pinchar y arrastrar una página sobre otra, y que se meta dentro de la
//     página donde se suelta».
//
// El árbol sale de `/api/paginas/arbol`: carpetas, páginas sueltas y, dentro
// de cada página, sus subpáginas y sus bases de datos (con sus elementos).
// Lo abierto se recuerda en este navegador. Arrastrar usa el del propio
// navegador, como el resto de menús de la casa: soltar sobre una página la
// mete dentro; sobre una carpeta, la saca a esa carpeta.

type Nodo = { id: string; tipo: 'pagina' | 'bd' | 'fila'; titulo: string; icono: string | null; hijas: string[] };
type Arbol = { carpetas: Array<{ id: string; titulo: string; slug: string; icono: string | null; paginas: string[] }>; raiz: string[]; nodos: Record<string, Nodo> };

const CLAVE_ABIERTOS = 'humanity:arbol-abiertos';
const leerAbiertos = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_ABIERTOS) || '[]')); } catch { return new Set(); }
};

/** Un emoji se pinta tal cual; lo demás, con el icono de su clase. */
function IconoNodo({ n, carpeta }: { n?: Nodo; carpeta?: string | null }) {
  const icono = n ? n.icono : carpeta;
  if (icono && [...icono].length <= 2 && !/^[\w-]+$/.test(icono)) return <span className="w-4 text-center text-[14px] leading-none shrink-0">{icono}</span>;
  const C = carpeta !== undefined ? (icono ? componenteDeTrazo(icono) : FolderKanban) : n?.tipo === 'bd' ? Boxes : FileText;
  return <C className="h-4 w-4 shrink-0" />;
}

export default function ArbolPaginas({ onIr }: { onIr?: () => void }) {
  const [arbol, setArbol] = useState<Arbol | 'fallo' | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(leerAbiertos);
  const [sobre, setSobre] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const arrastrada = useRef<string | null>(null);
  const aqui = useLocation().pathname;

  const pedir = useCallback(() => {
    fetch('/api/paginas/arbol', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setArbol)
      .catch(() => setArbol(a => (a && a !== 'fallo' ? a : 'fallo')));
  }, []);
  useEffect(() => {
    pedir();
    // Al volver a la pestaña y cuando algo cambia el menú (crear una página,
    // una carpeta…), se vuelve a preguntar.
    window.addEventListener('focus', pedir);
    window.addEventListener('humanity:menu-cambiado', pedir);
    return () => { window.removeEventListener('focus', pedir); window.removeEventListener('humanity:menu-cambiado', pedir); };
  }, [pedir]);
  // Al entrar en otra página se refresca: puede ser nueva, o haberse renombrado.
  useEffect(() => { pedir(); }, [aqui, pedir]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const alternar = (id: string, abrir?: boolean) => setAbiertos(s => {
    const n = new Set(s);
    if (abrir ?? !n.has(id)) n.add(id); else n.delete(id);
    try { localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify([...n].slice(-300))); } catch { /* sin almacenamiento */ }
    return n;
  });

  if (arbol === null) return <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Cargando tus páginas…</p>;
  if (arbol === 'fallo') return (
    <button onClick={pedir} className="mx-1.5 my-1 rounded-xl px-[10px] py-2 text-left text-[12px] font-bold text-amber-700 hover:bg-amber-50">
      No hemos podido cargar tus páginas. Pulsa para reintentar.
    </button>
  );
  const { nodos } = arbol;

  /** ¿Está `id` dentro de `de` (o es él)? Para no soltar una página en sus hijas. */
  const dentroDe = (id: string, de: string): boolean => id === de || (nodos[de]?.hijas || []).some(h => dentroDe(id, h));

  const mover = async (id: string, destino: { pagina?: string; carpeta?: string | null }) => {
    const cuerpo = destino.pagina ? { dentro_de: destino.pagina } : { dentro_de: null, carpeta_id: destino.carpeta ?? null };
    const r = await fetch(`/api/paginas/${id}/mover`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setAviso(j.error || 'No se ha podido mover.'); return; }
    if (destino.pagina) alternar(destino.pagina, true);
    if (destino.carpeta) alternar(`carpeta:${destino.carpeta}`, true);
    pedir();
    // La página de destino, si está abierta, se vuelve a leer: si no, al
    // guardar lo que tiene en pantalla se llevaría por delante el bloque nuevo.
    window.dispatchEvent(new CustomEvent('humanity:pagina-movida', { detail: { id, titulo: nodos[id]?.titulo, dentro_de: destino.pagina || null } }));
  };

  /** Lo que hace falta para que una fila acepte que le suelten una página. */
  const zona = (clave: string, puede: (id: string) => boolean, soltar: (id: string) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      const id = arrastrada.current;
      if (!id || !puede(id)) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      if (sobre !== clave) setSobre(clave);
    },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(s => (s === clave ? null : s)); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = arrastrada.current;
      setSobre(null); arrastrada.current = null; setArrastrando(false);
      if (id && puede(id)) soltar(id);
    },
  });

  const fila = (n: Nodo, nivel: number): any => {
    const tiene = n.hijas.length > 0;
    const abierta = abiertos.has(n.id);
    const ruta = n.tipo === 'bd' ? null : `/paginas/${n.id}`;
    const activa = ruta === aqui;
    const movible = n.tipo === 'pagina';
    const aceptaDentro = n.tipo === 'pagina';
    const resaltada = sobre === n.id;
    const sangria = 4 + Math.min(nivel, 6) * 14;
    const contenido = (
      <>
        <IconoNodo n={n} />
        <span className="min-w-0 flex-1 truncate">{n.titulo}</span>
      </>
    );
    return (
      <div key={n.id}>
        <div
          {...(aceptaDentro ? zona(n.id, id => !dentroDe(n.id, id), id => mover(id, { pagina: n.id })) : {})}
          draggable={movible}
          onDragStart={movible ? e => {
            arrastrada.current = n.id;
            setArrastrando(true);
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', n.id); } catch { /* Firefox */ }
          } : undefined}
          onDragEnd={() => { arrastrada.current = null; setSobre(null); setArrastrando(false); }}
          className={cn('group/arbol relative flex items-center rounded-lg transition-colors',
            resaltada ? 'bg-emerald-50 ring-2 ring-emerald-400' : activa ? 'bg-slate-100' : 'hover:bg-slate-50')}>
          <button type="button"
            onClick={e => { e.stopPropagation(); if (tiene) alternar(n.id); }}
            aria-label={tiene ? (abierta ? `Cerrar ${n.titulo}` : `Ver lo que hay dentro de ${n.titulo}`) : undefined}
            aria-expanded={tiene ? abierta : undefined}
            tabIndex={tiene ? 0 : -1}
            style={{ marginLeft: sangria }}
            className={cn('grid h-7 w-5 shrink-0 place-items-center rounded text-slate-400 transition-colors',
              tiene ? 'hover:bg-slate-200 hover:text-slate-700' : 'cursor-default opacity-0')}>
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-150', abierta && 'rotate-90')} />
          </button>
          {ruta ? (
            <Link to={ruta} onClick={onIr} draggable={false} title={n.titulo} aria-current={activa ? 'page' : undefined}
              className={cn('flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1 pr-2 text-[13px]',
                activa ? 'font-bold text-slate-900' : n.tipo === 'fila' ? 'text-slate-500 hover:text-slate-900' : 'font-semibold text-slate-600 hover:text-slate-900')}>
              {contenido}
            </Link>
          ) : (
            <button type="button" onClick={() => alternar(n.id)} title={n.titulo}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1 pr-2 text-left text-[13px] font-semibold text-slate-500 hover:text-slate-900">
              {contenido}
            </button>
          )}
          {resaltada && <span className="pointer-events-none absolute right-2 text-[10px] font-black text-emerald-700">Meter dentro</span>}
        </div>
        {tiene && abierta && (
          <div className="relative">
            {/* La línea de la rama: se ve qué cuelga de qué sin contar sangrías. */}
            <span aria-hidden className="absolute bottom-1 top-0 w-px bg-slate-200" style={{ left: sangria + 10 }} />
            {n.hijas.map(h => nodos[h] && fila(nodos[h], nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-px py-1">
      {arbol.carpetas.map(c => {
        const clave = `carpeta:${c.id}`;
        const abierta = abiertos.has(clave);
        const ruta = `/carpetas/${c.slug}`;
        return (
          <div key={c.id}>
            <div {...zona(clave, () => true, id => mover(id, { carpeta: c.id }))}
              className={cn('group/arbol relative flex items-center rounded-lg transition-colors',
                sobre === clave ? 'bg-emerald-50 ring-2 ring-emerald-400' : aqui === ruta ? 'bg-slate-100' : 'hover:bg-slate-50')}>
              <button type="button" onClick={() => alternar(clave)} style={{ marginLeft: 4 }}
                aria-label={abierta ? `Cerrar ${c.titulo}` : `Ver las páginas de ${c.titulo}`} aria-expanded={abierta}
                className="grid h-7 w-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-150', abierta && 'rotate-90')} />
              </button>
              <Link to={ruta} onClick={onIr} title={c.titulo}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1 pr-2 text-[13px] font-bold text-slate-700 hover:text-slate-900">
                <IconoNodo carpeta={c.icono} />
                <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
              </Link>
              {sobre === clave && <span className="pointer-events-none absolute right-2 text-[10px] font-black text-emerald-700">Mover aquí</span>}
            </div>
            {abierta && (
              <div className="relative">
                <span aria-hidden className="absolute bottom-1 top-0 w-px bg-slate-200" style={{ left: 14 }} />
                {c.paginas.length
                  ? c.paginas.map(id => nodos[id] && fila(nodos[id], 1))
                  : <p className="py-1 pl-10 text-[11px] text-slate-400">Vacía. Arrastra aquí una página.</p>}
              </div>
            )}
          </div>
        );
      })}
      {arbol.raiz.map(id => nodos[id] && fila(nodos[id], 0))}
      {/* Soltar aquí saca una página de donde estuviera, a la raíz. */}
      {arrastrando && <div {...zona('raiz', () => true, id => mover(id, { carpeta: null }))}
        className={cn('mx-1 mt-1 rounded-lg border border-dashed px-2 py-1.5 text-center text-[11px] font-bold transition-all',
          sobre === 'raiz' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-400')}>
        Soltar aquí para sacarla fuera de todo
      </div>}
      {aviso && <p role="alert" className="mx-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-700">{aviso}</p>}
    </div>
  );
}
