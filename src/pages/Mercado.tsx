import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { useHelpers } from '../contexts/DataContext';
import { Search, Package, Megaphone, MapPin, Filter, X, Plus, ShoppingCart, FolderKanban } from 'lucide-react';
import { cn } from '../utils/cn';
import BotonFavorito from '../components/knowledge/BotonFavorito';
import { Heart } from 'lucide-react';
import EmbeddedCheckoutModal from '../components/stripe/EmbeddedCheckoutModal';
import FichaProducto, { type ProductoFicha } from '../components/juego/FichaProducto';

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
  // Favoritos (2026-08-23): los ids de quien mira, para pintar el corazón y
  // para el chip «Solo favoritos».
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutProduct, setCheckoutProduct] = useState<any>(null);
  // LA PÁGINA DEL PRODUCTO (2026-08-20, petición de Eugenio: «que cuando le des
  // a un producto se abra la página de ese producto, la misma que hicimos en el
  // Mundo 3D»). Es literalmente el mismo componente: una landing es la misma
  // cosa se llegue por el mercado o paseando por la aldea.
  const [ficha, setFicha] = useState<ProductoFicha | null>(null);
  /** Tus proyectos, para poder meter el producto en uno. Se piden una vez. */
  const [misProyectos, setMisProyectos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [proyectoDeFicha, setProyectoDeFicha] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { user, can } = useAuth();
  useEffect(() => {
    if (!user) { setFavoritos(new Set()); setSoloFavoritos(false); return; }
    fetch('/api/publicar/favoritos', { credentials: 'include' }).then(r => r.json())
      .then(j => { if (Array.isArray(j?.ids)) setFavoritos(new Set(j.ids)); }).catch(() => {});
  }, [user]);
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

  useEffect(() => {
    if (!user) { setMisProyectos([]); return; }
    fetch('/api/menu', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMisProyectos(Array.isArray(d?.proyectos) ? d.proyectos : []))
      .catch(() => setMisProyectos([]));
  }, [user]);

  /** Al abrir una ficha, el selector arranca en el proyecto que ya tuviera. */
  useEffect(() => {
    if (!ficha) return;
    const p = products.find(x => x.id === ficha.id);
    setProyectoDeFicha(p?.proyecto_id || '');
  }, [ficha, products]);

  const moverProductoAProyecto = async (productoId: string, proyectoId: string) => {
    setProyectoDeFicha(proyectoId);
    const r = await fetch(`/api/products/${productoId}/proyecto`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: proyectoId || null }),
    }).catch(() => null);
    if (!r?.ok) return;
    setProducts(prev => prev.map(x => (x.id === productoId ? { ...x, proyecto_id: proyectoId || null } : x)));
    // El menú lateral enseña los productos por proyecto: que se entere.
    window.dispatchEvent(new Event('humanity:menu-cambiado'));
  };

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
        {user && tab === 'ofertas' && (
          <button type="button" onClick={() => setSoloFavoritos(v => !v)}
            className={cn('inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors',
              soloFavoritos ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
            title="Ver solo tus favoritos">
            <Heart className={cn('w-4 h-4', soloFavoritos && 'fill-current')} /> Favoritos{favoritos.size ? ` (${favoritos.size})` : ''}
          </button>
        )}
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
          {(soloFavoritos ? products.filter(p => favoritos.has(p.id)) : products).map(p => (
            // La tarjeta ENTERA abre la página del producto. El botón de
            // comprar vive dentro y para su propio clic: comprar sin haber
            // visto la ficha sigue estando a un solo toque.
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setFicha({
                id: p.id, name: p.name,
                price_cents: p.price_cents ?? null, currency: p.currency || 'EUR',
                images: Array.isArray(p.images) ? p.images : [],
                descripcion: p.description ?? null,
                bloques: Array.isArray(p.bloques) ? p.bloques : [],
                creador: p.created_by ?? null,
                icono: p.icono ?? null,
              })}
              onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); }}
              className="text-left cursor-pointer bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {p.category || 'producto'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {p.kind === 'digital' ? 'Digital' : 'Físico'}
                  </span>
                  <BotonFavorito productoId={p.id} conSesion={!!user} inicial={favoritos.has(p.id)} className="w-8 h-8"
                    onCambio={activo => setFavoritos(prev => { const n = new Set(prev); if (activo) n.add(p.id); else n.delete(p.id); return n; })} />
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
              {p.price_cents != null && (
                <button
                  onClick={e => { e.stopPropagation(); setCheckoutProduct(p); }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {p.modality === 'suscripcion' ? 'Suscribirse' : 'Comprar'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* La ficha se dibuja con `absolute inset-0` (nació dentro del Mundo 3D),
          así que aquí se le da un marco fijo a pantalla completa. */}
      {ficha && (
        <div className="fixed inset-0 z-[60]">
          {/* EN QUÉ PROYECTO ESTÁ (2026-08-20). Va flotando sobre la ficha y no
              dentro, para no tocar un componente que también usa el Mundo 3D.
              Solo lo ve su dueño: es una decisión de organización, no algo que
              deba enseñarse a quien viene a comprar. */}
          {!!user && (ficha.creador === user.id || (user.roleLevel ?? 0) >= ROLE.ADMIN) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-lg">
              <FolderKanban className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proyecto</span>
              <select
                value={proyectoDeFicha}
                onChange={e => moverProductoAProyecto(ficha.id, e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none max-w-[12rem]"
              >
                <option value="">Sin proyecto</option>
                {misProyectos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </div>
          )}
          <FichaProducto
            producto={ficha}
            puedeEditar={!!user && (ficha.creador === user.id || (user.roleLevel ?? 0) >= ROLE.ADMIN)}
            onCerrar={() => setFicha(null)}
            onGuardar={async (bloques) => {
              const r = await fetch(`/api/products/${ficha.id}/pizarra`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bloques }),
              }).catch(() => null);
              if (!r?.ok) return false;
              setFicha(f => (f ? { ...f, bloques } : f));
              setProducts(prev => prev.map(x => (x.id === ficha.id ? { ...x, bloques } : x)));
              return true;
            }}
          />
        </div>
      )}

      {checkoutProduct && (
        <EmbeddedCheckoutModal
          title={`Comprar: ${checkoutProduct.name}`}
          onClose={() => setCheckoutProduct(null)}
          createSession={async () => {
            const res = await fetch('/api/stripe/checkout/product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ product_id: checkoutProduct.id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo iniciar la compra.');
            return json;
          }}
        />
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
