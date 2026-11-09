// ============================================================================
// AEROMÓVIL GOTA · «Otros velomóviles»: catálogo, comparación y fotos (2026-11-05)
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, GitCompare, Loader2, Save, Trash2, Eye, Wand2 } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { CATALOGO, fichaComparable, referenciaValida, type Referencia, type RuedaRef } from './referencias';
import { cargarImagen, ejesDesdeMarcas, perfilDesdeFotos, pintarMascara, recortar, type Mascara } from './fotoAModelo';
import { DIAMETRO_RUEDA, type Modelo, type Pulgadas, type Resultados } from './geometria';

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const CLAVES = 'aeromovil.claves.referencias';
const leerClaves = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(CLAVES) || '{}') || {}; } catch { return {}; } };

/** Nuestra ficha, en los mismos términos que la de un velomóvil de referencia. */
export function fichaPropia(m: Modelo, r: Resultados) {
  const ejes = new Set(m.ruedas.map(w => Math.round(w.x * 100))).size;
  // The Bala has no mass estimate and the editor's Cd formula does not apply to it: '—' rather than a number that means nothing.
  const via = m.tipo === 'bala' ? m.P.track : Math.max(m.via.del, m.via.tras);
  return { L: m.Lf, W: m.P.W, H: m.P.H, batalla: m.P.B, ruedas: m.ruedas.length, ejes, via, plazas: m.tipo === 'bala' ? 2 : m.asientos.length,
    masa: Number.isFinite(r.mVeh) ? r.mVeh : null, cd: Number.isFinite(r.Cd) ? r.Cd as number | null : null, huella: m.Lf * m.P.W };
}
export const nombreDe = (m: Modelo) => (m.tipo === 'a1' ? 'Aeromóvil 1' : m.tipo === 'bala' ? 'Cuadriciclo Bala' : 'Aeromóvil Gota');

export function TablaComparacion({ propia, otra, nombre, nuestro = 'Aeromóvil 1' }: { propia: ReturnType<typeof fichaPropia>; otra: ReturnType<typeof fichaComparable>; nombre: string; nuestro?: string }) {
  const filas: [string, number | null, number | null, (v: number) => string][] = [
    ['Largo', propia.L, otra.L, v => `${fmt(v)} m`], ['Ancho', propia.W, otra.W, v => `${fmt(v)} m`], ['Alto', propia.H, otra.H, v => `${fmt(v)} m`],
    ['Batalla', propia.batalla, otra.batalla, v => `${fmt(v)} m`], ['Vía más ancha', propia.via, otra.via, v => `${fmt(v)} m`],
    ['Ruedas', propia.ruedas, otra.ruedas, v => String(v)], ['Plazas', propia.plazas, otra.plazas, v => String(v)],
    ['Masa', propia.masa, otra.masa, v => `${Math.round(v)} kg`], ['Cd (el nuestro, estimado)', propia.cd, otra.cd, v => v.toFixed(3).replace('.', ',')], ['Huella (largo × ancho)', propia.huella, otra.huella, v => `${fmt(v)} m²`],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-1.5 font-semibold">Medida</th><th className="py-1.5 text-right font-semibold">{nuestro}</th><th className="py-1.5 text-right font-semibold">{nombre}</th><th className="py-1.5 text-right font-semibold">Diferencia</th></tr></thead>
        <tbody>
          {filas.map(([n, a, b, f]) => (
            <tr key={n} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-700">{n}</td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums">{a == null ? '—' : f(a)}</td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums">{b == null ? 'no publicado' : f(b)}</td>
              <td className={cn('py-1.5 text-right font-mono text-xs tabular-nums', a != null && b != null && a > b ? 'text-amber-700' : 'text-emerald-700')}>
                {a == null || b == null || !b ? '—' : `${a >= b ? '+' : ''}${Math.round((a / b - 1) * 100)} %`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DISTRIBUCIONES = [
  { k: '1-2', n: '1 delante + 2 detrás' }, { k: '2-1', n: '2 delante + 1 detrás' }, { k: '2-2', n: '2 delante + 2 detrás' },
  { k: '1-2-1', n: 'Rombo 1 + 2 + 1' }, { k: '1-1', n: '2 ruedas en línea' },
] as const;
type Distribucion = typeof DISTRIBUCIONES[number]['k'];

/** Crear un velomóvil de referencia desde una foto de perfil (y otra de planta si la hay). */
function CrearDesdeFotos({ alVer, alGuardado }: { alVer: (r: Referencia) => void; alGuardado: () => void }) {
  const [nombre, setNombre] = useState('');
  const [L, setL] = useState(2.8), [W, setW] = useState(0.8), [clear, setClear] = useState(0.10);
  const [tol, setTol] = useState(60), [morroIzq, setMorroIzq] = useState(true);
  const [rueda, setRueda] = useState<Pulgadas>('20'), [dist, setDist] = useState<Distribucion>('2-1'), [via, setVia] = useState(0.65);
  const [lat, setLat] = useState<HTMLCanvasElement | null>(null), [pla, setPla] = useState<HTMLCanvasElement | null>(null);
  const [mLat, setMLat] = useState<Mascara | null>(null), [mPla, setMPla] = useState<Mascara | null>(null);
  const [marcas, setMarcas] = useState<number[]>([]);
  const [aviso, setAviso] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const [generada, setGenerada] = useState<Referencia | null>(null);
  const vistaLat = useRef<HTMLCanvasElement>(null), vistaPla = useRef<HTMLCanvasElement>(null);

  useEffect(() => { if (lat) setMLat(recortar(lat, tol)); if (pla) setMPla(recortar(pla, tol)); }, [lat, pla, tol]);
  useEffect(() => { if (lat && mLat && vistaLat.current) pintarMascara(lat, mLat, vistaLat.current, marcas); }, [lat, mLat, marcas]);
  useEffect(() => { if (pla && mPla && vistaPla.current) pintarMascara(pla, mPla, vistaPla.current); }, [pla, mPla]);

  const leer = async (f: File | undefined, cual: 'lat' | 'pla') => {
    if (!f) return;
    try { const c = await cargarImagen(f); if (cual === 'lat') { setLat(c); setMarcas([]); } else setPla(c); setAviso(null); }
    catch (e: any) { setAviso(e.message); }
  };
  const marcar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget, r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) * (c.width / r.width);
    const necesarios = dist === '1-2-1' ? 3 : 2;
    setMarcas(m => (m.length >= necesarios ? [x] : [...m, x]));
  };
  const generar = () => {
    if (!lat || !mLat) { setAviso('Sube primero la foto de perfil.'); return null; }
    const necesarios = dist === '1-2-1' ? 3 : 2;
    if (marcas.length < necesarios) { setAviso(`Pincha en la foto de perfil el centro de ${necesarios === 3 ? 'los tres ejes' : 'los dos ejes'} (rueda delantera y trasera${necesarios === 3 ? ', y el eje lateral' : ''}).`); return null; }
    const ejes = ejesDesdeMarcas(mLat, marcas, L, morroIzq);
    const pxEje = morroIzq ? Math.min(...marcas) : Math.max(...marcas);   // el eje más cercano al morro
    const { perfil, H } = perfilDesdeFotos({ lateral: mLat, planta: mPla, L, W, clear, morroIzq, ejeDelanteroPx: pxEje });
    const d = DIAMETRO_RUEDA[rueda], t = via / 2;
    const xs = [...ejes].sort((a, b) => b - a);
    const ruedas: RuedaRef[] =
      dist === '1-2' ? [{ x: xs[0], z: 0, d }, { x: xs[1], z: t, d }, { x: xs[1], z: -t, d }]
      : dist === '2-1' ? [{ x: xs[0], z: t, d }, { x: xs[0], z: -t, d }, { x: xs[1], z: 0, d }]
      : dist === '2-2' ? [{ x: xs[0], z: t, d }, { x: xs[0], z: -t, d }, { x: xs[1], z: t, d }, { x: xs[1], z: -t, d }]
      : dist === '1-2-1' ? [{ x: xs[0], z: 0, d }, { x: xs[1], z: t, d }, { x: xs[1], z: -t, d }, { x: xs[2], z: 0, d }]
      : [{ x: xs[0], z: 0, d }, { x: xs[1], z: 0, d }];
    const r: Referencia = {
      id: 'nuevo', nombre: nombre.trim() || 'Velomóvil desde fotos', origen: 'fotos',
      fuente: `Silueta recortada de ${mPla ? 'dos fotos (perfil y planta)' : 'una foto de perfil'}; largo ${fmt(L)} m y ancho ${fmt(W)} m indicados a mano.`,
      L, W, H: Math.round(H * 1000) / 1000, clear, batalla: Math.abs(xs[0] - xs[xs.length - 1]), plazas: 1, cabina: 'cerrada',
      ruedas, perfil,
    };
    if (!referenciaValida(r)) { setAviso('La silueta no ha salido bien: prueba otra tolerancia o una foto con el fondo más liso.'); return null; }
    setGenerada(r); setAviso(null); return r;
  };
  const guardar = async () => {
    const r = generada || generar(); if (!r) return;
    setOcupado(true);
    try {
      let autor = ''; try { autor = localStorage.getItem('aeromovil.autor') || ''; } catch { /* nada */ }
      const { id: _i, ...datos } = r;
      const res = await fetch('/api/aeromovil/referencias', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: r.nombre, datos, autor }) });
      const j = await res.json(); if (!res.ok) throw new Error(j?.error || 'No se ha podido guardar.');
      if (j.referencia) { try { localStorage.setItem(CLAVES, JSON.stringify({ ...leerClaves(), [j.referencia.id]: j.clave })); } catch { /* nada */ } }
      setAviso('Guardado en «Otros velomóviles».'); alGuardado();
    } catch (e: any) { setAviso(e.message); } finally { setOcupado(false); }
  };

  const num = (id: string, etiqueta: string, v: number, f: (n: number) => void, min: number, max: number, paso: number, u: string) => (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm text-slate-700">{etiqueta}
      <span className="flex items-center gap-1.5"><input id={id} type="number" value={v} min={min} max={max} step={paso} onChange={e => f(Number(e.target.value))}
        className="w-24 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm" /><span className="text-xs text-slate-500">{u}</span></span>
    </label>
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Camera className="h-4 w-4" />Crear un modelo 3D desde fotos</h3>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-slate-600">
        <li>Sube una foto de perfil, lo más lateral posible y con el fondo liso (y, si la tienes, otra desde arriba).</li>
        <li>Ajusta la tolerancia hasta que la mancha turquesa cubra el vehículo y nada más.</li>
        <li>Pincha en la foto de perfil el centro de cada eje, de delante a atrás.</li>
        <li>Escribe el largo y el ancho reales y pulsa «Generar».</li>
      </ol>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label htmlFor="am-foto-lat" className="flex flex-col gap-1 text-sm font-medium text-slate-700">Foto de perfil
          <input id="am-foto-lat" type="file" accept="image/*" onChange={e => leer(e.target.files?.[0], 'lat')} className="text-sm" /></label>
        <label htmlFor="am-foto-pla" className="flex flex-col gap-1 text-sm font-medium text-slate-700">Foto desde arriba (opcional)
          <input id="am-foto-pla" type="file" accept="image/*" onChange={e => leer(e.target.files?.[0], 'pla')} className="text-sm" /></label>
      </div>
      {(lat || pla) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-w-0">{lat && <canvas ref={vistaLat} onClick={marcar} className="w-full cursor-crosshair rounded-lg border border-slate-200" aria-label="Foto de perfil: pincha en los ejes" />}
            {lat && <p className="mt-1 text-xs text-slate-500">{marcas.length ? `${marcas.length} eje(s) marcado(s). Pinchar otra vez cuando estén todos vuelve a empezar.` : 'Pincha en el centro de cada eje.'}</p>}</div>
          <div className="min-w-0">{pla && <canvas ref={vistaPla} className="w-full rounded-lg border border-slate-200" aria-label="Foto desde arriba" />}</div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label htmlFor="am-ref-nombre" className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-slate-700">Nombre
          <input id="am-ref-nombre" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} placeholder="Por ejemplo: Milan SL" className="rounded-md border border-slate-300 px-2 py-1 text-sm" /></label>
        {num('am-ref-L', 'Largo real', L, setL, 0.5, 12, 0.01, 'm')}
        {num('am-ref-W', 'Ancho real', W, setW, 0.2, 4, 0.01, 'm')}
        {num('am-ref-c', 'Altura libre', clear, setClear, 0, 0.5, 0.01, 'm')}
        {num('am-ref-v', 'Vía', via, setVia, 0.2, 2, 0.01, 'm')}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label htmlFor="am-ref-tol" className="flex w-56 flex-col gap-1 text-sm text-slate-700">Tolerancia del recorte: {tol}
          <input id="am-ref-tol" type="range" min={15} max={160} value={tol} onChange={e => setTol(Number(e.target.value))} className="accent-teal-700" /></label>
        <label htmlFor="am-ref-dist" className="flex flex-col gap-1 text-sm text-slate-700">Ruedas
          <select id="am-ref-dist" value={dist} onChange={e => { setDist(e.target.value as Distribucion); setMarcas([]); }} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            {DISTRIBUCIONES.map(o => <option key={o.k} value={o.k}>{o.n}</option>)}</select></label>
        <label htmlFor="am-ref-r" className="flex flex-col gap-1 text-sm text-slate-700">Tamaño de rueda
          <select id="am-ref-r" value={rueda} onChange={e => setRueda(e.target.value as Pulgadas)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            {(Object.keys(DIAMETRO_RUEDA) as Pulgadas[]).map(k => <option key={k} value={k}>{k}″</option>)}</select></label>
        <label htmlFor="am-ref-morro" className="flex items-center gap-2 text-sm text-slate-700">
          <input id="am-ref-morro" type="checkbox" checked={morroIzq} onChange={e => setMorroIzq(e.target.checked)} className="accent-teal-700" />El morro está a la izquierda de la foto</label>
      </div>
      {aviso && <p className="mt-2 text-sm text-amber-800">{aviso}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { const r = generar(); if (r) alVer(r); }} className="text-xs normal-case tracking-normal"><Wand2 className="mr-1.5 h-4 w-4" />Generar y ver en 3D</Button>
        <Button disabled={ocupado} onClick={guardar} className="bg-teal-700 text-xs normal-case tracking-normal hover:bg-teal-800">
          {ocupado ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}Guardar en el catálogo
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">La foto no sale de tu dispositivo: se guarda solo la silueta recortada. El modelo es una aproximación de forma y tamaño, no un plano.</p>
    </section>
  );
}

export function VistaOtros({ modelo, resultados, alVer, alComparar, puedeDecidir }: {
  modelo: Modelo; resultados: Resultados; alVer: (r: Referencia) => void; alComparar: (r: Referencia) => void; puedeDecidir: boolean;
}) {
  const [propias, setPropias] = useState<Referencia[] | null>(null);
  const [sel, setSel] = useState<Referencia>(CATALOGO[0]);
  const [aviso, setAviso] = useState<string | null>(null);
  const cargar = () => fetch('/api/aeromovil/referencias', { credentials: 'include' }).then(r => (r.ok ? r.json() : [])).then((filas: any[]) => {
    setPropias(filas.map(f => ({ ...f.datos, id: `db-${f.id}`, nombre: f.nombre, origen: 'fotos' as const, fuente: `${f.datos?.fuente || 'Desde fotos'}${f.autor ? ` · ${f.autor}` : ''}` })).filter(referenciaValida));
  }).catch(() => setPropias([]));
  useEffect(() => { cargar(); }, []);
  const quitar = async (r: Referencia) => {
    const id = r.id.replace('db-', '');
    const res = await fetch(`/api/aeromovil/referencias/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: leerClaves()[id] }) });
    const j = await res.json().catch(() => null);
    setAviso(res.ok ? `«${r.nombre}» quitado.` : (j?.error || 'No se ha podido quitar.'));
    if (res.ok) cargar();
  };
  const todas = [...CATALOGO, ...(propias || [])];
  const claves = leerClaves();
  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Otros velomóviles</h2>
        <p className="max-w-3xl text-sm text-slate-600">Modelos de referencia para comparar tamaño, forma y huella con el Aeromóvil Gota. «Comparar» los pone en el visor junto al nuestro, como un fantasma transparente.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {todas.map(r => {
          const f = fichaComparable(r), mio = r.origen === 'fotos' && (puedeDecidir || !!claves[r.id.replace('db-', '')]);
          return (
            <article key={r.id} className={cn('flex flex-col gap-2 rounded-xl border bg-white p-4', sel.id === r.id ? 'border-teal-600 ring-1 ring-teal-600' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{r.nombre}</h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{r.origen === 'catalogo' ? 'catálogo' : 'desde fotos'}</span>
              </div>
              <p className="font-mono text-xs tabular-nums text-slate-700">{fmt(f.L)} × {fmt(f.W)} × {fmt(f.H)} m · {f.ruedas} ruedas · {f.plazas} plaza{f.plazas > 1 ? 's' : ''}{f.masa ? ` · ${f.masa} kg` : ''}</p>
              <p className="text-xs text-slate-500">{r.fuente}</p>
              {r.notas && <p className="text-xs text-slate-600">{r.notas}</p>}
              {r.enlaces && <ul className="flex flex-wrap gap-x-3 text-xs">{r.enlaces.map(e => <li key={e.url}><a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700 underline">{e.t}<ExternalLink className="h-3 w-3" /></a></li>)}</ul>}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <Button variant="outline" onClick={() => { setSel(r); alVer(r); }} className="px-2.5 py-1.5 text-xs normal-case tracking-normal"><Eye className="mr-1 h-3.5 w-3.5" />Ver en 3D</Button>
                <Button onClick={() => { setSel(r); alComparar(r); }} className="bg-teal-700 px-2.5 py-1.5 text-xs normal-case tracking-normal hover:bg-teal-800"><GitCompare className="mr-1 h-3.5 w-3.5" />Comparar</Button>
                <Button variant="ghost" onClick={() => setSel(r)} className="px-2.5 py-1.5 text-xs normal-case tracking-normal">Tabla</Button>
                {mio && <Button variant="ghost" aria-label={`Quitar ${r.nombre}`} onClick={() => quitar(r)} className="px-2 py-1.5 text-slate-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            </article>
          );
        })}
      </div>
      {aviso && <p className="text-sm text-slate-600">{aviso}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold text-slate-900">{nombreDe(modelo)} frente a {sel.nombre}</h3>
        <TablaComparacion propia={fichaPropia(modelo, resultados)} otra={fichaComparable(sel)} nombre={sel.nombre} nuestro={nombreDe(modelo)} />
        {(() => { const n = fichaPropia(modelo, resultados).plazas; return (
          <p className="mt-2 text-xs text-slate-500">Este diseño lleva {n === 1 ? 'una plaza' : n === 2 ? 'dos plazas' : 'tres plazas'}; {sel.plazas === 1 ? 'el de referencia, una' : `el de referencia, ${sel.plazas}`}. Compara la huella por plaza: {fmt(modelo.Lf * modelo.P.W / n)} m² frente a {fmt(fichaComparable(sel).huella / sel.plazas)} m².{modelo.tipo === 'bala' ? ' Del Bala no hay masa estimada ni Cd de la fórmula del editor (no vale para su forma): esas filas quedan en blanco.' : ''}</p>); })()}
      </section>
      <CrearDesdeFotos alVer={alVer} alGuardado={cargar} />
    </div>
  );
}
