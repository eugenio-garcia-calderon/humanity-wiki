// The conformity matrix (2026-11-24, Eugenio: «matriz de conformidad normativa, requisito por requisito, donde cada
// obligación legal esté vinculada a un plano, cálculo, ensayo, inspección o documento que demuestre su cumplimiento…
// creo que es la clave»). One card per legal obligation, ordered by importance; inside, the evidence that proves it, each
// piece with its state, a note and its files. Pieces tied to a test or a document follow that test or document, so the
// same thing is never marked twice. Next to every obligation, what the 3D design says about it when the design can say.
import { useMemo, useState } from 'react';
import { Calculator, CheckCheck, ClipboardCheck, FileText, FlaskConical, Ruler, Search, ExternalLink } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import { FUENTES } from '../normas';
import type { Evaluacion } from '../evaluar';
import { COLOR, CORTO } from '../PanelHomologacion';
import { GRUPOS_MATRIZ, OBLIGACIONES, TIPOS, claveObligacion, type Hueco, type IdGrupoMatriz, type Obligacion, type TipoEvidencia } from './catalogo';
import { ENSAYOS } from './ensayos';
import { DOCUMENTOS } from './documentos';
import { cambiar, OBLIGACION_VACIA } from './almacen';
import { estadoHueco, hechosSinArchivo, progresoGrupo, progresoImprescindible, progresoObligacion, progresoTotal, type Estados } from './progreso';
import type { Adjunto, EstadoHueco, ObligacionGuardada } from './tipos';
import { Adjuntos } from './Adjuntos';
import { Barra, Chip, Peso, type Ir } from './ui';

const ICONO: Record<TipoEvidencia, typeof Ruler> = { plano: Ruler, calculo: Calculator, ensayo: FlaskConical, inspeccion: ClipboardCheck, documento: FileText };
const nombreEnsayo = (id: string) => { const e = ENSAYOS.find(x => x.id === id); return e ? `${e.codigo} ${e.titulo}` : id; };
const nombreDoc = (id: string) => { const d = DOCUMENTOS.find(x => x.id === id); return d ? `${d.codigo} ${d.titulo}` : id; };

const editar = (o: Obligacion, f: (v: ObligacionGuardada) => ObligacionGuardada) => cambiar<ObligacionGuardada>(claveObligacion(o.id), OBLIGACION_VACIA(), f);
const editarHueco = (o: Obligacion, h: Hueco, parcial: Partial<NonNullable<ObligacionGuardada['huecos'][string]>>) =>
  editar(o, v => ({ ...v, huecos: { ...v.huecos, [h.id]: { estado: 'pendiente', ...v.huecos[h.id], ...parcial } } }));

function FilaHueco({ o, h, st, editable, ir }: { o: Obligacion; h: Hueco; st: Estados; editable: boolean; ir: Ir }) {
  const g = st.obligaciones[o.id]?.huecos[h.id];
  const estado = estadoHueco(o, h, st);
  const Icono = ICONO[h.tipo];
  const derivado = !!(h.ensayo || h.doc || h.fab);
  const aplicaHueco = g?.estado !== 'noAplica';
  const adjuntos = g?.adjuntos ?? [];
  const sinArchivo = estado === 'hecho' && !derivado && adjuntos.length === 0;
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex flex-wrap items-start gap-2">
        <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700"><Icono className="h-3.5 w-3.5 text-teal-700" />{TIPOS[h.tipo].nombre}</span>
        <p className="min-w-0 flex-1 text-[13px] text-slate-800">{h.que}{h.porUnidad && <span className="ml-1.5 rounded bg-sky-100 px-1 text-[10px] font-semibold uppercase text-sky-800" title="Se comprueba en cada unidad que sale del taller">en cada unidad</span>}</p>
        {editable && <Chip estado={estado} />}
      </div>
      {editable && (
        <>
          {derivado ? (
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {h.ensayo && <>Se marca solo desde el ensayo <strong>{nombreEnsayo(h.ensayo)}</strong>. <Button variant="outline" onClick={() => ir('ensayos', h.ensayo!)} className="px-2 py-0.5 text-[11px] normal-case tracking-normal">Abrir el ensayo</Button></>}
              {h.doc && <>Se marca solo desde el documento <strong>{nombreDoc(h.doc)}</strong>. <Button variant="outline" onClick={() => ir('documentos', h.doc!)} className="px-2 py-0.5 text-[11px] normal-case tracking-normal">Abrir el documento</Button></>}
              {h.fab && <>Se marca solo al completar los datos del fabricante. <Button variant="outline" onClick={() => ir('resumen', 'fab')} className="px-2 py-0.5 text-[11px] normal-case tracking-normal">Ir a los datos</Button></>}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Estado de esta evidencia">
              {(['pendiente', 'enCurso', 'hecho'] as const).map(e => (
                <Button key={e} variant="outline" aria-pressed={aplicaHueco && estado === e} onClick={() => editarHueco(o, h, { estado: e, motivo: undefined })}
                  className={cn('px-2 py-0.5 text-[11px] normal-case tracking-normal', aplicaHueco && estado === e ? (e === 'hecho' ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700' : e === 'enCurso' ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600' : 'border-slate-500 bg-slate-500 text-white hover:bg-slate-600') : 'bg-white text-slate-700')}>
                  {e === 'pendiente' ? 'Pendiente' : e === 'enCurso' ? 'En curso' : 'Hecho'}
                </Button>
              ))}
              <Button variant="outline" aria-pressed={!aplicaHueco} onClick={() => editarHueco(o, h, { estado: aplicaHueco ? 'noAplica' : 'pendiente' })}
                className={cn('px-2 py-0.5 text-[11px] normal-case tracking-normal', !aplicaHueco ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700' : 'bg-white text-slate-700')}>No aplica</Button>
            </div>
          )}
          {!aplicaHueco && (
            <label className="flex flex-col gap-0.5 text-xs text-slate-600">Por qué no aplica (sin motivo escrito sigue contando como pendiente)
              <input value={g?.motivo ?? ''} maxLength={300} onChange={e => editarHueco(o, h, { motivo: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-[13px] text-slate-900" />
            </label>
          )}
          {aplicaHueco && !derivado && (
            <input value={g?.nota ?? ''} maxLength={600} onChange={e => editarHueco(o, h, { nota: e.target.value })} placeholder="Nota: dónde está, qué versión, quién lo hizo…" aria-label="Nota de esta evidencia" className="rounded-md border border-slate-300 px-2 py-1 text-[13px] text-slate-900 placeholder:text-slate-400" />
          )}
          {aplicaHueco && !derivado && (
            <Adjuntos adjuntos={adjuntos} alCambiar={(l: Adjunto[]) => editarHueco(o, h, { adjuntos: l })} pieza={`Matriz ${o.id}.${h.id} ${o.titulo}`} />
          )}
          {sinArchivo && <p className="text-xs text-amber-800">Marcado como hecho sin ningún archivo: adjunta el plano, el cálculo o el informe para poder enseñarlo en una inspección.</p>}
        </>
      )}
    </li>
  );
}

function TarjetaObligacion({ o, st, editable, ev, ir, abierta0 }: { o: Obligacion; st: Estados; editable: boolean; ev: Evaluacion; ir: Ir; abierta0: boolean }) {
  const [abierta, setAbierta] = useState(abierta0);
  const g = st.obligaciones[o.id];
  const p = editable ? progresoObligacion(o, st) : null;
  const noAplica = g?.noAplica !== undefined;
  const r = o.diseno ? ev.resultados.find(x => x.req.id === o.diseno) : undefined;
  const f = FUENTES[o.fuente];
  const hechos = o.huecos.filter(h => estadoHueco(o, h, st) === 'hecho').length;
  return (
    <li className={cn('rounded-lg border bg-white', abierta ? 'border-teal-300' : 'border-slate-200')}>
      <Button variant="ghost" onClick={() => setAbierta(a => !a)} aria-expanded={abierta} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
        <Peso peso={o.peso} />
        <span className="font-mono text-xs font-semibold text-slate-500">{o.id}</span>
        <span className="min-w-0 flex-1 basis-60 font-semibold text-slate-900">{o.titulo}</span>
        {r && <span className={cn('whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[r.estado])} title={`Tu diseño: ${r.texto}`}>Diseño: {CORTO[r.estado]}</span>}
        {editable && (noAplica && g?.noAplica?.trim()
          ? <Chip estado="noAplica" />
          : <span className="flex w-32 items-center gap-2"><Barra pct={Math.round((p ?? 0) * 100)} className="flex-1" /><span className="w-9 text-right font-mono text-[11px] text-slate-600">{Math.round((p ?? 0) * 100)}%</span></span>)}
        <span className="text-[11px] text-slate-500">{editable ? `${hechos}/${o.huecos.length}` : `${o.huecos.length} ${o.huecos.length === 1 ? 'evidencia' : 'evidencias'}`}</span>
      </Button>
      {abierta && (
        <div className="flex flex-col gap-2 border-t border-slate-100 p-2.5 text-[13px] leading-relaxed text-slate-700">
          <p><span className="font-semibold text-slate-900">Qué exige:</span> {o.exige}</p>
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Dónde lo dice:</span> {o.ref}{' '}
            <a className="inline-flex items-center gap-0.5 text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo.split(':')[0].split(' (')[0]}<ExternalLink className="h-3 w-3" /></a>
            {o.verificada ? <span className="ml-1.5 rounded bg-emerald-50 px-1 font-semibold text-emerald-800">leído en el texto legal</span> : <span className="ml-1.5 rounded bg-amber-50 px-1 font-semibold text-amber-900">por confirmar: viene del texto aportado o de una norma de pago</span>}
          </p>
          {r && <p className="flex flex-wrap items-center gap-1.5 text-xs"><span className="font-semibold">Tu diseño 3D:</span><span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR[r.estado])}>{CORTO[r.estado]}</span><span>{r.texto}</span></p>}
          <ul className="flex flex-col gap-1.5">{o.huecos.map(h => <FilaHueco key={h.id} o={o} h={h} st={st} editable={editable} ir={ir} />)}</ul>
          {editable && (
            <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
              <Button variant="outline" aria-pressed={noAplica} onClick={() => editar(o, v => { const { noAplica: _n, ...resto } = v; return noAplica ? resto : { ...v, noAplica: '' }; })}
                className={cn('w-fit px-2 py-0.5 text-[11px] normal-case tracking-normal', noAplica ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700' : 'bg-white text-slate-700')}>Esta obligación no aplica a mi vehículo</Button>
              {noAplica && (
                <label className="flex flex-col gap-0.5 text-xs text-slate-600">Por qué no aplica (sin el motivo escrito sigue contando)
                  <input value={g?.noAplica ?? ''} maxLength={300} onChange={e => editar(o, v => ({ ...v, noAplica: e.target.value }))} className="rounded-md border border-slate-300 px-2 py-1 text-[13px] text-slate-900" />
                </label>
              )}
              <input value={g?.nota ?? ''} maxLength={600} onChange={e => editar(o, v => ({ ...v, nota: e.target.value }))} placeholder="Nota sobre esta obligación (decisiones, dudas, a quién preguntar)" aria-label="Nota de la obligación" className="rounded-md border border-slate-300 px-2 py-1 text-[13px] text-slate-900 placeholder:text-slate-400" />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function MatrizConformidad({ st, editable, ev, ir, abrir }: { st: Estados; editable: boolean; ev: Evaluacion; ir: Ir; abrir?: string | null }) {
  const [grupo, setGrupo] = useState<'todos' | IdGrupoMatriz>('todos');
  const [soloFalta, setSoloFalta] = useState(false);
  const [q, setQ] = useState('');
  const filtradas = useMemo(() => OBLIGACIONES.filter(o => {
    if (grupo !== 'todos' && o.grupo !== grupo) return false;
    if (q.trim() && !`${o.id} ${o.titulo} ${o.exige} ${o.ref}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (soloFalta && editable) { const p = progresoObligacion(o, st); if (p == null || p >= 1) return false; }
    return true;
  }), [grupo, q, soloFalta, st, editable]);
  const sinArchivo = editable ? hechosSinArchivo(st).length : 0;
  const total = progresoTotal(st), imp = progresoImprescindible(st);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-[13px] text-teal-950">
        <p className="font-semibold">Cada obligación legal, con la prueba que la demuestra.</p>
        <p className="mt-1">Abre una obligación para ver qué exige la ley y qué evidencia hace falta: un plano, un cálculo, un ensayo, una inspección o un documento. Marca cada una cuando la tengas y adjunta el archivo. Las que dependen de un ensayo o de un documento se marcan solas cuando los terminas. Ordenadas de la más importante (●●●, sin ella no se puede vender) a la menos.</p>
      </div>
      {editable && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5"><p className="text-xs font-semibold text-slate-600">Toda la matriz</p><div className="mt-1 flex items-center gap-2"><Barra pct={total} className="flex-1" etiqueta="Matriz completa" /><span className="font-mono text-sm font-bold text-slate-900">{total} %</span></div></div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5"><p className="text-xs font-semibold text-slate-600">Lo imprescindible (●●●)</p><div className="mt-1 flex items-center gap-2"><Barra pct={imp} className="flex-1" etiqueta="Lo imprescindible" /><span className="font-mono text-sm font-bold text-slate-900">{imp} %</span></div></div>
        </div>
      )}
      {sinArchivo > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">{sinArchivo === 1 ? 'Hay 1 evidencia marcada como hecha' : `Hay ${sinArchivo} evidencias marcadas como hechas`} sin ningún archivo adjunto: en una inspección habrá que enseñarlas.</p>}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar la matriz">
        <Button variant="outline" aria-pressed={grupo === 'todos'} onClick={() => setGrupo('todos')} className={cn('px-2 py-1 text-xs normal-case tracking-normal', grupo === 'todos' ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'bg-white text-slate-800')}>Todas ({OBLIGACIONES.length})</Button>
        {GRUPOS_MATRIZ.map(g => (
          <Button key={g.id} variant="outline" aria-pressed={grupo === g.id} title={g.lema} onClick={() => setGrupo(g.id)} className={cn('px-2 py-1 text-xs normal-case tracking-normal', grupo === g.id ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'bg-white text-slate-800')}>
            {g.nombre}{editable && <span className="ml-1 font-mono text-[10px] opacity-80">{progresoGrupo(g.id, st)}%</span>}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: frenos, placa, batería, O13…" aria-label="Buscar en la matriz" className="w-full rounded-md border border-slate-300 py-1 pl-7 pr-2 text-[13px]" /></label>
        {editable && <Button variant="outline" aria-pressed={soloFalta} onClick={() => setSoloFalta(v => !v)} className={cn('gap-1 px-2 py-1 text-xs normal-case tracking-normal', soloFalta ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'bg-white text-slate-800')}><CheckCheck className="h-3.5 w-3.5" />Solo lo que falta</Button>}
      </div>
      {(grupo === 'todos' ? GRUPOS_MATRIZ : GRUPOS_MATRIZ.filter(g => g.id === grupo)).map(g => {
        const os = filtradas.filter(o => o.grupo === g.id).sort((a, b) => b.peso - a.peso || OBLIGACIONES.indexOf(a) - OBLIGACIONES.indexOf(b));
        if (!os.length) return null;
        return (
          <section key={g.id} className="flex flex-col gap-1.5">
            <h3 className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">{g.nombre}<span className="text-xs font-normal text-slate-500">{g.lema}</span></h3>
            <ul className="flex flex-col gap-1.5">{os.map(o => <TarjetaObligacion key={o.id} o={o} st={st} editable={editable} ev={ev} ir={ir} abierta0={abrir === o.id} />)}</ul>
          </section>
        );
      })}
      {!filtradas.length && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[13px] text-slate-600">No hay obligaciones con ese filtro.</p>}
    </div>
  );
}
