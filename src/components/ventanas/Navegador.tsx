// ============================================================================
// EL NAVEGADOR DE LA APP (2026-08-19, petición de Eugenio)
// ============================================================================
// La parte visible: barra de direcciones, atrás/adelante, recargar, y el marco
// donde se pinta la web. Todo lo que se ve aquí ha pasado antes por
// `/api/navegador/ver`, que es lo que hace posible verlo (ver `navegador.ts`
// para el porqué: casi ninguna web se deja meter en un marco directamente).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Search, Loader2, Bot, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Lo que se escribe en la barra → una dirección de verdad. Si no parece una
 *  dirección, se busca: es lo que espera cualquiera de una barra así. */
export function comoUrl(texto: string): string {
  const t = texto.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  // Un dominio suelto («wikipedia.org», «dji.com/es»): se le pone el https.
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) return `https://${t}`;
  return `https://duckduckgo.com/html/?q=${encodeURIComponent(t)}`;
}

const proxy = (url: string) => `/api/navegador/ver?url=${encodeURIComponent(url)}`;

/** Un vídeo tiene puerta oficial: el reproductor embebido, que trae el vídeo
 *  directo de su CDN. El proxy jamás podría servirlo (los streams van firmados
 *  y por rangos); el embed existe exactamente para meterse en otras webs. */
export function reproductorDe(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^(www|m|music)\./, '');
    if (h === 'youtu.be') {
      const id = u.pathname.split('/')[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      const v = u.pathname === '/watch' && u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
      if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    }
    if (h === 'vimeo.com') {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch { /* no era una dirección */ }
  return null;
}

export default function Navegador({ inicial, onTitulo, onUrl }: {
  inicial: string;
  onTitulo?: (t: string) => void;
  onUrl?: (u: string) => void;
}) {
  const [historia, setHistoria] = useState<string[]>([inicial]);
  const [donde, setDonde] = useState(0);
  const [texto, setTexto] = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const marco = useRef<HTMLIFrameElement>(null);

  const url = historia[donde] || '';

  useEffect(() => { setTexto(url); onUrl?.(url); }, [url]);

  /** Ir a una dirección nueva: corta la historia hacia delante, como un
   *  navegador de verdad. */
  const ir = useCallback((destino: string) => {
    const u = comoUrl(destino);
    if (!u) return;
    setError(null);
    setCargando(true);
    setHistoria(h => [...h.slice(0, donde + 1), u]);
    setDonde(d => d + 1);
  }, [donde]);

  const atras = () => { if (donde > 0) { setCargando(true); setDonde(d => d - 1); } };
  const alante = () => { if (donde < historia.length - 1) { setCargando(true); setDonde(d => d + 1); } };
  const recargar = () => { setCargando(true); setError(null); setRecarga(n => n + 1); };

  // La página avisa de dónde está de verdad (después de redirecciones) y de si
  // has pulsado un enlace: el mensaje lo manda el script que inyecta el proxy.
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.navegadorHumanity !== 'aqui' || typeof d.url !== 'string') return;
      setCargando(false);
      setHistoria(h => (h[donde] === d.url ? h : [...h.slice(0, donde + 1), d.url]));
      setDonde(dd => (historia[dd] === d.url ? dd : dd + 1));
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [donde, historia]);

  // Se pide el título aparte: no se puede leer el del marco (es otro origen a
  // efectos prácticos y el navegador lo bloquea), pero el servidor sí lo sabe.
  useEffect(() => {
    if (!url) return;
    let vivo = true;
    fetch(`/api/navegador/leer?url=${encodeURIComponent(url)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!vivo) return;
        if (j.error) { setError(j.error); return; }
        if (j.titulo) onTitulo?.(j.titulo.slice(0, 60));
      })
      .catch(() => { /* el marco enseñará su propio error */ });
    return () => { vivo = false; };
  }, [url]);

  return (
    <div className="flex flex-col h-full">
      {/* La barra */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <button onClick={atras} disabled={donde === 0} title="Atrás"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={alante} disabled={donde >= historia.length - 1} title="Adelante"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={recargar} title="Recargar"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200">
          {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        </button>
        <form
          onSubmit={e => { e.preventDefault(); ir(texto); }}
          className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 focus-within:border-sky-300"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onFocus={e => e.currentTarget.select()}
            placeholder="Escribe una dirección o busca…"
            className="flex-1 min-w-0 text-[11px] text-slate-700 focus:outline-none bg-transparent"
          />
        </form>
        {/* La salida de emergencia: hay webs que son APLICACIONES (Gmail,
            Instagram…) y ningún proxy de texto puede ejecutarlas. Este botón
            abre la dirección en una pestaña del navegador de verdad. */}
        <button onClick={() => { if (url) window.open(url, '_blank', 'noopener'); }} title="Abrir en una pestaña del navegador"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200 shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <span title="La IA del chat ve esta página"
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shrink-0">
          <Bot className="w-3 h-3" />La IA lo ve
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Un vídeo va en el reproductor OFICIAL, sin nuestro sandbox: el marco
          es de otro origen (youtube-nocookie.com), así que ya no puede tocar
          la app, y el reproductor necesita su almacenamiento para arrancar —
          dentro del sandbox de origen opaco se queda en negro. Es el mismo
          embed que usa cualquier web del mundo para poner un vídeo. */}
      {reproductorDe(url) ? (
        <iframe
          key={`${url}|${recarga}`}
          src={reproductorDe(url)!}
          title="Reproductor de vídeo"
          onLoad={() => setCargando(false)}
          className="flex-1 w-full border-0 bg-black"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          // Sin `no-referrer` A PROPÓSITO: YouTube exige saber qué web lo
          // embebe (error 153 si no llega el Referer). Solo viaja nuestro
          // origen, que es público de todos modos.
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
      /* La web. `sandbox` sin `allow-same-origin`: lo de fuera se dibuja pero
         NO puede leer nuestras cookies ni nuestra sesión aunque venga servido
         desde nuestro dominio. Es la línea que separa «ver una web» de
         «dejarle entrar en tu cuenta». */
      <iframe
        ref={marco}
        key={`${url}|${recarga}`}
        src={url ? proxy(url) : 'about:blank'}
        title="Navegador"
        onLoad={() => setCargando(false)}
        className="flex-1 w-full border-0 bg-white"
        // `allow-scripts` SIN `allow-same-origin`: la página corre su código
        // pero en un origen OPACO, sin acceso a nuestras cookies ni a la app.
        // Poner los dos juntos es lo peligroso; este par es el correcto.
        sandbox="allow-scripts allow-forms allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
      />
      )}
    </div>
  );
}
