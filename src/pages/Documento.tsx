import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Code2, Image as ImageIcon, Table2, Trash2, Globe, Lock,
  Download, Sparkles, Loader2, ArrowLeft, FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  type Bloque, type TipoBloque, nuevoIdBloque, markdownABloques, bloquesAMarkdown,
} from '../utils/bloques';
import { cn } from '../utils/cn';

// ============================================================================
// DOCUMENTO estilo Notion (2026-08-08, petición del usuario) — Fase 1
// ============================================================================
// Una página por documento (/documentos/:id). Tres modos:
//  - GENERÁNDOSE (/documentos/nuevo?prompt=…): la IA lo escribe en directo y
//    se ve aparecer, como pidió el usuario («según lo va generando aparece»).
//  - LECTURA: cualquiera con acceso lo lee.
//  - EDICIÓN: el autor (o un admin) edita en el sitio, con un «+» por línea
//    para insertar bloques, como en Notion.
//
// El texto vivo de cada bloque vive en el DOM (contentEditable) y en un ref,
// NO en estado de React: re-renderizar un contentEditable en cada tecla
// rompería el cursor. El estado solo guarda la ESTRUCTURA (qué bloques hay y
// de qué tipo); el autoguardado serializa estructura + refs.

const TIPOS_MENU: { tipo: TipoBloque; label: string; icon: any }[] = [
  { tipo: 'parrafo', label: 'Texto', icon: Type },
  { tipo: 'titulo1', label: 'Título 1', icon: Heading1 },
  { tipo: 'titulo2', label: 'Título 2', icon: Heading2 },
  { tipo: 'titulo3', label: 'Título 3', icon: Heading3 },
  { tipo: 'lista', label: 'Lista', icon: List },
  { tipo: 'numerada', label: 'Lista numerada', icon: ListOrdered },
  { tipo: 'tarea', label: 'Casilla', icon: CheckSquare },
  { tipo: 'cita', label: 'Cita', icon: Quote },
  { tipo: 'separador', label: 'Separador', icon: Minus },
  { tipo: 'codigo', label: 'Código', icon: Code2 },
  { tipo: 'imagen', label: 'Imagen', icon: ImageIcon },
  { tipo: 'tabla', label: 'Tabla', icon: Table2 },
];

/** Marcado inline de markdown → nodos React (negrita, cursiva, código, enlaces). */
function Inline({ texto }: { texto: string }) {
  const partes = useMemo(() => {
    const out: React.ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let ultimo = 0; let m: RegExpExecArray | null; let k = 0;
    while ((m = re.exec(texto))) {
      if (m.index > ultimo) out.push(texto.slice(ultimo, m.index));
      const s = m[0];
      if (s.startsWith('**')) out.push(<strong key={k++}>{s.slice(2, -2)}</strong>);
      else if (s.startsWith('`')) out.push(<code key={k++} className="px-1 py-0.5 bg-slate-100 rounded text-[0.9em] font-mono">{s.slice(1, -1)}</code>);
      else if (s.startsWith('*')) out.push(<em key={k++}>{s.slice(1, -1)}</em>);
      else {
        const link = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) out.push(<a key={k++} href={link[2]} target="_blank" rel="noreferrer" className="text-emerald-700 underline decoration-emerald-300 hover:decoration-emerald-600">{link[1]}</a>);
        else out.push(s);
      }
      ultimo = m.index + s.length;
    }
    if (ultimo < texto.length) out.push(texto.slice(ultimo));
    return out;
  }, [texto]);
  return <>{partes}</>;
}

const CLASES_TEXTO: Partial<Record<TipoBloque, string>> = {
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

export default function Documento() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const esNuevo = id === 'nuevo';
  const prompt = searchParams.get('prompt') || '';
  const conversationId = searchParams.get('conv') || undefined;

  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState<string | null>(null);
  const [publico, setPublico] = useState(false);
  const [puedoEditar, setPuedoEditar] = useState(false);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(esNuevo);
  const [guardado, setGuardado] = useState<'sí' | 'pendiente' | 'guardando'>('sí');
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null); // id del bloque cuyo + está abierto
  const [focoId, setFocoId] = useState<string | null>(null);
  // Edición estilo Typora: solo el bloque ACTIVO enseña el marcado markdown
  // en crudo (**negrita**); los demás se ven ya formateados aunque estés en
  // modo edición. Al pulsar uno, pasa a activo y se puede teclear.
  const [bloqueActivo, setBloqueActivo] = useState<string | null>(null);

  // Texto vivo de cada bloque (y celdas de tabla), fuera del estado de React.
  const textosRef = useRef<Record<string, string>>({});
  const filasRef = useRef<Record<string, string[][]>>({});
  const docId = useRef<string | null>(esNuevo ? null : id || null);
  const timerGuardado = useRef<any>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // Carga normal (documento existente)
  // --------------------------------------------------------------------------
  const cargar = useCallback((winId: string) => {
    fetch(`/api/windows/${winId}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se ha podido cargar.');
        setTitulo(j.title || '');
        setAutor(j.autor_nombre || null);
        setPublico(!!j.publico);
        setPuedoEditar(!!j.puedo_editar);
        let bs: Bloque[] = j.config?.bloques || [];
        // Documentos guardados antes del arreglo del título duplicado: si el
        // primer bloque es un H1 idéntico al título, se omite (y el próximo
        // autoguardado lo retira del todo).
        if (bs[0]?.tipo === 'titulo1' && bs[0].texto?.trim() === (j.title || '').trim()) bs = bs.slice(1);
        for (const b of bs) {
          if (b.texto !== undefined) textosRef.current[b.id] = b.texto;
          if (b.filas) filasRef.current[b.id] = b.filas;
        }
        setBloques(bs.length ? bs : [{ id: nuevoIdBloque(), tipo: 'parrafo', texto: '' }]);
      })
      .catch(e => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!esNuevo && id) { setCargando(true); cargar(id); }
  }, [esNuevo, id, cargar]);

  // --------------------------------------------------------------------------
  // Generación en directo (/documentos/nuevo?prompt=…)
  // --------------------------------------------------------------------------
  const yaGenerado = useRef(false);
  useEffect(() => {
    if (!esNuevo || !prompt || yaGenerado.current) return;
    yaGenerado.current = true;
    setCargando(false);
    let buffer = '';
    let ultimaPintada = 0;

    (async () => {
      try {
        const res = await fetch('/api/ai/documento', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, conversation_id: conversationId }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'No se ha podido generar el documento.');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let crudo = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          crudo += decoder.decode(value, { stream: true });
          const trozos = crudo.split('\n\n');
          crudo = trozos.pop() || '';
          for (const trozo of trozos) {
            const evento = (trozo.match(/^event: (\w+)/m) || [])[1];
            const dato = (trozo.match(/^data: (.*)$/m) || [])[1];
            if (!evento || !dato) continue;
            const j = JSON.parse(dato);
            if (evento === 'inicio') docId.current = j.id;
            else if (evento === 'delta') {
              buffer += j.t;
              // Repintar como mucho ~6 veces por segundo: parsear markdown en
              // cada token sería malgastar y parpadear.
              if (Date.now() - ultimaPintada > 160) {
                ultimaPintada = Date.now();
                setBloques(markdownABloques(buffer));
                finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }
            } else if (evento === 'fin') {
              setGenerando(false);
              navigate(`/documentos/${j.id}`, { replace: true });
              return;
            } else if (evento === 'error') {
              throw new Error(j.error);
            }
          }
        }
        // El servidor cerró sin `fin`: si al menos hay id, se abre lo guardado.
        if (docId.current) navigate(`/documentos/${docId.current}`, { replace: true });
      } catch (e: any) {
        setGenerando(false);
        setError(e.message);
      }
    })();
  }, [esNuevo, prompt, conversationId, navigate]);

  // --------------------------------------------------------------------------
  // Guardado (estructura del estado + textos vivos de los refs)
  // --------------------------------------------------------------------------
  const serializar = useCallback((): Bloque[] =>
    bloques.map(b => ({
      ...b,
      texto: b.texto !== undefined || textosRef.current[b.id] !== undefined
        ? (textosRef.current[b.id] ?? b.texto ?? '') : undefined,
      filas: b.tipo === 'tabla' ? (filasRef.current[b.id] ?? b.filas ?? [['', ''], ['', '']]) : undefined,
    })), [bloques]);

  const guardarAhora = useCallback(async (estructura?: Bloque[]) => {
    if (!docId.current || !puedoEditar) return;
    setGuardado('guardando');
    const bs = estructura ?? serializar();
    const r = await fetch(`/api/windows/${docId.current}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titulo || 'Documento sin título', config: { bloques: bs } }),
    }).catch(() => null);
    setGuardado(r?.ok ? 'sí' : 'pendiente');
  }, [puedoEditar, serializar, titulo]);

  const programarGuardado = useCallback(() => {
    setGuardado('pendiente');
    clearTimeout(timerGuardado.current);
    timerGuardado.current = setTimeout(() => guardarAhora(), 1200);
  }, [guardarAhora]);

  useEffect(() => () => clearTimeout(timerGuardado.current), []);

  // --------------------------------------------------------------------------
  // Operaciones de bloques
  // --------------------------------------------------------------------------
  const insertar = (tras: string | null, tipo: TipoBloque) => {
    const nuevo: Bloque = { id: nuevoIdBloque(), tipo };
    if (tipo === 'tabla') filasRef.current[nuevo.id] = [['', ''], ['', '']];
    if (tipo !== 'separador' && tipo !== 'imagen' && tipo !== 'tabla') textosRef.current[nuevo.id] = '';
    setBloques(bs => {
      const i = tras ? bs.findIndex(b => b.id === tras) : -1;
      const copia = [...bs];
      copia.splice(i + 1, 0, nuevo);
      return copia;
    });
    setMenuAbierto(null);
    setBloqueActivo(nuevo.id);
    setFocoId(nuevo.id);
    programarGuardado();
  };

  const eliminar = (bid: string) => {
    setBloques(bs => {
      const i = bs.findIndex(b => b.id === bid);
      const copia = bs.filter(b => b.id !== bid);
      const anterior = copia[Math.max(0, i - 1)];
      if (anterior) { setFocoId(anterior.id); setBloqueActivo(anterior.id); }
      return copia.length ? copia : [{ id: nuevoIdBloque(), tipo: 'parrafo' }];
    });
    delete textosRef.current[bid];
    delete filasRef.current[bid];
    programarGuardado();
  };

  const alTeclear = (b: Bloque, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && b.tipo !== 'codigo') {
      e.preventDefault();
      const heredan: TipoBloque[] = ['lista', 'numerada', 'tarea'];
      const texto = (e.currentTarget.textContent || '').trim();
      // Enter en un ítem vacío de lista lo convierte en párrafo, como Notion.
      if (heredan.includes(b.tipo) && !texto) {
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo: 'parrafo' } : x));
        programarGuardado();
        return;
      }
      insertar(b.id, heredan.includes(b.tipo) ? b.tipo : 'parrafo');
    } else if (e.key === 'Backspace' && !(e.currentTarget.textContent || '')) {
      e.preventDefault();
      eliminar(b.id);
    }
  };

  // Enfocar el bloque recién creado/activado cuando ya está en el DOM, con
  // el cursor al final del texto.
  useEffect(() => {
    if (!focoId) return;
    const el = document.querySelector<HTMLElement>(`[data-bloque="${focoId}"]`);
    if (el) {
      el.focus();
      const rango = document.createRange();
      rango.selectNodeContents(el);
      rango.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(rango);
      setFocoId(null);
    }
  });

  const subirImagen = async (b: Bloque, archivo: File) => {
    const bytes = await archivo.arrayBuffer();
    const r = await fetch(`/api/uploads?type=${encodeURIComponent(archivo.type)}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error || 'No se ha podido subir la imagen.'); return; }
    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, url: j.url } : x));
    programarGuardado();
  };

  const descargarMarkdown = () => {
    const md = `# ${titulo}\n\n${bloquesAMarkdown(serializar().filter(b => b.tipo !== 'titulo1' || b.texto !== titulo))}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${titulo.replace(/[^a-zA-Z0-9áéíóúñ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'documento'}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const cambiarVisibilidad = async () => {
    if (!docId.current) return;
    const r = await fetch(`/api/publicaciones/ventana/${docId.current}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publico: !publico }),
    });
    if (r.ok) setPublico(p => !p);
  };

  // --------------------------------------------------------------------------
  // Render de un bloque
  // --------------------------------------------------------------------------
  const editable = puedoEditar && !generando;

  const renderBloque = (b: Bloque, indice: number) => {
    const texto = textosRef.current[b.id] ?? b.texto ?? '';

    const cuerpo = (() => {
      if (b.tipo === 'separador') return <hr className="border-slate-200 my-2" />;

      if (b.tipo === 'imagen') {
        return b.url ? (
          <figure>
            <img src={b.url} alt={b.pie || ''} className="rounded-xl max-w-full border border-slate-100" />
            {b.pie && <figcaption className="text-xs text-slate-400 mt-1">{b.pie}</figcaption>}
          </figure>
        ) : editable ? (
          <label className="flex items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 cursor-pointer hover:border-emerald-300 hover:text-emerald-600 transition-colors">
            <ImageIcon className="w-4 h-4" /> Elegir una imagen…
            <input type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && subirImagen(b, e.target.files[0])} />
          </label>
        ) : null;
      }

      if (b.tipo === 'tabla') {
        const filas = filasRef.current[b.id] ?? b.filas ?? [['', ''], ['', '']];
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {filas.map((fila, fi) => (
                  <tr key={fi}>
                    {fila.map((celda, ci) => (
                      <td key={ci}
                        className={cn('border border-slate-200 px-2.5 py-1.5',
                          fi === 0 ? 'bg-slate-50 font-bold text-slate-800' : 'text-slate-600')}
                        contentEditable={editable} suppressContentEditableWarning
                        onInput={e => {
                          const f = filasRef.current[b.id] ?? filas;
                          f[fi][ci] = e.currentTarget.textContent || '';
                          filasRef.current[b.id] = f;
                          programarGuardado();
                        }}
                      >{celda}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <div className="flex gap-1.5 mt-1">
                <button onClick={() => {
                  const f = filasRef.current[b.id] ?? filas;
                  filasRef.current[b.id] = [...f, f[0].map(() => '')];
                  setBloques(bs => [...bs]); programarGuardado();
                }} className="text-[10px] font-bold text-slate-400 hover:text-emerald-600">+ fila</button>
                <button onClick={() => {
                  const f = filasRef.current[b.id] ?? filas;
                  filasRef.current[b.id] = f.map(fila => [...fila, '']);
                  setBloques(bs => [...bs]); programarGuardado();
                }} className="text-[10px] font-bold text-slate-400 hover:text-emerald-600">+ columna</button>
              </div>
            )}
          </div>
        );
      }

      // Estilo Typora: SOLO el bloque activo enseña el marcado en crudo para
      // teclear; los demás se ven formateados, y un clic los activa.
      const esActivo = editable && bloqueActivo === b.id;
      const comun = esActivo ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        'data-bloque': b.id,
        onInput: (e: React.FormEvent<HTMLDivElement>) => {
          textosRef.current[b.id] = e.currentTarget.textContent || '';
          programarGuardado();
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => alTeclear(b, e),
        onBlur: () => setBloqueActivo(a => (a === b.id ? null : a)),
        className: cn(CLASES_TEXTO[b.tipo], 'outline-none bg-emerald-50/40 rounded px-1 -mx-1 min-h-[1.4em] whitespace-pre-wrap'),
      } : {
        onClick: editable ? () => { setBloqueActivo(b.id); setFocoId(b.id); } : undefined,
        className: cn(CLASES_TEXTO[b.tipo], 'px-1 -mx-1 min-h-[1.4em]', editable && 'cursor-text hover:bg-slate-50/80 rounded'),
      };

      const contenido = esActivo ? texto : <Inline texto={texto} />;

      if (b.tipo === 'cita') {
        return <blockquote className="border-l-[3px] border-emerald-300 pl-3"><div {...comun}>{contenido}</div></blockquote>;
      }
      if (b.tipo === 'codigo') {
        return <pre className="bg-slate-900 rounded-xl px-4 py-3 overflow-x-auto"><div {...comun}>{editable ? texto : texto}</div></pre>;
      }
      if (b.tipo === 'lista' || b.tipo === 'numerada') {
        // El número real se calcula contando los hermanos seguidos del mismo tipo.
        let n = 1;
        if (b.tipo === 'numerada') {
          for (let i = indice - 1; i >= 0 && bloques[i].tipo === 'numerada'; i--) n++;
        }
        return (
          <div className="flex gap-2">
            <span className="text-slate-400 select-none shrink-0 w-5 text-right leading-relaxed text-[15px]">
              {b.tipo === 'lista' ? '•' : `${n}.`}
            </span>
            <div {...comun} className={cn('flex-1 min-w-0', comun.className)}>{contenido}</div>
          </div>
        );
      }
      if (b.tipo === 'tarea') {
        return (
          <div className="flex gap-2 items-start">
            <input type="checkbox" checked={!!b.hecho} disabled={!editable}
              onChange={() => { setBloques(bs => bs.map(x => x.id === b.id ? { ...x, hecho: !x.hecho } : x)); programarGuardado(); }}
              className="mt-1.5 accent-emerald-600 shrink-0" />
            <div {...comun} className={cn('flex-1 min-w-0', comun.className, b.hecho && 'line-through text-slate-400')}>{contenido}</div>
          </div>
        );
      }
      return <div {...comun}>{contenido}</div>;
    })();

    return (
      <div key={b.id} className="group/bloque relative">
        {editable && (
          <div className="absolute -left-9 top-0.5 flex items-center opacity-0 group-hover/bloque:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setMenuAbierto(m => (m === b.id ? null : b.id)); }}
              title="Añadir un bloque debajo"
              className="p-1 text-slate-300 hover:text-emerald-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
        {cuerpo}
        {menuAbierto === b.id && (
          <div className="absolute left-0 top-full z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 grid grid-cols-2 gap-0.5 w-72"
            onClick={e => e.stopPropagation()}>
            {TIPOS_MENU.map(t => (
              <button key={t.tipo} onClick={() => insertar(b.id, t.tipo)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors">
                <t.icon className="w-3.5 h-3.5 text-slate-400" /> {t.label}
              </button>
            ))}
            <button onClick={() => { eliminar(b.id); setMenuAbierto(null); }}
              className="col-span-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 text-left transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar este bloque
            </button>
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!menuAbierto) return;
    const cerrar = () => setMenuAbierto(null);
    window.addEventListener('click', cerrar);
    return () => window.removeEventListener('click', cerrar);
  }, [menuAbierto]);

  if (cargando) return <p className="text-sm text-slate-400 text-center py-24">Abriendo el documento…</p>;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{error}</p>
          <Link to="/explorar" className="inline-flex items-center gap-1.5 mt-4 text-xs font-black text-emerald-700 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Explorar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 sm:px-12 pt-8 pb-32">

        {/* Cabecera: volver, estado de guardado, visibilidad, descargar */}
        <div className="flex items-center gap-2 mb-6 text-xs">
          <Link to={user ? '/mis-publicaciones' : '/explorar'} className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Publicaciones
          </Link>
          {generando && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-black ml-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> La IA está escribiendo…
            </span>
          )}
          <span className="ml-auto" />
          {puedoEditar && !generando && (
            <>
              <span className={cn('font-bold', guardado === 'sí' ? 'text-slate-300' : 'text-amber-600')}>
                {guardado === 'sí' ? 'Guardado' : guardado === 'guardando' ? 'Guardando…' : 'Cambios sin guardar'}
              </span>
              <button onClick={cambiarVisibilidad}
                className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border transition-colors',
                  publico ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500')}>
                {publico ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {publico ? 'Pública' : 'Privada'}
              </button>
            </>
          )}
          <button onClick={descargarMarkdown} title="Descargar como Markdown"
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Título del documento */}
        {editable ? (
          <input
            value={titulo}
            onChange={e => { setTitulo(e.target.value); programarGuardado(); }}
            placeholder="Título del documento"
            className="w-full text-4xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-300 mb-1"
          />
        ) : (
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-1">{titulo}</h1>
        )}
        {autor && <p className="text-xs text-slate-400 mb-6">de {autor}</p>}

        {/* Los bloques */}
        <div className={cn('space-y-2', editable && 'pl-0')}>
          {bloques.map((b, i) => renderBloque(b, i))}
        </div>

        {generando && (
          <p className="inline-flex items-center gap-2 mt-6 text-xs font-bold text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Escribiendo…
          </p>
        )}
        <div ref={finalRef} />

        {/* Añadir al final, siempre visible en edición */}
        {editable && (
          <button
            onClick={e => { e.stopPropagation(); setMenuAbierto(bloques[bloques.length - 1]?.id || null); }}
            className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-slate-300 hover:text-emerald-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir un bloque
          </button>
        )}
      </div>
    </div>
  );
}
