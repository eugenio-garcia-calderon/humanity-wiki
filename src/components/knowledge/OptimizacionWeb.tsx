import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Gauge, Search, CheckCircle2, AlertTriangle, Sparkles, Undo2, Check, Globe, GlobeLock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { comprimirImagen } from '../../utils/prepararImagen';
import { subirArchivo } from '../../utils/subir';

// ============================================================================
// OPTIMIZACIÓN WEB (2026-10-13)
// ============================================================================
// Eugenio: «cuando se publica una web, una herramienta "Optimización web" con dos apartados. Tiempo de carga: qué
// tarda, si ha empeorado respecto a antes, qué recomienda y un botón para aplicar (comprimir imágenes), con aceptar o
// deshacer. SEO: si quieres indexarla, cómo organizarla y una propuesta de la IA con acciones».
//
// Lo medido lo hace el servidor (`optimizacion.ts`), igual que la pediría un visitante. Aplicar una compresión la hace
// esta pantalla, que reutiliza el compresor y la subida de siempre: las imágenes nuevas quedan en el editor y se
// guardan con la página. «Deshacer» devuelve las anteriores; «Aceptar» cierra la barra y deja lo hecho.

type Bloque = { id: string; tipo: string; url?: string; optimizada?: boolean; bloques?: Bloque[] };
type Recomendacion = { id: string; titulo: string; detalle: string; accion: string | null };
type Medicion = { id: string; medido_at: string; ms_total: number; ms_html: number; ms_contenido: number; ms_imagenes: number; bytes_imagenes: number; bytes_max: number; n_imagenes: number; n_tablas: number };
type Datos = {
  publicada: boolean; urlPublica: string | null; indexable: boolean;
  mediciones: Medicion[]; ultima: Medicion | null; anterior: Medicion | null; empeorado: boolean;
  recomendaciones: Recomendacion[];
  seo: Array<{ id: string; nombre: string; ok: boolean; texto: string }>;
};
type Propuesta = { titulo: string; detalle: string; prioridad: 'alta' | 'media' | 'baja'; tipo: string };

const seg = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const mb = (b: number) => `${(b / 1_000_000).toFixed(1).replace('.', ',')} MB`;

/** Recorre todos los bloques, también los que van dentro de otros, y aplica `f` a cada uno. */
function mapear(lista: Bloque[], f: (b: Bloque) => Bloque): Bloque[] {
  return lista.map(b => {
    const n = f(b);
    return Array.isArray(n.bloques) ? { ...n, bloques: mapear(n.bloques, f) } : n;
  });
}
function todos(lista: Bloque[], out: Bloque[] = []): Bloque[] {
  for (const b of lista) { out.push(b); if (Array.isArray(b.bloques)) todos(b.bloques, out); }
  return out;
}

/** Comprime una imagen de la página. Devuelve la dirección nueva, o null si no compensa (GIF, SVG, ya pequeña…). */
async function comprimirUrl(url: string): Promise<string | null> {
  const r = await fetch(url, { credentials: 'include' });
  if (!r.ok) return null;
  const blob = await r.blob();
  if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) return null;
  const f = new File([blob], `imagen.${blob.type.split('/')[1]}`, { type: blob.type });
  const c = await comprimirImagen(f, 1600, 0.8);
  if (c.size >= blob.size * 0.9) return null;
  const sub = await subirArchivo(c, c.type);
  if (sub.error || !sub.url) return null;
  return sub.url;
}

export default function OptimizacionWeb({ paginaId, bloques, setBloques, programarGuardado, onCerrar }: {
  paginaId: string;
  bloques: Bloque[];
  setBloques: Dispatch<SetStateAction<any[]>>;
  programarGuardado: () => void;
  onCerrar: () => void;
}) {
  const [pestana, setPestana] = useState<'tiempo' | 'seo'>('tiempo');
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Lo último aplicado, para poder deshacerlo: url anterior por bloque. */
  const [deshacer, setDeshacer] = useState<Record<string, string> | null>(null);
  const [propuesta, setPropuesta] = useState<Propuesta[] | null>(null);

  const cargar = async () => {
    const r = await fetch(`/api/optimizacion/${encodeURIComponent(paginaId)}`, { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error || 'No se ha podido cargar la optimización.'); return; }
    setDatos(j);
  };
  useEffect(() => { void cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [paginaId]);

  const medir = async () => {
    setOcupado('Midiendo la página…'); setAviso(null);
    const r = await fetch(`/api/optimizacion/${encodeURIComponent(paginaId)}/medir`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    setOcupado(null);
    if (!r.ok) { setAviso(j.error || 'No se ha podido medir.'); return; }
    await cargar();
  };

  const comprimirImagenes = async () => {
    const candidatas = todos(bloques).filter(b => b.tipo === 'imagen' && b.url && !b.optimizada);
    if (!candidatas.length) { setAviso('No hay imágenes por comprimir.'); return; }
    const antes: Record<string, string> = {};
    const nuevas: Record<string, string> = {};
    let hechas = 0;
    for (const b of candidatas) {
      hechas++;
      setOcupado(`Comprimiendo ${hechas} de ${candidatas.length}…`);
      try {
        const nueva = await comprimirUrl(b.url!);
        antes[b.id] = b.url!;
        nuevas[b.id] = nueva || b.url!;
      } catch { /* esta imagen se queda como está */ }
    }
    setOcupado(null);
    const cambiadas = Object.keys(antes).filter(id => nuevas[id] !== antes[id]);
    // Las que no compensan también se marcan: la siguiente vez no se vuelven a intentar.
    setBloques(bs => mapear(bs, b => (antes[b.id] ? { ...b, url: nuevas[b.id], optimizada: true } : b)));
    programarGuardado();
    setDeshacer(cambiadas.length ? Object.fromEntries(cambiadas.map(id => [id, antes[id]])) : null);
    setAviso(cambiadas.length === 0 ? 'Ninguna imagen necesitaba compresión.' : cambiadas.length === 1 ? 'Una imagen comprimida.' : `${cambiadas.length} imágenes comprimidas.`);
  };

  const deshacerCambios = () => {
    if (!deshacer) return;
    setBloques(bs => mapear(bs, b => (deshacer[b.id] ? { ...b, url: deshacer[b.id], optimizada: undefined } : b)));
    programarGuardado();
    setDeshacer(null);
    setAviso('Cambios deshechos.');
  };

  const aplicar = (rec: Recomendacion) => {
    if (rec.accion === 'comprimir_imagenes') void comprimirImagenes();
  };

  const cambiarIndexable = async () => {
    if (!datos) return;
    const r = await fetch(`/api/optimizacion/${encodeURIComponent(paginaId)}/indexar`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indexable: !datos.indexable }),
    });
    if (!r.ok) { setAviso('No se ha podido cambiar.'); return; }
    await cargar();
  };

  const pedirPropuesta = async () => {
    setOcupado('La IA está revisando la página…'); setAviso(null); setPropuesta(null);
    const r = await fetch(`/api/optimizacion/${encodeURIComponent(paginaId)}/propuesta-seo`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    setOcupado(null);
    if (!r.ok) { setAviso(j.error || 'No se ha podido generar la propuesta.'); return; }
    setPropuesta(j.acciones);
  };

  const pestanas: Array<[typeof pestana, string, any]> = [['tiempo', 'Tiempo de carga', Gauge], ['seo', 'SEO', Search]];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onCerrar} role="dialog" aria-label="Optimización web">
      <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-100 px-5">
          <h2 className="text-sm font-black text-slate-800">Optimización web</h2>
          <div role="tablist" className="ml-3 flex gap-1 rounded-xl bg-slate-100 p-1">
            {pestanas.map(([k, l, I]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold', pestana === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                <I className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          {!datos && !error && <div className="grid place-items-center py-14"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
          {ocupado && <p className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {ocupado}</p>}
          {aviso && <p className="text-xs font-bold text-slate-600">{aviso}</p>}

          {datos && pestana === 'tiempo' && (
            <>
              {!datos.publicada && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">Publica la página para medirla: la mide un visitante, así que tiene que estar en la web.</p>
              )}
              {datos.publicada && (
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={medir} disabled={!!ocupado} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white disabled:opacity-50">
                    <Gauge className="h-4 w-4" /> Medir ahora
                  </button>
                  {datos.urlPublica && <span className="truncate text-[11px] text-slate-400">{datos.urlPublica}</span>}
                </div>
              )}

              {datos.ultima && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Última medición</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{seg(datos.ultima.ms_total)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Página {seg(datos.ultima.ms_html)} · contenido {seg(datos.ultima.ms_contenido)} · imágenes {seg(datos.ultima.ms_imagenes)} ({datos.ultima.n_imagenes} imágenes, {mb(datos.ultima.bytes_imagenes)}) · {datos.ultima.n_tablas} tablas
                  </p>
                  {datos.anterior && (
                    <p className={cn('mt-2 inline-flex items-center gap-1.5 text-xs font-bold', datos.empeorado ? 'text-rose-700' : 'text-emerald-700')}>
                      {datos.empeorado ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {datos.empeorado ? `Ha empeorado: antes ${seg(datos.anterior.ms_total)}` : `Igual o mejor que antes (${seg(datos.anterior.ms_total)})`}
                    </p>
                  )}
                  {datos.mediciones.length > 1 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {datos.mediciones.slice(0, 6).map(m => (
                        <li key={m.id} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                          {new Date(m.medido_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {seg(m.ms_total)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {datos.recomendaciones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Qué recomendamos</p>
                  {datos.recomendaciones.map(r => (
                    <div key={r.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{r.titulo}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{r.detalle}</p>
                      </div>
                      {r.accion && (
                        <button onClick={() => aplicar(r)} disabled={!!ocupado} className="h-9 shrink-0 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                          Aplicar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {deshacer && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 p-3 text-white">
                  <span className="text-xs font-bold">{Object.keys(deshacer).length === 1 ? 'Cambiada una imagen' : `Cambiadas ${Object.keys(deshacer).length} imágenes`}. Queda guardado con la página.</span>
                  <button onClick={() => setDeshacer(null)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg bg-white/15 px-3 text-xs font-bold"><Check className="h-3.5 w-3.5" /> Aceptar</button>
                  <button onClick={deshacerCambios} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-slate-900"><Undo2 className="h-3.5 w-3.5" /> Deshacer</button>
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-slate-400">
                Medido desde el servidor: pide la página y sus imágenes como lo haría un visitante. No mide cómo las pinta cada navegador ni la red de quien mire.
              </p>
            </>
          )}

          {datos && pestana === 'seo' && (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">¿Quieres que los buscadores la indexen?</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {!datos.publicada ? 'Primero publícala: un buscador solo puede indexar lo que está publicado.'
                      : datos.indexable ? 'Sí: los buscadores pueden encontrarla.' : 'No: le has pedido a los buscadores que no la indexen.'}
                  </p>
                </div>
                <button onClick={cambiarIndexable} disabled={!datos.publicada || !!ocupado}
                  className={cn('inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold disabled:opacity-50', datos.indexable ? 'bg-slate-100 text-slate-700' : 'bg-emerald-600 text-white')}>
                  {datos.indexable ? <><GlobeLock className="h-4 w-4" /> Que no la indexen</> : <><Globe className="h-4 w-4" /> Indexar</>}
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Cómo está la página</p>
                {datos.seo.map(c => (
                  <div key={c.id} className="flex items-start gap-2.5 rounded-xl px-2 py-1.5">
                    {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">{c.nombre}</p>
                      <p className="text-xs text-slate-500">{c.texto}</p>
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-[11px] leading-relaxed text-slate-400">
                  Lo que más ayuda a una página: un título claro, una descripción de 120 a 160 caracteres, títulos que dividan el texto y, de cada imagen, un pie que diga qué muestra.
                </p>
              </div>

              <div className="space-y-2">
                <button onClick={pedirPropuesta} disabled={!!ocupado} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-50">
                  <Sparkles className="h-4 w-4" /> Generar propuesta con IA
                </button>
                {propuesta && (
                  <ol className="space-y-2">
                    {propuesta.map((a, i) => (
                      <li key={i} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase',
                            a.prioridad === 'alta' ? 'bg-rose-100 text-rose-700' : a.prioridad === 'media' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>{a.prioridad}</span>
                          <p className="text-sm font-bold text-slate-800">{a.titulo}</p>
                        </div>
                        {a.detalle && <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.detalle}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
