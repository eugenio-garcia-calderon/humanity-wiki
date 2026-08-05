import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, MapPin, Target, BarChart3, Flag, Activity, AlertTriangle,
  GitBranch, Lightbulb, HelpCircle, Package, Megaphone, Rocket, Award,
  Building2, User, MessageSquare, Briefcase, Loader2, Network, AppWindow,
} from 'lucide-react';
import { useHelpers } from '../../contexts/DataContext';
import { resolveEntityLink } from '../../utils/entityLinks';
import { cn } from '../../utils/cn';

// ============================================================================
// Barra de búsqueda global — Fase 10
// ============================================================================
// Usa /api/search (ya existía, busca en las 17 tablas del grafo de una vez)
// y agrupa los resultados por categoría con icono, tal como pidió el
// usuario: "que te ordene los resultados por categorías: productos, retos,
// indicadores, personas de forma visual".

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  territories:   { label: 'Territorios',    icon: MapPin },
  objectives:    { label: 'Objetivos',      icon: Target },
  indicators:    { label: 'Indicadores',    icon: BarChart3 },
  markers:       { label: 'Marcadores',     icon: Flag },
  metrics:       { label: 'Métricas',       icon: Activity },
  challenges:    { label: 'Retos',          icon: AlertTriangle },
  causes:        { label: 'Causas',         icon: GitBranch },
  solutions:     { label: 'Soluciones',     icon: Lightbulb },
  needs:         { label: 'Necesidades',    icon: HelpCircle },
  products:      { label: 'Productos',      icon: Package },
  demands:       { label: 'Demandas',       icon: Megaphone },
  initiatives:   { label: 'Iniciativas',    icon: Rocket },
  success_cases: { label: 'Casos de éxito', icon: Award },
  organizations: { label: 'Organizaciones', icon: Building2 },
  users:         { label: 'Personas',       icon: User },
  publications:  { label: 'Publicaciones',  icon: MessageSquare },
  projects:      { label: 'Proyectos',      icon: Briefcase },
  knowledge_graphs:  { label: 'Grafos de Conocimiento', icon: Network },
  knowledge_windows: { label: 'Ventanas de Conocimiento', icon: AppWindow },
};

// Orden fijo, con los tipos que el usuario mencionó explícitamente primero.
const CATEGORY_ORDER = [
  'knowledge_graphs', 'products', 'challenges', 'indicators', 'users',
  'territories', 'objectives', 'solutions', 'organizations', 'initiatives',
  'demands', 'needs', 'markers', 'metrics', 'causes', 'success_cases',
  'publications', 'projects',
];

interface SearchResult {
  id: string;
  label: string;
  type: string;
  [key: string]: any;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const helpers = useHelpers();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`)
        .then(r => r.json())
        .then(json => setResults(Array.isArray(json.results) ? json.results : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) (grouped[r.type] ||= []).push(r);
  const orderedTypes = CATEGORY_ORDER.filter(t => grouped[t]?.length);

  const goTo = (r: SearchResult) => {
    // Los grafos llevan su slug en el resultado (extra de NODE_TYPES).
    if (r.type === 'knowledge_graphs' && r.slug) {
      navigate(`/grafos/${r.slug}`);
      setOpen(false);
      setQuery('');
      return;
    }
    const resolved = resolveEntityLink(r.type, r.id, helpers);
    if (resolved.to) {
      navigate(resolved.to);
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-full border bg-white transition-colors',
          open ? 'border-emerald-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
        )}
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Buscar en toda la plataforma…"
          className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />}
        {!loading && query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-slate-300 hover:text-slate-500 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {!loading && results.length === 0 && (
            <p className="text-xs text-slate-400 italic px-4 py-6 text-center">Sin resultados para "{query}".</p>
          )}
          {orderedTypes.map(type => {
            const meta = CATEGORY_META[type] || { label: type, icon: Search };
            const Icon = meta.icon;
            return (
              <div key={type} className="py-2 border-b border-slate-50 last:border-0">
                <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </p>
                {grouped[type].map(r => {
                  const resolved = r.type === 'knowledge_graphs' && r.slug
                    ? { label: r.label, to: `/grafos/${r.slug}` }
                    : resolveEntityLink(r.type, r.id, helpers);
                  return (
                    <button
                      key={r.id}
                      onClick={() => goTo(r)}
                      disabled={!resolved.to}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                        resolved.to ? 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer' : 'text-slate-400 cursor-default'
                      )}
                    >
                      <span className="truncate">{r.label || resolved.label}</span>
                      {!resolved.to && <span className="text-[9px] uppercase tracking-wide shrink-0">sin ficha</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
