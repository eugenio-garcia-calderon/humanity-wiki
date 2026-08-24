import { useEffect, useRef, useState , lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink, PlayCircle, BookOpen, Link2, Map as MapIcon, Quote,
  Users as UsersIcon, Network, FileText, CalendarClock, Lightbulb,
  CheckSquare, Square, Plus, Trash2, Rocket,
} from 'lucide-react';

// ============================================================================
// Ventana de Conocimiento — renderizado por tipo (Fase 11)
// ============================================================================
// `variant='node'`: miniatura dentro del lienzo del grafo.
// `variant='full'`: contenido completo en el panel lateral derecho.
// La configuración de cada tipo está documentada en knowledge.ts (backend).

const cn2 = (...cls: Array<string | false | undefined>) => cls.filter(Boolean).join(' ');

// ============================================================================
// UN MARCO QUE SOLO VIVE MIENTRAS SE VE (2026-08-21, B63)
// ============================================================================
// El mapa de una publicación es un `<iframe>` a una ruta de la propia
// plataforma, o sea LA APLICACIÓN ENTERA otra vez. En la miniatura de una
// tarjeta encima ni siquiera se puede tocar: es `pointer-events-none` y está
// escalada. Se estaba pagando una aplicación React completa para enseñar algo
// que a efectos del usuario es una fotografía.
//
// Y no es una tarjeta: en Publicaciones hay 92. Las ventanas las abre el
// usuario de una en una; estas se abren solas según bajas. En un iPhone 12,
// Safari mata la pestaña sin avisar al pasarse de memoria.
//
// Aquí el marco se MONTA al acercarse a la pantalla y se DESMONTA al alejarse,
// así que lo que hay vivo es lo que se está mirando y no todo lo que has
// pasado. El margen de 300 px es para que, bajando a velocidad normal, el mapa
// ya esté cargado cuando llega a la vista.
//
// Por qué desmontar y no `loading="lazy"` a secas: `lazy` evita la carga
// inicial, pero una vez cargado el marco se queda vivo para siempre. Al llegar
// abajo del todo tendrías las 92 igualmente.
function MarcoQueSoloViveMientrasSeVe({ src, title, className, style }: {
  src: string; title: string; className?: string; style?: React.CSSProperties;
}) {
  const hueco = useRef<HTMLDivElement>(null);
  const [cerca, setCerca] = useState(false);

  useEffect(() => {
    const el = hueco.current;
    if (!el) return;
    // Sin IntersectionObserver (navegador muy viejo), se monta y ya: mejor una
    // página pesada que una página sin mapas.
    if (typeof IntersectionObserver === 'undefined') { setCerca(true); return; }

    // RED DE SEGURIDAD: SI EL OBSERVADOR NO CONTESTA, SE MONTA IGUAL.
    // Un observador recién creado SIEMPRE entrega una primera respuesta, diga
    // que se ve o que no. Si en un segundo y medio no ha dicho nada, algo pasa
    // en ese navegador, y sin esta salida el fallo sería un cuadro gris donde
    // debería haber un mapa, para siempre. Un mapa que no aparece es peor que
    // un mapa que pesa.
    //
    // AQUÍ ANTES DECÍA QUE ME HABÍA ENCONTRADO UN NAVEGADOR DONDE EL OBSERVADOR
    // NO FUNCIONA. Era falso y lo escribí yo. Lo que me encontré fueron cero
    // eventos sobre un elemento que yo creía a la vista, y la causa era que la
    // PESTAÑA ESTABA OCULTA: una pestaña oculta no intersecta nada y detiene
    // `requestAnimationFrame`. El observador estaba bien; la medición no.
    // La red se queda igualmente —es barata y protege de lo que no sé—, pero
    // no como prueba de que ningún navegador cumpla, porque no la tengo.
    // No hace daño en un navegador sano: allí la primera respuesta llega en el
    // mismo fotograma y el temporizador se cancela sin haber hecho nada.
    let contesto = false;
    const obs = new IntersectionObserver(
      entradas => { contesto = true; setCerca(entradas.some(e => e.isIntersecting)); },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    const red = window.setTimeout(() => { if (!contesto) setCerca(true); }, 1500);

    return () => { obs.disconnect(); clearTimeout(red); };
  }, []);

  return (
    <div ref={hueco} className="absolute inset-0">
      {cerca
        ? <iframe src={src} title={title} loading="lazy" className={className} style={style} />
        : (
          // El hueco mientras no toca: del mismo tamaño, para que la tarjeta no
          // cambie de alto ni dé saltos al bajar.
          <div className="w-full h-full bg-slate-100 grid place-items-center" aria-hidden>
            <MapIcon className="w-5 h-5 text-slate-300" />
          </div>
        )}
    </div>
  );
}

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

// ══ LAS GRÁFICAS SE DESCARGAN AL VER UNA (2026-08-22) ════════════════════════
// La librería de gráficas pesa lo suyo y hasta hoy entraba en el fichero que se
// descarga al ENTRAR, porque este componente pinta cualquier tipo de ventana y
// se usa en la portada, en el lienzo y en el editor. O sea: todo el mundo se
// bajaba el motor de gráficas aunque no hubiera una sola gráfica en pantalla.
//
// Ahora vive en su propio trozo y se pide la primera vez que aparece una. Lo
// que se ve mientras llega es un hueco de la ALTURA EXACTA que va a ocupar: sin
// eso, al llegar la gráfica el texto de debajo daría un salto.
const Graficas = lazy(() => import('./Graficas'));

function ChartBlock({ chart, height }: { chart: any; height: number }) {
  const data = Array.isArray(chart?.data) ? chart.data : [];
  if (!data.length) return null;
  return (
    <Suspense fallback={<div style={{ height }} className="rounded-lg bg-slate-50 animate-pulse" />}>
      <Graficas chart={chart} height={height} />
    </Suspense>
  );
}

export default function WindowContent({ kind, config, variant, onConfigChange }: {
  kind: string;
  config: any;
  variant: 'node' | 'full';
  /** Si llega, la ventana es EDITABLE (dueño): tareas que se marcan, tablas
   *  que se rellenan, pasos de proyecto que se tachan. Guarda en el servidor. */
  onConfigChange?: (config: any) => void;
}) {
  const isNode = variant === 'node';
  const wiki = useWikipedia(kind === 'wikipedia' ? (config.wiki_lang || 'es') : undefined, config.wiki_page);

  switch (kind) {
    case 'imagen': {
      // El recorte es no destructivo: un rectángulo en % sobre el original.
      const c = config.crop;
      const recortada = c && (c.x || c.y || c.w !== 100 || c.h !== 100);
      return (
        <div className="space-y-1.5">
          {config.image_url ? (
            recortada ? (
              <div className={cn2('relative overflow-hidden', isNode ? 'w-full h-64 rounded-lg' : 'w-full rounded-xl aspect-[4/3]')}>
                <img
                  src={config.image_url}
                  alt={config.alt || config.caption || ''}
                  className="absolute max-w-none"
                  style={{
                    width: `${(100 / c.w) * 100}%`,
                    height: `${(100 / c.h) * 100}%`,
                    left: `${-(c.x / c.w) * 100}%`,
                    top: `${-(c.y / c.h) * 100}%`,
                  }}
                />
              </div>
            ) : (
              <img
                src={config.image_url}
                alt={config.alt || config.caption || ''}
                className={isNode ? 'w-full h-64 object-cover rounded-lg' : 'w-full rounded-xl'}
              />
            )
          ) : (
            <div className="w-full h-24 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
              <FileText className="w-6 h-6" />
            </div>
          )}
          {!isNode && config.caption && <p className="text-xs text-slate-500 leading-relaxed">{config.caption}</p>}
          <SourceCredit name={config.source_name} url={config.source_url} />
        </div>
      );
    }

    case 'video': {
      // Tres orígenes posibles (2026-08-19): un vídeo SUBIDO (`video_url`),
      // Vimeo, o YouTube de siempre. Se comprueban en ese orden porque el
      // subido es el único que no depende de que un tercero siga sirviéndolo.
      const subido = config.video_url;
      const vimeo = config.vimeo_id;
      const id = config.youtube_id;

      if (subido) {
        // El mismo `<video>` en miniatura y en grande: en el lienzo va mudo y
        // sin controles (cien ventanas con barra de reproducción es ruido), y
        // `preload="metadata"` trae solo la cabecera — el primer fotograma sin
        // descargar los 40 MB.
        return (
          <div className="space-y-1.5">
            <video
              src={subido}
              controls={!isNode}
              muted={isNode}
              playsInline
              preload="metadata"
              onClick={isNode ? undefined : e => e.stopPropagation()}
              className={isNode ? 'w-full h-56 object-cover rounded-lg bg-black' : 'w-full rounded-xl bg-black max-h-[70vh]'}
            />
            {!isNode && config.caption && <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{config.caption}</p>}
          </div>
        );
      }

      if (vimeo) {
        if (isNode) {
          return (
            <div className="relative h-56 rounded-lg bg-slate-900 flex items-center justify-center">
              <PlayCircle className="w-10 h-10 text-white/80" />
              <span className="absolute bottom-2 right-2 text-[10px] text-white/60">Vimeo</span>
            </div>
          );
        }
        return (
          <div className="space-y-1.5">
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://player.vimeo.com/video/${vimeo}`}
                title="Vídeo"
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            {!isNode && config.caption && (
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{config.caption}</p>
            )}
            <SourceCredit name="Vimeo" url={`https://vimeo.com/${vimeo}`} />
          </div>
        );
      }

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
            // YOUTUBE SIN COOKIES (2026-08-22). `youtube-nocookie.com` es el mismo
            // reproductor sin la cookie de seguimiento: existe exactamente para
            // incrustarse en la web de otro sin dejarle a Google un rastro de quién ha
            // mirado qué. La decisión ya estaba tomada —el Navegador y el Juego lo usaban
            // desde antes— y aquí no se había aplicado: cuatro sitios, dos criterios.
            // Importa además para la ficha de las tiendas, donde hay que DECLARAR con qué
            // terceros se comparte y para qué.
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="Vídeo"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {/* LA DESCRIPCIÓN, TAMBIÉN AQUÍ (2026-08-24). Eugenio: «permite que
              al publicar un vídeo se permita añadir una descripción, no sólo
              el título».
              Un vídeo subido ya la enseñaba y uno de YouTube no, así que la
              misma publicación perdía su texto según de dónde viniera el
              vídeo. Se lee del mismo sitio, `caption`, para que no haya dos
              campos que signifiquen lo mismo. */}
          {!isNode && config.caption && (
            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{config.caption}</p>
          )}
          <SourceCredit name={config.channel ? `${config.channel} (YouTube)` : 'YouTube'} url={`https://youtu.be/${id}`} />
        </div>
      );
    }

    // El PDF se LEE dentro de la página (2026-08-19). El visor del navegador
    // corre en su propio sandbox, sin acceso al DOM ni a nuestras cookies, y
    // `uploads.ts` sirve los PDF en línea justamente para esto.
    case 'pdf':
      return (
        <div className="space-y-1.5">
          {isNode ? (
            <div className="h-56 rounded-lg border border-slate-200 bg-rose-50/60 flex flex-col items-center justify-center gap-2 text-rose-700">
              <FileText className="w-9 h-9" />
              <span className="text-[11px] font-bold uppercase tracking-widest">PDF</span>
              {config.description && <span className="text-[10px] text-rose-600/70">{config.description}</span>}
            </div>
          ) : (
            <>
              <iframe
                src={config.url}
                title="Documento PDF"
                className="w-full h-[70vh] rounded-xl border border-slate-200 bg-slate-50"
              />
              <a href={config.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                 className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Abrir en una pestaña
                {config.description && <span className="font-normal text-slate-400">· {config.description}</span>}
              </a>
            </>
          )}
        </div>
      );

    // Audio subido o enlazado: un `<audio>` no ejecuta nada, así que se
    // reproduce en línea igual que la música del mapa 3D.
    case 'audio':
      return (
        <div className="space-y-1.5">
          <div className={cn2(
            'rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center',
            isNode ? 'h-56 flex-col gap-3 p-3' : 'p-4',
          )}>
            <PlayCircle className={isNode ? 'w-9 h-9 text-slate-400' : 'hidden'} />
            <audio
              src={config.url}
              controls
              preload="none"
              onClick={e => e.stopPropagation()}
              className="w-full"
            />
          </div>
          {!isNode && config.description && <p className="text-xs text-slate-500">{config.description}</p>}
        </div>
      );

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
            <MarcoQueSoloViveMientrasSeVe
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
            <Link to={`/esquemas/${config.graph_slug}`}
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

    case 'tarea': {
      const done = !!config.done;
      const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onConfigChange?.({ ...config, done: !done });
      };
      const Box = done ? CheckSquare : Square;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Box
              onClick={onConfigChange ? toggle : undefined}
              className={cn2('w-5 h-5 shrink-0', done ? 'text-emerald-600' : 'text-slate-300', onConfigChange && 'cursor-pointer hover:scale-110 transition-transform')}
            />
            <span className={cn2('text-xs font-bold', done ? 'text-slate-400 line-through' : 'text-slate-700')}>
              {done ? 'Hecha' : 'Pendiente'}
            </span>
            {config.due && (
              <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {config.due}
              </span>
            )}
          </div>
          {config.notes && (
            <p className={isNode ? 'text-[11px] text-slate-500 line-clamp-2' : 'text-sm text-slate-600 leading-relaxed'}>{config.notes}</p>
          )}
        </div>
      );
    }

    case 'tabla': {
      const cols: any[] = Array.isArray(config.cols) ? config.cols : [];
      const rows: any[] = Array.isArray(config.rows) ? config.rows : [];
      if (isNode || !onConfigChange) {
        const shown = rows.slice(0, isNode ? 3 : rows.length);
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead><tr>{cols.map(c => (
                <th key={c.id} className="text-left font-black text-slate-500 border-b border-slate-200 px-1.5 py-1">{c.name}</th>
              ))}</tr></thead>
              <tbody>{shown.map((r, i) => (
                <tr key={i}>{cols.map(c => (
                  <td key={c.id} className="border-b border-slate-50 px-1.5 py-1 text-slate-700 truncate max-w-[110px]">{r[c.id] ?? ''}</td>
                ))}</tr>
              ))}</tbody>
            </table>
            {rows.length === 0 && <p className="text-[10px] text-slate-400 italic py-1">Tabla vacía{onConfigChange || !isNode ? '' : ' — abre la ventana para rellenarla'}.</p>}
            {isNode && rows.length > 3 && <p className="text-[10px] text-slate-400 py-1">+{rows.length - 3} filas más</p>}
          </div>
        );
      }
      // Editable (dueño, vista completa): rejilla tipo Notion.
      const save = (next: any) => onConfigChange({ ...config, ...next });
      const setCell = (ri: number, colId: string, value: string) => {
        const nr = rows.map((r, i) => (i === ri ? { ...r, [colId]: value } : r));
        save({ rows: nr });
      };
      return (
        <div className="space-y-2 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr>
              {cols.map((c, ci) => (
                <th key={c.id} className="border-b-2 border-slate-200 px-1 py-1">
                  <input
                    value={c.name}
                    onChange={e => save({ cols: cols.map((x, i) => (i === ci ? { ...x, name: e.target.value } : x)) })}
                    className="w-full font-black text-slate-600 bg-transparent focus:outline-none focus:bg-amber-50 rounded px-1"
                  />
                </th>
              ))}
              <th className="w-7 border-b-2 border-slate-200">
                <button
                  onClick={() => save({ cols: [...cols, { id: 'c' + Date.now(), name: 'Columna', type: 'text' }] })}
                  title="Añadir columna" className="p-1 text-slate-300 hover:text-emerald-600"><Plus className="w-3.5 h-3.5" /></button>
              </th>
            </tr></thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="group">
                  {cols.map(c => (
                    <td key={c.id} className="border-b border-slate-100 px-1 py-0.5">
                      <input
                        value={r[c.id] ?? ''}
                        onChange={e => setCell(ri, c.id, e.target.value)}
                        className="w-full text-slate-700 bg-transparent focus:outline-none focus:bg-emerald-50/60 rounded px-1 py-0.5"
                      />
                    </td>
                  ))}
                  <td className="border-b border-slate-100 text-center">
                    <button onClick={() => save({ rows: rows.filter((_, i) => i !== ri) })}
                      title="Borrar fila" className="p-1 text-slate-200 group-hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => save({ rows: [...rows, {}] })}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors">
            <Plus className="w-3 h-3" /> Añadir fila
          </button>
        </div>
      );
    }

    case 'proyecto': {
      const steps: any[] = Array.isArray(config.steps) ? config.steps : [];
      const doneCount = steps.filter(st => st.done).length;
      const ESTADOS: Record<string, [string, string]> = {
        idea: ['Idea', 'bg-slate-100 text-slate-600'],
        en_marcha: ['En marcha', 'bg-sky-50 text-sky-700'],
        terminado: ['Terminado', 'bg-emerald-50 text-emerald-700'],
      };
      const [estadoLabel, estadoCls] = ESTADOS[config.status] || ESTADOS.en_marcha;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            {onConfigChange && !isNode ? (
              <select
                value={config.status || 'en_marcha'}
                onChange={e => onConfigChange({ ...config, status: e.target.value })}
                onClick={e => e.stopPropagation()}
                className={cn2('text-[10px] font-black uppercase tracking-wide rounded-full px-2 py-0.5 border-0 focus:outline-none', estadoCls)}
              >
                {Object.entries(ESTADOS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </select>
            ) : (
              <span className={cn2('text-[10px] font-black uppercase tracking-wide rounded-full px-2 py-0.5', estadoCls)}>{estadoLabel}</span>
            )}
            {steps.length > 0 && <span className="ml-auto text-[10px] font-bold text-slate-400">{doneCount}/{steps.length} pasos</span>}
          </div>
          {config.goal && (
            <p className={isNode ? 'text-[11px] text-slate-600 line-clamp-2' : 'text-sm text-slate-600 leading-relaxed'}>{config.goal}</p>
          )}
          {steps.length > 0 && (
            <div className="space-y-1">
              {(isNode ? steps.slice(0, 3) : steps).map((st, i) => {
                const Box = st.done ? CheckSquare : Square;
                return (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <Box
                      onClick={onConfigChange && !isNode ? (e => { e.stopPropagation(); onConfigChange({ ...config, steps: steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) }); }) : undefined}
                      className={cn2('w-3.5 h-3.5 mt-0.5 shrink-0', st.done ? 'text-emerald-600' : 'text-slate-300', onConfigChange && !isNode && 'cursor-pointer')}
                    />
                    <span className={st.done ? 'text-slate-400 line-through' : 'text-slate-600'}>{st.text}</span>
                  </div>
                );
              })}
            </div>
          )}
          {onConfigChange && !isNode && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const inp = (e.target as any).elements.paso;
                if (inp.value.trim()) { onConfigChange({ ...config, steps: [...steps, { text: inp.value.trim(), done: false }] }); inp.value = ''; }
              }}
              className="flex gap-1.5"
            >
              <input name="paso" placeholder="Nuevo paso…" className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
              <button type="submit" className="px-2 py-1 bg-emerald-600 text-white rounded-lg"><Plus className="w-3 h-3" /></button>
            </form>
          )}
        </div>
      );
    }

    // Documento estilo Notion (2026-08-08): el contenido vive en
    // config.bloques; la miniatura enseña sus primeras líneas de texto.
    case 'pagina': {
      const bloques: any[] = Array.isArray(config.bloques) ? config.bloques : [];
      const resumen = bloques
        .filter(b => typeof b.texto === 'string' && b.texto.trim())
        .slice(0, 6)
        .map(b => b.texto.replace(/[*_`#>]/g, ''))
        .join(' — ');
      return (
        <p className={isNode ? 'text-[11px] text-slate-600 leading-snug line-clamp-4' : 'text-sm text-slate-700 leading-relaxed'}>
          {resumen || 'Documento vacío.'}
        </p>
      );
    }

    // Presentación (2026-08-08): miniatura del primer frame + recuento.
    case 'presentacion': {
      const diapos: any[] = Array.isArray(config.diapositivas) ? config.diapositivas : [];
      const primera = diapos[0];
      return (
        <div className="space-y-1.5">
          <div className="relative w-full rounded-lg overflow-hidden border border-slate-100"
            style={{ paddingBottom: '56.25%', backgroundColor: primera?.fondo || '#ffffff' }}>
            <div className="absolute inset-0 p-3 flex flex-col items-center justify-center text-center">
              {(primera?.elementos || []).filter((e: any) => e.tipo === 'texto').slice(0, 2).map((e: any) => (
                <p key={e.id} className={cn2('leading-snug', e.negrita ? 'text-sm font-black text-slate-800' : 'text-[10px] text-slate-500')}>
                  {e.texto}
                </p>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400">{diapos.length} {diapos.length === 1 ? 'frame' : 'frames'}</p>
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
