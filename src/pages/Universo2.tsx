import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles, User as UserIcon } from 'lucide-react';
import { useHelpers } from '../contexts/DataContext';
import { challengeLinkTo } from '../utils/entityLinks';
import { slugify } from '../utils/slugify';
import UniversoSwitcher from '../components/universo/UniversoSwitcher';

// ============================================================================
// UNIVERSO II — «El Pulso» (2026-08-06)
// ============================================================================
// La lectura opuesta al cosmos: una portada EDITORIAL ultraminimalista.
// Fondo blanco, tipografía enorme, líneas finas, y el color reservado al
// significado (retos rojo, soluciones verde, datos azul, voces ámbar).
// Todo respira: contadores que laten al cargar, secciones que emergen al
// hacer scroll, filas que se deslizan al pasar el ratón. Cero decoración
// que no sea información — el lujo es el espacio en blanco.

/** Contador que late de 0 al valor real al entrar en pantalla. */
function useCountUp(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Aparece con una transición suave cuando entra en el viewport. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOn(true); ob.disconnect(); }
    }, { threshold: 0.12 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${on ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
    >
      {children}
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent: string }) {
  const v = useCountUp(n);
  return (
    <div className="text-center sm:text-left">
      <p className="text-5xl sm:text-6xl font-black tracking-tighter tabular-nums" style={{ color: accent }}>{v}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default function Universo2() {
  const helpers = useHelpers();
  const [graphs, setGraphs] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [pubs, setPubs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/graphs', { credentials: 'include' }).then(r => r.json()).then(j => setGraphs(Array.isArray(j) ? j : [])).catch(() => {});
    fetch('/api/maps', { credentials: 'include' }).then(r => r.json()).then(j => setMaps(Array.isArray(j) ? j : [])).catch(() => {});
    fetch('/api/feed?limit=6', { credentials: 'include' }).then(r => r.json()).then(j => setPubs(Array.isArray(j) ? j : [])).catch(() => {});
  }, []);

  const featured = graphs[0];
  const retos = (helpers.challenges || []).slice(0, 5);
  const soluciones = (helpers.solutions || []).slice(0, 4);
  const indicadores = (helpers.indicators || []).slice(0, 5);
  const vozHumana = pubs.find(p => !String(p.author_user_id || '').startsWith('U_IA'));
  const vozIA = pubs.find(p => String(p.author_user_id || '').startsWith('U_IA'));

  return (
    <div className="relative w-full h-full overflow-y-auto bg-white text-slate-900">
      <UniversoSwitcher current={2} />

      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-20 sm:pt-28 pb-48">

        {/* ------------------------------------------------------ portada */}
        <Reveal>
          <div className="flex items-center gap-2.5 mb-8">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Universo II · El pulso</p>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.95]">
            El conocimiento
            <br />de la humanidad,
            <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600">vivo.</span>
          </h1>
          <p className="text-sm text-slate-500 mt-8 max-w-md leading-relaxed">
            Inteligencia natural <span className="font-black text-amber-500">×</span> artificial escribiendo juntas
            la wiki de la humanidad — retos, soluciones, mapas y datos que laten en tiempo real.
          </p>
        </Reveal>

        {/* ------------------------------------------------------ latidos */}
        <Reveal delay={150}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-16 pb-16 border-b border-slate-100">
            <Stat n={graphs.length} label="grafos" accent="#7c3aed" />
            <Stat n={(helpers.challenges || []).length} label="retos" accent="#dc2626" />
            <Stat n={(helpers.solutions || []).length} label="soluciones" accent="#16a34a" />
            <Stat n={maps.length + 1} label="mapas" accent="#0284c7" />
          </div>
        </Reveal>

        {/* ------------------------------------------ el grafo del momento */}
        {featured && (
          <Reveal className="mt-20">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-violet-600 mb-5">El grafo del momento</p>
            <Link to={`/grafos/${featured.slug}`} className="group block relative rounded-3xl overflow-hidden bg-slate-950">
              {(featured.cover_image || featured.cover_video_id) && (
                <img
                  src={featured.cover_image || `https://img.youtube.com/vi/${featured.cover_video_id}/hqdefault.jpg`}
                  alt="" loading="lazy"
                  className="w-full h-72 sm:h-96 object-cover opacity-80 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
                {featured.is_reto && (
                  <span className="inline-flex text-[9px] font-black uppercase tracking-[0.25em] text-white bg-red-600 px-2.5 py-1 rounded-full mb-3">Reto</span>
                )}
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight max-w-xl">
                  {featured.title}
                </h2>
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 mt-4 group-hover:gap-3 transition-all">
                  Entrar al grafo <ArrowUpRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </Link>
          </Reveal>
        )}

        {/* ------------------------------------------------ retos abiertos */}
        <Reveal className="mt-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-red-600 mb-2">Retos abiertos</p>
          <div>
            {retos.map((c: any, i: number) => (
              <Link
                key={c.id}
                to={challengeLinkTo(c)}
                className="group flex items-baseline gap-6 py-5 border-b border-slate-100 hover:border-red-200 transition-colors"
              >
                <span className="text-xs font-black text-slate-300 tabular-nums group-hover:text-red-500 transition-colors">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight group-hover:translate-x-3 group-hover:text-red-600 transition-all duration-300">
                  {c.title}
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-200 ml-auto shrink-0 group-hover:text-red-500 group-hover:-translate-y-1 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </Reveal>

        {/* ---------------------------------------------- lo que funciona */}
        <Reveal className="mt-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-green-600 mb-6">Lo que funciona</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {soluciones.map((s: any, i: number) => (
              <Link
                key={i}
                to={`/soluciones/${slugify(s.title)}`}
                className="group rounded-2xl border border-slate-100 hover:border-green-300 hover:bg-green-50/50 p-5 transition-all duration-300"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mb-3" />
                <p className="text-base font-black tracking-tight leading-snug group-hover:text-green-700 transition-colors">{s.title}</p>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* --------------------------------------------------- lo medimos */}
        <Reveal className="mt-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-600 mb-6">Lo medimos</p>
          <div className="space-y-4">
            {indicadores.map((ind: any, i: number) => (
              <Link key={ind.id} to={`/indicadores/${ind.id}`} className="group block">
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-sm font-bold tracking-tight group-hover:text-blue-700 transition-colors">{ind.name}</p>
                  <ArrowUpRight className="w-3 h-3 text-slate-200 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="h-px bg-slate-100 relative overflow-hidden rounded-full">
                  <Reveal delay={i * 120} className="absolute inset-y-0 left-0 w-2/3">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-transparent" />
                  </Reveal>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* -------------------------------------------------------- voces */}
        {(vozHumana || vozIA) && (
          <Reveal className="mt-24">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-500 mb-6">Dos inteligencias, una conversación</p>
            <div className="grid sm:grid-cols-2 gap-5">
              {vozHumana && (
                <Link to="/muro" className="group rounded-3xl bg-slate-50 hover:bg-amber-50/70 p-7 transition-colors duration-300">
                  <UserIcon className="w-4 h-4 text-amber-500 mb-4" />
                  <p className="text-lg font-black tracking-tight leading-snug line-clamp-3">{vozHumana.title || vozHumana.body?.slice(0, 90)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4">{vozHumana.author_name} · humana</p>
                </Link>
              )}
              {vozIA && (
                <Link to="/muro" className="group rounded-3xl bg-slate-950 hover:bg-slate-900 p-7 transition-colors duration-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 mb-4" />
                  <p className="text-lg font-black tracking-tight leading-snug line-clamp-3 text-white">{vozIA.title || vozIA.body?.slice(0, 90)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-4">{vozIA.author_name} · inteligencia artificial</p>
                </Link>
              )}
            </div>
          </Reveal>
        )}

        {/* ---------------------------------------------------------- fin */}
        <Reveal className="mt-32 text-center">
          <p className="text-3xl sm:text-5xl font-black tracking-tighter leading-tight">
            Esto lo escribimos
            <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-emerald-600">entre todos.</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link to="/mapa" className="px-5 py-2.5 rounded-full bg-slate-950 text-white text-xs font-black hover:scale-105 transition-transform">Explora el mapa</Link>
            <Link to="/universo" className="px-5 py-2.5 rounded-full border border-slate-200 text-xs font-black hover:border-slate-400 transition-colors">Sumérgete en el cosmos</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
