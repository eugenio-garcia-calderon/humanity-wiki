import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Copy, Trash2, Type, Square, Circle as CircleIcon,
  Image as ImageIcon, Play, Download, Globe, Lock, Loader2, Bold,
  AlignLeft, AlignCenter, ChevronLeft, ChevronRight, MonitorPlay,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

// ============================================================================
// PRESENTACIONES (2026-08-08, petición del usuario, rediseñada sobre la
// marcha por él mismo): NO el clásico panel de miniaturas — un LIENZO con
// FRAMES HORIZONTALES, todas las diapositivas en fila como en Figma/Miro.
// Se edita directamente dentro de cada frame (arrastrar, redimensionar,
// doble clic para el texto) y al exportar cada frame es una página: .pptx
// real con pptxgenjs (import() solo cuando alguien exporta).
//
// Cada frame es un lienzo lógico de 960×540 (16:9); config.diapositivas
// guarda sus elementos (texto, imagen, forma) con posición y tamaño.

const ANCHO = 960;
const ALTO = 540;

interface Elemento {
  id: string;
  tipo: 'texto' | 'imagen' | 'forma';
  x: number; y: number; w: number; h: number;
  texto?: string; tamano?: number; negrita?: boolean; color?: string;
  alineacion?: 'left' | 'center';
  url?: string;
  forma?: 'rect' | 'circulo'; relleno?: string;
}
interface Diapositiva { id: string; fondo?: string; elementos: Elemento[] }

const nuevoId = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export default function Presentacion() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [diapositivas, setDiapositivas] = useState<Diapositiva[]>([]);
  const [indice, setIndice] = useState(0);             // frame activo (aro esmeralda)
  const [elementoSel, setElementoSel] = useState<string | null>(null);
  const [editandoTexto, setEditandoTexto] = useState<string | null>(null);
  const [puedoEditar, setPuedoEditar] = useState(false);
  const [publico, setPublico] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<'sí' | 'pendiente' | 'guardando'>('sí');
  const [presentando, setPresentando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [escala, setEscala] = useState(0.55);

  const zonaRef = useRef<HTMLDivElement>(null);
  const diapposRef = useRef<Diapositiva[]>([]);
  const tituloRef = useRef('');
  const timer = useRef<any>(null);
  useEffect(() => { diapposRef.current = diapositivas; }, [diapositivas]);
  useEffect(() => { tituloRef.current = titulo; }, [titulo]);

  // Los frames se escalan para caber a lo alto; a lo ancho se hace scroll.
  useEffect(() => {
    const medir = () => {
      const el = zonaRef.current;
      if (!el) return;
      setEscala(Math.min(0.8, Math.max(0.3, (el.clientHeight - 90) / ALTO)));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [cargando]);

  // ---- Carga y guardado -----------------------------------------------------
  useEffect(() => {
    if (!id) return;
    fetch(`/api/windows/${id}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se ha podido cargar.');
        if (j.kind !== 'presentacion') throw new Error('Esto no es una presentación.');
        setTitulo(j.title || '');
        setPublico(!!j.publico);
        setPuedoEditar(!!j.puedo_editar);
        setDiapositivas(j.config?.diapositivas?.length ? j.config.diapositivas : [{ id: nuevoId('D'), elementos: [] }]);
      })
      .catch(e => setError(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  const guardarAhora = useCallback(async () => {
    if (!id) return;
    setGuardado('guardando');
    const r = await fetch(`/api/windows/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tituloRef.current || 'Presentación sin título', config: { diapositivas: diapposRef.current } }),
    }).catch(() => null);
    setGuardado(r?.ok ? 'sí' : 'pendiente');
  }, [id]);

  const programar = useCallback(() => {
    setGuardado('pendiente');
    clearTimeout(timer.current);
    timer.current = setTimeout(guardarAhora, 1200);
  }, [guardarAhora]);

  // ---- Operaciones (siempre con el índice del frame explícito) --------------
  const cambiarElemento = (fi: number, eid: string, patch: Partial<Elemento>) => {
    setDiapositivas(ds => ds.map((d, i) => i !== fi ? d : {
      ...d, elementos: d.elementos.map(e => e.id === eid ? { ...e, ...patch } : e),
    }));
    programar();
  };

  const anadirElemento = (e: Elemento) => {
    setDiapositivas(ds => ds.map((d, i) => i !== indice ? d : { ...d, elementos: [...d.elementos, e] }));
    setElementoSel(e.id);
    programar();
  };

  const borrarElemento = (eid: string) => {
    setDiapositivas(ds => ds.map(d => ({ ...d, elementos: d.elementos.filter(x => x.id !== eid) })));
    setElementoSel(null);
    programar();
  };

  const anadirFrame = (tras: number, duplicar = false) => {
    const base = diapositivas[tras];
    const nueva: Diapositiva = duplicar && base
      ? { id: nuevoId('D'), fondo: base.fondo, elementos: base.elementos.map(e => ({ ...e, id: nuevoId('E') })) }
      : { id: nuevoId('D'), elementos: [] };
    setDiapositivas(ds => { const c = [...ds]; c.splice(tras + 1, 0, nueva); return c; });
    setIndice(tras + 1);
    programar();
  };

  const borrarFrame = (fi: number) => {
    if (diapositivas.length <= 1) return;
    setDiapositivas(ds => ds.filter((_, i) => i !== fi));
    setIndice(i => Math.max(0, i > fi ? i - 1 : Math.min(i, diapositivas.length - 2)));
    programar();
  };

  const subirImagen = async (archivo: File) => {
    const r = await fetch(`/api/uploads?type=${encodeURIComponent(archivo.type)}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: await archivo.arrayBuffer(),
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    anadirElemento({ id: nuevoId('E'), tipo: 'imagen', x: 280, y: 120, w: 400, h: 300, url: j.url });
  };

  // ---- Arrastrar y redimensionar dentro de su frame -------------------------
  const gesto = useRef<{ fi: number; eid: string; modo: 'mover' | 'tamano'; x0: number; y0: number; inicial: Elemento } | null>(null);

  const empezarGesto = (e: React.MouseEvent, fi: number, el: Elemento, modo: 'mover' | 'tamano') => {
    if (!puedoEditar || editandoTexto === el.id) return;
    e.preventDefault();
    e.stopPropagation();
    setIndice(fi);
    setElementoSel(el.id);
    gesto.current = { fi, eid: el.id, modo, x0: e.clientX, y0: e.clientY, inicial: { ...el } };
    const mover = (ev: MouseEvent) => {
      const g = gesto.current;
      if (!g) return;
      const dx = (ev.clientX - g.x0) / escala;
      const dy = (ev.clientY - g.y0) / escala;
      if (g.modo === 'mover') {
        cambiarElemento(g.fi, g.eid, {
          x: Math.round(Math.max(-g.inicial.w + 20, Math.min(ANCHO - 20, g.inicial.x + dx))),
          y: Math.round(Math.max(-g.inicial.h + 20, Math.min(ALTO - 20, g.inicial.y + dy))),
        });
      } else {
        cambiarElemento(g.fi, g.eid, {
          w: Math.round(Math.max(40, g.inicial.w + dx)),
          h: Math.round(Math.max(28, g.inicial.h + dy)),
        });
      }
    };
    const soltar = () => {
      gesto.current = null;
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  };

  // Suprimir borra el elemento seleccionado; en modo presentar, flechas y Esc.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (presentando) {
        if (e.key === 'Escape') setPresentando(false);
        else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') setIndice(i => Math.min(diapposRef.current.length - 1, i + 1));
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIndice(i => Math.max(0, i - 1));
        return;
      }
      const activo = document.activeElement as HTMLElement | null;
      if (activo && (activo.isContentEditable || activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
      if ((e.key === 'Backspace' || e.key === 'Delete') && elementoSel) { e.preventDefault(); borrarElemento(elementoSel); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  // ---- Exportar: cada FRAME es una página del .pptx -------------------------
  const exportarPptx = async () => {
    setExportando(true);
    try {
      const { default: PptxGenJS } = await import('pptxgenjs');
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: 'HW', width: 10, height: 5.625 });
      pptx.layout = 'HW';
      const fx = 10 / ANCHO;
      const fy = 5.625 / ALTO;
      for (const d of diapposRef.current) {
        const s = pptx.addSlide();
        if (d.fondo) s.background = { color: d.fondo.replace('#', '') };
        for (const el of d.elementos) {
          const caja = { x: el.x * fx, y: el.y * fy, w: el.w * fx, h: el.h * fy };
          if (el.tipo === 'texto') {
            s.addText(el.texto || '', {
              ...caja,
              fontSize: Math.round((el.tamano || 20) * 0.75),
              bold: !!el.negrita,
              color: (el.color || '#0f172a').replace('#', ''),
              align: el.alineacion === 'center' ? 'center' : 'left',
              valign: 'top',
            });
          } else if (el.tipo === 'imagen' && el.url) {
            s.addImage({ path: el.url.startsWith('http') ? el.url : `${window.location.origin}${el.url}`, ...caja });
          } else if (el.tipo === 'forma') {
            s.addShape(el.forma === 'circulo' ? 'ellipse' : 'rect', {
              ...caja, fill: { color: (el.relleno || '#10b981').replace('#', '') }, line: { type: 'none' },
            } as any);
          }
        }
      }
      await pptx.writeFile({ fileName: `${titulo.replace(/[^a-zA-Z0-9áéíóúñ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'presentacion'}.pptx` });
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setExportando(false);
    }
  };

  const cambiarVisibilidad = async () => {
    if (!id) return;
    const r = await fetch(`/api/publicaciones/ventana/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publico: !publico }),
    });
    if (r.ok) setPublico(p => !p);
  };

  // ---- Render de un elemento ------------------------------------------------
  const renderElemento = (el: Elemento, fi: number, interactivo: boolean, factor = 1) => {
    const estilo: React.CSSProperties = {
      position: 'absolute',
      left: el.x * factor, top: el.y * factor,
      width: el.w * factor, height: el.h * factor,
    };
    const contenido = el.tipo === 'texto' ? (
      <div
        contentEditable={interactivo && editandoTexto === el.id}
        suppressContentEditableWarning
        onDoubleClick={interactivo ? () => { setEditandoTexto(el.id); setIndice(fi); } : undefined}
        onBlur={interactivo && editandoTexto === el.id ? e => {
          cambiarElemento(fi, el.id, { texto: e.currentTarget.innerText });
          setEditandoTexto(null);
        } : undefined}
        style={{
          fontSize: (el.tamano || 20) * factor,
          fontWeight: el.negrita ? 800 : 400,
          color: el.color || '#0f172a',
          textAlign: el.alineacion === 'center' ? 'center' : 'left',
          lineHeight: 1.25,
          whiteSpace: 'pre-wrap',
          width: '100%', height: '100%',
          outline: 'none',
          cursor: interactivo ? (editandoTexto === el.id ? 'text' : 'move') : undefined,
          overflow: 'hidden',
        }}
      >
        {el.texto}
      </div>
    ) : el.tipo === 'imagen' ? (
      <img src={el.url} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, pointerEvents: 'none' }} />
    ) : (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: el.relleno || '#10b981',
        borderRadius: el.forma === 'circulo' ? '9999px' : 8,
      }} />
    );

    if (!interactivo) return <div key={el.id} style={estilo}>{contenido}</div>;
    const sel = elementoSel === el.id;
    return (
      <div key={el.id} style={estilo}
        onMouseDown={e => empezarGesto(e, fi, el, 'mover')}
        className={cn(sel && 'ring-2 ring-emerald-500')}
      >
        {contenido}
        {sel && (
          <span
            onMouseDown={e => empezarGesto(e, fi, el, 'tamano')}
            className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full cursor-nwse-resize"
          />
        )}
      </div>
    );
  };

  // ---- Vistas ---------------------------------------------------------------
  if (cargando) return <p className="text-sm text-slate-400 text-center py-24">Abriendo la presentación…</p>;
  if (error && !diapositivas.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MonitorPlay className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{error}</p>
          <Link to="/explorar" className="inline-flex items-center gap-1.5 mt-4 text-xs font-black text-emerald-700 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Explorar
          </Link>
        </div>
      </div>
    );
  }

  // Modo PRESENTAR: pantalla completa, frame a frame.
  if (presentando) {
    const fEscala = Math.min(window.innerWidth / ANCHO, window.innerHeight / ALTO);
    const d = diapositivas[Math.min(indice, diapositivas.length - 1)];
    return (
      <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center"
        onClick={() => setIndice(i => Math.min(diapositivas.length - 1, i + 1))}>
        <div className="relative overflow-hidden" style={{ width: ANCHO * fEscala, height: ALTO * fEscala, backgroundColor: d?.fondo || '#ffffff' }}>
          <div style={{ transform: `scale(${fEscala})`, transformOrigin: 'top left', width: ANCHO, height: ALTO, position: 'relative' }}>
            {d?.elementos.map(el => renderElemento(el, indice, false))}
          </div>
        </div>
        <div className="absolute bottom-4 right-5 flex items-center gap-2 text-white/60 text-xs font-bold">
          <button onClick={e => { e.stopPropagation(); setIndice(i => Math.max(0, i - 1)); }} className="p-1.5 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
          {Math.min(indice, diapositivas.length - 1) + 1} / {diapositivas.length}
          <button onClick={e => { e.stopPropagation(); setIndice(i => Math.min(diapositivas.length - 1, i + 1)); }} className="p-1.5 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={e => { e.stopPropagation(); setPresentando(false); }} className="ml-3 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg">Salir (Esc)</button>
        </div>
      </div>
    );
  }

  const elSel = diapositivas[indice]?.elementos.find(e => e.id === elementoSel)
    || diapositivas.flatMap(d => d.elementos).find(e => e.id === elementoSel);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-100">
      {/* Cabecera */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200">
        <Link to={user ? '/mis-publicaciones' : '/explorar'} className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-3.5 h-3.5" /> Publicaciones
        </Link>
        {puedoEditar ? (
          <input value={titulo} onChange={e => { setTitulo(e.target.value); programar(); }}
            className="text-sm font-black text-slate-900 outline-none bg-transparent flex-1 min-w-0 max-w-md px-2" />
        ) : (
          <p className="text-sm font-black text-slate-900 px-2 truncate">{titulo}</p>
        )}
        <span className="ml-auto" />
        {puedoEditar && (
          <>
            <span className={cn('text-[11px] font-bold', guardado === 'sí' ? 'text-slate-300' : 'text-amber-600')}>
              {guardado === 'sí' ? 'Guardado' : guardado === 'guardando' ? 'Guardando…' : 'Sin guardar'}
            </span>
            <button onClick={cambiarVisibilidad}
              className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                publico ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500')}>
              {publico ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {publico ? 'Pública' : 'Privada'}
            </button>
          </>
        )}
        <button onClick={exportarPptx} disabled={exportando}
          title="Cada frame se exporta como una página"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-black text-slate-700 transition-colors">
          {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} .pptx
        </button>
        <button onClick={() => { setIndice(0); setPresentando(true); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors">
          <Play className="w-3.5 h-3.5" /> Presentar
        </button>
      </div>

      {/* Herramientas: añaden al frame activo (el del aro esmeralda) */}
      {puedoEditar && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-200 flex-wrap">
          <button onClick={() => anadirElemento({ id: nuevoId('E'), tipo: 'texto', x: 120, y: 200, w: 400, h: 60, texto: 'Texto nuevo', tamano: 24, color: '#0f172a', alineacion: 'left' })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            <Type className="w-3.5 h-3.5" /> Texto
          </button>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
            <ImageIcon className="w-3.5 h-3.5" /> Imagen
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && subirImagen(e.target.files[0])} />
          </label>
          <button onClick={() => anadirElemento({ id: nuevoId('E'), tipo: 'forma', forma: 'rect', x: 330, y: 190, w: 300, h: 160, relleno: '#10b981' })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            <Square className="w-3.5 h-3.5" /> Rectángulo
          </button>
          <button onClick={() => anadirElemento({ id: nuevoId('E'), tipo: 'forma', forma: 'circulo', x: 400, y: 190, w: 160, h: 160, relleno: '#6366f1' })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            <CircleIcon className="w-3.5 h-3.5" /> Círculo
          </button>

          {elSel && (
            <>
              <span className="w-px h-5 bg-slate-200 mx-1" />
              {elSel.tipo === 'texto' && (
                <>
                  <button onClick={() => cambiarElemento(indice, elSel.id, { negrita: !elSel.negrita })}
                    className={cn('p-1.5 rounded-lg transition-colors', elSel.negrita ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => cambiarElemento(indice, elSel.id, { alineacion: 'left' })}
                    className={cn('p-1.5 rounded-lg transition-colors', elSel.alineacion !== 'center' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => cambiarElemento(indice, elSel.id, { alineacion: 'center' })}
                    className={cn('p-1.5 rounded-lg transition-colors', elSel.alineacion === 'center' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    Tamaño
                    <input type="range" min={12} max={72} value={elSel.tamano || 20}
                      onChange={e => cambiarElemento(indice, elSel.id, { tamano: Number(e.target.value) })} className="w-20 accent-emerald-600" />
                  </label>
                  <input type="color" value={elSel.color || '#0f172a'}
                    onChange={e => cambiarElemento(indice, elSel.id, { color: e.target.value })} className="w-7 h-7 rounded cursor-pointer" />
                </>
              )}
              {elSel.tipo === 'forma' && (
                <input type="color" value={elSel.relleno || '#10b981'}
                  onChange={e => cambiarElemento(indice, elSel.id, { relleno: e.target.value })} className="w-7 h-7 rounded cursor-pointer" />
              )}
              <button onClick={() => borrarElemento(elSel.id)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar elemento (Supr)">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {error && <p className="text-[11px] font-bold text-rose-600 ml-auto">{error}</p>}
        </div>
      )}

      {/* EL LIENZO DE FRAMES: todas las diapositivas en fila horizontal */}
      <div ref={zonaRef} className="flex-1 overflow-x-auto overflow-y-hidden"
        onMouseDown={() => { setElementoSel(null); setEditandoTexto(null); }}>
        <div className="h-full flex items-center gap-8 px-8 w-max">
          {diapositivas.map((d, fi) => (
            <div key={d.id} className="shrink-0" onMouseDown={e => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                <span className={cn('text-[10px] font-black uppercase tracking-wider',
                  fi === indice ? 'text-emerald-600' : 'text-slate-400')}>
                  Frame {fi + 1}
                </span>
                {puedoEditar && (
                  <span className="flex items-center gap-0.5 ml-auto">
                    <button onClick={() => anadirFrame(fi, true)} title="Duplicar frame"
                      className="p-1 text-slate-300 hover:text-slate-600 rounded transition-colors"><Copy className="w-3 h-3" /></button>
                    <button onClick={() => borrarFrame(fi)} disabled={diapositivas.length <= 1} title="Eliminar frame"
                      className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors disabled:opacity-30"><Trash2 className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
              <div
                onMouseDown={() => setIndice(fi)}
                className={cn('relative bg-white shadow-lg rounded-sm overflow-hidden transition-shadow',
                  fi === indice && puedoEditar && 'ring-2 ring-emerald-500 shadow-emerald-100')}
                style={{ width: ANCHO * escala, height: ALTO * escala, backgroundColor: d.fondo || '#ffffff' }}
              >
                <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: ANCHO, height: ALTO, position: 'relative' }}>
                  {d.elementos.map(el => renderElemento(el, fi, puedoEditar))}
                </div>
              </div>
            </div>
          ))}
          {puedoEditar && (
            <button
              onClick={() => anadirFrame(diapositivas.length - 1)}
              title="Añadir un frame"
              className="shrink-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-600 text-slate-400 rounded-xl transition-colors"
              style={{ width: 180, height: ALTO * escala }}
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-black">Frame</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
