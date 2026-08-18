import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';
import {
  Gamepad2, Bot, X, FolderKanban, Smartphone, Maximize, UserPlus, Building2,
  Hammer, MessageCircle, Plus, Trash2, Camera, Sparkles, Paperclip, FileText,
  ZoomIn, ZoomOut, Palette, Bike, Plane, ChevronUp, ChevronDown, Footprints,
  ArrowLeft, LogOut, Wrench, Move, RotateCw, StickyNote, ImagePlus, Link2, Shapes,
  Info, Globe, Film, Music2, Map as MapaIcono, PenTool, ExternalLink,
  Menu, Sprout, Home, Users, Youtube, RefreshCw, Unplug, Play,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import {
  CATALOGO_PROPS, RELACIONES_HILO,
  nombreLimpio,
  type Agente, type Camara, type Cercania, type EntradaMando, type ItemMundo,
  type ItemProyecto, type OverrideMundo, type ProyectoJuego, type SeleccionHilo,
  type SeleccionMundo, type Vehiculo,
} from '../components/juego/tipos';
import MiniMapa, { VeloViaje } from '../components/juego/MiniMapa';
import EditorAspecto from '../components/juego/EditorAspecto';
import type { Aspecto } from '../components/juego/aspecto';
import Transicion, { type FaseTransicion } from '../components/juego/Transicion';
import type { DatosInterior } from '../components/juego/Interior';
import { PLAZA_ENTRADA, habitantesDeSala } from '../components/juego/planta';
import { posicionProyecto, posicionesProyectos, RADIO_EDIFICIO } from '../components/juego/mapa';
// Los colores del mundo viven en `paleta.ts`, fuera de las páginas: es como
// esta parte del proyecto cumple la regla de «ni un hex en src/pages».
import { PALETA } from '../components/juego/paleta';

// ============================================================================
// JUEGO VITAL — Fase 1 «Pasear tu vida» + builder tipo Los Sims (2026-08-18).
// Diseño en memory/10_JUEGO_VITAL.md.
//
// El jugador se planta donde quiere y CREA allí una persona real de su vida o
// un proyecto. Cada cosa creada es un AGENTE con memoria propia y su propia
// conversación: hablar con él es hablar con alguien que recuerda lo suyo.
// El robot y los agentes usan el asistente de siempre, pero con contexto de
// juego (`humanity:juego-contexto`), para que no responda como el asistente
// genérico de la plataforma.
//
// El motor 3D (~1 MB) se carga en diferido: quien no juega no lo descarga.
// ============================================================================

// Solo TIPOS del cine: un import de valor arrastraría three/drei al chunk
// principal (la escena va aparte con lazy()).
import type { CategoriaCine, VideoCine } from '../components/juego/Cine';

const Escena = lazy(() => import('../components/juego/Escena'));
// PDF.js pesa: solo se baja la primera vez que se abre un PDF.
const VisorPdf = lazy(() => import('../components/juego/VisorPdf'));

/** El color del edificio de un proyecto, que es también el de su interior. */
const PALETA_PROYECTO = PALETA.edificiosProyecto;

/** Si un proyecto no trae grupos, al menos tiene una habitación donde entrar. */
const GRUPOS_MINIMOS = [{ id: 'todo', label: 'Todo', color: PALETA.robotLuz }];

/**
 * Todo lo que la IA necesita saber para responder como si estuviera aquí:
 * dónde estás, qué hay en tu mundo y, si estás dentro de un proyecto, en qué
 * habitación y qué hay en ella.
 */
function contextoJuego(interior: DatosInterior | null, agentes: Agente[], proyectos: ProyectoJuego[], mundoItems: ItemMundo[]) {
  const grupo = interior?.sala ? interior.grupos.find(g => g.id === interior.sala) : null;
  return {
    mundo: interior ? 'interior_de_proyecto' : 'aldea',
    agentes: agentes.map(a => ({
      id: a.id, tipo: a.tipo, nombre: a.nombre, conversation_id: a.conversation_id,
      // De qué proyectos FORMA PARTE: así la IA sabe quién está ya dentro.
      en_proyectos: a.proyecto_ids?.length ? a.proyecto_ids : undefined,
    })),
    proyectos_reales: proyectos.map(p => ({ id: p.id, titulo: p.titulo, tareas: p.tarjetas, hechas: p.hechas })),
    // Lo plantado en el mapa: la IA puede leerlo («¿qué notas tengo?») y
    // saber dónde está cada cosa.
    plantado_en_el_mapa: mundoItems.length ? mundoItems.map(it => ({
      tipo: it.tipo,
      resumen: it.tipo === 'nota' ? (it.texto || '').slice(0, 90)
        : it.tipo === 'prop' ? it.modelo : (it.nombre || ''),
      x: Math.round(it.x), z: Math.round(it.z),
    })) : undefined,
    vacio: agentes.length === 0 && proyectos.length === 0,
    // Dónde está el jugador AHORA MISMO. Es lo que da sentido a «esta sala».
    dentro: interior ? {
      proyecto: { id: interior.proyecto.id, titulo: interior.proyecto.titulo, slug: interior.proyecto.slug },
      habitaciones: interior.grupos.map(g => ({ id: g.id, label: g.label })),
      sala_actual: grupo ? { id: grupo.id, label: grupo.label } : null,
      cosas_en_la_sala: grupo
        ? interior.items.filter(i => i.grupo === grupo.id).map(i => ({ titulo: i.titulo, estado: i.estado }))
        : null,
      // Quién está YA de pie en esta habitación. Sirve para no meter dos veces
      // a la misma persona cuando el jugador lo pide otra vez.
      personas_en_la_sala: grupo
        ? habitantesDeSala(interior.items, grupo.id, agentes, interior.proyecto.id).map(a => ({ id: a.id, nombre: a.nombre }))
        : null,
    } : null,
  };
}

/** Identifica lo que tienes al lado, para recordar qué has rechazado. */
const claveCercania = (c: Cercania) =>
  c === null ? '' : c.tipo === 'robot' ? 'robot' : c.tipo === 'agente' ? `a:${c.agente.id}` : `p:${c.proyecto.id}`;

const FRASES_ROBOT = [
  'Aquí estoy. Puedo hacerte la entrevista fundacional para llenar tu mundo, o construir lo que me pidas. Escríbeme abajo.',
  '¿Ves los edificios? Son tus proyectos reales — crecen cuando completas tareas de verdad. Pídeme lo que quieras.',
  'Puedo buscar en internet, crear documentos y levantar cosas en tu mundo. Tú dirás.',
];

export default function JuegoVital() {
  const { user, updateUiSettings } = useAuth();
  const navigate = useNavigate();
  const entrada = useRef<EntradaMando>({ x: 0, z: 0, y: 0, turbo: false, salto: false });
  // Hacia dónde mira la cámara. `yaw` 0 es la vista clásica por encima del
  // hombro; `pitch` 0,63 es la altura de siempre (11 arriba, 15 detrás).
  const camara = useRef<Camara>({ yaw: 0, pitch: 0.63 });
  // Posición del jugador, compartida con la escena: es donde se PLANTA lo que
  // se construye (como en Los Sims: te pones y creas ahí).
  const jugadorPos = useMemo(() => new THREE.Vector3(0, 0, 17), []);
  const [proyectos, setProyectos] = useState<ProyectoJuego[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [cercania, setCercania] = useState<Cercania>(null);
  const [panel, setPanel] = useState<ProyectoJuego | null>(null);
  const [fichaAgente, setFichaAgente] = useState<Agente | null>(null);
  const [bocadillo, setBocadillo] = useState<string | null>(null);
  const [construyendo, setConstruyendo] = useState<'persona' | 'proyecto' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Viaje rápido desde el mapa: la escena lee este destino y coloca al
  // jugador; el velo tapa el salto y la cámara hace el resto.
  const destinoViaje = useRef<{ x: number; z: number } | null>(null);
  const [viajando, setViajando] = useState<string | null>(null);
  // Distancia de la cámara: 1 = por encima del hombro, 6 = media aldea a la vista.
  const zoom = useRef(1);
  const [zoomVisible, setZoomVisible] = useState(1);
  // Tu aspecto vive en tus ajustes de usuario; el de cada persona, en su
  // propia `apariencia`. Quién editas ahora mismo: 'jugador' o un agente.
  // --- Dentro de un proyecto (2026-08-18, petición de Eugenio: «como en
  // Pokémon, una transición y un escenario nuevo»). `interior` manda: si está
  // puesto, la aldea deja de dibujarse y se juega dentro del edificio.
  const [interior, setInterior] = useState<DatosInterior | null>(null);
  const [transicion, setTransicion] = useState<FaseTransicion>(null);
  const [rotuloTransicion, setRotuloTransicion] = useState('');
  const [colorTransicion, setColorTransicion] = useState('#7ba8c9');
  /** Lo que se aplicará cuando la pantalla esté tapada del todo. */
  const alCubrir = useRef<(() => void) | null>(null);
  const interiorRef = useRef<DatosInterior | null>(null);
  interiorRef.current = interior;

  // Cómo te mueves: a pie, en bici o en el planeador (petición de Eugenio).
  const [vehiculo, setVehiculo] = useState<Vehiculo>('pie');
  const alturaVuelo = useRef(0);
  const [alturaVisible, setAlturaVisible] = useState(0);
  // Subir/bajar tiene DOS mandos que se suman: el teclado (mantener pulsado) y
  // los botones de pantalla (pulsar y se queda). En el móvil no se puede estar
  // sujetando un botón mientras se conduce con el otro pulgar, así que ahí lo
  // natural es que quede fijado hasta volver a pulsarlo.
  const mandoY = useRef({ teclado: 0, boton: 0 });
  const [subiendo, setSubiendo] = useState(0);
  const recalcularY = useCallback(() => {
    const m = mandoY.current;
    entrada.current.y = Math.max(-1, Math.min(1, m.teclado + m.boton));
  }, []);
  const fijarSubida = useCallback((v: number) => {
    mandoY.current.boton = mandoY.current.boton === v ? 0 : v;
    setSubiendo(mandoY.current.boton);
    recalcularY();
  }, [recalcularY]);
  const [editandoAspecto, setEditandoAspecto] = useState<'jugador' | Agente | null>(null);
  const [aspectoBorrador, setAspectoBorrador] = useState<Aspecto>({});
  const [guardandoAspecto, setGuardandoAspecto] = useState(false);
  const miAspecto: Aspecto = (user?.uiSettings?.juegoAspecto as Aspecto) || {};
  const ajustarZoom = useCallback((factor: number) => {
    zoom.current = Math.min(6, Math.max(0.6, zoom.current * factor));
    setZoomVisible(zoom.current);
  }, []);
  const cercaniaRef = useRef<Cercania>(null);
  cercaniaRef.current = cercania;
  // Qué hay abierto ahora mismo, legible desde fuera de React (el teclado).
  const abiertos = useRef({ aspecto: false, construyendo: false, ficha: false, panel: false, bocadillo: false });
  abiertos.current = {
    aspecto: !!editandoAspecto, construyendo: !!construyendo,
    ficha: !!fichaAgente, panel: !!panel, bocadillo: !!bocadillo,
  };
  /** De qué acabas de decir «ahora no»: no se te vuelve a abrir sin alejarte. */
  const rechazado = useRef<string | null>(null);
  const agentesRef = useRef<Agente[]>([]);
  agentesRef.current = agentes;
  const proyectosRef = useRef<ProyectoJuego[]>([]);
  proyectosRef.current = proyectos;

  // --- El mundo editable: un Miro en 3D (2026-08-18, petición de Eugenio) ---
  const [mundoItems, setMundoItems] = useState<ItemMundo[]>([]);
  const [overridesMundo, setOverridesMundo] = useState<OverrideMundo[]>([]);
  const overridesRef = useRef<OverrideMundo[]>([]);
  overridesRef.current = overridesMundo;
  const [selMundo, setSelMundo] = useState<SeleccionMundo | null>(null);
  const [moviendoMundo, setMoviendoMundo] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [crearEn, setCrearEn] = useState<{ x: number; z: number } | null>(null);
  const [leyendo, setLeyendo] = useState<ItemMundo | null>(null);
  const [notaBorrador, setNotaBorrador] = useState('');
  /** Mini-formulario del panel de crear: link, vídeo, música, lienzo o mapa. */
  const [formCrear, setFormCrear] = useState<{ tipo: 'enlace' | 'video' | 'musica' | 'lienzo' | 'mapa'; url: string; nombre: string } | null>(null);
  /** Dónde plantar el edificio si el proyecto se crea desde el suelo. */
  const posProyecto = useRef<{ x: number; z: number } | null>(null);
  /** Las instrucciones del teclado, comprimidas en el icono ℹ️ (petición de Eugenio). */
  const [ayudaVisible, setAyudaVisible] = useState(false);

  // --- La gran pantalla de YouTube (2026-08-18, petición de Eugenio) ---
  /** El panel del cine está abierto. */
  const [pantallaYT, setPantallaYT] = useState(false);
  /** {configurado, conectado, canal} de GET /api/youtube/estado. */
  const [ytEstado, setYtEstado] = useState<{ configurado: boolean; conectado: boolean; canal: { titulo: string | null; foto: string | null } | null } | null>(null);
  /** {relacionados, recientes, proyectos} o {error}. */
  const [ytRecs, setYtRecs] = useState<any>(null);
  const [ytCargando, setYtCargando] = useState(false);

  const cargarRecsYT = useCallback(async () => {
    setYtCargando(true);
    try {
      const r = await fetch('/api/youtube/recomendaciones', { credentials: 'include' });
      setYtRecs(await r.json());
    } catch { setYtRecs({ error: 'No se pudieron pedir las recomendaciones.' }); }
    setYtCargando(false);
  }, []);

  const abrirPantallaYT = useCallback(async () => {
    setPantallaYT(true);
    try {
      const e = await fetch('/api/youtube/estado', { credentials: 'include' }).then(r => r.json());
      setYtEstado(e);
      if (e.conectado) cargarRecsYT();
    } catch { setYtEstado({ configurado: false, conectado: false, canal: null }); }
  }, [cargarRecsYT]);

  /** El OAuth va en una ventanita; cuando termina, avisa por postMessage. */
  useEffect(() => {
    const oir = (ev: MessageEvent) => {
      if (ev.data === 'youtube:conectado') abrirPantallaYT();
    };
    window.addEventListener('message', oir);
    return () => window.removeEventListener('message', oir);
  }, [abrirPantallaYT]);

  const conectarYT = useCallback(() => {
    window.open('/api/youtube/conectar', 'ytoauth', 'width=520,height=680,menubar=no,toolbar=no');
  }, []);

  const desconectarYT = useCallback(async () => {
    await fetch('/api/youtube/desconectar', { method: 'POST', credentials: 'include' });
    setYtRecs(null);
    abrirPantallaYT();
  }, [abrirPantallaYT]);
  /** El hilo señalado: su editor deja cambiar relación y texto, como en los grafos. */
  const [selHilo, setSelHilo] = useState<SeleccionHilo | null>(null);
  /** Lo elegido en el MENÚ de crear, esperando a que pulses el suelo. */
  const [plantando, setPlantando] = useState<(Partial<ItemMundo> & { tipo: ItemMundo['tipo'] }) | null>(null);
  /** El menú lateral de crear (diseño del menú de objetivos del mapa). */
  const [menuColapsado, setMenuColapsado] = useState(true);
  const [menuPeek, setMenuPeek] = useState(false);
  const [catAbierta, setCatAbierta] = useState<string | null>(null);
  const [subAbierto, setSubAbierto] = useState<string | null>(null);
  const [docsExistentes, setDocsExistentes] = useState<any[] | null>(null);
  /** El formulario del menú (link, vídeo, música, grafo, mapa). */
  const [formMenu, setFormMenu] = useState<{ tipo: string; url: string; nombre: string } | null>(null);
  /** Adónde va lo subido: 'crear' lo planta ya; 'plantar' espera el clic al suelo. */
  const subirDestino = useRef<'crear' | 'plantar'>('crear');
  // Cerrar el panel de crear tira también su mini-formulario: si no, al
  // reabrirlo en otro sitio aparecería el formulario a medias de antes.
  useEffect(() => { if (!crearEn) setFormCrear(null); }, [crearEn]);
  const movilRef = useRef<{ x: number; z: number } | null>(null);
  const archivoMundoRef = useRef<HTMLInputElement>(null);
  /** Su gemelo para canciones (accept audio): comparte subirAlMundo. */
  const audioMundoRef = useRef<HTMLInputElement>(null);
  const subiendoComo = useRef<'imagen' | 'documento' | 'musica'>('imagen');
  // Lo que el teclado y los clics 3D necesitan leer sin re-suscribirse.
  // Sin modo edición: pulsar un objeto abre sus opciones directamente
  // (petición de Eugenio). `activo` solo dice si hay sesión.
  const editorRef = useRef({ activo: false, conectando: false, moviendo: false, sel: null as SeleccionMundo | null });
  editorRef.current = { activo: !!user, conectando, moviendo: moviendoMundo, sel: selMundo };
  /** Pinchado pero aún sin arrastrar: candidato a mover (o a ser solo un clic). */
  const agarre = useRef<{ sel: SeleccionMundo; x: number; y: number } | null>(null);
  /** El arrastre está EN MARCHA: al soltar el botón se guarda donde caiga. */
  const arrastrando = useRef(false);
  const leyendoRef = useRef<ItemMundo | null>(null);
  leyendoRef.current = leyendo;
  const crearEnRef = useRef<{ x: number; z: number } | null>(null);
  crearEnRef.current = crearEn;
  const selHiloRef = useRef<SeleccionHilo | null>(null);
  selHiloRef.current = selHilo;

  const [tactil] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0));

  // Mobile plays in LANDSCAPE (Eugenio, 2026-08-18: "como en COD Mobile").
  const [vertical, setVertical] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const alCambiar = () => setVertical(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  const jugarHorizontal = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      await (screen.orientation as any)?.lock?.('landscape');
    } catch { /* iOS no permite bloquear: queda el aviso de girar */ }
  };

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(null), 4000); };

  // --- datos del mundo -------------------------------------------------------
  const cargarAgentes = useCallback(async () => {
    try {
      const filas = await fetch('/api/juego/agentes', { credentials: 'include' }).then(r => r.json());
      if (Array.isArray(filas)) {
        setAgentes(filas.map((f: any): Agente => ({
          ...f,
          apariencia: f.apariencia || {},
          memoria: Array.isArray(f.memoria) ? f.memoria : [],
          x: Number(f.x) || 0, z: Number(f.z) || 0,
        })));
      }
    } catch { /* mundo vacío si falla */ }
  }, []);

  const cargarMundo = useCallback(async () => {
    try {
      const j = await fetch('/api/juego/mundo', { credentials: 'include' }).then(r => r.json());
      if (Array.isArray(j?.items)) {
        setMundoItems(j.items.map((it: any) => ({ ...it, enlaces: Array.isArray(it.enlaces) ? it.enlaces : [] })));
      }
      if (Array.isArray(j?.overrides)) setOverridesMundo(j.overrides);
    } catch { /* el mundo se juega igual sin editar */ }
  }, []);

  // Fetch directo justificado: solo esta página lo usa y va parametrizado
  // por la sesión (misma excepción que /api/explorer en el mapa). SIN límite:
  // el distrito ya recorta a 12 por su cuenta, pero los portales con forma
  // necesitan encontrar SU proyecto aunque sea el número 13.
  const cargarProyectos = useCallback(async () => {
    if (!user) return;
    try {
      const filas = await fetch('/api/proyectos', { credentials: 'include' }).then(r => r.json());
      if (!Array.isArray(filas)) return;
      setProyectos(filas
        .filter((f: any) => f.creador_user_id === user.id)
        .map((f: any): ProyectoJuego => ({
          id: f.id, slug: f.slug, titulo: f.titulo, descripcion: f.descripcion,
          tarjetas: Number(f.tarjetas) || 0, hechas: Number(f.hechas) || 0, publico: !!f.publico,
          // Los grupos del tablero: dentro del edificio son sus habitaciones.
          grupos: Array.isArray(f.grupos) ? f.grupos : undefined,
        })));
    } catch { setProyectos([]); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    cargarAgentes();
    cargarMundo();
    cargarProyectos();
  }, [user, cargarAgentes, cargarMundo, cargarProyectos]);

  // --- conversación: quién habla --------------------------------------------
  /** Manda al asistente el estado del mundo y con quién se habla. */
  /**
   * Abre el chat con alguien. `enfocar` decide si además se lleva el teclado
   * al cuadro de escribir.
   *
   * Cuando la conversación se abre por un CHOQUE no se enfoca, y es
   * importante: con el cursor dentro del chat, las teclas de andar cuentan
   * como escritura y te quedabas encerrado en la ficha de la persona con la
   * que te habías tropezado (fallo reportado por Eugenio).
   */
  const mundoItemsRef = useRef<ItemMundo[]>([]);
  const hablarCon = useCallback((agente: Agente | null, enfocar = true) => {
    window.dispatchEvent(new CustomEvent('humanity:juego-contexto', {
      detail: { ...contextoJuego(interiorRef.current, agentesRef.current, proyectos, mundoItemsRef.current), agente },
    }));
    if (enfocar) window.dispatchEvent(new CustomEvent('humanity:asistente-focus'));
  }, [proyectos]);

  /**
   * El contexto del juego se manda SIEMPRE que cambia dónde estás, no solo al
   * hablar con alguien.
   *
   * Antes solo se enviaba desde `hablarCon`, así que si escribías directamente
   * en la barra del chat sin haber hablado con nadie, el asistente contestaba
   * como el asistente genérico de la plataforma y no sabía ni que estabas en
   * el juego (fallo reportado por Eugenio: pidió «añade a Gala como persona en
   * esta sala» y preguntó «¿qué sala?»).
   */
  useEffect(() => {
    if (!user) return;
    window.dispatchEvent(new CustomEvent('humanity:juego-contexto', {
      detail: contextoJuego(interior, agentes, proyectos, mundoItems),
    }));
  }, [user, interior, agentes, proyectos, mundoItems]);

  // La lista lateral del chat pide hablar con alguien: si es un agente, se
  // cambia de interlocutor sin tener que caminar hasta él.
  useEffect(() => {
    const alHablar = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      const a = id === 'robot' ? null : agentesRef.current.find(x => x.id === id) || null;
      hablarCon(a);
    };
    window.addEventListener('humanity:juego-hablar', alHablar);
    return () => window.removeEventListener('humanity:juego-hablar', alHablar);
  }, [hablarCon]);

  // El asistente devuelve el hilo usado y lo que quiere crear en el mundo.
  useEffect(() => {
    const alResponder = async (e: Event) => {
      const { conversation_id, acciones } = (e as CustomEvent).detail || {};
      // Fija el hilo del agente con el que se está hablando (o del robot).
      const actual = cercaniaRef.current;
      if (conversation_id && actual?.tipo === 'agente' && !actual.agente.conversation_id) {
        await fetch(`/api/juego/agentes/${actual.agente.id}/conversacion`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id }),
        }).catch(() => {});
      }
      // Lo que la IA propone crear se crea de verdad, junto al jugador.
      const dentro = interiorRef.current;
      for (const [i, a] of (acciones || []).entries()) {
        // «Mete a Anita en esta sala»: se ENLAZA con la Anita que ya existe en
        // tu mundo y aparece su avatar de verdad. Nunca se duplica a nadie
        // (fallo reportado por Eugenio: la IA le creó una Anita nueva).
        if (a.tipo === 'habitante' && dentro) {
          await meterPersonaEnSala(a.grupo || dentro.sala || dentro.grupos[0]?.id, {
            agente_id: a.agente_id, nombre: a.nombre, rol: a.rol, descripcion: a.descripcion,
          }).catch(() => {});
          continue;
        }
        // Dentro de un proyecto se construye en su TABLERO: una tarjeta en el
        // grupo que corresponde, que es la habitación en la que estás.
        if (a.tipo === 'tarjeta' && dentro) {
          await crearTarjeta(a.grupo || dentro.sala || dentro.grupos[0]?.id, a.nombre, a.descripcion).catch(() => {});
          continue;
        }
        // «Apúntame esto en una nota»: la IA clava una nota en el suelo, junto
        // al jugador, como las que él planta a mano en el modo edición.
        if (a.tipo === 'nota' && !dentro) {
          const texto = [a.nombre, a.descripcion].filter(Boolean).join('\n');
          const r = await fetch('/api/juego/mundo', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: 'nota', texto,
              x: jugadorPos.x + 3 + (i % 2) * 2, z: jugadorPos.z - 3 - Math.floor(i / 2) * 3,
            }),
          }).catch(() => null);
          if (r?.ok) {
            const nuevo = await r.json();
            setMundoItems(prev => [...prev, { ...nuevo, enlaces: [] }]);
          }
          continue;
        }
        await crearAgente({
          tipo: a.tipo, nombre: a.nombre, rol: a.rol, descripcion: a.descripcion,
          dx: (i % 2 === 0 ? 4 : -4), dz: -4 - Math.floor(i / 2) * 5,
        }).catch(() => {});
      }
      if (acciones?.length) {
        avisar(`${acciones.length === 1 ? 'Creado' : 'Creados'} en tu mundo: ${acciones.map((a: any) => a.nombre).join(', ')}.`);
      }
    };
    window.addEventListener('humanity:juego-respuesta', alResponder);
    return () => window.removeEventListener('humanity:juego-respuesta', alResponder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- construir -------------------------------------------------------------
  const crearAgente = async (d: {
    tipo: 'persona' | 'proyecto'; nombre: string; rol?: string; descripcion?: string;
    foto_url?: string; dx?: number; dz?: number;
    /** Sitio exacto de la aldea. Hace falta cuando creas desde DENTRO de un
     *  edificio: allí tu posición son coordenadas de la sala, no del mapa. */
    x?: number; z?: number;
  }) => {
    const r = await fetch('/api/juego/agentes', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...d,
        // Se planta delante del jugador, donde está mirando el mundo.
        x: d.x ?? (jugadorPos.x + (d.dx ?? (Math.random() * 6 - 3))),
        z: d.z ?? (jugadorPos.z + (d.dz ?? -5)),
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'No se ha podido crear.');
    await cargarAgentes();
    return j;
  };

  // ------------------------------------------------------------------------
  // El editor del mundo: crear, mover, girar, cambiar diseño, eliminar y
  // conectar (petición de Eugenio: «un Miro en 3D con una UI genial»).
  // ------------------------------------------------------------------------

  const salirDelEditor = useCallback(() => {
    setSelMundo(null);
    setMoviendoMundo(false);
    setConectando(false);
    setCrearEn(null);
    movilRef.current = null;
  }, []);

  /** Guarda un retoque de una pieza del pueblo y lo refleja al momento. */
  const guardarOverride = useCallback(async (seed_id: string, patch: Partial<OverrideMundo>) => {
    setOverridesMundo(prev => {
      const otro = prev.find(o => o.seed_id === seed_id);
      const nuevo: OverrideMundo = {
        seed_id,
        eliminado: patch.eliminado ?? otro?.eliminado ?? false,
        x: patch.x ?? otro?.x ?? null,
        z: patch.z ?? otro?.z ?? null,
        rot: patch.rot ?? otro?.rot ?? null,
        modelo: patch.modelo ?? otro?.modelo ?? null,
      };
      return [...prev.filter(o => o.seed_id !== seed_id), nuevo];
    });
    const r = await fetch('/api/juego/mundo/semilla', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed_id, ...patch }),
    }).catch(() => null);
    if (!r?.ok) avisar('No se ha podido guardar el retoque.');
  }, []);

  // La PORTADA de un portal del distrito: la foto viaja en `modelo` del
  // retoque `proy:<id>` (para las casas es el diseño; aquí, la URL de la foto).
  const portadaProyRef = useRef<HTMLInputElement>(null);
  const [subiendoPortadaProy, setSubiendoPortadaProy] = useState(false);
  const subirPortadaProyecto = async (f?: File) => {
    if (!f || !panel) return;
    setSubiendoPortadaProy(true);
    try {
      const s = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: f,
      });
      const js = await s.json();
      if (!s.ok || !js.url) { avisar(js.error || 'No se ha podido subir la foto.'); return; }
      if (!js.esImagen) { avisar('La portada tiene que ser una imagen (JPG o PNG).'); return; }
      await guardarOverride(`proy:${panel.id}`, { modelo: js.url });
      avisar('Portada puesta en el portal.');
    } catch {
      avisar('Error de red al subir la foto.');
    } finally {
      setSubiendoPortadaProy(false);
    }
  };

  // Renombrar el proyecto desde su portal (petición de Eugenio): cambia el
  // título REAL del proyecto — el portal, el distrito y la página /proyectos
  // enseñan el mismo nombre.
  const [renombrandoProy, setRenombrandoProy] = useState(false);
  const [nombreProyBorrador, setNombreProyBorrador] = useState('');
  // Al cambiar (o cerrarse) el panel, el modo renombrar no se queda pegado.
  useEffect(() => { setRenombrandoProy(false); }, [panel?.id]);
  const renombrarProyecto = async () => {
    const titulo = nombreProyBorrador.trim();
    if (!titulo || !panel) return;
    const r = await fetch(`/api/proyectos/${panel.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo }),
    }).catch(() => null);
    if (!r?.ok) { avisar('No se ha podido cambiar el nombre.'); return; }
    setProyectos(prev => prev.map(p => (p.id === panel.id ? { ...p, titulo } : p)));
    setPanel(p => (p ? { ...p, titulo } : p));
    setRenombrandoProy(false);
  };

  /**
   * Convierte el OBJETO seleccionado en un portal SIN cambiarle la forma
   * (aclaración de Eugenio): el objeto se queda tal cual, con su nombre en
   * verde encima, y atravesarlo lleva a su mapa nuevo.
   */
  const convertirItemEnPortal = async () => {
    if (!selMundo || selMundo.clase !== 'item') return;
    const r = await fetch(`/api/juego/mundo/${selMundo.id}/convertir-en-portal`, {
      method: 'POST', credentials: 'include',
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) { avisar(j?.error || 'No se ha podido convertir en portal.'); return; }
    setMundoItems(prev => prev.map(it => (it.id === selMundo.id ? { ...it, portal_proyecto_id: j.portal_proyecto_id } : it)));
    setSelMundo(null);
    await cargarProyectos();
    avisar('¡Ya es un portal! Atraviésalo para entrar en su mapa.');
  };

  /** Igual, para una PIEZA del pueblo (el camión camper, una casa, el pozo…). */
  const convertirPiezaEnPortal = async () => {
    if (!selMundo || selMundo.clase !== 'semilla') return;
    const r = await fetch('/api/juego/mundo/semilla/convertir-en-portal', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed_id: selMundo.id, titulo: selMundo.etiqueta }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) { avisar(j?.error || 'No se ha podido convertir en portal.'); return; }
    setSelMundo(null);
    await Promise.all([cargarMundo(), cargarProyectos()]);
    avisar('¡Ya es un portal! Atraviésalo para entrar en su mapa.');
  };

  /** Entra en el mapa de un portal con forma desde su ficha. */
  const entrarPorPortal = (proyectoId: string | null | undefined) => {
    const p = proyectos.find(x => x.id === proyectoId);
    if (!p) { avisar('No encuentro su mapa. Prueba a recargar.'); return; }
    setSelMundo(null);
    setFichaAgente(null);
    entrarEnProyecto(p);
  };

  /** Quita el PORTAL del mapa (retoque eliminado). El proyecto NO se borra:
   *  sigue en la página de Proyectos con todo lo suyo. */
  const quitarPortalDelMapa = async () => {
    if (!panel) return;
    await guardarOverride(`proy:${panel.id}`, { eliminado: true });
    setPanel(null);
    avisar('Portal quitado del mapa. El proyecto sigue en tu página de Proyectos.');
  };

  /** Cambia un objeto del jugador y lo refleja al momento. */
  const guardarItem = useCallback(async (id: string, patch: Partial<ItemMundo>) => {
    setMundoItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
    const r = await fetch(`/api/juego/mundo/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!r?.ok) avisar('No se ha podido guardar el cambio.');
  }, []);

  /** Planta un objeto nuevo donde se pulsó el suelo. */
  const crearItemMundo = useCallback(async (d: Partial<ItemMundo> & { tipo: ItemMundo['tipo'] }, punto?: { x: number; z: number }) => {
    const donde = punto || crearEn || { x: jugadorPos.x + 3, z: jugadorPos.z - 3 };
    setCrearEn(null);
    // Dentro de la plaza de un proyecto, lo creado se ancla a ESE proyecto.
    const proyectoAncla = interiorRef.current?.proyecto.id ?? null;
    const r = await fetch('/api/juego/mundo', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, x: donde.x, z: donde.z, proyecto_id: proyectoAncla }),
    }).catch(() => null);
    if (!r?.ok) { avisar('No se ha podido crear.'); return; }
    const nuevo = await r.json();
    setMundoItems(prev => [...prev, { ...nuevo, enlaces: [] }]);
  }, [crearEn, jugadorPos]);

  /**
   * Pinchar y ARRASTRAR mueve el objeto (petición de Eugenio). El agarre llega
   * del lienzo al pinchar; si el ratón recorre más de 8 px, empieza el
   * arrastre: el original se oculta, un fantasma sigue al ratón por el suelo y
   * al soltar el botón se guarda donde caiga. Si no llega a arrastre, es un
   * clic y abre las opciones (lo gestiona el onClick de siempre).
   */
  const alAgarrarMundo = useCallback((sel: SeleccionMundo, punto: { x: number; y: number }) => {
    if (!user) return;
    agarre.current = { sel, ...punto };
  }, [user]);

  // --- Soltar un objeto SOBRE un edificio lo guarda EN ese proyecto ---------
  // (petición de Eugenio, 2026-08-18): arrastras un vídeo, una nota o un PDF
  // hasta un edificio y se convierte en una TARJETA de ese proyecto — aparece
  // en su tablero y flotando dentro del edificio. El objeto sale del mapa
  // (se archiva): se ha mudado adentro, no se ha copiado.

  /** Los tipos que son conocimiento y pueden mudarse a un proyecto. */
  const MUDABLES = useMemo(() => new Set(['nota', 'imagen', 'documento', 'enlace', 'video', 'musica', 'lienzo', 'mapa']), []);

  /** ¿Qué edificio de proyecto hay en este punto del suelo? Mira los del
   *  distrito y también los construidos desde el juego (agentes). */
  const proyectoEnPunto = useCallback((px: number, pz: number): ProyectoJuego | null => {
    if (interiorRef.current) return null;   // dentro de una plaza no hay portales
    const R = RADIO_EDIFICIO + 0.8;
    const lista = proyectosRef.current;
    const posiciones = posicionesProyectos(lista, overridesRef.current);
    for (let i = 0; i < Math.min(lista.length, 12); i++) {
      const pos = posiciones[i];
      if (Math.hypot(px - pos.x, pz - pos.z) < R) return lista[i];
    }
    for (const a of agentesRef.current) {
      if (a.tipo === 'proyecto' && a.proyecto_id && Math.hypot(px - a.x, pz - a.z) < R) {
        const p = lista.find(x => x.id === a.proyecto_id);
        if (p) return p;
      }
    }
    return null;
  }, []);

  const guardarEnProyecto = useCallback(async (itemId: string, p: ProyectoJuego) => {
    const it = mundoItemsRef.current.find(x => x.id === itemId);
    if (!it) return;
    const generico = ({ imagen: 'Imagen', documento: 'Documento', enlace: 'Enlace', video: 'Vídeo', musica: 'Música', lienzo: 'Lienzo', mapa: 'Mapa' } as Record<string, string>)[it.tipo] || 'Elemento';
    const titulo = it.tipo === 'nota'
      ? ((it.texto || '').split('\n')[0].slice(0, 60) || 'Nota')
      : nombreLimpio(it.nombre, generico);
    // La tarjeta lleva el contenido en bloques: la habitación del edificio
    // pinta `imagen` como foto flotante y `texto` como lámina.
    const bloques: Array<{ tipo: string; texto?: string; url?: string; pie?: string }> = [];
    if (it.tipo === 'nota' && it.texto) bloques.push({ tipo: 'texto', texto: it.texto });
    if (it.tipo === 'imagen' && it.url) bloques.push({ tipo: 'imagen', url: it.url, pie: titulo });
    if (it.tipo === 'video' && it.url) {
      const vid = it.url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
      if (vid) bloques.push({ tipo: 'imagen', url: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`, pie: titulo });
    }
    if (it.tipo !== 'nota' && it.tipo !== 'imagen' && it.url) bloques.push({ tipo: 'texto', texto: it.url });
    const grupo = p.grupos?.find(g => g.id === 'contenido')?.id || p.grupos?.[0]?.id || 'contenido';
    const r = await fetch('/api/roadmap', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: p.id, grupo, titulo, resumen: it.tipo !== 'nota' ? it.url : null, bloques }),
    }).catch(() => null);
    if (!r?.ok) {
      const j = await r?.json().catch(() => null);
      avisar(j?.error || `No se ha podido guardar en «${p.titulo}».`);
      return;
    }
    await fetch(`/api/juego/mundo/${itemId}/archivar`, { method: 'POST', credentials: 'include' }).catch(() => null);
    setMundoItems(prev => prev.filter(x => x.id !== itemId));
    setSelMundo(null);
    avisar(`Guardado en «${p.titulo}»: está en su tablero y dentro del edificio.`);
  }, []);
  const guardarEnProyectoRef = useRef(guardarEnProyecto);
  guardarEnProyectoRef.current = guardarEnProyecto;
  const proyectoEnPuntoRef = useRef(proyectoEnPunto);
  proyectoEnPuntoRef.current = proyectoEnPunto;
  const mudablesRef = useRef(MUDABLES);
  mudablesRef.current = MUDABLES;

  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const a = agarre.current;
      if (!a || arrastrando.current) return;
      if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 8) return;
      // Empieza el arrastre de verdad
      arrastrando.current = true;
      movilRef.current = { x: a.sel.x, z: a.sel.z };
      setSelMundo(a.sel);
      setCrearEn(null);
      setConectando(false);
      setMoviendoMundo(true);
    };
    const soltar = () => {
      if (arrastrando.current) {
        const sel = editorRef.current.sel;
        const p = movilRef.current;
        if (sel && p) {
          // Soltarlo SOBRE un edificio de proyecto = guardarlo EN ese proyecto
          // (solo el conocimiento: una roca no es una tarjeta).
          const proy = sel.clase === 'item' && mudablesRef.current.has(sel.tipo)
            ? proyectoEnPuntoRef.current(p.x, p.z)
            : null;
          if (proy) {
            guardarEnProyectoRef.current(sel.id, proy);
          } else {
            if (sel.clase === 'item') guardarItem(sel.id, { x: p.x, z: p.z });
            else if (sel.id.startsWith('agente:')) guardarPosAgenteRef.current(sel.id.slice(7), p.x, p.z);
            else guardarOverride(sel.id, { x: p.x, z: p.z, eliminado: false });
            // Un portal no tiene ficha de opciones: se suelta y listo.
            setSelMundo(sel.tipo === 'portal' ? null : { ...sel, x: p.x, z: p.z });
          }
        }
        setMoviendoMundo(false);
        movilRef.current = null;
        arrastrando.current = false;
      }
      agarre.current = null;
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [guardarItem, guardarOverride]);

  /** Un portal construido desde el juego se mueve guardando su agente. */
  const guardarPosAgente = useCallback(async (id: string, x: number, z: number) => {
    setAgentes(prev => prev.map(a => (a.id === id ? { ...a, x, z } : a)));
    await fetch(`/api/juego/agentes/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, z }),
    }).catch(() => avisar('No se ha podido mover el portal.'));
  }, []);
  const guardarPosAgenteRef = useRef(guardarPosAgente);
  guardarPosAgenteRef.current = guardarPosAgente;

  /** Clic sobre una pieza o un objeto en modo edición. */
  const alPulsarMundo = useCallback((sel: SeleccionMundo) => {
    const ed = editorRef.current;
    // Conectando: el segundo clic elige el DESTINO del hilo.
    if (ed.conectando && ed.sel?.clase === 'item' && !(sel.clase === 'item' && sel.id === ed.sel.id)) {
      if (sel.clase === 'item') {
        const origen = mundoItems.find(it => it.id === ed.sel!.id);
        if (origen) {
          const enlaces = [...(origen.enlaces || []), { a: `item:${sel.id}`, rel: 'contexto' }];
          guardarItem(origen.id, { enlaces });
          // El editor del hilo se abre al momento: relación, texto, eliminar.
          setSelHilo({ itemId: origen.id, indice: enlaces.length - 1 });
          setSelMundo(null);
        }
        setConectando(false);
        return;
      }
      return; // el pueblo semilla no es destino de hilos (aún)
    }
    // Segundo clic sobre lo que YA está seleccionado: se abre directamente
    // (petición de Eugenio: «no me deja verlo» — la ficha con su botón Abrir
    // no era obvia; ahora clic = opciones, otro clic = abrir).
    if (ed.sel?.clase === 'item' && sel.clase === 'item' && ed.sel.id === sel.id) {
      const it = mundoItems.find(x => x.id === sel.id);
      if (it && it.tipo !== 'prop') { setLeyendo(it); setSelMundo(null); return; }
    }
    setSelMundo(sel);
    setCrearEn(null);
    setMoviendoMundo(false);
    setNotaBorrador(sel.tipo === 'nota' ? (sel.texto || '') : '');
  }, [mundoItems, guardarItem]);

  /** Clic en suelo vacío: colocar lo elegido en el menú, crear ahí, o cerrar. */
  const plantandoRef = useRef<typeof plantando>(null);
  plantandoRef.current = plantando;
  const alSuelo = useCallback((p: { x: number; z: number }) => {
    const pl = plantandoRef.current;
    if (pl) {
      crearItemMundo(pl, p);
      setPlantando(null);
      return;
    }
    if (editorRef.current.sel) { setSelMundo(null); setConectando(false); return; }
    setCrearEn(p);
  }, [crearItemMundo]);

  /** Soltar lo que se estaba moviendo. */
  const alSoltar = useCallback((p: { x: number; z: number }) => {
    const sel = editorRef.current.sel;
    setMoviendoMundo(false);
    movilRef.current = null;
    if (!sel) return;
    // También aquí (modo Mover): soltarlo sobre un edificio = guardarlo dentro.
    if (sel.clase === 'item' && mudablesRef.current.has(sel.tipo)) {
      const proy = proyectoEnPuntoRef.current(p.x, p.z);
      if (proy) { guardarEnProyectoRef.current(sel.id, proy); return; }
    }
    if (sel.clase === 'item') guardarItem(sel.id, { x: p.x, z: p.z });
    else if (sel.id.startsWith('agente:')) guardarPosAgenteRef.current(sel.id.slice(7), p.x, p.z);
    else guardarOverride(sel.id, { x: p.x, z: p.z, eliminado: false });
    setSelMundo(sel.tipo === 'portal' ? null : { ...sel, x: p.x, z: p.z });
  }, [guardarItem, guardarOverride]);

  const girarSel = useCallback(() => {
    const sel = editorRef.current.sel;
    if (!sel) return;
    const rot = (sel.rot + Math.PI / 4) % (Math.PI * 2);
    if (sel.clase === 'item') guardarItem(sel.id, { rot });
    else guardarOverride(sel.id, { rot, eliminado: false });
    setSelMundo({ ...sel, rot });
  }, [guardarItem, guardarOverride]);

  const eliminarSel = useCallback(() => {
    const sel = editorRef.current.sel;
    if (!sel) return;
    if (sel.clase === 'item') {
      setMundoItems(prev => prev.filter(it => it.id !== sel.id));
      fetch(`/api/juego/mundo/${sel.id}/archivar`, { method: 'POST', credentials: 'include' }).catch(() => {});
    } else {
      guardarOverride(sel.id, { eliminado: true });
    }
    setSelMundo(null);
    avisar('Eliminado. (Se guarda en tu mundo, no borra nada de la plataforma.)');
  }, [guardarOverride]);

  /** Cambiar el diseño: las casas rotan entre los 12 modelos; los árboles
   *  alternan entre frondoso y pino. */
  const disenoSel = useCallback(() => {
    const sel = editorRef.current.sel;
    if (!sel) return;
    if (sel.clase === 'semilla' && sel.tipo === 'casa') {
      const actual = sel.modelo != null && sel.modelo !== '' ? Number(sel.modelo) : 0;
      const siguiente = String((actual + 1) % 12);
      guardarOverride(sel.id, { modelo: siguiente, eliminado: false });
      setSelMundo({ ...sel, modelo: siguiente });
    } else if (sel.clase === 'item' && (sel.modelo === 'arbol' || sel.modelo === 'pino')) {
      const siguiente = sel.modelo === 'arbol' ? 'pino' : 'arbol';
      guardarItem(sel.id, { modelo: siguiente });
      setSelMundo({ ...sel, modelo: siguiente });
    }
  }, [guardarItem, guardarOverride]);

  /**
   * Crea desde el suelo lo que vive en la PLATAFORMA y lo planta como tarjeta
   * (petición de Eugenio): un lienzo real (grafo de conocimiento), un mapa
   * real, o un medio (link, vídeo, música). Todo se abre luego en la ventana
   * interna, sin salir del juego.
   */
  const crearDesdeForm = useCallback(async () => {
    const f = formCrear;
    if (!f) return;
    setFormCrear(null);
    if (f.tipo === 'lienzo' || f.tipo === 'mapa') {
      const nombre = f.nombre.trim() || (f.tipo === 'lienzo' ? 'Lienzo nuevo' : 'Mapa nuevo');
      const r = await fetch(f.tipo === 'lienzo' ? '/api/graphs' : '/api/maps', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nombre }),
      }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (!r?.ok || !j?.slug) { avisar(j?.error || 'No se ha podido crear.'); return; }
      await crearItemMundo({
        tipo: f.tipo, nombre,
        url: f.tipo === 'lienzo' ? `/grafos/${j.slug}` : `/mapas/${j.slug}`,
      });
      avisar(`${f.tipo === 'lienzo' ? 'Lienzo' : 'Mapa'} creado y plantado. Púlsalo y dale a Abrir.`);
      return;
    }
    const url = f.url.trim();
    if (!url) { avisar('Falta la dirección (URL).'); return; }
    await crearItemMundo({
      tipo: f.tipo,
      url: /^https?:\/\//.test(url) ? url : `https://${url}`,
      nombre: f.nombre.trim() || url.replace(/^https?:\/\//, '').slice(0, 40),
    });
  }, [formCrear, crearItemMundo]);

  /** Subir una imagen o un documento y plantarlo donde se pulsó. */
  const subirAlMundo = useCallback(async (f: File | undefined) => {
    if (!f) return;
    const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: f,
    }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!r?.ok || !j?.url) { avisar(j?.error || 'No se ha podido subir el archivo.'); return; }
    if (subirDestino.current === 'plantar') {
      // Viene del menú lateral: queda en la mano, se coloca pulsando el suelo.
      setPlantando({ tipo: subiendoComo.current, url: j.url, nombre: f.name });
      subirDestino.current = 'crear';
      return;
    }
    await crearItemMundo({ tipo: subiendoComo.current, url: j.url, nombre: f.name });
  }, [crearItemMundo]);

  /** El formulario del MENÚ lateral: link/vídeo/música quedan «en la mano»;
   *  grafo y mapa se crean de verdad en la plataforma y luego se colocan. */
  const confirmarFormMenu = useCallback(async () => {
    const f = formMenu;
    if (!f) return;
    setFormMenu(null);
    if (f.tipo === 'grafo' || f.tipo === 'mapa') {
      const nombre = f.nombre.trim() || (f.tipo === 'grafo' ? 'Grafo nuevo' : 'Mapa nuevo');
      const r = await fetch(f.tipo === 'grafo' ? '/api/graphs' : '/api/maps', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nombre }),
      }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (!r?.ok || !j?.slug) { avisar(j?.error || 'No se ha podido crear.'); return; }
      setPlantando({
        tipo: f.tipo === 'grafo' ? 'lienzo' : 'mapa', nombre,
        url: f.tipo === 'grafo' ? `/grafos/${j.slug}` : `/mapas/${j.slug}`,
      });
      return;
    }
    const url = f.url.trim();
    if (!url) { avisar('Falta la dirección (URL).'); return; }
    setPlantando({
      tipo: f.tipo as ItemMundo['tipo'],
      url: /^https?:\/\//.test(url) ? url : `https://${url}`,
      nombre: f.nombre.trim() || url.replace(/^https?:\/\//, '').slice(0, 40),
    });
  }, [formMenu]);

  /** Tus documentos ya existentes en la plataforma, para plantarlos. */
  const cargarDocsExistentes = useCallback(async () => {
    if (!user) return;
    const j = await fetch(`/api/publicaciones?autor=${encodeURIComponent(user.id)}&limit=200`, { credentials: 'include' })
      .then(r => r.json()).catch(() => []);
    setDocsExistentes(Array.isArray(j)
      ? j.filter((w: any) => w.kind === 'documento' || w.kind === 'pagina')
      : []);
  }, [user]);

  /**
   * Acercarse a un proyecto ABRE su ficha sola, sin pulsar nada (petición de
   * Eugenio). Al alejarse se cierra. Con las personas no: ahí manda el choque.
   *
   * `rechazado` recuerda de qué acabas de decir «atrás, ahora no»: sin esto la
   * ficha se volvería a abrir sola en el mismo fotograma, porque sigues al lado.
   */
  const alCambiarCercania = useCallback((c: Cercania) => {
    setCercania(c);
    const k = claveCercania(c);
    if (rechazado.current !== k) rechazado.current = null;
    if (c?.tipo === 'proyecto' && rechazado.current !== k) setPanel(c.proyecto);
    else if (c === null) setPanel(null);
  }, []);

  /**
   * «Atrás»: la flecha abajo del teclado o tirar del joystick hacia ti cierran
   * lo que esté abierto (petición de Eugenio: «indicando que el jugador quiere
   * ir para atrás y no quiere esa interacción»). Devuelve true si cerró algo,
   * para que ese mismo gesto no mueva además al personaje.
   */
  const irAtras = useCallback(() => {
    // Se lee de la ref, no del estado: esto se llama desde un manejador de
    // teclado que vive fuera del ciclo de React, y un `setX(prev => …)` no
    // devolvería el valor a tiempo para saber si había algo abierto.
    const a = abiertos.current;
    const ed = editorRef.current;
    if (leyendoRef.current) setLeyendo(null);
    else if (selHiloRef.current) setSelHilo(null);
    else if (plantandoRef.current) setPlantando(null);
    else if (ed.sel || ed.conectando) { setSelMundo(null); setConectando(false); setMoviendoMundo(false); }
    else if (crearEnRef.current) setCrearEn(null);
    else if (a.aspecto) setEditandoAspecto(null);
    else if (a.construyendo) setConstruyendo(null);
    else if (a.ficha) setFichaAgente(null);
    else if (a.panel) setPanel(null);
    else if (a.bocadillo) setBocadillo(null);
    else return false;
    // Lo que acabas de rechazar no se reabre hasta que te alejes y vuelvas.
    rechazado.current = claveCercania(cercaniaRef.current);
    return true;
  }, []);

  /**
   * Viaje rápido desde el mapa. El velo tapa el salto; la cámara, que va
   * interpolando siempre, hace un vuelo rasante hasta el destino. Al llegar,
   * si era una persona se abre su ficha y su chat: viajar hasta alguien es ir
   * a hablar con él.
   */
  const viajarA = useCallback((d: { x: number; z: number; agente?: Agente }) => {
    setViajando(d.agente?.nombre || 'tu destino');
    destinoViaje.current = { x: d.x, z: d.z };
    setPanel(null);
    setFichaAgente(null);
    setTimeout(() => {
      setViajando(null);
      if (d.agente) { setFichaAgente(d.agente); hablarCon(d.agente); }
    }, 900);
  }, [hablarCon]);

  /**
   * Guarda el aspecto donde corresponda: tus ajustes de usuario si eres tú, o
   * la `apariencia` de esa persona si estás editando a alguien de tu mundo.
   */
  const guardarAspecto = async () => {
    if (!editandoAspecto) return;
    setGuardandoAspecto(true);
    try {
      if (editandoAspecto === 'jugador') {
        await updateUiSettings({ juegoAspecto: aspectoBorrador });
        avisar('Tu aspecto queda guardado.');
      } else {
        const r = await fetch(`/api/juego/agentes/${editandoAspecto.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apariencia: aspectoBorrador }),
        });
        if (!r.ok) { avisar('No se ha podido guardar el aspecto.'); return; }
        await cargarAgentes();
        avisar(`${editandoAspecto.nombre} cambia de aspecto.`);
      }
      setEditandoAspecto(null);
    } catch {
      avisar('Error de red al guardar el aspecto.');
    } finally {
      setGuardandoAspecto(false);
    }
  };

  /**
   * Cambia de escenario con la transición de por medio: la pantalla se cierra,
   * el mundo cambia por debajo y la pantalla se abre. Nunca se ve el salto.
   */
  const cambiarEscenario = useCallback((rotulo: string, color: string, aplicar: () => void) => {
    setRotuloTransicion(rotulo);
    setColorTransicion(color);
    alCubrir.current = aplicar;
    setTransicion('cerrando');
  }, []);

  /**
   * Entrar en un proyecto: se piden sus tarjetas de verdad y, con ellas, se
   * monta su interior. Las habitaciones son sus GRUPOS del tablero — entrar en
   * una es abrir esa carpeta.
   */
  const entrarEnProyecto = useCallback(async (p: ProyectoJuego) => {
    const color = PALETA_PROYECTO[p.titulo.length % PALETA_PROYECTO.length];
    let items: ItemProyecto[] = [];
    try {
      const r = await fetch(`/api/roadmap?proyecto=${encodeURIComponent(p.id)}`, { credentials: 'include' });
      if (r.ok) items = await r.json();
    } catch { /* sin tarjetas, el interior se ve igual: habitaciones vacías */ }
    const grupos = (p.grupos?.length ? p.grupos : GRUPOS_MINIMOS);
    cambiarEscenario(p.titulo, color, () => {
      setPanel(null);
      setVehiculo('pie');            // dentro no se entra en bici ni volando
      alturaVuelo.current = 0;
      setInterior({ proyecto: p, grupos, items, color, sala: null, agentes: agentesRef.current });
      destinoViaje.current = { x: PLAZA_ENTRADA.x, z: PLAZA_ENTRADA.z - 4 };
    });
  }, [cambiarEscenario]);

  /**
   * La gente de tu mundo cambia (creas a alguien, le cambias el aspecto) y el
   * interior tiene que enterarse: es de donde salen los avatares que están de
   * pie dentro de las habitaciones.
   */
  useEffect(() => {
    setInterior(prev => (prev && prev.agentes !== agentes ? { ...prev, agentes } : prev));
  }, [agentes]);

  /**
   * Mete una tarjeta en una habitación del proyecto en el que estás. Es lo que
   * pasa cuando le dices a la IA «añade a Gala como persona en esta sala»: una
   * habitación ES un grupo del tablero, así que añadir algo aquí es añadirlo
   * allí, y aparece flotando al momento.
   */
  const crearTarjeta = useCallback(async (
    grupo: string, titulo: string, resumen?: string,
    /** Contenido de la tarjeta. Con `{tipo:'agente'}` la tarjeta ES una
     *  persona y en la habitación sale su avatar en vez de una lámina. */
    bloques?: ItemProyecto['bloques'],
  ) => {
    const i = interiorRef.current;
    if (!i || !titulo) return;
    const r = await fetch('/api/roadmap', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proyecto_id: i.proyecto.id, grupo, titulo, resumen: resumen || null,
        estado: 'por_hacer', bloques: bloques || [],
      }),
    });
    if (!r.ok) { avisar('No se ha podido añadir aquí.'); return; }
    const nueva: ItemProyecto = await r.json();
    setInterior(prev => (prev && prev.proyecto.id === i.proyecto.id
      ? { ...prev, items: [...prev.items, { ...nueva, bloques: nueva.bloques || [] }] }
      : prev));
  }, []);

  /**
   * Mete en una habitación a alguien que YA vive en tu mundo.
   *
   * Esto existe por un fallo que reportó Eugenio: pidió «añade a Anita en esta
   * habitación» y la IA creó una Anita nueva, un nombre suelto en una tarjeta,
   * en vez de traer a la de siempre. Aquí se busca a la persona real —por su
   * id, y si no, por su nombre— y la tarjeta se guarda APUNTANDO a ella. Así
   * dentro de la sala aparece su avatar, con su aspecto, su memoria y su
   * conversación. Solo si de verdad no existe nadie con ese nombre se crea,
   * una sola vez, y se enlaza esa.
   */
  const meterPersonaEnSala = useCallback(async (_grupo: string, d: {
    agente_id?: string; nombre: string; rol?: string; descripcion?: string;
  }) => {
    const i = interiorRef.current;
    if (!i || !d?.nombre) return;
    const k = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let quien = agentesRef.current.find(a => a.id === d.agente_id)
      || agentesRef.current.find(a => a.tipo === 'persona' && k(a.nombre) === k(d.nombre));
    if (!quien) {
      // Estando dentro de un edificio, tu posición son coordenadas de la sala:
      // la persona nueva se planta junto al edificio de este proyecto.
      const idx = proyectosRef.current.findIndex(p => p.id === i.proyecto.id);
      const pos = posicionProyecto(Math.max(0, idx));
      const creado = await crearAgente({
        tipo: 'persona', nombre: d.nombre, rol: d.rol, descripcion: d.descripcion,
        x: pos.x - 7, z: pos.z + 7,
      }).catch(() => null);
      if (!creado?.id) { avisar(`No se ha podido traer a ${d.nombre}.`); return; }
      quien = creado as Agente;
    }
    // La persona SE UNE al proyecto: sección de personas, no tarjeta del
    // kanban (petición de Eugenio). En la sala «Personas» aparece su avatar.
    const r = await fetch(`/api/juego/agentes/${quien.id}/proyectos`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: i.proyecto.id }),
    }).catch(() => null);
    if (!r?.ok) { avisar(`No se ha podido unir a ${d.nombre} al proyecto.`); return; }
    await cargarAgentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargarAgentes]);

  // Las habitaciones ya no existen: la PLAZA del proyecto lo enseña todo
  // junto (2026-08-18). El campo `sala` de DatosInterior queda siempre a null.

  /** Salir del edificio: vuelves a la aldea, delante de su puerta. */
  const salirDelProyecto = useCallback(() => {
    const i = interiorRef.current;
    if (!i) return;
    const idx = proyectosRef.current.findIndex(p => p.id === i.proyecto.id);
    const pos = posicionesProyectos(proyectosRef.current, overridesRef.current)[Math.max(0, idx)]
      || posicionProyecto(Math.max(0, idx));
    cambiarEscenario('Aldea', i.color, () => {
      setInterior(null);
      destinoViaje.current = { x: pos.x, z: pos.z + 4 };
    });
  }, [cambiarEscenario]);

  // ------------------------------------------------------------------
  // EL CINE por dentro (2026-08-19): la sala 3D del agente de YouTube.
  // ------------------------------------------------------------------
  const [cineYT, setCineYT] = useState<{ estado: string; categorias: CategoriaCine[] } | null>(null);
  const cineRef = useRef(cineYT);
  cineRef.current = cineYT;

  /** Entra en el cine (o refresca sus recomendaciones si ya estás dentro). */
  const abrirCine = useCallback(async () => {
    const yaDentro = !!cineRef.current;
    const entrar = () => {
      setPanel(null);
      setVehiculo('pie');
      alturaVuelo.current = 0;
      setCineYT({ estado: 'cargando', categorias: [] });
      // Bien adentro: en z 14 la cámara nacía ENCIMA del portal de salida
      // (z 24) y su espiral llenaba la pantalla — misma trampa que la plaza.
      destinoViaje.current = { x: 0, z: 6 };
    };
    if (yaDentro) setCineYT(c => (c ? { ...c, estado: 'cargando' } : c));
    else cambiarEscenario('Gran pantalla', '#ff0033', entrar);
    try {
      // ?cinedemo en la URL de la página = sala de muestra (solo en local).
      const demo = new URLSearchParams(window.location.search).has('cinedemo') ? '?demo=1' : '';
      const r = await fetch(`/api/youtube/cine${demo}`, { credentials: 'include' });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setCineYT({ estado: 'sin_conexion', categorias: [] }); return; }
      setCineYT({ estado: j.estado === 'ok' ? 'ok' : 'sin_conexion', categorias: j.categorias || [] });
      // Sin cuenta conectada: se abre también el panel con el botón de
      // conectar, que es el único sitio donde vive el OAuth.
      if (j.estado !== 'ok') setPantallaYT(true);
    } catch {
      setCineYT({ estado: 'sin_conexion', categorias: [] });
    }
  }, [cambiarEscenario]);

  const salirCine = useCallback(() => {
    const o = overridesRef.current.find(x => x.seed_id === 'pantalla:0');
    // 27,-18 = posición de fábrica de la pieza pantalla:0 (piezasAldea).
    const px = o?.x ?? 27, pz = o?.z ?? -18;
    cambiarEscenario('Aldea', '#ff0033', () => {
      setCineYT(null);
      destinoViaje.current = { x: px, z: pz + 5 };
    });
  }, [cambiarEscenario]);

  /** Un vídeo del cine se ve en la ventana interna de siempre. */
  const verVideoCine = useCallback((v: VideoCine) => {
    setLeyendo({
      id: `cine:${v.videoId}`, tipo: 'video', modelo: null,
      texto: v.canal || null, url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
      nombre: v.titulo || 'Vídeo', x: 0, z: 0, rot: 0, escala: 1,
    });
  }, []);

  /**
   * Chocarte con algo es empezar a tratar con ello: con una persona se abre su
   * chat, con un edificio de proyecto se ENTRA DENTRO. Nada se atraviesa.
   */
  const alChocar = useCallback((id: string) => {
    if (id === 'cine:salir') { salirCine(); return; }
    // Dentro de un proyecto, lo sólido son sus puertas y su salida.
    if (id === 'interior:salir') { salirDelProyecto(); return; }
    // Dentro de una habitación también hay gente: chocarte con alguien es
    // ponerte a hablar con él, igual que en la aldea.
    if (id.startsWith('interior:persona:')) {
      const a = agentesRef.current.find(x => x.id === id.slice(17));
      if (a) { setFichaAgente(a); hablarCon(a, false); }
      return;
    }
    if (id.startsWith('proy:')) {
      const p = proyectosRef.current.find(x => `proy:${x.id}` === id);
      if (p) entrarEnProyecto(p);
      return;
    }
    // Portales CON FORMA (aclaración de Eugenio): un objeto o una pieza del
    // pueblo convertidos en portal — atravesarlos es entrar en su mapa.
    if (id.startsWith('portalitem:')) {
      const it = mundoItemsRef.current.find(x => x.id === id.slice(11));
      const p = it?.portal_proyecto_id ? proyectosRef.current.find(x => x.id === it.portal_proyecto_id) : null;
      if (p) entrarEnProyecto(p);
      return;
    }
    if (id.startsWith('portalpieza:')) {
      const ov = overridesRef.current.find(o => o.seed_id === id.slice(12));
      const p = ov?.portal_proyecto_id ? proyectosRef.current.find(x => x.id === ov.portal_proyecto_id) : null;
      if (p) entrarEnProyecto(p);
      return;
    }
    const a = agentesRef.current.find(x => x.id === id);
    if (!a) return;
    // Un edificio de proyecto construido DESDE el juego también se entra
    // chocando con él, igual que los del distrito (fallo que vio Eugenio:
    // su proyecto nuevo no tenía puerta). Y una PERSONA convertida en portal
    // también: chocar con ella es entrar. El chat del agente sigue en la (E).
    if (a.proyecto_id) {
      const p = proyectosRef.current.find(x => x.id === a.proyecto_id);
      if (p) { entrarEnProyecto(p); return; }
    }
    setFichaAgente(a);
    // Sin robar el teclado: te has tropezado con él, no has decidido escribirle.
    hablarCon(a, false);
  }, [hablarCon, entrarEnProyecto, salirCine]);

  /**
   * Subirse o bajarse. Al bajar del planeador NO se apaga en el aire: se pone
   * a descender solo hasta tocar el suelo (aterrizaje vertical), y hasta que
   * no aterriza no te devuelve el control a pie.
   */
  const montar = useCallback((v: Vehiculo) => {
    setVehiculo(actual => {
      if (actual === v) {
        if (actual === 'aptera' && alturaVuelo.current > 0.3) {
          fijarSubida(-1);          // baja sola; al tocar suelo se desmonta
          return actual;
        }
        return 'pie';
      }
      return v;
    });
  }, [fijarSubida]);

  // El planeador toca suelo: se desmonta solo y deja de descender.
  useEffect(() => {
    if (vehiculo !== 'aptera') {
      setAlturaVisible(0);
      mandoY.current.boton = 0;
      setSubiendo(0);
      recalcularY();
      return;
    }
    const t = setInterval(() => {
      setAlturaVisible(Math.round(alturaVuelo.current));
      if (entrada.current.y < 0 && alturaVuelo.current <= 0.01) setVehiculo('pie');
    }, 120);
    return () => clearInterval(t);
  }, [vehiculo, recalcularY]);

  const interactuar = useCallback(() => {
    const c = cercaniaRef.current;
    if (!c) return;
    if (c.tipo === 'robot') {
      setBocadillo(FRASES_ROBOT[Math.floor(Math.random() * FRASES_ROBOT.length)]);
      hablarCon(null);
    } else if (c.tipo === 'agente') {
      setFichaAgente(c.agente);
      hablarCon(c.agente);
    } else {
      setPanel(c.proyecto);
    }
  }, [hablarCon]);

  // Teclado: WASD/flechas para andar, E para interactuar, B/V para los
  // vehículos, espacio y mayúsculas para subir y bajar volando. Nunca mientras
  // se escribe (la barra del asistente vive en esta misma página).
  //
  // Las acciones se llaman a través de una ref A PROPÓSITO: si el efecto
  // dependiera de ellas, se volvería a montar cada vez que cambia la lista de
  // agentes, y con él se perdería el conjunto de teclas pulsadas — te quedabas
  // subiendo para siempre porque el «soltar espacio» llegaba a otro oyente.
  const acciones = useRef({ interactuar, irAtras, montar });
  acciones.current = { interactuar, irAtras, montar };
  // El manejador del teclado se monta UNA vez; en qué vas ahora se lee de aquí.
  const vehiculoRef = useRef(vehiculo);
  vehiculoRef.current = vehiculo;
  useEffect(() => {
    const teclas = new Set<string>();
    // Doble toque de barra = a volar (petición de Eugenio).
    let ultimoEspacio = 0;
    const escribiendo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const aplicar = () => {
      const volando = vehiculoRef.current === 'aptera';
      entrada.current.x = +(teclas.has('d') || teclas.has('arrowright')) - +(teclas.has('a') || teclas.has('arrowleft'));
      // Pilotando la nave, W y S son SUBIR y BAJAR (petición de Eugenio) y la
      // nave avanza sola; a pie y en bici son adelante y atrás, como siempre.
      entrada.current.z = volando ? 0
        : +(teclas.has('s') || teclas.has('arrowdown')) - +(teclas.has('w') || teclas.has('arrowup'));
      // Shift corre (petición de Eugenio; antes era la barra, que ahora salta).
      entrada.current.turbo = teclas.has('shift');
      mandoY.current.teclado = volando
        ? +(teclas.has('w') || teclas.has('arrowup')) - +(teclas.has('s') || teclas.has('arrowdown'))
        : 0;
      // Tocar W o S pilotando cancela la subida/bajada fijada por botón: si
      // no, el despegue automático del doble espacio te llevaría al techo.
      if (volando && mandoY.current.teclado !== 0 && mandoY.current.boton !== 0) {
        fijarSubida(mandoY.current.boton);   // el toggle lo deja a cero
      }
      recalcularY();
      // Seguir caminando cierra lo que haya abierto: tropezarte con alguien no
      // puede dejarte encerrado en su ficha. Si sigues andando, te vas.
      if (entrada.current.x !== 0 || entrada.current.z !== 0) acciones.current.irAtras();
    };
    const abajo = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Escape funciona SIEMPRE, incluso escribiendo: suelta el teclado del
      // chat y cierra lo abierto. Es la salida de emergencia.
      if (k === 'escape') {
        (e.target as HTMLElement | null)?.blur?.();
        acciones.current.irAtras();
        return;
      }
      if (escribiendo(e)) return;
      if (k === 'e') { acciones.current.interactuar(); return; }
      if (k === 'b') { acciones.current.montar('bici'); return; }
      if (k === 'v') { acciones.current.montar('aptera'); return; }
      // Atrás con algo abierto: cerrarlo y NO andar. Es el gesto de «ahora no».
      if ((k === 'arrowdown' || k === 's') && acciones.current.irAtras()) return;
      if (k === ' ') {
        e.preventDefault();                 // si no, la página hace scroll
        if (!e.repeat) {
          const ahora = performance.now();
          if (ahora - ultimoEspacio < 350 && vehiculoRef.current !== 'aptera') {
            // Doble barra: a la nave y despegue vertical automático. Con W/S
            // se toma el mando de la altura (arriba se cancela el fijado).
            acciones.current.montar('aptera');
            fijarSubida(1);
          } else if (vehiculoRef.current !== 'aptera') {
            entrada.current.salto = true;   // un toque = un salto
          }
          ultimoEspacio = ahora;
        }
      }
      teclas.add(k); aplicar();
    };
    const arriba = (e: KeyboardEvent) => { teclas.delete(e.key.toLowerCase()); aplicar(); };
    const soltarTodo = () => { teclas.clear(); aplicar(); };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    window.addEventListener('blur', soltarTodo);
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      window.removeEventListener('blur', soltarTodo);
    };
  }, []);

  /**
   * Mirar alrededor arrastrando, como en Call of Duty Mobile (petición de
   * Eugenio): en el móvil, la MITAD DERECHA de la pantalla gira la vista
   * mientras el joystick de la izquierda mueve al personaje; con ratón, se
   * arrastra por cualquier parte del mundo.
   *
   * Girar la cámara cambia también hacia dónde andas: el mando pasa a ser
   * relativo a la vista (lo resuelve `Personaje`).
   */
  useEffect(() => {
    let id: number | null = null;
    let ultimo = { x: 0, y: 0 };
    let dedos = 0;

    const empezar = (e: PointerEvent) => {
      dedos++;
      // Con dos dedos manda el pellizco del zoom, no el giro.
      if (dedos > 1) { id = null; return; }
      // Solo gira si el arrastre EMPIEZA sobre el lienzo 3D. Comprobarlo así
      // —y no con una lista de paneles a excluir— hace que cualquier botón o
      // ficha que se añada mañana quede a salvo sin tocar esto.
      if (!(e.target instanceof HTMLCanvasElement)) return;
      if (e.pointerType !== 'mouse' && e.clientX < window.innerWidth * 0.4) return;
      // Con un objeto agarrado, arrastrar lo MUEVE a él, no a la vista. El
      // agarre se apunta en el mismo pointerdown del lienzo, que corre antes
      // que este oyente de window (el evento sube burbujeando).
      if (agarre.current || arrastrando.current) return;
      id = e.pointerId;
      ultimo = { x: e.clientX, y: e.clientY };
      // Mientras arrastras mandas tú: la cámara deja de perseguir el rumbo.
      camara.current.arrastrando = true;
    };
    const mover = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      const dx = e.clientX - ultimo.x;
      const dy = e.clientY - ultimo.y;
      ultimo = { x: e.clientX, y: e.clientY };
      const c = camara.current;
      // Arrastrar a la derecha gira la vista a la derecha (la cámara orbita
      // al revés que el dedo, que es lo que hace que se sienta natural).
      c.yaw += dx * 0.006;
      // 0,10 rad ≈ casi a ras de suelo; 1,35 ≈ casi cenital.
      c.pitch = Math.min(1.35, Math.max(0.1, c.pitch + dy * 0.004));
    };
    const acabar = (e: PointerEvent) => {
      dedos = Math.max(0, dedos - 1);
      if (id === e.pointerId) { id = null; camara.current.arrastrando = false; }
    };
    window.addEventListener('pointerdown', empezar);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', acabar);
    window.addEventListener('pointercancel', acabar);
    return () => {
      window.removeEventListener('pointerdown', empezar);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', acabar);
      window.removeEventListener('pointercancel', acabar);
    };
  }, []);

  // Alejar y acercar la cámara: rueda del ratón y pellizco de dos dedos.
  useEffect(() => {
    const rueda = (e: WheelEvent) => {
      const t = e.target as HTMLElement | null;
      // Dentro de un panel o del chat, la rueda hace scroll, no zoom.
      if (t?.closest('[data-ui-juego]')) return;
      e.preventDefault();
      ajustarZoom(e.deltaY > 0 ? 1.12 : 1 / 1.12);
    };
    let pellizco: number | null = null;
    const distancia = (e: TouchEvent) =>
      Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const inicio = (e: TouchEvent) => { if (e.touches.length === 2) pellizco = distancia(e); };
    const mover = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pellizco === null) return;
      e.preventDefault();
      const d = distancia(e);
      if (Math.abs(d - pellizco) < 6) return;
      ajustarZoom(d > pellizco ? 1 / 1.06 : 1.06);
      pellizco = d;
    };
    const fin = () => { pellizco = null; };
    window.addEventListener('wheel', rueda, { passive: false });
    window.addEventListener('touchstart', inicio, { passive: true });
    window.addEventListener('touchmove', mover, { passive: false });
    window.addEventListener('touchend', fin);
    return () => {
      window.removeEventListener('wheel', rueda);
      window.removeEventListener('touchstart', inicio);
      window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', fin);
    };
  }, [ajustarZoom]);

  useEffect(() => {
    if (!bocadillo) return;
    const t = setTimeout(() => setBocadillo(null), 12000);
    return () => clearTimeout(t);
  }, [bocadillo]);

  mundoItemsRef.current = mundoItems;

  const nombre = user?.name?.split(' ')[0] || 'visitante';
  const pct = panel && panel.tarjetas > 0 ? Math.round((panel.hechas / panel.tarjetas) * 100) : null;
  const personas = agentes.filter(a => a.tipo === 'persona');
  const proyectosAg = agentes.filter(a => a.tipo === 'proyecto');

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-50">
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-slate-400 animate-pulse">Construyendo tu mundo…</p></div>}>
        <Escena
          entrada={entrada}
          camara={camara}
          vehiculo={vehiculo}
          alturaVuelo={alturaVuelo}
          interior={interior}
          onEntrarProyecto={(p) => {
            const ed = editorRef.current;
            // Moviendo un objeto de conocimiento: pulsar el edificio es
            // soltarlo DENTRO — se guarda en ese proyecto (petición de Eugenio).
            if (ed.moviendo && ed.sel?.clase === 'item' && mudablesRef.current.has(ed.sel.tipo)) {
              guardarEnProyectoRef.current(ed.sel.id, p);
              setMoviendoMundo(false);
              movilRef.current = null;
              return;
            }
            // Conectando un hilo: el edificio del proyecto es el destino.
            if (ed.conectando && ed.sel?.clase === 'item') {
              const origen = mundoItems.find(it => it.id === ed.sel!.id);
              if (origen) {
                const enlaces = [...(origen.enlaces || []), { a: `proy:${p.id}`, rel: 'contexto' }];
                guardarItem(origen.id, { enlaces });
                setSelHilo({ itemId: origen.id, indice: enlaces.length - 1 });
                setSelMundo(null);
              }
              setConectando(false);
              return;
            }
            entrarEnProyecto(p);
          }}
          onSalirProyecto={salirDelProyecto}
          onHablarAgente={(a) => {
            const ed = editorRef.current;
            if (ed.conectando && ed.sel?.clase === 'item') {
              const origen = mundoItems.find(it => it.id === ed.sel!.id);
              if (origen) {
                const enlaces = [...(origen.enlaces || []), { a: `agente:${a.id}`, rel: 'contexto' }];
                guardarItem(origen.id, { enlaces });
                setSelHilo({ itemId: origen.id, indice: enlaces.length - 1 });
                setSelMundo(null);
              }
              setConectando(false);
              return;
            }
            // Pulsar un edificio de proyecto construido desde el juego lo
            // ABRE por dentro, como los del distrito. El chat queda en la (E).
            if (a.tipo === 'proyecto' && a.proyecto_id) {
              const p = proyectos.find(x => x.id === a.proyecto_id);
              if (p) {
                // Moviendo un objeto de conocimiento: pulsar el edificio es
                // soltarlo DENTRO, igual que en los edificios del distrito.
                if (ed.moviendo && ed.sel?.clase === 'item' && mudablesRef.current.has(ed.sel.tipo)) {
                  guardarEnProyectoRef.current(ed.sel.id, p);
                  setMoviendoMundo(false);
                  movilRef.current = null;
                  return;
                }
                entrarEnProyecto(p);
                return;
              }
            }
            setFichaAgente(a); hablarCon(a);
          }}
          mundo={{ items: mundoItems, overrides: overridesMundo }}
          editor={{ activo: !!user, moviendo: moviendoMundo, sel: selMundo }}
          onPulsarMundo={alPulsarMundo}
          onAgarrarMundo={alAgarrarMundo}
          onPulsarHilo={(h) => { setSelHilo(h); setSelMundo(null); setCrearEn(null); }}
          onSuelo={alSuelo}
          onSoltar={alSoltar}
          onAbrirItem={(it) => setLeyendo(it)}
          onPantalla={abrirCine}
          cine={cineYT}
          onVerVideo={verVideoCine}
          onSalirCine={salirCine}
          onActualizarCine={abrirCine}
          movilRef={movilRef}
          proyectos={proyectos}
          agentes={agentes}
          jugadorPos={jugadorPos}
          onCercania={alCambiarCercania}
          onChoque={alChocar}
          destino={destinoViaje}
          zoom={zoom}
          aspectoJugador={editandoAspecto === 'jugador' ? aspectoBorrador : miAspecto}
        />
      </Suspense>

      {/* Transición estilo Pokémon: tapa la pantalla mientras cambia el mundo */}
      <Transicion
        fase={transicion}
        color={colorTransicion}
        titulo={rotuloTransicion}
        onCubierto={() => {
          alCubrir.current?.();
          alCubrir.current = null;
          setTransicion('abriendo');
          setTimeout(() => setTransicion(null), 700);
        }}
      />

      {/* Minimapa estilo GTA + viaje rápido. Dentro de un edificio no pinta
          nada: allí el mapa es la propia sala. */}
      {user && !interior && (
        <MiniMapa
          jugadorPos={jugadorPos}
          agentes={agentes}
          proyectos={proyectos}
          items={mundoItems}
          overrides={overridesMundo}
          onViajar={viajarA}
          onCrearEn={user ? (p) => { setCrearEn(p); setSelMundo(null); setSelHilo(null); } : undefined}
        />
      )}
      <VeloViaje activo={!!viajando} destino={viajando} />

      {/* Cabecera */}
      <div className="absolute top-3 left-3 sm:left-16 z-30 px-3 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg">
        <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-emerald-600" /> Juego Vital
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Aldea de {nombre} · {personas.length} {personas.length === 1 ? 'persona' : 'personas'} · {proyectosAg.length + proyectos.length} proyectos
        </p>
      </div>

      {/* Alejar / acercar la cámara. La rueda y el pellizco hacen lo mismo. */}
      {user && (
        <div data-ui-juego className="absolute bottom-28 right-3 sm:right-auto sm:left-16 sm:bottom-3 z-30 flex flex-col items-center gap-1 px-1.5 py-1.5 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg">
          <button
            onClick={() => ajustarZoom(1 / 1.35)}
            title="Acercar"
            className="w-9 h-9 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[9px] font-black text-slate-400 tabular-nums">{Math.round(zoomVisible * 15)} m</span>
          <button
            onClick={() => ajustarZoom(1.35)}
            title="Alejar para ver el mundo"
            className="w-9 h-9 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Las instrucciones viven comprimidas en el icono ℹ️ (petición de
          Eugenio): un botón arriba a la derecha que despliega la chuleta. */}
      <div className="hidden sm:block absolute top-3 right-[10.5rem] z-30">
        <button
          onClick={() => setAyudaVisible(v => !v)}
          title="Cómo se juega"
          className={cn(
            'w-9 h-9 rounded-full border flex items-center justify-center shadow transition-colors',
            ayudaVisible ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300',
          )}
        >
          <Info className="w-4 h-4" />
        </button>
        {ayudaVisible && (
          <div className="absolute right-0 mt-2 w-64 p-3.5 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cómo se juega</p>
            <ul className="space-y-1 text-[11px] font-bold text-slate-600">
              <li><span className="text-slate-900">WASD / flechas</span> — caminar</li>
              <li><span className="text-slate-900">Shift</span> — correr</li>
              <li><span className="text-slate-900">Espacio</span> — saltar · dos veces: volar</li>
              <li><span className="text-slate-900">En vuelo W / S</span> — subir y bajar</li>
              <li><span className="text-slate-900">E</span> — hablar · <span className="text-slate-900">B</span> bici · <span className="text-slate-900">V</span> nave</li>
              <li><span className="text-slate-900">Arrastrar el mundo</span> — mirar alrededor</li>
              <li><span className="text-slate-900">Pulsar un objeto</span> — sus opciones</li>
              <li><span className="text-slate-900">Arrastrar un objeto</span> — moverlo</li>
              <li><span className="text-slate-900">Pulsar el suelo</span> — crear ahí</li>
              <li><span className="text-slate-900">Escape / ↓</span> — cerrar o salir</li>
            </ul>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Vehículos, a la derecha (petición de Eugenio). En el planeador   */}
      {/* aparecen además subir y bajar: es de despegue vertical.          */}
      {/* Dentro de un edificio no hay bici ni planeador que valgan.       */}
      {/* --------------------------------------------------------------- */}
      {user && !interior && (
        <div data-ui-juego className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
          <div className="px-2 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg flex flex-col gap-1.5">
            <button
              onClick={() => montar('bici')}
              title={vehiculo === 'bici' ? 'Bajarte de la bici' : 'Subirte a la bici (B) — el doble de rápido'}
              className={cn(
                'w-11 h-11 rounded-xl border flex items-center justify-center transition-colors',
                vehiculo === 'bici'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700',
              )}
            >
              {vehiculo === 'bici' ? <Footprints className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
            </button>
            <button
              onClick={() => montar('aptera')}
              title={vehiculo === 'aptera' ? 'Aterrizar' : 'Subirte al planeador Aptera (V) — despegue vertical'}
              className={cn(
                'w-11 h-11 rounded-xl border flex items-center justify-center transition-colors',
                vehiculo === 'aptera'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700',
              )}
            >
              <Plane className="w-5 h-5" />
            </button>
          </div>

          {vehiculo === 'aptera' && (
            <div className="px-2 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg flex flex-col items-center gap-1.5">
              <button
                onClick={() => fijarSubida(1)}
                title="Subir (o mantén W). Se queda subiendo hasta que lo vuelvas a pulsar."
                className={cn(
                  'w-11 h-11 rounded-xl border flex items-center justify-center transition-colors',
                  subiendo === 1
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700',
                )}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <span className="text-[9px] font-black text-slate-400 tabular-nums">{alturaVisible} m</span>
              <button
                onClick={() => fijarSubida(-1)}
                title="Bajar (o mantén S). Al tocar el suelo te bajas del planeador."
                className={cn(
                  'w-11 h-11 rounded-xl border flex items-center justify-center transition-colors',
                  subiendo === -1
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700',
                )}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {aviso && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
          {aviso}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* EDITOR DEL MUNDO: un Miro en 3D (petición de Eugenio)             */}
      {/* ---------------------------------------------------------------- */}
      {user && !interior && (moviendoMundo || conectando) && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-amber-500/95 text-white rounded-xl shadow-lg flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5" />
          <p className="text-[11px] font-bold">
            {moviendoMundo ? 'Pulsa el suelo donde quieras dejarlo'
              : 'Pulsa el destino del hilo: otra cosa, una persona o un proyecto'}
          </p>
          <button onClick={salirDelEditor} className="ml-1 text-white/80 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Ficha del objeto seleccionado */}
      {user && selMundo && !moviendoMundo && !conectando && (
        <div data-ui-juego className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 w-[21rem] max-w-[92vw]">
          <Card className="p-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-900 truncate">{selMundo.etiqueta}</p>
              <Button variant="ghost" onClick={() => setSelMundo(null)} className="p-1"><X className="w-3.5 h-3.5" /></Button>
            </div>
            {selMundo.tipo === 'nota' && (
              <textarea
                value={notaBorrador}
                onChange={e => setNotaBorrador(e.target.value)}
                onBlur={() => { if (notaBorrador !== (selMundo.texto || '')) { guardarItem(selMundo.id, { texto: notaBorrador }); setSelMundo({ ...selMundo, texto: notaBorrador }); } }}
                rows={3}
                className="w-full mt-2 px-2.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-300 resize-none"
                placeholder="Escribe la nota…"
              />
            )}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-slate-200" onClick={() => { setMoviendoMundo(true); movilRef.current = { x: selMundo.x, z: selMundo.z }; }}>
                <Move className="w-3.5 h-3.5 mr-1 inline" />Mover
              </Button>
              <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-slate-200" onClick={girarSel}>
                <RotateCw className="w-3.5 h-3.5 mr-1 inline" />Girar
              </Button>
              {((selMundo.clase === 'semilla' && selMundo.tipo === 'casa') || (selMundo.clase === 'item' && (selMundo.modelo === 'arbol' || selMundo.modelo === 'pino'))) && (
                <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-slate-200" onClick={disenoSel}>
                  <Shapes className="w-3.5 h-3.5 mr-1 inline" />Diseño
                </Button>
              )}
              {selMundo.clase === 'item' && (
                <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-slate-200" onClick={() => setConectando(true)}>
                  <Link2 className="w-3.5 h-3.5 mr-1 inline" />Conectar
                </Button>
              )}
              {/* Convertir en portal (aclaración de Eugenio: conserva su forma;
                  el nombre y el aro verdes son la única señal). Si ya lo es,
                  el botón ENTRA en su mapa. */}
              {selMundo.clase === 'item' && (() => {
                const it = mundoItems.find(x => x.id === selMundo.id);
                if (it?.portal_proyecto_id) return (
                  <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => entrarPorPortal(it.portal_proyecto_id)}>
                    <Globe className="w-3.5 h-3.5 mr-1 inline" />Entrar
                  </Button>
                );
                return (
                  <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={convertirItemEnPortal}>
                    <Globe className="w-3.5 h-3.5 mr-1 inline" />Portal
                  </Button>
                );
              })()}
              {selMundo.clase === 'semilla' && (() => {
                const ov = overridesMundo.find(o => o.seed_id === selMundo.id);
                if (ov?.portal_proyecto_id) return (
                  <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => entrarPorPortal(ov.portal_proyecto_id)}>
                    <Globe className="w-3.5 h-3.5 mr-1 inline" />Entrar
                  </Button>
                );
                return (
                  <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={convertirPiezaEnPortal}>
                    <Globe className="w-3.5 h-3.5 mr-1 inline" />Portal
                  </Button>
                );
              })()}
              {selMundo.tipo === 'imagen' && (
                <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-slate-200"
                  onClick={() => { const it = mundoItems.find(x => x.id === selMundo.id); if (it) { setLeyendo(it); setSelMundo(null); } }}>
                  <ImagePlus className="w-3.5 h-3.5 mr-1 inline" />Ver
                </Button>
              )}
              {selMundo.url && selMundo.tipo !== 'imagen' && (
                <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-slate-200"
                  onClick={() => {
                    const it = mundoItems.find(x => x.id === selMundo.id);
                    if (!it) return;
                    // Documentos: descarga. El resto: ventana interna.
                    // Documento SUBIDO (archivo): descarga. Documento de la
                    // plataforma (url interna): se lee en la ventana interna.
                    if (it.tipo === 'documento' && !it.url?.startsWith('/')) { window.open(it.url!, '_blank'); return; }
                    setLeyendo(it);
                    setSelMundo(null);
                  }}>
                  <FileText className="w-3.5 h-3.5 mr-1 inline" />Abrir
                </Button>
              )}
              <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50" onClick={eliminarSel}>
                <Trash2 className="w-3.5 h-3.5 mr-1 inline" />Eliminar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* EDITOR DEL HILO (petición de Eugenio: hilos con información, como en
          los grafos): relación con su color, texto corto y eliminar. */}
      {user && !interior && selHilo && (() => {
        const origen = mundoItems.find(it => it.id === selHilo.itemId);
        const enlace = origen?.enlaces?.[selHilo.indice];
        if (!origen || !enlace) return null;
        const guardarEnlace = (patch: Partial<{ rel: string; texto: string }>) => {
          const enlaces = (origen.enlaces || []).map((e, i) => (i === selHilo.indice ? { ...e, ...patch } : e));
          guardarItem(origen.id, { enlaces });
        };
        return (
          <div data-ui-juego className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 w-[23rem] max-w-[94vw]">
            <Card className="p-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-500" /> Hilo de conocimiento
                </p>
                <Button variant="ghost" onClick={() => setSelHilo(null)} className="p-1"><X className="w-3.5 h-3.5" /></Button>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2.5 mb-1.5">Relación</p>
              <div className="flex flex-wrap gap-1">
                {RELACIONES_HILO.map(r => (
                  <button
                    key={r.id}
                    onClick={() => guardarEnlace({ rel: r.id })}
                    className={cn(
                      'px-2 py-1 rounded-full text-[10px] font-bold border transition-colors',
                      enlace.rel === r.id ? 'text-white' : 'text-slate-600 bg-white hover:bg-slate-50',
                    )}
                    style={enlace.rel === r.id ? { background: r.color, borderColor: r.color } : { borderColor: '#e2e8f0' }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <input
                defaultValue={enlace.texto || ''}
                key={`${selHilo.itemId}:${selHilo.indice}`}
                onBlur={e => { if (e.target.value !== (enlace.texto || '')) guardarEnlace({ texto: e.target.value }); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="¿Qué cuenta este hilo? (p. ej. «¿por qué importa?»)"
                className="w-full mt-2.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-300"
              />
              <div className="flex justify-end mt-2.5">
                <Button variant="ghost" className="text-[11px] px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const enlaces = (origen.enlaces || []).filter((_, i) => i !== selHilo.indice);
                    guardarItem(origen.id, { enlaces });
                    setSelHilo(null);
                  }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1 inline" />Eliminar hilo
                </Button>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Llevas algo del menú «en la mano»: se coloca pulsando el suelo */}
      {user && !interior && plantando && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-emerald-600/95 text-white rounded-xl shadow-lg flex items-center gap-2">
          <Hammer className="w-3.5 h-3.5" />
          <p className="text-[11px] font-bold">Pulsa el suelo donde quieras colocar {plantando.nombre || 'lo elegido'}</p>
          <button onClick={() => setPlantando(null)} className="ml-1 text-white/80 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Panel de crear: sale al pulsar suelo vacío en modo edición */}
      {user && crearEn && (
        <div data-ui-juego className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 w-[23rem] max-w-[94vw]">
          <Card className="p-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-900">Crear aquí</p>
              <Button variant="ghost" onClick={() => setCrearEn(null)} className="p-1"><X className="w-3.5 h-3.5" /></Button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mt-2.5">
              {CATALOGO_PROPS.map(c => (
                <button
                  key={c.modelo}
                  onClick={() => crearItemMundo({ tipo: 'prop', modelo: c.modelo })}
                  className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <span className="text-lg leading-none">{c.icono}</span>
                  <span className="text-[9px] font-bold text-slate-600">{c.nombre}</span>
                </button>
              ))}
            </div>
            <div className="h-px bg-slate-200 my-2.5" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Conocimiento</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { icono: <StickyNote className="w-3.5 h-3.5" />, texto: 'Nota', al: () => crearItemMundo({ tipo: 'nota', texto: '' }) },
                { icono: <ImagePlus className="w-3.5 h-3.5" />, texto: 'Imagen', al: () => { subiendoComo.current = 'imagen'; archivoMundoRef.current?.click(); } },
                { icono: <FileText className="w-3.5 h-3.5" />, texto: 'Documento', al: () => { subiendoComo.current = 'documento'; archivoMundoRef.current?.click(); } },
                { icono: <Globe className="w-3.5 h-3.5" />, texto: 'Link', al: () => setFormCrear({ tipo: 'enlace', url: '', nombre: '' }) },
                { icono: <Film className="w-3.5 h-3.5" />, texto: 'Vídeo', al: () => setFormCrear({ tipo: 'video', url: '', nombre: '' }) },
                { icono: <Music2 className="w-3.5 h-3.5" />, texto: 'Música', al: () => setFormCrear({ tipo: 'musica', url: '', nombre: '' }) },
              ] as const).map(b => (
                <button key={b.texto} onClick={b.al}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-[11px] font-bold text-slate-600 transition-colors">
                  {b.icono}{b.texto}
                </button>
              ))}
            </div>
            <div className="h-px bg-slate-200 my-2.5" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">De la plataforma</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => { posProyecto.current = crearEn; setCrearEn(null); setConstruyendo('proyecto'); }}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-[11px] font-bold text-slate-600 transition-colors">
                <Building2 className="w-3.5 h-3.5" />Proyecto
              </button>
              <button
                onClick={() => setFormCrear({ tipo: 'lienzo', url: '', nombre: '' })}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-[11px] font-bold text-slate-600 transition-colors">
                <PenTool className="w-3.5 h-3.5" />Lienzo
              </button>
              <button
                onClick={() => setFormCrear({ tipo: 'mapa', url: '', nombre: '' })}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-[11px] font-bold text-slate-600 transition-colors">
                <MapaIcono className="w-3.5 h-3.5" />Mapa
              </button>
            </div>
            {formCrear && (
              <div className="mt-2.5 p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  {{ enlace: 'Nuevo link', video: 'Vídeo (YouTube)', musica: 'Música (Spotify o similar)', lienzo: 'Nuevo lienzo', mapa: 'Nuevo mapa' }[formCrear.tipo]}
                </p>
                {formCrear.tipo === 'musica' && (
                  <OpcionesMusica
                    alSubir={() => { setFormCrear(null); subiendoComo.current = 'musica'; subirDestino.current = 'crear'; audioMundoRef.current?.click(); }}
                    alElegir={(url, nombre) => { setFormCrear(null); crearItemMundo({ tipo: 'musica', url, nombre }); }}
                  />
                )}
                {(formCrear.tipo === 'enlace' || formCrear.tipo === 'video' || formCrear.tipo === 'musica') && (
                  <input
                    autoFocus={formCrear.tipo !== 'musica'}
                    value={formCrear.url}
                    onChange={e => setFormCrear({ ...formCrear, url: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') crearDesdeForm(); }}
                    placeholder="https://…"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-300"
                  />
                )}
                <input
                  autoFocus={formCrear.tipo === 'lienzo' || formCrear.tipo === 'mapa'}
                  value={formCrear.nombre}
                  onChange={e => setFormCrear({ ...formCrear, nombre: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') crearDesdeForm(); }}
                  placeholder={formCrear.tipo === 'lienzo' || formCrear.tipo === 'mapa' ? 'Título' : 'Nombre visible (opcional)'}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-300"
                />
                <div className="flex gap-1.5">
                  <Button onClick={crearDesdeForm} className="flex-1 text-[11px] py-1.5">Crear</Button>
                  <Button variant="ghost" onClick={() => setFormCrear(null)} className="text-[11px] py-1.5">Cancelar</Button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-2">La nota se escribe al seleccionarla. Todo se puede arrastrar, conectar con hilos y eliminar; los medios se abren en una ventana sin salir del juego.</p>
          </Card>
        </div>
      )}
      <input
        ref={archivoMundoRef}
        type="file"
        accept="image/*,.pdf,.csv,.json,.zip,.docx,.xlsx,.pptx"
        className="hidden"
        onChange={e => { subirAlMundo(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={audioMundoRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.ogg,.wav,.aac,.flac"
        className="hidden"
        onChange={e => { subirAlMundo(e.target.files?.[0]); e.target.value = ''; }}
      />

      {/* LA GRAN PANTALLA (petición de Eugenio): conectar tu YouTube y ver
          vídeos nuevos de tus suscripciones relacionados con tus proyectos.
          Va en z-40: al pulsar un vídeo se abre la ventana interna (z-50)
          POR ENCIMA, y al cerrarla vuelves aquí. */}
      {pantallaYT && (
        <div data-ui-juego className="absolute inset-0 z-40 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setPantallaYT(false)}>
          <Card className="shadow-2xl w-[92vw] max-w-4xl max-h-[84vh] p-0 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
              <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-600" /> Gran pantalla
                {ytEstado?.canal?.titulo && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 ml-2">
                    {ytEstado.canal.foto && <img src={ytEstado.canal.foto} className="w-4 h-4 rounded-full" />}
                    {ytEstado.canal.titulo}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1">
                {ytEstado?.conectado && (
                  <>
                    <Button variant="ghost" onClick={cargarRecsYT} className="p-1.5 text-[11px]" title="Actualizar">
                      <RefreshCw className={cn('w-3.5 h-3.5', ytCargando && 'animate-spin')} />
                    </Button>
                    <Button variant="ghost" onClick={desconectarYT} className="p-1.5 text-[11px] text-slate-400" title="Desconectar YouTube">
                      <Unplug className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={() => setPantallaYT(false)} className="p-1"><X className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              {!ytEstado ? (
                <p className="text-xs text-slate-400 text-center py-10">Encendiendo la pantalla…</p>
              ) : !user ? (
                <p className="text-xs text-slate-500 text-center py-10">Inicia sesión para conectar tu YouTube.</p>
              ) : !ytEstado.configurado ? (
                <div className="text-center py-8 max-w-md mx-auto">
                  <Youtube className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">La conexión con YouTube está construida pero aún no activada.</p>
                  <p className="text-xs text-slate-500 mt-2">Faltan las claves de Google en el servidor (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET, con la API de YouTube activada). En cuanto estén, este botón funcionará solo.</p>
                </div>
              ) : !ytEstado.conectado ? (
                <div className="text-center py-8 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                    <Youtube className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-base font-black text-slate-900">Conecta tu YouTube</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    La pantalla mirará tus <strong>suscripciones</strong> y te traerá los vídeos nuevos
                    que tengan que ver con <strong>tus proyectos</strong>. Permiso de solo lectura:
                    no puede tocar nada de tu cuenta, y puedes desconectarla cuando quieras.
                  </p>
                  <Button onClick={conectarYT} className="mt-5 bg-red-600 hover:bg-red-700 text-white">
                    <Youtube className="w-4 h-4 mr-1.5 inline" /> Conectar mi YouTube
                  </Button>
                </div>
              ) : ytCargando && !ytRecs ? (
                <p className="text-xs text-slate-400 text-center py-10">Buscando vídeos nuevos en tus suscripciones…</p>
              ) : ytRecs?.error ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-500">{ytRecs.error}</p>
                  <Button onClick={conectarYT} variant="ghost" className="mt-3 text-xs">Reconectar YouTube</Button>
                </div>
              ) : ytRecs && (
                <div className="space-y-5">
                  {(['relacionados', 'recientes'] as const).map(seccion => {
                    const lista = ytRecs[seccion] || [];
                    if (!lista.length) return seccion === 'relacionados' ? (
                      <p key={seccion} className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                        Ningún vídeo nuevo casa todavía con tus proyectos ({(ytRecs.proyectos || []).join(', ') || 'sin proyectos'}). Abajo van los últimos de tus suscripciones.
                      </p>
                    ) : null;
                    return (
                      <div key={seccion}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          {seccion === 'relacionados' ? '▶ Para tus proyectos' : 'Nuevos de tus suscripciones'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {lista.map((v: any) => (
                            <button
                              key={v.videoId}
                              onClick={() => setLeyendo({ id: `yt:${v.videoId}`, tipo: 'video', modelo: null, texto: null, url: v.url, nombre: v.titulo, x: 0, z: 0, rot: 0, escala: 1 })}
                              className="text-left rounded-xl border border-slate-100 hover:border-red-200 hover:shadow-md transition-all overflow-hidden bg-white group"
                            >
                              <div className="relative">
                                {v.miniatura && <img src={v.miniatura} className="w-full aspect-video object-cover" loading="lazy" />}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/30">
                                  <Play className="w-8 h-8 text-white drop-shadow" fill="currentColor" />
                                </div>
                              </div>
                              <div className="p-2">
                                <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">{v.titulo}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{v.canal}</p>
                                {seccion === 'relacionados' && v.relacionadoCon?.length > 0 && (
                                  <p className="text-[9px] font-bold text-red-500 mt-1 truncate">→ {v.relacionadoCon.join(' · ')}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* La VENTANA INTERNA (petición de Eugenio): lo plantado se abre en una
          pantalla central sin salir del juego — un navegador para los links,
          el reproductor para vídeo y música, el lienzo o el mapa reales de la
          plataforma… Pulsar fuera de la ventana la cierra. */}
      {leyendo && (() => {
        // Una canción SUBIDA (archivo propio, no un embed de otra web) se toca
        // con el reproductor del navegador, no con un iframe.
        const esAudio = leyendo.tipo === 'musica' && !!leyendo.url
          && (leyendo.url.startsWith('/uploads/') || /\.(mp3|m4a|ogg|wav|aac|flac)(\?|$)/i.test(leyendo.url));
        // Un PDF subido se LEE dentro del juego con el visor del navegador
        // (fallo que vio Eugenio: antes el iframe disparaba una descarga).
        // Los demás archivos subidos (docx, zip…) no tienen visor: botón de
        // descarga. Las páginas de la plataforma (/documentos/…) sí se abren.
        const esPdfPropio = leyendo.tipo === 'documento' && !!leyendo.url
          && leyendo.url.startsWith('/uploads/') && /\.pdf(\?|$)/i.test(leyendo.url);
        const esMarco = !esAudio && (['enlace', 'video', 'musica', 'lienzo', 'mapa'].includes(leyendo.tipo)
          || esPdfPropio
          || (leyendo.tipo === 'documento' && !!leyendo.url?.startsWith('/documentos')));
        const src = (() => {
          if (!leyendo.url) return null;
          if (leyendo.tipo === 'video') {
            const id = leyendo.url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
            return id ? `https://www.youtube-nocookie.com/embed/${id}` : leyendo.url;
          }
          if (leyendo.tipo === 'musica' && leyendo.url.includes('open.spotify.com') && !leyendo.url.includes('/embed')) {
            return leyendo.url.replace('open.spotify.com/', 'open.spotify.com/embed/');
          }
          return leyendo.url;   // enlace, lienzo y mapa tal cual (los internos son de la propia web)
        })();
        return (
          <div data-ui-juego className="absolute inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setLeyendo(null)}>
            <Card
              className={cn('shadow-2xl overflow-hidden flex flex-col', esMarco ? 'w-[92vw] max-w-5xl h-[82vh] p-0' : 'p-5 w-full max-w-md max-h-[80vh] overflow-y-auto')}
              onClick={e => e.stopPropagation()}
            >
              <div className={cn('flex items-center justify-between', esMarco && 'px-4 py-2.5 border-b border-slate-100')}>
                <p className="text-sm font-black text-slate-900 flex items-center gap-2 truncate">
                  {leyendo.tipo === 'nota' ? <StickyNote className="w-4 h-4 text-amber-500 shrink-0" />
                    : leyendo.tipo === 'imagen' ? <ImagePlus className="w-4 h-4 text-emerald-600 shrink-0" />
                      : leyendo.tipo === 'enlace' ? <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                        : leyendo.tipo === 'video' ? <Film className="w-4 h-4 text-rose-500 shrink-0" />
                          : leyendo.tipo === 'musica' ? <Music2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            : leyendo.tipo === 'lienzo' ? <PenTool className="w-4 h-4 text-violet-600 shrink-0" />
                              : leyendo.tipo === 'mapa' ? <MapaIcono className="w-4 h-4 text-emerald-600 shrink-0" />
                                : <FileText className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <span className="truncate">{nombreLimpio(leyendo.nombre, { nota: 'Nota', imagen: 'Imagen', enlace: 'Enlace', video: 'Vídeo', musica: 'Música', lienzo: 'Lienzo', mapa: 'Mapa' }[leyendo.tipo] || 'Documento')}</span>
                </p>
                <div className="flex items-center gap-1">
                  {esMarco && leyendo.url && (
                    <Button variant="ghost" onClick={() => window.open(leyendo.url!, '_blank')} className="p-1.5" title="Abrir fuera del juego">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setLeyendo(null)} className="p-1"><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              {esAudio && leyendo.url && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <audio controls autoPlay src={leyendo.url} className="w-full" />
                </div>
              )}
              {/* Un PDF nuestro se pinta con NUESTRO visor (PDF.js): el del
                  navegador dentro de un iframe salía en negro en Chrome y en
                  el móvil no existe. El resto de contenidos siguen en iframe. */}
              {esMarco && src && (esPdfPropio ? (
                <Suspense fallback={<p className="flex-1 grid place-items-center text-xs text-slate-400">Cargando el documento…</p>}>
                  <VisorPdf url={src} />
                </Suspense>
              ) : (
                <iframe
                  src={src}
                  title={leyendo.nombre || 'Contenido'}
                  className="flex-1 w-full bg-white"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                />
              ))}
              {esMarco && !esPdfPropio && (
                <p className="px-4 py-1.5 text-[10px] text-slate-400 border-t border-slate-100">
                  Si la página se niega a cargar aquí dentro (algunas webs lo bloquean), usa el botón de abrir fuera.
                </p>
              )}
              {leyendo.tipo === 'nota' && (
                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">{leyendo.texto || 'Nota vacía.'}</p>
              )}
              {leyendo.tipo === 'imagen' && leyendo.url && (
                <img src={leyendo.url} alt={leyendo.nombre || 'Imagen'} className="mt-3 rounded-xl max-h-[55vh] w-full object-contain bg-slate-50" />
              )}
              {leyendo.tipo === 'documento' && leyendo.url && (
                <Button onClick={() => window.open(leyendo.url!, '_blank')} className="w-full mt-4">Abrir el documento</Button>
              )}
              {!esMarco && (
                <p className="text-[10px] text-slate-400 mt-3">Plantado en tu mundo · púlsalo para moverlo, conectarlo con hilos o eliminarlo.</p>
              )}
            </Card>
          </div>
        );
      })()}

      {/* ---------------------------------------------------------------- */}
      {/* EL MENÚ DE CREAR (petición de Eugenio): colapsado en un raíl a la  */}
      {/* izquierda, a TODA ALTURA, con el diseño del menú de objetivos del  */}
      {/* mapa: raíl de iconos que al pasar el ratón se despliega en acordeón */}
      {/* con sus submenús. Todo lo creable vive aquí.                       */}
      {/* ---------------------------------------------------------------- */}
      {user && !interior && (() => {
        const abierto = !menuColapsado || menuPeek;
        const CATS: Array<{ id: string; icono: React.ReactNode; label: string; items: Array<{ id: string; label: string; al: () => void; sub?: boolean }> }> = [
          {
            id: 'naturaleza', icono: <Sprout className="w-5 h-5" />, label: 'Naturaleza',
            items: ['arbol', 'pino', 'arbusto', 'roca'].map(m => ({
              id: m, label: CATALOGO_PROPS.find(c => c.modelo === m)?.nombre || m,
              al: () => setPlantando({ tipo: 'prop', modelo: m }),
            })),
          },
          {
            id: 'pueblo', icono: <Home className="w-5 h-5" />, label: 'Pueblo',
            items: ['casa', 'banco', 'farola', 'puesto', 'pozo'].map(m => ({
              id: m, label: CATALOGO_PROPS.find(c => c.modelo === m)?.nombre || m,
              al: () => setPlantando({ tipo: 'prop', modelo: m }),
            })),
          },
          {
            id: 'conocimiento', icono: <StickyNote className="w-5 h-5" />, label: 'Conocimiento',
            items: [
              { id: 'nota', label: 'Nota', al: () => setPlantando({ tipo: 'nota', texto: '', nombre: 'la nota' }) },
              { id: 'imagen', label: 'Imagen (subir)', al: () => { subiendoComo.current = 'imagen'; subirDestino.current = 'plantar'; archivoMundoRef.current?.click(); } },
              { id: 'doc-subir', label: 'Documento (subir)', al: () => { subiendoComo.current = 'documento'; subirDestino.current = 'plantar'; archivoMundoRef.current?.click(); } },
              { id: 'doc-existente', label: 'Documento existente…', al: () => { setSubAbierto(v => (v === 'docs' ? null : 'docs')); cargarDocsExistentes(); }, sub: true },
              { id: 'enlace', label: 'Link', al: () => setFormMenu({ tipo: 'enlace', url: '', nombre: '' }) },
              { id: 'video', label: 'Vídeo (YouTube)', al: () => setFormMenu({ tipo: 'video', url: '', nombre: '' }) },
              { id: 'musica', label: 'Música', al: () => setFormMenu({ tipo: 'musica', url: '', nombre: '' }) },
            ],
          },
          {
            id: 'plataforma', icono: <Building2 className="w-5 h-5" />, label: 'Plataforma',
            items: [
              { id: 'proyecto', label: 'Proyecto', al: () => setConstruyendo('proyecto') },
              { id: 'grafo', label: 'Grafo nuevo', al: () => setFormMenu({ tipo: 'grafo', url: '', nombre: '' }) },
              { id: 'lienzo', label: 'Mi Conocimiento (acceso)', al: () => setPlantando({ tipo: 'lienzo', url: '/mi-conocimiento', nombre: 'Mi Conocimiento' }) },
              { id: 'mapa', label: 'Mapa nuevo', al: () => setFormMenu({ tipo: 'mapa', url: '', nombre: '' }) },
            ],
          },
          {
            id: 'personas', icono: <UserPlus className="w-5 h-5" />, label: 'Personas',
            items: [{ id: 'persona', label: 'Crear persona', al: () => setConstruyendo('persona') }],
          },
        ];
        return (
          <div
            className="absolute left-0 top-0 bottom-0 z-30 w-14"
            onMouseEnter={() => { if (menuColapsado) setMenuPeek(true); }}
            onMouseLeave={() => setMenuPeek(false)}
          >
            <div className={abierto
              ? 'absolute inset-y-0 left-0 w-[260px] bg-white/95 backdrop-blur border-r border-slate-200 shadow-2xl overflow-y-auto'
              : 'h-full w-14 bg-white/90 backdrop-blur border-r border-slate-200 overflow-y-auto'}
            >
              <div className={cn('sticky top-0 z-10 bg-white/95 border-b border-slate-100 flex items-center', abierto ? 'justify-between px-4 py-3' : 'justify-center py-3')}>
                {abierto && <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Crear</h2>}
                <button
                  onClick={() => setMenuColapsado(c => !c)}
                  title={menuColapsado ? 'Abrir el menú de crear' : 'Colapsar el menú'}
                  className="relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
                >
                  <span className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white">
                    <Menu className="w-4 h-4" />
                  </span>
                </button>
              </div>

              {!abierto && (
                <div className="flex flex-col items-center gap-1 py-2">
                  {CATS.map(cat => (
                    <button
                      key={cat.id}
                      title={cat.label}
                      onClick={() => { setMenuColapsado(false); setCatAbierta(cat.id); }}
                      className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                        catAbierta === cat.id ? 'bg-slate-900 text-emerald-400' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}
                    >
                      {cat.icono}
                    </button>
                  ))}
                  <div className="w-8 h-px bg-slate-200 my-1" />
                  <button title="Cambiar tu aspecto" onClick={() => { setAspectoBorrador(miAspecto); setEditandoAspecto('jugador'); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                    <Palette className="w-5 h-5" />
                  </button>
                  <button title="Habla con tu robot" onClick={() => { setBocadillo('Dime «hazme la entrevista fundacional» y empezamos por tus áreas de vida.'); hablarCon(null); }}
                    className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors">
                    <Bot className="w-5 h-5" />
                  </button>
                </div>
              )}

              {abierto && (
                <>
                  {CATS.map(cat => (
                    <div key={cat.id} className="border-b border-slate-100">
                      <button
                        onClick={() => { setCatAbierta(v => (v === cat.id ? null : cat.id)); setSubAbierto(null); }}
                        className={cn('w-full flex items-center gap-2 px-4 py-3 text-left transition-colors',
                          catAbierta === cat.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')}
                      >
                        <span className={catAbierta === cat.id ? 'text-emerald-400' : 'text-emerald-600'}>{cat.icono}</span>
                        <span className={cn('flex-1 font-semibold', catAbierta === cat.id ? 'text-base' : 'text-sm')}>{cat.label}</span>
                        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', catAbierta === cat.id && 'rotate-180 text-white')} />
                      </button>
                      {catAbierta === cat.id && (
                        <div className="bg-slate-50">
                          {cat.items.map(item => (
                            <div key={item.id}>
                              <button
                                onClick={item.al}
                                className="w-full flex items-center gap-2 pl-6 pr-4 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                <span className="flex-1">{item.label}</span>
                                {item.sub && <ChevronDown className={cn('w-3 h-3 transition-transform', subAbierto === 'docs' && 'rotate-180')} />}
                              </button>
                              {item.id === 'doc-existente' && subAbierto === 'docs' && (
                                <div className="bg-slate-100 max-h-56 overflow-y-auto">
                                  {docsExistentes === null && <p className="pl-8 pr-4 py-2 text-xs text-slate-400">Cargando…</p>}
                                  {docsExistentes?.length === 0 && <p className="pl-8 pr-4 py-2 text-xs text-slate-400">No tienes documentos todavía.</p>}
                                  {docsExistentes?.map((d: any) => (
                                    <button
                                      key={d.id}
                                      onClick={() => setPlantando({
                                        tipo: 'documento',
                                        url: d.kind === 'pagina' ? `/documentos/${d.id}` : (d.config?.url || ''),
                                        nombre: d.title || 'Documento',
                                      })}
                                      className="w-full flex items-center gap-1.5 pl-8 pr-4 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
                                    >
                                      <FileText className="w-3 h-3 shrink-0 text-emerald-600" />
                                      <span className="truncate">{d.title || 'Sin título'}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          {formMenu && catAbierta === cat.id && ['enlace', 'video', 'musica'].includes(formMenu.tipo) && cat.id === 'conocimiento' && (
                            <FormularioMenu formMenu={formMenu} setFormMenu={setFormMenu} confirmar={confirmarFormMenu} opcionesMusica={
                              <OpcionesMusica
                                alSubir={() => { setFormMenu(null); subiendoComo.current = 'musica'; subirDestino.current = 'plantar'; audioMundoRef.current?.click(); }}
                                alElegir={(url, nombre) => { setFormMenu(null); setPlantando({ tipo: 'musica', url, nombre }); }}
                              />
                            } />
                          )}
                          {formMenu && catAbierta === cat.id && ['grafo', 'mapa'].includes(formMenu.tipo) && cat.id === 'plataforma' && (
                            <FormularioMenu formMenu={formMenu} setFormMenu={setFormMenu} confirmar={confirmarFormMenu} opcionesMusica={
                              <OpcionesMusica
                                alSubir={() => { setFormMenu(null); subiendoComo.current = 'musica'; subirDestino.current = 'plantar'; audioMundoRef.current?.click(); }}
                                alElegir={(url, nombre) => { setFormMenu(null); setPlantando({ tipo: 'musica', url, nombre }); }}
                              />
                            } />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                    <button onClick={() => { setAspectoBorrador(miAspecto); setEditandoAspecto('jugador'); }}
                      title="Cambiar tu aspecto: piel, pelo y ropa"
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-600 transition-colors">
                      <Palette className="w-3.5 h-3.5" />Aspecto
                    </button>
                    <button onClick={() => { setBocadillo('Dime «hazme la entrevista fundacional» y empezamos por tus áreas de vida.'); hablarCon(null); }}
                      title="Habla con tu robot"
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors">
                      <Bot className="w-3.5 h-3.5" />Robot
                    </button>
                  </div>
                  {agentes.length > 0 && (
                    <div className="px-2 py-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Tu mundo</p>
                      {agentes.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setFichaAgente(a); hablarCon(a); }}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-emerald-50 text-left transition-colors"
                        >
                          {a.tipo === 'persona'
                            ? <UserPlus className="w-3 h-3 text-slate-400 shrink-0" />
                            : <Building2 className="w-3 h-3 text-slate-400 shrink-0" />}
                          <span className="text-xs font-bold text-slate-600 truncate">{a.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Aviso de proximidad */}
      {cercania && !interior && !panel && !fichaAgente && !bocadillo && !construyendo && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <Button onClick={interactuar} className="shadow-xl">
            {cercania.tipo === 'robot' ? <><Bot className="w-4 h-4 mr-1.5 inline" />Hablar con tu robot{!tactil && ' (E)'}</>
              : cercania.tipo === 'agente' ? <><MessageCircle className="w-4 h-4 mr-1.5 inline" />Hablar con {cercania.agente.nombre}{!tactil && ' (E)'}</>
                : <><FolderKanban className="w-4 h-4 mr-1.5 inline" />Ver «{cercania.proyecto.titulo}»{!tactil && ' (E)'}</>}
          </Button>
        </div>
      )}

      {/* Bocadillo del robot */}
      {bocadillo && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 w-[min(30rem,90vw)]">
          <Card className="p-4 shadow-2xl border-emerald-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900">Tu robot</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{bocadillo}</p>
                <p className="text-[10px] font-bold text-emerald-700 mt-2">Escríbele en la barra de abajo ↓</p>
              </div>
              <Button variant="ghost" onClick={() => setBocadillo(null)} className="p-1 shrink-0"><X className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        </div>
      )}

      {/* Ficha del agente: hablar y meterle info */}
      {fichaAgente && (
        <FichaAgente
          agente={fichaAgente}
          onCerrar={() => setFichaAgente(null)}
          onGuardado={async () => { await Promise.all([cargarAgentes(), cargarProyectos()]); }}
          onEntrarMapa={() => entrarPorPortal(fichaAgente.proyecto_id)}
          onArchivar={async () => {
            await fetch(`/api/juego/agentes/${fichaAgente.id}/archivar`, { method: 'POST', credentials: 'include' });
            setFichaAgente(null);
            await cargarAgentes();
            avisar('Quitado de tu mundo (se puede recuperar).');
          }}
          onAbrirProyecto={(slug) => navigate(`/proyectos/${slug}`)}
          onEditarAspecto={() => { setAspectoBorrador(fichaAgente.apariencia || {}); setEditandoAspecto(fichaAgente); }}
        />
      )}

      {/* Panel de proyecto real (los que ya existían antes del builder) */}
      {panel && (
        <div className="absolute top-16 right-3 z-30 w-[min(20rem,calc(100vw-1.5rem))]">
          <Card className="p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black text-slate-900 leading-snug">{panel.titulo}</p>
              <Button variant="ghost" onClick={() => setPanel(null)} className="p-1 shrink-0"><X className="w-3.5 h-3.5" /></Button>
            </div>
            {panel.descripcion && <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-4">{panel.descripcion}</p>}
            {pct !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                  <span>{panel.hechas} de {panel.tarjetas} tareas</span><span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            <Button onClick={() => navigate(`/proyectos/${panel.slug}`)} className="w-full mt-3">Abrir el proyecto</Button>
            <input
              ref={portadaProyRef} type="file" accept="image/*" className="hidden"
              onChange={e => { subirPortadaProyecto(e.target.files?.[0]); e.target.value = ''; }}
            />
            <Button
              variant="outline"
              onClick={() => portadaProyRef.current?.click()}
              disabled={subiendoPortadaProy}
              className="w-full mt-2"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5 inline" /> {subiendoPortadaProy ? 'Subiendo…' : 'Foto de portada del portal'}
            </Button>
            {renombrandoProy ? (
              <div className="flex gap-1.5 mt-2">
                <input
                  value={nombreProyBorrador}
                  onChange={e => setNombreProyBorrador(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); renombrarProyecto(); }
                    if (e.key === 'Escape') setRenombrandoProy(false);
                  }}
                  autoFocus
                  className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                />
                <Button onClick={renombrarProyecto} disabled={!nombreProyBorrador.trim()} className="shrink-0">Guardar</Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => { setNombreProyBorrador(panel.titulo); setRenombrandoProy(true); }}
                className="w-full mt-2"
              >
                <PenTool className="w-3.5 h-3.5 mr-1.5 inline" /> Cambiar el nombre
              </Button>
            )}
            <button
              onClick={quitarPortalDelMapa}
              className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 inline" /> Quitar el portal del mapa
            </button>
            <p className="mt-1.5 text-[10px] text-slate-400 leading-snug">
              Quitar el portal no borra el proyecto: sigue en tu página de Proyectos.
            </p>
          </Card>
        </div>
      )}

      {/* Editor de aspecto: el tuyo o el de una persona de tu mundo */}
      {editandoAspecto && (
        <EditorAspecto
          titulo={editandoAspecto === 'jugador' ? 'Tu aspecto' : `Aspecto de ${editandoAspecto.nombre}`}
          aspecto={aspectoBorrador}
          onCambiar={setAspectoBorrador}
          onCerrar={() => setEditandoAspecto(null)}
          onGuardar={guardarAspecto}
          guardando={guardandoAspecto}
        />
      )}

      {/* Formulario de construcción */}
      {construyendo && (
        <FormularioCrear
          tipo={construyendo}
          onCerrar={() => setConstruyendo(null)}
          onCrear={async (d) => {
            try {
              const nuevo = await crearAgente({
                ...d, tipo: construyendo,
                // Si vino del panel «Crear aquí», el edificio se planta ahí.
                x: posProyecto.current?.x, z: posProyecto.current?.z,
              });
              posProyecto.current = null;
              setConstruyendo(null);
              avisar(`${d.nombre} ya está en tu mundo. Acércate y háblale.`);
              setFichaAgente({ ...nuevo, apariencia: nuevo.apariencia || {}, memoria: [] });
            } catch (e: any) {
              avisar(e.message || 'No se ha podido crear.');
            }
          }}
        />
      )}

      {tactil && <Joystick entrada={entrada} onAtras={irAtras} />}

      {user && tactil && vertical && (
        <div className="absolute inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center px-8">
          <div className="text-center">
            <Smartphone className="w-10 h-10 text-emerald-400 mx-auto rotate-90" />
            <p className="text-sm font-black text-white mt-4">Gira el móvil</p>
            <p className="text-xs text-slate-300 mt-2 max-w-[16rem] mx-auto leading-relaxed">
              El Juego Vital se juega en horizontal, con el joystick a la izquierda y el mundo por delante.
            </p>
            <Button onClick={jugarHorizontal} className="mt-4">
              <Maximize className="w-3.5 h-3.5 mr-1.5 inline" /> Pantalla completa
            </Button>
          </div>
        </div>
      )}

      {!user && (
        <div className="absolute inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center px-5">
          <Card className="p-6 max-w-sm text-center">
            <Gamepad2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-900">El Juego Vital es tu mundo</p>
            <p className="text-xs text-slate-500 mt-2">
              Tu vida real — proyectos, personas, historia — como una aldea que construyes y recorres. Inicia sesión para entrar en la tuya.
            </p>
            <Link to="/login" className="block mt-4"><Button className="w-full">Iniciar sesión</Button></Link>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario de creación (persona o proyecto), con foto opcional.
// ---------------------------------------------------------------------------
function FormularioCrear({ tipo, onCerrar, onCrear }: {
  tipo: 'persona' | 'proyecto';
  onCerrar: () => void;
  onCrear: (d: { nombre: string; rol?: string; descripcion?: string; foto_url?: string }) => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const esPersona = tipo === 'persona';

  // `/api/uploads` recibe los bytes EN CRUDO con `?type=<mime>`, no un
  // FormData (mismo patrón que Documento.tsx y GrafoCanvas.tsx). Mandarlo
  // como formulario devolvía 400 y la foto se perdía en silencio.
  const subirFoto = async (f?: File) => {
    if (!f) return;
    setErrorFoto(null);
    setSubiendo(true);
    try {
      const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: f,
      });
      const j = await r.json();
      if (!r.ok || !j.url) { setErrorFoto(j.error || 'No se ha podido subir la foto.'); return; }
      setFotoUrl(j.url);
    } catch {
      setErrorFoto('Error de red al subir la foto.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCerrar}>
      <Card className="p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-slate-900 flex items-center gap-2">
            {esPersona ? <UserPlus className="w-4 h-4 text-emerald-600" /> : <Building2 className="w-4 h-4 text-emerald-600" />}
            {esPersona ? 'Nueva persona en tu mundo' : 'Nuevo proyecto en tu mundo'}
          </p>
          <Button variant="ghost" onClick={onCerrar} className="p-1"><X className="w-3.5 h-3.5" /></Button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
          {esPersona
            ? 'Alguien real de tu vida. Tendrá su propio agente con memoria: le cuentas cosas y las recuerda. Es una representación tuya para pensar con ella, no la persona real.'
            : 'Se crea también como proyecto real en la plataforma, con su kanban. El edificio crecerá según lo completes.'}
        </p>

        <div className="mt-4 space-y-2.5">
          <input
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder={esPersona ? 'Nombre' : 'Nombre del proyecto'}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
          />
          <input
            value={rol}
            onChange={e => setRol(e.target.value)}
            placeholder={esPersona ? 'Qué es para ti (socio, hermana, mentor…)' : 'Área de vida (hogar, trabajo, salud…)'}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
          />
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
            placeholder={esPersona ? 'Qué debería saber su agente sobre ella y sobre vuestra relación…' : 'De qué va el proyecto, dónde está hoy…'}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300"
          />

          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { subirFoto(e.target.files?.[0]); e.target.value = ''; }} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {subiendo ? 'Subiendo…' : fotoUrl ? 'Foto añadida ✓' : esPersona ? 'Subir una foto suya (opcional)' : 'Subir una foto del proyecto (opcional)'}
          </button>
          {errorFoto && (
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5">{errorFoto}</p>
          )}
          {fotoUrl && <img src={fotoUrl} alt="" className="w-full h-28 object-cover rounded-xl" />}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={async () => {
              if (!nombre.trim()) return;
              setEnviando(true);
              await onCrear({ nombre: nombre.trim(), rol: rol.trim() || undefined, descripcion: descripcion.trim() || undefined, foto_url: fotoUrl || undefined });
              setEnviando(false);
            }}
            disabled={enviando || !nombre.trim()}
            className="flex-1"
          >
            {enviando ? 'Creando…' : 'Plantar aquí'}
          </Button>
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha del agente: su memoria, meterle info, y hablar con él.
// ---------------------------------------------------------------------------
function FichaAgente({ agente, onCerrar, onGuardado, onArchivar, onAbrirProyecto, onEditarAspecto, onEntrarMapa }: {
  agente: Agente;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
  onArchivar: () => Promise<void>;
  onAbrirProyecto: (slug: string) => void;
  onEditarAspecto: () => void;
  /** Entrar en el MAPA 3D de este portal (persona convertida). */
  onEntrarMapa?: () => void;
}) {
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [memoria, setMemoria] = useState(agente.memoria || []);
  const [archivos, setArchivos] = useState(agente.archivos || []);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  // La PORTADA del portal (solo proyectos): la foto del centro, en círculo
  // con borde blanco. Local para verla al momento sin esperar la recarga.
  const [portada, setPortada] = useState(agente.foto_url || null);
  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const portadaRef = useRef<HTMLInputElement>(null);
  // Renombrar desde la ficha (petición de Eugenio para los portales).
  const [nombre, setNombre] = useState(agente.nombre);
  const [renombrando, setRenombrando] = useState(false);
  const [nombreBorrador, setNombreBorrador] = useState('');
  // Convertir una persona en PORTAL: en dos pasos, que es un cambio grande.
  const [convirtiendo, setConvirtiendo] = useState(false);

  // Al cambiar de amigo, la ficha enseña lo suyo (el componente no se
  // desmonta entre uno y otro cuando se elige desde la lista lateral).
  useEffect(() => {
    setMemoria(agente.memoria || []);
    setArchivos(agente.archivos || []);
    setPortada(agente.foto_url || null);
    setNombre(agente.nombre);
    setRenombrando(false);
    setConvirtiendo(false);
    setNota('');
    setErrorArchivo(null);
  }, [agente.id, agente.memoria, agente.archivos, agente.foto_url, agente.nombre]);

  /** Da a la persona la capacidad de portal SIN cambiarle la forma
   *  (aclaración de Eugenio): sigue siendo el mismo muñeco. */
  const convertirEnPortal = async () => {
    setConvirtiendo(true);
    try {
      const r = await fetch(`/api/juego/agentes/${agente.id}/convertir-en-portal`, {
        method: 'POST', credentials: 'include',
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setErrorArchivo(j?.error || 'No se ha podido convertir en portal.'); return; }
      await onGuardado();
      onCerrar();
    } catch {
      setErrorArchivo('Error de red al convertir.');
    } finally {
      setConvirtiendo(false);
    }
  };

  /** Guarda el nombre nuevo del agente (persona o portal de proyecto). */
  const renombrar = async () => {
    const nuevo = nombreBorrador.trim();
    if (!nuevo) return;
    try {
      const r = await fetch(`/api/juego/agentes/${agente.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevo }),
      });
      if (!r.ok) { setErrorArchivo('No se ha podido cambiar el nombre.'); return; }
      setNombre(nuevo);
      setRenombrando(false);
      await onGuardado();
    } catch {
      setErrorArchivo('Error de red al cambiar el nombre.');
    }
  };

  /** Sube el archivo y lo guarda en el archivo del agente. */
  const anadirArchivo = async (f?: File) => {
    if (!f) return;
    setErrorArchivo(null);
    setSubiendoArchivo(true);
    try {
      const s = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: f,
      });
      const js = await s.json();
      if (!s.ok || !js.url) { setErrorArchivo(js.error || 'No se ha podido subir.'); return; }
      const r = await fetch(`/api/juego/agentes/${agente.id}/archivos`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: js.url, nombre: f.name, tipo: f.type, es_imagen: !!js.esImagen }),
      });
      const j = await r.json();
      if (!r.ok) { setErrorArchivo(j.error || 'No se ha podido guardar.'); return; }
      setArchivos(Array.isArray(j.archivos) ? j.archivos : archivos);
      await onGuardado();
    } catch {
      setErrorArchivo('Error de red al subir.');
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const quitarArchivo = async (url: string) => {
    try {
      const r = await fetch(`/api/juego/agentes/${agente.id}/archivos`, {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (r.ok) { setArchivos(Array.isArray(j.archivos) ? j.archivos : archivos); await onGuardado(); }
    } catch { /* se reintenta a mano */ }
  };

  /** Sube la foto de PORTADA del portal y la guarda en su foto_url. */
  const ponerPortada = async (f?: File) => {
    if (!f) return;
    setErrorArchivo(null);
    setSubiendoPortada(true);
    try {
      const s = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: f,
      });
      const js = await s.json();
      if (!s.ok || !js.url) { setErrorArchivo(js.error || 'No se ha podido subir.'); return; }
      if (!js.esImagen) { setErrorArchivo('La portada tiene que ser una imagen (JPG o PNG).'); return; }
      const r = await fetch(`/api/juego/agentes/${agente.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_url: js.url }),
      });
      if (!r.ok) { setErrorArchivo('No se ha podido guardar la portada.'); return; }
      setPortada(js.url);
      await onGuardado();
    } catch {
      setErrorArchivo('Error de red al subir.');
    } finally {
      setSubiendoPortada(false);
    }
  };

  const meterInfo = async () => {
    const texto = nota.trim();
    if (!texto) return;
    setGuardando(true);
    try {
      const r = await fetch(`/api/juego/agentes/${agente.id}/memoria`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      const j = await r.json();
      if (r.ok) { setMemoria(Array.isArray(j.memoria) ? j.memoria : memoria); setNota(''); await onGuardado(); }
    } catch { /* se reintenta a mano */ } finally { setGuardando(false); }
  };

  return (
    <div className="absolute top-16 right-3 z-40 w-[min(21rem,calc(100vw-1.5rem))]">
      <Card className="shadow-2xl overflow-hidden">
        {portada && <img src={portada} alt="" className="w-full h-28 object-cover" />}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {renombrando ? (
                <div className="flex gap-1.5">
                  <input
                    value={nombreBorrador}
                    onChange={e => setNombreBorrador(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); renombrar(); }
                      if (e.key === 'Escape') setRenombrando(false);
                    }}
                    autoFocus
                    className="flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded-lg text-sm font-black focus:outline-none focus:border-emerald-300"
                  />
                  <Button onClick={renombrar} disabled={!nombreBorrador.trim()} className="shrink-0 px-2 py-1 text-xs">Guardar</Button>
                </div>
              ) : (
                <p className="text-sm font-black text-slate-900 truncate">
                  {nombre}
                  <button
                    onClick={() => { setNombreBorrador(nombre); setRenombrando(true); }}
                    title="Cambiar el nombre"
                    className="ml-1.5 align-middle text-slate-300 hover:text-emerald-600 transition-colors"
                  >
                    <PenTool className="w-3 h-3 inline" />
                  </button>
                </p>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {agente.tipo === 'persona' ? 'Persona' : 'Proyecto'}{agente.rol ? ` · ${agente.rol}` : ''}
              </p>
            </div>
            <Button variant="ghost" onClick={onCerrar} className="p-1 shrink-0"><X className="w-3.5 h-3.5" /></Button>
          </div>

          {agente.descripcion && <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">{agente.descripcion}</p>}

          {agente.tipo === 'persona' && (
            <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 leading-relaxed">
              Representación creada por ti. No es la persona real ni habla por ella.
            </p>
          )}

          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Lo que sabe ({memoria.length})
            </p>
            {memoria.length > 0 ? (
              <div className="max-h-24 overflow-y-auto space-y-1 mb-2">
                {memoria.slice().reverse().map((m, i) => (
                  <p key={i} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1 leading-snug">{m.texto}</p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mb-2">Todavía no le has contado nada.</p>
            )}
            <div className="flex gap-1.5">
              <input
                value={nota}
                onChange={e => setNota(e.target.value)}
                // preventDefault + stopPropagation: sin esto, el Enter se
                // escapaba de la ficha y la página acababa navegando fuera.
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.stopPropagation();
                  meterInfo();
                }}
                placeholder="Cuéntale algo que deba recordar…"
                className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
              />
              <button
                onClick={meterInfo}
                disabled={guardando || !nota.trim()}
                title="Añadir a su memoria"
                className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Su archivo: fotos y documentos que se quedan con él */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Su archivo ({archivos.length})
              </p>
              <input
                ref={archivoRef}
                type="file"
                accept="image/*,application/pdf,text/csv,application/json,application/zip,.docx,.xlsx,.pptx"
                className="hidden"
                onChange={e => { anadirArchivo(e.target.files?.[0]); e.target.value = ''; }}
              />
              <button
                onClick={() => archivoRef.current?.click()}
                disabled={subiendoArchivo}
                title="Añadir foto o documento"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
              >
                <Paperclip className="w-3 h-3" /> {subiendoArchivo ? 'Subiendo…' : 'Añadir'}
              </button>
            </div>
            {errorArchivo && (
              <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 mb-1.5">{errorArchivo}</p>
            )}
            {archivos.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                {archivos.slice().reverse().map(f => (
                  <div key={f.url} className="relative group">
                    <a href={f.url} target="_blank" rel="noreferrer" title={f.nombre} className="block">
                      {f.es_imagen ? (
                        <img src={f.url} alt={f.nombre} className="w-full h-14 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-full h-14 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center px-1">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-[8px] text-slate-500 truncate w-full text-center mt-0.5">{f.nombre}</span>
                        </div>
                      )}
                    </a>
                    <button
                      onClick={() => quitarArchivo(f.url)}
                      title="Quitar de su archivo"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hidden group-hover:flex items-center justify-center shadow"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">Sin fotos ni documentos todavía.</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            <Button
              onClick={() => { window.dispatchEvent(new CustomEvent('humanity:asistente-focus')); }}
              className="flex-1"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Hablar
            </Button>
            {agente.tipo === 'persona' && (
              <Button variant="outline" onClick={onEditarAspecto} title="Cambiar su aspecto">
                <Palette className="w-3.5 h-3.5" />
              </Button>
            )}
            {agente.tipo === 'proyecto' && (
              <>
                <input
                  ref={portadaRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { ponerPortada(e.target.files?.[0]); e.target.value = ''; }}
                />
                <Button
                  variant="outline"
                  onClick={() => portadaRef.current?.click()}
                  disabled={subiendoPortada}
                  title="Foto de portada del portal"
                >
                  <Camera className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {agente.proyecto_slug && (
              <Button variant="outline" onClick={() => onAbrirProyecto(agente.proyecto_slug!)}>
                <FolderKanban className="w-3.5 h-3.5" />
              </Button>
            )}
            <button
              onClick={onArchivar}
              title="Quitar de tu mundo"
              className="shrink-0 w-9 h-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Convertir en portal (aclaración de Eugenio: la persona CONSERVA
              su forma de muñeco; solo gana el nombre en verde y que al
              acercarte entras en su mapa). Si ya lo es, el botón entra. */}
          {agente.tipo === 'persona' && (
            agente.proyecto_id ? (
              <Button variant="outline" className="w-full mt-2" onClick={onEntrarMapa}>
                <Globe className="w-3.5 h-3.5 mr-1.5 inline" /> Entrar en su mapa
              </Button>
            ) : (
              <Button variant="outline" className="w-full mt-2" onClick={convertirEnPortal} disabled={convirtiendo}>
                <Globe className="w-3.5 h-3.5 mr-1.5 inline" /> {convirtiendo ? 'Convirtiendo…' : 'Convertir en portal (mantiene su forma)'}
              </Button>
            )
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Joystick virtual (móvil).
// ---------------------------------------------------------------------------
function Joystick({ entrada, onAtras }: {
  entrada: React.MutableRefObject<EntradaMando>;
  /** Tirar del joystick hacia ti cierra lo que haya abierto. */
  onAtras: () => boolean;
}) {
  const base = useRef<HTMLDivElement>(null);
  const activo = useRef(false);
  const centro = useRef({ x: 0, y: 0 });
  const atrasHecho = useRef(false);
  const [palanca, setPalanca] = useState({ x: 0, y: 0 });
  const MAX = 44;

  const mover = (e: React.PointerEvent) => {
    if (!activo.current) return;
    let dx = e.clientX - centro.current.x;
    let dy = e.clientY - centro.current.y;
    const l = Math.hypot(dx, dy);
    if (l > MAX) { dx = (dx / l) * MAX; dy = (dy / l) * MAX; }
    // Echar a andar en CUALQUIER dirección cierra lo que haya abierto:
    // tropezarte con alguien no puede dejarte encerrado en su ficha. Salta una
    // vez por gesto, no en bucle mientras mantienes la palanca fuera.
    const fuerza = Math.hypot(dx, dy) / MAX;
    if (fuerza > 0.6) {
      if (!atrasHecho.current) { atrasHecho.current = true; onAtras(); }
    } else if (fuerza < 0.25) {
      atrasHecho.current = false;
    }
    setPalanca({ x: dx, y: dy });
    entrada.current.x = dx / MAX;
    entrada.current.z = dy / MAX;
  };
  const pulsar = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    centro.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    activo.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    mover(e);
  };
  const soltar = () => {
    activo.current = false;
    atrasHecho.current = false;
    setPalanca({ x: 0, y: 0 });
    entrada.current.x = 0;
    entrada.current.z = 0;
  };

  return (
    // A la IZQUIERDA desde 2026-08-18: la mitad derecha de la pantalla pasó a
    // ser la que gira la cámara, como en COD Mobile. `data-ui-juego` evita que
    // el arrastre del joystick mueva además la vista.
    <div
      ref={base}
      data-ui-juego
      onPointerDown={pulsar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      className={cn('absolute bottom-8 left-5 w-28 h-28 rounded-full bg-slate-900/15 backdrop-blur-sm border border-white/50 touch-none select-none z-30')}
    >
      <div
        className="absolute w-12 h-12 rounded-full bg-white/85 shadow-lg border border-slate-200 pointer-events-none"
        style={{ left: 32 + palanca.x, top: 32 + palanca.y }}
      />
    </div>
  );
}


/** El mini-formulario del menú lateral: URL y nombre (o solo título).
 *  Para la música, `opcionesMusica` añade subir archivo y elegir de Spotify. */
function FormularioMenu({ formMenu, setFormMenu, confirmar, opcionesMusica }: {
  formMenu: { tipo: string; url: string; nombre: string };
  setFormMenu: (f: { tipo: string; url: string; nombre: string } | null) => void;
  confirmar: () => void;
  opcionesMusica?: React.ReactNode;
}) {
  const conUrl = ['enlace', 'video', 'musica'].includes(formMenu.tipo);
  return (
    <div className="mx-4 my-2 p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
        {({ enlace: 'Nuevo link', video: 'Vídeo (YouTube)', musica: 'Música', grafo: 'Grafo nuevo', mapa: 'Mapa nuevo' } as Record<string, string>)[formMenu.tipo]}
      </p>
      {formMenu.tipo === 'musica' && opcionesMusica}
      {conUrl && (
        <input
          autoFocus
          value={formMenu.url}
          onChange={e => setFormMenu({ ...formMenu, url: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); }}
          placeholder="https://…"
          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
        />
      )}
      <input
        autoFocus={!conUrl}
        value={formMenu.nombre}
        onChange={e => setFormMenu({ ...formMenu, nombre: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter') confirmar(); }}
        placeholder={conUrl ? 'Nombre visible (opcional)' : 'Título'}
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
      />
      <div className="flex gap-1.5">
        <Button onClick={confirmar} className="flex-1 text-[11px] py-1.5">Crear y colocar</Button>
        <Button variant="ghost" onClick={() => setFormMenu(null)} className="text-[11px] py-1.5">Cancelar</Button>
      </div>
    </div>
  );
}

/**
 * Las otras dos formas de plantar música (2026-08-18, petición de Eugenio):
 * SUBIR una canción tuya (MP3, M4A…) o elegirla de TU Spotify. Si el Spotify
 * no está conectado, el botón abre el OAuth en una ventanita (como YouTube).
 * Lo usan el panel «Crear aquí» y el menú lateral, con destinos distintos.
 */
function OpcionesMusica({ alSubir, alElegir }: {
  alSubir: () => void;
  alElegir: (url: string, nombre: string) => void;
}) {
  const [estado, setEstado] = useState<{ configurado: boolean; conectado: boolean; cuenta: { nombre: string | null } | null } | null>(null);
  const [eleccion, setEleccion] = useState<{ playlists: any[]; canciones: any[] } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const e = await fetch('/api/spotify/estado', { credentials: 'include' }).then(r => r.json());
      setEstado(e);
      if (e.conectado) {
        const l = await fetch('/api/spotify/eleccion', { credentials: 'include' }).then(r => r.json());
        if (l.playlists || l.canciones) setEleccion(l);
      }
    } catch { /* sin Spotify el formulario sigue valiendo: URL o archivo */ }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const oir = (ev: MessageEvent) => { if (ev.data === 'spotify:conectado') cargar(); };
    window.addEventListener('message', oir);
    return () => window.removeEventListener('message', oir);
  }, [cargar]);

  return (
    <div className="space-y-1.5">
      <button
        onClick={alSubir}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-xs font-bold text-slate-600 transition-colors"
      >
        <Music2 className="w-3.5 h-3.5 text-emerald-600" /> Subir una canción (MP3, M4A…)
      </button>
      {estado && !estado.conectado && (
        <button
          onClick={() => window.open('/api/spotify/conectar', 'spoauth', 'width=520,height=680,menubar=no,toolbar=no')}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-xs font-bold text-slate-600 transition-colors"
        >
          <span className="w-3.5 h-3.5 rounded-full bg-[#1DB954] text-white text-[8px] font-black flex items-center justify-center">♪</span>
          Conectar mi Spotify
        </button>
      )}
      {eleccion && (
        <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-1.5">
          {eleccion.playlists.length > 0 && <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Tus playlists</p>}
          {eleccion.playlists.map((p: any) => (
            <button key={p.url} onClick={() => alElegir(p.url, p.nombre)}
              className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-emerald-50 text-left">
              {p.imagen ? <img src={p.imagen} className="w-6 h-6 rounded object-cover shrink-0" /> : <Music2 className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className="text-[11px] font-bold text-slate-700 truncate">{p.nombre}</span>
              {p.pistas != null && <span className="text-[9px] text-slate-400 ml-auto shrink-0">{p.pistas}</span>}
            </button>
          ))}
          {eleccion.canciones.length > 0 && <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 pt-1">Tus canciones guardadas</p>}
          {eleccion.canciones.map((c: any) => (
            <button key={c.url} onClick={() => alElegir(c.url, `${c.nombre} — ${c.artista}`)}
              className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-emerald-50 text-left">
              {c.imagen ? <img src={c.imagen} className="w-6 h-6 rounded object-cover shrink-0" /> : <Music2 className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className="text-[11px] text-slate-700 truncate">{c.nombre} <span className="text-slate-400">· {c.artista}</span></span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[9px] text-slate-400">…o pega abajo un link de Spotify u otra web.</p>
    </div>
  );
}
