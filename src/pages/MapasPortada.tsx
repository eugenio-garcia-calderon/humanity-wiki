import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon, Plus, MapPin, Layers, Sparkles, FileText, Star, Globe2, Eye, User as UserIcon, FolderOpen } from 'lucide-react';

// ============================================================================
// LA HERRAMIENTA «MAPAS» (2026-10-18, Eugenio)
// ============================================================================
// «Cuando pinchas en Mapas debería aparecerte qué mapas puedes crear y
// ejemplos de mapas de otros usuarios, no un mapa concreto.» El Mapa de
// Indicadores de la Humanidad es un proyecto, no la herramienta: vive en su
// página (Humanidad Wiki) como bloque «Mapa de indicadores del mundo», y en
// `/mapa`. Aquí: qué se puede hacer, crear el tuyo, y los de la comunidad.

interface MapaPublico {
  id: string; title: string; slug: string; description: string | null;
  views: number; creator_name: string | null; config: { principal?: boolean } | null;
}

const QUE_PUEDES = [
  { icono: MapPin, titulo: 'Mapas de puntos', texto: 'Marca lugares —proyectos, huertos, puntos de recarga— y abre su ficha con un clic.' },
  { icono: Layers, titulo: 'Indicadores por territorio', texto: 'Colorea países, regiones y municipios según un indicador: agua, energía, empleo…' },
  { icono: Sparkles, titulo: 'Créalo con la IA', texto: 'Describe el mapa que quieres y la IA lo monta por ti. Luego lo retocas.' },
  { icono: FileText, titulo: 'Insértalo en tus páginas', texto: 'Cualquier mapa se pone como un bloque dentro de una página, igual que una imagen.' },
  { icono: Globe2, titulo: 'Publícalo con tu nombre', texto: 'Compártelo con un enlace o déjalo público para que otros lo encuentren.' },
  { icono: Star, titulo: 'Valoraciones y comentarios', texto: 'Quien lo ve puede valorarlo y comentar, y tú mejorarlo con lo que te digan.' },
];

export default function MapasPortada() {
  const [mapas, setMapas] = useState<MapaPublico[] | null>(null);

  useEffect(() => {
    fetch('/api/maps', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setMapas((Array.isArray(j) ? j : []).filter((m: MapaPublico) => !m.config?.principal)))
      .catch(() => setMapas([]));
  }, []);

  // Crear un mapa = pedírselo a la IA con el texto ya preparado (el asistente
  // ejecuta CREATE_MAP), como hacía la página de antes.
  const crear = () => window.dispatchEvent(new CustomEvent('ai:prefill', { detail: 'Crea un mapa de ' }));

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <header className="pt-4 pb-10 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-700"><MapIcon className="h-7 w-7" /></span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Mapas</h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">Pon lo que sabes sobre el mapa: lugares, territorios e indicadores. Crea el tuyo o inspírate con los de otros.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={crear} className="inline-flex h-11 items-center gap-2 rounded-full bg-sky-600 px-5 text-sm font-black text-white shadow hover:bg-sky-700">
            <Plus className="h-4 w-4" /> Crear tu mapa
          </button>
          <Link to="/mis-mapas" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <FolderOpen className="h-4 w-4" /> Mis mapas
          </Link>
        </div>
      </header>

      <section aria-labelledby="que-puedes" className="mb-14">
        <h2 id="que-puedes" className="mb-4 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">Qué puedes hacer</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUE_PUEDES.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-sky-700 ring-1 ring-slate-200"><Icono className="h-5 w-5" /></span>
              <p className="text-sm font-black text-slate-900">{titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="comunidad">
        <h2 id="comunidad" className="mb-4 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mapas de la comunidad</h2>
        {mapas === null ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
        ) : !mapas.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm font-bold text-slate-500">Todavía nadie ha publicado un mapa.</p>
            <button onClick={crear} className="mt-3 text-sm font-black text-sky-700 hover:underline">Sé el primero</button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mapas.map(m => (
              <Link key={m.id} to={`/mapas/${m.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
                <span className="mb-3 grid h-24 place-items-center rounded-xl bg-gradient-to-br from-sky-50 to-emerald-50 text-sky-600">
                  <MapIcon className="h-8 w-8 opacity-70 transition-transform group-hover:scale-110" />
                </span>
                <p className="text-sm font-black text-slate-900 line-clamp-2">{m.title}</p>
                {m.description && <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{m.description}</p>}
                <p className="mt-auto flex items-center gap-3 pt-3 text-[11px] font-bold text-slate-400">
                  {m.creator_name && <span className="inline-flex min-w-0 items-center gap-1 truncate"><UserIcon className="h-3 w-3 shrink-0" />{m.creator_name}</span>}
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{m.views || 0}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
