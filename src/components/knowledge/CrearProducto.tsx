import { useEffect, useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';

// ============================================================================
// CREAR UN PRODUCTO SIN SALIR DE LA PÁGINA — fase 2 del plan de Comercio
// ============================================================================
// Eugenio, 2026-08-22: «céntrate primero en mejorar el creador de comercio
// dentro de páginas».
//
// Hasta ahora el bloque «Producto» sólo sabía INSERTAR uno que ya existiera. Y
// como no había ninguna pantalla para crear productos, la lista estaba vacía
// para todo el mundo: un buscador que nunca encuentra nada.
//
// ── LO QUE PIDE Y LO QUE NO ─────────────────────────────────────────────────
// Nombre y precio. Nada más es obligatorio. Todo lo demás —fotos, stock,
// envío, plazo— se puede dejar en blanco y rellenar luego, porque quien está
// escribiendo una página no quiere parar quince minutos a rellenar una ficha:
// quiere poner el tarro y seguir escribiendo.
//
// Y el precio se escribe en EUROS, no en céntimos. Parece obvio y no lo es:
// la base de datos guarda céntimos y la tentación es pedirlos tal cual. Quien
// vende miel escribe «12,50».

type Props = {
  onCancelar: () => void;
  onCreado: (producto: { id: string; nombre: string; precio_centimos: number | null }) => void;
};

export default function CrearProducto({ onCancelar, onCreado }: Props) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  // COBRAR EN PUNTOS (2026-08-23, Eugenio: «preguntemos a los vendedores si
  // quieren recibir el valor en puntos, y darles el equivalente cuando pongan
  // el valor en euros, con un 50 % de descuento en la comisión»). El
  // equivalente sale de la tasa que publica el servidor (1 punto = 1 € hoy).
  const [aceptaPuntos, setAceptaPuntos] = useState(false);
  // BORRADOR (2026-08-23): guardar sin publicar. No se ve ni se puede comprar
  // hasta que se publique desde Comercio.
  const [borrador, setBorrador] = useState(false);
  const [tasaPuntos, setTasaPuntos] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/publicar/puntos-en-caja').then(r => r.json())
      .then(j => { if (typeof j?.puntos_por_euro === 'number') setTasaPuntos(j.puntos_por_euro); }).catch(() => {});
  }, []);
  const [descripcion, setDescripcion] = useState('');
  // Cuatro formas de vender, no dos. Un servicio no se envía ni se descarga, y
  // una suscripción se cobra otra vez cada mes — que en el cobro es un modo
  // distinto, no un matiz. Con dos opciones no se podía dar de alta ni una
  // asesoría ni una SaaS: sólo lo que cabe en una caja.
  const [tipo, setTipo] = useState<'fisico' | 'digital' | 'servicio' | 'suscripcion'>('fisico');
  const [periodo, setPeriodo] = useState<'mensual' | 'trimestral' | 'anual'>('mensual');
  const [stock, setStock] = useState('');
  const [envio, setEnvio] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoNueva, setFotoNueva] = useState('');
  // EL ARCHIVO DE UNA DESCARGA (2026-08-22): se sube a la zona privada de
  // subidas (`?privado=1`) en cuanto se elige, y lo que se guarda en el
  // producto es su URL interna. Nadie lo verá por esa URL: solo quien pague,
  // desde su pedido. Sin archivo, el producto se crea igual —se avisa en
  // Comercio— pero lo que se cobre no se podrá entregar hasta subirlo.
  const [archivo, setArchivo] = useState<{ url: string; nombre: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /** SUBIR UNA FOTO DESDE EL MÓVIL (2026-08-22): hasta hoy había que pegar la
   *  dirección de una imagen que ya estuviera en internet — que es pedirle al
   *  vendedor que tenga web antes de tener tienda. Va a la zona pública de
   *  subidas (una foto de producto es para enseñarla). */
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  async function subirFoto(f: File) {
    setSubiendoFoto(true); setError(null);
    try {
      const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type || 'image/jpeg')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error || 'No se ha podido subir la foto.'); return; }
      setFotos(prev => [...prev, j.url].slice(0, 8));
    } catch { setError('No hay conexión con el servidor.'); }
    finally { setSubiendoFoto(false); }
  }

  async function subirArchivo(f: File) {
    setSubiendo(true); setError(null);
    try {
      const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type || 'application/octet-stream')}&privado=1`, {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error || 'No se ha podido subir el archivo.'); return; }
      setArchivo({ url: j.url, nombre: f.name });
    } catch { setError('No hay conexión con el servidor.'); }
    finally { setSubiendo(false); }
  }
  const [error, setError] = useState<string | null>(null);

  /**
   * «12,50» y «12.50» son lo mismo, y las dos se escriben. Y «1.250» son mil
   * doscientos cincuenta en España, no uno con veinticinco: si hay punto Y
   * coma, el punto es de los miles. Es el mismo cuidado que costó una tarde
   * en las tablas, cuando «120.000» se guardó como 120.
   */
  function aCentimos(txt: string): number | null {
    const t = txt.trim();
    if (!t) return null;
    let limpio = t.replace(/\s|€/g, '');
    if (limpio.includes('.') && limpio.includes(',')) limpio = limpio.replace(/\./g, '');
    else if ((limpio.match(/\./g) || []).length > 1) limpio = limpio.replace(/\./g, '');
    limpio = limpio.replace(',', '.');
    const n = Number(limpio);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return Math.round(n * 100);
  }

  async function guardar() {
    setError(null);
    if (!nombre.trim()) { setError('Ponle un nombre.'); return; }
    const cent = aCentimos(precio);
    if (Number.isNaN(cent)) { setError('El precio no se entiende. Escríbelo como 12,50.'); return; }

    setGuardando(true);
    try {
      const r = await fetch('/api/publicar/mis-productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          precio_centimos: cent,
          tipo,
          periodo: tipo === 'suscripcion' ? periodo : undefined,
          // Sólo lo que se envía lleva stock y porte. Un servicio con «quedan
          // 3» significaría otra cosa —tres plazas— y una suscripción con
          // stock no significa nada.
          stock: tipo === 'fisico' && stock.trim() !== '' ? Number(stock) : null,
          envio_centimos: tipo === 'fisico' && envio.trim() !== '' ? aCentimos(envio) : null,
          imagenes: fotos,
          archivo_digital: tipo === 'digital' && archivo ? archivo.url : undefined,
          acepta_puntos: tipo !== 'suscripcion' && aceptaPuntos,
          borrador,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) { setError(j.error || 'No se ha podido crear.'); setGuardando(false); return; }
      onCreado({ id: j.id, nombre: nombre.trim(), precio_centimos: cent });
    } catch {
      setError('No hay conexión con el servidor.');
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 flex items-start justify-center pt-16 px-5 overflow-y-auto"
         onClick={() => !guardando && onCancelar()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl mb-16" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900">Un producto nuevo</h2>
          <button onClick={onCancelar} disabled={guardando} aria-label="Cerrar"
                  className="w-11 h-11 -mr-2 grid place-items-center text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* 16 px o más en todos los campos: por debajo, iOS hace zoom al
              tocarlos y desde ahí la página se arrastra de lado. */}
          <Campo etiqueta="Qué vendes">
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Miel de romero 500 g"
              className="w-full h-12 px-3 rounded-xl border border-slate-200 text-base focus:border-emerald-400 focus:outline-none" />
          </Campo>

          <Campo etiqueta="Qué vendes exactamente">
            <div className="grid grid-cols-2 gap-2">
              {([
                ['fisico', 'Algo que se envía'],
                ['digital', 'Una descarga'],
                ['servicio', 'Un servicio'],
                ['suscripcion', 'Una suscripción'],
              ] as const).map(([v, t]) => (
                <button key={v} type="button" onClick={() => setTipo(v)}
                  className={`h-11 rounded-xl text-sm font-bold border ${tipo === v ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </Campo>

          <div className={tipo === 'fisico' ? 'grid grid-cols-2 gap-3' : ''}>
            <Campo etiqueta={tipo === 'suscripcion' ? 'Cuánto cada vez' : 'Precio'}
                   ayuda={tipo === 'servicio' ? 'Déjalo en blanco si depende del caso' : undefined}>
              <div className="relative">
                <input value={precio} onChange={e => setPrecio(e.target.value)}
                  inputMode="decimal" placeholder="12,50"
                  className="w-full h-12 pl-3 pr-8 rounded-xl border border-slate-200 text-base focus:border-emerald-400 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
              </div>
              {tipo !== 'suscripcion' && (() => {
                const cent = aCentimos(precio);
                const puntosEq = cent && !Number.isNaN(cent) && tasaPuntos ? Math.round((cent / 100) * tasaPuntos * 100) / 100 : null;
                return (
                  <label className={`mt-2 flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${aceptaPuntos ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={aceptaPuntos} onChange={e => setAceptaPuntos(e.target.checked)} className="mt-1" />
                    <span className="text-xs leading-relaxed text-slate-700">
                      <b>Acepto cobrar en puntos</b>
                      {puntosEq !== null && <> — este precio son <b>{puntosEq.toLocaleString('es-ES')} puntos</b></>}.
                      {' '}Quien compre con puntos te los paga a ti, y la comisión de la plataforma es <b>la mitad</b> (2,5 % en puntos, frente al 5 % en euros).
                    </span>
                  </label>
                );
              })()}
              <label className="mt-2 flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input type="checkbox" checked={borrador} onChange={e => setBorrador(e.target.checked)} className="mt-1" />
                <span className="text-xs leading-relaxed text-slate-700">
                  <b>Guardar como borrador</b> — no se verá ni se podrá comprar hasta que lo publiques desde Comercio.
                </span>
              </label>
            </Campo>
            {/* El stock sólo tiene sentido en lo que se envía: «quedan 3» en un
                servicio querría decir tres plazas, que es otra cosa, y en una
                suscripción no quiere decir nada. */}
            {tipo === 'fisico' && (
              <Campo etiqueta="Cuántos tienes" ayuda="En blanco = no llevas la cuenta">
                <input value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric" placeholder="—"
                  className="w-full h-12 px-3 rounded-xl border border-slate-200 text-base focus:border-emerald-400 focus:outline-none" />
              </Campo>
            )}
          </div>

          {tipo === 'suscripcion' && (
            <Campo etiqueta="Cada cuánto se cobra">
              <div className="flex gap-2">
                {([['mensual', 'Al mes'], ['trimestral', 'Al trimestre'], ['anual', 'Al año']] as const).map(([v, t]) => (
                  <button key={v} type="button" onClick={() => setPeriodo(v)}
                    className={`flex-1 h-11 rounded-xl text-sm font-bold border ${periodo === v ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          {tipo === 'fisico' && (
            <Campo etiqueta="Envío" ayuda="En blanco = lo acuerdas con quien compre">
              <div className="relative">
                <input value={envio} onChange={e => setEnvio(e.target.value)}
                  inputMode="decimal" placeholder="3,90"
                  className="w-full h-12 pl-3 pr-8 rounded-xl border border-slate-200 text-base focus:border-emerald-400 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
              </div>
            </Campo>
          )}

          <Campo etiqueta="Cuéntalo" ayuda="Lo que preguntaría quien lo va a comprar">
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4}
              placeholder="De dónde sale, cómo es, qué tamaño tiene…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base leading-relaxed focus:border-emerald-400 focus:outline-none resize-y" />
          </Campo>

          {tipo === 'digital' && (
            <Campo etiqueta="El archivo que se entrega" ayuda="PDF, ZIP, audio, vídeo… Solo lo descarga quien lo compre, desde su pedido">
              <label className="flex items-center gap-3 h-12 px-3 rounded-xl border border-dashed border-slate-300 text-sm cursor-pointer hover:border-emerald-400">
                <input type="file" className="hidden" disabled={subiendo}
                  onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); e.target.value = ''; }} />
                {subiendo
                  ? <span className="text-slate-400">Subiendo…</span>
                  : archivo
                    ? <span className="text-emerald-700 font-bold truncate">✓ {archivo.nombre}</span>
                    : <span className="text-slate-500">Elegir archivo…</span>}
              </label>
              {!archivo && !subiendo && (
                <p className="mt-1.5 text-xs text-amber-700">Sin archivo, lo que se cobre no se podrá entregar. Puedes subirlo luego desde Comercio.</p>
              )}
            </Campo>
          )}

          <Campo etiqueta="Fotos" ayuda="Sube una del móvil, o pega la dirección de una imagen">
            <label className={`mb-2 flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed text-sm cursor-pointer ${subiendoFoto ? 'border-slate-200 text-slate-400' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}>
              <input type="file" accept="image/*" className="hidden" disabled={subiendoFoto || fotos.length >= 8}
                onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f); e.target.value = ''; }} />
              {subiendoFoto ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo la foto…</> : <><Plus className="w-4 h-4" /> Subir una foto</>}
            </label>
            <div className="flex gap-2">
              <input value={fotoNueva} onChange={e => setFotoNueva(e.target.value)}
                placeholder="https://…"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (fotoNueva.trim()) { setFotos([...fotos, fotoNueva.trim()]); setFotoNueva(''); } } }}
                className="flex-1 h-12 px-3 rounded-xl border border-slate-200 text-base focus:border-emerald-400 focus:outline-none" />
              <button type="button" aria-label="Añadir foto"
                onClick={() => { if (fotoNueva.trim()) { setFotos([...fotos, fotoNueva.trim()]); setFotoNueva(''); } }}
                className="w-12 h-12 shrink-0 grid place-items-center rounded-xl border border-slate-200">
                <Plus className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            {fotos.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {fotos.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button type="button" aria-label="Quitar foto"
                      onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 grid place-items-center rounded-full bg-white border border-slate-200 shadow">
                      <Trash2 className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Campo>

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button onClick={onCancelar} disabled={guardando}
            className="flex-1 h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            className="flex-[2] h-12 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-60">
            {guardando
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creando…</span>
              : 'Crear y ponerlo aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-black text-slate-700 mb-1">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-[11px] text-slate-400 mt-1">{ayuda}</span>}
    </label>
  );
}
