import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, History, MessageSquarePlus } from 'lucide-react';
import { cn } from '../../utils/cn';
import PanelComentarios, { type Ancla, type Hilo } from './PanelComentarios';
import PanelVersiones from './PanelVersiones';

// ============================================================================
// COMENTARIOS E HISTORIAL, SOBRE CUALQUIER PÁGINA (2026-10-06, carril acceso)
// ============================================================================
// Una columnita de botones al borde derecho —Comentarios (con su número) e
// Historial (para quien edita)— y lo que hace falta para comentar un trozo:
//
//   · Al seleccionar texto dentro de un bloque aparece «Comentar» junto a la
//     selección. El ancla es el bloque (`data-bloque` en el editor, `b-<id>`
//     en la lectura), el trozo, y unas palabras de alrededor para volver a
//     encontrarlo si se repite.
//   · Los trozos comentados se resaltan con la API de resaltado de CSS
//     (`CSS.highlights`), SIN tocar el DOM: el editor es `contentEditable` y
//     meterle `<mark>` sería meterle contenido. Donde la API no existe, no se
//     resalta, y el panel sigue funcionando igual.
//   · Pulsar un trozo resaltado abre su hilo.
//
// Se monta con una línea en cualquier pantalla que enseñe una página: el
// editor y la lectura de los sitios.

const RAIZ_BLOQUE = '[data-bloque],[id^="b-"]';
const idDeBloque = (el: Element | null): string | null => {
  if (!el) return null;
  const d = (el as HTMLElement).dataset?.bloque;
  if (d) return d;
  const id = (el as HTMLElement).id || '';
  return id.startsWith('b-') ? id.slice(2) : null;
};
const elementoDeBloque = (id: string) =>
  document.querySelector<HTMLElement>(`[data-bloque="${CSS.escape(id)}"]`) || document.getElementById(`b-${id}`);

/** El rango del trozo dentro del bloque, usando el contexto si se repite. */
function rangoDe(a: Ancla): Range | null {
  const el = elementoDeBloque(a.bloque);
  if (!el || !a.texto) return null;
  const nodos: Text[] = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let total = '';
  const inicio: number[] = [];
  while (w.nextNode()) { const t = w.currentNode as Text; inicio.push(total.length); nodos.push(t); total += t.data; }
  let pos = -1;
  const conContexto = (a.antes || '') + a.texto;
  const k = a.antes ? total.indexOf(conContexto) : -1;
  pos = k >= 0 ? k + (a.antes || '').length : total.indexOf(a.texto);
  if (pos < 0) return null;
  const fin = pos + a.texto.length;
  const donde = (off: number) => {
    for (let i = nodos.length - 1; i >= 0; i--) if (inicio[i] <= off) return { nodo: nodos[i], off: Math.min(off - inicio[i], nodos[i].data.length) };
    return null;
  };
  const d1 = donde(pos), d2 = donde(fin);
  if (!d1 || !d2) return null;
  const r = document.createRange();
  r.setStart(d1.nodo, d1.off); r.setEnd(d2.nodo, d2.off);
  return r;
}

export default function HerramientasPagina({ paginaId, raiz = 'main' }: {
  paginaId: string;
  /** Dónde se puede seleccionar para comentar. */
  raiz?: string;
}) {
  const [poder, setPoder] = useState<{ ver: boolean; comentar: boolean; editar: boolean } | null>(null);
  const [panel, setPanel] = useState<'comentarios' | 'historial' | null>(null);
  const [borrador, setBorrador] = useState<Ancla | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [hilos, setHilos] = useState<Hilo[]>([]);
  const [boton, setBoton] = useState<{ x: number; y: number; ancla: Ancla } | null>(null);
  const [actual, setActual] = useState<{ titulo: string; bloques: any[] } | null>(null);
  const rangos = useRef<{ id: string; r: Range }[]>([]);

  // Qué puede hacer aquí: el listado de comentarios lo dice (403 = nada).
  useEffect(() => {
    fetch(`/api/comentarios/pagina/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(async r => {
        if (!r.ok) { setPoder(null); return; }
        const j = await r.json();
        setHilos(j.hilos || []);
        setPoder({ ver: true, comentar: !!j.puedo?.comentar, editar: !!j.puedo?.resolver });
      }).catch(() => setPoder(null));
  }, [paginaId]);

  // ── RESALTAR LOS TROZOS COMENTADOS ─────────────────────────────────────────
  const resaltar = useCallback(() => {
    const api = (CSS as any).highlights;
    rangos.current = [];
    for (const h of hilos) {
      if (!h.ancla || h.resuelto_en || h.borrado_en && !h.respuestas.length) continue;
      const r = rangoDe(h.ancla);
      if (r) rangos.current.push({ id: h.id, r });
    }
    if (!api || typeof (window as any).Highlight !== 'function') return;
    api.set('comentario-pagina', new (window as any).Highlight(...rangos.current.map(x => x.r)));
  }, [hilos]);
  useEffect(() => {
    resaltar();
    // El editor repinta al escribir: se vuelve a calcular de vez en cuando.
    const t = setInterval(resaltar, 4000);
    return () => { clearInterval(t); (CSS as any).highlights?.delete('comentario-pagina'); };
  }, [resaltar]);

  // ── SELECCIONAR PARA COMENTAR ──────────────────────────────────────────────
  useEffect(() => {
    if (!poder?.comentar) return;
    const mirar = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setBoton(null); return; }
      const texto = sel.toString().trim();
      const r = sel.getRangeAt(0);
      const contenedor = document.querySelector(raiz);
      const nodo = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer as Element : r.commonAncestorContainer.parentElement;
      const bloque = nodo?.closest(RAIZ_BLOQUE) || null;
      const id = idDeBloque(bloque);
      if (!texto || texto.length > 500 || !id || !bloque || (contenedor && !contenedor.contains(bloque))) { setBoton(null); return; }
      const todo = bloque.textContent || '';
      const pre = document.createRange();
      pre.selectNodeContents(bloque); pre.setEnd(r.startContainer, r.startOffset);
      const off = pre.toString().length;
      const caja = r.getBoundingClientRect();
      setBoton({
        x: Math.min(caja.right + 6, window.innerWidth - 130), y: Math.max(caja.top - 40, 8),
        ancla: { bloque: id, texto: sel.toString().slice(0, 500), antes: todo.slice(Math.max(0, off - 40), off), despues: todo.slice(off + sel.toString().length, off + sel.toString().length + 40) },
      });
    };
    const alSoltar = () => setTimeout(mirar, 10);
    document.addEventListener('mouseup', alSoltar);
    document.addEventListener('keyup', alSoltar);
    return () => { document.removeEventListener('mouseup', alSoltar); document.removeEventListener('keyup', alSoltar); };
  }, [poder?.comentar, raiz]);

  // ── PULSAR UN TROZO COMENTADO ABRE SU HILO ─────────────────────────────────
  useEffect(() => {
    const clic = (e: MouseEvent) => {
      if (!rangos.current.length || window.getSelection()?.toString()) return;
      const doc = document as any;
      const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
      const nodo = pos ? pos.offsetNode : doc.caretRangeFromPoint?.(e.clientX, e.clientY)?.startContainer;
      const off = pos ? pos.offset : doc.caretRangeFromPoint?.(e.clientX, e.clientY)?.startOffset;
      if (!nodo) return;
      const x = rangos.current.find(({ r }) => { try { return r.isPointInRange(nodo, off); } catch { return false; } });
      if (x) { setFoco(x.id); setBorrador(null); setPanel('comentarios'); }
    };
    document.addEventListener('click', clic);
    return () => document.removeEventListener('click', clic);
  }, []);

  const irA = (a: Ancla) => {
    const el = elementoDeBloque(a.bloque);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const r = rangoDe(a);
    if (r) { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
  };
  const abrirHistorial = async () => {
    const r = await fetch(`/api/windows/${encodeURIComponent(paginaId)}`, { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    setActual({ titulo: j.title || 'Sin título', bloques: j.config?.bloques || [] });
    setPanel('historial');
  };

  const abiertos = hilos.filter(h => !h.resuelto_en).length;
  // Quien sólo lee y no hay nada que leer: nada que enseñar.
  if (!poder || (!poder.comentar && !hilos.length)) return null;

  return (
    <>
      <style>{`::highlight(comentario-pagina){background-color:rgba(250,204,21,.35);text-decoration:underline;text-decoration-color:rgba(217,119,6,.6)}`}</style>
      {boton && !panel && (
        <button onMouseDown={e => e.preventDefault()} onClick={() => { setBorrador(boton.ancla); setFoco(null); setPanel('comentarios'); setBoton(null); }}
          style={{ left: boton.x, top: boton.y }}
          className="fixed z-[9992] flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white shadow-lg">
          <MessageSquarePlus className="h-4 w-4" /> Comentar
        </button>
      )}
      <div className="fixed right-3 top-1/2 z-[60] flex -translate-y-1/2 flex-col gap-1.5 print:hidden">
        <button onClick={() => { setBorrador(null); setFoco(null); setPanel(p => (p === 'comentarios' ? null : 'comentarios')); }}
          title="Comentarios" aria-label={`Comentarios${abiertos ? `: ${abiertos} abiertos` : ''}`}
          className={cn('relative grid h-11 w-11 place-items-center rounded-full border bg-white shadow-md transition-colors',
            panel === 'comentarios' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500 hover:text-slate-900')}>
          <MessageSquare className="h-4 w-4" />
          {abiertos > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">{abiertos}</span>}
        </button>
        {poder.editar && (
          <button onClick={abrirHistorial} title="Historial de versiones" aria-label="Historial de versiones"
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-slate-900">
            <History className="h-4 w-4" />
          </button>
        )}
      </div>
      {panel === 'comentarios' && (
        <PanelComentarios paginaId={paginaId} borrador={borrador} foco={foco} onCerrar={() => setPanel(null)} onCambio={setHilos} onIrA={irA} />
      )}
      {panel === 'historial' && actual && (
        <PanelVersiones paginaId={paginaId} bloquesActuales={actual.bloques} tituloActual={actual.titulo} onCerrar={() => setPanel(null)} />
      )}
    </>
  );
}
