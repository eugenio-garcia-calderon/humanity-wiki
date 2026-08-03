import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { useHelpers } from '../contexts/DataContext';
import { Search, Package, Megaphone, MapPin, Filter, X, Plus } from 'lucide-react';
import { cn } from '../utils/cn';

// ============================================================================
// Mercado — Fase 5
// ============================================================================
// Implementa 07_MARKETPLACE.md. No es un ecommerce independiente: toda oferta
// y demanda está enlazada al grafo de conocimiento, y desde cada tarjeta se
// puede saltar al reto, la solución o el territorio con el que se relaciona.

const money = (cents: number | null, currency = 'EUR') =>
  cents == null ? 'A consultar' : new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(cents / 100);

const DEMAND_STATUS: Record<string, { label: string; className: string }> = {
  abierta:        { label: 'Abierta',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  en_negociacion: { label: 'En negociación', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cubierta:       { label: 'Cubierta',       className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelada:      { label: 'Cancelada',      className: 'bg-red-50 text-red-600 border-red-200' },
};

const URGENCY: Record<string, string> = {
  critica: 'text-red-600', alta: 'text-orange-600', media: 'text-amber-600', baja: 'text-slate-400',
};

interface Filters {
  q: string;
  territory_id: string;
  objective_id: string;
  kind: string;
  status: string;
}

const EMPTY: Filters = { q: '', territory_id: '', objective_id: '', kind: '', status: '' };

export default function Mercado() {
  const [tab, setTab] = useState<'ofertas' | 'demandas'>('ofertas');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [products, setProducts] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { can } = useAuth();
  const { territories, objectives } = useHelpers();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.territory_id) params.set('territory_id', filters.territory_id);
    if (filters.objective_id) params.set('objective_id', filters.objective_id);
    if (tab === 'ofertas' && filters.kind) params.set('kind', filters.kind);
    if (tab === 'demandas' && filters.status) params.set('status', filters.status);

    const url = tab === 'ofertas' ? `/api/products?${params}` : `/api/demands?${params}`;
    fetch(url)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (tab === 'ofertas') setProducts(Array.isArray(json) ? json : []);
        else setDemands(Array.isArray(json) ? json : []);
      })
      .catch(() => { if (!cancelled) { setProducts([]); setDemands([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, filters]);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'q').length;
  const items = tab === 'ofertas' ? products : demands;

  return (
    <div className="animate-in fade-in duration-500 pb-16 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2">Mercado</h2>
          <p className="text-base text-slate-500 max-w-2xl leading-relaxed">
            Lo que se ofrece y lo que se necesita para resolver los retos. Cada producto y cada
            demanda está conectada con el reto, la solución y el territorio a los que sirve.
          </p>
        </div>
        {can(ROLE.VERIFIED) && (
          <Link
            to={tab === 'ofertas' ? '/mercado/nuevo-producto' : '/mercado/nueva-demanda'}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            {tab === 'ofertas' ? 'Publicar producto' : 'Publicar demanda'}
          </Link>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([['ofertas', 'Ofertas', Package], ['demandas', 'Demandas', Megaphone]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className="text-[10px] font-black bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
              {key === 'ofertas' ? products.length : demands.length}
            </span>
          </button>
        ))}
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            placeholder={tab === 'ofertas' ? 'Buscar productos…' : 'Buscar demandas…'}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors',
            activeFilterCount > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-black bg-emerald-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Territorio</label>
            <select
              value={filters.territory_id}
              onChange={e => setFilters(f => ({ ...f, territory_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <option value="">Todos</option>
              {territories.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Objetivo</label>
            <select
              value={filters.objective_id}
              onChange={e => setFilters(f => ({ ...f, objective_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <option value="">Todos</option>
              {objectives.map((o: any) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              {tab === 'ofertas' ? 'Tipo' : 'Estado'}
            </label>
            {tab === 'ofertas' ? (
              <select
                value={filters.kind}
                onChange={e => setFilters(f => ({ ...f, kind: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">Todos</option>
                <option value="fisico">Físico</option>
                <option value="digital">Digital</option>
              </select>
            ) : (
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">Todos</option>
                {Object.entries(DEMAND_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(f => ({ ...EMPTY, q: f.q }))}
              className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Resultados */}
      {loading && <p className="text-sm text-slate-400 py-12 text-center">Cargando…</p>}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
          <p className="text-sm text-slate-400 italic">
            No hay {tab === 'ofertas' ? 'productos' : 'demandas'} que coincidan con la búsqueda.
          </p>
        </div>
      )}

      {!loading && tab === 'ofertas' && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {p.category || 'producto'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {p.kind === 'digital' ? 'Digital' : 'Físico'}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight mb-1.5">{p.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 flex-1">{p.description}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                <div>
                  <p className="text-lg font-black text-slate-900 leading-none">{money(p.price_cents, p.currency)}</p>
                  {p.modality === 'suscripcion' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">al mes</p>
                  )}
                </div>
                {p.organization_name && (
                  <p className="text-[10px] text-slate-400 text-right leading-tight max-w-[45%]">{p.organization_name}</p>
                )}
              </div>
              {p.stock != null && (
                <p className="text-[10px] text-slate-400 mt-1.5">{p.stock} disponibles</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'demandas' && demands.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demands.map(d => {
            const st = DEMAND_STATUS[d.status] || DEMAND_STATUS.abierta;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-black text-slate-900 leading-tight flex-1">{d.title}</h3>
                  <span className={cn('shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border', st.className)}>
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{d.description}</p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <span className="font-black text-slate-900">
                    {d.budget_cents ? money(d.budget_cents, d.currency) : 'Sin presupuesto definido'}
                  </span>
                  {d.urgency && (
                    <span className={cn('font-bold uppercase tracking-widest text-[10px]', URGENCY[d.urgency] || 'text-slate-400')}>
                      Urgencia {d.urgency}
                    </span>
                  )}
                </div>
                {d.organization_name && (
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {d.organization_name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
