import { useState } from 'react';
import { Package, Truck, CheckCircle2, Undo2, XCircle, Loader2, Download } from 'lucide-react';

// ============================================================================
// ¿DÓNDE ESTÁ LO MÍO? — fase 6 del plan de tiendas (2026-08-22)
// ============================================================================
// Quien compra en la tienda de alguien no tiene cuenta —esa es toda la gracia
// de la fase 3— así que tampoco tiene un «mis pedidos» donde mirar. Sin esta
// pantalla, pagar era el último sitio donde se sabía algo.
//
// Se abre con el código del pedido y el correo con el que se compró. Los dos,
// no sólo el código: ocho caracteres se pueden probar a mano hasta acertar, y
// detrás hay el nombre y la ciudad de una persona.

const PASOS = [
  { estado: 'pagado', icono: Package, texto: 'Pagado', ayuda: 'Quien lo vende ya lo sabe.' },
  { estado: 'enviado', icono: Truck, texto: 'Enviado', ayuda: 'Va de camino.' },
  { estado: 'entregado', icono: CheckCircle2, texto: 'Entregado', ayuda: 'Llegó.' },
];

export default function MiPedido() {
  const [codigo, setCodigo] = useState('');
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState<'quieto' | 'buscando' | 'ok' | 'no-esta'>('quieto');
  const [pedido, setPedido] = useState<any>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('buscando');
    try {
      const r = await fetch(
        `/api/publicar/pedido/${encodeURIComponent(codigo.trim().toUpperCase())}?correo=${encodeURIComponent(correo.trim())}`
      );
      if (!r.ok) { setEstado('no-esta'); return; }
      setPedido(await r.json());
      setEstado('ok');
    } catch { setEstado('no-esta'); }
  }

  const dinero = (c: number, m: string) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: m || 'EUR' }).format(c / 100);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-5 py-10 sm:py-16">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">¿Dónde está mi pedido?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Con el código que te dimos al pagar y el correo con el que compraste.
        </p>

        <form onSubmit={buscar} className="mt-6 space-y-3">
          <input value={codigo} onChange={e => setCodigo(e.target.value)}
            placeholder="MIEL-7K3Q" required
            // 16px o más: por debajo, iOS hace zoom al tocar el campo y desde
            // ahí la página se puede arrastrar de lado. Lección de agosto.
            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-base font-mono tracking-widest uppercase
                       focus:border-emerald-400 focus:outline-none" />
          <input value={correo} onChange={e => setCorreo(e.target.value)}
            type="email" placeholder="tu@correo.com" required
            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-base
                       focus:border-emerald-400 focus:outline-none" />
          <button type="submit" disabled={estado === 'buscando'}
            className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60">
            {estado === 'buscando'
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</span>
              : 'Ver mi pedido'}
          </button>
        </form>

        {estado === 'no-esta' && (
          // Una sola respuesta para «ese código no existe» y «ese correo no
          // cuadra». Distinguirlas confirmaría a quien prueba códigos que ha
          // dado con uno bueno.
          <p className="mt-4 text-sm text-rose-600">
            No hay ningún pedido con ese código y ese correo. Revisa los dos: el código está en el
            recibo que te llegó al pagar.
          </p>
        )}

        {estado === 'ok' && pedido && (
          <article className="mt-8 rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-mono tracking-widest text-slate-400">{pedido.codigo}</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              {pedido.producto}{pedido.unidades > 1 && <span className="text-slate-400"> × {pedido.unidades}</span>}
            </h2>
            <p className="text-sm text-slate-500">
              {dinero(pedido.importe_centimos, pedido.moneda)}
              {pedido.envio_centimos > 0 && ` · envío ${dinero(pedido.envio_centimos, pedido.moneda)}`}
              {pedido.ciudad && ` · a ${pedido.ciudad}`}
            </p>

            {pedido.estado === 'devuelto' || pedido.estado === 'cancelado' ? (
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-600">
                {pedido.estado === 'devuelto' ? <Undo2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {pedido.estado === 'devuelto' ? 'Devuelto' : 'Cancelado'}
              </p>
            ) : (
              <ol className="mt-5 space-y-3">
                {/* Un pedido solo de descargas no se envía: se pinta pagado →
                    entregado, sin un «enviado» que nunca llegaría. */}
                {PASOS.filter(paso => !(pedido.solo_digital && paso.estado === 'enviado')).map(paso => {
                  const indice = PASOS.findIndex(x => x.estado === pedido.estado);
                  const yo = PASOS.findIndex(x => x.estado === paso.estado);
                  const hecho = yo <= indice;
                  const Icono = paso.icono;
                  return (
                    <li key={paso.estado} className="flex items-start gap-3">
                      <Icono className={`w-5 h-5 shrink-0 mt-0.5 ${hecho ? 'text-emerald-500' : 'text-slate-200'}`} />
                      <div>
                        <p className={`text-sm font-bold ${hecho ? 'text-slate-800' : 'text-slate-300'}`}>{paso.texto}</p>
                        {hecho && <p className="text-xs text-slate-400">{paso.ayuda}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {pedido.seguimiento && (
              <p className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                Seguimiento: <span className="font-mono text-slate-700">{pedido.seguimiento}</span>
              </p>
            )}

            {/* LO QUE SE COMPRÓ, LÍNEA A LÍNEA — y la descarga de lo digital
                (2026-08-22). Antes un PDF se cobraba y no se entregaba: la
                descarga vive AQUÍ, en el pedido, con las mismas dos llaves
                (código + correo) que abrieron esta pantalla. Si quien vende no
                subió el archivo, se dice tal cual: el pedido está pagado y la
                culpa no es de quien compró. */}
            {Array.isArray(pedido.lineas) && pedido.lineas.length > 0 && (
              <ul className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                {pedido.lineas.map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700 min-w-0 truncate">
                      {l.producto}{l.unidades > 1 && <span className="text-slate-400"> × {l.unidades}</span>}
                    </span>
                    {l.descarga ? (
                      <a href={l.descarga} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold">
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                    ) : l.sin_archivo ? (
                      <span className="shrink-0 text-xs text-amber-700 font-bold">
                        Quien vende aún no ha subido el archivo
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
