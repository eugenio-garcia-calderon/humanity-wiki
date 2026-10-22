import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, Globe2, EyeOff, Puzzle, Sprout, Network, GitBranch, Database, MapPin, Link2, Cpu, User, Building2,
  Landmark, Heart, Megaphone, Lightbulb, ShieldCheck, HandHeart, Rocket, Users, Sparkles,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { miniatura } from '../../../utils/miniatura';
import { Infografia, type PasoInfografia } from '../infografiaRed/Infografia';

// ============================================================================
// LA PRESENTACIÓN, EN FORMATO WEB (2026-10-22, Eugenio)
// ============================================================================
// «Una presentación de la plataforma de soluciones para mejorar la humanidad,
// en formato web, con capturas reales, funcionalidades, cómo funciona la
// conexión a nivel técnico, el número de datos que prevemos conectar…»
//
// Una página de presentación son SECCIONES de unas pocas formas (portada,
// línea del tiempo, tarjetas, captura, infografía, cifras, llamada). Todo el
// texto vive en `datos.secciones` y se edita; la forma de cada una está aquí.
// En un `**texto**` del título, lo de dentro sale resaltado en amarillo.

export type ItemSeccion = { titulo?: string; texto?: string; valor?: string; fecha?: string; icono?: string; url?: string; dibujo?: string };
export type Seccion = {
  id?: string;
  tipo: 'portada' | 'linea' | 'tarjetas' | 'captura' | 'infografia' | 'cifras' | 'llamada' | 'texto';
  antetitulo?: string; titulo?: string; texto?: string;
  imagen?: string; direccion?: string; pie?: string; lado?: 'izquierda' | 'derecha';
  items?: ItemSeccion[];
  botones?: Array<{ texto?: string; url?: string }>;
};

export const ICONOS: Record<string, typeof Globe2> = {
  mundo: Globe2, ojo: EyeOff, piezas: Puzzle, brote: Sprout, red: Network, arbol: GitBranch, datos: Database, mapa: MapPin,
  enlace: Link2, ia: Cpu, persona: User, entidad: Building2, publico: Landmark, corazon: Heart, megafono: Megaphone,
  idea: Lightbulb, escudo: ShieldCheck, manos: HandHeart, cohete: Rocket, gente: Users, chispa: Sparkles,
};

/** `**así**` → resaltado. */
function Resaltado({ texto, clase }: { texto: string; clase: string }) {
  const trozos = texto.split(/\*\*(.+?)\*\*/g);
  return <>{trozos.map((t, i) => (i % 2 ? <span key={i} className={clase}>{t}</span> : t))}</>;
}

/** Un texto con párrafos separados por una línea en blanco.
 *  OJO con los grises claros: en la página publicada `.sitio-lectura` oscurece
 *  `text-slate-300/400` (contraste sobre blanco). Sobre azul se usa un gris
 *  escrito a mano, `text-[#cfd6e2]`, que esa regla no toca. */
function Parrafos({ texto, className }: { texto?: string; className?: string }) {
  if (!texto) return null;
  return <div className={className}>{texto.split(/\n\s*\n/).map((p, i) => <p key={i} style={{ color: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }} className={i > 0 ? 'mt-3' : undefined}>{p}</p>)}</div>;
}

/** Aparece al llegar con el scroll. Sin IntersectionObserver o con «menos movimiento», ya está ahí. */
function Aparece({ children, className, retraso = 0 }: { children: ReactNode; className?: string; retraso?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window)
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (visto || !ref.current) return;
    const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setVisto(true); o.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [visto]);
  return (
    <div ref={ref} style={{ transitionDelay: `${retraso}ms` }}
      className={cn('transition-all duration-700 ease-out', visto ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)}>
      {children}
    </div>
  );
}

/** Una captura dentro de una ventana de navegador, con su dirección arriba. */
function Navegador({ imagen, direccion, alt, className }: { imagen: string; direccion?: string; alt: string; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_60px_-20px_rgba(30,27,75,0.35)]', className)}>
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        {direccion && <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200">{direccion}</span>}
      </div>
      <img src={miniatura(imagen, 800)} alt={alt} loading="lazy" decoding="async" className="block h-auto w-full" />
    </div>
  );
}

function Botones({ botones, oscuro }: { botones?: Seccion['botones']; oscuro?: boolean }) {
  const lista = (botones || []).filter(b => b?.texto);
  if (!lista.length) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {lista.map((b, i) => {
        const fuera = /^https?:/.test(b.url || '');
        return (
          <a key={i} href={b.url || '#'} {...(fuera ? { target: '_blank', rel: 'noreferrer' } : {})}
            className={cn('inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-black transition-transform hover:-translate-y-0.5',
              i === 0 ? 'bg-[#facc15] text-[#1e1b4b] shadow-lg shadow-yellow-500/20' : oscuro ? 'bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/15' : 'bg-white text-[#1e1b4b] ring-2 ring-[#1e1b4b]')}>
            {b.texto} {i === 0 && <ArrowRight className="h-4 w-4" />}
          </a>
        );
      })}
    </div>
  );
}

function Cabeza({ s, centro, oscuro }: { s: Seccion; centro?: boolean; oscuro?: boolean }) {
  return (
    <div className={cn('max-w-3xl', centro && 'mx-auto text-center')}>
      {s.antetitulo && <p className={cn('mb-3 text-xs font-black uppercase tracking-[0.2em]', oscuro ? 'text-[#facc15]' : 'text-amber-600')}>{s.antetitulo}</p>}
      {s.titulo && <h2 className={cn('text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl', oscuro ? 'text-white' : 'text-slate-900')}><Resaltado texto={s.titulo} clase={oscuro ? 'text-[#facc15]' : 'text-amber-600'} /></h2>}
      <Parrafos texto={s.texto} className={cn('mt-4 text-base leading-relaxed sm:text-lg', oscuro ? 'text-[#cfd6e2]' : 'text-slate-600')} />
    </div>
  );
}

function SeccionPortada({ s }: { s: Seccion }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#1e1b4b] px-6 py-12 text-white sm:px-12 sm:py-16">
      {/* La luz: un halo amarillo detrás del título. */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#facc15]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-[24rem] w-[24rem] rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <Aparece className="min-w-0">
          {s.antetitulo && <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#facc15] ring-1 ring-white/15">{s.antetitulo}</p>}
          {s.titulo && <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"><Resaltado texto={s.titulo} clase="text-[#facc15]" /></h1>}
          <Parrafos texto={s.texto} className="mt-5 max-w-xl text-lg leading-relaxed text-[#cfd6e2]" />
          <Botones botones={s.botones} oscuro />
        </Aparece>
        {s.imagen && (
          <Aparece retraso={150} className="min-w-0">
            <Navegador imagen={s.imagen} direccion={s.direccion} alt={s.pie || s.titulo || 'Captura de la plataforma'} className="lg:rotate-[1.5deg]" />
          </Aparece>
        )}
      </div>
    </section>
  );
}

function SeccionLinea({ s }: { s: Seccion }) {
  const items = s.items || [];
  return (
    <section className="px-1">
      <Aparece><Cabeza s={s} /></Aparece>
      <ol className={cn('relative mt-10 grid gap-8 sm:grid-cols-2', ['', '', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-5'][Math.min(items.length, 5)])}>
        {/* La línea: horizontal en grande, vertical en el móvil. */}
        <span aria-hidden className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-gradient-to-b from-[#facc15] to-emerald-400 sm:hidden" />
        <span aria-hidden className="absolute left-0 right-0 top-[11px] hidden h-0.5 bg-gradient-to-r from-[#facc15] via-amber-300 to-emerald-400 sm:block" />
        {items.map((it, i) => (
          <li key={i} className="relative pl-10 sm:pl-0 sm:pt-10">
            <span aria-hidden className="absolute left-0 top-0 grid h-6 w-6 place-items-center rounded-full bg-[#1e1b4b] ring-4 ring-[#fef9c3]"><span className="h-2 w-2 rounded-full bg-[#facc15]" /></span>
            <Aparece retraso={i * 90}>
              {it.fecha && <p className="text-sm font-black uppercase tracking-wider text-amber-600">{it.fecha}</p>}
              {it.titulo && <h3 className="mt-1 text-lg font-black text-slate-900">{it.titulo}</h3>}
              <Parrafos texto={it.texto} className="mt-1 text-[15px] leading-relaxed text-slate-600" />
            </Aparece>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SeccionTarjetas({ s }: { s: Seccion }) {
  const items = s.items || [];
  return (
    <section className="px-1">
      <Aparece><Cabeza s={s} /></Aparece>
      <div className={cn('mt-10 grid gap-4 sm:grid-cols-2', items.length % 3 === 0 ? 'lg:grid-cols-3' : items.length >= 4 ? 'lg:grid-cols-4' : '')}>
        {items.map((it, i) => {
          const Icono = ICONOS[it.icono || ''] || Sparkles;
          return (
            <Aparece key={i} retraso={i * 70} className="h-full">
              <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fef9c3] text-[#1e1b4b]"><Icono className="h-5 w-5" /></span>
                {it.titulo && <h3 className="mt-4 text-lg font-black leading-snug text-slate-900">{it.titulo}</h3>}
                <Parrafos texto={it.texto} className="mt-1.5 text-[15px] leading-relaxed text-slate-600" />
              </div>
            </Aparece>
          );
        })}
      </div>
    </section>
  );
}

function SeccionCaptura({ s }: { s: Seccion }) {
  const derecha = s.lado !== 'izquierda';
  return (
    <section className="grid grid-cols-1 items-center gap-8 px-1 lg:grid-cols-2 lg:gap-14">
      <Aparece className={cn('min-w-0', !derecha && 'lg:order-2')}>
        <Cabeza s={s} />
        {(s.items || []).length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {(s.items || []).map((it, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-600">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#facc15] ring-2 ring-[#1e1b4b]" />
                <span>{it.titulo && <b className="font-black text-slate-900">{it.titulo}. </b>}{it.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </Aparece>
      {s.imagen && (
        <Aparece retraso={120} className={cn('min-w-0', !derecha && 'lg:order-1')}>
          <Navegador imagen={s.imagen} direccion={s.direccion} alt={s.pie || s.titulo || 'Captura de la plataforma'} />
          {s.pie && <p className="mt-3 text-center text-xs font-semibold text-slate-400">{s.pie}</p>}
        </Aparece>
      )}
    </section>
  );
}

function SeccionCifras({ s }: { s: Seccion }) {
  const items = s.items || [];
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#1e1b4b] px-6 py-12 sm:px-12 sm:py-14">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#facc15]/20 blur-3xl" />
      <div className="relative">
        <Aparece><Cabeza s={s} oscuro /></Aparece>
        <dl className={cn('mt-10 grid gap-6 sm:grid-cols-2', items.length >= 5 ? 'lg:grid-cols-5' : items.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {items.map((it, i) => (
            <Aparece key={i} retraso={i * 80}>
              <dt className="whitespace-nowrap text-[clamp(2rem,3.1vw,3rem)] font-black leading-none tracking-tight text-[#facc15]">{it.valor}</dt>
              <dd className="mt-2">
                {it.titulo && <span className="block text-base font-black text-white">{it.titulo}</span>}
                {it.texto && <span className="mt-0.5 block text-sm leading-relaxed text-[#cfd6e2]">{it.texto}</span>}
              </dd>
            </Aparece>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SeccionLlamada({ s }: { s: Seccion }) {
  const items = s.items || [];
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#facc15] px-6 py-12 text-[#1e1b4b] sm:px-12 sm:py-14">
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/40 blur-3xl" />
      <div className="relative">
        <Aparece>
          {s.antetitulo && <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#1e1b4b]/70">{s.antetitulo}</p>}
          {s.titulo && <h2 className="max-w-3xl text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">{s.titulo.replace(/\*\*/g, '')}</h2>}
          <Parrafos texto={s.texto} className="mt-4 max-w-2xl text-base leading-relaxed text-[#1e1b4b]/80 sm:text-lg" />
        </Aparece>
        {items.length > 0 && (
          <div className={cn('mt-8 grid gap-4 sm:grid-cols-2', items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {items.map((it, i) => {
              const Icono = ICONOS[it.icono || ''] || Sparkles;
              return (
                <Aparece key={i} retraso={i * 70} className="h-full">
                  <div className="h-full rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur">
                    <Icono className="h-6 w-6" />
                    {it.titulo && <h3 className="mt-3 text-base font-black">{it.titulo}</h3>}
                    <Parrafos texto={it.texto} className="mt-1 text-sm leading-relaxed text-[#1e1b4b]/75" />
                  </div>
                </Aparece>
              );
            })}
          </div>
        )}
        <Botones botones={s.botones} />
      </div>
    </section>
  );
}

function SeccionTexto({ s }: { s: Seccion }) {
  return <section className="px-1"><Aparece><Cabeza s={s} centro /></Aparece></section>;
}

function SeccionInfografia({ s }: { s: Seccion }) {
  return (
    <section className="rounded-[2rem] bg-gradient-to-b from-[#fef9c3]/70 to-white px-4 py-12 sm:px-8 sm:py-14">
      {s.antetitulo && <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.2em] text-amber-600">{s.antetitulo}</p>}
      <Infografia titulo={s.titulo} texto={s.texto} pasos={(s.items || []) as PasoInfografia[]} />
    </section>
  );
}

const PINTORES: Record<Seccion['tipo'], (p: { s: Seccion }) => ReactNode> = {
  portada: SeccionPortada, linea: SeccionLinea, tarjetas: SeccionTarjetas, captura: SeccionCaptura,
  infografia: SeccionInfografia, cifras: SeccionCifras, llamada: SeccionLlamada, texto: SeccionTexto,
};

export function VistaPresentacion({ secciones }: { secciones: Seccion[] }) {
  return (
    <div className="my-4 space-y-20 sm:space-y-28">
      {secciones.map((s, i) => {
        const Pintor = PINTORES[s.tipo] || SeccionTexto;
        return <div key={s.id || i} id={s.id || undefined} className="scroll-mt-24"><Pintor s={s} /></div>;
      })}
    </div>
  );
}
