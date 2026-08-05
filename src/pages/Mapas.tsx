import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map as MapIcon, Plus } from 'lucide-react';
import MetaGraphCanvas, { MetaItem } from '../components/knowledge/MetaGraphCanvas';

// ============================================================================
// Mapas — la página es un grafo de mapas (2026-08-05, petición del usuario):
// el Mapa de Indicadores de la Humanidad como nodo destacado, los mapas de
// usuario conectados, y un nodo «+» para crear el tuyo (pidiéndoselo a la IA).
// ============================================================================

interface UserMap {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  views: number;
  creator_name: string | null;
}

export default function Mapas() {
  const [maps, setMaps] = useState<UserMap[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/maps', { credentials: 'include' })
      .then(r => r.json())
      .then(json => setMaps(Array.isArray(json) ? json : []))
      .catch(() => setMaps([]))
      .finally(() => setLoading(false));
  }, []);

  const items: MetaItem[] = useMemo(() => [
    {
      id: '__mapa_humanidad__',
      title: 'Mapa de Indicadores de la Humanidad',
      subtitle: 'El mapa principal de la plataforma: objetivos, indicadores y territorios de toda la humanidad.',
      to: '/mapa',
      kind: 'mapa' as const,
      creator: 'Eugenio García-Calderón Huerta',
    },
    ...maps.map(m => ({
      id: m.id,
      title: m.title,
      subtitle: m.description,
      to: `/mapas/${m.slug}`,
      kind: 'mapa' as const,
      creator: m.creator_name,
      views: m.views,
    })),
  ], [maps]);

  // Crear un mapa = pedírselo a la IA en la barra de abajo, con el texto ya
  // preparado (el asistente ejecuta CREATE_MAP en modo autónomo).
  const onCreate = () => {
    window.dispatchEvent(new CustomEvent('ai:prefill', { detail: 'Crea un mapa de ' }));
  };

  return (
    <div className="relative w-full h-full">
      {loading ? (
        <p className="text-sm text-slate-400 py-16 text-center">Cargando…</p>
      ) : (
        <MetaGraphCanvas
          centerLabel="Mapas"
          centerSublabel="de la Humanidad"
          centerHint="haz clic en un mapa para abrirlo — o crea el tuyo"
          accent="#0284c7"
          items={items}
          createLabel="Crear tu mapa"
          onCreate={onCreate}
        />
      )}

      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg pl-3 pr-1.5 py-1.5 flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
          <MapIcon className="w-4 h-4 text-sky-600" /> Mapas
        </span>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-black shadow hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Crear tu mapa
        </button>
        <button
          onClick={() => navigate('/mapa')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-full text-xs font-black shadow transition-colors"
        >
          <MapIcon className="w-3.5 h-3.5" /> Ir al mapa principal
        </button>
      </div>
    </div>
  );
}
