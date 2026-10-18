import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Truck } from 'lucide-react';
import { textoComision } from '../../../utils/ofertas';

// ============================================================================
// PEDIDOS A TIENDAS — la cola del pedido gestionado (Wikiproducts W5)
// ============================================================================
// Lo que hay que comprar a cada distribuidor por cuenta de un cliente que ya
// pagó. Una tarjeta por pedido y tienda, con todo lo que hace falta para
// hacerlo sin abrir otra pantalla: qué lleva, el enlace de la oferta en la web
// de la tienda, a dónde mandarlo y a quién avisar. Quien gestiona apunta el
// número de pedido de la tienda y el seguimiento; el pedido del cliente
// avanza solo y el cliente se entera (ver `src/server/pedidoGestionado.ts`).

type Linea = { producto: string; unidades: number; precio_unitario_centimos: number; comision_pct: number | null; comision_centimos: number | null; enlace: string | null; plazo: string | null };
type Entrada = {
  id: string; codigo: string; pagado_el: string; estado: string; estado_pedido: string;
  distribuidor: string; importe_centimos: number; envio_centimos: number; comision_centimos: number;
  referencia_distribuidor: string | null; seguimiento: string | null; nota: string | null;
  cliente: { nombre: string | null; email: string | null; telefono: string | null; direccion: any; recogida: boolean };
  lineas: Linea[];
};

const ESTADOS: { id: string; label: string }[] = [
  { id: 'pendiente', label: 'Por pedir' },
  { id: 'pedido_hecho', label: 'Pedido hecho' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'entregado', label: 'Entregado' },
  { id: 'incidencia', label: 'Incidencia' },
  { id: 'cancelado', label: 'Cancelado' },
];
const dinero = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100);
const direccion = (d: any) => d ? [d.name, d.line1, d.line2, [d.postal_code, d.city].filter(Boolean).join(' '), d.country].filter(Boolean).join(', ') : null;

export default function ColaDistribuidores() {
  const [todos, setTodos] = useState(false);
  const [lista, setLista] = useState<Entrada[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, { referencia: string; seguimiento: string; nota: string }>>({});

  const cargar = () => {
    fetch(`/api/gestion/pedidos-distribuidor${todos ? '?estado=todos' : ''}`, { credentials: 'include' })
      .then(async r => { const j = await r.json().catch(() => null); if (!r.ok) throw new Error(j?.error || 'No se ha podido leer la cola.'); return j; })
      .then(j => { setLista(j); setError(null); })
      .catch(e => setError(e.message));
  };
  useEffect(cargar, [todos]);

  async function guardar(e: Entrada, estado?: string) {
    setGuardando(e.id);
    const b = borrador[e.id];
    const r = await fetch(`/api/gestion/pedidos-distribuidor/${encodeURIComponent(e.id)}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(estado ? { estado } : {}), ...(b ? { referencia: b.referencia, seguimiento: b.seguimiento, nota: b.nota } : {}) }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : { error: 'No hay conexión con el servidor.' };
    setGuardando(null);
    if (!r || !r.ok) { setError(j.error || 'No se ha podido guardar.'); return; }
    setBorrador(x => { const { [e.id]: _, ...resto } = x; return resto; });
    cargar();
  }

  const campo = (e: Entrada, k: 'referencia' | 'seguimiento' | 'nota', placeholder: string) => {
    const actual = borrador[e.id] ?? { referencia: e.referencia_distribuidor || '', seguimiento: e.seguimiento || '', nota: e.nota || '' };
    return (
      <input value={actual[k]} placeholder={placeholder} aria-label={placeholder}
        onChange={ev => setBorrador(x => ({ ...x, [e.id]: { ...actual, [k]: ev.target.value } }))}
        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs" />
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Lo que hay que comprar a cada tienda para que llegue al cliente. El cliente ya ha pagado.</p>
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)} /> Ver también los terminados
        </label>
      </div>
      {error && <p className="mb-3 text-xs font-bold text-rose-600">{error}</p>}
      {lista === null && !error && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p>}
      {lista && lista.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No hay nada pendiente de pedir.</p>}
      <ul className="space-y-3">
        {(lista || []).map(e => (
          <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">{e.distribuidor} <span className="font-mono text-xs font-bold text-slate-400">· pedido {e.codigo}</span></p>
                <p className="text-xs text-slate-500">Pagado el {new Date(e.pagado_el).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <select value={e.estado} disabled={guardando === e.id || e.estado === 'entregado' || e.estado === 'cancelado'} onChange={ev => guardar(e, ev.target.value)} aria-label="Estado del pedido a la tienda"
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold">
                {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <ul className="mt-3 space-y-1.5">
              {e.lineas.map((l, i) => (
                <li key={i} className="rounded-xl bg-slate-50 p-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">{l.producto}{l.unidades > 1 ? ` × ${l.unidades}` : ''}</span>
                    <span className="tabular-nums text-slate-700">{dinero(l.precio_unitario_centimos * l.unidades)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{textoComision(l.comision_pct, l.comision_centimos)}{l.plazo ? ` · Plazo: ${l.plazo}` : ''}</p>
                  {l.enlace && (
                    <a href={l.enlace} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-700 underline">
                      Abrir la oferta en {e.distribuidor} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-3 grid gap-1 text-xs text-slate-600">
              <p><b>Cobrado:</b> {dinero(e.importe_centimos)}{e.envio_centimos ? ` + ${dinero(e.envio_centimos)} de envío` : ''} · <b>La tienda nos debe:</b> {dinero(e.comision_centimos)}</p>
              <p className="flex items-start gap-1"><Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {e.cliente.recogida ? 'Lo recoge en persona.' : direccion(e.cliente.direccion) || 'Sin dirección: escribe al cliente.'}</p>
              <p><b>Cliente:</b> {[e.cliente.nombre, e.cliente.email, e.cliente.telefono].filter(Boolean).join(' · ') || '—'}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {campo(e, 'referencia', 'Nº de pedido en la tienda')}
              {campo(e, 'seguimiento', 'Seguimiento del envío')}
            </div>
            <div className="mt-2 flex gap-2">
              {campo(e, 'nota', 'Nota interna (no la ve el cliente)')}
              <button type="button" onClick={() => guardar(e)} disabled={!borrador[e.id] || guardando === e.id}
                className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-40">
                {guardando === e.id ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
