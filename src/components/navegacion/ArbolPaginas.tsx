import { useCallback, useEffect, useRef, useState } from 'react';
import CompartidasConmigo from '../acceso/CompartidasConmigo';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, FolderKanban, Boxes, Loader2, Trash2, Star } from 'lucide-react';
import FavoritosRecientes from '../espacio/FavoritosRecientes';
import { alternarFavorito, useEspacio, type TipoEspacio } from '../../utils/espacio';
import { componenteDeTrazo } from '../ui/iconosDeTrazo';
import { avisarMovimiento } from '../../utils/avisoPaginas';
import { cn } from '../../utils/cn';

import { t as tr } from '../../i18n';
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
//
// LAS CARPETAS TAMBIÉN SE ARRASTRAN (2026-10-05, 2.ª vuelta). Eugenio: «sólo
// funcionan las páginas que están dentro de las páginas, pero no la página
// general, meterla dentro de otra página general». Lo de arriba del todo en
// su menú son carpetas («Aldea Regenerativa», «Meta Vida»…), que se pintan
// igual que una página y no se podían mover. Ahora una carpeta se suelta
// dentro de otra (`padre_id`, migración 0133) y se anidan sin límite.
//
// CLIC DERECHO → BORRAR, como en Notion. Una página va a la papelera (15 días)
// con todas las que lleva dentro, y el aviso trae «Deshacer». Una carpeta se
// archiva y lo de dentro sale fuera, sin borrarse: eso se pregunta antes.
//
// FAVORITOS (2026-10-06, #14). El mismo clic derecho ofrece «Añadir a
// favoritos» —a páginas, carpetas y bases de datos— y los favoritos y
// recientes salen en `FavoritosRecientes`, arriba del árbol.

type Nodo = { id: string; tipo: 'pagina' | 'bd' | 'fila'; titulo: string; icono: string | null; hijas: string[] };
type Carpeta = { id: string; titulo: string; slug: string; icono: string | null; padre_id: string | null; paginas: string[] };
type Arbol = { carpetas: Carpeta[]; raiz: string[]; nodos: Record<string, Nodo> };

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
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean; deshacer?: () => void } | null>(null);
  /** El menú del clic derecho: dónde se abrió y sobre qué. */
  const [menu, setMenu] = useState<{ x: number; y: number; tipo: 'pagina' | 'carpeta' | 'bd'; id: string; titulo: string } | null>(null);
  const { favoritos } = useEspacio();
  const navigate = useNavigate();
  const cajaMenu = useRef<HTMLDivElement | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  /** Lo que se arrastra: el id de una página, o `carpeta:<id>`. */
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

  // UN BLOQUE DEL EDITOR PASANDO POR ENCIMA (2026-10-05): el editor arrastra
  // con el puntero, no con el arrastre del navegador, así que avisa por aquí
  // de qué página tiene debajo; aquí se ilumina, y al soltarlo se refresca.
  useEffect(() => {
    const oir = (e: Event) => setSobre((e as CustomEvent).detail?.pagina || null);
    const movido = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.a) alternar(d.a, true);
      // Desde el editor no se ve a dónde ha ido: se dice.
      if (d.desdeEditor) setAviso({ texto: tr('Llevado a «{destino}».', { destino: d.destinoNombre }) });
      pedir();
    };
    window.addEventListener('humanity:bloque-sobre', oir);
    window.addEventListener('humanity:bloque-movido', movido);
    return () => { window.removeEventListener('humanity:bloque-sobre', oir); window.removeEventListener('humanity:bloque-movido', movido); };
  }, [pedir]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.deshacer ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  // El menú del clic derecho se cierra al pulsar fuera, con Escape o al
  // desplazar: quedarse flotando sobre otra cosa sería borrar a ciegas.
  useEffect(() => {
    if (!menu) return;
    // Lo que pasa DENTRO del menú no lo cierra: si no, pulsar «Borrar» lo
    // cerraría antes de que llegara el clic.
    const cerrar = (e?: Event) => { if (e?.target instanceof Node && cajaMenu.current?.contains(e.target)) return; setMenu(null); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('pointerdown', cerrar);
    window.addEventListener('keydown', tecla);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('pointerdown', cerrar); window.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', cerrar, true); window.removeEventListener('resize', cerrar);
    };
  }, [menu]);

  const alternar = (id: string, abrir?: boolean) => setAbiertos(s => {
    const n = new Set(s);
    if (abrir ?? !n.has(id)) n.add(id); else n.delete(id);
    try { localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify([...n].slice(-300))); } catch { /* sin almacenamiento */ }
    return n;
  });

  if (arbol === null) return <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> {tr('Cargando tus páginas…')}</p>;
  if (arbol === 'fallo') return (
    <button onClick={pedir} className="mx-1.5 my-1 rounded-xl px-[10px] py-2 text-left text-[12px] font-bold text-amber-700 hover:bg-amber-50">
      {tr('No hemos podido cargar tus páginas. Pulsa para reintentar.')}
    </button>
  );
  const { nodos } = arbol;

  /** ¿Está `id` dentro de `de` (o es él)? Para no soltar una página en sus hijas. */
  const dentroDe = (id: string, de: string): boolean => id === de || (nodos[de]?.hijas || []).some(h => dentroDe(id, h));

  /** La página de la que cuelga un nodo (para una base de datos, la suya). */
  const padreDe = (id: string) => Object.values(nodos).find(n => n.hijas.includes(id))?.id || null;

  const mover = async (id: string, destino: { pagina?: string; carpeta?: string | null }) => {
    // UNA BASE DE DATOS NO ES UNA PÁGINA (2026-10-05): viaja como bloque, de
    // su página a la otra (`/traer`), con todo lo que tiene dentro.
    if (nodos[id]?.tipo === 'bd') {
      if (!destino.pagina) { setAviso({ texto: tr('Una base de datos tiene que ir dentro de una página.'), error: true }); return; }
      const desde = padreDe(id);
      if (!desde || desde === destino.pagina) return;
      const r = await fetch(`/api/paginas/${destino.pagina}/traer`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde, tabla_id: id.slice(3) }),
      }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r?.ok) { setAviso({ texto: j.error || tr('No se ha podido mover.'), error: true }); return; }
      alternar(destino.pagina, true);
      pedir();
      avisarMovimiento('humanity:bloque-movido', { desde, a: destino.pagina, bloque: j.bloque });
      return;
    }
    const cuerpo = destino.pagina ? { dentro_de: destino.pagina } : { dentro_de: null, carpeta_id: destino.carpeta ?? null };
    const r = await fetch(`/api/paginas/${id}/mover`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setAviso({ texto: j.error || tr('No se ha podido mover.'), error: true }); return; }
    if (destino.pagina) alternar(destino.pagina, true);
    if (destino.carpeta) alternar(`carpeta:${destino.carpeta}`, true);
    pedir();
    // La página de destino, si está abierta, se vuelve a leer: si no, al
    // guardar lo que tiene en pantalla se llevaría por delante el bloque nuevo.
    avisarMovimiento('humanity:pagina-movida', { id, titulo: nodos[id]?.titulo, dentro_de: destino.pagina || null });
  };

  const esCarpeta = (k: string) => k.startsWith('carpeta:');
  const sinPrefijo = (k: string) => k.slice('carpeta:'.length);
  const hijasDe = (padre: string | null) => arbol.carpetas.filter(c => c.padre_id === padre);
  /** ¿Está la carpeta `id` dentro de `de` (o es ella)? Para no hacer círculos. */
  const carpetaDentro = (id: string, de: string): boolean => id === de || hijasDe(de).some(h => carpetaDentro(id, h.id));

  const moverCarpeta = async (id: string, dentroDe: string | null) => {
    const r = await fetch(`/api/carpetas/${id}/mover`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dentro_de: dentroDe }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setAviso({ texto: j.error || tr('No se ha podido mover la carpeta.'), error: true }); return; }
    if (dentroDe) alternar(`carpeta:${dentroDe}`, true);
    pedir();
    window.dispatchEvent(new CustomEvent('humanity:menu-cambiado'));
  };

  /** Una página y todas las que cuelgan de ella: a la papelera van juntas. */
  const conDescendientes = (id: string): string[] =>
    [id, ...(nodos[id]?.hijas || []).flatMap(h => (nodos[h]?.tipo === 'pagina' ? conDescendientes(h) : []))];

  const alternarFav = async (m: NonNullable<typeof menu>) => {
    setMenu(null);
    const id = m.tipo === 'bd' ? m.id.replace(/^bd:/, '') : m.id;
    const ruta = m.tipo === 'carpeta' ? `/carpetas/${arbol.carpetas.find(c => c.id === m.id)?.slug}` : m.tipo === 'bd' ? '' : `/paginas/${m.id}`;
    const e = await alternarFavorito(m.tipo as TipoEspacio, id, m.titulo, null, ruta);
    if (e) setAviso({ texto: e, error: true });
  };

  const borrar = async (m: NonNullable<typeof menu>) => {
    setMenu(null);
    if (m.tipo === 'bd') return;
    if (m.tipo === 'carpeta') {
      if (!window.confirm(`¿Borrar la carpeta «${m.titulo}»?\n\nLo que hay dentro no se borra: saldrá fuera de la carpeta.`)) return;
      const r = await fetch(`/api/proyectos/${m.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r?.ok) { setAviso({ texto: j.error || tr('No se ha podido borrar la carpeta.'), error: true }); return; }
      setAviso({ texto: tr('Carpeta «{titulo}» borrada.', { titulo: m.titulo }) });
      if (aqui === `/carpetas/${arbol.carpetas.find(c => c.id === m.id)?.slug}`) navigate('/paginas');
    } else {
      const ids = conDescendientes(m.id);
      const rs = await Promise.all(ids.map(id => fetch(`/api/windows/${id}/papelera`, { method: 'POST', credentials: 'include' }).catch(() => null)));
      if (!rs[0]?.ok) { setAviso({ texto: tr('No se ha podido borrar la página.'), error: true }); return; }
      const restaurar = async () => {
        setAviso(null);
        await Promise.all(ids.map(id => fetch(`/api/windows/${id}/restaurar`, { method: 'POST', credentials: 'include' }).catch(() => null)));
        pedir();
        window.dispatchEvent(new CustomEvent('humanity:menu-cambiado'));
      };
      setAviso({ texto: ids.length > 1 ? tr('«{titulo}» y {n} más en la papelera.', { titulo: m.titulo, n: ids.length - 1 }) : tr('«{titulo}» en la papelera.', { titulo: m.titulo }), deshacer: restaurar });
      if (ids.some(id => aqui === `/paginas/${id}`)) navigate('/paginas');
    }
    pedir();
    window.dispatchEvent(new CustomEvent('humanity:menu-cambiado'));
  };

  const abrirMenu = (tipo: 'pagina' | 'carpeta' | 'bd', id: string, titulo: string) => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, tipo, id, titulo });
  };

  const empezar = (clave: string) => (e: React.DragEvent) => {
    e.stopPropagation();
    arrastrada.current = clave;
    setArrastrando(true);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', clave); } catch { /* Firefox */ }
  };
  const terminar = () => { arrastrada.current = null; setSobre(null); setArrastrando(false); };

  /** Lo que hace falta para que una fila acepte que le suelten algo. */
  const zona = (clave: string, puede: (id: string) => boolean, soltar: (id: string) => void) => {
    // Hay que aceptar ya al ENTRAR, no sólo al pasar por encima: quien suelta
    // nada más llegar a la fila no da tiempo a un `dragover`, y sin aceptar
    // el navegador da el arrastre por fallido y no suelta nada.
    const aceptar = (e: React.DragEvent) => {
      const id = arrastrada.current;
      if (!id || !puede(id)) return;
      e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move';
      if (sobre !== clave) setSobre(clave);
    };
    return {
    onDragEnter: aceptar,
    onDragOver: aceptar,
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(s => (s === clave ? null : s)); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      const id = arrastrada.current;
      setSobre(null); arrastrada.current = null; setArrastrando(false);
      if (id && puede(id)) soltar(id);
    },
    };
  };

  const fila = (n: Nodo, nivel: number): any => {
    const tiene = n.hijas.length > 0;
    const abierta = abiertos.has(n.id);
    const ruta = n.tipo === 'bd' ? null : `/paginas/${n.id}`;
    const activa = ruta === aqui;
    // Se arrastran páginas y bases de datos (2026-10-05); los elementos de una
    // base de datos viven en ella. Se suelta dentro de cualquier página,
    // también la de un elemento.
    const movible = n.tipo === 'pagina' || n.tipo === 'bd';
    const aceptaDentro = n.tipo === 'pagina' || n.tipo === 'fila';
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
          {...(aceptaDentro ? zona(n.id, k => !esCarpeta(k) && !dentroDe(n.id, k) && padreDe(k) !== n.id, id => mover(id, { pagina: n.id })) : {})}
          // El editor busca esta marca para soltar un bloque aquí (ver `Documento.tsx`).
          data-arbol-destino={aceptaDentro ? n.id : undefined}
          draggable={movible}
          onDragStart={movible ? empezar(n.id) : undefined}
          onDragEnd={terminar}
          onContextMenu={n.tipo === 'pagina' || n.tipo === 'bd' ? abrirMenu(n.tipo, n.id, n.titulo) : undefined}
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
          {resaltada && <span className="pointer-events-none absolute right-2 text-[10px] font-black text-emerald-700">{tr('Meter dentro')}</span>}
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

  const carpetaFila = (c: Carpeta, nivel: number): any => {
    const clave = `carpeta:${c.id}`;
    const abierta = abiertos.has(clave);
    const ruta = `/carpetas/${c.slug}`;
    const subcarpetas = hijasDe(c.id);
    const sangria = 4 + Math.min(nivel, 6) * 14;
    return (
      <div key={c.id}>
        <div {...zona(clave, k => !esCarpeta(k) || !carpetaDentro(c.id, sinPrefijo(k)), k => (esCarpeta(k) ? moverCarpeta(sinPrefijo(k), c.id) : mover(k, { carpeta: c.id })))}
          draggable
          onDragStart={empezar(clave)}
          onDragEnd={terminar}
          onContextMenu={abrirMenu('carpeta', c.id, c.titulo)}
          className={cn('group/arbol relative flex items-center rounded-lg transition-colors',
            sobre === clave ? 'bg-emerald-50 ring-2 ring-emerald-400' : aqui === ruta ? 'bg-slate-100' : 'hover:bg-slate-50')}>
          <button type="button" onClick={() => alternar(clave)} style={{ marginLeft: sangria }}
            aria-label={abierta ? `Cerrar ${c.titulo}` : `Ver las páginas de ${c.titulo}`} aria-expanded={abierta}
            className="grid h-7 w-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700">
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-150', abierta && 'rotate-90')} />
          </button>
          <Link to={ruta} onClick={onIr} draggable={false} title={c.titulo}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1 pr-2 text-[13px] font-bold text-slate-700 hover:text-slate-900">
            <IconoNodo carpeta={c.icono} />
            <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
          </Link>
          {sobre === clave && <span className="pointer-events-none absolute right-2 text-[10px] font-black text-emerald-700">{tr('Meter dentro')}</span>}
        </div>
        {abierta && (
          <div className="relative">
            <span aria-hidden className="absolute bottom-1 top-0 w-px bg-slate-200" style={{ left: sangria + 10 }} />
            {subcarpetas.map(h => carpetaFila(h, nivel + 1))}
            {c.paginas.map(id => nodos[id] && fila(nodos[id], nivel + 1))}
            {!subcarpetas.length && !c.paginas.length && <p className="py-1 text-[11px] text-slate-400" style={{ paddingLeft: sangria + 36 }}>{tr('Vacía. Arrastra aquí una página.')}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-px py-1">
      <FavoritosRecientes onIr={onIr} carpetas={arbol.carpetas} />
      {hijasDe(null).map(c => carpetaFila(c, 0))}
      {arbol.raiz.map(id => nodos[id] && fila(nodos[id], 0))}
      {/* Lo que otras personas han compartido contigo (#12). */}
      <CompartidasConmigo onIr={onIr} />
      {/* Soltar aquí saca una página de donde estuviera, a la raíz. */}
      {arrastrando && <div {...zona('raiz', () => true, k => (esCarpeta(k) ? moverCarpeta(sinPrefijo(k), null) : mover(k, { carpeta: null })))}
        className={cn('mx-1 mt-1 rounded-lg border border-dashed px-2 py-1.5 text-center text-[11px] font-bold transition-all',
          sobre === 'raiz' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-400')}>
        {tr('Soltar aquí para sacarla fuera de todo')}
      </div>}
      {aviso && (
        <p role={aviso.error ? 'alert' : 'status'} className={cn('mx-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-bold',
          aviso.error ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700')}>
          <span className="min-w-0 flex-1">{aviso.texto}</span>
          {aviso.deshacer && <button type="button" onClick={aviso.deshacer} className="shrink-0 rounded px-1.5 py-0.5 font-black text-emerald-700 hover:bg-white">{tr('Deshacer')}</button>}
        </p>
      )}
      {menu && createPortal(
        <div role="menu" ref={cajaMenu} aria-label={`Opciones de ${menu.titulo}`}
          onContextMenu={e => e.preventDefault()}
          style={{ left: Math.min(menu.x, window.innerWidth - 216), top: Math.min(menu.y, window.innerHeight - 110) }}
          className="fixed z-[200] w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <p className="truncate px-2.5 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{menu.titulo}</p>
          {(() => {
            const idFav = menu.tipo === 'bd' ? menu.id.replace(/^bd:/, '') : menu.id;
            const es = favoritos.some(f => f.tipo === menu.tipo && f.id === idFav);
            return (
              <button type="button" role="menuitem" ref={el => el?.focus({ preventScroll: true })} onClick={() => alternarFav(menu)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                <Star className={cn('h-4 w-4', es ? 'fill-amber-400 text-amber-500' : 'text-slate-400')} /> {es ? tr('Quitar de favoritos') : tr('Añadir a favoritos')}
              </button>
            );
          })()}
          {menu.tipo !== 'bd' && (
            <button type="button" role="menuitem" onClick={() => borrar(menu)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none">
              <Trash2 className="h-4 w-4" /> {tr('Borrar')}
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
