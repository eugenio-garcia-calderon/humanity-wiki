// Los dos paneles laterales del calendario: la carpeta de referencias de cada
// mes y el buzón de ideas. Ninguno de los dos se imprime nunca.
import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2, Trash2, ImageIcon, Check, Ban, RotateCcw, Copy, Send, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { subirArchivo } from '../../utils/subir';
import type { ContenidoMes, Referencia } from '../../data/calendarioArteTipos';
import type { DatoClave, IniciativaCandidata } from '../../data/calendarioArteInvestigacion';
import { NOMBRES_MES } from './HojaMes';
import type { Principio, Evaluacion } from '../../data/calendarioArtePrincipios';

export function PanelLateral({ titulo, alCerrar, children }: { titulo: string; alCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="ca-no-imprimir fixed inset-0 z-50 flex justify-end bg-black/30" onClick={alCerrar}>
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
          <Button variant="ghost" className="px-2" onClick={alCerrar} aria-label="Cerrar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

// ── CARPETA DE REFERENCIAS ────────────────────────────────────────────────

export function PanelCarpeta({ mes, referencias, puedeEditar, alGuardar, alUsarComoIlustracion, alCerrar }: {
  mes: number;
  referencias: Referencia[];
  puedeEditar: boolean;
  alGuardar: (r: Referencia[]) => Promise<boolean>;
  alUsarComoIlustracion: (url: string) => void;
  alCerrar: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grande, setGrande] = useState<string | null>(null);

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setError(null);
    const nuevas: Referencia[] = [];
    let i = 0;
    for (const f of Array.from(archivos)) {
      i++;
      setSubiendo(`Subiendo ${i} de ${archivos.length}…`);
      const r = await subirArchivo(f);
      if (r.error) { setError(`${f.name}: ${r.error}`); continue; }
      nuevas.push({ url: r.url! });
    }
    setSubiendo(null);
    if (nuevas.length) await alGuardar([...referencias, ...nuevas]);
  };

  return (
    <PanelLateral titulo={mes === 0 ? 'Carpeta de estilo (todo el año)' : `Carpeta de referencias · ${NOMBRES_MES[mes - 1]}`} alCerrar={alCerrar}>
      <p className="mb-3 text-sm text-slate-500">
        {mes === 0
          ? 'Referencias del estilo de ilustración que comparten los doce meses.'
          : 'Fotos e imágenes de inspiración para la ilustración de este mes.'} No salen al imprimir ni al exportar.
      </p>
      {puedeEditar && (
        <>
          <input ref={entrada} type="file" accept="image/*" multiple className="hidden" onChange={e => { subir(e.target.files); e.target.value = ''; }} />
          <Button className="mb-4 w-full gap-2" onClick={() => entrada.current?.click()} disabled={!!subiendo}>
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {subiendo ?? 'Añadir imágenes'}
          </Button>
        </>
      )}
      {error && <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      {referencias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          <ImageIcon className="h-8 w-8" />
          La carpeta de este mes está vacía.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {referencias.map((r, i) => (
            <div key={r.url + i} className="overflow-hidden rounded-lg border border-slate-200">
              <img src={r.url} alt={r.nota || `Referencia ${i + 1}`} className="aspect-square w-full cursor-zoom-in object-cover" onClick={() => setGrande(r.url)} />
              {puedeEditar ? (
                <div className="space-y-1 p-1.5">
                  <input
                    defaultValue={r.nota ?? ''}
                    placeholder="Nota…"
                    onBlur={e => {
                      const nota = e.target.value.trim();
                      if (nota !== (r.nota ?? '')) alGuardar(referencias.map((x, j) => j === i ? { ...x, nota: nota || undefined } : x));
                    }}
                    className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-400"
                  />
                  <div className="flex gap-1">
                    {mes !== 0 && <Button variant="outline" className="flex-1 px-1 py-1 text-[9px]" onClick={() => alUsarComoIlustracion(r.url)}>Usar como ilustración</Button>}
                    <Button
                      variant="ghost"
                      className="px-1.5 py-1 text-rose-600"
                      aria-label="Quitar de la carpeta"
                      onClick={() => { if (confirm('¿Quitar esta imagen de la carpeta?')) alGuardar(referencias.filter((_, j) => j !== i)); }}
                    ><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : r.nota ? <p className="p-1.5 text-xs text-slate-600">{r.nota}</p> : null}
            </div>
          ))}
        </div>
      )}
      {grande && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setGrande(null)}>
          <img src={grande} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </PanelLateral>
  );
}

// ── BUZÓN DE IDEAS ────────────────────────────────────────────────────────

export interface Idea {
  id: number;
  mes: number | null;
  texto: string;
  estado: 'pendiente' | 'hecha' | 'descartada';
  respuesta: string | null;
  autor?: string | null;
  created_at: string;
}

export function PanelIdeas({ anio, mesActual, puedeProponer, puedeEditar, alCambiarPendientes, alCerrar }: {
  anio: number;
  mesActual: number;
  puedeProponer: boolean;
  puedeEditar: boolean;
  alCambiarPendientes: (n: number) => void;
  alCerrar: () => void;
}) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [texto, setTexto] = useState('');
  const [mes, setMes] = useState<string>(String(mesActual));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [verCerradas, setVerCerradas] = useState(false);

  const cargar = async () => {
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/ideas`, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setIdeas(j);
      alCambiarPendientes((j as Idea[]).filter(i => i.estado === 'pendiente').length);
    } catch (e: any) { setError(e.message || 'No se han podido cargar las ideas.'); setIdeas([]); }
  };
  useEffect(() => { cargar(); }, [anio]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true); setError(null);
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/ideas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, mes: mes || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setTexto('');
      await cargar();
    } catch (e: any) { setError(e.message || 'No se ha podido enviar la idea.'); }
    setEnviando(false);
  };

  const cambiarEstado = async (id: number, estado: Idea['estado']) => {
    const r = await fetch(`/api/calendario-arte/ideas/${id}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setError(j.error || 'No se ha podido cambiar el estado.'); return; }
    await cargar();
  };

  const pendientes = (ideas ?? []).filter(i => i.estado === 'pendiente');
  const cerradas = (ideas ?? []).filter(i => i.estado !== 'pendiente');

  const copiarParaIA = async () => {
    const lista = pendientes.map(i => `#${i.id} [${i.mes ? NOMBRES_MES[i.mes - 1] : 'General'}] ${i.texto}`).join('\n');
    const mensaje = `Calendario Arte para la Humanidad ${anio} (humanity.wiki/calendario-arte). Implementa estas ideas pendientes y márcalas como hechas:\n\n${lista}`;
    try { await navigator.clipboard.writeText(mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { setError('No he podido copiar. Abre la lista en texto y cópiala a mano.'); }
  };

  const Fila = ({ i }: { i: Idea }) => (
    <li className={cn('rounded-lg border p-3 text-sm', i.estado === 'pendiente' ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50 text-slate-500')}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>#{i.id} · {i.mes ? NOMBRES_MES[i.mes - 1] : 'General'}{i.autor ? ` · ${i.autor}` : ''}</span>
        <span>{new Date(i.created_at).toLocaleDateString('es-ES')}</span>
      </div>
      <p className={cn('whitespace-pre-line', i.estado === 'descartada' && 'line-through')}>{i.texto}</p>
      {i.respuesta && <p className="mt-1 rounded bg-white p-1.5 text-xs text-slate-600">↳ {i.respuesta}</p>}
      {puedeEditar && (
        <div className="mt-2 flex gap-1">
          {i.estado === 'pendiente' ? (
            <>
              <Button variant="outline" className="gap-1 px-2 py-1 text-[9px]" onClick={() => cambiarEstado(i.id, 'hecha')}><Check className="h-3 w-3" />Hecha</Button>
              <Button variant="ghost" className="gap-1 px-2 py-1 text-[9px]" onClick={() => cambiarEstado(i.id, 'descartada')}><Ban className="h-3 w-3" />Descartar</Button>
            </>
          ) : (
            <Button variant="ghost" className="gap-1 px-2 py-1 text-[9px]" onClick={() => cambiarEstado(i.id, 'pendiente')}><RotateCcw className="h-3 w-3" />Reabrir</Button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <PanelLateral titulo="Ideas y mejoras" alCerrar={alCerrar}>
      <p className="mb-3 text-sm text-slate-500">
        Deja aquí cualquier idea o corrección. La IA las lee cuando se lo pidáis
        («haz las tareas pendientes del calendario») y las va marcando como hechas.
      </p>
      {puedeProponer ? (
        <div className="mb-5 space-y-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={3}
            placeholder="Ej.: en marzo, cambiar la frase del día 14 por un dato sobre los ríos de España"
            className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
          />
          <div className="flex gap-2">
            <select value={mes} onChange={e => setMes(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 text-sm">
              <option value="">General (todo el calendario)</option>
              {NOMBRES_MES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
            <Button className="gap-1" onClick={enviar} disabled={enviando || !texto.trim()}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Inicia sesión para proponer ideas.</p>
      )}
      {error && <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Pendientes ({pendientes.length})</h3>
        {pendientes.length > 0 && (
          <Button variant="outline" className="gap-1 px-2 py-1 text-[9px]" onClick={copiarParaIA}>
            <Copy className="h-3 w-3" />{copiado ? 'Copiado' : 'Copiar para la IA'}
          </Button>
        )}
      </div>
      {ideas === null ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-slate-400">No hay ideas pendientes.</p>
      ) : (
        <ul className="space-y-2">{pendientes.map(i => <Fila key={i.id} i={i} />)}</ul>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        En texto plano: <a className="underline" href={`/api/calendario-arte/${anio}/ideas.txt`} target="_blank" rel="noreferrer">/api/calendario-arte/{anio}/ideas.txt</a>
      </p>

      {cerradas.length > 0 && (
        <div className="mt-5">
          <Button variant="ghost" className="px-0 text-[10px]" onClick={() => setVerCerradas(v => !v)}>
            {verCerradas ? 'Ocultar' : 'Ver'} hechas y descartadas ({cerradas.length})
          </Button>
          {verCerradas && <ul className="mt-2 space-y-2">{cerradas.map(i => <Fila key={i.id} i={i} />)}</ul>}
        </div>
      )}
    </PanelLateral>
  );
}

// ── PRINCIPIOS DE DISEÑO ──────────────────────────────────────────────────

const NOTAS: { id: Evaluacion; nombre: string; clase: string }[] = [
  { id: 'si', nombre: 'Cumple', clase: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  { id: 'parcial', nombre: 'A medias', clase: 'bg-amber-100 text-amber-800 ring-amber-300' },
  { id: 'no', nombre: 'No cumple', clase: 'bg-rose-100 text-rose-800 ring-rose-300' },
];

export function PanelPrincipios({ principios, puedeEditar, mes, evaluacion, nota, alGuardarPrincipios, alEvaluar, alAbrirEstilo, alCerrar }: {
  principios: Principio[];
  puedeEditar: boolean;
  mes: number;
  evaluacion: Record<string, Evaluacion>;
  nota: string;
  alGuardarPrincipios: (p: Principio[]) => void;
  alEvaluar: (e: Record<string, Evaluacion>, nota: string) => void;
  alAbrirEstilo: () => void;
  alCerrar: () => void;
}) {
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoTexto, setNuevoTexto] = useState('');
  const cumple = principios.filter(p => evaluacion[p.id] === 'si').length;
  const evaluados = principios.filter(p => evaluacion[p.id]).length;

  const cambiar = (id: string, c: Partial<Principio>) =>
    alGuardarPrincipios(principios.map(p => p.id === id ? { ...p, ...c } : p));

  const anadir = () => {
    if (!nuevoTitulo.trim()) return;
    const base = nuevoTitulo.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'principio';
    let id = base; let n = 2;
    while (principios.some(p => p.id === id)) id = `${base}-${n++}`;
    alGuardarPrincipios([...principios, { id, titulo: nuevoTitulo.trim(), texto: nuevoTexto.trim() }]);
    setNuevoTitulo(''); setNuevoTexto('');
  };

  return (
    <PanelLateral titulo="Principios de diseño" alCerrar={alCerrar}>
      <p className="mb-3 text-sm text-slate-500">
        La vara con la que medimos cada mes. Evalúa <b>{NOMBRES_MES[mes - 1]}</b> contra cada principio
        para ver qué falta antes de darlo por terminado.
      </p>
      <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
        <span>{NOMBRES_MES[mes - 1]}: <b>{cumple}</b> de {principios.length} cumplidos{evaluados < principios.length ? ` · ${principios.length - evaluados} sin evaluar` : ''}</span>
        <Button variant="outline" className="gap-1 px-2 py-1 text-[9px]" onClick={alAbrirEstilo}><ImageIcon className="h-3 w-3" />Carpeta de estilo</Button>
      </div>

      <ol className="space-y-3">
        {principios.map((p, i) => (
          <li key={p.id} className="rounded-lg border border-slate-200 p-3">
            {puedeEditar ? (
              <>
                <input
                  defaultValue={p.titulo}
                  key={`t-${p.id}-${p.titulo}`}
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.titulo) cambiar(p.id, { titulo: v }); }}
                  className="w-full rounded px-1 text-sm font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-sky-400"
                />
                <textarea
                  defaultValue={p.texto}
                  key={`x-${p.id}-${p.texto}`}
                  rows={3}
                  onBlur={e => { const v = e.target.value.trim(); if (v !== p.texto) cambiar(p.id, { texto: v }); }}
                  className="mt-1 w-full resize-y rounded px-1 text-sm text-slate-600 outline-none focus:ring-1 focus:ring-sky-400"
                />
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-slate-800">{i + 1}. {p.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.texto}</p>
              </>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {NOTAS.map(n => (
                <Button
                  key={n.id}
                  variant="ghost"
                  disabled={!puedeEditar}
                  className={cn('px-2 py-1 text-[9px] ring-1 ring-transparent', evaluacion[p.id] === n.id && n.clase)}
                  onClick={() => {
                    const e = { ...evaluacion };
                    if (e[p.id] === n.id) delete e[p.id]; else e[p.id] = n.id;
                    alEvaluar(e, nota);
                  }}
                >{n.nombre}</Button>
              ))}
              {puedeEditar && (
                <Button
                  variant="ghost"
                  className="ml-auto px-1.5 py-1 text-slate-400 hover:text-rose-600"
                  aria-label="Quitar principio"
                  onClick={() => { if (confirm(`¿Quitar el principio «${p.titulo}»?`)) alGuardarPrincipios(principios.filter(x => x.id !== p.id)); }}
                ><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {puedeEditar && (
        <>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Notas de la evaluación de {NOMBRES_MES[mes - 1]}</label>
          <textarea
            defaultValue={nota}
            key={`nota-${mes}`}
            rows={3}
            placeholder="Qué falta, qué cambiar…"
            onBlur={e => { if (e.target.value !== nota) alEvaluar(evaluacion, e.target.value); }}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
          />

          <div className="mt-5 space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
            <h3 className="text-sm font-semibold text-slate-700">Añadir un principio</h3>
            <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} placeholder="Titular"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-sky-400" />
            <textarea value={nuevoTexto} onChange={e => setNuevoTexto(e.target.value)} rows={3} placeholder="Explicación"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-sky-400" />
            <Button className="w-full gap-1" onClick={anadir} disabled={!nuevoTitulo.trim()}><Plus className="h-4 w-4" />Añadir</Button>
          </div>
        </>
      )}
    </PanelLateral>
  );
}

// ── CONOCER MÁS (a donde lleva el QR de cada mes) ─────────────────────────

export function PanelConocer({ contenido: c, datos, candidatas, puedeEditar, alElegir, alCambiarQR, alCerrar }: {
  contenido: ContenidoMes;
  datos: DatoClave[];
  candidatas: IniciativaCandidata[];
  puedeEditar: boolean;
  alElegir: (i: NonNullable<ContenidoMes['iniciativa']>) => void;
  alCambiarQR: (url: string) => void;
  alCerrar: () => void;
}) {
  const ini = c.iniciativa;
  return (
    <PanelLateral titulo={`${NOMBRES_MES[c.mes - 1]} · ${c.tema}`} alCerrar={alCerrar}>
      <p className="mb-4 text-base italic leading-snug text-slate-700">«{c.lema}»</p>

      <section className="mb-5 rounded-xl bg-emerald-50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Iniciativa del mes</h3>
        {ini?.nombre ? (
          <>
            <p className="mt-1 text-base font-semibold text-slate-800">{ini.nombre}</p>
            {ini.texto && <p className="mt-1 text-sm text-slate-600">{ini.texto}</p>}
            <p className="mt-2 text-xs text-slate-500">Parte de lo recaudado con el calendario va a esta iniciativa.</p>
            {ini.web && (
              <a href={ini.web} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-700">
                Conócela y apóyala <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Todavía estamos eligiendo a qué iniciativa irá parte de lo recaudado este mes.</p>
        )}
      </section>

      {datos.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Datos para entender el tema</h3>
          <ul className="space-y-2">
            {datos.map((d, i) => (
              <li key={i} className="text-sm text-slate-700">
                {d.dato}{' '}
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">{d.fuente || 'Fuente'}</a>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {puedeEditar && (
        <section className="rounded-xl border border-dashed border-slate-300 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Elegir la iniciativa (solo editores)</h3>
          <p className="mb-2 text-xs text-slate-500">
            Candidatas encontradas por la investigación. Comprobad cada una antes de comprometer dinero con ella.
          </p>
          {candidatas.length === 0 && <p className="text-xs text-slate-400">No hay candidatas investigadas para este mes.</p>}
          <ul className="space-y-2">
            {candidatas.map(k => (
              <li key={k.nombre} className={cn('rounded-lg border p-2 text-sm', ini?.nombre === k.nombre ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{k.nombre} <span className="text-xs font-normal text-slate-400">· {k.ambito}</span></p>
                    <p className="text-xs text-slate-600">{k.que_hace}</p>
                    <p className="text-xs text-slate-500">{k.por_que} · Donaciones: {k.donaciones}</p>
                    <a href={k.web} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">{k.web}</a>
                  </div>
                  <Button
                    variant={ini?.nombre === k.nombre ? 'primary' : 'outline'}
                    className="shrink-0 px-2 py-1 text-[9px]"
                    onClick={() => alElegir({ nombre: k.nombre, texto: k.que_hace, web: k.web })}
                  >{ini?.nombre === k.nombre ? 'Elegida' : 'Elegir'}</Button>
                </div>
              </li>
            ))}
          </ul>
          {ini?.nombre && (
            <Button variant="ghost" className="mt-2 px-0 text-[10px] text-rose-600" onClick={() => alElegir({ nombre: '', texto: '' })}>Dejar sin elegir</Button>
          )}
          <label className="mt-4 block text-xs font-semibold text-slate-600">A dónde lleva el QR de este mes</label>
          <input
            defaultValue={c.qr_url ?? ''}
            key={`qr-${c.mes}`}
            placeholder={`Por defecto: esta misma ficha`}
            onBlur={e => { const v = e.target.value.trim(); if (v !== (c.qr_url ?? '')) alCambiarQR(v); }}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-400"
          />
        </section>
      )}
    </PanelLateral>
  );
}
