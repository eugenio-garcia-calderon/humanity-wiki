import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, PackageX, ShieldCheck, Undo2, Truck, ChevronLeft, Check, Star, MessageCircle } from 'lucide-react';
import Markdown from '../components/ai/Markdown';
import { useCarrito } from '../hooks/useCarrito';
import Cesta, { DireccionEnvio, DIRECCION_VACIA, direccionCompleta, type Direccion } from '../components/knowledge/Cesta';

// ============================================================================
// LA FICHA DE UN PRODUCTO — fase 1 del plan de Comercio (2026-08-22)
// ============================================================================
// Eugenio: «ni funciona el botón de Miel de la Sierra cuando pincho en él».
// Tenía razón y el motivo era peor de lo que parecía: **un producto no tenía
// dónde vivir**. Existía como tarjeta dentro de la página de otro, y pulsarlo
// no llevaba a ningún sitio porque no había sitio al que llevar.
//
// Una tienda de verdad tiene una página por producto. Es la que se comparte
// por WhatsApp, la que indexa Google y la que se mira dos veces antes de
// comprar. Sin ella no hay comercio, hay un catálogo.
//
// ── LO QUE ENSEÑA Y POR QUÉ ─────────────────────────────────────────────────
// Galería, descripción entera, precio, disponibilidad, envío, garantía,
// devoluciones y opiniones. Es lo que alguien quiere saber antes de dar su
// tarjeta a un desconocido, y cada dato que falta es una razón para no
// hacerlo.

/** La tienda vive en `nombre.humanity.wiki`; los mensajes, en el dominio
 *  principal. Se quita el primer subdominio; en local (sin subdominio) es el
 *  mismo origen. */
const dominioPrincipal = () => {
  if (typeof window === 'undefined') return '';
  const partes = window.location.hostname.split('.');
  if (partes.length > 2 && !window.location.hostname.endsWith('localhost')) return `${window.location.protocol}//${partes.slice(1).join('.')}${window.location.port ? ':' + window.location.port : ''}`;
  return '';
};

export default function FichaProducto({ handle }: { handle: string }) {
  const { producto } = useParams();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-existe' | 'fallo'>('cargando');
  const [p, setP] = useState<any>(null);
  const [foto, setFoto] = useState(0);
  // La variante elegida (2026-08-23): si el producto tiene, hay que elegir
  // una antes de comprar o encestar; precio y stock pasan a ser los suyos.
  const [varianteId, setVarianteId] = useState<string | null>(null);
  const [anadido, setAnadido] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cobro, setCobro] = useState<{ abierto: boolean; pruebas: boolean } | null>(null);
  const { anadir } = useCarrito(handle);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/publicar/producto/${encodeURIComponent(producto || '')}`)
      .then(async r => {
        if (!vivo) return;
        if (r.status === 404) { setEstado('no-existe'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        setP(await r.json()); setEstado('ok'); setFoto(0);
      })
      .catch(() => vivo && setEstado('fallo'));
    fetch('/api/publicar/cobro').then(r => r.json()).then(j => vivo && setCobro(j)).catch(() => {});
    return () => { vivo = false; };
  }, [producto]);

  useEffect(() => {
    if (estado !== 'ok' || !p) return;
    const antes = document.title;
    document.title = `${p.nombre} · humanity.wiki`;
    return () => { document.title = antes; };
  }, [estado, p]);

  if (estado === 'cargando') {
    return <Marco><p className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p></Marco>;
  }

  if (estado !== 'ok') {
    return (
      <Marco>
        <div className="text-center py-12">
          <PackageX className="w-10 h-10 mx-auto text-slate-300" />
          <h1 className="mt-3 text-lg font-black text-slate-800">Este producto ya no está</h1>
          <p className="mt-1 text-sm text-slate-500">O nunca existió, o quien lo vendía lo ha retirado.</p>
          <Link to="/" className="inline-block mt-5 h-11 leading-[2.75rem] px-5 rounded-xl bg-slate-900 text-white text-sm font-bold">
            Ver la tienda
          </Link>
        </div>
      </Marco>
    );
  }

  const dinero = (c: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: p.moneda || 'EUR' }).format(c / 100);
  const fotos: string[] = Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes : (p.imagen ? [p.imagen] : []);
  const sePuede = p.precio_centimos && !(p.stock !== null && p.stock <= 0);

  // PAGAR CON PUNTOS TAMBIÉN DESDE «COMPRAR AHORA» (2026-08-22, Eugenio: «el
  // botón de comprar ahora te lleva directamente a Stripe, MAL»). El mismo
  // control que la cesta: el servidor dice si está activo y cuánto saldo hay,
  // y solo se enseña si este producto acepta puntos.
  const [caja, setCaja] = useState<{ activo: boolean; con_sesion: boolean; saldo: number | null; puntos_por_euro: number } | null>(null);
  const [usarPuntos, setUsarPuntos] = useState('');
  useEffect(() => {
    fetch('/api/publicar/puntos-en-caja').then(r => r.json()).then(j => { if (typeof j?.activo === 'boolean') setCaja(j); }).catch(() => {});
  }, []);
  const puntosPedidos = Number(String(usarPuntos).replace(',', '.')) || 0;
  // Con envío incluido (2026-08-23): si los puntos llegan a precio + porte, no
  // hay Stripe y la dirección se pide aquí.
  const [direccion, setDireccion] = useState<Direccion>(DIRECCION_VACIA);
  const envioFicha = p?.envio?.hace_falta ? Number(p.envio.centimos || 0) : 0;
  const variantes: any[] = Array.isArray(p?.variantes) ? p.variantes : [];
  const variante = variantes.find(v => v.id === varianteId) || null;
  const faltaVariante = variantes.length > 0 && !variante;
  // Precio y stock efectivos: los de la variante si hay una elegida.
  const precioEfectivo: number | null = variante ? (variante.precio_centimos ?? p?.precio_centimos ?? null) : (p?.precio_centimos ?? null);
  const stockEfectivo: number | null = variante ? (variante.stock ?? null) : (p?.stock ?? null);
  const todoEnPuntos = caja && precioEfectivo
    ? Math.floor((((precioEfectivo || 0) + envioFicha) / 100) * caja.puntos_por_euro * 100) / 100 : 0;
  const maxPuntos = caja?.saldo != null && precioEfectivo ? Math.min(caja.saldo, todoEnPuntos) : 0;
  const cubreTodo = !!caja && todoEnPuntos > 0 && puntosPedidos >= todoEnPuntos && maxPuntos >= todoEnPuntos;
  const faltaDireccion = cubreTodo && !!p?.envio?.hace_falta && !direccionCompleta(direccion);

  async function comprar() {
    setComprando(true); setError(null);
    try {
      const r = await fetch('/api/publicar/comprar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: p.id, cantidad: 1, volver_a: window.location.href,
          ...(variante ? { variante_id: variante.id } : {}),
          ...(caja?.activo && p.acepta_puntos && puntosPedidos > 0 ? { usar_puntos: Math.min(puntosPedidos, maxPuntos) } : {}),
          ...(cubreTodo && p.envio?.hace_falta ? { direccion } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error || 'No se ha podido abrir el pago.'); setComprando(false); return; }
      // Pagado entero con puntos: no hay Stripe, vuelve aquí con el código y
      // la confirmación la pinta la cesta (que también vive en esta página).
      window.location.href = j.url;
    } catch { setError('No hay conexión con el servidor.'); setComprando(false); }
  }

  return (
    <Marco>
      <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-5">
        <ChevronLeft className="w-3.5 h-3.5" /> Toda la tienda
      </Link>

      <div className="sm:grid sm:grid-cols-2 sm:gap-8">
        <div>
          {fotos.length > 0 ? (
            <>
              <img src={fotos[foto]} alt={p.nombre}
                   className="w-full aspect-square object-cover rounded-2xl border border-slate-200" />
              {fotos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {fotos.map((f, i) => (
                    <button key={i} type="button" onClick={() => setFoto(i)}
                      aria-label={`Foto ${i + 1}`}
                      className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 ${i === foto ? 'border-slate-900' : 'border-transparent'}`}>
                      <img src={f} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Un hueco gris sin explicación parece que la página está rota.
            // Decir que no hay foto es información, aunque sea poca.
            <div className="w-full aspect-square rounded-2xl bg-slate-50 border border-dashed border-slate-200 grid place-items-center">
              <span className="text-xs text-slate-400">Sin fotos todavía</span>
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{p.nombre}</h1>

          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            {p.precio_centimos
              ? <span className="text-3xl font-black text-slate-900">{dinero(precioEfectivo)}</span>
              : <span className="text-base font-bold text-slate-500">Precio a consultar</span>}
            {stockEfectivo !== null && (
              stockEfectivo <= 0
                ? <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Agotado</span>
                : stockEfectivo <= 5
                  ? <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Quedan {stockEfectivo}</span>
                  : <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>
            )}
          </div>

          {p.envio?.hace_falta && <Envio envio={p.envio} dinero={dinero} precio={p.precio_centimos} />}

          {/* VARIANTES (2026-08-23): talla, color… Botones, no desplegable:
              se ven todas de un vistazo y las agotadas se ven agotadas. */}
          {variantes.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Elige una opción</p>
              <div className="flex flex-wrap gap-1.5">
                {variantes.map(v => {
                  const agotada = v.stock !== null && v.stock <= 0;
                  const precioV = v.precio_centimos ?? p.precio_centimos;
                  return (
                    <button key={v.id} type="button" disabled={agotada} onClick={() => setVarianteId(v.id)}
                      className={`h-10 px-3 rounded-xl border text-sm font-bold transition-colors ${varianteId === v.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-500'} disabled:opacity-40 disabled:line-through`}>
                      {v.nombre}{precioV && precioV !== p.precio_centimos ? <span className="ml-1 text-[11px] font-semibold opacity-80">{dinero(precioV)}</span> : null}
                    </button>
                  );
                })}
              </div>
              {faltaVariante && <p className="mt-1.5 text-[11px] text-slate-500">Elige una para ver el precio final y comprar.</p>}
            </div>
          )}

          {cobro?.abierto && sePuede && (
            <div className="mt-5 space-y-2">
              {caja?.activo && caja.con_sesion && caja.saldo != null && p.acepta_puntos && p.modalidad !== 'suscripcion' && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="ficha-puntos" className="text-xs font-bold text-amber-900">
                      Pagar con puntos <span className="font-normal text-amber-700">(tienes {caja.saldo.toLocaleString('es-ES', { maximumFractionDigits: 2 })})</span>
                    </label>
                    <button type="button" onClick={() => setUsarPuntos(String(maxPuntos))} className="text-[11px] font-bold text-amber-800 underline">usar el máximo</button>
                  </div>
                  <input id="ficha-puntos" inputMode="decimal" value={usarPuntos} onChange={e => setUsarPuntos(e.target.value)} placeholder="0"
                    className="mt-1.5 w-32 h-10 px-3 rounded-lg border border-amber-200 bg-white text-sm" />
                  {puntosPedidos > 0 && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      −{dinero(Math.min((p.precio_centimos || 0) + (cubreTodo ? envioFicha : 0), Math.round((Math.min(puntosPedidos, maxPuntos) / caja.puntos_por_euro) * 100)))} de descuento
                      {cubreTodo ? ` — se paga todo con puntos${envioFicha > 0 ? `, envío (${dinero(envioFicha)}) incluido` : ''}, sin tarjeta` : ` — con ${todoEnPuntos.toLocaleString('es-ES')} puntos se pagaría todo${envioFicha > 0 ? ', envío incluido,' : ''} sin tarjeta`}.
                    </p>
                  )}
                  {cubreTodo && p.envio?.hace_falta && <DireccionEnvio valor={direccion} onCambio={setDireccion} />}
                </div>
              )}
              <button type="button" onClick={comprar} disabled={comprando || faltaDireccion || faltaVariante}
                className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-60">
                {comprando ? (cubreTodo ? 'Pagando con puntos…' : 'Abriendo el pago…')
                  : faltaVariante ? 'Elige una opción'
                  : faltaDireccion ? 'Falta la dirección de envío'
                  : cubreTodo ? 'Pagar con puntos'
                  : p.modalidad === 'suscripcion' ? 'Suscribirme' : 'Comprar ahora'}
              </button>
              {/* Una suscripción no va a la cesta: se paga sola. Ponerle el
                  botón sería prometer algo que el cobro rechaza. */}
              {p.se_puede_encestar !== false && (
                <button type="button" disabled={faltaVariante}
                  onClick={() => {
                    anadir({ producto_id: p.id, cantidad: 1, nombre: p.nombre, precio_centimos: precioEfectivo || 0,
                      ...(variante ? { variante_id: variante.id, variante_nombre: variante.nombre } : {}) });
                    setAnadido(true); window.setTimeout(() => setAnadido(false), 1600);
                  }}
                  className="w-full h-12 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {anadido ? <><Check className="w-4 h-4 text-emerald-600" /> Añadido</> : 'Añadir a la cesta'}
                </button>
              )}
              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

              {/* ── EL AVISO DE MODO DE PRUEBAS ───────────────────────────
                  Con una clave de pruebas, Stripe rechaza cualquier tarjeta
                  real. Sin este aviso, alguien pone su tarjeta, ve un error
                  que no entiende, y en el peor caso cree que ha comprado. Se
                  dice ANTES de pulsar. Desaparece solo cuando se pongan las
                  claves de verdad: lo decide el servidor, no esta pantalla. */}
              {cobro.pruebas && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <b>Esta tienda todavía no cobra.</b> Es una prueba: no se te va a cobrar nada
                  y una tarjeta de verdad será rechazada.
                </p>
              )}
              <p className="text-[11px] text-slate-400">
                Pago seguro con tarjeta. No hace falta cuenta.
                {p.envio?.hace_falta && ' La dirección se pide al pagar.'}
              </p>
            </div>
          )}

          {/* PREGUNTAR AL VENDEDOR (2026-08-23): un mensaje directo, que ya
              existe (Telecomunicaciones). La duda que no se puede preguntar
              es una venta que no se hace. */}
          {p.vendedor?.id && (
            <a href={`${dominioPrincipal()}/mensajes?con=${encodeURIComponent(p.vendedor.id)}`}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
              <MessageCircle className="w-4 h-4" /> Preguntar al vendedor
            </a>
          )}

          {(p.garantia || p.devoluciones) && (
            <ul className="mt-5 space-y-1.5 pt-4 border-t border-slate-100">
              {p.garantia && <li className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /> {p.garantia}</li>}
              {p.devoluciones && <li className="flex items-center gap-2 text-xs text-slate-500">
                <Undo2 className="w-4 h-4 text-emerald-500 shrink-0" /> {p.devoluciones}</li>}
            </ul>
          )}
        </div>
      </div>

      {p.descripcion && (
        <section className="mt-10 pt-6 border-t border-slate-100 max-w-2xl">
          <h2 className="text-lg font-black text-slate-900 mb-2">Sobre esto</h2>
          {/* Con formato (2026-08-23): negrita, cursiva, listas, tablas — el
              mismo Markdown del asistente. Lo que el vendedor escribe sin
              marcas se ve igual que antes, párrafo a párrafo. */}
          <div className="text-[15px] leading-relaxed text-slate-700">
            <Markdown texto={p.descripcion} />
          </div>
        </section>
      )}

      <Opiniones productoId={p.id} />

      <Cesta tienda={handle} />
    </Marco>
  );
}

/**
 * OPINIONES (2026-08-22, fase 3 del plan de comercio). Estrellas de 1 a 5 y
 * un texto opcional; cualquiera con sesión opina, pero la marca «compra
 * verificada» la pone el servidor solo a quien tiene un pedido pagado de
 * este producto — y esa marca es la única que pesa en el reparto de puntos.
 * Una persona, una opinión: volver a enviar sobreescribe la tuya.
 */
function Opiniones({ productoId }: { productoId: string }) {
  const [datos, setDatos] = useState<{ media: number | null; n: number; verificadas: number; resenas: any[] } | null>(null);
  const [sesion, setSesion] = useState<boolean | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = () => {
    fetch(`/api/publicar/producto/${encodeURIComponent(productoId)}/resenas`)
      .then(r => r.json()).then(j => { if (Array.isArray(j?.resenas)) setDatos(j); }).catch(() => {});
  };
  useEffect(() => {
    cargar();
    fetch('/api/auth/me').then(r => r.json()).then(j => setSesion(!!j?.user)).catch(() => setSesion(false));
  }, [productoId]);

  const enviar = async () => {
    if (!estrellas) { setAviso('Elige de 1 a 5 estrellas.'); return; }
    setEnviando(true); setAviso(null);
    try {
      const r = await fetch(`/api/publicar/producto/${encodeURIComponent(productoId)}/resena`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estrellas, texto }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAviso(j.error || 'No se ha podido guardar.'); return; }
      setAviso(j.compra_verificada ? 'Guardada, con la marca de compra verificada.' : 'Guardada. Como no consta una compra tuya, irá sin la marca de compra verificada.');
      setTexto(''); setEstrellas(0); cargar();
    } catch { setAviso('No hay conexión con el servidor.'); }
    finally { setEnviando(false); }
  };

  const Estrellas = ({ n, tam = 'w-4 h-4' }: { n: number; tam?: string }) => (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`${tam} ${i <= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}
    </span>
  );

  return (
    <section className="mt-8 pt-6 border-t border-slate-100 max-w-2xl">
      <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" /> Opiniones
        {datos && datos.n > 0 && (
          <span className="text-sm font-bold text-slate-500 ml-1">
            {datos.media?.toLocaleString('es-ES')} · {datos.n} {datos.n === 1 ? 'opinión' : 'opiniones'}
            {datos.verificadas > 0 && <span className="text-emerald-700"> · {datos.verificadas} con compra verificada</span>}
          </span>
        )}
      </h2>
      {datos && datos.n === 0 && <p className="text-sm text-slate-400">Nadie ha opinado todavía. Sé quien empiece.</p>}

      {datos && datos.resenas.length > 0 && (
        <ul className="mt-3 space-y-3">
          {datos.resenas.map((r, i) => (
            <li key={i} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2 flex-wrap">
                <Estrellas n={r.estrellas} />
                <span className="text-xs font-bold text-slate-700">{r.autor}</span>
                {r.compra_verificada && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3" /> compra verificada
                  </span>
                )}
                {r.mia && <span className="text-[10px] font-bold text-slate-400">· tuya</span>}
                <span className="text-[11px] text-slate-400 ml-auto">{new Date(r.fecha).toLocaleDateString('es-ES')}</span>
              </div>
              {r.texto && <p className="mt-1.5 text-sm text-slate-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{r.texto}</p>}
            </li>
          ))}
        </ul>
      )}

      {sesion === false && (
        <p className="mt-4 text-sm text-slate-500">
          <Link to="/login" className="font-bold text-emerald-700 hover:underline">Entra</Link> para dejar tu opinión.
        </p>
      )}
      {sesion && (
        <div className="mt-4 p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">Tu opinión</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" onClick={() => setEstrellas(i)} aria-label={`${i} estrellas`}
                className="w-9 h-9 grid place-items-center rounded-lg hover:bg-amber-50">
                <Star className={`w-6 h-6 ${i <= estrellas ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} maxLength={2000}
            placeholder="¿Qué tal? (opcional)"
            className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-400 focus:outline-none" />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={enviar} disabled={enviando}
              className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">
              {enviando ? 'Guardando…' : 'Publicar opinión'}
            </button>
            {aviso && <p className="text-xs font-bold text-slate-600">{aviso}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function Envio({ envio, dinero, precio }: { envio: any; dinero: (c: number) => string; precio: number | null }) {
  let texto: string;
  if (envio.centimos === null) texto = 'Envío a acordar con quien lo vende';
  else if (envio.centimos === 0) texto = 'Envío gratis';
  else if (envio.gratis_desde_centimos !== null && precio !== null && precio >= envio.gratis_desde_centimos) texto = 'Envío gratis';
  else if (envio.gratis_desde_centimos !== null) texto = `Envío ${dinero(envio.centimos)} · gratis desde ${dinero(envio.gratis_desde_centimos)}`;
  else texto = `Envío ${dinero(envio.centimos)}`;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
      <Truck className="w-4 h-4 text-slate-400 shrink-0" />
      {texto}{envio.plazo ? ` · ${envio.plazo}` : ''}
    </p>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-12">{children}</div>
    </div>
  );
}
