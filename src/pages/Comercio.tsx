import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, Plus, Package, Loader2, ExternalLink, Archive, Repeat,
  Download, Wrench, Truck, FileText, ShoppingBag, AlertCircle,
} from 'lucide-react';
import CrearProducto from '../components/knowledge/CrearProducto';
import EditorVariantes, { type VarianteForm, variantesAFormulario, variantesAlServidor } from '../components/knowledge/EditorVariantes';
import Recibo from '../components/knowledge/Recibo';
import DatosFiscales from '../components/knowledge/DatosFiscales';

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
  /** El vendedor acepta cobrar este producto en puntos (total o en parte). */
  acepta_puntos?: boolean;
  variantes?: { id: string; nombre: string; sku: string | null; precio_centimos: number | null; stock: number | null }[];
};

export default function Comercio() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [limite, setLimite] = useState<number | null>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [creando, setCreando] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `?pestana=pedidos` abre directamente los pedidos: es adonde lleva el
  // aviso «te han comprado algo» de la campana.
  // Editor de variantes por producto (2026-08-23): abierto en uno a la vez.
  const [variantesDe, setVariantesDe] = useState<string | null>(null);
  // Recibo de una venta (F4): abierto en uno a la vez.
  const [reciboDe, setReciboDe] = useState<{ id: string; datos: any } | null>(null);
  async function verRecibo(id: string) {
    if (reciboDe?.id === id) { setReciboDe(null); return; }
    const r = await fetch(`/api/publicar/mis-ventas/${id}/recibo`).catch(() => null);
    if (r && r.ok) setReciboDe({ id, datos: await r.json() });
  }
  const [variantesForm, setVariantesForm] = useState<VarianteForm[]>([]);
  const [guardandoVariantes, setGuardandoVariantes] = useState(false);
  async function guardarVariantes(id: string) {
    setGuardandoVariantes(true);
    await fetch(`/api/publicar/mis-productos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantes: variantesAlServidor(variantesForm) }),
    }).catch(() => {});
    setGuardandoVariantes(false); setVariantesDe(null); cargar();
  }
  const [pestana, setPestana] = useState<'productos' | 'pedidos'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pestana') === 'pedidos' ? 'pedidos' : 'productos');

  async function cargar() {
    try {
      const [rp, rv, rm, rr] = await Promise.all([
        fetch('/api/publicar/mis-productos'),
        fetch('/api/publicar/mis-ventas'),
        fetch('/api/auth/me'),
        fetch('/api/publicar/mis-ventas/resumen'),
      ]);
      // El resumen de ventas es opcional: si falla, la lista sigue saliendo.
      rr.json().then(j => { if (j && !j.error) setResumen(j); }).catch(() => {});
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

  async function publicarProducto(id: string, aBorrador: boolean) {
    await fetch(`/api/publicar/mis-productos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aBorrador ? { borrador: true } : { publicar: true }),
    });
    cargar();
  }

  async function aceptarPuntos(id: string, valor: boolean) {
    await fetch(`/api/publicar/mis-productos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acepta_puntos: valor }),
    });
    cargar();
  }

  // MARCAR UN PEDIDO (2026-08-22): la ruta existía desde la fase 6 y la
  // pantalla no la usaba — «sin enviar» se quedaba así para siempre.
  async function marcarPedido(id: string, estado: string) {
    if (estado === 'devuelto' && !window.confirm('¿Devolver este pedido? Si se pagó con puntos, los puntos vuelven al comprador ahora mismo (tú devuelves lo que cobraste y la plataforma su comisión).')) return;
    const seguimiento = estado === 'enviado' ? (window.prompt('Número de seguimiento (opcional):') || null) : null;
    const r = await fetch(`/api/publicar/mis-ventas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, seguimiento }),
    });
    const j = await r.json().catch(() => ({}));
    // El motivo se enseña tal cual: «no tienes saldo para devolver los 9
    // puntos» es lo que hace falta saber para arreglarlo.
    if (!r.ok) window.alert(j.error || 'No se ha podido cambiar el pedido.');
    else if (Number(j.puntos_devueltos) > 0) window.alert(`Devueltos ${Number(j.puntos_devueltos).toLocaleString('es-ES')} puntos al comprador.`);
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
                      {p.status === 'borrador' && (
                        <span className="px-1.5 h-5 inline-flex items-center rounded bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wide">borrador</span>
                      )}
                      {/* Publicar un borrador, o esconder algo publicado mientras se arregla. */}
                      <button type="button" onClick={() => publicarProducto(p.id, p.status !== 'borrador')}
                        className="text-[11px] font-bold text-slate-500 underline">
                        {p.status === 'borrador' ? 'publicar' : 'pasar a borrador'}
                      </button>
                      {Number(p.n_resenas) > 0 && (
                        <span className="text-amber-600 font-bold">· ★ {Number(p.media_estrellas).toLocaleString('es-ES')} ({p.n_resenas})</span>
                      )}
                      {/* Cobrar en puntos: lo decide cada vendedor, producto a
                          producto. Es el «abanico limitado» del piloto. */}
                      {p.modality !== 'suscripcion' && (
                        <button type="button" onClick={() => aceptarPuntos(p.id, !p.acepta_puntos)}
                          className={`px-2 h-6 rounded-full text-[10px] font-black uppercase tracking-wide ${p.acepta_puntos ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}
                          title={p.acepta_puntos ? 'Acepta puntos: pulsa para dejar de aceptarlos' : 'No acepta puntos: pulsa para aceptarlos'}>
                          {p.acepta_puntos ? '● acepta puntos' : '○ sin puntos'}
                        </button>
                      )}
                      {p.kind === 'digital' && (
                        p.con_archivo
                          ? <span className="text-emerald-700">· archivo listo</span>
                          : <span className="text-amber-700 font-bold">· SIN ARCHIVO: se cobra y no se entrega</span>
                      )}
                      {p.modality !== 'suscripcion' && (
                        <button type="button" onClick={() => { if (variantesDe === p.id) { setVariantesDe(null); return; } setVariantesDe(p.id); setVariantesForm(variantesAFormulario(p.variantes)); }}
                          className="text-[11px] font-bold text-slate-500 underline">
                          {Array.isArray(p.variantes) && p.variantes.length ? `${p.variantes.length} variante${p.variantes.length === 1 ? '' : 's'}` : 'variantes'}
                        </button>
                      )}
                    </p>
                    {variantesDe === p.id && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <EditorVariantes valor={variantesForm} onCambio={setVariantesForm} precioBase={p.price_cents ? (p.price_cents / 100).toFixed(2).replace('.', ',') : undefined} />
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" onClick={() => guardarVariantes(p.id)} disabled={guardandoVariantes}
                            className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-black disabled:opacity-50">{guardandoVariantes ? 'Guardando…' : 'Guardar variantes'}</button>
                          <button type="button" onClick={() => setVariantesDe(null)} className="h-9 px-3 rounded-lg text-xs font-bold text-slate-500">Cancelar</button>
                        </div>
                      </div>
                    )}
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
            <Cupones />
          </>
        )
      ) : (
        pedidos.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            Todavía no te ha comprado nadie.
          </p>
        ) : (
          <>
          {/* CÓMO VAN LAS VENTAS (2026-08-22): lo que un vendedor mira antes
              que la lista — este mes, los últimos meses y lo más vendido.
              Euros y puntos son dos números y se enseñan como dos. */}
          <DatosFiscales />
          {resumen && (
            <div className="mb-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Este mes</p>
                  <p className="text-xl font-black text-slate-900">{resumen.mes?.pedidos ?? 0} <span className="text-xs font-bold text-slate-400">pedidos</span></p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Cobrado</p>
                  <p className="text-xl font-black text-slate-900">{dinero(resumen.mes?.euros_centimos ?? 0, 'EUR')}</p>
                  {Number(resumen.mes?.puntos) > 0 && <p className="text-[11px] font-bold text-amber-700">+ {Number(resumen.mes.puntos).toLocaleString('es-ES')} puntos</p>}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Sin enviar</p>
                  <p className={`text-xl font-black ${resumen.sin_enviar > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{resumen.sin_enviar}</p>
                </div>
                {Number(resumen.cestas_a_medias) > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Cestas a medias (30 días)</p>
                    <p className="text-xl font-black text-slate-900">{resumen.cestas_a_medias}</p>
                    <p className="text-[11px] text-slate-400">Con sesión y sin comprar; se les avisa a las 24 h.</p>
                  </div>
                )}
              </div>
              {resumen.serie?.length > 1 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Últimos meses: {resumen.serie.map((s: any) => `${s.mes.slice(5)}/${s.mes.slice(2, 4)} · ${s.pedidos} (${dinero(s.euros_centimos, 'EUR')})`).join(' — ')}
                </p>
              )}
              {resumen.mas_vendido?.length > 0 && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Lo más vendido: {resumen.mas_vendido.map((m: any) => `${m.nombre} ×${m.unidades}`).join(' · ')}
                </p>
              )}
            </div>
          )}
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
                <button type="button" onClick={() => verRecibo(p.id)} className="mt-2 mr-2 h-8 px-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100">
                  {reciboDe?.id === p.id ? 'Ocultar recibo' : 'Recibo'}
                </button>
                {reciboDe?.id === p.id && <Recibo datos={reciboDe.datos} onCerrar={() => setReciboDe(null)} />}
                {['pagado', 'enviado', 'entregado'].includes(p.estado) && (
                  <button onClick={() => marcarPedido(p.id, 'devuelto')}
                    className="mt-2 h-8 px-2 rounded-lg text-[11px] font-bold text-rose-700 hover:bg-rose-50">
                    Devolver{Number(p.puntos_usados) > 0 ? ` (${Number(p.puntos_usados).toLocaleString('es-ES')} puntos al comprador)` : ''}
                  </button>
                )}
              </li>
            ))}
          </ul>
          </>
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

/**
 * CUPONES (2026-08-22, fase 7 del plan): el vendedor crea códigos de
 * descuento — porcentaje o importe fijo, mínimo, caducidad, número de usos —
 * y los apaga cuando quiere. Nunca se borran: los pedidos los citan.
 */
function Cupones() {
  const [lista, setLista] = useState<any[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'porcentaje' | 'fijo'>('porcentaje');
  const [valor, setValor] = useState('');
  const [usosMax, setUsosMax] = useState('');
  const [caduca, setCaduca] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const cargar = () => fetch('/api/publicar/mis-cupones').then(r => r.json()).then(j => Array.isArray(j) && setLista(j)).catch(() => {});
  useEffect(() => { cargar(); }, []);
  const crear = async () => {
    setAviso(null);
    const v = tipo === 'fijo' ? Math.round(Number(valor.replace(',', '.')) * 100) : Number(valor);
    const r = await fetch('/api/publicar/mis-cupones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, tipo, valor: v, usos_max: usosMax || null, caduca: caduca || null }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setAviso(j.error || 'No se ha podido crear.'); return; }
    setCodigo(''); setValor(''); setUsosMax(''); setCaduca(''); setAbierto(false); cargar();
  };
  const alternar = async (id: string, activo: boolean) => {
    await fetch(`/api/publicar/mis-cupones/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo }) });
    cargar();
  };
  return (
    <section className="mt-6 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800">Cupones de descuento</h3>
        <button type="button" onClick={() => setAbierto(o => !o)}
          className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
          {abierto ? 'Cerrar' : 'Nuevo cupón'}
        </button>
      </div>
      {abierto && (
        <div className="mt-3 p-3 rounded-2xl border border-slate-200 space-y-2">
          <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="CÓDIGO (p. ej. VERANO10)"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm uppercase" />
          <div className="flex gap-2 flex-wrap">
            <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="h-10 px-2 rounded-lg border border-slate-200 text-sm">
              <option value="porcentaje">% de descuento</option>
              <option value="fijo">€ de descuento</option>
            </select>
            <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder={tipo === 'fijo' ? '5,00' : '10'}
              className="w-24 h-10 px-3 rounded-lg border border-slate-200 text-sm" />
            <input value={usosMax} onChange={e => setUsosMax(e.target.value)} inputMode="numeric" placeholder="Usos máx."
              className="w-24 h-10 px-3 rounded-lg border border-slate-200 text-sm" />
            <input type="date" value={caduca} onChange={e => setCaduca(e.target.value)} aria-label="Caduca el"
              className="h-10 px-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={crear} disabled={!codigo.trim() || !valor.trim()}
              className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40">Crear</button>
            {aviso && <p className="text-xs font-bold text-rose-600">{aviso}</p>}
          </div>
        </div>
      )}
      {lista && lista.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {lista.map(c => (
            <li key={c.id} className="flex items-center gap-3 text-xs">
              <span className={`font-mono font-black ${c.activo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{c.codigo}</span>
              <span className="text-slate-500">{c.tipo === 'porcentaje' ? `${c.valor} %` : `${(Number(c.valor) / 100).toFixed(2)} €`}</span>
              <span className="text-slate-400">· {c.usos}{c.usos_max ? `/${c.usos_max}` : ''} usos{c.caduca_at ? ` · hasta ${new Date(c.caduca_at).toLocaleDateString('es-ES')}` : ''}</span>
              <button type="button" onClick={() => alternar(c.id, !c.activo)} className="ml-auto text-[11px] font-bold text-slate-500 underline">
                {c.activo ? 'desactivar' : 'activar'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {lista && lista.length === 0 && !abierto && <p className="mt-2 text-xs text-slate-400">Sin cupones todavía.</p>}
    </section>
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
