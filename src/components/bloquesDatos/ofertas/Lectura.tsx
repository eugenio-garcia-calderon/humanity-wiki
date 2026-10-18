import { useEffect, useState } from 'react';
import { ExternalLink, Wrench, Store } from 'lucide-react';
import BotonCompra from '../../tablas/BotonCompra';
import { comisionDeLinea, textoComision, totalOferta } from '../../../utils/ofertas';
import type { PropsLectura } from '../tipos';

// ============================================================================
// «DÓNDE COMPRARLO» — lo que ve quien lee la ficha (Wikiproducts W5)
// ============================================================================
// Una tarjeta por tienda, en el orden que manda el servidor (`ordenarOfertas`:
// precio con envío, luego atención al cliente; la comisión NUNCA). Cada una
// dice lo que cuesta de verdad puesto en casa, cuándo se miró ese precio y
// cuánto nos paga esa tienda — la frase sale de `textoComision`, la misma que
// la cesta y el recibo, para que la promesa se diga igual en los tres sitios.
//
// Dos caminos para comprar, y la tarjeta enseña los que hay:
//   · «Añadir a la cesta»: la oferta tiene botón de compra; pagas aquí y
//     Wikiproducts lo pide a la tienda (pedido gestionado).
//   · «Ver en la tienda»: el enlace a la oferta en la web del distribuidor,
//     con `rel="sponsored"` si nos paga comisión y `nofollow` si no.

export type Oferta = {
  fila_id: string; distribuidor_id: string | null; distribuidor: string | null;
  precio_centimos: number | null; envio_centimos: number | null; moneda: string;
  stock: number | null; agotada: boolean; plazo: string | null; enlace: string | null; rel: string;
  comision_pct: number | null; comprobado: string | null; instalacion: boolean | null;
  compra: any | null; nota_distribuidor: number | null;
};

const dinero = (c: number, moneda = 'EUR') => new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(c / 100);
const fecha = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); };

export function useOfertas(datos: Record<string, unknown>, paginaId?: string) {
  const tabla = typeof datos.tabla_id === 'string' ? datos.tabla_id : '';
  const fila = typeof datos.fila_id === 'string' ? datos.fila_id : '';
  const [estado, setEstado] = useState<{ cargando: boolean; ofertas: Oferta[]; error: string | null }>({ cargando: true, ofertas: [], error: null });
  useEffect(() => {
    if (!fila && !paginaId) { setEstado({ cargando: false, ofertas: [], error: null }); return; }
    const q = new URLSearchParams();
    if (fila) q.set('fila', fila); else if (paginaId) q.set('pagina', paginaId);
    if (tabla) q.set('tabla', tabla);
    let vivo = true;
    setEstado(e => ({ ...e, cargando: true }));
    fetch(`/api/ofertas?${q}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) setEstado({ cargando: false, ofertas: [], error: j.error || 'No se han podido leer las ofertas.' });
        else setEstado({ cargando: false, ofertas: Array.isArray(j.ofertas) ? j.ofertas : [], error: null });
      })
      .catch(() => vivo && setEstado({ cargando: false, ofertas: [], error: 'No hay conexión con el servidor.' }));
    return () => { vivo = false; };
  }, [tabla, fila, paginaId]);
  return estado;
}

export function ListaOfertas({ ofertas, titulo }: { ofertas: Oferta[]; titulo: string }) {
  const conPrecio = ofertas.filter(o => o.precio_centimos !== null && !o.agotada);
  const desde = conPrecio.length ? Math.min(...conPrecio.map(o => totalOferta(o)!)) : null;
  const moneda = ofertas[0]?.moneda || 'EUR';
  const ultima = ofertas.map(o => o.comprobado).filter(Boolean).sort().pop() || null;

  return (
    <section aria-label={titulo} className="my-4">
      <h2 className="text-xl font-black text-slate-900">{titulo}</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        {desde !== null
          ? <>Desde <b className="text-slate-800">{dinero(desde, moneda)}</b> con envío, en {ofertas.length === 1 ? 'una tienda' : `${ofertas.length} tiendas`}.</>
          : `${ofertas.length === 1 ? 'Una tienda' : `${ofertas.length} tiendas`}, sin precio disponible ahora.`}
        {ultima && <> Precios comprobados el {fecha(ultima)}.</>}
      </p>

      <ul className="mt-3 space-y-2.5">
        {ofertas.map(o => {
          const total = totalOferta(o);
          const comisionUnidad = o.precio_centimos === null ? null : comisionDeLinea(o.precio_centimos, 1, o.comision_pct);
          return (
            <li key={o.fila_id} className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                    <Store className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    {o.distribuidor || 'Tienda sin nombre'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {o.nota_distribuidor !== null
                      ? `Atención al cliente: ${o.nota_distribuidor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5`
                      : 'Atención al cliente: aún sin votos suficientes'}
                    {o.plazo && ` · Entrega: ${o.plazo}`}
                    {o.agotada ? ' · Agotado' : o.stock !== null && o.stock <= 5 ? ` · Quedan ${o.stock}` : ''}
                  </p>
                  {o.instalacion === true && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-emerald-700"><Wrench className="h-3.5 w-3.5" aria-hidden /> Incluye instalación</p>
                  )}
                </div>
                <div className="text-right">
                  {o.precio_centimos !== null ? (
                    <>
                      <p className="text-lg font-black tabular-nums text-slate-900">{dinero(o.precio_centimos, o.moneda)}</p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {o.envio_centimos === null
                          // Sin envío puesto, la cesta lo cobra a cero (`bd/tienda.ts`): se dice eso, no «consultar».
                          ? (o.compra ? 'Sin gastos de envío comprando aquí' : 'Envío: lo dice la tienda')
                          : o.envio_centimos === 0 ? 'Envío gratis' : `+ ${dinero(o.envio_centimos, o.moneda)} de envío`}
                        {total !== null && o.envio_centimos ? <> · <b className="text-slate-700">{dinero(total, o.moneda)}</b></> : null}
                      </p>
                    </>
                  ) : <p className="text-sm text-slate-500">Precio no publicado</p>}
                </div>
              </div>

              <p className="mt-2 text-xs leading-snug text-slate-500">{textoComision(o.comision_pct, comisionUnidad, o.moneda)}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {o.compra && !o.agotada && <BotonCompra datos={o.compra} />}
                {o.enlace && (
                  <a href={o.enlace} target="_blank" rel={o.rel}
                     className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    Ver en la tienda <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
                {!o.compra && !o.enlace && <span className="text-xs text-slate-400">Esta tienda no tiene venta en línea registrada.</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Ordenadas por lo que pagas con el envío; a igual precio, por la atención al cliente de la tienda. La comisión no cambia el orden.
        Si compras aquí, pagas el mismo precio que en la tienda y Wikiproducts hace el pedido por ti.
      </p>
    </section>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  const { cargando, ofertas, error } = useOfertas(datos, paginaId);
  const titulo = typeof datos.titulo === 'string' && datos.titulo.trim() ? datos.titulo.trim() : 'Dónde comprarlo';
  if (cargando) return <div className="my-4 h-24 animate-pulse rounded-2xl bg-slate-50" />;
  if (error) return <p className="my-4 text-sm text-slate-400">{error}</p>;
  if (!ofertas.length) {
    return (
      <section aria-label={titulo} className="my-4">
        <h2 className="text-xl font-black text-slate-900">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">Todavía no tenemos registrada ninguna tienda que lo venda.</p>
      </section>
    );
  }
  return <ListaOfertas ofertas={ofertas} titulo={titulo} />;
}
