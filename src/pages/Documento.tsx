import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Code2, Image as ImageIcon, Table2, Trash2, Globe, Lock,
  Download, Sparkles, Loader2, ArrowLeft, FileText, GripVertical, Boxes,
  Search, X, Wand2, PenLine, Smile,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WindowContent from '../components/knowledge/WindowContent';
import EditorImagen from '../components/knowledge/EditorImagen';
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
  { tipo: 'publicacion', label: 'Publicación', icon: Boxes },
];

const EMOJIS_ICONO = ['📄', '📊', '📚', '🌍', '🔥', '💧', '🌱', '🏛️', '💡', '🎯', '🧭', '🤝', '⚖️', '🛠️', '🗺️', '❤️'];

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
  // Selección múltiple (2026-08-08, petición del usuario): Ctrl/Cmd+clic
  // marca bloques sueltos, Shift+clic marca el rango desde el último
  // marcado, y una barra flotante los elimina de golpe.
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const ultimoSeleccionado = useRef<string | null>(null);
  // Fase 2 —
  const [portada, setPortada] = useState<string | null>(null);
  const [icono, setIcono] = useState<string | null>(null);
  const [eligiendoIcono, setEligiendoIcono] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);   // id del bloque en vuelo
  const [sobreBloque, setSobreBloque] = useState<string | null>(null);   // id del bloque bajo el cursor
  const [buscadorPub, setBuscadorPub] = useState<string | null>(null);   // id del bloque tras el que insertar ('' = al final)
  const [busquedaPub, setBusquedaPub] = useState('');
  const [resultadosPub, setResultadosPub] = useState<any[]>([]);
  const [iaOcupada, setIaOcupada] = useState<string | null>(null);       // 'continuar' | id del bloque
  const [menuDescargar, setMenuDescargar] = useState(false);
  // Editor de imágenes sobre un bloque imagen: id del bloque en edición.
  const [imagenEditando, setImagenEditando] = useState<string | null>(null);
  // Contenido real de las ventanas embebidas, cargado en vivo una sola vez.
  const [ventanasEmbebidas, setVentanasEmbebidas] = useState<Record<string, any>>({});

  // Texto vivo de cada bloque (y celdas de tabla), fuera del estado de React.
  const textosRef = useRef<Record<string, string>>({});
  const filasRef = useRef<Record<string, string[][]>>({});
  const docId = useRef<string | null>(esNuevo ? null : id || null);
  const timerGuardado = useRef<any>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

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
        setPortada(j.config?.portada || null);
        setIcono(j.config?.icono || null);
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
  // El temporizador del autoguardado dispara 1,2 s DESPUÉS del cambio: si
  // leyera el estado capturado en el cierre, guardaría lo de ANTES (el título
  // sin su última letra, la estructura sin el bloque recién insertado). Por
  // eso lee SIEMPRE de estos refs, que un efecto mantiene al día en cuanto
  // React aplica cada cambio de estado.
  const bloquesRef = useRef<Bloque[]>([]);
  const metaRef = useRef<{ titulo: string; portada: string | null; icono: string | null }>({ titulo: '', portada: null, icono: null });
  useEffect(() => { bloquesRef.current = bloques; }, [bloques]);
  useEffect(() => { metaRef.current = { titulo, portada, icono }; }, [titulo, portada, icono]);

  const serializar = useCallback((): Bloque[] =>
    bloquesRef.current.map(b => ({
      ...b,
      texto: b.texto !== undefined || textosRef.current[b.id] !== undefined
        ? (textosRef.current[b.id] ?? b.texto ?? '') : undefined,
      filas: b.tipo === 'tabla' ? (filasRef.current[b.id] ?? b.filas ?? [['', ''], ['', '']]) : undefined,
    })), []);

  const guardarAhora = useCallback(async (estructura?: Bloque[]) => {
    if (!docId.current || !puedoEditar) return;
    setGuardado('guardando');
    const bs = estructura ?? serializar();
    const meta = metaRef.current;
    const r = await fetch(`/api/windows/${docId.current}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meta.titulo || 'Documento sin título',
        config: { bloques: bs, portada: meta.portada || undefined, icono: meta.icono || undefined },
      }),
    }).catch(() => null);
    setGuardado(r?.ok ? 'sí' : 'pendiente');
  }, [puedoEditar, serializar]);

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
    // El bloque de publicación no se inserta vacío: primero se elige QUÉ
    // publicación embeber, en el buscador.
    if (tipo === 'publicacion') {
      setMenuAbierto(null);
      setBuscadorPub(tras ?? '');
      setBusquedaPub('');
      setResultadosPub([]);
      return;
    }
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

  // -- Fase 2: reordenar arrastrando desde el tirador ⋮⋮ ----------------------
  const soltarSobre = (destino: string) => {
    if (!arrastrando || arrastrando === destino) { setArrastrando(null); setSobreBloque(null); return; }
    setBloques(bs => {
      const desde = bs.findIndex(b => b.id === arrastrando);
      const hasta = bs.findIndex(b => b.id === destino);
      if (desde < 0 || hasta < 0) return bs;
      const copia = [...bs];
      const [movido] = copia.splice(desde, 1);
      copia.splice(hasta, 0, movido);
      return copia;
    });
    setArrastrando(null);
    setSobreBloque(null);
    programarGuardado();
  };

  // -- Fase 2: buscador de publicaciones para embeber -------------------------
  useEffect(() => {
    if (buscadorPub === null) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (busquedaPub.trim()) p.set('q', busquedaPub.trim());
      fetch(`/api/publicaciones?${p}`, { credentials: 'include' })
        .then(r => r.json())
        .then(j => setResultadosPub(Array.isArray(j) ? j.filter((x: any) => x.id !== docId.current).slice(0, 12) : []))
        .catch(() => setResultadosPub([]));
    }, 250);
    return () => clearTimeout(t);
  }, [buscadorPub, busquedaPub]);

  const embeber = (pub: any) => {
    const rutaDe: Record<string, string> = { lienzo: '/grafos/', mapa: '/mapas/', proyecto: '/proyectos/' };
    const nuevo: Bloque = {
      id: nuevoIdBloque(),
      tipo: 'publicacion',
      pubTipo: pub.tipo,
      entityId: pub.id,
      pubKind: pub.kind || pub.tipo,
      pubTitulo: pub.titulo || pub.title || 'Publicación',
      pubAutor: pub.autor_nombre || undefined,
      pubUrl: pub.tipo === 'ventana' && pub.kind === 'pagina' ? `/documentos/${pub.id}`
        : rutaDe[pub.tipo] ? `${rutaDe[pub.tipo]}${pub.slug || pub.id}` : undefined,
    };
    setBloques(bs => {
      if (buscadorPub === '') return [...bs, nuevo];
      const i = bs.findIndex(b => b.id === buscadorPub);
      const copia = [...bs];
      copia.splice(i + 1, 0, nuevo);
      return copia;
    });
    setBuscadorPub(null);
    programarGuardado();
  };

  // Contenido real de una ventana embebida (tabla, imagen, gráfica…): se
  // carga una vez y se enseña con el MISMO renderer del resto de la app.
  useEffect(() => {
    const pendientes = bloques.filter(b =>
      b.tipo === 'publicacion' && b.pubTipo === 'ventana' && b.entityId && !(b.entityId in ventanasEmbebidas));
    if (!pendientes.length) return;
    for (const b of pendientes) {
      setVentanasEmbebidas(v => ({ ...v, [b.entityId!]: null })); // marcada como en curso
      fetch(`/api/windows/${b.entityId}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .then(j => setVentanasEmbebidas(v => ({ ...v, [b.entityId!]: j })))
        .catch(() => {});
    }
  }, [bloques, ventanasEmbebidas]);

  // -- Fase 2: IA dentro del documento ---------------------------------------
  const iaMejorar = async (b: Bloque) => {
    if (!docId.current) return;
    setIaOcupada(b.id);
    setMenuAbierto(null);
    try {
      const r = await fetch('/api/ai/documento-bloque', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_id: docId.current, accion: 'mejorar', texto: textosRef.current[b.id] ?? b.texto ?? '' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      textosRef.current[b.id] = j.texto;
      setBloques(bs => bs.map(x => x.id === b.id ? { ...x, texto: j.texto } : x));
      await guardarAhora();
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setIaOcupada(null);
    }
  };

  const iaContinuar = async () => {
    if (!docId.current) return;
    setIaOcupada('continuar');
    try {
      // Lo escrito hasta ahora viaja guardado antes de pedir la continuación.
      await guardarAhora();
      const r = await fetch('/api/ai/documento-bloque', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_id: docId.current, accion: 'continuar' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const nuevos: Bloque[] = j.bloques || [];
      for (const n of nuevos) if (n.texto !== undefined) textosRef.current[n.id] = n.texto;
      setBloques(bs => [...bs, ...nuevos]);
      programarGuardado();
      setTimeout(() => finalRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setIaOcupada(null);
    }
  };

  // -- Fase 2: exportar a Word, PDF y PNG ------------------------------------
  const descargarPng = async () => {
    setMenuDescargar(false);
    if (!docRef.current) return;
    // html2canvas solo se descarga cuando alguien exporta a imagen: no debe
    // pagarlo quien nunca lo usa.
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(docRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${titulo.replace(/[^a-zA-Z0-9áéíóúñ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'documento'}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  const subirPortada = async (archivo: File) => {
    const bytes = await archivo.arrayBuffer();
    const r = await fetch(`/api/uploads?type=${encodeURIComponent(archivo.type)}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error || 'No se ha podido subir la portada.'); return; }
    setPortada(j.url);
    programarGuardado();
  };

  const ES_TEXTO: TipoBloque[] = ['parrafo', 'titulo1', 'titulo2', 'titulo3', 'lista', 'numerada', 'tarea', 'cita'];

  const alTeclear = (b: Bloque, e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey && b.tipo !== 'codigo') {
      e.preventDefault();
      const heredan: TipoBloque[] = ['lista', 'numerada', 'tarea'];
      const texto = el.textContent || '';
      // Enter en un ítem vacío de lista lo convierte en párrafo, como Notion.
      if (heredan.includes(b.tipo) && !texto.trim()) {
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo: 'parrafo' } : x));
        programarGuardado();
        return;
      }
      // Enter PARTE el texto por el cursor: lo de antes se queda, lo de
      // después baja al bloque nuevo con el cursor a su inicio (como Notion).
      const corte = offsetCaret(el);
      const antes = texto.slice(0, corte);
      const despues = texto.slice(corte);
      textosRef.current[b.id] = antes;
      const nuevo: Bloque = { id: nuevoIdBloque(), tipo: heredan.includes(b.tipo) ? b.tipo : 'parrafo', texto: despues };
      textosRef.current[nuevo.id] = despues;
      setBloques(bs => {
        const i = bs.findIndex(x => x.id === b.id);
        const copia = bs.map(x => x.id === b.id ? { ...x, texto: antes } : x);
        copia.splice(i + 1, 0, nuevo);
        return copia;
      });
      setBloqueActivo(nuevo.id);
      posicionCaret.current = 0;
      setFocoId(nuevo.id);
      programarGuardado();
    } else if (e.key === 'Backspace') {
      const texto = el.textContent || '';
      if (!texto) {
        e.preventDefault();
        eliminar(b.id);
        return;
      }
      // Backspace con el cursor al principio FUSIONA con el bloque de texto
      // anterior, dejando el cursor en la juntura (como Notion).
      if (offsetCaret(el) === 0) {
        const i = bloques.findIndex(x => x.id === b.id);
        const anterior = bloques[i - 1];
        if (anterior && ES_TEXTO.includes(anterior.tipo)) {
          e.preventDefault();
          const textoAnterior = textosRef.current[anterior.id] ?? anterior.texto ?? '';
          const fusionado = textoAnterior + texto;
          textosRef.current[anterior.id] = fusionado;
          delete textosRef.current[b.id];
          setBloques(bs => bs
            .map(x => x.id === anterior.id ? { ...x, texto: fusionado } : x)
            .filter(x => x.id !== b.id));
          setBloqueActivo(anterior.id);
          posicionCaret.current = textoAnterior.length;
          setFocoId(anterior.id);
          programarGuardado();
        }
      }
    }
  };

  /** Atajos markdown al teclear a principio de línea: «# », «- », «1. »… */
  const autoformato = (b: Bloque, el: HTMLDivElement) => {
    if (b.tipo !== 'parrafo') return;
    const texto = el.textContent || '';
    const reglas: [RegExp, TipoBloque][] = [
      [/^###\s/, 'titulo3'], [/^##\s/, 'titulo2'], [/^#\s/, 'titulo1'],
      [/^[-*]\s/, 'lista'], [/^1[.)]\s/, 'numerada'], [/^>\s/, 'cita'],
      [/^\[\s?\]\s/, 'tarea'], [/^```/, 'codigo'],
    ];
    for (const [re, tipo] of reglas) {
      if (re.test(texto)) {
        const limpio = texto.replace(re, '');
        textosRef.current[b.id] = limpio;
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo, texto: limpio } : x));
        posicionCaret.current = 0;
        setFocoId(b.id);
        programarGuardado();
        return;
      }
    }
  };

  /** Pegar varias líneas crea varios bloques, pasando por el mismo parser
   *  markdown de siempre — pegar una lista pega una lista de verdad. */
  const alPegar = (b: Bloque, e: React.ClipboardEvent<HTMLDivElement>) => {
    const texto = e.clipboardData.getData('text/plain');
    if (!texto.includes('\n') || b.tipo === 'codigo') return; // pegado normal
    e.preventDefault();
    const nuevos = markdownABloques(texto);
    if (!nuevos.length) return;
    for (const n of nuevos) if (n.texto !== undefined) textosRef.current[n.id] = n.texto;
    const actual = (e.currentTarget.textContent || '').trim();
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === b.id);
      const copia = [...bs];
      // Sobre un bloque vacío lo sustituyen; con texto, van detrás.
      copia.splice(actual ? i + 1 : i, actual ? 0 : 1, ...nuevos);
      return copia;
    });
    if (!actual) delete textosRef.current[b.id];
    const ultimo = nuevos[nuevos.length - 1];
    setBloqueActivo(ultimo.id);
    setFocoId(ultimo.id);
    programarGuardado();
  };

  // -- Selección múltiple -----------------------------------------------------
  const clicSeleccion = (b: Bloque, e: React.MouseEvent) => {
    if (!editable || !(e.metaKey || e.ctrlKey || e.shiftKey)) return false;
    e.preventDefault();
    e.stopPropagation();
    setBloqueActivo(null);
    if (e.shiftKey && ultimoSeleccionado.current) {
      const desde = bloques.findIndex(x => x.id === ultimoSeleccionado.current);
      const hasta = bloques.findIndex(x => x.id === b.id);
      if (desde >= 0 && hasta >= 0) {
        const [a, z] = desde <= hasta ? [desde, hasta] : [hasta, desde];
        const rango = bloques.slice(a, z + 1).map(x => x.id);
        setSeleccion(s => [...new Set([...s, ...rango])]);
      }
    } else {
      setSeleccion(s => (s.includes(b.id) ? s.filter(x => x !== b.id) : [...s, b.id]));
    }
    ultimoSeleccionado.current = b.id;
    return true;
  };

  const eliminarSeleccion = useCallback(() => {
    if (!seleccion.length) return;
    setBloques(bs => {
      const restantes = bs.filter(x => !seleccion.includes(x.id));
      return restantes.length ? restantes : [{ id: nuevoIdBloque(), tipo: 'parrafo' }];
    });
    for (const id of seleccion) { delete textosRef.current[id]; delete filasRef.current[id]; }
    setSeleccion([]);
    ultimoSeleccionado.current = null;
    programarGuardado();
  }, [seleccion, programarGuardado]);

  // Suprimir/Backspace borra la selección (si no estás tecleando dentro de un
  // bloque) y Escape la deshace.
  useEffect(() => {
    if (!seleccion.length) return;
    const tecla = (e: KeyboardEvent) => {
      const activo = document.activeElement as HTMLElement | null;
      if (activo && (activo.isContentEditable || activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); eliminarSeleccion(); }
      else if (e.key === 'Escape') setSeleccion([]);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [seleccion, eliminarSeleccion]);

  // Enfocar el bloque recién creado/activado cuando ya está en el DOM. Por
  // defecto el cursor va al final; `posicionCaret` lo coloca en un punto
  // concreto (partir con Enter deja el cursor al INICIO del bloque nuevo;
  // fusionar con Backspace lo deja en la juntura).
  const posicionCaret = useRef<number | null>(null);
  useEffect(() => {
    if (!focoId) return;
    const el = document.querySelector<HTMLElement>(`[data-bloque="${focoId}"]`);
    if (el) {
      el.focus();
      const rango = document.createRange();
      if (posicionCaret.current !== null && el.firstChild) {
        const nodo = el.firstChild;
        const max = nodo.textContent?.length ?? 0;
        rango.setStart(nodo, Math.min(posicionCaret.current, max));
        rango.collapse(true);
      } else if (posicionCaret.current !== null) {
        rango.selectNodeContents(el);
        rango.collapse(true);
      } else {
        rango.selectNodeContents(el);
        rango.collapse(false);
      }
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(rango);
      posicionCaret.current = null;
      setFocoId(null);
    }
  });

  /** Dónde está el cursor dentro de un contentEditable, en caracteres. */
  const offsetCaret = (el: HTMLElement): number => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return 0;
    const previo = sel.getRangeAt(0).cloneRange();
    previo.selectNodeContents(el);
    previo.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return previo.toString().length;
  };

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
          <figure className="group/img relative">
            <img src={b.url} alt={b.pie || ''} className="rounded-xl max-w-full border border-slate-100" />
            {editable && (
              <button
                onClick={e => { e.stopPropagation(); setImagenEditando(b.id); }}
                className="absolute top-2 right-2 px-2.5 py-1 bg-white/90 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
              >
                Editar imagen
              </button>
            )}
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

      // Publicación embebida (Fase 2): una ventana enseña su contenido REAL
      // con el mismo renderer que el resto de la app; un lienzo, mapa o
      // proyecto se enseña como tarjeta que lleva a su página.
      if (b.tipo === 'publicacion') {
        const ventana = b.pubTipo === 'ventana' ? ventanasEmbebidas[b.entityId || ''] : undefined;
        const etiqueta = ({ ventana: b.pubKind || 'ventana', lienzo: 'lienzo', mapa: 'mapa', proyecto: 'proyecto', muro: 'muro' } as any)[b.pubTipo || ''] || 'publicación';
        const interior = (
          <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-emerald-100">
              <Boxes className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700 shrink-0">{etiqueta}</span>
              <span className="text-xs font-black text-slate-800 truncate">{b.pubTitulo}</span>
              {b.pubAutor && <span className="text-[10px] text-slate-400 truncate">· {b.pubAutor}</span>}
            </div>
            {b.pubTipo === 'ventana' ? (
              <div className="px-3.5 py-3 bg-white">
                {!ventana
                  ? <p className="text-xs text-slate-400">Cargando…</p>
                  : <WindowContent kind={ventana.kind} config={ventana.config || {}} variant="node" />}
              </div>
            ) : (
              <div className="px-3.5 py-2.5 bg-white text-xs text-slate-500">
                Una publicación de humanity.wiki — púlsala para explorarla entera.
              </div>
            )}
          </div>
        );
        return b.pubUrl
          ? <Link to={b.pubUrl} className="block hover:-translate-y-0.5 transition-transform">{interior}</Link>
          : interior;
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
          autoformato(b, e.currentTarget);
          programarGuardado();
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => alTeclear(b, e),
        onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => alPegar(b, e),
        onBlur: () => setBloqueActivo(a => (a === b.id ? null : a)),
        className: cn(CLASES_TEXTO[b.tipo], 'outline-none bg-emerald-50/40 rounded px-1 -mx-1 min-h-[1.4em] whitespace-pre-wrap'),
      } : {
        onClick: editable ? () => { setSeleccion([]); setBloqueActivo(b.id); setFocoId(b.id); } : undefined,
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

    const esBloqueTexto = !['separador', 'imagen', 'tabla', 'publicacion'].includes(b.tipo);

    return (
      <div
        key={b.id}
        className={cn('group/bloque relative rounded transition-shadow',
          sobreBloque === b.id && arrastrando && 'shadow-[0_-2px_0_0_theme(colors.emerald.400)]',
          arrastrando === b.id && 'opacity-40',
          seleccion.includes(b.id) && 'ring-2 ring-emerald-400 bg-emerald-50/60')}
        onClickCapture={editable ? e => { clicSeleccion(b, e); } : undefined}
        onDragOver={editable ? e => { if (arrastrando) { e.preventDefault(); setSobreBloque(b.id); } } : undefined}
        onDrop={editable ? () => soltarSobre(b.id) : undefined}
      >
        {editable && (
          <div className="absolute -left-14 top-0.5 flex items-center opacity-0 group-hover/bloque:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setMenuAbierto(m => (m === b.id ? null : b.id)); }}
              title="Añadir un bloque debajo"
              className="p-1 text-slate-300 hover:text-emerald-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span
              draggable
              onDragStart={e => { setArrastrando(b.id); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => { setArrastrando(null); setSobreBloque(null); }}
              title="Arrastrar para reordenar"
              className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4" />
            </span>
          </div>
        )}
        {iaOcupada === b.id && (
          <div className="absolute inset-0 z-20 bg-white/70 rounded flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> La IA está reescribiendo…
            </span>
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
            {esBloqueTexto && (
              <button onClick={() => iaMejorar(b)}
                className="col-span-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 text-left transition-colors">
                <Wand2 className="w-3.5 h-3.5" /> Mejorar este texto con IA
              </button>
            )}
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
    if (!menuAbierto && !menuDescargar) return;
    const cerrar = () => { setMenuAbierto(null); setMenuDescargar(false); };
    window.addEventListener('click', cerrar);
    return () => window.removeEventListener('click', cerrar);
  }, [menuAbierto, menuDescargar]);

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
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setMenuDescargar(m => !m); }} title="Descargar"
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
            {menuDescargar && (
              <div className="absolute right-0 top-full z-40 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-44"
                onClick={e => e.stopPropagation()}>
                {[
                  { label: 'Markdown (.md)', accion: () => { setMenuDescargar(false); descargarMarkdown(); } },
                  { label: 'Word (.docx)', accion: () => { setMenuDescargar(false); window.open(`/api/documentos/${docId.current}/docx`, '_blank'); } },
                  { label: 'PDF (.pdf)', accion: () => { setMenuDescargar(false); window.open(`/api/documentos/${docId.current}/pdf`, '_blank'); } },
                  { label: 'Imagen (.png)', accion: descargarPng },
                ].map(o => (
                  <button key={o.label} onClick={o.accion}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors">
                    <Download className="w-3 h-3 text-slate-400" /> {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div ref={docRef} className="bg-white">
        {/* Portada e icono, estilo Notion (Fase 2) */}
        {portada && (
          <div className="group/portada relative -mx-6 sm:-mx-12 mb-6">
            <img src={portada} alt="" className="w-full h-44 sm:h-56 object-cover rounded-2xl" />
            {editable && (
              <button
                onClick={() => { setPortada(null); programarGuardado(); }}
                className="absolute top-2 right-2 px-2 py-1 bg-white/90 rounded-lg text-[10px] font-black text-slate-600 opacity-0 group-hover/portada:opacity-100 transition-opacity"
              >
                Quitar portada
              </button>
            )}
          </div>
        )}
        {icono && (
          <div className="relative inline-block">
            <button
              onClick={() => editable && setEligiendoIcono(v => !v)}
              className={cn('text-5xl leading-none mb-2', editable && 'hover:scale-110 transition-transform')}
              title={editable ? 'Cambiar icono' : undefined}
            >
              {icono}
            </button>
          </div>
        )}
        {editable && (eligiendoIcono || !icono || !portada) && (
          <div className="flex items-center gap-3 mb-2">
            {(eligiendoIcono || !icono) && (
              <div className="flex items-center gap-1 flex-wrap">
                {!icono && !eligiendoIcono && (
                  <button onClick={() => setEligiendoIcono(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors">
                    <Smile className="w-3.5 h-3.5" /> Añadir icono
                  </button>
                )}
                {eligiendoIcono && (
                  <>
                    {EMOJIS_ICONO.map(e => (
                      <button key={e} onClick={() => { setIcono(e); setEligiendoIcono(false); programarGuardado(); }}
                        className="text-lg hover:scale-125 transition-transform">{e}</button>
                    ))}
                    <button onClick={() => { setIcono(null); setEligiendoIcono(false); programarGuardado(); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-500 ml-1">Quitar</button>
                  </>
                )}
              </div>
            )}
            {!portada && !eligiendoIcono && (
              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" /> Añadir portada
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && subirPortada(e.target.files[0])} />
              </label>
            )}
          </div>
        )}

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
        </div>

        {generando && (
          <p className="inline-flex items-center gap-2 mt-6 text-xs font-bold text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Escribiendo…
          </p>
        )}
        <div ref={finalRef} />

        {/* Añadir al final + continuar con IA, siempre visibles en edición */}
        {editable && (
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={e => { e.stopPropagation(); setMenuAbierto(bloques[bloques.length - 1]?.id || null); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir un bloque
            </button>
            <button
              onClick={iaContinuar}
              disabled={iaOcupada === 'continuar'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-600 disabled:opacity-60 transition-colors"
            >
              {iaOcupada === 'continuar'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> La IA está escribiendo…</>
                : <><PenLine className="w-3.5 h-3.5" /> Continuar con IA</>}
            </button>
            <span className="text-[10px] text-slate-300 hidden sm:inline">
              Ctrl+clic marca varios bloques · Shift+clic marca un tramo
            </span>
          </div>
        )}
      </div>

      {/* Barra flotante de la selección múltiple */}
      {seleccion.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-2.5">
          <span className="text-xs font-black">{seleccion.length} {seleccion.length === 1 ? 'bloque' : 'bloques'}</span>
          <button
            onClick={eliminarSeleccion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-black transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
          <button
            onClick={() => setSeleccion([])}
            title="Deshacer la selección (Esc)"
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor de imágenes sobre un bloque imagen */}
      {imagenEditando && (() => {
        const b = bloques.find(x => x.id === imagenEditando);
        return b?.url ? (
          <EditorImagen
            src={b.url}
            onGuardar={url => {
              setBloques(bs => bs.map(x => x.id === imagenEditando ? { ...x, url } : x));
              setImagenEditando(null);
              programarGuardado();
            }}
            onCerrar={() => setImagenEditando(null)}
          />
        ) : null;
      })()}

      {/* Buscador de publicaciones para embeber (Fase 2) */}
      {buscadorPub !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-24 px-5"
          onClick={() => setBuscadorPub(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus value={busquedaPub} onChange={e => setBusquedaPub(e.target.value)}
                placeholder="Busca la publicación que quieres insertar…"
                className="flex-1 text-sm outline-none"
              />
              <button onClick={() => setBuscadorPub(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {!resultadosPub.length ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  {busquedaPub ? 'Nada con ese nombre.' : 'Escribe para buscar entre las publicaciones.'}
                </p>
              ) : resultadosPub.map(p => (
                <button
                  key={`${p.tipo}-${p.id}`}
                  onClick={() => embeber(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-left transition-colors"
                >
                  <Boxes className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-slate-800 truncate">{p.titulo || p.title}</span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {(p.kind || p.tipo)}{p.autor_nombre ? ` · ${p.autor_nombre}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
