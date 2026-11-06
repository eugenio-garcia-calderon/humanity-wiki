// ============================================================================
// AEROMÓVIL GOTA · las vistas del menú superior (2026-11-05)
// ============================================================================
// Tareas (comentarios de mejora), Plan de desarrollo, Planos de fabricación y
// Exportar a CAD. El diseño 3D vive en la página (`src/pages/Aeromovil.tsx`).
import { useEffect, useMemo, useState } from 'react';
import { Check, CircleDashed, Download, FileCode2, FileText, Loader2, MessageSquarePlus, RotateCcw, Ruler, Timer, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { PLAN, OBJETIVO_PRESUPUESTO, type EstadoEtapa } from '../../data/aeromovilPlan';
import { parametrosCAD, type Modelo, type Resultados } from './geometria';
import { jsonCAD } from './cad';
import { laminas, dxfCuadernas, dxfPerfiles, dxfChasis, csvCorte, estaciones } from './planos';
import { CAPAS, type CapaId, type VisorHandle } from './Visor3D';

export function descargar(nombre: string, contenido: Blob | string, tipo = 'text/plain') {
  const blob = typeof contenido === 'string' ? new Blob([contenido], { type: `${tipo};charset=utf-8` }) : contenido;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const fmt = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const hoy = () => new Date().toLocaleDateString('es-ES');

// ── TAREAS ────────────────────────────────────────────────────────────────
export interface Tarea {
  id: number; area: string; texto: string; autor: string | null; origen: 'comentario' | 'equipo';
  estado: 'pendiente' | 'en_curso' | 'hecha' | 'descartada'; respuesta: string | null; created_at: string; resuelta_at: string | null;
}
export const AREAS: { k: string; n: string }[] = [
  { k: 'general', n: 'General' }, { k: 'carenado', n: 'Carenado' }, { k: 'chasis', n: 'Chasis' }, { k: 'suspension', n: 'Suspensión' },
  { k: 'ruedas', n: 'Ruedas' }, { k: 'asientos', n: 'Asientos' }, { k: 'motor', n: 'Motor' }, { k: 'baterias', n: 'Baterías' }, { k: 'planos', n: 'Planos' },
];
const ESTADO_TXT: Record<Tarea['estado'], string> = { pendiente: 'Pendiente', en_curso: 'En curso', hecha: 'Hecha', descartada: 'Descartada' };
const ESTADO_CLS: Record<Tarea['estado'], string> = {
  pendiente: 'border-amber-300 bg-amber-50 text-amber-800', en_curso: 'border-sky-300 bg-sky-50 text-sky-800',
  hecha: 'border-emerald-300 bg-emerald-50 text-emerald-800', descartada: 'border-slate-200 bg-slate-50 text-slate-500',
};

export async function cargarTareas(): Promise<Tarea[]> {
  const r = await fetch('/api/aeromovil/tareas', { credentials: 'include' });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se han podido cargar las tareas.');
  return r.json();
}

/** Formulario de comentario de mejora: lo usan la vista Tareas y el botón flotante. */
export function FormularioMejora({ areaInicial = 'general', alEnviar }: { areaInicial?: string; alEnviar: (t: Tarea) => void }) {
  const [texto, setTexto] = useState('');
  const [area, setArea] = useState(areaInicial);
  const [autor, setAutor] = useState(() => { try { return localStorage.getItem('aeromovil.autor') || ''; } catch { return ''; } });
  const [web, setWeb] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) { setError('Escribe el comentario antes de enviarlo.'); return; }
    setEnviando(true); setError(null);
    try {
      const r = await fetch('/api/aeromovil/tareas', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, area, autor, web }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido guardar.');
      try { localStorage.setItem('aeromovil.autor', autor); } catch { /* sin almacenamiento */ }
      setTexto(''); alEnviar(j);
    } catch (e: any) { setError(e.message); } finally { setEnviando(false); }
  };
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700" htmlFor="am-texto">
        Comentario de mejora
        <textarea id="am-texto" value={texto} onChange={e => setTexto(e.target.value)} rows={4} maxLength={4000}
          placeholder="Por ejemplo: el morro podría ser 10 cm más largo para que la rueda delantera gire sin rozar."
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20" />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700" htmlFor="am-area">
          Parte
          <select id="am-area" value={area} onChange={e => setArea(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal">
            {AREAS.map(a => <option key={a.k} value={a.k}>{a.n}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium text-slate-700" htmlFor="am-autor">
          Tu nombre (opcional)
          <input id="am-autor" value={autor} onChange={e => setAutor(e.target.value)} maxLength={80}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal" />
        </label>
      </div>
      {/* Campo trampa para robots: las personas no lo ven */}
      <input tabIndex={-1} autoComplete="off" aria-hidden value={web} onChange={e => setWeb(e.target.value)} name="web" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={enviando} className="self-start normal-case tracking-normal text-sm bg-teal-700 hover:bg-teal-800">
        {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />}
        Añadir a las tareas
      </Button>
    </form>
  );
}

export interface Dueno { nombre: string | null; puedeDecidir: boolean; sesion: boolean }

export async function cargarDueno(): Promise<Dueno> {
  const r = await fetch('/api/aeromovil/dueno', { credentials: 'include' });
  if (!r.ok) return { nombre: null, puedeDecidir: false, sesion: false };
  return r.json();
}

export function VistaTareas({ tareas, recargar, error, dueno }: { tareas: Tarea[] | null; recargar: () => void; error: string | null; dueno: Dueno | null }) {
  const [filtro, setFiltro] = useState<'abiertas' | 'todas'>('abiertas');
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useMemo(() => (tareas || []).filter(t => filtro === 'todas' || t.estado === 'pendiente' || t.estado === 'en_curso'), [tareas, filtro]);
  const cambiar = async (t: Tarea, estado: Tarea['estado']) => {
    setCambiando(t.id); setAviso(null);
    try {
      const r = await fetch(`/api/aeromovil/tareas/${t.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se ha podido cambiar.');
      recargar();
    } catch (e: any) { setAviso(e.message); } finally { setCambiando(null); }
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Tareas pendientes para mejorar el diseño</h2>
            <p className="text-sm text-slate-600">Cada comentario de mejora entra aquí como tarea. La IA las lee desde <a className="text-teal-700 underline" href="/api/aeromovil/tareas.txt" target="_blank" rel="noreferrer">la lista en texto</a>.</p>
            <p className="text-sm text-slate-600">{dueno?.puedeDecidir
              ? 'Eres el dueño del Aeromóvil: tú marcas las tareas como en curso, hechas o descartadas.'
              : `Cualquiera puede comentar; las marca como hechas o descartadas ${dueno?.nombre || 'el dueño del Aeromóvil'}${dueno?.sesion ? '' : ' (con su cuenta iniciada)'}.`}</p>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Filtro">
            {(['abiertas', 'todas'] as const).map(f => (
              <Button key={f} variant="ghost" aria-pressed={filtro === f} onClick={() => setFiltro(f)}
                className={cn('px-3 py-1.5 text-xs normal-case tracking-normal', filtro === f && 'bg-slate-900 text-white hover:bg-slate-800')}>
                {f === 'abiertas' ? 'Abiertas' : 'Todas'}
              </Button>
            ))}
          </div>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {aviso && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{aviso}</p>}
        {!tareas && !error && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando tareas…</p>}
        {tareas && lista.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay tareas abiertas. Escribe la primera mejora en el formulario.</p>}
        <ul className="flex flex-col gap-2">
          {lista.map(t => (
            <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={cn('rounded-full border px-2 py-0.5 font-semibold', ESTADO_CLS[t.estado])}>{ESTADO_TXT[t.estado]}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{AREAS.find(a => a.k === t.area)?.n ?? t.area}</span>
                <span className="text-slate-500">#{t.id} · {t.origen === 'equipo' ? 'del equipo' : (t.autor || 'anónimo')} · {new Date(t.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{t.texto}</p>
              {t.respuesta && <p className="mt-1 text-sm text-slate-600">↳ {t.respuesta}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!dueno?.puedeDecidir ? null : cambiando === t.id ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (t.estado === 'pendiente' || t.estado === 'en_curso') ? (<>
                  {t.estado === 'pendiente' && <Button variant="outline" onClick={() => cambiar(t, 'en_curso')} className="px-2.5 py-1 text-xs normal-case tracking-normal"><Timer className="mr-1 h-3.5 w-3.5" />En curso</Button>}
                  <Button variant="outline" onClick={() => cambiar(t, 'hecha')} className="px-2.5 py-1 text-xs normal-case tracking-normal"><Check className="mr-1 h-3.5 w-3.5" />Hecha</Button>
                  <Button variant="ghost" onClick={() => cambiar(t, 'descartada')} className="px-2.5 py-1 text-xs normal-case tracking-normal"><X className="mr-1 h-3.5 w-3.5" />Descartar</Button>
                </>) : (
                  <Button variant="ghost" onClick={() => cambiar(t, 'pendiente')} className="px-2.5 py-1 text-xs normal-case tracking-normal"><RotateCcw className="mr-1 h-3.5 w-3.5" />Reabrir</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20">
        <h3 className="mb-3 font-semibold text-slate-900">Nuevo comentario de mejora</h3>
        <FormularioMejora alEnviar={() => recargar()} />
        <p className="mt-3 text-xs text-slate-500">No hace falta cuenta. Se guarda el texto, la parte y el nombre que pongas; nada más.</p>
      </aside>
    </div>
  );
}

// ── PLAN ──────────────────────────────────────────────────────────────────
const ETAPA_CLS: Record<EstadoEtapa, string> = {
  hecha: 'bg-emerald-600 text-white', en_curso: 'bg-teal-700 text-white', pendiente: 'bg-white text-slate-500 ring-1 ring-slate-300',
};
const ETAPA_TXT: Record<EstadoEtapa, string> = { hecha: 'Hecha', en_curso: 'En curso', pendiente: 'Pendiente' };

export function VistaPlan() {
  const total: [number, number] = PLAN.reduce((a, e) => [a[0] + e.presupuesto[0], a[1] + e.presupuesto[1]], [0, 0]);
  const fin = Math.max(...PLAN.map(e => e.semanas[1]));
  const chasisAero = PLAN.filter(e => [2, 3, 5].includes(e.n)).reduce((a, e) => [a[0] + e.presupuesto[0], a[1] + e.presupuesto[1]], [0, 0]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h2 className="text-xl font-semibold text-slate-900">Plan de desarrollo</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        De la idea a la homologación en {PLAN.length} etapas y unas {fin} semanas. Presupuesto estimado {fmt(total[0])}–{fmt(total[1])} €; chasis, mecanismo y carenado {fmt(chasisAero[0])}–{fmt(chasisAero[1])} € frente al objetivo de {fmt(OBJETIVO_PRESUPUESTO)} €.
      </p>
      {/* Cronograma */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-[640px]">
          <div className="mb-2 grid grid-cols-[180px_minmax(0,1fr)] text-xs text-slate-500">
            <span />
            <div className="relative h-4">{Array.from({ length: Math.ceil(fin / 4) + 1 }, (_, i) => i * 4).map(s => (
              <span key={s} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(s / fin) * 100}%` }}>s{s}</span>
            ))}</div>
          </div>
          {PLAN.map(e => (
            <div key={e.n} className="grid grid-cols-[180px_minmax(0,1fr)] items-center py-1 text-sm">
              <span className="truncate pr-2 text-slate-800">{e.n}. {e.nombre}</span>
              <div className="relative h-5 rounded bg-slate-100">
                <div className={cn('absolute inset-y-0 rounded', e.estado === 'en_curso' ? 'bg-teal-600' : e.estado === 'hecha' ? 'bg-emerald-500' : 'bg-slate-400/70')}
                  style={{ left: `${((e.semanas[0] - 1) / fin) * 100}%`, width: `${((e.semanas[1] - e.semanas[0] + 1) / fin) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <ol className="mt-6 grid gap-3 md:grid-cols-2">
        {PLAN.map(e => (
          <li key={e.n} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900"><span className="mr-1.5 tabular-nums text-slate-400">{e.n}</span>{e.nombre}</h3>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', ETAPA_CLS[e.estado])}>{ETAPA_TXT[e.estado]}</span>
            </div>
            <p className="text-sm text-slate-700">{e.objetivo}</p>
            <ul className="list-disc pl-5 text-sm text-slate-600">{e.entregables.map(x => <li key={x}>{x}</li>)}</ul>
            <p className="mt-auto pt-1 text-xs tabular-nums text-slate-500">
              Semanas {e.semanas[0]}–{e.semanas[1]} · {e.presupuesto[1] ? `${fmt(e.presupuesto[0])}–${fmt(e.presupuesto[1])} €` : 'sin coste de material'}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500">Presupuestos orientativos con piezas de bicicleta y trabajo propio, sin mano de obra. Se afinan al cerrar cada etapa.</p>
    </div>
  );
}

// ── PLANOS ────────────────────────────────────────────────────────────────
export function VistaPlanos({ modelo }: { modelo: Modelo }) {
  const [paso, setPaso] = useState(0.25);
  const lams = useMemo(() => laminas(modelo, paso, hoy()), [modelo, paso]);
  const [sel, setSel] = useState(0);
  const lam = lams[Math.min(sel, lams.length - 1)];
  const nC = estaciones(modelo, paso).length;
  const base = modelo.tipo === 'a1' ? 'aeromovil-1' : 'aeromovil-gota';
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Planos de fabricación</h2>
          <p className="max-w-3xl text-sm text-slate-600">Salen del diseño actual: si cambias una medida en «Diseño 3D», los planos cambian con ella. Láminas A3 para ver e imprimir, y DXF a tamaño real para cortar.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="am-paso">
          Cuadernas cada
          <select id="am-paso" value={paso} onChange={e => setPaso(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
            {[0.15, 0.2, 0.25, 0.3, 0.4].map(v => <option key={v} value={v}>{v * 1000} mm</option>)}
          </select>
          <span className="tabular-nums text-slate-500">({nC})</span>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Láminas">
        {lams.map((l, i) => (
          <Button key={l.id} role="tab" aria-selected={i === sel} variant="outline" onClick={() => setSel(i)}
            className={cn('px-3 py-1.5 text-xs normal-case tracking-normal', i === sel && 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800')}>
            {i + 1}. {l.titulo}
          </Button>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="min-w-[760px]" dangerouslySetInnerHTML={{ __html: lam.svg.replace('width="420mm" height="297mm"', 'width="100%"') }} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Ruler className="h-4 w-4" />Carenado</h3>
          <p className="mt-1 text-sm text-slate-600">Para el molde macho: corta cada cuaderna en contrachapado o espuma, móntalas sobre una viga a su distancia del morro, rellena y lija. El DXF es la superficie exterior.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" className="text-xs normal-case tracking-normal" onClick={() => descargar(`${base}-cuadernas-1a1.dxf`, dxfCuadernas(modelo, paso), 'application/dxf')}><Download className="mr-1.5 h-4 w-4" />Cuadernas DXF 1:1</Button>
            <Button variant="outline" className="text-xs normal-case tracking-normal" onClick={() => descargar(`${base}-perfiles-1a1.dxf`, dxfPerfiles(modelo, paso), 'application/dxf')}><Download className="mr-1.5 h-4 w-4" />Perfiles DXF 1:1</Button>
            {lams.slice(0, 2).map(l => <Button key={l.id} variant="ghost" className="text-xs normal-case tracking-normal" onClick={() => descargar(`${base}-${l.id}.svg`, l.svg, 'image/svg+xml')}><FileText className="mr-1.5 h-4 w-4" />{l.titulo} SVG</Button>)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Ruler className="h-4 w-4" />Chasis</h3>
          <p className="mt-1 text-sm text-slate-600">El alzado 1:1 sirve de plantilla de soldadura: imprímelo por partes o córtalo en tablero. La lista de corte trae largos, secciones y masa de cada tubo.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" className="text-xs normal-case tracking-normal" onClick={() => descargar(`${base}-chasis-1a1.dxf`, dxfChasis(modelo), 'application/dxf')}><Download className="mr-1.5 h-4 w-4" />Chasis DXF 1:1</Button>
            <Button variant="outline" className="text-xs normal-case tracking-normal" onClick={() => descargar(`${base}-lista-de-corte.csv`, csvCorte(modelo), 'text/csv')}><Download className="mr-1.5 h-4 w-4" />Lista de corte CSV</Button>
            {lams.slice(2).map(l => <Button key={l.id} variant="ghost" className="text-xs normal-case tracking-normal" onClick={() => descargar(`${base}-${l.id}.svg`, l.svg, 'image/svg+xml')}><FileText className="mr-1.5 h-4 w-4" />{l.titulo} SVG</Button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EXPORTAR A CAD ────────────────────────────────────────────────────────
export function VistaExportar({ modelo, visor, porDefecto, resultados }: { modelo: Modelo; visor: React.RefObject<VisorHandle | null>; porDefecto: boolean; resultados: Resultados }) {
  const [capas, setCapas] = useState<Record<CapaId, boolean>>(() => Object.fromEntries(CAPAS.map(c => [c.k, c.k !== 'ocupantes'])) as Record<CapaId, boolean>);
  const [aviso, setAviso] = useState<string | null>(null);
  const esA1 = modelo.tipo === 'a1';
  const json = esA1 ? '' : JSON.stringify(parametrosCAD(modelo.P), null, 1);
  const capasVisor = CAPAS.filter(c => !('solo' in c) || c.solo === modelo.tipo);
  const stl = () => {
    const elegidas = capasVisor.filter(c => capas[c.k]).map(c => c.k);
    if (!elegidas.length) { setAviso('Marca al menos una capa.'); return; }
    if (!visor.current) { setAviso('Abre «Diseño 3D» una vez para preparar el modelo y vuelve aquí.'); return; }
    setAviso(null);
    descargar(`${esA1 ? 'aeromovil-1' : 'aeromovil-gota'}-${elegidas.join('-')}.stl`, visor.current.exportarSTL(elegidas));
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold text-slate-900">Exportar a CAD</h2>
        <p className="max-w-3xl text-sm text-slate-600">{esA1
          ? 'El STEP abre en FreeCAD, Fusion 360, SolidWorks u Onshape con doce capas (Carrocería, Cristales, Paneles solares, Chasis, Suspensión, Dirección, Transmisión, Ruedas, Motor, Baterías, Asientos y Ocupantes) que se ocultan una a una desde el árbol. Las puertas y las tapas de los maleteros son piezas aparte, cerradas; se abren en el visor.'
          : 'El STEP abre en FreeCAD, Fusion 360, SolidWorks u Onshape con diez capas (Carenado, Cristales, Paneles solares, Chasis, Suspensión, Ruedas, Asientos, Ocupantes, Motor y Baterías) que se ocultan una a una desde el árbol. Las puertas se eligen y se abren en el visor; en el STEP la piel va cerrada.'}</p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900"><FileCode2 className="h-4 w-4" />STEP por capas</h3>
        <p className="mt-1 text-sm text-slate-600">Modelo sólido de la versión publicada (medidas por defecto). {porDefecto ? 'Coincide con lo que ves ahora.' : esA1 ? 'Has cambiado medidas: para un STEP con las tuyas, descarga la geometría y el script de abajo.' : 'Has cambiado medidas: para un STEP con las tuyas, descarga los parámetros y el script de abajo.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {esA1 ? <>
            <a href="/aeromovil/Aeromovil_1_STEP.zip" download className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"><Download className="mr-1.5 h-4 w-4" />STEP (3,8 MB)</a>
            <a href="/aeromovil/Aeromovil_1_STL_por_capas.zip" download className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="mr-1.5 h-4 w-4" />STL por capas (3,5 MB)</a>
          </> : <>
            <a href="/aeromovil/Aeromovil_Gota_tandem_STEP.zip" download className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"><Download className="mr-1.5 h-4 w-4" />STEP (2,4 MB)</a>
            <a href="/aeromovil/Aeromovil_Gota_STL_por_capas.zip" download className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="mr-1.5 h-4 w-4" />STL por capas (2,2 MB)</a>
          </>}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900"><FileCode2 className="h-4 w-4" />STL de tu configuración</h3>
        <p className="mt-1 text-sm text-slate-600">Malla de lo que ves en el visor, en mm y con Z arriba, para imprimir en 3D o importar como referencia.</p>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {capasVisor.map(c => (
            <label key={c.k} className="flex items-center gap-2 text-sm text-slate-700" htmlFor={`am-stl-${c.k}`}>
              <input id={`am-stl-${c.k}`} type="checkbox" checked={capas[c.k]} onChange={e => setCapas(s => ({ ...s, [c.k]: e.target.checked }))} className="accent-teal-700" />
              <span className={cn('h-2.5 w-2.5 rounded-sm', c.color)} />{c.n}
            </label>
          ))}
        </div>
        {aviso && <p className="mt-2 text-sm text-amber-800">{aviso}</p>}
        <Button className="mt-3 text-xs normal-case tracking-normal bg-teal-700 hover:bg-teal-800" onClick={stl}><Download className="mr-1.5 h-4 w-4" />Descargar STL</Button>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900"><FileCode2 className="h-4 w-4" />Regenerar el STEP con tus medidas</h3>
        {esA1 ? (
          <>
            <p className="mt-1 text-sm text-slate-600">El Aeromóvil 1 no se vuelve a dibujar en el script: el visor exporta la geometría que ves (piel, tubos, ruedas, cajas, asientos) y el script la convierte en STEP tal cual. Lo que ves es lo que sale.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Descarga la geometría y el script.</li>
              <li>Instala CadQuery: <code className="rounded bg-slate-100 px-1">pip install cadquery</code></li>
              <li>Ejecuta <code className="rounded bg-slate-100 px-1">python aeromovil_1_cad.py aeromovil-1-geometria.json</code> y abre el STEP que crea (tarda un par de minutos).</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" className="text-xs normal-case tracking-normal" onClick={() => descargar('aeromovil-1-geometria.json', jsonCAD(modelo), 'application/json')}><Download className="mr-1.5 h-4 w-4" />Geometría de este diseño (JSON)</Button>
              <a href="/aeromovil/aeromovil_1_cad.py" download className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="mr-1.5 h-4 w-4" />Script CadQuery</a>
            </div>
          </>
        ) : (
          <>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Descarga los parámetros y el script.</li>
              <li>Instala CadQuery: <code className="rounded bg-slate-100 px-1">pip install cadquery</code></li>
              <li>Ejecuta <code className="rounded bg-slate-100 px-1">python aeromovil_cad.py aeromovil-params.json</code> y abre el STEP que crea.</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" className="text-xs normal-case tracking-normal" onClick={() => descargar('aeromovil-params.json', json, 'application/json')}><Download className="mr-1.5 h-4 w-4" />Parámetros (JSON)</Button>
              <a href="/aeromovil/aeromovil_cad.py" download className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="mr-1.5 h-4 w-4" />Script CadQuery</a>
            </div>
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{json}</pre>
          </>
        )}
        <p className="mt-2 text-xs text-slate-500">Medidas actuales: largo {fmt(modelo.Lf, 2)} m · ancho {fmt(modelo.P.W, 2)} m · alto {fmt(modelo.P.H, 2)} m · masa estimada {fmt(resultados.mVeh)} kg.</p>
      </section>
    </div>
  );
}

export function IconoEstado({ ok }: { ok: boolean }) {
  return ok ? <Check className="h-4 w-4 text-emerald-600" /> : <CircleDashed className="h-4 w-4 text-amber-600" />;
}
