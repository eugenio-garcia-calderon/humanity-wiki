import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gamepad2, Bot, X, FolderKanban, Smartphone, Maximize } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';
import type { Cercania, EntradaMando, ProyectoJuego } from '../components/juego/tipos';

// ============================================================================
// JUEGO VITAL — Fase 1 «Pasear tu vida» (2026-08-18, design in
// memory/10_JUEGO_VITAL.md). Your real life rendered as a walkable 3D world:
// the seed village (14 houses, river, 4 naves, 118 ha), a third-person
// character (keyboard + touch joystick), your REAL projects standing as
// buildings, and the robot companion whose "talk" action focuses the real AI
// assistant bar below (mode 'bar', same as the Grafos pages).
//
// The 3D engine is heavy (~1 MB), so the whole scene is lazy-loaded: this
// page stays in the main bundle, three.js only downloads when someone plays.
// ============================================================================

const Escena = lazy(() => import('../components/juego/Escena'));

const FRASES_ROBOT = [
  '¡Hola! Soy tu robot personal. Escríbeme en la barra de abajo: puedo buscar en internet, crear documentos, lienzos o mapas, y explicarte tu mundo.',
  'Aquí estoy, como siempre. ¿Ves esos edificios del este? Son tus proyectos reales — crecen cuando completas tareas de verdad.',
  'Pregúntame lo que quieras en la barra de abajo. Y si quieres un edificio nuevo, crea un proyecto en «Mis proyectos» y aparecerá aquí.',
];

export default function JuegoVital() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const entrada = useRef<EntradaMando>({ x: 0, z: 0 });
  const [proyectos, setProyectos] = useState<ProyectoJuego[]>([]);
  const [cercania, setCercania] = useState<Cercania>(null);
  const [panel, setPanel] = useState<ProyectoJuego | null>(null);
  const [bocadillo, setBocadillo] = useState<string | null>(null);
  const [tactil] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0));

  // Mobile plays in LANDSCAPE (Eugenio, 2026-08-18: "como en COD Mobile").
  // The web can only hard-lock orientation on Android inside fullscreen;
  // iOS never allows it, so portrait shows a "rotate your phone" overlay.
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
      // Android locks in fullscreen; iOS throws/ignores and the overlay stays
      // until the player rotates by hand.
      await (screen.orientation as any)?.lock?.('landscape');
    } catch { /* iOS or unsupported: the rotate overlay is the fallback */ }
  };
  const cercaniaRef = useRef<Cercania>(null);
  cercaniaRef.current = cercania;

  // Real projects → buildings. Legitimate direct fetch: only this page uses
  // it parameterised by the session user, same exception as /api/explorer.
  useEffect(() => {
    if (!user) return;
    fetch('/api/proyectos', { credentials: 'include' })
      .then(r => r.json())
      .then((filas) => {
        if (!Array.isArray(filas)) return;
        const mios = filas
          .filter((f: any) => f.creador_user_id === user.id)
          .slice(0, 12)
          .map((f: any): ProyectoJuego => ({
            id: f.id,
            slug: f.slug,
            titulo: f.titulo,
            descripcion: f.descripcion,
            tarjetas: Number(f.tarjetas) || 0,
            hechas: Number(f.hechas) || 0,
            publico: !!f.publico,
          }));
        setProyectos(mios);
      })
      .catch(() => setProyectos([]));
  }, [user]);

  const interactuar = useCallback(() => {
    const c = cercaniaRef.current;
    if (!c) return;
    if (c.tipo === 'robot') {
      setBocadillo(FRASES_ROBOT[Math.floor(Math.random() * FRASES_ROBOT.length)]);
      // The robot IS the real assistant: focus the AI bar at the bottom.
      window.dispatchEvent(new CustomEvent('humanity:asistente-focus'));
    } else {
      setPanel(c.proyecto);
    }
  }, []);

  // Keyboard: WASD/arrows to move, E to interact. Never while typing (the
  // assistant bar is on this page — writing "wasd" there must not walk).
  useEffect(() => {
    const teclas = new Set<string>();
    const escribiendo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const aplicar = () => {
      entrada.current.x =
        +(teclas.has('d') || teclas.has('arrowright')) - +(teclas.has('a') || teclas.has('arrowleft'));
      entrada.current.z =
        +(teclas.has('s') || teclas.has('arrowdown')) - +(teclas.has('w') || teclas.has('arrowup'));
    };
    const abajo = (e: KeyboardEvent) => {
      if (escribiendo(e)) return;
      const k = e.key.toLowerCase();
      if (k === 'e') { interactuar(); return; }
      teclas.add(k);
      aplicar();
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

  // The robot's speech bubble fades on its own.
  useEffect(() => {
    if (!bocadillo) return;
    const t = setTimeout(() => setBocadillo(null), 10000);
    return () => clearTimeout(t);
  }, [bocadillo]);

  const nombre = user?.name?.split(' ')[0] || 'visitante';
  const pct = panel && panel.tarjetas > 0 ? Math.round((panel.hechas / panel.tarjetas) * 100) : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-50">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-400 animate-pulse">Construyendo tu mundo…</p>
          </div>
        }
      >
        <Escena entrada={entrada} proyectos={proyectos} onCercania={setCercania} />
      </Suspense>

      {/* Title chip */}
      <div className="absolute top-4 left-4 z-30 px-3.5 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg">
        <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-emerald-600" /> Juego Vital
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Aldea de {nombre} · {proyectos.length} {proyectos.length === 1 ? 'proyecto en pie' : 'proyectos en pie'}
        </p>
      </div>

      {/* Controls hint (desktop only: on phones the joystick speaks for itself
          and the top bar is too narrow for two chips) */}
      <div className="hidden sm:block absolute top-4 right-4 z-30 px-3 py-1.5 bg-white/80 backdrop-blur border border-slate-200 rounded-xl shadow">
        <p className="text-[10px] font-bold text-slate-500">
          {tactil ? 'Joystick para caminar · toca los avisos para interactuar' : 'WASD o flechas para caminar · E para interactuar'}
        </p>
      </div>

      {/* Proximity prompt */}
      {cercania && !panel && !bocadillo && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <Button onClick={interactuar} className="shadow-xl">
            {cercania.tipo === 'robot'
              ? <>​<Bot className="w-4 h-4 mr-1.5 inline" />Hablar con tu robot{!tactil && ' (E)'}</>
              : <>​<FolderKanban className="w-4 h-4 mr-1.5 inline" />Ver «{cercania.proyecto.titulo}»{!tactil && ' (E)'}</>}
          </Button>
        </div>
      )}

      {/* Robot speech bubble */}
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
              <Button variant="ghost" onClick={() => setBocadillo(null)} className="p-1 shrink-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Project panel */}
      {panel && (
        <div className="absolute top-20 right-4 z-30 w-[min(20rem,calc(100vw-2rem))]">
          <Card className="p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black text-slate-900 leading-snug">{panel.titulo}</p>
              <Button variant="ghost" onClick={() => setPanel(null)} className="p-1 shrink-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {panel.descripcion && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-4">{panel.descripcion}</p>
            )}
            {pct !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                  <span>{panel.hechas} de {panel.tarjetas} tareas</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            <Button onClick={() => navigate(`/proyectos/${panel.slug}`)} className="w-full mt-3">
              Abrir el proyecto
            </Button>
          </Card>
        </div>
      )}

      {/* Touch joystick */}
      {tactil && <Joystick entrada={entrada} />}

      {/* Landscape overlay: phones play horizontal, like the games they know */}
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

      {/* Visitor overlay */}
      {!user && (
        <div className="absolute inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center px-5">
          <Card className="p-6 max-w-sm text-center">
            <Gamepad2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-900">El Juego Vital es tu mundo</p>
            <p className="text-xs text-slate-500 mt-2">
              Tu vida real — proyectos, conocimiento, historia — como una aldea que puedes recorrer. Inicia sesión para entrar en la tuya.
            </p>
            <Link to="/login" className="block mt-4">
              <Button className="w-full">Iniciar sesión</Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtual joystick (mobile). Writes straight into the shared input ref.
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
      className="absolute bottom-32 left-5 w-28 h-28 rounded-full bg-slate-900/15 backdrop-blur-sm border border-white/50 touch-none select-none z-30"
    >
      <div
        className="absolute w-12 h-12 rounded-full bg-white/85 shadow-lg border border-slate-200 pointer-events-none"
        style={{ left: 32 + palanca.x, top: 32 + palanca.y }}
      />
    </div>
  );
}
