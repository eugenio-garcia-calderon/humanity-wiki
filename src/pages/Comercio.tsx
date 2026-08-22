import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, Plus, Package, Loader2, ExternalLink, Archive, Repeat,
  Download, Wrench, Truck, FileText, ShoppingBag, AlertCircle,
} from 'lucide-react';
import CrearProducto from '../components/knowledge/CrearProducto';

// ============================================================================
// COMERCIO — lo que vendes, en un sitio (2026-08-22)
// ============================================================================
// Eugenio: «pon una herramienta nueva que sea Comercio, donde el usuario pueda
// añadir ahí sus productos y servicios, al estilo shopify».
//
// Hasta hoy vender estaba repartido: los productos vivían en el Mercado común
// —que exige nivel 2—, se creaban desde dentro de una página, y los pedidos no
// se veían en ninguna parte. Tres sitios para una sola cosa.
//
// ── LA INTERCONEXIÓN NO ES UN ADORNO ────────────────────────────────────────
// Eugenio, el mismo día: «esa interconectividad entre herramientas es
// fundamental». Así que esta pantalla no es una isla:
//
//   · Cada producto enlaza a SU FICHA pública, la que se comparte.
//   · Enlaza a la TIENDA, que es una página del creador de páginas.
//   · Y dice cuántos PEDIDOS lleva, que es la otra mitad de vender.
//
// Lo que NO hace es duplicar. Los productos son los mismos de `products` que
// usa el Mercado; las tiendas son páginas normales. Una herramienta nueva que
// se inventa sus propias tablas es una herramienta que hay que sincronizar
// para siempre.

type Producto = {
  id: string; name: string; price_cents: number | null; currency: string;
  kind: string; modality?: string | null; billing_period?: string | null;
  stock: number | null; status: string; images: any;
  envio_centimos: number | null; created_at: string;
  /** Solo tiene sentido en una descarga: si el archivo que se entrega está subido. */
  con_archivo?: boolean;
  /** Opiniones: media en estrellas (1-5) y cuántas; null/0 = nadie ha opinado. */
  media_estrellas?: number | null; n_resenas?: number;
};

export default function Comercio() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [limite, setLimite] = useState<number | null>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [creando, setCreando] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<'productos' | 'pedidos'>('productos');

  async function cargar() {
    try {
      const [rp, rv, rm] = await Promise.all([
        fetch('/api/publicar/mis-productos'),
        fetch('/api/publicar/mis-ventas'),
        fetch('/api/auth/me'),
      ]);
      if (rp.status === 401) { setError('sesion'); setProductos([]); return; }
      const jp = await rp.json();
      setProductos(jp.productos || []);
      setLimite(jp.limite ?? null);
      if (rv.ok) { const jv = await rv.json(); setPedidos(jv.pedidos || []); }
      if (rm.ok) { const jm = await rm.json(); setHandle(jm.user?.handle || null); }
    } catch { setError('red'); setProductos([]); }
  }
  useEffect(() => { cargar(); }, []);

  // ADJUNTAR (O CAMBIAR) EL ARCHIVO DE UNA DESCARGA (2026-08-22). Se sube a la
  // zona privada y se guarda su URL en el producto; a partir de ahí, cada
  // pedido pagado de ese producto puede descargarlo desde /pedido.
  async function adjuntarArchivo(id: string, f: File) {
    const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type || 'application/octet-stream')}&privado=1`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { window.alert(j.error || 'No se ha podido subir el archivo.'); return; }
    await fetch(`/api/publicar/mis-productos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivo_digital: j.url }),
    });
    cargar();
  }

  // MARCAR UN PEDIDO (2026-08-22): la ruta existía desde la fase 6 y la
  // pantalla no la usaba — «sin enviar» se quedaba así para siempre.
  async function marcarPedido(id: string, estado: string) {
    const seguimiento = estado === 'enviado' ? (window.prompt('Número de seguimiento (opcional):') || null) : null;
    await fetch(`/api/publicar/mis-ventas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, seguimiento }),
    });
    cargar();
  }

  async function retirar(id: string, nombre: string) {
    if (!window.confirm(`¿Retirar «${nombre}» de la venta?\n\nDeja de verse en tu tienda. Los pedidos que ya tenga se conservan.`)) return;
    await fetch(`/api/publicar/mis-productos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retirar: true }),
    });
    cargar();
  }

  const dinero = (c: number | null, m = 'EUR') =>
    c === null ? null : new Intl.NumberFormat('es-ES', { style: 'currency', currency: m || 'EUR' }).format(c / 100);

  if (productos === null) {
    return <Marco><p className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p></Marco>;
  }

  if (error === 'sesion') {
    return <Marco><p className="text-sm text-slate-500">Inicia sesión para ver lo que vendes.</p></Marco>;
  }

  const sinVender = pedidos.filter(p => p.estado === 'pagado').length;

  return (
    <Marco>
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-slate-400" /> Comercio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Lo que vendes y lo que te han comprado.
          </p>
        </div>
        <button onClick={() => setCreando(true)}
          className="h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </header>

      {/* La tienda es una PÁGINA. Se dice aquí y se enlaza, para que no haya
          que descubrir que las dos herramientas son la misma cosa. */}
      {handle && (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <a href={`https://${handle}.humanity.wiki`} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 font-bold text-slate-700">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Ver mi tienda
          </a>
          <Link to="/paginas"
             className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 font-bold text-slate-700">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Montar la página de la tienda
          </Link>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-slate-100">
        {([['productos', `Lo que vendo (${productos.length})`],
           ['pedidos', `Pedidos${sinVender ? ` · ${sinVender} sin enviar` : ''}`]] as const).map(([v, t]) => (
          <button key={v} onClick={() => setPestana(v)}
            className={`h-11 px-3 text-sm font-bold border-b-2 -mb-px ${pestana === v ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {pestana === 'productos' ? (
        productos.length === 0 ? (
          <Vacio onCrear={() => setCreando(true)} />
        ) : (
          <>
            <ul className="space-y-2">
              {productos.map(p => (
                <li key={p.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white">
                  {Array.isArray(p.images) && p.images[0]
                    ? <img src={p.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-slate-50 grid place-items-center shrink-0">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <Clase p={p} />
                      {dinero(p.price_cents, p.currency) ?? 'precio a consultar'}
                      {p.modality === 'suscripcion' && (
                        <span className="text-slate-400">
                          / {p.billing_period === 'anual' ? 'año' : p.billing_period === 'trimestral' ? 'trimestre' : 'mes'}
                        </span>
                      )}
                      {p.stock !== null && <span className={p.stock <= 0 ? 'text-rose-600 font-bold' : ''}>
                        · {p.stock <= 0 ? 'agotado' : `${p.stock} en stock`}
                      </span>}
                      {p.status === 'tienda' && <span className="text-slate-400">· solo en tu tienda</span>}
                      {Number(p.n_resenas) > 0 && (
                        <span className="text-amber-600 font-bold">· ★ {Number(p.media_estrellas).toLocaleString('es-ES')} ({p.n_resenas})</span>
                      )}
                      {p.kind === 'digital' && (
                        p.con_archivo
                          ? <span className="text-emerald-700">· archivo listo</span>
                          : <span className="text-amber-700 font-bold">· SIN ARCHIVO: se cobra y no se entrega</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.kind === 'digital' && (
                      <label aria-label={p.con_archivo ? 'Cambiar el archivo' : 'Subir el archivo'}
                             title={p.con_archivo ? 'Cambiar el archivo que se entrega' : 'Subir el archivo que se entrega'}
                             className={`w-11 h-11 grid place-items-center rounded-xl cursor-pointer hover:bg-slate-100 ${p.con_archivo ? '' : 'bg-amber-50'}`}>
                        <input type="file" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) adjuntarArchivo(p.id, f); e.target.value = ''; }} />
                        <Download className={`w-4 h-4 ${p.con_archivo ? 'text-slate-500' : 'text-amber-700'}`} />
                      </label>
                    )}
                    {handle && (
                      <a href={`https://${handle}.humanity.wiki/producto/${p.id}`} target="_blank" rel="noopener noreferrer"
                         aria-label="Ver la ficha" title="Ver la ficha pública"
                         className="w-11 h-11 grid place-items-center rounded-xl hover:bg-slate-100">
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    )}
                    <button onClick={() => retirar(p.id, p.name)} aria-label="Retirar" title="Retirar de la venta"
                      className="w-11 h-11 grid place-items-center rounded-xl hover:bg-slate-100">
                      <Archive className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {limite !== null && (
              <p className="mt-4 text-xs text-slate-400">
                {productos.length} de {limite}. Para tener más, verifica tu cuenta.
              </p>
            )}
          </>
        )
      ) : (
        pedidos.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            Todavía no te ha comprado nadie.
          </p>
        ) : (
          <ul className="space-y-2">
            {pedidos.map(p => (
              <li key={p.id} className="p-3 rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono tracking-wider text-slate-400">{p.codigo}</p>
                    <p className="text-sm font-black text-slate-800 truncate">{p.producto_nombre}</p>
                    <p className="text-xs text-slate-500">
                      {dinero(p.importe_centimos, p.moneda)}
                      {p.comprador_email && ` · ${p.comprador_email}`}
                    </p>
                    {p.direccion_envio && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[p.comprador_nombre, p.direccion_envio.line1, p.direccion_envio.postal_code, p.direccion_envio.city]
                          .filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className={`text-[11px] font-black px-2 py-1 rounded-full shrink-0 ${
                    p.estado === 'pagado' ? 'bg-amber-50 text-amber-700'
                    : p.estado === 'enviado' ? 'bg-sky-50 text-sky-700'
                    : p.estado === 'entregado' ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'}`}>
                    {p.estado}
                  </span>
                </div>
                {(p.estado === 'pagado' || p.estado === 'enviado') && (
                  <div className="mt-2 flex gap-2">
                    {p.estado === 'pagado' && (
                      <button onClick={() => marcarPedido(p.id, 'enviado')}
                        className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        Marcar enviado
                      </button>
                    )}
                    <button onClick={() => marcarPedido(p.id, 'entregado')}
                      className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold">
                      Marcar entregado
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {creando && (
        <CrearProducto
          onCancelar={() => setCreando(false)}
          onCreado={() => { setCreando(false); cargar(); }}
        />
      )}
    </Marco>
  );
}

function Clase({ p }: { p: Producto }) {
  const [Icono, texto] =
    p.modality === 'suscripcion' ? [Repeat, 'suscripción']
    : p.kind === 'digital' ? [Download, 'descarga']
    : p.kind === 'servicio' ? [Wrench, 'servicio']
    : [Truck, 'se envía'];
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <Icono className="w-3 h-3" /> {texto} ·
    </span>
  );
}

/** Lo que se ve sin nada creado. No es una lista vacía: es el primer paso. */
function Vacio({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="text-center py-12 px-4">
      <ShoppingBag className="w-10 h-10 mx-auto text-slate-200" />
      <h2 className="mt-3 text-base font-black text-slate-800">Todavía no vendes nada</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
        Puedes vender algo que envías, una descarga, un servicio o una suscripción.
        Basta el nombre y el precio; lo demás se rellena luego.
      </p>
      <button onClick={onCrear}
        className="mt-5 h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-bold">
        Poner lo primero a la venta
      </button>
      <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        Se verá en tu tienda, no en el mercado común.
      </p>
    </div>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">{children}</div>;
}
