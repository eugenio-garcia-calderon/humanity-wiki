import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink, PlayCircle, BookOpen, Link2, Map as MapIcon, Quote,
  Users as UsersIcon, Network, FileText, CalendarClock, Lightbulb,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

// ============================================================================
// Ventana de Conocimiento — renderizado por tipo (Fase 11)
// ============================================================================
// `variant='node'`: miniatura dentro del lienzo del grafo.
// `variant='full'`: contenido completo en el panel lateral derecho.
// La configuración de cada tipo está documentada en knowledge.ts (backend).

const cn2 = (...cls: Array<string | false | undefined>) => cls.filter(Boolean).join(' ');

const CHART_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#dc2626', '#64748b', '#0d9488'];

// Caché simple de resúmenes de Wikipedia (la API REST permite CORS anónimo).
const wikiCache = new Map<string, any>();

function useWikipedia(lang?: string, page?: string) {
  const [data, setData] = useState<any>(page ? wikiCache.get(`${lang}:${page}`) : null);
  useEffect(() => {
    if (!lang || !page || wikiCache.has(`${lang}:${page}`)) return;
    fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`)
      .then(r => r.json())
      .then(json => { wikiCache.set(`${lang}:${page}`, json); setData(json); })
      .catch(() => {});
  }, [lang, page]);
  return data;
}

function SourceCredit({ name, url }: { name?: string; url?: string }) {
  if (!name && !url) return null;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
       className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-600 transition-colors truncate">
      <ExternalLink className="w-2.5 h-2.5 shrink-0" /> Fuente: {name || url}
    </a>
  ) : (
    <span className="text-[10px] text-slate-400 truncate">Fuente: {name}</span>
  );
}

function ChartBlock({ chart, height }: { chart: any; height: number }) {
  const data = Array.isArray(chart?.data) ? chart.data : [];
  if (!data.length) return null;
  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any, n: any) => [`${v}${chart.unit || '%'}`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function WindowContent({ kind, config, variant }: {
  kind: string;
  config: any;
  variant: 'node' | 'full';
}) {
  const isNode = variant === 'node';
  const wiki = useWikipedia(kind === 'wikipedia' ? (config.wiki_lang || 'es') : undefined, config.wiki_page);

  switch (kind) {
    case 'imagen':
      return (
        <div className="space-y-1.5">
          {config.image_url ? (
            <img
              src={config.image_url}
              alt={config.caption || ''}
              className={isNode ? 'w-full h-64 object-cover rounded-lg' : 'w-full rounded-xl'}
            />
          ) : (
            <div className="w-full h-24 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
              <FileText className="w-6 h-6" />
            </div>
          )}
          {!isNode && config.caption && <p className="text-xs text-slate-500 leading-relaxed">{config.caption}</p>}
          <SourceCredit name={config.source_name} url={config.source_url} />
        </div>
      );

    case 'video': {
      const id = config.youtube_id;
      if (isNode) {
        return (
          <div className="relative">
            <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" className="w-full h-56 object-cover rounded-lg" />
            <PlayCircle className="absolute inset-0 m-auto w-10 h-10 text-white drop-shadow-lg" />
            {config.channel && <p className="text-[10px] text-slate-400 mt-1 truncate">{config.channel} · YouTube</p>}
          </div>
        );
      }
      return (
        <div className="space-y-1.5">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              title="Vídeo"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <SourceCredit name={config.channel ? `${config.channel} (YouTube)` : 'YouTube'} url={`https://youtu.be/${id}`} />
        </div>
      );
    }

    case 'wikipedia':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <BookOpen className="w-3 h-3" /> Wikipedia
          </div>
          {wiki?.thumbnail?.source && (
            <img src={wiki.thumbnail.source} alt="" className={isNode ? 'w-full h-40 object-cover rounded-lg' : 'w-full max-h-56 object-cover rounded-xl'} />
          )}
          <p className={isNode ? 'text-[11px] text-slate-600 leading-snug line-clamp-3' : 'text-sm text-slate-600 leading-relaxed'}>
            {wiki?.extract || 'Cargando resumen…'}
          </p>
          {!isNode && wiki?.content_urls?.desktop?.page && (
            <SourceCredit name="Wikipedia (CC BY-SA)" url={wiki.content_urls.desktop.page} />
          )}
        </div>
      );

    case 'enlace':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <a href={config.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
               className="text-xs font-bold text-sky-700 hover:underline truncate">
              {config.url?.replace(/^https?:\/\//, '').slice(0, 60)}
            </a>
          </div>
          {config.description && (
            <p className={isNode ? 'text-[11px] text-slate-500 line-clamp-2' : 'text-sm text-slate-600 leading-relaxed'}>{config.description}</p>
          )}
        </div>
      );

    case 'mapa':
      return (
        <div className="space-y-1.5">
          <div className={isNode ? 'relative h-64 rounded-lg overflow-hidden border border-slate-200' : 'relative h-[420px] rounded-xl overflow-hidden border border-slate-200'}>
            <iframe
              src={config.map_url}
              title="Mapa de indicadores"
              className={isNode ? 'w-full h-full pointer-events-none scale-[0.55] origin-top-left' : 'w-full h-full'}
              style={isNode ? { width: '182%', height: '182%' } : undefined}
            />
            {isNode && (
              <div className="absolute inset-0 flex items-end justify-center pb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-900/70 text-white px-2 py-0.5 rounded-full">
                  <MapIcon className="w-2.5 h-2.5 inline mr-1" />Abrir para interactuar
                </span>
              </div>
            )}
          </div>
          {!isNode && <p className="text-[10px] text-slate-400">Mapa de indicadores de la plataforma — 14 objetivos, zoom y clic activos.</p>}
        </div>
      );

    case 'grafica':
      return (
        <div className="space-y-1">
          <ChartBlock chart={config.chart} height={isNode ? 120 : 240} />
          {!isNode && config.source_note && <p className="text-[10px] text-slate-400 leading-relaxed">{config.source_note}</p>}
        </div>
      );

    case 'ficha': {
      const facts = (config.facts || []).slice(0, isNode ? 4 : undefined);
      return (
        <dl className="space-y-1">
          {facts.map((f: any, i: number) => (
            <div key={i} className="flex justify-between gap-3 text-xs border-b border-slate-50 pb-1">
              <dt className="text-slate-400 shrink-0">{f.label}</dt>
              <dd className="font-bold text-slate-700 text-right">{f.value}</dd>
            </div>
          ))}
        </dl>
      );
    }

    case 'cronologia': {
      const events = (config.events || []).slice(0, isNode ? 4 : undefined);
      return (
        <div className="space-y-1.5">
          {events.map((e: any, i: number) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0 w-11 font-black text-emerald-700 text-right">{e.year}</span>
              <span className={isNode ? 'text-slate-600 line-clamp-2' : 'text-slate-600 leading-relaxed'}>{e.text}</span>
            </div>
          ))}
          {isNode && (config.events || []).length > 4 && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1"><CalendarClock className="w-3 h-3" />+{(config.events || []).length - 4} hitos más</p>
          )}
        </div>
      );
    }

    case 'autores': {
      const authors = (config.authors || []).slice(0, isNode ? 3 : undefined);
      return (
        <div className="space-y-1.5">
          {authors.map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <UsersIcon className="w-3 h-3" />
              </span>
              <div className="min-w-0">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="font-bold text-slate-700 hover:text-emerald-700 truncate block">{a.name}</a>
                ) : (
                  <span className="font-bold text-slate-700 truncate block">{a.name}</span>
                )}
                {a.affiliation && <span className="text-[10px] text-slate-400 truncate block">{a.affiliation}</span>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'documento':
      return (
        <div className="space-y-1.5">
          <Quote className="w-4 h-4 text-slate-300" />
          <blockquote className={isNode
            ? 'text-[11px] italic text-slate-700 leading-snug line-clamp-4 border-l-2 border-slate-300 pl-2'
            : 'text-sm italic text-slate-700 leading-relaxed border-l-2 border-slate-300 pl-3'}>
            “{config.quote}”
          </blockquote>
          {!isNode && config.quote_translation && (
            <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-emerald-200 pl-3">«{config.quote_translation}»</p>
          )}
          {!isNode && config.context && <p className="text-xs text-slate-600 leading-relaxed pt-1">{config.context}</p>}
          <SourceCredit name={config.source_name} url={config.source_url} />
        </div>
      );

    case 'publicacion':
      return (
        <div className="space-y-1">
          <p className={isNode ? 'text-[11px] text-slate-600 leading-snug line-clamp-4' : 'text-sm text-slate-700 leading-relaxed whitespace-pre-wrap'}>
            {isNode ? (config.excerpt || config.body) : (config.body || config.excerpt)}
          </p>
          {config.author_name && <p className="text-[10px] text-slate-400">Publicación de {config.author_name}</p>}
        </div>
      );

    case 'grafo': {
      // Referencia a otro grafo con PORTADA: aparece como tarjeta de
      // presentación y el enlace lo abre (petición del usuario, 2026-08-05).
      const cover = (
        <div className={cn2(
          'relative rounded-xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white flex flex-col justify-end',
          isNode ? 'h-52 p-3' : 'h-44 p-4'
        )}>
          <Network className={isNode ? 'absolute top-2.5 right-2.5 w-5 h-5 text-white/40' : 'absolute top-3 right-3 w-7 h-7 text-white/40'} />
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-emerald-200 mb-0.5">Grafo de Conocimiento</p>
          <p className={isNode ? 'text-sm font-black leading-tight line-clamp-2' : 'text-lg font-black leading-tight'}>{config.title || 'Grafo relacionado'}</p>
          {config.creator_name && <p className="text-[9px] text-white/70 mt-0.5">de {config.creator_name}</p>}
        </div>
      );
      if (isNode) return cover;
      return (
        <div className="space-y-2.5">
          {cover}
          {config.description && <p className="text-sm text-slate-600 leading-relaxed">{config.description}</p>}
          {config.graph_slug && (
            <Link to={`/grafos/${config.graph_slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
              <Network className="w-4 h-4" /> Abrir grafo
            </Link>
          )}
        </div>
      );
    }

    case 'producto': {
      // Producto del Mercado como ventana (petición del usuario, 2026-08-05):
      // portada con imagen, nombre y precio; enlaza al Mercado.
      const price = typeof config.price_cents === 'number'
        ? (config.price_cents / 100).toLocaleString('es-ES', { style: 'currency', currency: config.currency || 'EUR' })
        : null;
      const cover = (
        <div className={cn2('relative rounded-xl overflow-hidden bg-slate-100 flex flex-col justify-end', isNode ? 'h-52' : 'h-44')}>
          {config.image_url ? (
            <img src={config.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700" />
          )}
          <div className="relative bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-amber-200 mb-0.5">Producto</p>
            <p className={cn2('font-black text-white leading-tight', isNode ? 'text-sm line-clamp-2' : 'text-lg')}>{config.name || 'Producto'}</p>
            {price && <p className="text-xs font-bold text-white/90 mt-0.5">{price}</p>}
          </div>
        </div>
      );
      if (isNode) return cover;
      return (
        <div className="space-y-2.5">
          {cover}
          {config.description && <p className="text-sm text-slate-600 leading-relaxed">{config.description}</p>}
          <Link to="/mercado"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors">
            Ver en el Mercado
          </Link>
        </div>
      );
    }

    case 'soluciones': {
      // Tarjetas de soluciones (la tecnología de tarjetas de la plataforma,
      // embebida en el grafo). Cada item: {title, type, impact, cost,
      // readiness, description, source_name, source_url, solution_id}.
      const items: any[] = Array.isArray(config.items) ? config.items : [];
      const shown = isNode ? items.slice(0, 2) : items;
      const chip = (label: string, value: string, cls: string) => value ? (
        <span className={cn2('text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full', cls)}>{label}: {value}</span>
      ) : null;
      return (
        <div className="space-y-1.5">
          {shown.map((s, i) => (
            <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5">
              <p className={cn2('font-black text-slate-900 leading-tight flex items-start gap-1.5', isNode ? 'text-[11px]' : 'text-sm')}>
                <Lightbulb className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" /> {s.title}
              </p>
              {!isNode && s.description && (
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{s.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {chip('Impacto', s.impact, 'bg-emerald-100 text-emerald-700')}
                {chip('Coste', s.cost, 'bg-amber-100 text-amber-700')}
                {chip('Madurez', s.readiness, 'bg-sky-100 text-sky-700')}
              </div>
              {!isNode && (s.source_name || s.source_url) && (
                <div className="mt-1.5"><SourceCredit name={s.source_name} url={s.source_url} /></div>
              )}
            </div>
          ))}
          {isNode && items.length > 2 && (
            <p className="text-[10px] text-slate-400 text-center">+{items.length - 2} soluciones más — abre la ventana</p>
          )}
        </div>
      );
    }

    case 'texto':
    default:
      return (
        <p className={isNode ? 'text-[11px] text-slate-600 leading-snug line-clamp-4' : 'text-sm text-slate-700 leading-relaxed whitespace-pre-wrap'}>
          {config.body || ''}
        </p>
      );
  }
}
