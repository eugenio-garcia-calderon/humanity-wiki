import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Youtube, Heart, ListVideo, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import CuentaDeGoogle from '../components/social/CuentaDeGoogle';

// ============================================================================
// MIS VÍDEOS — «pintados a nuestra manera» (2026-08-23) — fase 3 de 5
// ============================================================================
// Eugenio pidió justo eso: traer los vídeos guardados de YouTube «pero los
// pintaremos a nuestra manera». La pregunta era qué significa eso, y la
// respuesta que se ha tomado: **lo que YouTube no te deja hacer con tus propios
// vídeos guardados.**
//
//   · Verlos TODOS a la vez, los «me gusta» y las listas juntos, que en YouTube
//     son pantallas distintas.
//   · Buscarlos por título o por canal, que en la lista de «me gusta» de
//     YouTube no se puede.
//   · Sin recomendaciones al lado, sin autoplay, sin nada empujándote al
//     siguiente. Es tu lista, no su escaparate.
//
// ── EL VÍDEO SE VE EN EL REPRODUCTOR DE YOUTUBE, Y ES A PROPÓSITO ───────────
// Se abre el `embed` oficial. Ni se descarga, ni se retransmite, ni se
// recodifica: eso sería quitarle la visita al canal que lo hizo, y además
// ilegal. Nosotros ponemos el orden y la búsqueda; el vídeo lo pone YouTube.
//
// ── Y SE DICE DE CUÁNDO ES LA LISTA ─────────────────────────────────────────
// Hay copia local para que esto abra rápido. Una copia que se presenta como si
// fuera el estado actual de tu cuenta es la forma más barata de que alguien
// crea que ha perdido un vídeo, así que la fecha se enseña siempre.

interface Video {
  video_id: string; titulo: string; canal: string | null; miniatura: string | null;
  duracion: string | null; publicado_at: string | null;
  origen: 'gusta' | 'lista'; lista_id: string | null; lista_nombre: string | null;
  visto_at: string;
}

/** «PT4M13S» → «4:13». YouTube lo da en ISO 8601 y nadie lee eso. */
function duracionLegible(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [h, min, s] = [Number(m[1] || 0), Number(m[2] || 0), Number(m[3] || 0)];
  return h > 0
    ? `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${min}:${String(s).padStart(2, '0')}`;
}

const cuandoFue = (iso: string | null) => {
  if (!iso) return null;
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
};

const AVISOS: Record<string, string> = {
  'sin-cuenta': 'Conecta tu cuenta de Google para traer tus vídeos.',
  'cuota': 'YouTube ha dicho que hoy ya no acepta más peticiones nuestras. Lo que ves es de antes.',
  'no-responde': 'YouTube no ha respondido. Lo que ves es la última copia.',
};

export default function MisVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [alDia, setAlDia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todo' | 'gusta' | 'lista'>('todo');
  const [viendo, setViendo] = useState<Video | null>(null);

  const cargar = useCallback((forzar = false) => {
    setCargando(true);
    fetch(`/api/mis-videos${forzar ? '?forzar=si' : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { setVideos(j.videos || []); setAlDia(j.alDia || null); setAviso(j.aviso || null); })
      .catch(() => setAviso('no-responde'))
      .finally(() => setCargando(false));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const listados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return videos.filter(v =>
      (filtro === 'todo' || v.origen === filtro)
      && (!t || v.titulo.toLowerCase().includes(t) || (v.canal || '').toLowerCase().includes(t)));
  }, [videos, busca, filtro]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-start gap-3 flex-wrap">
        <h1 className="text-lg font-black text-slate-900 inline-flex items-center gap-2">
          <Youtube className="w-5 h-5 text-rose-600" /> Mis vídeos
        </h1>
        {alDia && (
          <span className="text-[11px] text-slate-400 self-center">al día {cuandoFue(alDia)}</span>
        )}
        <button
          onClick={() => cargar(true)}
          disabled={cargando}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Traer de YouTube
        </button>
      </div>

      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed max-w-2xl">
        Tus «me gusta» y tus listas, juntos y buscables — que en YouTube son pantallas distintas y
        no se pueden buscar. Sin recomendaciones al lado y sin nada que te empuje al siguiente.
      </p>

      {aviso === 'sin-cuenta' ? (
        <div className="mt-4"><CuentaDeGoogle /></div>
      ) : aviso ? (
        <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" /> {AVISOS[aviso] || aviso}
        </p>
      ) : null}

      {videos.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título o canal…"
            className="flex-1 min-w-[12rem] px-3 py-1.5 rounded-full border border-slate-200 text-xs focus:outline-none focus:border-emerald-400"
          />
          {([['todo', 'Todos'], ['gusta', 'Me gusta'], ['lista', 'En listas']] as const).map(([v, t]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                filtro === v ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:border-slate-300')}
            >
              {t}
            </button>
          ))}
          <span className="text-[11px] text-slate-400">{listados.length} de {videos.length}</span>
        </div>
      )}

      {cargando && videos.length === 0 && (
        <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      )}

      {!cargando && videos.length === 0 && aviso !== 'sin-cuenta' && (
        <p className="py-16 text-center text-xs text-slate-400">
          No hay vídeos guardados en tu cuenta de YouTube, o todavía no se han traído.
        </p>
      )}

      <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {listados.map(v => (
          <article key={`${v.origen}-${v.lista_id || ''}-${v.video_id}`}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors">
            <button onClick={() => setViendo(v)} className="block w-full text-left">
              <span className="relative block bg-slate-100 aspect-video">
                {v.miniatura && (
                  <img src={v.miniatura} alt="" loading="lazy" className="w-full h-full object-cover" />
                )}
                {duracionLegible(v.duracion) && (
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold tabular-nums">
                    {duracionLegible(v.duracion)}
                  </span>
                )}
              </span>
              <span className="block p-2.5">
                <span className="block text-xs font-bold text-slate-800 line-clamp-2 leading-snug">{v.titulo}</span>
                {v.canal && <span className="block mt-0.5 text-[10px] text-slate-400 truncate">{v.canal}</span>}
              </span>
            </button>
            <div className="px-2.5 pb-2.5 flex items-center gap-1.5">
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide',
                v.origen === 'gusta' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500')}>
                {v.origen === 'gusta' ? <Heart className="w-2.5 h-2.5" /> : <ListVideo className="w-2.5 h-2.5" />}
                {v.origen === 'gusta' ? 'Me gusta' : (v.lista_nombre || 'Lista')}
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${v.video_id}`}
                target="_blank" rel="noopener noreferrer"
                title="Abrir en YouTube"
                className="ml-auto w-6 h-6 grid place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* EL REPRODUCTOR OFICIAL. No se descarga el vídeo ni se retransmite: eso
          le quitaría la visita al canal que lo hizo, además de ser ilegal.
          Nosotros ponemos el orden y la búsqueda; el vídeo lo pone YouTube. */}
      {viendo && (
        <div
          role="dialog"
          aria-label={viendo.titulo}
          onClick={() => setViendo(null)}
          className="fixed inset-0 z-[70] bg-slate-950/80 grid place-items-center p-4 animate-in fade-in duration-150"
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-4xl">
            <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${viendo.video_id}?autoplay=1&rel=0`}
                title={viendo.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
            <p className="mt-2 text-xs font-bold text-white">{viendo.titulo}</p>
            {viendo.canal && <p className="text-[11px] text-slate-400">{viendo.canal}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
