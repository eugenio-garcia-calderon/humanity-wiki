import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, PackageX, ShieldCheck, Undo2, Truck, ChevronLeft, Check, Star } from 'lucide-react';
import { useCarrito } from '../hooks/useCarrito';
import Cesta from '../components/knowledge/Cesta';

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

export default function FichaProducto({ handle }: { handle: string }) {
  const { producto } = useParams();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-existe' | 'fallo'>('cargando');
  const [p, setP] = useState<any>(null);
  const [foto, setFoto] = useState(0);
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

  async function comprar() {
    setComprando(true); setError(null);
    try {
      const r = await fetch('/api/publicar/comprar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: p.id, cantidad: 1, volver_a: window.location.href }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error || 'No se ha podido abrir el pago.'); setComprando(false); return; }
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
              ? <span className="text-3xl font-black text-slate-900">{dinero(p.precio_centimos)}</span>
              : <span className="text-base font-bold text-slate-500">Precio a consultar</span>}
            {p.stock !== null && (
              p.stock <= 0
                ? <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Agotado</span>
                : p.stock <= 5
                  ? <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Quedan {p.stock}</span>
                  : <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>
            )}
          </div>

          {p.envio?.hace_falta && <Envio envio={p.envio} dinero={dinero} precio={p.precio_centimos} />}

          {cobro?.abierto && sePuede && (
            <div className="mt-5 space-y-2">
              <button type="button" onClick={comprar} disabled={comprando}
                className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-60">
                {comprando ? 'Abriendo el pago…'
                  : p.modalidad === 'suscripcion' ? 'Suscribirme' : 'Comprar ahora'}
              </button>
              {/* Una suscripción no va a la cesta: se paga sola. Ponerle el
                  botón sería prometer algo que el cobro rechaza. */}
              {p.se_puede_encestar !== false && (
                <button type="button"
                  onClick={() => {
                    anadir({ producto_id: p.id, cantidad: 1, nombre: p.nombre, precio_centimos: p.precio_centimos });
                    setAnadido(true); window.setTimeout(() => setAnadido(false), 1600);
                  }}
                  className="w-full h-12 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 flex items-center justify-center gap-2">
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
          <p className="text-[15px] leading-relaxed text-slate-700" style={{ whiteSpace: 'pre-wrap' }}>
            {p.descripcion}
          </p>
        </section>
      )}

      {/* Las opiniones son la fase 3 y todavía no existen. Se dice, en vez de
          dejar un hueco: quien mira sabe que no es que nadie haya opinado
          mal, es que todavía no se puede opinar. */}
      <section className="mt-8 pt-6 border-t border-slate-100 max-w-2xl">
        <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
          <Star className="w-4 h-4 text-slate-300" /> Opiniones
        </h2>
        <p className="text-sm text-slate-400">
          Todavía no se pueden dejar opiniones aquí. Está en camino.
        </p>
      </section>

      <Cesta tienda={handle} />
    </Marco>
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
