import { useEffect, useState } from 'react';
import { Loader2, PackageX, ShieldCheck, Undo2, ImageOff, Truck, Check } from 'lucide-react';
import { useCarrito } from '../../hooks/useCarrito';
import { subdominioDeUsuario } from '../../utils/subdominio';

// ============================================================================
// UN PRODUCTO EN UNA PÁGINA PÚBLICA — fase 2 del plan de tiendas (2026-08-22)
// ============================================================================
// Antes, un producto puesto en una página se veía así:
//
//     📄 DJI Power 1000 V2
//
// Un enlace de texto. Ni foto, ni precio, ni saber si queda alguno. Nadie
// compra eso, y quien lo pulsaba salía de la tienda al mercado global con los
// productos de todos los demás.
//
// ── EL BOTÓN DE COMPRAR (fase 3) ────────────────────────────────────────────
// Ya existe, porque ya se puede pagar sin cuenta. Antes no lo puse a
// propósito: el pago exigía sesión y el botón habría fallado JUSTO DESPUÉS de
// que alguien decidiera comprar, que es el peor momento para fallar.
//
// No aparece cuando no puede funcionar: sin precio no hay botón sino «precio a
// consultar», y agotado tampoco. Un botón que se puede pulsar es una promesa.

type Estado = 'cargando' | 'ok' | 'no-existe' | 'fallo';
type Compra = { fase: 'quieto' } | { fase: 'abriendo' } | { fase: 'error'; motivo: string };

export default function ProductoPublico({ id, titulo }: { id: string; titulo?: string }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [p, setP] = useState<any>(null);
  // Una foto cuya dirección ha dejado de existir. Pasa: las imágenes de un
  // producto son enlaces a otro sitio, y ese sitio no le debe nada a esta
  // página. Sin esto, el navegador pinta el icono roto encima de la tarjeta.
  const [fotoRota, setFotoRota] = useState(false);
  const [compra, setCompra] = useState<Compra>({ fase: 'quieto' });
  const [anadido, setAnadido] = useState(false);
  // ¿Está abierta la compra en esta instalación? Se pregunta una vez y se
  // guarda para toda la página: si no, seis productos harían seis preguntas
  // idénticas. Mientras no se sepa, no se pinta botón — enseñar uno y
  // quitarlo medio segundo después es peor que tardar medio segundo.
  const [cobro, setCobro] = useState<boolean | null>(null);
  useEffect(() => {
    if (cobroConocido !== null) { setCobro(cobroConocido); return; }
    let vivo = true;
    fetch('/api/publicar/cobro')
      .then(r => r.ok ? r.json() : { abierto: false })
      .then(j => { if (!vivo) return; cobroConocido = !!j.abierto; setCobro(cobroConocido); })
      .catch(() => vivo && setCobro(false));
    return () => { vivo = false; };
  }, []);
  // El carrito es de ESTA tienda. Fuera de un subdominio no hay tienda a la
  // que pertenecer, así que tampoco hay cesta: sólo compra directa.
  const tienda = subdominioDeUsuario();
  const { anadir } = useCarrito(tienda || 'general');
  useEffect(() => { setFotoRota(false); setCompra({ fase: 'quieto' }); setAnadido(false); }, [id]);

  async function comprar() {
    setCompra({ fase: 'abriendo' });
    try {
      const r = await fetch('/api/publicar/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // De dónde sale y a dónde vuelve: a esta misma tienda. El servidor no
        // se fía de esto y comprueba que sea una dirección suya.
        body: JSON.stringify({ producto_id: id, cantidad: 1, volver_a: window.location.href }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) {
        // El motivo se enseña tal cual lo da el servidor cuando lo da: «se ha
        // agotado» o «solo quedan 2» es información que quien compra necesita,
        // y taparla con un «ha habido un error» sería mentir por comodidad.
        setCompra({ fase: 'error', motivo: j.error || 'No se ha podido abrir el pago.' });
        return;
      }
      window.location.href = j.url;
    } catch {
      setCompra({ fase: 'error', motivo: 'No hay conexión con el servidor.' });
    }
  }

  useEffect(() => {
    let vivo = true;
    fetch(`/api/publicar/producto/${encodeURIComponent(id)}`)
      .then(async r => {
        if (!vivo) return;
        if (r.status === 404) { setEstado('no-existe'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        setP(await r.json());
        setEstado('ok');
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [id]);

  if (estado === 'cargando') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
        <span className="text-sm text-slate-400">{titulo || 'Cargando el producto…'}</span>
      </div>
    );
  }

  if (estado !== 'ok') {
    // Un producto retirado no deja un hueco ni un error de programador: deja
    // dicho que ya no está, con el nombre que tenía cuando se puso en la
    // página. Quien lee entiende qué pasó.
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <PackageX className="w-4 h-4 text-slate-300 shrink-0" />
        <span className="text-sm text-slate-500">
          {titulo ? <><b className="text-slate-600">{titulo}</b> ya no está disponible.</>
                  : 'Este producto ya no está disponible.'}
        </span>
      </div>
    );
  }

  const precio = p.precio_centimos === null ? null
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: p.moneda || 'EUR' })
        .format(p.precio_centimos / 100);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="sm:flex">
        {p.imagen && !fotoRota && (
          <div className="sm:w-44 sm:shrink-0 bg-slate-50">
            <img src={p.imagen} alt="" loading="lazy"
                 onError={() => setFotoRota(true)}
                 className="w-full h-44 sm:h-full object-cover" />
          </div>
        )}
        {p.imagen && fotoRota && (
          <div className="sm:w-44 sm:shrink-0 h-20 sm:h-auto bg-slate-50 grid place-items-center">
            <ImageOff className="w-5 h-5 text-slate-300" />
          </div>
        )}
        <div className="p-4 min-w-0 flex-1">
          <h3 className="text-base font-black text-slate-900 leading-snug">{p.nombre}</h3>

          {p.descripcion && (
            <p className="mt-1 text-sm text-slate-500 line-clamp-3">{p.descripcion}</p>
          )}

          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            {precio
              ? <>
                  <span className="text-xl font-black text-slate-900">{precio}</span>
                  {p.modalidad === 'suscripcion' && (
                    <span className="text-xs text-slate-400">
                      al {p.periodo === 'anual' ? 'año' : p.periodo === 'trimestral' ? 'trimestre' : 'mes'}
                    </span>
                  )}
                </>
              // Sin precio no se inventa un cero: se dice que hay que
              // preguntar. Un cero diría «gratis», que es otra cosa.
              : <span className="text-sm font-bold text-slate-500">Precio a consultar</span>}
            <Disponibilidad stock={p.stock} />
          </div>

          <Envio envio={p.envio} moneda={p.moneda} precio={p.precio_centimos} />

          {cobro === true && puedeComprarse(p) && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={comprar} disabled={compra.fase === 'abriendo'}
                  className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-bold
                             disabled:opacity-60 disabled:cursor-wait">
                  {compra.fase === 'abriendo' ? 'Abriendo el pago…' : 'Comprar'}
                </button>
                {/* «Añadir» sólo dentro de una tienda: fuera de un subdominio
                    no hay cesta a la que añadir ni un vendedor único al que
                    pagarle todo junto. */}
                {tienda && (
                  <button type="button"
                    onClick={() => {
                      anadir({ producto_id: p.id, cantidad: 1, nombre: p.nombre, precio_centimos: p.precio_centimos });
                      setAnadido(true);
                      window.setTimeout(() => setAnadido(false), 1600);
                    }}
                    className="h-11 px-4 rounded-xl border border-slate-300 text-sm font-bold text-slate-700
                               hover:border-slate-400 flex items-center gap-1.5">
                    {anadido ? <><Check className="w-4 h-4 text-emerald-600" /> Añadido</> : 'Añadir a la cesta'}
                  </button>
                )}
              </div>
              {compra.fase === 'error' && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">{compra.motivo}</p>
              )}
              <p className="mt-1.5 text-[11px] text-slate-400">
                Pago seguro con tarjeta. No hace falta cuenta.
                {p.envio?.hace_falta && p.envio?.centimos !== null && ' La dirección se pide al pagar.'}
              </p>
            </div>
          )}

          {(p.garantia || p.devoluciones) && (
            <ul className="mt-3 space-y-1">
              {p.garantia && (
                <li className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {p.garantia}
                </li>
              )}
              {p.devoluciones && (
                <li className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Undo2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {p.devoluciones}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * `null` no es `0`. «No lleva la cuenta» y «se ha agotado» son respuestas
 * distintas: la primera no se enseña, la segunda sí y en rojo. Aplastarlas
 * pondría «agotado» sobre todo lo que nadie inventaría nunca.
 */
function Disponibilidad({ stock }: { stock: number | null }) {
  if (stock === null) return null;
  if (stock <= 0) {
    return <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Agotado</span>;
  }
  if (stock <= 5) {
    return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      Quedan {stock}
    </span>;
  }
  return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>;
}

/**
 * ¿Se puede comprar esto ahora mismo?
 *
 * Sin precio, no: hay que preguntar. Agotado, tampoco. Y `stock === null`
 * SÍ se puede comprar — quien no lleva la cuenta no está agotado, y ese es
 * justamente el caso de casi todo lo que hay hoy en el catálogo.
 */
function puedeComprarse(p: any): boolean {
  if (!p.precio_centimos) return false;
  if (p.stock !== null && p.stock <= 0) return false;
  return true;
}

/**
 * EL ENVÍO SE DICE ANTES DE COMPRAR, NO EN LA ÚLTIMA PANTALLA.
 *
 * Un coste que aparece al final es la primera causa de carrito abandonado, y
 * en la tienda de una persona es peor que una pérdida: parece un truco.
 *
 * Los tres casos de `centimos` son tres frases distintas, y por eso no se
 * colapsan: `null` es «no lo ha configurado» —no se promete nada—, `0` es
 * «gratis» dicho a propósito, y cualquier otro número es lo que cuesta.
 */
function Envio({ envio, moneda, precio }: { envio: any; moneda: string; precio: number | null }) {
  if (!envio?.hace_falta) return null;

  const dinero = (c: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda || 'EUR' }).format(c / 100);

  let texto: string;
  if (envio.centimos === null) {
    // Ni «gratis» ni una cifra inventada: la verdad, que es que hay que
    // hablarlo. Prometer un envío que quien vende no ha configurado sería
    // comprometerle a algo que no ha dicho.
    texto = 'Envío a acordar con quien lo vende';
  } else if (envio.centimos === 0) {
    texto = 'Envío gratis';
  } else if (envio.gratis_desde_centimos !== null && precio !== null && precio >= envio.gratis_desde_centimos) {
    texto = 'Envío gratis';
  } else if (envio.gratis_desde_centimos !== null) {
    texto = `Envío ${dinero(envio.centimos)} · gratis desde ${dinero(envio.gratis_desde_centimos)}`;
  } else {
    texto = `Envío ${dinero(envio.centimos)}`;
  }

  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
      <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      {texto}{envio.plazo ? ` · ${envio.plazo}` : ''}
    </p>
  );
}

/** Se pregunta una vez por carga de página, no una vez por producto. */
let cobroConocido: boolean | null = null;
