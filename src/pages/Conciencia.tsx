// ============================================================================
// ESTUDIO SOBRE LA CONCIENCIA DEL SER HUMANO (2026-11-10, Eugenio)
// ============================================================================
// A visual map of Jacobo Grinberg's syntergic theory, redrawn on 2026-11-10 at
// Eugenio's request: human 1 on the left, the fundamental matrix of the universe
// (Grinberg's «lattice») in the centre, human 2 on the right, and three lanes
// between them — the three ways two conscious beings interact through the
// matrix: waking (the physical senses), dreaming (the hyperfield) and meditation
// (telepathy, extraocular vision, remote viewing). Each lane has an animated
// walkthrough. Under the map, Grinberg's laboratory, his studies and what came
// after. The top band says the little that needs saying and holds the mailbox
// for improvements («Añadir mejora o comentario»).
//
// TWO HOMES, ONE COMPONENT: humanity.wiki/conciencia (the route in App.tsx) and
// luzhumanidad.com/conciencia-del-ser-humano/teoria-sintergica — a project page
// of the Luz & Humanidad site whose `config.aplicacion` is 'conciencia'
// (SubpaginaSitio.tsx, migration 0181). `enSitio` is set in the second case.
//
// · Exploring (default): tap a concept to read it, drag the background to move,
//   pinch or Ctrl+wheel to zoom.
// · «Editar mapa»: drag concepts, pull the «+» handle onto another concept to
//   draw an arrow, change texts, shapes, icons, colours. Signed-in accounts save
//   for everyone (with history); without an account changes stay on the device.
//
// PÁGINA PROPIA: outside the platform Layout, like /calendario-arte and
// /aeromovil. The map that ships is in `src/data/concienciaMapa.ts`; what people
// save lives in `conciencia_mapas` (see `src/server/conciencia.ts`).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, Pencil, Plus, Undo2, Redo2, ZoomIn, ZoomOut, Scan, Maximize2, Minimize2, History, Download, RotateCcw,
  Check, Loader2, AlertTriangle, CloudOff, X, LogIn, Upload, MousePointer2,
  Play, Pause, SkipBack, SkipForward, Sun, Moon, Flower2, MessageSquarePlus, RotateCw,
} from 'lucide-react';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/josefin-sans/400.css';
import '@fontsource/josefin-sans/600.css';
import '@fontsource/josefin-sans/400-italic.css';
import { cn } from '../utils/cn';
import { MapaSintergico, type MapaHandle, type Seleccion } from '../components/conciencia/MapaSintergico';
import { PanelConcepto } from '../components/conciencia/PanelConcepto';
import { BotonOscuro, BotonTexto, BotonLibre } from '../components/conciencia/botones';
import { Estudios } from '../components/conciencia/Estudios';
import { descargarJSON, descargarPNG, descargarSVG } from '../components/conciencia/exportar';
import { medir } from '../components/conciencia/geometria';
import { dibujarPaso } from '../components/conciencia/Animacion';
import { BuzonMejoras } from '../components/conciencia/BuzonMejoras';
import {
  MAPA_POR_DEFECTO, PALETA, RECORRIDOS, ESQUEMA_ACTUAL, esMapaValido,
  type MapaConciencia, type Nodo, type Flecha, type Canal,
} from '../data/concienciaMapa';

type Guardado = 'listo' | 'pendiente' | 'guardando' | 'local' | 'error' | 'conflicto';

const COPIA_LOCAL = 'conciencia.mapa.borrador';
const MAX_DESHACER = 80;
/** How long each walkthrough step stays on screen. */
const PASO_MS = 6500;

/**
 * Postgres timestamps arrive as text like «2026-11-10 10:04:36.36907+01» (drizzle
 * leaves them unparsed). Chrome reads that; Safari answers Invalid Date. Turn it
 * into ISO first so every browser reads the same instant.
 */
function fecha(t: string | null | undefined): Date | null {
  if (!t) return null;
  const iso = String(t).replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clonar = (m: MapaConciencia): MapaConciencia => JSON.parse(JSON.stringify(m));

/** A saved map of an older layout generation is not shown: the new one is (the old stays in the history). */
const vigente = (m: unknown): m is MapaConciencia => esMapaValido(m) && (Number((m as MapaConciencia).version) || 1) >= ESQUEMA_ACTUAL;

function leerCopiaLocal(): { datos: MapaConciencia; t: number } | null {
  try {
    const c = JSON.parse(localStorage.getItem(COPIA_LOCAL) || 'null');
    return c && vigente(c.datos) ? c : null;
  } catch { return null; }
}
function escribirCopiaLocal(datos: MapaConciencia | null) {
  try {
    if (datos) localStorage.setItem(COPIA_LOCAL, JSON.stringify({ datos, t: Date.now() }));
    else localStorage.removeItem(COPIA_LOCAL);
  } catch { /* private mode: the copy is a convenience */ }
}

const PASOS: { id: string; titulo: string; texto: string; nodo: string; canal?: Canal }[] = [
  {
    id: 'matriz', nodo: 'matriz', titulo: 'La matriz fundamental del universo',
    texto: 'Para Grinberg, bajo todo lo que vemos hay una red de información que forma el espacio-tiempo. Él la llamó «lattice». En cada punto de esa red está la información de todo lo demás, como en un holograma. Toda interacción entre seres conscientes pasa por ella.',
  },
  {
    id: 'campo', nodo: 'persona-a', titulo: 'El campo neuronal: una malla',
    texto: 'Cada cerebro genera un campo (el «campo neuronal») que sale del cráneo y es una distorsión de la propia matriz: por eso se dibuja con la misma malla. Cuanto más coherente es, más «sintergia» tiene y más directa es la percepción.',
  },
  {
    id: 'vigilia', nodo: 'franja-vigilia', canal: 'vigilia', titulo: 'Vigilia: por los sentidos',
    texto: 'El ser humano 1 codifica una idea en palabras de su idioma, su voz hace vibrar el aire, el oído del ser humano 2 recibe esa vibración física y su campo neuronal la decodifica con el mismo código cultural y lingüístico para darle sentido.',
  },
  {
    id: 'onirico', nodo: 'franja-onirico', canal: 'onirico', titulo: 'Sueño: por el hipercampo',
    texto: 'Dormidos, los sentidos físicos descansan y los campos neuronales se expanden. Según Grinberg, los campos que interactúan forman un campo común, el hipercampo. Lo que llega del otro lo traen sentidos energéticos que aún no conocemos, como imágenes y símbolos.',
  },
  {
    id: 'meditacion', nodo: 'franja-meditacion', canal: 'meditacion', titulo: 'Meditación: percepción directa',
    texto: 'Entre la vigilia y el sueño, el campo neuronal se vuelve coherente y accede de forma consciente a la información de la matriz: la de otros seres (telepatía), la de objetos cercanos (visión extraocular) y la de lugares lejanos (visión remota).',
  },
  {
    id: 'estudios', nodo: 'telepatia', titulo: 'Lo que midió Grinberg',
    texto: 'En su laboratorio registró el electroencefalograma de parejas que se comunicaban en silencio y, aisladas después en cámaras separadas, comprobó si un estímulo dado a una aparecía en el cerebro de la otra: el «potencial transferido». Los estudios están más abajo.',
  },
];

export default function Conciencia({ enSitio }: { enSitio?: { inicio: string } } = {}) {
  const [mapa, setMapa] = useState<MapaConciencia>(() => clonar(MAPA_POR_DEFECTO));
  const mapaRef = useRef(mapa);
  mapaRef.current = mapa;
  const version = useRef(0);
  const [cargado, setCargado] = useState(false);
  const [puedeGuardar, setPuedeGuardar] = useState(false);
  const [sesion, setSesion] = useState(false);
  const [sinServidor, setSinServidor] = useState(false);
  const [guardado, setGuardado] = useState<Guardado>('listo');
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [conectarDesde, setConectarDesde] = useState<string | null>(null);
  const [completa, setCompleta] = useState(false);
  const [menuDescarga, setMenuDescarga] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [confirmarOriginal, setConfirmarOriginal] = useState(false);
  const [copiaPendiente, setCopiaPendiente] = useState<{ datos: MapaConciencia; t: number } | null>(null);
  const [destello, setDestello] = useState<string | null>(null);
  const [recorrido, setRecorrido] = useState<{ canal: Canal; paso: number; reproduciendo: boolean } | null>(null);
  const [verBuzon, setVerBuzon] = useState(false);
  const mapaUI = useRef<MapaHandle>(null);
  const zonaMapa = useRef<HTMLDivElement>(null);
  const importar = useRef<HTMLInputElement>(null);

  // ── Undo / redo (this device only; the server keeps its own history) ─────
  const pasado = useRef<MapaConciencia[]>([]);
  const futuro = useRef<MapaConciencia[]>([]);
  const ultimaClave = useRef<{ clave: string; t: number } | null>(null);
  const arrastrando = useRef<string | null>(null);
  const [, refrescar] = useState(0);

  // ── Page title and description ───────────────────────────────────────────
  useEffect(() => {
    const titulo = document.title;
    document.title = 'Conciencia del ser humano · Teoría sintérgica de Jacobo Grinberg · Luz & Humanidad';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const anterior = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Mapa animado y editable de la teoría sintérgica de Jacobo Grinberg: cómo interactúan dos seres conscientes a través de la matriz fundamental del universo, despiertos por los sentidos, dormidos por el hipercampo y meditando por telepatía, visión extraocular y visión remota. Con sus estudios científicos.';
    return () => { document.title = titulo; if (meta) meta.content = anterior ?? ''; };
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────────
  // Raw fetch on purpose (src/pages/CLAUDE.md, the legitimate exception): these
  // /api/conciencia endpoints are used by this page only and preloading them in
  // DataContext would make every other page pay for a map it never shows.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch('/api/conciencia/mapa', { credentials: 'include' });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (!vivo) return;
        version.current = Number(j.version) || 0;
        setPuedeGuardar(!!j.puedeGuardar);
        setSesion(!!j.sesion);
        if (vigente(j.datos)) setMapa(j.datos);
        const local = leerCopiaLocal();
        const servidor = fecha(j.actualizado)?.getTime() ?? 0;
        if (local && local.t > servidor) setCopiaPendiente(local);
      } catch {
        if (!vivo) return;
        // No server (or it failed): the map from the code, and the device copy if there is one.
        setSinServidor(true);
        const local = leerCopiaLocal();
        if (local) setCopiaPendiente(local);
      } finally {
        if (vivo) setCargado(true);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const temporizador = useRef<number | null>(null);
  const guardarAhora = useCallback(async (forzar = false) => {
    if (temporizador.current) { window.clearTimeout(temporizador.current); temporizador.current = null; }
    const datos = mapaRef.current;
    escribirCopiaLocal(datos);
    if (!puedeGuardar || sinServidor) { setGuardado('local'); return; }
    setGuardado('guardando');
    try {
      if (forzar) {
        const r0 = await fetch('/api/conciencia/mapa', { credentials: 'include' });
        if (r0.ok) version.current = Number((await r0.json()).version) || 0;
      }
      const r = await fetch('/api/conciencia/mapa', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos, version: version.current }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409) { setGuardado('conflicto'); return; }
      if (!r.ok) { setError(j.error || 'No se ha podido guardar.'); setGuardado('error'); return; }
      version.current = Number(j.version) || version.current + 1;
      escribirCopiaLocal(null);
      setError('');
      // If something changed while this request was in flight, save again.
      setGuardado(mapaRef.current === datos ? 'listo' : 'pendiente');
      if (mapaRef.current !== datos) temporizador.current = window.setTimeout(() => guardarAhora(), 800);
    } catch {
      setError('Sin conexión con el servidor. Los cambios están guardados en este dispositivo.');
      setGuardado('error');
    }
  }, [puedeGuardar, sinServidor]);

  const programarGuardado = useCallback(() => {
    setGuardado('pendiente');
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => { if (!arrastrando.current) guardarAhora(); }, 1200);
  }, [guardarAhora]);

  // Leaving with something unsaved: try once more, quietly.
  useEffect(() => {
    const salir = () => {
      if (guardado === 'pendiente' || guardado === 'guardando') {
        escribirCopiaLocal(mapaRef.current);
        if (puedeGuardar && !sinServidor) {
          try {
            fetch('/api/conciencia/mapa', {
              method: 'PUT', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ datos: mapaRef.current, version: version.current }),
            });
          } catch { /* the device copy is there */ }
        }
      }
    };
    window.addEventListener('pagehide', salir);
    return () => window.removeEventListener('pagehide', salir);
  }, [guardado, puedeGuardar, sinServidor]);

  /** Every change to the map goes through here. `clave` groups keystrokes into one undo step. */
  const cambiar = useCallback((nuevo: MapaConciencia, clave?: string) => {
    const ahora = Date.now();
    const agrupar = !!clave && ultimaClave.current?.clave === clave && ahora - ultimaClave.current.t < 1500;
    if (!agrupar) {
      pasado.current.push(mapaRef.current);
      if (pasado.current.length > MAX_DESHACER) pasado.current.shift();
      futuro.current = [];
    }
    ultimaClave.current = clave ? { clave, t: ahora } : null;
    mapaRef.current = nuevo;
    setMapa(nuevo);
    programarGuardado();
  }, [programarGuardado]);

  const deshacer = useCallback(() => {
    const prev = pasado.current.pop();
    if (!prev) return;
    futuro.current.push(mapaRef.current);
    ultimaClave.current = null;
    mapaRef.current = prev;
    setMapa(prev);
    programarGuardado();
    refrescar(x => x + 1);
  }, [programarGuardado]);

  const rehacer = useCallback(() => {
    const sig = futuro.current.pop();
    if (!sig) return;
    pasado.current.push(mapaRef.current);
    ultimaClave.current = null;
    mapaRef.current = sig;
    setMapa(sig);
    programarGuardado();
    refrescar(x => x + 1);
  }, [programarGuardado]);

  // ── Operations on the map ────────────────────────────────────────────────
  const moverNodo = useCallback((id: string, x: number, y: number) => {
    const m = mapaRef.current;
    if (arrastrando.current !== id) {
      arrastrando.current = id;
      pasado.current.push(m);
      if (pasado.current.length > MAX_DESHACER) pasado.current.shift();
      futuro.current = [];
      ultimaClave.current = null;
    }
    const nuevo = { ...m, nodos: m.nodos.map(n => (n.id === id ? { ...n, x, y } : n)) };
    mapaRef.current = nuevo;
    setMapa(nuevo);
  }, []);

  const finMover = useCallback(() => {
    arrastrando.current = null;
    programarGuardado();
    refrescar(x => x + 1);
  }, [programarGuardado]);

  const cambiarNodo = useCallback((id: string, cambios: Partial<Nodo>, clave?: string) => {
    const m = mapaRef.current;
    cambiar({ ...m, nodos: m.nodos.map(n => (n.id === id ? { ...n, ...cambios } : n)) }, clave);
  }, [cambiar]);

  const cambiarFlecha = useCallback((id: string, cambios: Partial<Flecha>, clave?: string) => {
    const m = mapaRef.current;
    cambiar({ ...m, flechas: m.flechas.map(f => (f.id === id ? { ...f, ...cambios } : f)) }, clave);
  }, [cambiar]);

  const conectar = useCallback((de: string, a: string) => {
    setConectarDesde(null);
    const m = mapaRef.current;
    const existe = m.flechas.find(f => (f.de === de && f.a === a) || (f.de === a && f.a === de));
    if (existe) { setSeleccion({ tipo: 'flecha', id: existe.id }); return; }
    const origen = m.nodos.find(n => n.id === de);
    const f: Flecha = { id: nuevoId('f'), de, a, estilo: 'continua', direccion: 'ida', color: origen?.color ?? PALETA[9].color };
    cambiar({ ...m, flechas: [...m.flechas, f] });
    setSeleccion({ tipo: 'flecha', id: f.id });
  }, [cambiar]);

  const anadirConcepto = useCallback(() => {
    const m = mapaRef.current;
    const c = mapaUI.current?.centro() ?? { x: 800, y: 700 };
    const n: Nodo = { id: nuevoId('n'), x: Math.round(c.x), y: Math.round(c.y), forma: 'capacidad', icono: 'chispas', color: PALETA[8].color, titulo: 'Nuevo concepto' };
    // Near the centre of the screen, but in a gap: a new concept dropped on top
    // of another one is a concept nobody can see.
    const ocupa = (x: number, y: number) => m.nodos.some(o => {
      const mo = medir(o);
      const w = (mo.borde === 'circulo' ? mo.r * 3 : mo.w) / 2 + 130, h = (mo.borde === 'circulo' ? mo.r * 3 : mo.h) / 2 + 40;
      return Math.abs(o.x - x) < w && Math.abs(o.y - y) < h;
    });
    for (let i = 0; i < 80 && ocupa(n.x, n.y); i++) {
      const ang = i * 2.4, r = 40 + i * 14;
      n.x = Math.round(c.x + Math.cos(ang) * r);
      n.y = Math.round(c.y + Math.sin(ang) * r * 0.7);
    }
    cambiar({ ...m, nodos: [...m.nodos, n] });
    setSeleccion({ tipo: 'nodo', id: n.id });
  }, [cambiar]);

  const duplicar = useCallback((id: string) => {
    const m = mapaRef.current;
    const o = m.nodos.find(n => n.id === id);
    if (!o) return;
    const n: Nodo = { ...clonar({ version: ESQUEMA_ACTUAL, nodos: [o], flechas: [] }).nodos[0], id: nuevoId('n'), x: o.x + 50, y: o.y + 50 };
    cambiar({ ...m, nodos: [...m.nodos, n] });
    setSeleccion({ tipo: 'nodo', id: n.id });
  }, [cambiar]);

  const borrar = useCallback(() => {
    const s = seleccion;
    if (!s) return;
    const m = mapaRef.current;
    if (s.tipo === 'nodo') cambiar({ ...m, nodos: m.nodos.filter(n => n.id !== s.id), flechas: m.flechas.filter(f => f.de !== s.id && f.a !== s.id) });
    else cambiar({ ...m, flechas: m.flechas.filter(f => f.id !== s.id) });
    setSeleccion(null);
  }, [seleccion, cambiar]);

  const volverAlOriginal = useCallback(async () => {
    setConfirmarOriginal(false);
    if (puedeGuardar && !sinServidor) {
      try {
        const r = await fetch('/api/conciencia/mapa', { method: 'DELETE', credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setError(j.error || 'No se ha podido volver al original.'); setGuardado('error'); return; }
        version.current = Number(j.version) || version.current;
      } catch { setError('Sin conexión con el servidor.'); setGuardado('error'); return; }
    }
    pasado.current.push(mapaRef.current);
    futuro.current = [];
    const original = clonar(MAPA_POR_DEFECTO);
    mapaRef.current = original;
    setMapa(original);
    escribirCopiaLocal(null);
    setGuardado(puedeGuardar && !sinServidor ? 'listo' : 'local');
    setSeleccion(null);
    setTimeout(() => mapaUI.current?.ajustar(), 50);
  }, [puedeGuardar, sinServidor]);

  const recargarDelServidor = useCallback(async () => {
    try {
      const r = await fetch('/api/conciencia/mapa', { credentials: 'include' });
      const j = await r.json();
      version.current = Number(j.version) || 0;
      const datos = vigente(j.datos) ? j.datos : clonar(MAPA_POR_DEFECTO);
      pasado.current.push(mapaRef.current);
      mapaRef.current = datos;
      setMapa(datos);
      setGuardado('listo');
      setError('');
    } catch { setError('No se ha podido recargar.'); }
  }, []);

  const irAEstudio = useCallback((id: string) => {
    setCompleta(false);
    setTimeout(() => {
      document.getElementById(`estudio-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setDestello(id);
      setTimeout(() => setDestello(null), 2600);
    }, 60);
  }, []);

  const verEnElMapa = useCallback((idNodo: string) => {
    setSeleccion({ tipo: 'nodo', id: idNodo });
    zonaMapa.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const escribiendo = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (recorrido && !escribiendo) {
        const total = RECORRIDOS[recorrido.canal].pasos.length;
        if (e.key === 'Escape') { setRecorrido(null); mapaUI.current?.ajustar(); return; }
        if (e.key === 'ArrowRight') { setRecorrido({ ...recorrido, paso: Math.min(total - 1, recorrido.paso + 1), reproduciendo: false }); return; }
        if (e.key === 'ArrowLeft') { setRecorrido({ ...recorrido, paso: Math.max(0, recorrido.paso - 1), reproduciendo: false }); return; }
      }
      if (e.key === 'Escape') {
        if (conectarDesde) setConectarDesde(null);
        else if (seleccion) setSeleccion(null);
        else if (completa) setCompleta(false);
        return;
      }
      if (escribiendo || !editando) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); rehacer(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && seleccion) { e.preventDefault(); borrar(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [conectarDesde, seleccion, completa, editando, deshacer, rehacer, borrar, recorrido]);

  // Full screen locks the page scroll behind it.
  useEffect(() => {
    if (!completa) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [completa]);

  const importarArchivo = async (archivo: File) => {
    try {
      const datos = JSON.parse(await archivo.text());
      if (!esMapaValido(datos)) throw new Error();
      cambiar({ version: ESQUEMA_ACTUAL, nodos: datos.nodos, flechas: datos.flechas });
      setSeleccion(null);
      setTimeout(() => mapaUI.current?.ajustar(), 50);
    } catch {
      setError('Ese archivo no es un mapa válido (tiene que ser un .json descargado de esta página).');
    }
  };

  const estado = useMemo(() => {
    switch (guardado) {
      case 'guardando': return { I: Loader2, texto: 'Guardando…', clase: 'text-slate-300', girar: true };
      case 'pendiente': return { I: Loader2, texto: 'Cambios sin guardar', clase: 'text-slate-300', girar: false };
      case 'local': return { I: CloudOff, texto: sinServidor ? 'Guardado en este dispositivo' : 'Guardado solo en este dispositivo', clase: 'text-amber-200', girar: false };
      case 'error': return { I: AlertTriangle, texto: 'No se ha guardado en la web', clase: 'text-rose-200', girar: false };
      case 'conflicto': return { I: AlertTriangle, texto: 'Otra persona ha guardado', clase: 'text-rose-200', girar: false };
      default: return { I: Check, texto: puedeGuardar ? 'Guardado para todos' : 'Sin cambios', clase: 'text-emerald-200', girar: false };
    }
  }, [guardado, puedeGuardar, sinServidor]);

  // ── The animated walkthroughs (one per lane) ──────────────────────────────
  useEffect(() => {
    if (!recorrido?.reproduciendo) return;
    const total = RECORRIDOS[recorrido.canal].pasos.length;
    const t = window.setTimeout(() => {
      setRecorrido(r => (!r ? r : r.paso + 1 >= total ? { ...r, reproduciendo: false } : { ...r, paso: r.paso + 1 }));
    }, PASO_MS);
    return () => window.clearTimeout(t);
  }, [recorrido]);

  const verRecorrido = useCallback((canal: Canal, desdeAbajo = false) => {
    setEditando(false);
    setSeleccion(null);
    setConectarDesde(null);
    setMenuDescarga(false);
    setRecorrido({ canal, paso: 0, reproduciendo: true });
    // Keep the bottom free for the caption card, so it never hides a lane.
    mapaUI.current?.ajustar(window.innerWidth < 640 ? 250 : 175);
    if (desdeAbajo) zonaMapa.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const pasoRecorrido = recorrido ? RECORRIDOS[recorrido.canal].pasos[recorrido.paso] : null;
  const capaRecorrido = useMemo(
    () => (recorrido ? (ctx: Parameters<typeof dibujarPaso>[2]) => dibujarPaso(recorrido.canal, recorrido.paso, ctx) : undefined),
    [recorrido?.canal, recorrido?.paso], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const panelAbierto = !!seleccion && !conectarDesde;
  const inicioLuz = enSitio ? enSitio.inicio : 'https://luzhumanidad.com';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: '"Josefin Sans", ui-sans-serif, system-ui, sans-serif' }}>
      {/* ── La franja de arriba: lo poco que hay que decir, quién lo hace y el buzón ── */}
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <div className="min-w-0 shrink-0">
            <h1 className="text-base font-semibold leading-tight text-white sm:text-lg" style={{ fontFamily: '"Cinzel", Georgia, serif' }}>
              Conciencia del ser humano
            </h1>
            <p className="text-[11px] text-slate-400">
              Teoría sintérgica de Jacobo Grinberg · Creado por{' '}
              {enSitio
                ? <Link to={inicioLuz} className="text-amber-200 hover:underline">Luz &amp; Humanidad</Link>
                : <a href={inicioLuz} className="text-amber-200 hover:underline">Luz &amp; Humanidad</a>}
            </p>
          </div>
          {/* On phones the map comes first; the same idea is told under it, in «Cómo funciona». */}
          <p className="order-3 hidden basis-full text-xs leading-snug text-slate-300 sm:block lg:order-none lg:basis-0 lg:flex-1">
            Según Grinberg, cada cerebro crea un campo —el <b className="text-slate-100">campo neuronal</b>— que es una malla como la
            <b className="text-slate-100"> matriz fundamental del universo</b> («lattice») e interactúa con ella. Dos seres conscientes se
            relacionan de tres maneras: despiertos por los sentidos, dormidos por el hipercampo y meditando por percepción directa.
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <BotonOscuro onClick={() => setVerBuzon(true)} className="bg-amber-200/15 text-amber-100 ring-1 ring-amber-200/40 hover:bg-amber-200/25">
              <MessageSquarePlus className="h-4 w-4" /> Añadir mejora o comentario
            </BotonOscuro>
            <a href="#laboratorio" className="hidden text-xs text-slate-400 hover:text-white md:inline">Estudios ↓</a>
          </div>
        </div>
      </header>

      {/* ── El mapa ── */}
      <section id="mapa" className="px-1 pt-2 sm:px-3">
        <div
          ref={zonaMapa}
          className={cn(
            'relative mx-auto overflow-hidden border border-white/10 bg-slate-950 shadow-[0_0_80px_rgba(94,230,208,0.08)]',
            completa ? 'fixed inset-0 z-50 max-w-none rounded-none border-0' : 'h-[calc(100svh-7.5rem)] min-h-[480px] max-w-[1600px] rounded-2xl lg:h-[calc(100svh-5.25rem)]',
          )}
        >
          {/* Barra de herramientas */}
          <div className="absolute inset-x-2 top-2 z-20 flex flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-1 backdrop-blur [scrollbar-width:none] md:flex-wrap md:overflow-visible" onPointerDown={e => e.stopPropagation()}>
            <div className="flex shrink-0 rounded-xl bg-white/5 p-0.5">
              <BotonOscuro activo={!editando} onClick={() => { setEditando(false); setConectarDesde(null); }}><Eye className="h-4 w-4" /> Explorar</BotonOscuro>
              <BotonOscuro activo={editando} onClick={() => setEditando(true)}><Pencil className="h-4 w-4" /> Editar mapa</BotonOscuro>
            </div>
            {editando && (
              <>
                <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
                <BotonOscuro onClick={anadirConcepto}><Plus className="h-4 w-4" /> Concepto</BotonOscuro>
                <BotonOscuro onClick={deshacer} disabled={!pasado.current.length} title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><Undo2 className="h-4 w-4" /></BotonOscuro>
                <BotonOscuro onClick={rehacer} disabled={!futuro.current.length} title="Rehacer (Ctrl+Y)" aria-label="Rehacer"><Redo2 className="h-4 w-4" /></BotonOscuro>
                {puedeGuardar && <BotonOscuro onClick={() => setVerHistorial(true)} title="Versiones guardadas"><History className="h-4 w-4" /> <span className="hidden md:inline">Historial</span></BotonOscuro>}
                <BotonOscuro onClick={() => importar.current?.click()} title="Cargar un mapa .json"><Upload className="h-4 w-4" /> <span className="hidden md:inline">Importar</span></BotonOscuro>
                {confirmarOriginal ? (
                  <span className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-1">
                    <span className="px-1 text-[11px] text-rose-100">¿Volver al mapa original?</span>
                    <BotonOscuro onClick={volverAlOriginal} className="text-rose-100">Sí</BotonOscuro>
                    <BotonOscuro onClick={() => setConfirmarOriginal(false)}>No</BotonOscuro>
                  </span>
                ) : (
                  <BotonOscuro onClick={() => setConfirmarOriginal(true)} title="Volver al mapa original"><RotateCcw className="h-4 w-4" /> <span className="hidden md:inline">Original</span></BotonOscuro>
                )}
              </>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {editando && (
                <span className={cn('hidden items-center gap-1 px-2 text-[11px] sm:flex', estado.clase)} aria-live="polite">
                  <estado.I className={cn('h-3.5 w-3.5', estado.girar && 'animate-spin')} /> {estado.texto}
                </span>
              )}
              <BotonOscuro onClick={() => mapaUI.current?.zoom(1 / 1.25)} aria-label="Alejar"><ZoomOut className="h-4 w-4" /></BotonOscuro>
              <BotonOscuro onClick={() => mapaUI.current?.zoom(1.25)} aria-label="Acercar"><ZoomIn className="h-4 w-4" /></BotonOscuro>
              <BotonOscuro onClick={() => mapaUI.current?.ajustar()} title="Ver el mapa entero" aria-label="Ver el mapa entero"><Scan className="h-4 w-4" /></BotonOscuro>
              <BotonOscuro onClick={() => setMenuDescarga(v => !v)} title="Descargar" aria-label="Descargar" activo={menuDescarga}><Download className="h-4 w-4" /></BotonOscuro>
              <BotonOscuro onClick={() => setCompleta(v => !v)} aria-label={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}>
                {completa ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </BotonOscuro>
            </div>
          </div>

          {/* Outside the toolbar, which scrolls sideways on phones and would clip it. */}
          {menuDescarga && (
                  <div className="absolute right-3 top-14 z-30 w-52 rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-xl" onPointerDown={e => e.stopPropagation()}>
                    {[
                      { t: 'Imagen PNG', f: async () => { const s = mapaUI.current?.svg(); if (s) await descargarPNG(s, mapaRef.current).catch(e => setError(e.message)); } },
                      { t: 'Dibujo SVG (vectorial)', f: () => { const s = mapaUI.current?.svg(); if (s) descargarSVG(s, mapaRef.current); } },
                      { t: 'Datos del mapa (.json)', f: () => descargarJSON(mapaRef.current) },
                    ].map(o => (
                      <BotonLibre key={o.t} onClick={() => { setMenuDescarga(false); o.f(); }} className="flex w-full justify-start rounded-lg px-3 py-2 text-left text-sm font-normal text-slate-200 hover:bg-white/10">{o.t}</BotonLibre>
                    ))}
                  </div>
          )}

          {/* Avisos sobre el mapa */}
          <div className="pointer-events-none absolute inset-x-2 top-[3.6rem] z-10 flex flex-col items-center gap-2 sm:top-14" onPointerDown={e => e.stopPropagation()}>
            {conectarDesde && (
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/90 px-4 py-1.5 text-xs">
                <MousePointer2 className="h-3.5 w-3.5" /> Toca el concepto de destino para crear la flecha
                <BotonTexto className="ml-1" onClick={() => setConectarDesde(null)}>Cancelar</BotonTexto>
              </div>
            )}
            {editando && cargado && !puedeGuardar && !sinServidor && (
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-200/30 bg-amber-950/80 px-4 py-2 text-center text-xs text-amber-50">
                {sesion
                  ? 'Tu cuenta no puede guardar este mapa para todos: tus cambios se guardan en este dispositivo.'
                  : enSitio
                    ? <>Tus cambios se guardan en este dispositivo. Para guardarlos para todos, edítalo en <a href="https://humanity.wiki/conciencia" className="underline">humanity.wiki/conciencia</a> con tu sesión iniciada.</>
                    : <>Tus cambios se guardan en este dispositivo. Para guardarlos para todos, <Link to="/login" className="inline-flex items-center gap-1 underline"><LogIn className="h-3 w-3" />inicia sesión</Link> y vuelve a esta página.</>}
              </div>
            )}
            {copiaPendiente && (
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-violet-950/85 px-4 py-2 text-xs">
                Hay cambios de este dispositivo sin guardar en la web ({new Date(copiaPendiente.t).toLocaleString('es-ES')}).
                <BotonTexto onClick={() => { cambiar(copiaPendiente.datos); setCopiaPendiente(null); setEditando(true); }}>Recuperarlos</BotonTexto>
                <BotonTexto className="opacity-75" onClick={() => { escribirCopiaLocal(null); setCopiaPendiente(null); }}>Descartar</BotonTexto>
              </div>
            )}
            {(guardado === 'error' || guardado === 'conflicto' || (error && guardado !== 'listo')) && (
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-rose-200/30 bg-rose-950/85 px-4 py-2 text-center text-xs text-rose-50">
                {guardado === 'conflicto' ? 'Otra persona ha guardado el mapa mientras editabas.' : error}
                {guardado === 'conflicto' ? (
                  <>
                    <BotonTexto onClick={recargarDelServidor}>Ver su versión</BotonTexto>
                    <BotonTexto onClick={() => guardarAhora(true)}>Guardar la mía encima</BotonTexto>
                  </>
                ) : guardado === 'error' && puedeGuardar ? (
                  <BotonTexto onClick={() => guardarAhora()}>Reintentar</BotonTexto>
                ) : (
                  <BotonLibre aria-label="Cerrar" className="text-rose-50 hover:bg-transparent" onClick={() => setError('')}><X className="h-3.5 w-3.5" /></BotonLibre>
                )}
              </div>
            )}
          </div>

          <MapaSintergico
            ref={mapaUI}
            className="absolute inset-0"
            mapa={mapa}
            editando={editando}
            seleccion={seleccion}
            onSeleccion={s => { setSeleccion(s); setMenuDescarga(false); }}
            onMover={moverNodo}
            onFinMover={finMover}
            onConectar={conectar}
            conectarDesde={conectarDesde}
            resaltados={pasoRecorrido?.resaltar ?? null}
            capa={capaRecorrido}
          />

          {/* Ver cómo funciona: the three lanes, animated */}
          {!recorrido && !editando && !panelAbierto && (
            <div className="absolute bottom-2 left-2 z-10 flex flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/85 p-1 backdrop-blur" onPointerDown={e => e.stopPropagation()}>
              <span className="px-2 text-[11px] text-slate-300">Ver cómo funciona:</span>
              <BotonOscuro onClick={() => verRecorrido('vigilia')} className="text-amber-100"><Sun className="h-4 w-4" /> Vigilia</BotonOscuro>
              <BotonOscuro onClick={() => verRecorrido('onirico')} className="text-indigo-100"><Moon className="h-4 w-4" /> Sueño</BotonOscuro>
              <BotonOscuro onClick={() => verRecorrido('meditacion')} className="text-violet-100"><Flower2 className="h-4 w-4" /> Meditación</BotonOscuro>
            </div>
          )}
          {recorrido && pasoRecorrido && (
            <div className="absolute inset-x-2 bottom-2 z-20 mx-auto max-w-2xl rounded-2xl border border-white/15 bg-slate-950/92 p-3 shadow-2xl backdrop-blur sm:p-4" onPointerDown={e => e.stopPropagation()} aria-live="polite">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: RECORRIDOS[recorrido.canal].color }}>
                  {RECORRIDOS[recorrido.canal].nombre} · paso {recorrido.paso + 1} de {RECORRIDOS[recorrido.canal].pasos.length}
                </span>
                <BotonOscuro onClick={() => { setRecorrido(null); mapaUI.current?.ajustar(); }} aria-label="Cerrar la animación"><X className="h-4 w-4" /></BotonOscuro>
              </div>
              <h3 className="text-base font-semibold text-white sm:text-lg">{pasoRecorrido.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{pasoRecorrido.texto}</p>
              <div className="mt-3 flex items-center gap-1">
                <BotonOscuro aria-label="Paso anterior" disabled={recorrido.paso === 0} onClick={() => setRecorrido({ ...recorrido, paso: recorrido.paso - 1, reproduciendo: false })}><SkipBack className="h-4 w-4" /></BotonOscuro>
                {recorrido.reproduciendo
                  ? <BotonOscuro aria-label="Pausa" onClick={() => setRecorrido({ ...recorrido, reproduciendo: false })}><Pause className="h-4 w-4" /></BotonOscuro>
                  : recorrido.paso + 1 >= RECORRIDOS[recorrido.canal].pasos.length
                    ? <BotonOscuro onClick={() => setRecorrido({ ...recorrido, paso: 0, reproduciendo: true })}><RotateCw className="h-4 w-4" /> Repetir</BotonOscuro>
                    : <BotonOscuro aria-label="Seguir" onClick={() => setRecorrido({ ...recorrido, reproduciendo: true })}><Play className="h-4 w-4" /></BotonOscuro>}
                <BotonOscuro aria-label="Paso siguiente" disabled={recorrido.paso + 1 >= RECORRIDOS[recorrido.canal].pasos.length} onClick={() => setRecorrido({ ...recorrido, paso: recorrido.paso + 1, reproduciendo: false })}><SkipForward className="h-4 w-4" /></BotonOscuro>
                <div className="ml-2 flex gap-1.5">
                  {RECORRIDOS[recorrido.canal].pasos.map((_, i) => (
                    <span key={i} className={cn('h-1.5 w-6 rounded-full', i <= recorrido.paso ? 'bg-white/80' : 'bg-white/20')} />
                  ))}
                </div>
                <div className="ml-auto hidden gap-1 sm:flex">
                  {(Object.keys(RECORRIDOS) as Canal[]).filter(c => c !== recorrido.canal).map(c => (
                    <BotonOscuro key={c} onClick={() => verRecorrido(c)} className="text-slate-300">{RECORRIDOS[c].nombre.split(':')[0]} →</BotonOscuro>
                  ))}
                </div>
              </div>
            </div>
          )}

          {panelAbierto && (
            <PanelConcepto
              mapa={mapa}
              seleccion={seleccion!}
              editando={editando}
              onCambiarNodo={cambiarNodo}
              onCambiarFlecha={cambiarFlecha}
              onBorrar={borrar}
              onDuplicar={duplicar}
              onConectarDesde={id => setConectarDesde(id)}
              onSeleccion={setSeleccion}
              onIrAEstudio={irAEstudio}
              onCerrar={() => setSeleccion(null)}
            />
          )}

          {!seleccion && !editando && !recorrido && (
            <p className="pointer-events-none absolute bottom-3 right-3 z-0 hidden max-w-sm text-right text-[11px] text-slate-500 lg:block">
              Pincha un concepto para leerlo · arrastra el fondo para moverte · pellizca o Ctrl + rueda para acercar
            </p>
          )}
          <input ref={importar} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importarArchivo(f); e.target.value = ''; }} />
        </div>

        {/* Leyenda */}
        <div className="mx-auto mt-4 grid max-w-7xl gap-2 px-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { c: PALETA[0].color, t: 'Vigilia · por los sentidos físicos' },
            { c: PALETA[2].color, t: 'Sueño · por el hipercampo' },
            { c: PALETA[1].color, t: 'Meditación · percepción directa' },
            { c: PALETA[3].color, t: 'La matriz fundamental (lattice)' },
          ].map(l => (
            <div key={l.t} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              {/* The swatch is the colour the map uses: data from PALETA, not styling. */}
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: l.c }} /> {l.t}
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:col-span-2">
            <span className="h-0.5 w-8 shrink-0 bg-gradient-to-r from-cyan-200 via-white to-cyan-200" /> Línea que fluye: energía e información a través de la matriz
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:col-span-2">
            <span className="h-3 w-8 shrink-0 rounded-full border border-dashed border-pink-300/60 bg-[radial-gradient(circle,rgba(255,143,209,0.35),transparent)]" /> La malla de cada persona: su campo neuronal
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20">
        <h2 className="mb-2 text-3xl text-white" style={{ fontFamily: '"Cinzel", Georgia, serif' }}>Cómo funciona, en seis pasos</h2>
        <p className="mb-8 max-w-3xl leading-relaxed text-slate-300">
          La teoría de Grinberg, ordenada en las tres maneras en que interactúan dos seres conscientes y contada en palabras sencillas.
        </p>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PASOS.map((p, i) => (
            <li key={p.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span className="text-4xl text-violet-200/70" style={{ fontFamily: '"Cinzel", Georgia, serif' }}>{i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold text-white">{p.titulo}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{p.texto}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                {p.canal && (
                  <BotonTexto onClick={() => verRecorrido(p.canal!, true)} className="text-sm text-amber-200 underline-offset-4">
                    Ver la animación ▶
                  </BotonTexto>
                )}
                <BotonTexto onClick={() => verEnElMapa(p.nodo)} className="text-sm text-teal-200 underline-offset-4">
                  Verlo en el mapa ↑
                </BotonTexto>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Estudios ── */}
      <div className="mx-auto max-w-7xl px-4 pb-20">
        <Estudios />
      </div>

      <footer className="border-t border-white/10 px-4 py-10 text-center text-xs leading-relaxed text-slate-400">
        <p>
          Biografía y bibliografía: <a className="underline" href="https://psi-encyclopedia.spr.ac.uk/articles/jacobo-grinberg-zylberbaum/" target="_blank" rel="noopener noreferrer">Psi Encyclopedia (Society for Psychical Research)</a>.
          Cada estudio enlaza a su fuente arriba.
        </p>
        <p className="mt-2">
          Creado por {enSitio ? <Link to={inicioLuz} className="underline">Luz &amp; Humanidad</Link> : <a href={inicioLuz} className="underline">Luz &amp; Humanidad</a>} en{' '}
          <a href="https://humanity.wiki/conciencia" className="underline">humanity.wiki</a>. El mapa se puede editar; cada cambio guardado para todos queda en el historial.
        </p>
      </footer>

      {destello && (
        <style>{`[data-estudio="${destello.replace(/[^\w-]/g, '')}"] { box-shadow: 0 0 0 2px rgba(253,230,138,.8), 0 0 40px rgba(253,230,138,.25); }`}</style>
      )}

      {verBuzon && <BuzonMejoras onCerrar={() => setVerBuzon(false)} />}

      {verHistorial && (
        <Historial
          onCerrar={() => setVerHistorial(false)}
          onRestaurado={(datos, v) => {
            pasado.current.push(mapaRef.current);
            version.current = v;
            const d = vigente(datos) ? datos : clonar(MAPA_POR_DEFECTO);
            mapaRef.current = d;
            setMapa(d);
            setGuardado('listo');
            setVerHistorial(false);
          }}
        />
      )}
    </div>
  );
}

// ── The saved versions ──────────────────────────────────────────────────────

interface Copia { id: number; version: number; motivo: string; created_at: string; nodos: number; flechas: number; autor: string | null }

function Historial({ onCerrar, onRestaurado }: { onCerrar(): void; onRestaurado(datos: unknown, version: number): void }) {
  const [copias, setCopias] = useState<Copia[] | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/conciencia/mapa/historial', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setCopias)
      .catch(() => setError('No se ha podido cargar el historial.'));
  }, []);
  const restaurar = async (id: number) => {
    setOcupado(id);
    try {
      const r = await fetch(`/api/conciencia/historial/${id}/restaurar`, { method: 'POST', credentials: 'include' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido restaurar.');
      onRestaurado(j.datos, Number(j.version));
    } catch (e: any) { setError(e.message); } finally { setOcupado(null); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5 text-slate-100" onClick={e => e.stopPropagation()} role="dialog" aria-label="Versiones guardadas del mapa">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Versiones guardadas</h3>
          <BotonOscuro onClick={onCerrar} aria-label="Cerrar"><X className="h-4 w-4" /></BotonOscuro>
        </div>
        <p className="mb-4 text-xs text-slate-400">Se guarda una copia como mucho cada 10 minutos mientras alguien edita, y siempre antes de restaurar o volver al original. Restaurar también se puede deshacer.</p>
        {error && <p className="mb-3 text-sm text-rose-200">{error}</p>}
        {!copias && !error && <p className="text-sm text-slate-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando…</p>}
        {copias && !copias.length && <p className="text-sm text-slate-400">Todavía no hay copias: se crean al editar un mapa ya guardado.</p>}
        <ul className="space-y-2">
          {copias?.map(c => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <span>
                <span className="block">{fecha(c.created_at)?.toLocaleString('es-ES') ?? c.created_at}</span>
                <span className="block text-xs text-slate-400">{c.motivo} · {c.nodos} conceptos · {c.flechas} flechas{c.autor ? ` · ${c.autor}` : ''}</span>
              </span>
              <BotonOscuro onClick={() => restaurar(c.id)} disabled={ocupado !== null}>
                {ocupado === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Restaurar
              </BotonOscuro>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
