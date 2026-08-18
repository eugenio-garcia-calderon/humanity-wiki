import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';
import {
  Gamepad2, Bot, X, FolderKanban, Smartphone, Maximize, UserPlus, Building2,
  Hammer, MessageCircle, Plus, Trash2, Camera, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import type { Agente, Cercania, EntradaMando, ProyectoJuego } from '../components/juego/tipos';

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

const Escena = lazy(() => import('../components/juego/Escena'));

const FRASES_ROBOT = [
  'Aquí estoy. Puedo hacerte la entrevista fundacional para llenar tu mundo, o construir lo que me pidas. Escríbeme abajo.',
  '¿Ves los edificios? Son tus proyectos reales — crecen cuando completas tareas de verdad. Pídeme lo que quieras.',
  'Puedo buscar en internet, crear documentos y levantar cosas en tu mundo. Tú dirás.',
];

export default function JuegoVital() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const entrada = useRef<EntradaMando>({ x: 0, z: 0 });
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
  const cercaniaRef = useRef<Cercania>(null);
  cercaniaRef.current = cercania;
  const agentesRef = useRef<Agente[]>([]);
  agentesRef.current = agentes;

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

  useEffect(() => {
    if (!user) return;
    cargarAgentes();
    // Fetch directo justificado: solo esta página lo usa y va parametrizado
    // por la sesión (misma excepción que /api/explorer en el mapa).
    fetch('/api/proyectos', { credentials: 'include' })
      .then(r => r.json())
      .then((filas) => {
        if (!Array.isArray(filas)) return;
        setProyectos(filas
          .filter((f: any) => f.creador_user_id === user.id)
          .slice(0, 12)
          .map((f: any): ProyectoJuego => ({
            id: f.id, slug: f.slug, titulo: f.titulo, descripcion: f.descripcion,
            tarjetas: Number(f.tarjetas) || 0, hechas: Number(f.hechas) || 0, publico: !!f.publico,
          })));
      })
      .catch(() => setProyectos([]));
  }, [user, cargarAgentes]);

  // --- conversación: quién habla --------------------------------------------
  /** Manda al asistente el estado del mundo y con quién se habla. */
  const hablarCon = useCallback((agente: Agente | null) => {
    window.dispatchEvent(new CustomEvent('humanity:juego-contexto', {
      detail: {
        mundo: 'aldea',
        agente,
        agentes: agentesRef.current.map(a => ({ id: a.id, tipo: a.tipo, nombre: a.nombre, conversation_id: a.conversation_id })),
        proyectos_reales: proyectos.map(p => ({ titulo: p.titulo, tareas: p.tarjetas, hechas: p.hechas })),
        vacio: agentesRef.current.length === 0 && proyectos.length === 0,
      },
    }));
    window.dispatchEvent(new CustomEvent('humanity:asistente-focus'));
  }, [proyectos]);

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
      for (const [i, a] of (acciones || []).entries()) {
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
  }) => {
    const r = await fetch('/api/juego/agentes', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...d,
        // Se planta delante del jugador, donde está mirando el mundo.
        x: jugadorPos.x + (d.dx ?? (Math.random() * 6 - 3)),
        z: jugadorPos.z + (d.dz ?? -5),
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'No se ha podido crear.');
    await cargarAgentes();
    return j;
  };

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

  // Teclado: WASD/flechas para andar, E para interactuar. Nunca mientras se
  // escribe (la barra del asistente vive en esta misma página).
  useEffect(() => {
    const teclas = new Set<string>();
    const escribiendo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const aplicar = () => {
      entrada.current.x = +(teclas.has('d') || teclas.has('arrowright')) - +(teclas.has('a') || teclas.has('arrowleft'));
      entrada.current.z = +(teclas.has('s') || teclas.has('arrowdown')) - +(teclas.has('w') || teclas.has('arrowup'));
    };
    const abajo = (e: KeyboardEvent) => {
      if (escribiendo(e)) return;
      const k = e.key.toLowerCase();
      if (k === 'e') { interactuar(); return; }
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
  }, [interactuar]);

  useEffect(() => {
    if (!bocadillo) return;
    const t = setTimeout(() => setBocadillo(null), 12000);
    return () => clearTimeout(t);
  }, [bocadillo]);

  const nombre = user?.name?.split(' ')[0] || 'visitante';
  const pct = panel && panel.tarjetas > 0 ? Math.round((panel.hechas / panel.tarjetas) * 100) : null;
  const personas = agentes.filter(a => a.tipo === 'persona');
  const proyectosAg = agentes.filter(a => a.tipo === 'proyecto');

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-50">
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-slate-400 animate-pulse">Construyendo tu mundo…</p></div>}>
        <Escena entrada={entrada} proyectos={proyectos} agentes={agentes} jugadorPos={jugadorPos} onCercania={setCercania} />
      </Suspense>

      {/* Cabecera */}
      <div className="absolute top-3 left-3 z-30 px-3 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg">
        <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-emerald-600" /> Juego Vital
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Aldea de {nombre} · {personas.length} {personas.length === 1 ? 'persona' : 'personas'} · {proyectosAg.length + proyectos.length} proyectos
        </p>
      </div>

      <div className="hidden sm:block absolute top-3 right-3 z-30 px-3 py-1.5 bg-white/80 backdrop-blur border border-slate-200 rounded-xl shadow">
        <p className="text-[10px] font-bold text-slate-500">WASD para caminar · E para hablar</p>
      </div>

      {aviso && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
          {aviso}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* BUILDER: la barra de construcción, siempre a mano (estilo Sims)   */}
      {/* ---------------------------------------------------------------- */}
      {user && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
          <div className="px-2 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg flex flex-col gap-1.5">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center px-1 flex items-center justify-center gap-1">
              <Hammer className="w-2.5 h-2.5" /> Crear
            </p>
            <button
              onClick={() => setConstruyendo('persona')}
              title="Crear una persona de tu vida aquí"
              className="w-11 h-11 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setConstruyendo('proyecto')}
              title="Crear un proyecto aquí"
              className="w-11 h-11 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition-colors"
            >
              <Building2 className="w-5 h-5" />
            </button>
            <div className="h-px bg-slate-200 mx-1" />
            <button
              onClick={() => { setBocadillo('Dime «hazme la entrevista fundacional» y empezamos por tus áreas de vida.'); hablarCon(null); }}
              title="Habla con tu robot"
              className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors"
            >
              <Bot className="w-5 h-5" />
            </button>
          </div>

          {/* Habitantes: ir a hablar con cualquiera sin caminar */}
          {agentes.length > 0 && (
            <div className="px-2 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg max-h-[34vh] overflow-y-auto w-[8.5rem]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1 mb-1">Tu mundo</p>
              {agentes.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setFichaAgente(a); hablarCon(a); }}
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-emerald-50 text-left transition-colors"
                >
                  {a.tipo === 'persona'
                    ? <UserPlus className="w-3 h-3 text-slate-400 shrink-0" />
                    : <Building2 className="w-3 h-3 text-slate-400 shrink-0" />}
                  <span className="text-[10px] font-bold text-slate-600 truncate">{a.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aviso de proximidad */}
      {cercania && !panel && !fichaAgente && !bocadillo && !construyendo && (
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
          onGuardado={async () => { await cargarAgentes(); }}
          onArchivar={async () => {
            await fetch(`/api/juego/agentes/${fichaAgente.id}/archivar`, { method: 'POST', credentials: 'include' });
            setFichaAgente(null);
            await cargarAgentes();
            avisar('Quitado de tu mundo (se puede recuperar).');
          }}
          onAbrirProyecto={(slug) => navigate(`/proyectos/${slug}`)}
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
          </Card>
        </div>
      )}

      {/* Formulario de construcción */}
      {construyendo && (
        <FormularioCrear
          tipo={construyendo}
          onCerrar={() => setConstruyendo(null)}
          onCrear={async (d) => {
            try {
              const nuevo = await crearAgente({ ...d, tipo: construyendo });
              setConstruyendo(null);
              avisar(`${d.nombre} ya está en tu mundo. Acércate y háblale.`);
              setFichaAgente({ ...nuevo, apariencia: nuevo.apariencia || {}, memoria: [] });
            } catch (e: any) {
              avisar(e.message || 'No se ha podido crear.');
            }
          }}
        />
      )}

      {tactil && <Joystick entrada={entrada} />}

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
function FichaAgente({ agente, onCerrar, onGuardado, onArchivar, onAbrirProyecto }: {
  agente: Agente;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
  onArchivar: () => Promise<void>;
  onAbrirProyecto: (slug: string) => void;
}) {
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [memoria, setMemoria] = useState(agente.memoria || []);

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
        {agente.foto_url && <img src={agente.foto_url} alt="" className="w-full h-28 object-cover" />}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{agente.nombre}</p>
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

          <div className="flex items-center gap-1.5 mt-3">
            <Button
              onClick={() => { window.dispatchEvent(new CustomEvent('humanity:asistente-focus')); }}
              className="flex-1"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Hablar
            </Button>
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
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Joystick virtual (móvil).
// ---------------------------------------------------------------------------
function Joystick({ entrada }: { entrada: React.MutableRefObject<EntradaMando> }) {
  const base = useRef<HTMLDivElement>(null);
  const activo = useRef(false);
  const centro = useRef({ x: 0, y: 0 });
  const [palanca, setPalanca] = useState({ x: 0, y: 0 });
  const MAX = 44;

  const mover = (e: React.PointerEvent) => {
    if (!activo.current) return;
    let dx = e.clientX - centro.current.x;
    let dy = e.clientY - centro.current.y;
    const l = Math.hypot(dx, dy);
    if (l > MAX) { dx = (dx / l) * MAX; dy = (dy / l) * MAX; }
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
    setPalanca({ x: 0, y: 0 });
    entrada.current.x = 0;
    entrada.current.z = 0;
  };

  return (
    <div
      ref={base}
      onPointerDown={pulsar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      className={cn('absolute bottom-28 right-5 w-28 h-28 rounded-full bg-slate-900/15 backdrop-blur-sm border border-white/50 touch-none select-none z-30')}
    >
      <div
        className="absolute w-12 h-12 rounded-full bg-white/85 shadow-lg border border-slate-200 pointer-events-none"
        style={{ left: 32 + palanca.x, top: 32 + palanca.y }}
      />
    </div>
  );
}
